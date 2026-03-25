from __future__ import annotations

import asyncio
import concurrent.futures
import traceback
import uuid
from datetime import datetime
from typing import Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from core.auth import require_current_username
from repositories.clinical_cases import (
    create_case_message,
    create_clinical_case,
    get_clinical_case,
    get_latest_clinical_case,
    list_case_messages,
    save_clinical_case_error,
    save_clinical_case_result,
    touch_clinical_case,
    update_clinical_case,
)
from services.llm_service import ask_llm, ask_llm_debate, get_oc_client, get_baichuan_client
from services.psych_profile_service import queue_psych_profile_refresh

router = APIRouter()

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
_jobs: Dict[str, dict] = {}

CaseStatus = Literal["draft", "running", "done", "error"]
MessageRole = Literal["doctor", "ai", "system"]


class ClinicalRequest(BaseModel):
    patient_name: Optional[str] = ""
    age: int = 50
    gender: str = "男"
    diagnosis: str
    pain_score: int = 5
    pain_type: str = "非癌性慢性疼痛"
    department: str = "疼痛科"
    current_opioid: str = "无"
    current_dose: float = 0.0
    current_freq: str = "无"
    plan_drug: str = "无"
    plan_dose: float = 0.0
    plan_freq: int = 2
    mme_day: float = 0.0
    ort_score: int = 0
    ort_level: str = "低风险"
    comorbidities: str = "无"
    allergies: str = "无"
    adverse_hist: str = "无"
    co_meds: str = "无"
    renal_liver_issue: bool = False
    personal_use: str = "无"
    family_use: str = "无"
    psych_histories: str = "无"
    extra_notes: Optional[str] = ""
    free_text: Optional[str] = ""


class ClinicalSubmitRequest(ClinicalRequest):
    case_id: str | None = None


class DebateResponse(BaseModel):
    oc_answer: str
    baichuan_review: str
    consensus: str
    risk_warning: str
    mme_warning: str


class ClinicalCaseRecord(ClinicalRequest):
    id: str
    ai_status: CaseStatus
    risk_warning: str | None = None
    mme_warning: str | None = None
    oc_answer: str | None = None
    baichuan_review: str | None = None
    consensus: str | None = None
    ai_error: str | None = None
    created_at: datetime
    updated_at: datetime


class MDTMessageRecord(BaseModel):
    id: str
    case_id: str
    role: MessageRole
    author_name: str | None = None
    content: str
    created_at: datetime


class ClinicalCaseBundle(BaseModel):
    case: ClinicalCaseRecord
    messages: list[MDTMessageRecord]


class ClinicalSubmitResponse(BaseModel):
    job_id: str
    case_id: str


class DiscussionRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    author_name: str | None = Field(default="当前医生", max_length=50)

    @field_validator("content", "author_name", mode="before")
    @classmethod
    def normalize_text(cls, value: str | None):
        if value is None:
            return value
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value


class DiscussionResponse(BaseModel):
    doctor_message: MDTMessageRecord
    ai_message: MDTMessageRecord


def _build_summary(req: ClinicalRequest) -> str:
    current_meds = (
        f"{req.current_opioid} {req.current_dose}mg ({req.current_freq})"
        if req.current_opioid != "无" and req.current_dose > 0
        else "无阿片当前用药"
    )
    if req.co_meds and req.co_meds != "无":
        current_meds += f"；联合：{req.co_meds}"

    summary = f"""
患者：{req.patient_name or '未命名患者'}，{req.age} 岁 {req.gender}
诊断：{req.diagnosis}
疼痛评分：{req.pain_score}/10（{req.pain_type}），科室：{req.department}
合并症：{req.comorbidities}
当前用药：{current_meds}
拟开具药物：{req.plan_drug}，剂量：{req.plan_dose}mg，频次：{req.plan_freq}/day，MME/day={req.mme_day}
本人物质使用史：{req.personal_use}
家族物质使用史：{req.family_use}
心理病史：{req.psych_histories}
ORT：{req.ort_score}（{req.ort_level}），过敏史：{req.allergies}
既往不良反应：{req.adverse_hist}
补充：{req.extra_notes or '无'}
""".strip()

    if req.free_text and req.free_text.strip():
        summary += f"\n\n---\n【用户提供的病历/长文本】\n{req.free_text.strip()}"

    return summary


def _risk_warning(req: ClinicalRequest) -> str:
    if req.ort_level == "高风险" or req.mme_day >= 90:
        return "red"
    return "green"


def _mme_warning(mme: float) -> str:
    if mme >= 90:
        return "MME/day ≥ 90，剂量红线：需强制复核并记录调整依据。"
    if mme >= 50:
        return "MME/day ≥ 50，剂量警戒：建议评估纳洛酮与高频复评。"
    return ""


def _case_to_request(case: dict) -> ClinicalRequest:
    return ClinicalRequest(
        patient_name=case.get("patient_name") or "",
        age=case.get("age") or 50,
        gender=case.get("gender") or "男",
        diagnosis=case.get("diagnosis") or "",
        pain_score=case.get("pain_score") or 5,
        pain_type=case.get("pain_type") or "非癌性慢性疼痛",
        department=case.get("department") or "疼痛科",
        current_opioid=case.get("current_opioid") or "无",
        current_dose=case.get("current_dose") or 0.0,
        current_freq=case.get("current_freq") or "无",
        plan_drug=case.get("plan_drug") or "无",
        plan_dose=case.get("plan_dose") or 0.0,
        plan_freq=case.get("plan_freq") or 2,
        mme_day=case.get("mme_day") or 0.0,
        ort_score=case.get("ort_score") or 0,
        ort_level=case.get("ort_level") or "低风险",
        comorbidities=case.get("comorbidities") or "无",
        allergies=case.get("allergies") or "无",
        adverse_hist=case.get("adverse_hist") or "无",
        co_meds=case.get("co_meds") or "无",
        renal_liver_issue=bool(case.get("renal_liver_issue") or False),
        personal_use=case.get("personal_use") or "无",
        family_use=case.get("family_use") or "无",
        psych_histories=case.get("psych_histories") or "无",
        extra_notes=case.get("extra_notes") or "",
        free_text=case.get("free_text") or "",
    )


def _consult_prompt(summary: str, discuss_input: str) -> str:
    return (
        f"病例摘要：{summary}\n\n"
        f"会诊补充：{discuss_input or '无补充'}\n\n"
        "请输出：1) 会诊结论 2) 48-72h复评重点 3) 风险沟通要点。"
    )


def _generate_consult_text(summary: str, discuss_input: str) -> str:
    client, model = get_oc_client()
    result = ask_llm(
        client,
        model,
        "你是医院疼痛管理MDT秘书，请输出简洁、可落地的会诊摘要。",
        _consult_prompt(summary, discuss_input),
    )
    if not result.strip():
        raise RuntimeError("LLM unavailable or returned an empty discussion summary")
    return result


def _bundle_case(case: dict, owner_username: str) -> ClinicalCaseBundle:
    return ClinicalCaseBundle(
        case=case,
        messages=list_case_messages(case["id"], owner_username),
    )


@router.get("/cases/latest", response_model=ClinicalCaseBundle | None)
def get_latest_case(current_username: str = Depends(require_current_username)):
    case = get_latest_clinical_case(current_username)
    if not case:
        return None
    return _bundle_case(case, current_username)


@router.get("/cases/{case_id}", response_model=ClinicalCaseBundle)
def get_case(case_id: str, current_username: str = Depends(require_current_username)):
    case = get_clinical_case(case_id, current_username)
    if not case:
        raise HTTPException(status_code=404, detail="Clinical case not found")
    return _bundle_case(case, current_username)


@router.post("/cases", response_model=ClinicalCaseRecord, status_code=status.HTTP_201_CREATED)
def create_case(
    case: ClinicalRequest,
    current_username: str = Depends(require_current_username),
):
    return create_clinical_case(case.model_dump(), owner_username=current_username)


@router.put("/cases/{case_id}", response_model=ClinicalCaseRecord)
def update_case(
    case_id: str,
    case: ClinicalRequest,
    current_username: str = Depends(require_current_username),
):
    updated = update_clinical_case(
        case_id,
        case.model_dump(),
        owner_username=current_username,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Clinical case not found")
    return updated


@router.post("/cases/{case_id}/discussion", response_model=DiscussionResponse)
def create_discussion_message(
    case_id: str,
    request: DiscussionRequest,
    current_username: str = Depends(require_current_username),
):
    case = get_clinical_case(case_id, current_username)
    if not case:
        raise HTTPException(status_code=404, detail="Clinical case not found")

    summary = _build_summary(_case_to_request(case))
    doctor_message = create_case_message(
        case_id=case_id,
        role="doctor",
        owner_username=current_username,
        author_name=request.author_name or "当前医生",
        content=request.content,
    )
    try:
        ai_text = _generate_consult_text(summary, request.content)
        ai_message = create_case_message(
            case_id=case_id,
            role="ai",
            owner_username=current_username,
            author_name="MDT 助手",
            content=ai_text,
        )
    except Exception:
        traceback.print_exc()
        ai_message = create_case_message(
            case_id=case_id,
            role="system",
            owner_username=current_username,
            author_name="系统提示",
            content="当前 LLM 未配置或不可用。医生发言已保存到 PostgreSQL，待模型恢复后可重新发起会诊摘要。",
        )
    touch_clinical_case(case_id, current_username)
    queue_psych_profile_refresh(current_username, trigger="clinical-discussion")
    return {"doctor_message": doctor_message, "ai_message": ai_message}


@router.post("/analyze", response_model=DebateResponse)
def analyze_case(
    req: ClinicalRequest,
    _current_username: str = Depends(require_current_username),
):
    try:
        summary = _build_summary(req)
        system_prompt = "你是镇痛类药物临床助手，请以结构化格式输出：处方建议、备选方案、风险提示、复评计划。"
        oc_answer, baichuan_review, consensus = ask_llm_debate(system_prompt, summary)
        if not oc_answer.strip() or not baichuan_review.strip() or not consensus.strip():
            raise RuntimeError("LLM unavailable or returned an empty clinical result")
        return DebateResponse(
            oc_answer=oc_answer,
            baichuan_review=baichuan_review,
            consensus=consensus,
            risk_warning=_risk_warning(req),
            mme_warning=_mme_warning(req.mme_day),
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/consult")
def consult(discuss_input: str, summary: str):
    return {"consult_text": _generate_consult_text(summary, discuss_input)}


@router.post("/submit", response_model=ClinicalSubmitResponse)
async def submit_case(
    req: ClinicalSubmitRequest,
    current_username: str = Depends(require_current_username),
):
    case_payload = req.model_dump(exclude={"case_id"})
    if req.case_id:
        case = update_clinical_case(
            req.case_id,
            case_payload,
            owner_username=current_username,
            ai_status="running",
        )
        if case is None:
            case = create_clinical_case(
                case_payload,
                owner_username=current_username,
                ai_status="running",
            )
    else:
        case = create_clinical_case(
            case_payload,
            owner_username=current_username,
            ai_status="running",
        )

    job_id = str(uuid.uuid4())
    case_id = case["id"]
    _jobs[job_id] = {
        "status": "running",
        "case_id": case_id,
        "owner_username": current_username,
    }

    loop = asyncio.get_event_loop()

    async def _run():
        try:
            summary = _build_summary(ClinicalRequest(**case_payload))
            system_prompt = "你是镇痛类药物临床助手，请以结构化格式输出：处方建议、备选方案、风险提示、复评计划。"
            oc_answer, baichuan_review, consensus = await loop.run_in_executor(
                _executor,
                lambda: ask_llm_debate(system_prompt, summary),
            )
            if not oc_answer.strip() or not baichuan_review.strip() or not consensus.strip():
                raise RuntimeError("LLM unavailable or returned an empty clinical result")
            result = {
                "oc_answer": oc_answer,
                "baichuan_review": baichuan_review,
                "consensus": consensus,
                "risk_warning": _risk_warning(ClinicalRequest(**case_payload)),
                "mme_warning": _mme_warning(case_payload["mme_day"]),
            }
            save_clinical_case_result(case_id, current_username, result)
            create_case_message(
                case_id=case_id,
                role="ai",
                owner_username=current_username,
                author_name="AI 联合会诊",
                content=consensus,
            )
            queue_psych_profile_refresh(current_username, trigger="clinical-decision")
            _jobs[job_id] = {
                "status": "done",
                "case_id": case_id,
                "owner_username": current_username,
                **result,
            }
        except Exception as exc:
            traceback.print_exc()
            save_clinical_case_error(case_id, current_username, str(exc))
            _jobs[job_id] = {
                "status": "error",
                "case_id": case_id,
                "error": str(exc),
                "owner_username": current_username,
            }

    asyncio.create_task(_run())
    return {"job_id": job_id, "case_id": case_id}


@router.get("/job/{job_id}")
def get_job_status(
    job_id: str,
    current_username: str = Depends(require_current_username),
):
    job = _jobs.get(job_id)
    if not job or job.get("owner_username") != current_username:
        raise HTTPException(status_code=404, detail="Job not found")
    return {key: value for key, value in job.items() if key != "owner_username"}


@router.get("/health")
def llm_health():
    oc_client, oc_model = get_oc_client()
    bc_client = get_baichuan_client()
    return {
        "oc_gateway": oc_client is not None,
        "oc_model": oc_model,
        "baichuan": bc_client is not None,
    }
