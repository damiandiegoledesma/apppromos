from __future__ import annotations

import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.billing_model import ADDITIONAL_USER_PRICE, PLAN_PRICES, calculate_app_charge, plan_label

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

router = APIRouter(prefix="/billing/mp", tags=["billing-mercado-pago"])

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "apppromos.db"
MP_API_BASE = "https://api.mercadopago.com"


class MPPreferenceRequest(BaseModel):
    business_id: str = Field(..., min_length=2)
    business_name: str | None = None
    plan: str = "ARRANQUE"
    amount: float = Field(..., gt=0)
    payer_email: str | None = None
    payer_name: str | None = None
    description: str | None = None
    notification_url: str | None = None


class AppChargeRequest(BaseModel):
    business_id: str = Field(..., min_length=2)
    business_name: str | None = None
    plan: str = "ARRANQUE"
    billing_kind: str = "first_period_prorated"
    signup_date: str | None = None
    period_month: str | None = None
    additional_users_count: int = Field(0, ge=0)
    additional_user_start_date: str | None = None
    additional_user_amount: int | None = None
    payer_email: str | None = None
    payer_name: str | None = None
    description: str | None = None
    notification_url: str | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_billing_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_id TEXT NOT NULL,
                business_name TEXT,
                plan TEXT,
                amount REAL NOT NULL,
                preference_id TEXT,
                init_point TEXT,
                sandbox_init_point TEXT,
                external_reference TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'created',
                created_at TEXT NOT NULL,
                raw_response TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_id TEXT,
                preference_id TEXT,
                payment_id TEXT,
                external_reference TEXT,
                event_type TEXT,
                status TEXT,
                status_detail TEXT,
                amount REAL,
                created_at TEXT NOT NULL,
                raw_payload TEXT,
                raw_response TEXT
            )
            """
        )

        existing = {row[1] for row in conn.execute("PRAGMA table_info(payment_links)").fetchall()}
        optional_columns = {
            "billing_kind": "TEXT",
            "period_key": "TEXT",
            "period_start": "TEXT",
            "period_end": "TEXT",
            "due_date": "TEXT",
            "grace_until": "TEXT",
            "warning_from": "TEXT",
            "suspend_from": "TEXT",
            "additional_users_count": "INTEGER",
            "additional_user_amount": "REAL",
            "additional_users_amount": "REAL",
            "total_monthly_amount": "REAL",
            "plan_amount": "REAL",
            "metadata_json": "TEXT",
        }
        for name, ddl in optional_columns.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE payment_links ADD COLUMN {name} {ddl}")

        conn.commit()


def mp_access_token() -> str:
    token = os.getenv("MP_ACCESS_TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Falta configurar MP_ACCESS_TOKEN en el backend. No se puede generar link Mercado Pago.",
        )
    return token


def safe_text(value: Any, fallback: str = "") -> str:
    text = " ".join(str(value or fallback or "").strip().split())
    return text[:180]


def money(value: Any) -> float:
    try:
        return round(float(value), 2)
    except Exception:
        return 0.0


def mp_json_request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    token = mp_access_token()
    body = json.dumps(payload or {}).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        f"{MP_API_BASE}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=exc.code, detail=f"Mercado Pago respondió error: {raw[:600]}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar con Mercado Pago: {exc}")


def extract_business_id(external_reference: str | None) -> str | None:
    if not external_reference:
        return None
    # Formato usado por AppPromos: businessId::timestamp
    return str(external_reference).split("::", 1)[0] or None


@router.get("/health")
async def billing_health():
    init_billing_db()
    return {
        "ok": True,
        "module": "billing_mp",
        "db": str(DB_PATH),
        "mp_configured": bool(os.getenv("MP_ACCESS_TOKEN", "").strip()),
    }


@router.get("/plans")
async def billing_plans():
    return {
        "ok": True,
        "plans": [
            {"key": key, "label": plan_label(key), "monthly_amount": amount}
            for key, amount in PLAN_PRICES.items()
        ],
        "additional_user": {
            "label": "Usuario adicional",
            "monthly_amount": ADDITIONAL_USER_PRICE,
            "launch_promo": True,
            "first_user_included": True,
        },
        "policy": {
            "cycle": "calendar_month",
            "billing": "mes_vencido",
            "first_charge": "proporcional_desde_alta_hasta_fin_de_mes",
            "rounding": "ceil_100",
            "grace_days": 5,
            "suspend_from_day": 7,
        },
    }


@router.post("/app-charge-preview")
async def app_charge_preview(payload: AppChargeRequest):
    try:
        calculation = calculate_app_charge(
            plan=payload.plan,
            billing_kind=payload.billing_kind,
            signup_date=payload.signup_date,
            period_month=payload.period_month,
            additional_users_count=payload.additional_users_count,
            additional_user_start_date=payload.additional_user_start_date,
            additional_user_amount=payload.additional_user_amount or ADDITIONAL_USER_PRICE,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"ok": True, "business_id": safe_text(payload.business_id), "calculation": calculation}


@router.post("/app-charge")
async def create_app_charge(payload: AppChargeRequest):
    init_billing_db()
    business_id = safe_text(payload.business_id)
    business_name = safe_text(payload.business_name, business_id)
    try:
        calculation = calculate_app_charge(
            plan=payload.plan,
            billing_kind=payload.billing_kind,
            signup_date=payload.signup_date,
            period_month=payload.period_month,
            additional_users_count=payload.additional_users_count,
            additional_user_start_date=payload.additional_user_start_date,
            additional_user_amount=payload.additional_user_amount or ADDITIONAL_USER_PRICE,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    amount = money(calculation["amount"])
    if amount <= 0:
        raise HTTPException(status_code=400, detail="El importe calculado debe ser mayor a cero.")

    external_reference = f"{business_id}::{calculation['billing_kind']}::{calculation['period_key']}::{int(time.time())}"
    title = safe_text(payload.description, calculation["description"])
    notification_url = safe_text(payload.notification_url or os.getenv("MP_NOTIFICATION_URL", ""))

    mp_payload: dict[str, Any] = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "unit_price": amount,
                "currency_id": "ARS",
            }
        ],
        "external_reference": external_reference,
        "metadata": {
            "business_id": business_id,
            "business_name": business_name,
            "plan": calculation["plan"],
            "plan_label": calculation["plan_label"],
            "billing_kind": calculation["billing_kind"],
            "period_key": calculation["period_key"],
            "period_start": calculation["period_start"],
            "period_end": calculation["period_end"],
            "source": "apppromos_billing_engine",
        },
        "payer": {},
    }
    if notification_url:
        mp_payload["notification_url"] = notification_url
    if payload.payer_email:
        mp_payload["payer"]["email"] = safe_text(payload.payer_email)
    if payload.payer_name:
        mp_payload["payer"]["name"] = safe_text(payload.payer_name)
    if not mp_payload["payer"]:
        mp_payload.pop("payer", None)

    result = mp_json_request("POST", "/checkout/preferences", mp_payload)
    preference_id = str(result.get("id") or "")
    init_point = str(result.get("init_point") or "")
    sandbox_init_point = str(result.get("sandbox_init_point") or "")

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO payment_links (
                business_id, business_name, plan, amount, preference_id,
                init_point, sandbox_init_point, external_reference, status,
                created_at, raw_response, billing_kind, period_key,
                period_start, period_end, due_date, grace_until, warning_from,
                suspend_from, additional_users_count, additional_user_amount,
                additional_users_amount, total_monthly_amount, plan_amount, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                business_id,
                business_name,
                calculation["plan"],
                amount,
                preference_id,
                init_point,
                sandbox_init_point,
                external_reference,
                "created",
                now_iso(),
                json.dumps(result, ensure_ascii=False),
                calculation["billing_kind"],
                calculation["period_key"],
                calculation["period_start"],
                calculation["period_end"],
                calculation["due_date"],
                calculation["grace_until"],
                calculation["warning_from"],
                calculation["suspend_from"],
                calculation.get("additional_users_count", 0),
                calculation.get("additional_user_amount", ADDITIONAL_USER_PRICE),
                calculation.get("additional_users_amount", 0),
                calculation.get("total_monthly_amount", amount),
                calculation.get("plan_amount", amount),
                json.dumps(calculation, ensure_ascii=False),
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "business_id": business_id,
        "business_name": business_name,
        "calculation": calculation,
        "preference_id": preference_id,
        "init_point": init_point,
        "sandbox_init_point": sandbox_init_point,
        "external_reference": external_reference,
    }


@router.post("/preference")
async def create_mp_preference(payload: MPPreferenceRequest):
    init_billing_db()
    business_id = safe_text(payload.business_id)
    business_name = safe_text(payload.business_name, business_id)
    plan = safe_text(payload.plan, "ARRANQUE").upper()
    amount = money(payload.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="El importe debe ser mayor a cero.")

    external_reference = f"{business_id}::{int(time.time())}"
    title = safe_text(payload.description, f"AppPromos {plan} - {business_name}")
    notification_url = safe_text(payload.notification_url or os.getenv("MP_NOTIFICATION_URL", ""))

    mp_payload: dict[str, Any] = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "unit_price": amount,
                "currency_id": "ARS",
            }
        ],
        "external_reference": external_reference,
        "metadata": {
            "business_id": business_id,
            "business_name": business_name,
            "plan": plan,
            "source": "apppromos_admin",
        },
        "payer": {},
    }
    if notification_url:
        mp_payload["notification_url"] = notification_url
    if payload.payer_email:
        mp_payload["payer"]["email"] = safe_text(payload.payer_email)
    if payload.payer_name:
        mp_payload["payer"]["name"] = safe_text(payload.payer_name)
    if not mp_payload["payer"]:
        mp_payload.pop("payer", None)

    result = mp_json_request("POST", "/checkout/preferences", mp_payload)
    preference_id = str(result.get("id") or "")
    init_point = str(result.get("init_point") or "")
    sandbox_init_point = str(result.get("sandbox_init_point") or "")

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO payment_links (
                business_id, business_name, plan, amount, preference_id,
                init_point, sandbox_init_point, external_reference, status,
                created_at, raw_response
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                business_id,
                business_name,
                plan,
                amount,
                preference_id,
                init_point,
                sandbox_init_point,
                external_reference,
                "created",
                now_iso(),
                json.dumps(result, ensure_ascii=False),
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "business_id": business_id,
        "plan": plan,
        "amount": amount,
        "preference_id": preference_id,
        "init_point": init_point,
        "sandbox_init_point": sandbox_init_point,
        "external_reference": external_reference,
    }


@router.get("/links/{business_id}")
async def list_payment_links(business_id: str):
    init_billing_db()
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT business_id, business_name, plan, amount, preference_id,
                   init_point, sandbox_init_point, external_reference, status, created_at,
                   billing_kind, period_key, period_start, period_end, due_date,
                   grace_until, warning_from, suspend_from, additional_users_count,
                   additional_user_amount, additional_users_amount, total_monthly_amount,
                   plan_amount
            FROM payment_links
            WHERE business_id = ?
            ORDER BY id DESC
            LIMIT 10
            """,
            (business_id,),
        ).fetchall()
    return {"ok": True, "links": [dict(row) for row in rows]}


@router.get("/status/{business_id}")
async def billing_status(business_id: str):
    init_billing_db()
    with get_conn() as conn:
        link = conn.execute(
            """
            SELECT * FROM payment_links
            WHERE business_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (business_id,),
        ).fetchone()
        event = conn.execute(
            """
            SELECT * FROM payment_events
            WHERE business_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (business_id,),
        ).fetchone()
    return {
        "ok": True,
        "business_id": business_id,
        "last_link": dict(link) if link else None,
        "last_event": dict(event) if event else None,
    }


@router.post("/webhook")
async def mp_webhook(request: Request):
    init_billing_db()
    query = dict(request.query_params)
    try:
        body = await request.json()
    except Exception:
        body = {}

    event_type = safe_text(body.get("type") or body.get("topic") or query.get("type") or query.get("topic") or "unknown")
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    payment_id = safe_text(data.get("id") or body.get("id") or query.get("id") or query.get("data.id"))

    payment_response: dict[str, Any] = {}
    status = None
    status_detail = None
    amount = None
    external_reference = safe_text(body.get("external_reference") or "")
    preference_id = None

    if payment_id and event_type in {"payment", "merchant_order", "topic_payment", "unknown"}:
        try:
            payment_response = mp_json_request("GET", f"/v1/payments/{payment_id}")
            status = payment_response.get("status")
            status_detail = payment_response.get("status_detail")
            amount = payment_response.get("transaction_amount")
            external_reference = safe_text(payment_response.get("external_reference") or external_reference)
            preference_id = safe_text(payment_response.get("preference_id") or "")
        except HTTPException as exc:
            payment_response = {"fetch_error": exc.detail}

    business_id = extract_business_id(external_reference)

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO payment_events (
                business_id, preference_id, payment_id, external_reference,
                event_type, status, status_detail, amount, created_at,
                raw_payload, raw_response
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                business_id,
                preference_id,
                payment_id,
                external_reference,
                event_type,
                status,
                status_detail,
                money(amount) if amount is not None else None,
                now_iso(),
                json.dumps({"query": query, "body": body}, ensure_ascii=False),
                json.dumps(payment_response, ensure_ascii=False),
            ),
        )
        conn.commit()

    return {
        "ok": True,
        "received": True,
        "event_type": event_type,
        "payment_id": payment_id,
        "business_id": business_id,
        "status": status,
    }
