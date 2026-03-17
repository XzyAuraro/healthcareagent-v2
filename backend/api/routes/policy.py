"""
政策解读 AI 助手路由
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.llm_service import ask_llm, get_oc_client

router = APIRouter()

SYSTEM_PROMPT = """你是一名中国医疗合规专家助手，专注于医保政策、药品监管、医疗机构合规等领域。
回答用户的政策合规问题时：
- 引用具体政策文件名称和条款
- 给出清晰的合规建议
- 如涉及地区差异，请说明
- 回答简洁专业，使用 Markdown 格式"""

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
async def policy_chat(req: ChatRequest):
    client = get_oc_client()
    response = client.chat.completions.create(
        model="minimax",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": req.question},
        ],
        max_tokens=1024,
    )
    answer = response.choices[0].message.content
    return {"answer": answer}
