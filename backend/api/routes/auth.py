from __future__ import annotations

from datetime import timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from core.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    require_current_username,
)
from repositories.users import create_user, get_user_by_username, parse_psych_profile
from services.psych_profile_service import generate_psych_profile

router = APIRouter()


class UserLogin(BaseModel):
    username: str
    password: str

    @field_validator("username", "password")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    username: str
    full_name: str
    department: str
    role: str


class PsychProfileEvidence(BaseModel):
    completed_trainings: int = 0
    average_score: float = 0.0
    recent_clinical_cases: int = 0
    recent_training_samples: int = 0


class PsychProfile(BaseModel):
    headline: str
    summary: str
    traits: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    watchouts: list[str] = Field(default_factory=list)
    coaching: list[str] = Field(default_factory=list)
    evolution: str
    confidence: str = "低"
    generated_by: str | None = None
    version: int = 0
    updated_at: str | None = None
    evidence: PsychProfileEvidence = Field(default_factory=PsychProfileEvidence)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=4, max_length=50)
    full_name: str = Field(min_length=2, max_length=50)
    department: str = Field(min_length=2, max_length=100)
    role: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", "full_name", "department", "role", "password")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class RegisterResponse(BaseModel):
    message: str
    username: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def _public_user(user: dict) -> User:
    return User(
        username=user["username"],
        full_name=user["full_name"],
        department=user["department"],
        role=user["role"],
    )


def _profile_or_generate(username: str) -> dict | None:
    user = get_user_by_username(username)
    profile = parse_psych_profile(user)
    if profile:
        return profile
    return generate_psych_profile(username, trigger="lazy-load")


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    user = get_user_by_username(user_login.username)
    if not user or not verify_password(user_login.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_login.username},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_current_user(
    current_username: str = Depends(require_current_username),
):
    user = get_user_by_username(current_username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(user)


@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest):
    existing_user = get_user_by_username(request.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    create_user(
        username=request.username,
        full_name=request.full_name,
        department=request.department,
        role=request.role,
        hashed_password=hash_password(request.password),
    )
    return {"message": "Register success", "username": request.username}


@router.get("/profile", response_model=PsychProfile)
async def get_psych_profile(
    current_username: str = Depends(require_current_username),
):
    profile = _profile_or_generate(current_username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not available")
    return profile


@router.post("/profile/refresh", response_model=PsychProfile)
async def refresh_psych_profile(
    current_username: str = Depends(require_current_username),
):
    profile = generate_psych_profile(current_username, trigger="manual-refresh")
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not available")
    return profile
