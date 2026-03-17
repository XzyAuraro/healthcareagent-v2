from __future__ import annotations

from typing import Any

from psycopg.rows import dict_row

from db import generate_patient_id, get_connection


PATIENT_COLUMNS = """
    id,
    owner_username,
    name,
    age,
    gender,
    phone,
    id_card_number,
    diagnosis,
    risk_level,
    visit_date,
    address,
    allergies,
    past_history,
    blood_pressure,
    metric_name,
    metric_value,
    contact_name,
    contact_phone,
    contact_relationship,
    created_at
"""


def list_patients(
    owner_username: str,
    risk_level: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    query = f"SELECT {PATIENT_COLUMNS} FROM patients WHERE owner_username = %s"
    params: list[Any] = [owner_username]

    if risk_level:
        query += " AND risk_level = %s"
        params.append(risk_level)

    query += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()


def get_patient_by_id(patient_id: str, owner_username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"SELECT {PATIENT_COLUMNS} FROM patients WHERE id = %s AND owner_username = %s",
                (patient_id, owner_username),
            )
            return cursor.fetchone()


def create_patient(patient: dict[str, Any], owner_username: str) -> dict[str, Any]:
    with get_connection() as connection:
        patient_id = patient.get("id") or generate_patient_id(connection)
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO patients (
                    id,
                    owner_username,
                    name,
                    age,
                    gender,
                    phone,
                    id_card_number,
                    diagnosis,
                    risk_level,
                    visit_date,
                    address,
                    allergies,
                    past_history,
                    blood_pressure,
                    metric_name,
                    metric_value,
                    contact_name,
                    contact_phone,
                    contact_relationship
                )
                VALUES (
                    %(id)s,
                    %(owner_username)s,
                    %(name)s,
                    %(age)s,
                    %(gender)s,
                    %(phone)s,
                    %(id_card_number)s,
                    %(diagnosis)s,
                    %(risk_level)s,
                    %(visit_date)s,
                    %(address)s,
                    %(allergies)s,
                    %(past_history)s,
                    %(blood_pressure)s,
                    %(metric_name)s,
                    %(metric_value)s,
                    %(contact_name)s,
                    %(contact_phone)s,
                    %(contact_relationship)s
                )
                RETURNING
                    id,
                    name,
                    age,
                    gender,
                    phone,
                    id_card_number,
                    diagnosis,
                    risk_level,
                    visit_date,
                    address,
                    allergies,
                    past_history,
                    blood_pressure,
                    metric_name,
                    metric_value,
                    contact_name,
                    contact_phone,
                    contact_relationship,
                    created_at
                """,
                {
                    **patient,
                    "id": patient_id,
                    "owner_username": owner_username,
                },
            )
            return cursor.fetchone()


def update_patient(
    patient_id: str,
    patient: dict[str, Any],
    owner_username: str,
) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE patients
                SET
                    name = %(name)s,
                    age = %(age)s,
                    gender = %(gender)s,
                    phone = %(phone)s,
                    id_card_number = %(id_card_number)s,
                    diagnosis = %(diagnosis)s,
                    risk_level = %(risk_level)s,
                    visit_date = %(visit_date)s,
                    address = %(address)s,
                    allergies = %(allergies)s,
                    past_history = %(past_history)s,
                    blood_pressure = %(blood_pressure)s,
                    metric_name = %(metric_name)s,
                    metric_value = %(metric_value)s,
                    contact_name = %(contact_name)s,
                    contact_phone = %(contact_phone)s,
                    contact_relationship = %(contact_relationship)s
                WHERE id = %(id)s AND owner_username = %(owner_username)s
                RETURNING
                    id,
                    name,
                    age,
                    gender,
                    phone,
                    id_card_number,
                    diagnosis,
                    risk_level,
                    visit_date,
                    address,
                    allergies,
                    past_history,
                    blood_pressure,
                    metric_name,
                    metric_value,
                    contact_name,
                    contact_phone,
                    contact_relationship,
                    created_at
                """,
                {
                    **patient,
                    "id": patient_id,
                    "owner_username": owner_username,
                },
            )
            return cursor.fetchone()


def delete_patient(patient_id: str, owner_username: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                DELETE FROM patients
                WHERE id = %s AND owner_username = %s
                RETURNING
                    id,
                    name,
                    age,
                    gender,
                    phone,
                    id_card_number,
                    diagnosis,
                    risk_level,
                    visit_date,
                    address,
                    allergies,
                    past_history,
                    blood_pressure,
                    metric_name,
                    metric_value,
                    contact_name,
                    contact_phone,
                    contact_relationship,
                    created_at
                """,
                (patient_id, owner_username),
            )
            return cursor.fetchone()
