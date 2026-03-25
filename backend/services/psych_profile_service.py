from __future__ import annotations

import concurrent.futures
import json
import re
from datetime import datetime
from typing import Any

from repositories.clinical_cases import list_case_messages, list_recent_clinical_cases
from repositories.training_sessions import (
    get_training_stats,
    list_recent_training_sessions,
    list_training_messages,
)
from repositories.users import get_user_by_username, parse_psych_profile, save_psych_profile
from services.llm_service import ask_llm, get_oc_client

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)


def _safe_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _truncate(value: str, limit: int = 220) -> str:
    text = _safe_text(value)
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    isoformat = getattr(value, "isoformat", None)
    if callable(isoformat):
        return isoformat()
    return str(value)


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=_json_default)


def _training_evidence(owner_username: str, limit: int = 3) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    sessions = list_recent_training_sessions(owner_username, limit=limit)
    for session in sessions:
        messages = list_training_messages(session["id"], owner_username)[-4:]
        dialogue = [
            f"{message['role']}: {_truncate(message['content'], 90)}"
            for message in messages
        ]
        evidence.append(
            {
                "id": session["id"],
                "mode": _safe_text(session.get("mode"), "unknown"),
                "department": _safe_text(session.get("department"), "unknown"),
                "difficulty": _safe_text(session.get("difficulty"), "unknown"),
                "chief_complaint": _truncate(session.get("chief_complaint", ""), 120),
                "correct_diagnosis": _truncate(session.get("correct_diagnosis") or session.get("diagnosis", ""), 120),
                "trainee_diagnosis": _truncate(session.get("trainee_diagnosis", ""), 120),
                "notes": _truncate(session.get("notes", ""), 160),
                "score": session.get("total_score"),
                "status": _safe_text(session.get("evaluation_status"), "pending"),
                "oc_eval": _truncate(session.get("oc_eval", ""), 200),
                "bc_comment": _truncate(session.get("bc_comment", ""), 120),
                "dialogue": dialogue,
                "updated_at": session.get("updated_at"),
            }
        )
    return evidence


def _clinical_evidence(owner_username: str, limit: int = 3) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    cases = list_recent_clinical_cases(owner_username, limit=limit)
    for case in cases:
        messages = list_case_messages(case["id"], owner_username)[-4:]
        discussion = [
            f"{message['role']}: {_truncate(message['content'], 100)}"
            for message in messages
        ]
        evidence.append(
            {
                "id": case["id"],
                "department": _safe_text(case.get("department"), "unknown"),
                "diagnosis": _truncate(case.get("diagnosis", ""), 120),
                "pain_score": case.get("pain_score"),
                "plan_drug": _safe_text(case.get("plan_drug"), "none"),
                "mme_day": case.get("mme_day"),
                "ort_level": _safe_text(case.get("ort_level"), "unknown"),
                "ai_status": _safe_text(case.get("ai_status"), "draft"),
                "consensus": _truncate(case.get("consensus", ""), 220),
                "risk_warning": _safe_text(case.get("risk_warning"), "unknown"),
                "discussion": discussion,
                "updated_at": case.get("updated_at"),
            }
        )
    return evidence


def _fallback_profile(
    username: str,
    current_profile: dict[str, Any] | None,
    stats: dict[str, Any],
    training_items: list[dict[str, Any]],
    clinical_items: list[dict[str, Any]],
    trigger: str,
) -> dict[str, Any]:
    completed_trainings = int(stats.get("completed_trainings") or 0)
    average_score = float(stats.get("average_score") or 0.0)
    clinical_count = len(clinical_items)

    if completed_trainings >= 5 and average_score >= 85:
        headline = "偏证据导向，临床推理较稳定"
    elif completed_trainings >= 2:
        headline = "处于稳定成长阶段，诊疗框架逐步成形"
    else:
        headline = "画像样本仍少，需继续累积训练与病例证据"

    traits = ["风险敏感"]
    if average_score >= 80:
        traits.append("学习吸收较快")
    if clinical_count > 0:
        traits.append("愿意结合临床场景修正判断")
    if any(item.get("discussion") for item in clinical_items):
        traits.append("有协作沟通意识")

    strengths = [
        "愿意持续完成训练并形成阶段性反馈闭环。",
        "能够在训练和真实病例之间迁移部分诊疗经验。",
    ]
    if average_score >= 80:
        strengths.append("诊断与处置的整体稳定性较好。")

    watchouts = [
        "样本不足时，画像更多反映近期状态，不应视为固定人格结论。",
        "若最近病例复杂度明显提升，容易出现谨慎过度或决策迟滞。",
    ]
    if completed_trainings < 3:
        watchouts.append("训练样本偏少，当前画像可信度有限。")

    coaching = [
        "继续在完成病例后补充自我复盘，提升画像对思维模式的解释力。",
        "在高风险处方场景中保留用药依据，便于后续追踪决策偏差。",
    ]

    previous_headline = _safe_text((current_profile or {}).get("headline"))
    evolution = (
        f"本次由 {trigger} 触发更新。"
        + (f" 相较上一版“{previous_headline}”，本次更强调近期训练与临床协作证据。" if previous_headline else " 当前为首版画像。")
    )

    return {
        "headline": headline,
        "summary": f"账号 {username} 当前呈现出以风险控制和结构化学习为主的决策风格，画像由 {completed_trainings} 次训练与 {clinical_count} 条临床病例证据综合生成。",
        "traits": traits[:4],
        "strengths": strengths[:4],
        "watchouts": watchouts[:4],
        "coaching": coaching[:4],
        "evolution": evolution,
        "confidence": "中" if completed_trainings + clinical_count >= 4 else "低",
        "evidence": {
            "completed_trainings": completed_trainings,
            "average_score": round(average_score, 1),
            "recent_clinical_cases": clinical_count,
            "recent_training_samples": len(training_items),
        },
        "generated_by": "fallback",
    }


def _build_prompt(
    username: str,
    current_profile: dict[str, Any] | None,
    stats: dict[str, Any],
    training_items: list[dict[str, Any]],
    clinical_items: list[dict[str, Any]],
    trigger: str,
) -> str:
    previous = _json_dumps(current_profile or {})
    training_text = _json_dumps(training_items)
    clinical_text = _json_dumps(clinical_items)

    return (
        f"用户账号: {username}\n"
        f"触发来源: {trigger}\n"
        f"历史心理画像: {previous}\n"
        f"训练统计: {_json_dumps(stats)}\n"
        f"最近训练证据: {training_text}\n"
        f"最近临床辅助证据: {clinical_text}\n\n"
        "任务:\n"
        "1. 你不是做医疗诊断，而是基于互动行为、学习表现、风险偏好、沟通方式和反思习惯，生成医生或医学生账号的动态心理画像。\n"
        "2. 必须把上一版画像作为连续上下文，不要每次完全推翻；如果有变化，要解释变化来自哪些新证据。\n"
        "3. 画像应聚焦学习风格、决策风格、风险偏好、沟通协作倾向、压力下表现，不要做疾病诊断或病理推断。\n"
        "4. 结论要谨慎，避免绝对化；当证据不足时必须明确说明可信度有限。\n\n"
        "严格输出 JSON，不要加任何额外解释:\n"
        "{\n"
        '  "headline": "一句话画像标题，不超过24字",\n'
        '  "summary": "120-180字的综合画像总结",\n'
        '  "traits": ["特征1", "特征2", "特征3"],\n'
        '  "strengths": ["优势1", "优势2", "优势3"],\n'
        '  "watchouts": ["风险点1", "风险点2", "风险点3"],\n'
        '  "coaching": ["建议1", "建议2", "建议3"],\n'
        '  "evolution": "说明本次相对上一版的变化",\n'
        '  "confidence": "高/中/低"\n'
        "}\n"
    )


def generate_psych_profile(owner_username: str, trigger: str = "manual") -> dict[str, Any] | None:
    user = get_user_by_username(owner_username)
    if not user:
        return None

    current_profile = parse_psych_profile(user)
    stats = get_training_stats(owner_username)
    training_items = _training_evidence(owner_username)
    clinical_items = _clinical_evidence(owner_username)

    profile = _fallback_profile(
        owner_username,
        current_profile,
        stats,
        training_items,
        clinical_items,
        trigger,
    )

    client, model = get_oc_client()
    if client:
        raw = ask_llm(
            client,
            model,
            "你是医疗教育场景中的行为分析助手，负责生成谨慎、可追踪、非病理化的动态心理画像。",
            _build_prompt(owner_username, current_profile, stats, training_items, clinical_items, trigger),
            max_tokens=900,
        )
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                parsed = json.loads(match.group())
                if isinstance(parsed, dict):
                    profile = {
                        "headline": _safe_text(parsed.get("headline"), profile["headline"]),
                        "summary": _safe_text(parsed.get("summary"), profile["summary"]),
                        "traits": [str(item) for item in parsed.get("traits", []) if str(item).strip()][:4] or profile["traits"],
                        "strengths": [str(item) for item in parsed.get("strengths", []) if str(item).strip()][:4] or profile["strengths"],
                        "watchouts": [str(item) for item in parsed.get("watchouts", []) if str(item).strip()][:4] or profile["watchouts"],
                        "coaching": [str(item) for item in parsed.get("coaching", []) if str(item).strip()][:4] or profile["coaching"],
                        "evolution": _safe_text(parsed.get("evolution"), profile["evolution"]),
                        "confidence": _safe_text(parsed.get("confidence"), profile["confidence"]),
                        "evidence": profile["evidence"],
                        "generated_by": model,
                    }
            except json.JSONDecodeError:
                pass

    saved = save_psych_profile(owner_username, profile)
    if not saved:
        return None

    saved_profile = parse_psych_profile(saved)
    if saved_profile:
        return saved_profile

    return {
        **profile,
        "updated_at": datetime.utcnow().isoformat(),
        "version": int(saved.get("psych_profile_version") or 0),
    }


def queue_psych_profile_refresh(owner_username: str, trigger: str = "manual") -> None:
    _executor.submit(generate_psych_profile, owner_username, trigger)
