"""
LLM 服务层 —— OC Gateway（MiniMax-M2.5）× 百川4-Turbo 三阶 Debate 机制
移植自 medical_ai_web/services/llm_service.py，去除 Streamlit 依赖
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional, Tuple

from openai import OpenAI


# ── 客户端初始化 ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_oc_client() -> Tuple[Optional[OpenAI], str]:
    """
    优先级：OC Gateway → DashScope/Qwen → 无
    """
    oc_token = os.environ.get("OC_GATEWAY_TOKEN", "").strip()
    oc_url = os.environ.get("OC_GATEWAY_URL", "http://127.0.0.1:18789/v1").strip()
    if oc_token:
        return OpenAI(api_key=oc_token, base_url=oc_url), "minimax"

    dashscope_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if dashscope_key:
        return (
            OpenAI(
                api_key=dashscope_key,
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            ),
            "qwen-plus",
        )
    return None, ""


@lru_cache(maxsize=1)
def get_baichuan_client() -> Optional[OpenAI]:
    key = os.environ.get("BAICHUAN_API_KEY", "").strip()
    if key:
        return OpenAI(api_key=key, base_url="https://api.baichuan-ai.com/v1")
    return None


# ── 基础调用 ────────────────────────────────────────────────────────────────

def ask_llm(
    client: Optional[OpenAI],
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1000,
) -> str:
    if not client:
        return ""
    try:
        rsp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=max_tokens,
        )
        return (rsp.choices[0].message.content or "").strip()
    except Exception as exc:
        return f"AI 生成失败：{exc}"


# ── 三阶 LLM Debate ─────────────────────────────────────────────────────────

def ask_llm_debate(
    system_prompt: str,
    user_prompt: str,
) -> Tuple[str, str, str]:
    """
    三阶辩论机制：
    Step 1 — OC（MiniMax via OpenClaw）基于 Skill 知识库给出初步答案
    Step 2 — 百川4-Turbo 医疗专家审阅，补充或纠正
    Step 3 — OC 综合两方意见输出最终共识
    返回 (oc_answer, baichuan_review, consensus)
    """
    oc_client, oc_model = get_oc_client()
    baichuan_client = get_baichuan_client()

    # Step 1：OC 初步答案
    oc_answer = ask_llm(oc_client, oc_model, system_prompt, user_prompt, max_tokens=500)
    if not oc_answer or not baichuan_client:
        return oc_answer, "", oc_answer

    # Step 2：百川审阅
    baichuan_prompt = (
        f"以下是另一个AI系统基于临床病例数据库给出的回答，请你作为医学专家审阅：\n\n"
        f"【原始问题】\n{user_prompt}\n\n"
        f"【病例库AI的回答】\n{oc_answer}\n\n"
        f"请指出回答中需要补充或纠正的内容（如有），并给出你的专业意见。如无异议请说明。"
    )
    try:
        rsp = baichuan_client.chat.completions.create(
            model="Baichuan4-Turbo",
            messages=[
                {
                    "role": "system",
                    "content": "你是百川医疗大模型，具备丰富的临床医学知识，请对病例库AI的回答进行专业审阅。",
                },
                {"role": "user", "content": baichuan_prompt},
            ],
            temperature=0.2,
            max_tokens=400,
        )
        baichuan_review = (rsp.choices[0].message.content or "").strip()
    except Exception:
        return oc_answer, "", oc_answer

    # Step 3：OC 综合共识
    consensus_prompt = (
        f"【原始问题】\n{user_prompt}\n\n"
        f"【病例库初步答案】\n{oc_answer}\n\n"
        f"【百川医疗专家审阅意见】\n{baichuan_review}\n\n"
        f"请综合以上两个来源，整合为一个完整、准确、可直接用于临床参考的最终答案。"
    )
    consensus = ask_llm(
        oc_client,
        oc_model,
        "你是临床决策辅助系统，请综合病例数据库与医学专家意见，给出最终临床建议。",
        consensus_prompt,
        max_tokens=500,
    )
    return oc_answer, baichuan_review, consensus or oc_answer
