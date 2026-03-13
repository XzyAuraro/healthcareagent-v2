"""
临床辅助路由 —— 接入 OC × 百川 LLM Debate 引擎
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.llm_service import ask_llm_debate, ask_llm, get_oc_client

router = APIRouter()


# ── 请求/响应模型 ───────────────────────────────────────────────────────────

class ClinicalRequest(BaseModel):
    # 患者基本信息
    patient_name: Optional[str] = ""
    age: int = 50
    gender: str = "男"
    # 诊断与疼痛
    diagnosis: str
    pain_score: int = 5
    pain_type: str = "非癌性慢性疼痛"
    department: str = "疼痛科"
    # 用药信息
    current_opioid: str = "无"
    current_dose: float = 0.0
    current_freq: str = "无"
    plan_drug: str = "无"
    plan_dose: float = 0.0
    plan_freq: int = 2
    mme_day: float = 0.0
    # 风险因素
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
    # 补充
    extra_notes: Optional[str] = ""
    free_text: Optional[str] = ""


class DebateResponse(BaseModel):
    oc_answer: str
    baichuan_review: str
    consensus: str
    risk_warning: str
    mme_warning: str


# ── 工具函数 ────────────────────────────────────────────────────────────────

def _build_summary(req: ClinicalRequest) -> str:
    """构造与 Streamlit 版完全一致的结构化病例摘要"""
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
疼痛评分：{req.pain_score}/10（{req.pain_type}）
科室：{req.department}
合并症：{req.comorbidities}
当前用药：{current_meds}
拟开具药物：{req.plan_drug}，剂量：{req.plan_dose}mg，频次：{req.plan_freq}/day，MME/day={req.mme_day}
本人物质使用史：{req.personal_use}
家族物质使用史：{req.family_use}
心理病史：{req.psych_histories}
ORT：{req.ort_score}（{req.ort_level}）
过敏史：{req.allergies}
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


# ── 路由 ────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=DebateResponse)
def analyze_case(req: ClinicalRequest):
    """
    临床病例 AI 联合会诊：OC × 百川 三阶 Debate
    """
    summary = _build_summary(req)
    system_prompt = (
        "你是镇痛类药物临床助手，请以结构化格式输出：处方建议、备选方案、风险提示、复评计划。"
    )

    oc_answer, baichuan_review, consensus = ask_llm_debate(system_prompt, summary)

    return DebateResponse(
        oc_answer=oc_answer,
        baichuan_review=baichuan_review,
        consensus=consensus,
        risk_warning=_risk_warning(req),
        mme_warning=_mme_warning(req.mme_day),
    )


@router.post("/consult")
def consult(discuss_input: str, summary: str):
    """
    会诊讨论区：生成结构化会诊摘要
    """
    client, model = get_oc_client()
    prompt = (
        f"病例摘要：{summary}\n\n"
        f"会诊补充：{discuss_input or '无补充'}\n\n"
        "请输出：1) 会诊结论 2) 48-72h复评重点 3) 风险沟通要点。"
    )
    result = ask_llm(
        client, model,
        "你是医院疼痛管理MDT秘书，请输出简洁、可落地的会诊摘要。",
        prompt,
    )
    return {"consult_text": result}


@router.get("/health")
def llm_health():
    """检查 OC Gateway 和百川是否可用"""
    from services.llm_service import get_baichuan_client
    oc_client, oc_model = get_oc_client()
    bc_client = get_baichuan_client()
    return {
        "oc_gateway": oc_client is not None,
        "oc_model": oc_model,
        "baichuan": bc_client is not None,
    }
