from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class Patient(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    diagnosis: str
    risk_level: str
    blood_pressure: Optional[str] = None
    blood_sugar: Optional[str] = None
    created_at: datetime = datetime.now()

# 模拟数据库
patients_db = [
    {
        "id": "982132",
        "name": "张*华",
        "age": 68,
        "gender": "男",
        "diagnosis": "高血压 / 糖尿病 / 冠心病",
        "risk_level": "high",
        "blood_pressure": "165/105",
        "blood_sugar": "8.4 mmol",
        "created_at": datetime.now().isoformat()
    },
    {
        "id": "441092",
        "name": "李*",
        "age": 62,
        "gender": "男",
        "diagnosis": "冠脉支架术后 / 高血脂",
        "risk_level": "medium",
        "blood_pressure": "120/80",
        "blood_sugar": None,
        "created_at": datetime.now().isoformat()
    },
    {
        "id": "331902",
        "name": "王*明",
        "age": 55,
        "gender": "男",
        "diagnosis": "常规体检 / 轻度高血压",
        "risk_level": "low",
        "blood_pressure": "115/75",
        "blood_sugar": None,
        "created_at": datetime.now().isoformat()
    }
]

@router.get("/", response_model=List[dict])
async def get_patients(
    risk_level: Optional[str] = None,
    limit: int = 100
):
    """获取患者列表"""
    filtered = patients_db
    if risk_level:
        filtered = [p for p in patients_db if p["risk_level"] == risk_level]
    return filtered[:limit]

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """获取单个患者详情"""
    patient = next((p for p in patients_db if p["id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="患者未找到")
    return patient

@router.post("/")
async def create_patient(patient: Patient):
    """创建新患者"""
    patient_dict = patient.dict()
    patient_dict["created_at"] = datetime.now().isoformat()
    patients_db.append(patient_dict)
    return {"message": "患者创建成功", "patient": patient_dict}

@router.put("/{patient_id}")
async def update_patient(patient_id: str, patient: Patient):
    """更新患者信息"""
    for i, p in enumerate(patients_db):
        if p["id"] == patient_id:
            patients_db[i] = patient.dict()
            return {"message": "患者更新成功", "patient": patients_db[i]}
    raise HTTPException(status_code=404, detail="患者未找到")

@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """删除患者"""
    for i, p in enumerate(patients_db):
        if p["id"] == patient_id:
            deleted = patients_db.pop(i)
            return {"message": "患者删除成功", "patient": deleted}
    raise HTTPException(status_code=404, detail="患者未找到")
