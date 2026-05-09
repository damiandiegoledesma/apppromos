from __future__ import annotations

import calendar
import math
import unicodedata
from datetime import date, datetime, timedelta
from typing import Any

PLAN_PRICES: dict[str, int] = {
    "ARRANQUE": 19999,
    "SALVADOR": 34999,
    "DUENO": 54999,
}

PLAN_LABELS: dict[str, str] = {
    "ARRANQUE": "ARRANQUE",
    "SALVADOR": "SALVADOR",
    "DUENO": "DUENO",
}

PLAN_ALIASES: dict[str, str] = {
    "ARRANQUE": "ARRANQUE",
    "BASIC": "ARRANQUE",
    "IMPULSO": "ARRANQUE",
    "SALVADOR": "SALVADOR",
    "PRO": "SALVADOR",
    "DUENO": "DUENO",
    "DUEÑO": "DUENO",
    "DUENIO": "DUENO",
    "DUEÑO/A": "DUENO",
}

ADDITIONAL_USER_PRICE = 4999

GRACE_DAYS = 5
WARNING_DAY_OFFSET = 5  # dia 6 desde el vencimiento operativo
SUSPEND_DAY_OFFSET = 6  # dia 7 desde el vencimiento operativo


def normalize_key(value: Any) -> str:
    text = " ".join(str(value or "").strip().upper().split())
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text


def normalize_plan(value: Any) -> str:
    raw = normalize_key(value or "ARRANQUE")
    if raw in PLAN_ALIASES:
        return PLAN_ALIASES[raw]
    if raw in PLAN_PRICES:
        return raw
    return "ARRANQUE"


def plan_label(plan: Any) -> str:
    key = normalize_plan(plan)
    return PLAN_LABELS.get(key, key)


def monthly_amount(plan: Any) -> int:
    return PLAN_PRICES[normalize_plan(plan)]


def parse_date(value: Any | None, fallback: date | None = None) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    text = str(value or "").strip()
    if text:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    return fallback or date.today()


def parse_month(value: Any | None, fallback: date | None = None) -> date:
    text = str(value or "").strip()
    if text:
        if len(text) == 7:
            year, month = text.split("-", 1)
            return date(int(year), int(month), 1)
        parsed = parse_date(text)
        return date(parsed.year, parsed.month, 1)
    base = fallback or date.today()
    return date(base.year, base.month, 1)


def last_day_of_month(day: date) -> date:
    return date(day.year, day.month, calendar.monthrange(day.year, day.month)[1])


def first_day_next_month(day: date) -> date:
    if day.month == 12:
        return date(day.year + 1, 1, 1)
    return date(day.year, day.month + 1, 1)


def round_up_to_hundred(value: float) -> int:
    if value <= 0:
        return 0
    return int(math.ceil(value / 100.0) * 100)


def iso(day: date) -> str:
    return day.isoformat()


def safe_non_negative_int(value: Any) -> int:
    try:
        number = int(value or 0)
    except Exception:
        return 0
    return max(0, number)


def build_due_dates(period_end: date) -> dict[str, str]:
    due_date = first_day_next_month(period_end)
    grace_until = due_date + timedelta(days=GRACE_DAYS - 1)
    warning_from = due_date + timedelta(days=WARNING_DAY_OFFSET)
    suspend_from = due_date + timedelta(days=SUSPEND_DAY_OFFSET)
    return {
        "due_date": iso(due_date),
        "grace_until": iso(grace_until),
        "warning_from": iso(warning_from),
        "suspend_from": iso(suspend_from),
    }


def billable_days_between(start: date, end: date) -> int:
    if start > end:
        return 0
    return (end - start).days + 1


def clamp_start_to_period(start: date, period_start: date, period_end: date) -> date:
    if start < period_start:
        return period_start
    if start > period_end:
        return period_end + timedelta(days=1)
    return start


def extra_users_summary(
    additional_users_count: int = 0,
    additional_user_amount: int = ADDITIONAL_USER_PRICE,
) -> dict[str, Any]:
    count = safe_non_negative_int(additional_users_count)
    unit_amount = safe_non_negative_int(additional_user_amount) or ADDITIONAL_USER_PRICE
    monthly_total = count * unit_amount
    return {
        "additional_users_count": count,
        "additional_user_amount": unit_amount,
        "additional_users_monthly_total": monthly_total,
    }


def calculate_first_period(
    plan: Any,
    signup_date: Any | None = None,
    additional_users_count: int = 0,
    additional_user_start_date: Any | None = None,
    additional_user_amount: int = ADDITIONAL_USER_PRICE,
) -> dict[str, Any]:
    start = parse_date(signup_date)
    end = last_day_of_month(start)
    month_days = end.day
    plan_billable_days = billable_days_between(start, end)

    key = normalize_plan(plan)
    monthly = monthly_amount(key)
    raw_plan_amount = (monthly / month_days) * plan_billable_days

    extra = extra_users_summary(additional_users_count, additional_user_amount)
    extra_start = parse_date(additional_user_start_date, fallback=start) if extra["additional_users_count"] else start
    extra_start = clamp_start_to_period(extra_start, start, end)
    extra_billable_days = billable_days_between(extra_start, end) if extra["additional_users_count"] else 0
    raw_extra_amount = (extra["additional_users_monthly_total"] / month_days) * extra_billable_days if extra_billable_days else 0.0

    raw_total = raw_plan_amount + raw_extra_amount
    final_amount = round_up_to_hundred(raw_total)
    plan_amount_rounded = round_up_to_hundred(raw_plan_amount)
    extra_amount_rounded = round_up_to_hundred(raw_extra_amount) if raw_extra_amount else 0

    extra_desc = ""
    if extra["additional_users_count"]:
        extra_desc = f" + {extra['additional_users_count']} usuario(s) adicional(es)"

    return {
        "billing_kind": "first_period_prorated",
        "plan": key,
        "plan_label": plan_label(key),
        "monthly_amount": monthly,
        "plan_amount": plan_amount_rounded,
        "raw_plan_amount": round(raw_plan_amount, 2),
        **extra,
        "additional_users_amount": extra_amount_rounded,
        "raw_additional_users_amount": round(raw_extra_amount, 2),
        "additional_user_start_date": iso(extra_start) if extra["additional_users_count"] else None,
        "additional_user_billable_days": extra_billable_days,
        "total_monthly_amount": monthly + extra["additional_users_monthly_total"],
        "amount": final_amount,
        "raw_amount": round(raw_total, 2),
        "rounding": "ceil_100",
        "period_start": iso(start),
        "period_end": iso(end),
        "period_key": f"{start.year:04d}-{start.month:02d}",
        "month_days": month_days,
        "billable_days": plan_billable_days,
        "description": f"AppPromos {plan_label(key)}{extra_desc} - proporcional {plan_billable_days} dias ({start.strftime('%d/%m')} al {end.strftime('%d/%m')})",
        **build_due_dates(end),
    }


def calculate_full_month(
    plan: Any,
    period_month: Any | None = None,
    additional_users_count: int = 0,
    additional_user_amount: int = ADDITIONAL_USER_PRICE,
) -> dict[str, Any]:
    start = parse_month(period_month)
    end = last_day_of_month(start)
    key = normalize_plan(plan)
    monthly = monthly_amount(key)

    extra = extra_users_summary(additional_users_count, additional_user_amount)
    final_amount = monthly + extra["additional_users_monthly_total"]

    extra_desc = ""
    if extra["additional_users_count"]:
        extra_desc = f" + {extra['additional_users_count']} usuario(s) adicional(es)"

    return {
        "billing_kind": "full_month",
        "plan": key,
        "plan_label": plan_label(key),
        "monthly_amount": monthly,
        "plan_amount": monthly,
        "raw_plan_amount": float(monthly),
        **extra,
        "additional_users_amount": extra["additional_users_monthly_total"],
        "raw_additional_users_amount": float(extra["additional_users_monthly_total"]),
        "additional_user_start_date": iso(start) if extra["additional_users_count"] else None,
        "additional_user_billable_days": end.day if extra["additional_users_count"] else 0,
        "total_monthly_amount": final_amount,
        "amount": final_amount,
        "raw_amount": float(final_amount),
        "rounding": "none",
        "period_start": iso(start),
        "period_end": iso(end),
        "period_key": f"{start.year:04d}-{start.month:02d}",
        "month_days": end.day,
        "billable_days": end.day,
        "description": f"AppPromos {plan_label(key)}{extra_desc} - abono mensual {start.strftime('%m/%Y')}",
        **build_due_dates(end),
    }


def calculate_app_charge(
    plan: Any,
    billing_kind: str = "first_period_prorated",
    signup_date: Any | None = None,
    period_month: Any | None = None,
    additional_users_count: int = 0,
    additional_user_start_date: Any | None = None,
    additional_user_amount: int = ADDITIONAL_USER_PRICE,
) -> dict[str, Any]:
    kind = str(billing_kind or "first_period_prorated").strip().lower()
    if kind in {"first", "first_period", "first_period_prorated", "proportional", "prorrateo", "prorated"}:
        return calculate_first_period(
            plan=plan,
            signup_date=signup_date,
            additional_users_count=additional_users_count,
            additional_user_start_date=additional_user_start_date,
            additional_user_amount=additional_user_amount,
        )
    if kind in {"full", "full_month", "monthly", "mes_completo"}:
        return calculate_full_month(
            plan=plan,
            period_month=period_month,
            additional_users_count=additional_users_count,
            additional_user_amount=additional_user_amount,
        )
    raise ValueError("billing_kind invalido. Usar first_period_prorated o full_month.")
