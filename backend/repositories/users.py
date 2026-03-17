from __future__ import annotations

from typing import Any

from psycopg.rows import dict_row

from db import get_connection


USER_COLUMNS = """
    username,
    full_name,
    department,
    role,
    hashed_password,
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
