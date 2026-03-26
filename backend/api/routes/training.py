"""
虚拟病例训练路由
- 病例生成 + 患者角色扮演：仅用 OC（多轮对话要快）
- 最终评分：OC + 百川各评一次（只在结束时调用）
"""
from __future__ import annotations

import ast
import asyncio
import concurrent.futures
import json
import re
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import require_current_username
from repositories.training_sessions import (
    begin_training_evaluation,
    create_training_message,
    create_training_session,
    get_training_session,
    get_training_stats,
    list_training_messages,
    save_training_evaluation,
    save_training_evaluation_error,
)

from services.llm_service import ask_llm, get_oc_client, get_baichuan_client
from services.psych_profile_service import queue_psych_profile_refresh

router = APIRouter()
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
_jobs: Dict[str, dict] = {}


# ── 请求模型 ─────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    difficulty: str = "intermediate"   # beginner / intermediate / advanced
    department: str = "cardiology"


class CaseGenerateRequest(BaseModel):
    difficulty: str = "intermediate"
    department: str = "cardiology"


class CaseEvaluateRequest(BaseModel):
    case_id: str
    trainee_diagnosis: str = ""
    prescriptions: List[PrescriptionItem] = Field(default_factory=list)
    notes: str = ""   # 学员补充的临床推理


class ChatRequest(BaseModel):
    case_id: str
    message: str
    history: List[dict] = Field(default_factory=list)  # [{"role": "trainee"|"patient", "content": "..."}]


class PrescriptionItem(BaseModel):
    drug: str
    dose: str
    frequency: str
    route: str = "口服"
    duration: str = ""
    rationale: str = ""


class EvaluateRequest(BaseModel):
    case_id: str
    history: List[dict] = Field(default_factory=list)
    trainee_diagnosis: Optional[str] = ""
    prescriptions: List[PrescriptionItem] = Field(default_factory=list)


# ── 映射表 ───────────────────────────────────────────────────────────────────

DIFFICULTY_MAP = {
    "beginner":     "初级（实习医生，病例典型，症状明确）",
    "intermediate": "中级（住院医师，病例复杂，需综合分析）",
    "advanced":     "高级（主治以上，疑难杂症，多系统受累）",
}

DEPARTMENT_MAP = {
    "cardiology": "心内科",
    "neurology":  "神经内科",
    "oncology":   "肿瘤科",
    "emergency":  "急诊科",
    "pain":       "疼痛科",
}


# ── 病例生成（异步）─────────────────────────────────────────────────────────

SCORE_PATTERNS = (
    re.compile(r"(?:闂瘖)?鎬诲垎\s*[:：]?\s*(\d+(?:\.\d+)?)\s*/\s*100"),
    re.compile(r"(\d+(?:\.\d+)?)\s*/\s*100"),
)

ROLE_PREFIX_PATTERN = re.compile(r"^(?:患者|病人|医生|医师|学员|AI)\s*[:：]\s*")
ROLE_CONFUSION_PATTERNS = (
    re.compile(r"(?:我是|作为)(?:医生|医师|大夫|临床医生)"),
    re.compile(r"(?:建议|诊断为|考虑为|处方|用药方案|鉴别诊断)"),
    re.compile(r"(?:请坐下|我需要了解|我来为你|我建议你)"),
)
JSON_CODE_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)
TRAILING_COMMA_PATTERN = re.compile(r",(?=\s*[}\]])")
FULLWIDTH_JSON_TRANSLATION = str.maketrans(
    {
        "“": '"',
        "”": '"',
        "‘": '"',
        "’": '"',
        "：": ":",
        "，": ",",
        "｛": "{",
        "｝": "}",
        "［": "[",
        "］": "]",
    }
)


def _join_key_points(value: object) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item)
    if value is None:
        return ""
    return str(value)


def _extract_balanced_json_object(text: str) -> str | None:
    start = text.find("{")
    if start < 0:
        return None

    depth = 0
    in_string = False
    escape = False

    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start:index + 1]

    return None


def _json_candidate_variants(candidate: str) -> list[str]:
    base = candidate.strip().lstrip("\ufeff")
    if not base:
        return []

    base = re.sub(r"^\s*json\s*", "", base, count=1, flags=re.IGNORECASE).strip()
    normalized = TRAILING_COMMA_PATTERN.sub("", base.translate(FULLWIDTH_JSON_TRANSLATION))
    python_like = normalized
    python_like = re.sub(r"\btrue\b", "True", python_like, flags=re.IGNORECASE)
    python_like = re.sub(r"\bfalse\b", "False", python_like, flags=re.IGNORECASE)
    python_like = re.sub(r"\bnull\b", "None", python_like, flags=re.IGNORECASE)

    return [variant for variant in (base, normalized, python_like) if variant]


def _compact_raw_excerpt(raw: str, limit: int = 240) -> str:
    text = re.sub(r"\s+", " ", (raw or "").strip())
    if len(text) <= limit:
        return text
    return f"{text[:limit]}..."


def _parse_case_json(raw: str) -> dict:
    text = (raw or "").strip().lstrip("\ufeff")
    if not text:
        raise ValueError("病例生成结果为空")
    if text.startswith("AI 生成失败"):
        raise ValueError(text)

    candidates: list[str] = [
        match.group(1).strip()
        for match in JSON_CODE_BLOCK_PATTERN.finditer(text)
    ]

    balanced = _extract_balanced_json_object(text)
    if balanced:
        candidates.append(balanced)

    candidates.append(text)

    seen: set[str] = set()
    last_error: Exception | None = None

    for candidate in candidates:
        for variant in _json_candidate_variants(candidate):
            if variant in seen:
                continue
            seen.add(variant)

            try:
                parsed = json.loads(variant)
            except json.JSONDecodeError as exc:
                last_error = exc
            else:
                if isinstance(parsed, dict):
                    return parsed
                last_error = TypeError("病例 JSON 顶层必须是对象")
                continue

            try:
                parsed = ast.literal_eval(variant)
            except (SyntaxError, ValueError) as exc:
                last_error = exc
                continue

            if isinstance(parsed, dict):
                return parsed
            last_error = TypeError("病例 JSON 顶层必须是对象")

    raise ValueError(f"无法解析病例 JSON：{_compact_raw_excerpt(text)}") from last_error


def _message_history(
    case_id: str,
    owner_username: str,
    fallback: list[dict] | None = None,
) -> list[dict]:
    stored_messages = list_training_messages(case_id, owner_username)
    if stored_messages:
        return [
            {"role": message["role"], "content": message["content"]}
            for message in stored_messages
        ]
    return fallback or []


def _prescription_payload(prescriptions: list[PrescriptionItem]) -> list[dict]:
    return [prescription.model_dump() for prescription in prescriptions if prescription.drug.strip()]


def _extract_total_score(report: str) -> float | None:
    for pattern in SCORE_PATTERNS:
        match = pattern.search(report)
        if not match:
            continue
        try:
            score = float(match.group(1))
        except ValueError:
            return None
        return max(0.0, min(score, 100.0))
    return None


def _normalize_patient_reply(reply: str) -> str:
    text = (reply or "").strip()
    if not text:
        return "我有点不舒服，您继续问吧。"

    text = ROLE_PREFIX_PATTERN.sub("", text)
    text = text.replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return "我有点不舒服，您继续问吧。"

    first_line = ROLE_PREFIX_PATTERN.sub("", lines[0])
    first_line = re.split(r"[。！？]\s*", first_line, maxsplit=1)[0].strip()
    if not first_line:
        first_line = lines[0]

    for pattern in ROLE_CONFUSION_PATTERNS:
        if pattern.search(first_line):
            return "这个我说不清，您可以继续问我症状。"

    return first_line[:80]


class TrainingStatsResponse(BaseModel):
    completed_trainings: int
    simulation_completed_trainings: int
    case_analysis_completed_trainings: int
    average_score: float


@router.get("/stats", response_model=TrainingStatsResponse)
def training_stats(current_username: str = Depends(require_current_username)):
    return get_training_stats(current_username)


@router.post("/generate")
async def generate_case(
    req: GenerateRequest,
    current_username: str = Depends(require_current_username),
):
    """异步生成虚拟病例，立即返回 job_id"""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running", "owner_username": current_username}

    async def _run():
        try:
            client, model = get_oc_client()
            dept = DEPARTMENT_MAP.get(req.department, req.department)
            diff = DIFFICULTY_MAP.get(req.difficulty, req.difficulty)

            prompt = (
                f"请为医学生生成一个{dept}虚拟训练病例，难度：{diff}。\n\n"
                "严格按以下 JSON 格式输出，不要添加任何额外说明：\n"
                "{\n"
                '  "chief_complaint": "主诉（1句话）",\n'
                '  "patient_intro": "患者向医生的自我介绍（第一人称，40字以内，只说主诉和基本情况，不透露诊断）",\n'
                '  "patient_background": "年龄、性别、职业、基础病（供AI扮演参考，不展示给学员）",\n'
                '  "diagnosis": "正确诊断（仅供系统评分，不展示给学员）",\n'
                '  "key_points": ["鉴别诊断要点1", "要点2", "要点3"]\n'
                "}"
            )

            raw = ask_llm(
                client, model,
                f"你是医学教育系统，负责生成{dept}标准化训练病例。请严格按JSON格式输出。",
                prompt,
                max_tokens=400,
            )

            case_data = _parse_case_json(raw)

            case_id = str(uuid.uuid4())
            create_training_session(
                {
                    "id": case_id,
                    "mode": "simulation",
                    "department": dept,
                    "difficulty": req.difficulty,
                    "chief_complaint": case_data.get("chief_complaint", ""),
                    "patient_intro": case_data.get("patient_intro", ""),
                    "patient_background": case_data.get("patient_background", ""),
                    "diagnosis": case_data.get("diagnosis", ""),
                    "key_points": _join_key_points(case_data.get("key_points", [])),
                },
                owner_username=current_username,
            )
            if case_data.get("patient_intro"):
                create_training_message(
                    case_id,
                    current_username,
                    role="patient",
                    content=case_data.get("patient_intro", ""),
                )

            _jobs[job_id] = {
                "status": "done",
                "case_id": case_id,
                "chief_complaint": case_data.get("chief_complaint", ""),
                "patient_intro": case_data.get("patient_intro", ""),
                "department": dept,
                "difficulty": req.difficulty,
                "owner_username": current_username,
            }
        except Exception as exc:
            import traceback
            traceback.print_exc()
            _jobs[job_id] = {
                "status": "error",
                "error": str(exc),
                "owner_username": current_username,
            }

    asyncio.create_task(_run())
    return {"job_id": job_id}


@router.get("/job/{job_id}")
def get_job(job_id: str, current_username: str = Depends(require_current_username)):
    job = _jobs.get(job_id)
    if not job or job.get("owner_username") != current_username:
        raise HTTPException(status_code=404, detail="Job not found")
    return {key: value for key, value in job.items() if key != "owner_username"}


# ── 患者角色扮演（同步，快速）────────────────────────────────────────────────

@router.post("/chat")
def training_chat(
    req: ChatRequest,
    current_username: str = Depends(require_current_username),
):
    """OC 扮演患者回应医生问诊（同步，max_tokens=150，通常 3-5 秒）"""
    case = get_training_session(req.case_id, current_username)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    client, model = get_oc_client()

    # 最近 6 轮历史
    history_text = ""
    for turn in _message_history(req.case_id, current_username, req.history)[-6:]:
        role = "医生" if turn["role"] == "trainee" else "患者"
        history_text += f"{role}：{turn['content']}\n"

    system_prompt = (
        f"你是一位正在就诊的患者，不是医生，不是AI，不是任何其他角色。\n"
        f"患者背景：{case.get('patient_background', '')}\n"
        f"你的病情（绝对不可主动说出诊断名称）：{case.get('diagnosis', '')}相关症状\n\n"
        "【严格禁止】：\n"
        "- 禁止说「我是医生」「请坐下」「我需要了解」等医生用语\n"
        "- 禁止反问医生病情、禁止给出任何医学建议\n"
        "- 禁止切换身份，始终保持患者视角\n\n"
        "【扮演规则】：\n"
        "1. 第一人称患者口吻，语气口语、自然\n"
        "2. 只描述自己的症状和感受，回答医生的提问\n"
        "3. 没有的症状如实说没有\n"
        "4. 回答控制在 40 字以内\n"
        "5. 可以表现紧张、疼痛、担忧等情绪"
    )

    user_prompt = f"{history_text}医生：{req.message}\n患者："

    create_training_message(req.case_id, current_username, role="trainee", content=req.message)
    response = _normalize_patient_reply(
        ask_llm(client, model, system_prompt, user_prompt, max_tokens=150)
    )
    create_training_message(req.case_id, current_username, role="patient", content=response)
    return {"response": response}


# ── 最终评分（异步，OC + 百川各一次）────────────────────────────────────────

@router.post("/evaluate")
async def evaluate_training(
    req: EvaluateRequest,
    current_username: str = Depends(require_current_username),
):
    """训练结束后评分：OC 主评 + 百川补充建议（仅调一次）"""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running", "owner_username": current_username}

    case = get_training_session(req.case_id, current_username)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    prescriptions = _prescription_payload(req.prescriptions)
    begin_training_evaluation(
        req.case_id,
        current_username,
        trainee_diagnosis=req.trainee_diagnosis or "",
        prescriptions=prescriptions,
    )

    loop = asyncio.get_event_loop()

    async def _run():
        try:
            case = get_training_session(req.case_id, current_username) or {}
            diagnosis = case.get("diagnosis", "未知")
            key_points = _join_key_points(case.get("key_points", ""))
            dept = case.get("department", "")

            history_text = "\n".join([
                f"{'医生' if t['role'] == 'trainee' else '患者'}：{t['content']}"
                for t in _message_history(req.case_id, current_username, req.history)
            ])

            # ── 问诊评分部分 ──
            eval_prompt = (
                f"正确诊断：{diagnosis}\n"
                f"关键鉴别要点：{key_points}\n\n"
                f"学员问诊记录：\n{history_text}\n\n"
                f"学员给出的诊断：{req.trainee_diagnosis or '未给出'}\n\n"
                "【一、问诊评分（100分）】\n"
                "请从以下 5 个维度评估（各20分）：\n"
                "1. 问诊系统性（主诉/现病史/既往史/用药史等覆盖情况）\n"
                "2. 鉴别诊断思路（是否抓住关键鉴别问题）\n"
                "3. 诊断准确性\n"
                "4. 问诊效率（抓重点，避免无效提问）\n"
                "5. 沟通技巧（关注患者情绪，表达清晰）\n"
                "格式：先给出「问诊总分 X/100」，再逐项说明得分。"
            )

            # ── 处方评分部分（如有）──
            rx_text = ""  # 供百川引用
            rx_eval_prompt = ""
            if req.prescriptions:
                rx_lines = []
                for i, rx in enumerate(req.prescriptions):
                    line = f"{i+1}. {rx.drug}  {rx.dose}  {rx.frequency}  {rx.route}"
                    if rx.duration:
                        line += f"  疗程：{rx.duration}"
                    if rx.rationale:
                        line += f"  依据：{rx.rationale}"
                    rx_lines.append(line)
                rx_text = "\n".join(rx_lines)

                rx_eval_prompt = (
                    f"\n\n【二、处方评分（100分）】\n"
                    f"患者背景：{case.get('patient_background', '')}，"
                    f"诊断：{diagnosis}\n"
                    f"学员开具处方：\n{rx_text}\n\n"
                    "请从以下 5 个维度评估处方合理性（各20分）：\n"
                    "1. 药物选择适应症（适应证是否匹配诊断）\n"
                    "2. 剂量安全性（是否在推荐范围内）\n"
                    "3. 禁忌症与过敏史（结合患者既往史）\n"
                    "4. 阿片类专项（如涉及：MME是否合理、是否提及监测计划、ORT风险评估）；"
                    "   非阿片类药物：药物相互作用是否安全\n"
                    "5. 处方完整性（疗程、频次、给药途径是否合理）\n"
                    "格式：先给出「处方总分 X/100」，再逐项说明，最后给出一句总体建议。"
                )
                eval_prompt += rx_eval_prompt

            client, model = get_oc_client()
            oc_eval = await loop.run_in_executor(
                _executor,
                lambda: ask_llm(
                    client, model,
                    f"你是{dept}医学教育考官，请专业评估住院医师的问诊表现。",
                    eval_prompt,
                    max_tokens=500,
                ),
            )

            # 百川补充点评（重点关注处方安全，80字以内）
            bc_comment = ""
            baichuan_client = get_baichuan_client()
            if baichuan_client:
                try:
                    has_rx = bool(req.prescriptions)
                    bc_focus = (
                        "处方安全性（尤其是阿片类剂量、禁忌症、药物相互作用）" if has_rx
                        else "问诊与诊断思路"
                    )
                    bc_user = (
                        f"正确诊断：{diagnosis}\n"
                        f"OC评分报告：{oc_eval}\n"
                    )
                    if has_rx:
                        bc_user += f"学员处方：{rx_text}\n"
                    bc_user += f"请重点针对【{bc_focus}】补充最关键的一条建议，80字以内。"

                    rsp = baichuan_client.chat.completions.create(
                        model="Baichuan4-Turbo",
                        messages=[
                            {"role": "system", "content": "你是临床医学教育专家，擅长处方安全与合理用药评估，请给出简洁精准的改进建议。"},
                            {"role": "user", "content": bc_user},
                        ],
                        temperature=0.2,
                        max_tokens=150,
                    )
                    bc_comment = (rsp.choices[0].message.content or "").strip()
                except Exception:
                    pass

            save_training_evaluation(
                req.case_id,
                current_username,
                {
                    "trainee_diagnosis": req.trainee_diagnosis or "",
                    "prescriptions": prescriptions,
                    "total_score": _extract_total_score(oc_eval),
                    "oc_eval": oc_eval,
                    "bc_comment": bc_comment,
                    "correct_diagnosis": diagnosis,
                },
            )

            queue_psych_profile_refresh(current_username, trigger="training-evaluation")
            _jobs[job_id] = {
                "status": "done",
                "case_id": req.case_id,
                "oc_eval": oc_eval,
                "bc_comment": bc_comment,
                "correct_diagnosis": diagnosis,
                "owner_username": current_username,
            }
        except Exception as exc:
            import traceback
            traceback.print_exc()
            save_training_evaluation_error(req.case_id, current_username, str(exc))
            _jobs[job_id] = {
                "status": "error",
                "error": str(exc),
                "owner_username": current_username,
            }

    asyncio.create_task(_run())
    return {"job_id": job_id}


# ── 模式一：病例分析 ─ 生成完整病例摘要（异步）────────────────────────────────

@router.post("/case-generate")
async def case_generate(
    req: CaseGenerateRequest,
    current_username: str = Depends(require_current_username),
):
    """生成完整结构化病例摘要供学员阅读分析"""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running", "owner_username": current_username}
    async def _run():
        try:
            client, model = get_oc_client()
            dept = DEPARTMENT_MAP.get(req.department, req.department)
            diff = DIFFICULTY_MAP.get(req.difficulty, req.difficulty)

            prompt = (
                f"请为医学生生成一个{dept}完整标准化病例，难度：{diff}。\n\n"
                "严格按以下 JSON 格式输出，不要添加任何额外说明：\n"
                "{\n"
                '  "chief_complaint": "主诉（1句，含时间）",\n'
                '  "present_illness": "现病史（150字以内，症状发展、加重/缓解因素、伴随症状）",\n'
                '  "past_history": "既往史（基础疾病、手术史、药物史、过敏史）",\n'
                '  "physical_exam": "体格检查（生命体征 + 阳性体征，80字以内）",\n'
                '  "lab_results": "辅助检查（血常规、生化、心电图等关键结果，80字以内）",\n'
                '  "imaging": "影像学（关键发现，无则填空字符串）",\n'
                '  "diagnosis": "正确诊断（含主次诊断，仅系统使用）",\n'
                '  "key_points": ["诊断依据1", "依据2", "依据3"],\n'
                '  "scoring_criteria": "评分重点提示（如：需识别X特征，处方需注意Y）"\n'
                "}"
            )

            raw = ask_llm(
                client, model,
                f"你是{dept}医学教育系统，负责生成完整标准化病例。请严格按JSON格式输出。",
                prompt,
                max_tokens=600,
            )

            case_data = _parse_case_json(raw)

            case_id = str(uuid.uuid4())
            create_training_session(
                {
                    "id": case_id,
                    "mode": "case_analysis",
                    "department": dept,
                    "difficulty": req.difficulty,
                    "chief_complaint": case_data.get("chief_complaint", ""),
                    "present_illness": case_data.get("present_illness", ""),
                    "past_history": case_data.get("past_history", ""),
                    "physical_exam": case_data.get("physical_exam", ""),
                    "lab_results": case_data.get("lab_results", ""),
                    "imaging": case_data.get("imaging", ""),
                    "diagnosis": case_data.get("diagnosis", ""),
                    "key_points": _join_key_points(case_data.get("key_points", [])),
                    "scoring_criteria": case_data.get("scoring_criteria", ""),
                },
                owner_username=current_username,
            )

            _jobs[job_id] = {
                "status": "done",
                "case_id": case_id,
                "chief_complaint": case_data.get("chief_complaint", ""),
                "present_illness": case_data.get("present_illness", ""),
                "past_history": case_data.get("past_history", ""),
                "physical_exam": case_data.get("physical_exam", ""),
                "lab_results": case_data.get("lab_results", ""),
                "imaging": case_data.get("imaging", ""),
                "department": dept,
                "difficulty": req.difficulty,
                "owner_username": current_username,
            }
        except Exception as exc:
            import traceback
            traceback.print_exc()
            _jobs[job_id] = {
                "status": "error",
                "error": str(exc),
                "owner_username": current_username,
            }

    asyncio.create_task(_run())
    return {"job_id": job_id}


# ── 模式一：病例分析 ─ 评分（异步）────────────────────────────────────────────

@router.post("/case-evaluate")
async def case_evaluate(
    req: CaseEvaluateRequest,
    current_username: str = Depends(require_current_username),
):
    """评估学员的诊断 + 处方（OC 主评 + 百川药物安全审查）"""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running", "owner_username": current_username}
    case = get_training_session(req.case_id, current_username)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    prescriptions = _prescription_payload(req.prescriptions)
    begin_training_evaluation(
        req.case_id,
        current_username,
        trainee_diagnosis=req.trainee_diagnosis or "",
        notes=req.notes or "",
        prescriptions=prescriptions,
    )
    loop = asyncio.get_event_loop()

    async def _run():
        try:
            case = get_training_session(req.case_id, current_username) or {}
            diagnosis = case.get("diagnosis", "未知")
            key_points = _join_key_points(case.get("key_points", ""))
            scoring_criteria = case.get("scoring_criteria", "")
            dept = case.get("department", "")

            rx_text = ""
            if req.prescriptions:
                lines = []
                for i, rx in enumerate(req.prescriptions):
                    line = f"{i+1}. {rx.drug} {rx.dose} {rx.frequency} {rx.route}"
                    if rx.duration: line += f" 疗程：{rx.duration}"
                    if rx.rationale: line += f" 依据：{rx.rationale}"
                    lines.append(line)
                rx_text = "\n".join(lines)

            eval_prompt = (
                f"【正确诊断】{diagnosis}\n"
                f"【诊断依据要点】{key_points}\n"
                f"【评分重点】{scoring_criteria}\n\n"
                f"【学员诊断】{req.trainee_diagnosis or '未给出'}\n"
                f"【学员处方】\n{rx_text or '未开具处方'}\n"
                f"【学员推理补充】{req.notes or '无'}\n\n"
                "请从三个维度评分（总分100分）：\n\n"
                "【一、诊断准确性（40分）】\n"
                "主诊断正确（20分）、识别关键依据（10分）、鉴别诊断（10分）\n\n"
                "【二、治疗方案合理性（40分）】\n"
                "药物选择（15分）、剂量安全（10分）、禁忌/相互作用（10分）、"
                "阿片类专项如适用：MME+监测计划（5分）\n\n"
                "【三、临床推理完整性（20分）】\n"
                "病史运用（10分）、辅助检查解读（10分）\n\n"
                "格式：先「总分 X/100」，再逐项得分说明，最后一段综合优化建议。"
            )

            client, model = get_oc_client()
            oc_eval = await loop.run_in_executor(
                _executor,
                lambda: ask_llm(
                    client, model,
                    f"你是{dept}医学教育考官，请专业评估住院医师的病例分析与处方方案。",
                    eval_prompt,
                    max_tokens=600,
                ),
            )

            bc_comment = ""
            baichuan_client = get_baichuan_client()
            if baichuan_client and req.prescriptions:
                try:
                    rsp = baichuan_client.chat.completions.create(
                        model="Baichuan4-Turbo",
                        messages=[
                            {"role": "system", "content": "你是临床药学专家，擅长处方安全评估，尤其关注阿片类药物合理使用。给出最关键的一条用药安全建议，80字以内。"},
                            {"role": "user", "content": f"正确诊断：{diagnosis}\n学员处方：{rx_text}\n请给出最关键的用药安全建议。"},
                        ],
                        temperature=0.2,
                        max_tokens=150,
                    )
                    bc_comment = (rsp.choices[0].message.content or "").strip()
                except Exception:
                    pass

            save_training_evaluation(
                req.case_id,
                current_username,
                {
                    "trainee_diagnosis": req.trainee_diagnosis or "",
                    "notes": req.notes or "",
                    "prescriptions": prescriptions,
                    "total_score": _extract_total_score(oc_eval),
                    "oc_eval": oc_eval,
                    "bc_comment": bc_comment,
                    "correct_diagnosis": diagnosis,
                },
            )

            queue_psych_profile_refresh(current_username, trigger="training-evaluation")
            _jobs[job_id] = {
                "status": "done",
                "case_id": req.case_id,
                "oc_eval": oc_eval,
                "bc_comment": bc_comment,
                "correct_diagnosis": diagnosis,
                "owner_username": current_username,
            }
        except Exception as exc:
            import traceback
            traceback.print_exc()
            save_training_evaluation_error(req.case_id, current_username, str(exc))
            _jobs[job_id] = {
                "status": "error",
                "error": str(exc),
                "owner_username": current_username,
            }

    asyncio.create_task(_run())
    return {"job_id": job_id}
