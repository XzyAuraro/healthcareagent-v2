from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats():
    """获取仪表板统计数据"""
    return {
        "pending_risk_patients": 8,
        "completed_assessments_today": 15,
        "weekly_followups": 124,
        "completion_rate": 0.92,
        "average_time_minutes": 4,
        "daily_diagnoses": 2142,
        "accuracy": 0.998
    }

@router.get("/trends")
async def get_trends(days: int = 7):
    """获取趋势数据"""
    dates = [(datetime.now() - timedelta(days=i)).strftime("%m-%d") for i in range(days-1, -1, -1)]

    return {
        "dates": dates,
        "blood_pressure": [random.randint(110, 140) for _ in range(days)],
        "blood_sugar": [round(random.uniform(5.0, 8.0), 1) for _ in range(days)],
        "patient_visits": [random.randint(15, 30) for _ in range(days)]
    }

@router.get("/medication-stats")
async def get_medication_stats():
    """获取用药统计"""
    return {
        "total_prescriptions": 12840,
        "abnormal_warnings": 12,
        "medication_ratio": 0.245,
        "categories": [
            {"name": "心血管类", "percentage": 42, "color": "#5400db"},
            {"name": "抗生素", "percentage": 28, "color": "#00f2ff"},
            {"name": "镇痛类", "percentage": 15, "color": "#6366f1"},
            {"name": "其他", "percentage": 15, "color": "#cbd5e1"}
        ]
    }

@router.get("/recent-activities")
async def get_recent_activities():
    """获取最近活动"""
    return [
        {
            "type": "assessment",
            "patient_name": "张*华",
            "action": "完成风险评估",
            "timestamp": datetime.now().isoformat(),
            "risk_level": "high"
        },
        {
            "type": "prescription",
            "patient_name": "李*",
            "action": "开具处方",
            "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
            "risk_level": "medium"
        },
        {
            "type": "followup",
            "patient_name": "王*明",
            "action": "完成随访",
            "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
            "risk_level": "low"
        }
    ]
