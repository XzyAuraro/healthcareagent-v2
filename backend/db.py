from __future__ import annotations

import random
from contextlib import contextmanager
from datetime import date, datetime, timezone

import bcrypt
import psycopg
from psycopg import conninfo, sql
from psycopg.rows import dict_row

from core.config import get_settings

_database_ready = False

_SEED_PATIENTS = [
    {
        "id": "982132",
        "name": "张卫",
        "age": 68,
        "gender": "男",
        "phone": "13800138001",
        "id_card_number": "110101195603154231",
        "diagnosis": "高血压 / 2 型糖尿病 / 冠心病",
        "risk_level": "high",
        "visit_date": date(2026, 3, 15),
        "address": "北京市朝阳区建国路 88 号 3 单元 1202",
        "allergies": "青霉素（皮疹）",
        "past_history": "高血压 15 年，2 型糖尿病 8 年，冠心病病史。",
        "blood_pressure": "165/105",
        "metric_name": "血糖",
        "metric_value": "8.4 mmol/L",
        "contact_name": "张玲",
        "contact_phone": "13900139001",
        "contact_relationship": "配偶",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "441092",
        "name": "李晨",
        "age": 62,
        "gender": "男",
        "phone": "13600136002",
        "id_card_number": "310101196402204817",
        "diagnosis": "冠脉支架术后随访 / 高脂血症",
        "risk_level": "medium",
        "visit_date": date(2026, 3, 14),
        "address": "上海市浦东新区丁香路 780 号 2 栋 503",
        "allergies": "无",
        "past_history": "冠脉支架术后 3 年，高脂血症。",
        "blood_pressure": "120/80",
        "metric_name": "LDL-C",
        "metric_value": "2.8 mmol/L",
        "contact_name": "李敏",
        "contact_phone": "13700137002",
        "contact_relationship": "女儿",
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "331902",
        "name": "王欢",
        "age": 55,
        "gender": "男",
        "phone": "13500135003",
        "id_card_number": "440101197010118526",
        "diagnosis": "常规体检 / 轻度高血压",
        "risk_level": "low",
        "visit_date": date(2026, 3, 13),
        "address": "广州市天河区体育西路 101 号 8 楼",
        "allergies": "无",
        "past_history": "轻度高血压，规律随访。",
        "blood_pressure": "115/75",
        "metric_name": "BMI",
        "metric_value": "23.5",
        "contact_name": "王琳",
        "contact_phone": "13400134003",
        "contact_relationship": "妹妹",
        "created_at": datetime.now(timezone.utc),
    },
]


def database_ready() -> bool:
    return _database_ready


def _target_connection_kwargs() -> dict[str, object]:
    settings = get_settings()
    kwargs = conninfo.conninfo_to_dict(settings.database_url)
    kwargs.setdefault("connect_timeout", 5)
    kwargs.setdefault("row_factory", dict_row)
    return kwargs


def _admin_connection_kwargs() -> dict[str, object]:
    settings = get_settings()
    if settings.postgres_admin_url:
        kwargs = conninfo.conninfo_to_dict(settings.postgres_admin_url)
    else:
        kwargs = _target_connection_kwargs().copy()
        kwargs["dbname"] = "postgres"
    kwargs.setdefault("connect_timeout", 5)
    kwargs.setdefault("row_factory", dict_row)
    return kwargs


@contextmanager
def get_connection():
    with psycopg.connect(**_target_connection_kwargs()) as connection:
        yield connection


def initialize_database() -> None:
    global _database_ready

    try:
        _ensure_database_exists()
        with get_connection() as connection:
            _ensure_schema(connection)
            _seed_demo_user(connection)
            _seed_patients_if_empty(connection)
            _backfill_owner_columns(connection)
    except psycopg.Error as exc:
        raise RuntimeError(_database_error_message()) from exc

    _database_ready = True


def _ensure_database_exists() -> None:
    target_kwargs = _target_connection_kwargs()
    dbname = str(target_kwargs["dbname"])

    try:
        with psycopg.connect(**_admin_connection_kwargs(), autocommit=True) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
                if cursor.fetchone() is None:
                    cursor.execute(
                        sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname))
                    )
    except psycopg.Error as exc:
        raise RuntimeError(_database_error_message()) from exc


def _ensure_schema(connection: psycopg.Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                owner_username TEXT,
                name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                phone TEXT,
                id_card_number TEXT,
                diagnosis TEXT NOT NULL,
                risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
                visit_date DATE,
                address TEXT,
                allergies TEXT,
                past_history TEXT,
                blood_pressure TEXT,
                metric_name TEXT,
                metric_value TEXT,
                contact_name TEXT,
                contact_phone TEXT,
                contact_relationship TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS owner_username TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_card_number TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_date DATE")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS past_history TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_name TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_phone TEXT")
        cursor.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_relationship TEXT")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                department TEXT NOT NULL,
                role TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                psych_profile_payload TEXT,
                psych_profile_updated_at TIMESTAMPTZ,
                psych_profile_version INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS psych_profile_payload TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS psych_profile_updated_at TIMESTAMPTZ")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS psych_profile_version INTEGER NOT NULL DEFAULT 0")
        cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS clinical_cases (
                id TEXT PRIMARY KEY,
                owner_username TEXT,
                patient_name TEXT,
                age INTEGER,
                gender TEXT,
                diagnosis TEXT NOT NULL,
                pain_score INTEGER,
                pain_type TEXT,
                department TEXT,
                current_opioid TEXT,
                current_dose DOUBLE PRECISION,
                current_freq TEXT,
                plan_drug TEXT,
                plan_dose DOUBLE PRECISION,
                plan_freq INTEGER,
                mme_day DOUBLE PRECISION,
                ort_score INTEGER,
                ort_level TEXT,
                comorbidities TEXT,
                allergies TEXT,
                adverse_hist TEXT,
                co_meds TEXT,
                renal_liver_issue BOOLEAN,
                personal_use TEXT,
                family_use TEXT,
                psych_histories TEXT,
                extra_notes TEXT,
                free_text TEXT,
                ai_status TEXT NOT NULL DEFAULT 'draft' CHECK (ai_status IN ('draft', 'running', 'done', 'error')),
                risk_warning TEXT,
                mme_warning TEXT,
                oc_answer TEXT,
                baichuan_review TEXT,
                consensus TEXT,
                ai_error TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS owner_username TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS patient_name TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS age INTEGER")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS gender TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS diagnosis TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS pain_score INTEGER")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS pain_type TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS department TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS current_opioid TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS current_dose DOUBLE PRECISION")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS current_freq TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS plan_drug TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS plan_dose DOUBLE PRECISION")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS plan_freq INTEGER")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS mme_day DOUBLE PRECISION")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS ort_score INTEGER")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS ort_level TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS comorbidities TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS allergies TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS adverse_hist TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS co_meds TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS renal_liver_issue BOOLEAN")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS personal_use TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS family_use TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS psych_histories TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS extra_notes TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS free_text TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS ai_status TEXT NOT NULL DEFAULT 'draft'")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS risk_warning TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS mme_warning TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS oc_answer TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS baichuan_review TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS consensus TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS ai_error TEXT")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute("ALTER TABLE clinical_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS mdt_messages (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
                owner_username TEXT,
                role TEXT NOT NULL CHECK (role IN ('doctor', 'ai', 'system')),
                author_name TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS case_id TEXT")
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS owner_username TEXT")
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS role TEXT")
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS author_name TEXT")
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS content TEXT")
        cursor.execute("ALTER TABLE mdt_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS training_sessions (
                id TEXT PRIMARY KEY,
                owner_username TEXT,
                mode TEXT NOT NULL CHECK (mode IN ('simulation', 'case_analysis')),
                department TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                chief_complaint TEXT,
                patient_intro TEXT,
                patient_background TEXT,
                present_illness TEXT,
                past_history TEXT,
                physical_exam TEXT,
                lab_results TEXT,
                imaging TEXT,
                diagnosis TEXT,
                key_points TEXT,
                scoring_criteria TEXT,
                trainee_diagnosis TEXT,
                notes TEXT,
                prescriptions TEXT,
                evaluation_status TEXT NOT NULL DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'running', 'done', 'error')),
                total_score DOUBLE PRECISION,
                oc_eval TEXT,
                bc_comment TEXT,
                correct_diagnosis TEXT,
                evaluation_error TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            )
            """
        )
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS owner_username TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS mode TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS department TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS difficulty TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS chief_complaint TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS patient_intro TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS patient_background TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS present_illness TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS past_history TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS physical_exam TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS lab_results TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS imaging TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS diagnosis TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS key_points TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS scoring_criteria TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS trainee_diagnosis TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS notes TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS prescriptions TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS evaluation_status TEXT NOT NULL DEFAULT 'pending'")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS total_score DOUBLE PRECISION")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS oc_eval TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS bc_comment TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS correct_diagnosis TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS evaluation_error TEXT")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS training_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
                owner_username TEXT,
                role TEXT NOT NULL CHECK (role IN ('trainee', 'patient')),
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute("ALTER TABLE training_messages ADD COLUMN IF NOT EXISTS session_id TEXT")
        cursor.execute("ALTER TABLE training_messages ADD COLUMN IF NOT EXISTS owner_username TEXT")
        cursor.execute("ALTER TABLE training_messages ADD COLUMN IF NOT EXISTS role TEXT")
        cursor.execute("ALTER TABLE training_messages ADD COLUMN IF NOT EXISTS content TEXT")
        cursor.execute("ALTER TABLE training_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clinical_cases_updated_at ON clinical_cases(updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patients_owner_created_at ON patients(owner_username, created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clinical_cases_owner_updated_at ON clinical_cases(owner_username, updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mdt_messages_case_id_created_at ON mdt_messages(case_id, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mdt_messages_owner_case_created_at ON mdt_messages(owner_username, case_id, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_sessions_updated_at ON training_sessions(updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_sessions_owner_updated_at ON training_sessions(owner_username, updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_sessions_status_mode ON training_sessions(evaluation_status, mode)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_messages_session_id_created_at ON training_messages(session_id, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_messages_owner_session_created_at ON training_messages(owner_username, session_id, created_at)")


def _seed_patients_if_empty(connection: psycopg.Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM patients")
        row = cursor.fetchone()
        count = int(row["count"]) if row else 0
        if count > 0:
            return

        for patient in _SEED_PATIENTS:
            cursor.execute(
                """
                INSERT INTO patients (
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
                )
                VALUES (
                    %(id)s,
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
                    %(contact_relationship)s,
                    %(created_at)s
                )
                """,
                patient,
            )


def _seed_demo_user(connection: psycopg.Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM users WHERE username = %s", ("doctor001",))
        if cursor.fetchone() is not None:
            return

        hashed_password = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute(
            """
            INSERT INTO users (
                username,
                full_name,
                department,
                role,
                hashed_password
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                "doctor001",
                "Wang Jianguo",
                "Cardiology Ward 1",
                "Chief Physician",
                hashed_password,
            ),
        )


def _backfill_owner_columns(connection: psycopg.Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE patients SET owner_username = %s WHERE owner_username IS NULL",
            ("doctor001",),
        )
        cursor.execute(
            "UPDATE clinical_cases SET owner_username = %s WHERE owner_username IS NULL",
            ("doctor001",),
        )
        cursor.execute(
            "UPDATE training_sessions SET owner_username = %s WHERE owner_username IS NULL",
            ("doctor001",),
        )
        cursor.execute(
            """
            UPDATE mdt_messages AS message
            SET owner_username = clinical_case.owner_username
            FROM clinical_cases AS clinical_case
            WHERE message.case_id = clinical_case.id
              AND message.owner_username IS NULL
            """
        )
        cursor.execute(
            """
            UPDATE training_messages AS message
            SET owner_username = training_session.owner_username
            FROM training_sessions AS training_session
            WHERE message.session_id = training_session.id
              AND message.owner_username IS NULL
            """
        )
        cursor.execute(
            "UPDATE mdt_messages SET owner_username = %s WHERE owner_username IS NULL",
            ("doctor001",),
        )
        cursor.execute(
            "UPDATE training_messages SET owner_username = %s WHERE owner_username IS NULL",
            ("doctor001",),
        )


def generate_patient_id(connection: psycopg.Connection) -> str:
    with connection.cursor() as cursor:
        for _ in range(20):
            patient_id = str(random.randint(100000, 999999))
            cursor.execute("SELECT 1 FROM patients WHERE id = %s", (patient_id,))
            if cursor.fetchone() is None:
                return patient_id
    raise RuntimeError("Failed to generate a unique patient id.")


def _database_error_message() -> str:
    return (
        "Unable to connect to PostgreSQL. "
        "Set DATABASE_URL in backend/.env, for example: "
        "postgresql://postgres:YOUR_PASSWORD@localhost:5432/healthcareagent"
    )
