from __future__ import annotations

import os
from functools import lru_cache

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/healthcareagent"
    postgres_admin_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/healthcareagent",
        ),
        postgres_admin_url=os.getenv("POSTGRES_ADMIN_URL") or None,
    )
