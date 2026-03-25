from __future__ import annotations

import json
import uuid
from typing import Any

from psycopg.rows import dict_row

from db import get_connection


SESSION_COLUMNS = """
    id,
    owner_username,
    mode,
    department,
    difficulty,
    chief_complaint,
    patient_intro,
    patient_background,
    present_illness,
    past_history,
    physical_exam,
    lab_results,
    imaging,
    diagnosis,
    key_points,
    scoring_criteria,
    trainee_diagnosis,
    notes,
    prescriptions,
    evaluation_status,
    total_score,
    oc_eval,
    bc_comment,
    correct_diagnosis,
    evaluation_error,
    created_at,
    updated_at,
    completed_at
"""

MESSAGE_COLUMNS = """
    id,
    session_id,
    owner_username,
    role,
    content,
    created_at
"""


def _serialize_prescriptions(prescriptions: list[dict[str, Any]] | None) -> str | None:
    if not prescriptions:
        return None
    return json.dumps(prescriptions, ensure_ascii=False)


def _session_payload(session_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "mode": session_data.get("mode"),
        "department": session_data.get("department"),
        "difficulty": session_data.get("difficulty"),
        "chief_complaint": session_data.get("chief_complaint"),
        "patient_intro": session_data.get("patient_intro"),
        "patient_background": session_data.get("patient_background"),
        "present_illness": session_data.get("present_illness"),
        "past_history": session_data.get("past_history"),
        "physical_exam": session_data.get("physical_exam"),
        "lab_results": session_data.get("lab_results"),
        "imaging": session_data.get("imaging"),
        "diagnosis": session_data.get("diagnosis"),
        "key_points": session_data.get("key_points"),
        "scoring_criteria": session_data.get("scoring_criteria"),
    }


def create_training_session(
    session_data: dict[str, Any],
    owner_username: str,
) -> dict[str, Any]:
    session_id = session_data.get("id") or str(uuid.uuid4())
    payload = {
        **_session_payload(session_data),
        "id": session_id,
        "owner_username": owner_username,
        "evaluation_status": session_data.get("evaluation_status", "pending"),
    }

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO training_sessions (
                    id,
                    owner_username,
                    mode,
                    department,
                    difficulty,
                    chief_complaint,
                    patient_intro,
                    patient_background,
                    present_illness,
                    past_history,
                    physical_exam,
                    lab_results,
                    imaging,
                    diagnosis,
                    key_points,
                    scoring_criteria,
                    evaluation_status
                )
                VALUES (
                    %(id)s,
                    %(owner_username)s,
                    %(mode)s,
                    %(department)s,
                    %(difficulty)s,
                    %(chief_complaint)s,
                    %(patient_intro)s,
                    %(patient_background)s,
                    %(present_illness)s,
                    %(past_history)s,
                    %(physical_exam)s,
                    %(lab_results)s,
                    %(imaging)s,
                    %(diagnosis)s,
                    %(key_points)s,
                    %(scoring_criteria)s,
                    %(evaluation_status)s
                )
                RETURNING
                    id,
                    mode,
                    department,
                    difficulty,
                    chief_complaint,
                    patient_intro,
                    patient_background,
                    present_illness,
                    past_history,
                    physical_exam,
                    lab_results,
                    imaging,
                    diagnosis,
                    key_points,
                    scoring_criteria,
                    trainee_diagnosis,
                    notes,
                    prescriptions,
                    evaluation_status,
                    total_score,
                    oc_eval,
                    bc_comment,
                    correct_diagnosis,
                    evaluation_error,
                    created_at,
                    updated_at,
                    completed_at
                """,
                payload,
            )
            return cursor.fetchone()


def get_training_session(session_id: str, owner_username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"SELECT {SESSION_COLUMNS} FROM training_sessions WHERE id = %s AND owner_username = %s",
                (session_id, owner_username),
            )
            return cursor.fetchone()


def begin_training_evaluation(
    session_id: str,
    owner_username: str,
    trainee_diagnosis: str = "",
    notes: str = "",
    prescriptions: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    payload = {
        "id": session_id,
        "owner_username": owner_username,
        "trainee_diagnosis": trainee_diagnosis,
        "notes": notes,
        "prescriptions": _serialize_prescriptions(prescriptions),
    }

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE training_sessions
                SET
                    trainee_diagnosis = %(trainee_diagnosis)s,
                    notes = %(notes)s,
                    prescriptions = %(prescriptions)s,
                    evaluation_status = 'running',
                    evaluation_error = NULL,
                    updated_at = NOW()
                WHERE id = %(id)s AND owner_username = %(owner_username)s
                RETURNING {SESSION_COLUMNS}
                """,
                payload,
            )
            return cursor.fetchone()


def save_training_evaluation(
    session_id: str,
    owner_username: str,
    result_data: dict[str, Any],
) -> dict[str, Any] | None:
    payload = {
        "id": session_id,
        "owner_username": owner_username,
        "trainee_diagnosis": result_data.get("trainee_diagnosis", ""),
        "notes": result_data.get("notes", ""),
        "prescriptions": _serialize_prescriptions(result_data.get("prescriptions")),
        "total_score": result_data.get("total_score"),
        "oc_eval": result_data.get("oc_eval"),
        "bc_comment": result_data.get("bc_comment"),
        "correct_diagnosis": result_data.get("correct_diagnosis"),
    }

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE training_sessions
                SET
                    trainee_diagnosis = %(trainee_diagnosis)s,
                    notes = %(notes)s,
                    prescriptions = %(prescriptions)s,
                    evaluation_status = 'done',
                    total_score = %(total_score)s,
                    oc_eval = %(oc_eval)s,
                    bc_comment = %(bc_comment)s,
                    correct_diagnosis = %(correct_diagnosis)s,
                    evaluation_error = NULL,
                    completed_at = COALESCE(completed_at, NOW()),
                    updated_at = NOW()
                WHERE id = %(id)s AND owner_username = %(owner_username)s
                RETURNING {SESSION_COLUMNS}
                """,
                payload,
            )
            return cursor.fetchone()


def save_training_evaluation_error(
    session_id: str,
    owner_username: str,
    error_message: str,
) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE training_sessions
                SET
                    evaluation_status = 'error',
                    evaluation_error = %s,
                    updated_at = NOW()
                WHERE id = %s AND owner_username = %s
                RETURNING {SESSION_COLUMNS}
                """,
                (error_message, session_id, owner_username),
            )
            return cursor.fetchone()


def list_training_messages(session_id: str, owner_username: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT {MESSAGE_COLUMNS}
                FROM training_messages
                WHERE session_id = %s AND owner_username = %s
                ORDER BY created_at ASC
                """,
                (session_id, owner_username),
            )
            return cursor.fetchall()


def create_training_message(
    session_id: str,
    owner_username: str,
    role: str,
    content: str,
) -> dict[str, Any]:
    message_id = str(uuid.uuid4())
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO training_messages (
                    id,
                    session_id,
                    owner_username,
                    role,
                    content
                )
                VALUES (
                    %(id)s,
                    %(session_id)s,
                    %(owner_username)s,
                    %(role)s,
                    %(content)s
                )
                RETURNING
                    id,
                    session_id,
                    role,
                    content,
                    created_at
                """,
                {
                    "id": message_id,
                    "session_id": session_id,
                    "owner_username": owner_username,
                    "role": role,
                    "content": content,
                },
            )
            message = cursor.fetchone()
            cursor.execute(
                "UPDATE training_sessions SET updated_at = NOW() WHERE id = %s AND owner_username = %s",
                (session_id, owner_username),
            )
            return message


def get_training_stats(owner_username: str) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE evaluation_status = 'done') AS completed_trainings,
                    COUNT(*) FILTER (
                        WHERE evaluation_status = 'done' AND mode = 'simulation'
                    ) AS simulation_completed_trainings,
                    COUNT(*) FILTER (
                        WHERE evaluation_status = 'done' AND mode = 'case_analysis'
                    ) AS case_analysis_completed_trainings,
                    AVG(total_score) FILTER (
                        WHERE evaluation_status = 'done' AND total_score IS NOT NULL
                    ) AS average_score
                FROM training_sessions
                WHERE owner_username = %s
                """,
                (owner_username,),
            )
            row = cursor.fetchone() or {}
            return {
                "completed_trainings": int(row.get("completed_trainings") or 0),
                "simulation_completed_trainings": int(row.get("simulation_completed_trainings") or 0),
                "case_analysis_completed_trainings": int(row.get("case_analysis_completed_trainings") or 0),
                "average_score": round(float(row.get("average_score") or 0.0), 1),
            }


def list_recent_training_sessions(
    owner_username: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT {SESSION_COLUMNS}
                FROM training_sessions
                WHERE owner_username = %s
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (owner_username, limit),
            )
            return cursor.fetchall()
