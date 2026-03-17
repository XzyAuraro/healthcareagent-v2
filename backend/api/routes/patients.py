from __future__ import annotations

import re
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator

from core.auth import require_current_username
from repositories.patients import (
    create_patient as create_patient_record,
    delete_patient as delete_patient_record,
    get_patient_by_id,
    list_patients as list_patient_records,
    update_patient as update_patient_record,
)

router = APIRouter()

RiskLevel = Literal["high", "medium", "low"]
PHONE_PATTERN = re.compile(r"^1\d{10}$")
ID_CARD_PATTERN = re.compile(r"^(?:\d{15}|\d{17}[\dXx])$")


class PatientBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    diagnosis: str = Field(min_length=1, max_length=500)
    risk_level: RiskLevel
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    id_card_number: str | None = Field(default=None, max_length=18)
    visit_date: date | None = None
    address: str | None = Field(default=None, max_length=200)
    allergies: str | None = Field(default=None, max_length=500)
    past_history: str | None = Field(default=None, max_length=1000)
    blood_pressure: str | None = Field(default=None, max_length=20)
    metric_name: str | None = Field(default=None, max_length=50)
    metric_value: str | None = Field(default=None, max_length=50)
    contact_name: str | None = Field(default=None, max_length=50)
    contact_phone: str | None = Field(default=None, max_length=20)
    contact_relationship: str | None = Field(default=None, max_length=20)

    @field_validator(
        "gender",
        "phone",
        "id_card_number",
        "address",
        "allergies",
        "past_history",
        "blood_pressure",
        "metric_name",
        "metric_value",
        "contact_name",
        "contact_phone",
        "contact_relationship",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None):
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("name", "diagnosis", mode="before")
    @classmethod
    def normalize_required_text(cls, value: str):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("phone", "contact_phone")
    @classmethod
    def validate_phone(cls, value: str | None):
        if value and not PHONE_PATTERN.fullmatch(value):
            raise ValueError("Phone number must be an 11-digit mainland China mobile number")
        return value

    @field_validator("id_card_number")
    @classmethod
    def validate_id_card_number(cls, value: str | None):
        if value and not ID_CARD_PATTERN.fullmatch(value):
            raise ValueError("ID card number must be 15 digits or 18 digits/X")
        return value


class PatientCreate(PatientBase):
    id: str | None = Field(default=None, max_length=32)


class PatientUpdate(PatientBase):
    pass


class PatientRecord(PatientBase):
    id: str
    created_at: datetime


@router.get("", response_model=list[PatientRecord])
async def get_patients(
    risk_level: RiskLevel | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    current_username: str = Depends(require_current_username),
):
    return list_patient_records(
        owner_username=current_username,
        risk_level=risk_level,
        limit=limit,
    )


@router.get("/{patient_id}", response_model=PatientRecord)
async def get_patient(
    patient_id: str,
    current_username: str = Depends(require_current_username),
):
    patient = get_patient_by_id(patient_id, current_username)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("", response_model=PatientRecord, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient: PatientCreate,
    current_username: str = Depends(require_current_username),
):
    return create_patient_record(patient.model_dump(), current_username)


@router.put("/{patient_id}", response_model=PatientRecord)
async def update_patient(
    patient_id: str,
    patient: PatientUpdate,
    current_username: str = Depends(require_current_username),
):
    updated = update_patient_record(patient_id, patient.model_dump(), current_username)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated


@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    current_username: str = Depends(require_current_username),
):
    deleted = delete_patient_record(patient_id, current_username)
    if not deleted:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted", "patient": deleted}
