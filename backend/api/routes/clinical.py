from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ClinicalCase(BaseModel):
    patient_id: str
    age: int
    gender: str
    diagnosis: str
    medical_history: List[str]
    allergies: List[str]
    current_medications: List[str]

class PrescriptionRecommendation(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    route: str
    category: str
    risk_level: str
    warnings: List[str]

@router.post("/analyze")
async def analyze_case(case: ClinicalCase):
    """分析临床病例并提供建议"""
    # 模拟 AI 分析
    recommendations = [
        {
            "drug_name": "盐酸贝那普利片",
            "dosage": "10mg",
            "frequency": "QD (每日一次)",
            "route": "口服",
            "category": "降压药",
            "risk_level": "low",
            "warnings": ["监测血钾水平", "注意肾功能"]
        },
        {
            "drug_name": "二甲双胍片",
            "dosage": "0.5g",
            "frequency": "TID (每日三次)",
            "route": "餐中",
            "category": "降糖药",
            "risk_level": "medium",
            "warnings": ["监测肝肾功能", "注意乳酸酸中毒风险"]
        }
    ]

    risk_assessment = {
        "kidney_risk": 0.65,
        "heart_rate_risk": 0.45,
        "electrolyte_risk": 0.30,
        "drug_interaction_risk": 0.75
    }

    return {
        "recommendations": recommendations,
        "risk_assessment": risk_assessment,
        "clinical_pathway": [
            {
                "step": 1,
                "title": "启动基础降压治疗",
                "description": "根据 ESC 2023 指南，建议首选 ACEI/ARB 联合 CCB 方案"
            },
            {
                "step": 2,
                "title": "生化监测 (第 14 天)",
                "description": "复查血肌酐及血钾，排除因 ACEI 引起的急性肾损伤"
            }
        ]
    }

@router.get("/guidelines")
async def get_guidelines(keyword: Optional[str] = None):
    """获取医学指南"""
    guidelines = [
        {
            "title": "ESC 2023 Guidelines for the management of arterial hypertension",
            "source": "ESC",
            "date": "2023-08-25",
            "type": "Official Guide"
        },
        {
            "title": "ACE inhibitors in diabetic nephropathy",
            "source": "PubMed",
            "pubmed_id": "34521092",
            "type": "Research Paper"
        }
    ]

    if keyword:
        guidelines = [g for g in guidelines if keyword.lower() in g["title"].lower()]

    return guidelines

@router.post("/risk-assessment")
async def assess_risk(case: ClinicalCase):
    """评估患者风险"""
    # 模拟风险评估算法
    risk_score = 0

    if case.age > 65:
        risk_score += 2
    if "高血压" in case.diagnosis:
        risk_score += 3
    if "糖尿病" in case.diagnosis:
        risk_score += 3
    if "冠心病" in case.diagnosis:
        risk_score += 4

    risk_level = "low"
    if risk_score >= 8:
        risk_level = "high"
    elif risk_score >= 5:
        risk_level = "medium"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": {
            "age_risk": case.age > 65,
            "hypertension": "高血压" in case.diagnosis,
            "diabetes": "糖尿病" in case.diagnosis,
            "coronary_disease": "冠心病" in case.diagnosis
        },
        "recommendations": [
            "定期监测血压和血糖",
            "每月复查肾功能",
            "注意药物相互作用"
        ]
    }
