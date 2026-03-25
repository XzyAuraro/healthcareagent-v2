from __future__ import annotations

import json
from typing import Any

from psycopg.rows import dict_row

from db import get_connection


USER_COLUMNS = """
    username,
    full_name,
    department,
    role,
    hashed_password,
    psych_profile_payload,
    psych_profile_updated_at,
    psych_profile_version,
    created_at
"""


def get_user_by_username(username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"SELECT {USER_COLUMNS} FROM users WHERE username = %s",
                (username,),
            )
            return cursor.fetchone()


def create_user(
    username: str,
    full_name: str,
    department: str,
    role: str,
    hashed_password: str,
) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                INSERT INTO users (
                    username,
                    full_name,
                    department,
                    role,
                    hashed_password
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING {USER_COLUMNS}
                """,
                (username, full_name, department, role, hashed_password),
            )
            return cursor.fetchone()


def parse_psych_profile(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None

    payload = user.get("psych_profile_payload")
    if not payload:
        return None

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, dict):
        return None

    updated_at = user.get("psych_profile_updated_at")
    updated_at_text = updated_at.isoformat() if hasattr(updated_at, "isoformat") else updated_at

    return {
        **parsed,
        "updated_at": updated_at_text,
        "version": int(user.get("psych_profile_version") or 0),
    }


def save_psych_profile(
    username: str,
    profile_payload: dict[str, Any],
) -> dict[str, Any] | None:
    serialized = json.dumps(profile_payload, ensure_ascii=False)
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE users
                SET
                    psych_profile_payload = %s,
                    psych_profile_updated_at = NOW(),
                    psych_profile_version = psych_profile_version + 1
                WHERE username = %s
                RETURNING {USER_COLUMNS}
                """,
                (serialized, username),
            )
            return cursor.fetchone()
