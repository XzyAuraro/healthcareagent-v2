from __future__ import annotations

import uuid
from typing import Any

from psycopg.rows import dict_row

from db import get_connection


CASE_COLUMNS = """
    id,
    owner_username,
    patient_name,
    age,
    gender,
    diagnosis,
    pain_score,
    pain_type,
    department,
    current_opioid,
    current_dose,
    current_freq,
    plan_drug,
    plan_dose,
    plan_freq,
    mme_day,
    ort_score,
    ort_level,
    comorbidities,
    allergies,
    adverse_hist,
    co_meds,
    renal_liver_issue,
    personal_use,
    family_use,
    psych_histories,
    extra_notes,
    free_text,
    ai_status,
    risk_warning,
    mme_warning,
    oc_answer,
    baichuan_review,
    consensus,
    ai_error,
    created_at,
    updated_at
"""

MESSAGE_COLUMNS = """
    id,
    case_id,
    owner_username,
    role,
    author_name,
    content,
    created_at
"""


def _case_payload(case_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "patient_name": case_data.get("patient_name"),
        "age": case_data.get("age"),
        "gender": case_data.get("gender"),
        "diagnosis": case_data.get("diagnosis"),
        "pain_score": case_data.get("pain_score"),
        "pain_type": case_data.get("pain_type"),
        "department": case_data.get("department"),
        "current_opioid": case_data.get("current_opioid"),
        "current_dose": case_data.get("current_dose"),
        "current_freq": case_data.get("current_freq"),
        "plan_drug": case_data.get("plan_drug"),
        "plan_dose": case_data.get("plan_dose"),
        "plan_freq": case_data.get("plan_freq"),
        "mme_day": case_data.get("mme_day"),
        "ort_score": case_data.get("ort_score"),
        "ort_level": case_data.get("ort_level"),
        "comorbidities": case_data.get("comorbidities"),
        "allergies": case_data.get("allergies"),
        "adverse_hist": case_data.get("adverse_hist"),
        "co_meds": case_data.get("co_meds"),
        "renal_liver_issue": case_data.get("renal_liver_issue"),
        "personal_use": case_data.get("personal_use"),
        "family_use": case_data.get("family_use"),
        "psych_histories": case_data.get("psych_histories"),
        "extra_notes": case_data.get("extra_notes"),
        "free_text": case_data.get("free_text"),
    }


def create_clinical_case(
    case_data: dict[str, Any],
    owner_username: str,
    ai_status: str = "draft",
) -> dict[str, Any]:
    case_id = case_data.get("id") or str(uuid.uuid4())
    payload = {
        **_case_payload(case_data),
        "id": case_id,
        "owner_username": owner_username,
        "ai_status": ai_status,
    }

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO clinical_cases (
                    id,
                    owner_username,
                    patient_name,
                    age,
                    gender,
                    diagnosis,
                    pain_score,
                    pain_type,
                    department,
                    current_opioid,
                    current_dose,
                    current_freq,
                    plan_drug,
                    plan_dose,
                    plan_freq,
                    mme_day,
                    ort_score,
                    ort_level,
                    comorbidities,
                    allergies,
                    adverse_hist,
                    co_meds,
                    renal_liver_issue,
                    personal_use,
                    family_use,
                    psych_histories,
                    extra_notes,
                    free_text,
                    ai_status
                )
                VALUES (
                    %(id)s,
                    %(owner_username)s,
                    %(patient_name)s,
                    %(age)s,
                    %(gender)s,
                    %(diagnosis)s,
                    %(pain_score)s,
                    %(pain_type)s,
                    %(department)s,
                    %(current_opioid)s,
                    %(current_dose)s,
                    %(current_freq)s,
                    %(plan_drug)s,
                    %(plan_dose)s,
                    %(plan_freq)s,
                    %(mme_day)s,
                    %(ort_score)s,
                    %(ort_level)s,
                    %(comorbidities)s,
                    %(allergies)s,
                    %(adverse_hist)s,
                    %(co_meds)s,
                    %(renal_liver_issue)s,
                    %(personal_use)s,
                    %(family_use)s,
                    %(psych_histories)s,
                    %(extra_notes)s,
                    %(free_text)s,
                    %(ai_status)s
                )
                RETURNING
                    id,
                    patient_name,
                    age,
                    gender,
                    diagnosis,
                    pain_score,
                    pain_type,
                    department,
                    current_opioid,
                    current_dose,
                    current_freq,
                    plan_drug,
                    plan_dose,
                    plan_freq,
                    mme_day,
                    ort_score,
                    ort_level,
                    comorbidities,
                    allergies,
                    adverse_hist,
                    co_meds,
                    renal_liver_issue,
                    personal_use,
                    family_use,
                    psych_histories,
                    extra_notes,
                    free_text,
                    ai_status,
                    risk_warning,
                    mme_warning,
                    oc_answer,
                    baichuan_review,
                    consensus,
                    ai_error,
                    created_at,
                    updated_at
                """,
                payload,
            )
            return cursor.fetchone()


def update_clinical_case(
    case_id: str,
    case_data: dict[str, Any],
    owner_username: str,
    ai_status: str | None = None,
) -> dict[str, Any] | None:
    payload = {
        **_case_payload(case_data),
        "id": case_id,
        "owner_username": owner_username,
        "ai_status": ai_status,
    }

    ai_status_clause = ", ai_status = %(ai_status)s, ai_error = NULL" if ai_status is not None else ""

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE clinical_cases
                SET
                    patient_name = %(patient_name)s,
                    age = %(age)s,
                    gender = %(gender)s,
                    diagnosis = %(diagnosis)s,
                    pain_score = %(pain_score)s,
                    pain_type = %(pain_type)s,
                    department = %(department)s,
                    current_opioid = %(current_opioid)s,
                    current_dose = %(current_dose)s,
                    current_freq = %(current_freq)s,
                    plan_drug = %(plan_drug)s,
                    plan_dose = %(plan_dose)s,
                    plan_freq = %(plan_freq)s,
                    mme_day = %(mme_day)s,
                    ort_score = %(ort_score)s,
                    ort_level = %(ort_level)s,
                    comorbidities = %(comorbidities)s,
                    allergies = %(allergies)s,
                    adverse_hist = %(adverse_hist)s,
                    co_meds = %(co_meds)s,
                    renal_liver_issue = %(renal_liver_issue)s,
                    personal_use = %(personal_use)s,
                    family_use = %(family_use)s,
                    psych_histories = %(psych_histories)s,
                    extra_notes = %(extra_notes)s,
                    free_text = %(free_text)s,
                    updated_at = NOW()
                    {ai_status_clause}
                WHERE id = %(id)s AND owner_username = %(owner_username)s
                RETURNING {CASE_COLUMNS}
                """,
                payload,
            )
            return cursor.fetchone()


def get_clinical_case(case_id: str, owner_username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"SELECT {CASE_COLUMNS} FROM clinical_cases WHERE id = %s AND owner_username = %s",
                (case_id, owner_username),
            )
            return cursor.fetchone()


def get_latest_clinical_case(owner_username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT {CASE_COLUMNS}
                FROM clinical_cases
                WHERE owner_username = %s
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (owner_username,),
            )
            return cursor.fetchone()


def save_clinical_case_result(
    case_id: str,
    owner_username: str,
    result_data: dict[str, Any],
) -> dict[str, Any] | None:
    payload = {"id": case_id, "owner_username": owner_username, **result_data}
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE clinical_cases
                SET
                    ai_status = 'done',
                    risk_warning = %(risk_warning)s,
                    mme_warning = %(mme_warning)s,
                    oc_answer = %(oc_answer)s,
                    baichuan_review = %(baichuan_review)s,
                    consensus = %(consensus)s,
                    ai_error = NULL,
                    updated_at = NOW()
                WHERE id = %(id)s AND owner_username = %(owner_username)s
                RETURNING {CASE_COLUMNS}
                """,
                payload,
            )
            return cursor.fetchone()


def save_clinical_case_error(
    case_id: str,
    owner_username: str,
    error_message: str,
) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE clinical_cases
                SET
                    ai_status = 'error',
                    ai_error = %s,
                    updated_at = NOW()
                WHERE id = %s AND owner_username = %s
                RETURNING {CASE_COLUMNS}
                """,
                (error_message, case_id, owner_username),
            )
            return cursor.fetchone()


def list_case_messages(case_id: str, owner_username: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT {MESSAGE_COLUMNS}
                FROM mdt_messages
                WHERE case_id = %s AND owner_username = %s
                ORDER BY created_at ASC
                """,
                (case_id, owner_username),
            )
            return cursor.fetchall()


def create_case_message(
    case_id: str,
    role: str,
    content: str,
    owner_username: str,
    author_name: str | None = None,
) -> dict[str, Any]:
    message_id = str(uuid.uuid4())
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO mdt_messages (
                    id,
                    case_id,
                    owner_username,
                    role,
                    author_name,
                    content
                )
                VALUES (
                    %(id)s,
                    %(case_id)s,
                    %(owner_username)s,
                    %(role)s,
                    %(author_name)s,
                    %(content)s
                )
                RETURNING
                    id,
                    case_id,
                    role,
                    author_name,
                    content,
                    created_at
                """,
                {
                    "id": message_id,
                    "case_id": case_id,
                    "owner_username": owner_username,
                    "role": role,
                    "author_name": author_name,
                    "content": content,
                },
            )
            return cursor.fetchone()


def touch_clinical_case(case_id: str, owner_username: str) -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE clinical_cases SET updated_at = NOW() WHERE id = %s AND owner_username = %s",
                (case_id, owner_username),
            )
