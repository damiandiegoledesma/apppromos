from datetime import datetime
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.db import init_db, get_cached_answer, save_cached_answer
from app.billing_mp import router as billing_mp_router

app = FastAPI(title="AppPromos Carniza IA", version="12.2.3")
app.include_router(billing_mp_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    question: str
    screen: str | None = None
    business_name: str | None = None

class PriceItem(BaseModel):
    id: str | None = None
    name: str
    price: float
    unit: str | None = "kg"
    active: bool | None = True
    rubro: str | None = None

class UrgentStockRequest(BaseModel):
    products: list[str] = []
    selected_products: list[PriceItem] = []
    discount: int | float = 20
    prices: list[PriceItem] = []
    business_name: str | None = None

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "Carniza IA",
        "version": "12.2.3",
        "mode": "liquidator_margin_control",
        "time": datetime.now().isoformat(),
    }

@app.get("/daily-recommendation")
async def daily_recommendation():
    return {"ok": True, **get_daily_recommendation(), "source": "local_rules"}

@app.post("/urgent-stock")
async def urgent_stock(payload: UrgentStockRequest):
    clean_products = normalize_products(payload.products)
    selected_products = normalize_selected_products([item.model_dump() for item in payload.selected_products])
    discount = normalize_discount(payload.discount)
    prices = normalize_prices([item.model_dump() for item in payload.prices])

    if not clean_products and not selected_products:
        return {"ok": False, "answer": "Marcá al menos un producto atrasado para liquidar hoy.", "source": "validation"}

    plan = build_liquidation_plan(selected_products, clean_products, discount, prices)
    return {
        "ok": True,
        "title": "🔥 OFERTA DEL DÍA",
        "combo": " + ".join(item["label"] for item in plan["items"]),
        "items": plan["items"],
        "total": plan["total"],
        "display_price": format_money(plan["total"]),
        "missing_prices": plan["missing_prices"],
        "discount": discount,
        "message": build_whatsapp_message(plan["items"], plan["total"], plan["missing_prices"]),
        "source": "backend_liquidator_rules",
    }

@app.post("/ask")
async def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        return {"ok": True, "answer": "Decime qué producto tenés atrasado y te ayudo a venderlo hoy.", "source": "fallback"}
    cached = get_cached_answer(question)
    if cached:
        return {"ok": True, "answer": cached, "source": "sqlite_cache"}
    answer = build_commercial_answer(question, payload.screen, payload.business_name)
    save_cached_answer(question, answer)
    return {"ok": True, "answer": answer, "source": "local_rules"}

def get_daily_recommendation():
    day = datetime.now().weekday()
    recommendations = {
        0: {"title": "Lunes de Picada", "text": "Arrancá la semana moviendo carne picada fresca. Promo simple, precio redondo y WhatsApp.", "action": "Crear oferta de picada"},
        1: {"title": "Martes de Milas", "text": "Día ideal para empujar milanesas. Armá promo familiar y vendela como solución rápida.", "action": "Crear oferta de milanesas"},
        2: {"title": "Miércoles de Guiso", "text": "Promocioná cortes para olla: falda, osobuco o paleta. Ideal para mover mercadería atrasada.", "action": "Armar combo guisero"},
        3: {"title": "Jueves de Cerdo", "text": "Buen día para sacar pechito, bondiola o chorizo de cerdo con una promo corta.", "action": "Crear promo de cerdo"},
        4: {"title": "Viernes de Parrilla", "text": "Empujá asado, vacío y chorizos. Mensaje corto y directo: empieza el finde.", "action": "Crear combo parrillero"},
        5: {"title": "Sábado Familiar", "text": "Armá combos grandes para la mesa del domingo. Pocos productos, precio claro.", "action": "Crear combo familiar"},
        6: {"title": "Domingo Parrillero", "text": "Si abrís hoy, vendé rápido: asado, achuras y chorizo listos para la parrilla.", "action": "Crear oferta parrillera"},
    }
    return recommendations.get(day, {"title": "Oferta del día", "text": "Armá una promo rápida y mandala por WhatsApp.", "action": "Crear oferta"})

def build_liquidation_plan(selected_products: list[dict[str, Any]], urgent_products: list[str], discount: int, prices: list[dict[str, Any]]):
    item_map: dict[str, dict[str, Any]] = {}
    missing: set[str] = set()

    source_selected = selected_products
    if not source_selected:
        source_selected = []
        for name in urgent_products:
            found = find_product_price({"name": name}, prices)
            source_selected.append(found or {"name": name, "price": 0, "unit": "kg", "rubro": ""})

    for item in source_selected:
        add_item(item_map, {
            "id": item.get("id") or "",
            "name": item.get("name") or "",
            "rubro": item.get("rubro") or "",
            "price": item.get("price") or 0,
            "unit": item.get("unit") or "kg",
            "qty": get_default_qty(item.get("name") or ""),
            "urgent": True,
        })

    for name in choose_anchor_products([item.get("name") or "" for item in source_selected]):
        found = find_product_price({"name": name}, prices)
        if found:
            add_item(item_map, {
                "id": found.get("id") or "",
                "name": found.get("name") or "",
                "rubro": found.get("rubro") or "",
                "price": found.get("price") or 0,
                "unit": found.get("unit") or "kg",
                "qty": 1,
                "urgent": False,
            })

    items = []
    for item in item_map.values():
        found = item if float(item.get("price") or 0) > 0 else find_product_price(item, prices)
        unit_price = float(found.get("price") or 0) if found else 0
        estimated = unit_price <= 0
        if estimated:
            missing.add(display_product_name(item))
        gross = unit_price * float(item["qty"])
        subtotal = gross * (1 - discount / 100) if item["urgent"] else gross
        items.append({
            "id": item.get("id") or "",
            "name": item["name"],
            "rubro": item.get("rubro") or "",
            "qty": item["qty"],
            "unit": item.get("unit") or "kg",
            "urgent": item["urgent"],
            "unit_price": round(unit_price),
            "subtotal": round(subtotal),
            "estimated": estimated,
            "label": format_item_label(item["name"], item["qty"], item.get("rubro") or ""),
        })
    total = round_seller_price(sum(float(item["subtotal"] or 0) for item in items))
    return {"items": items, "total": total, "missing_prices": sorted(missing)}

def add_item(item_map: dict[str, dict[str, Any]], item: dict[str, Any]):
    clean = clean_product_name(item.get("name") or "")
    if not clean:
        return
    key = f"id:{item.get('id')}" if item.get("id") else f"name:{normalize_key(clean)}:{normalize_key(item.get('rubro') or '')}"
    if key in item_map:
        item_map[key]["qty"] = max(float(item_map[key]["qty"]), float(item.get("qty") or 1))
        item_map[key]["urgent"] = bool(item_map[key]["urgent"] or item.get("urgent") is True)
        return
    item_map[key] = {
        "id": item.get("id") or "",
        "name": clean,
        "rubro": clean_product_name(item.get("rubro") or ""),
        "price": float(item.get("price") or 0),
        "unit": item.get("unit") or "kg",
        "qty": float(item.get("qty") or 1),
        "urgent": item.get("urgent") is True,
    }

def choose_anchor_products(urgent_products: list[str]) -> list[str]:
    keys = [normalize_key(p) for p in urgent_products]
    if any("pollo" in key for key in keys):
        return ["chorizo"]
    if any(key in ["cerdo", "bondiola", "pechito"] or "cerdo" in key for key in keys):
        return ["chorizo", "asado"]
    if any("milanesa" in key or "mila" in key for key in keys):
        return ["picada"]
    if any("asado" in key or "vacio" in key for key in keys):
        return ["chorizo"]
    return ["picada", "chorizo"]

def get_default_qty(name: str) -> float:
    key = normalize_key(name)
    if "milanesa" in key or "mila" in key:
        return 2
    if "pollo" in key:
        return 2
    return 1

def find_product_price(query: Any, prices: list[dict[str, Any]]) -> dict[str, Any] | None:
    query_id = clean_product_name(query.get("id") if isinstance(query, dict) else "")
    target = normalize_key(query.get("name") if isinstance(query, dict) else query)
    if query_id:
        for item in prices:
            if clean_product_name(item.get("id")) == query_id:
                return item
    if not target:
        return None
    for item in prices:
        if normalize_key(item.get("name")) == target:
            return item
    for item in prices:
        item_key = normalize_key(item.get("name"))
        if item_key and (item_key in target or target in item_key):
            return item
    return None

def estimate_unit_price(prices: list[dict[str, Any]]) -> float:
    values = [float(item.get("price") or 0) for item in prices if float(item.get("price") or 0) > 0]
    return sum(values) / len(values) if values else 0

def build_whatsapp_message(items: list[dict[str, Any]], total: float, missing_prices: list[str]):
    item_lines = "\n".join(f"• {item['label']}" for item in items)
    price = format_money(total) if total > 0 else "Precio a confirmar"
    warning = "\n⚠️ Revisá precios faltantes antes de enviar." if missing_prices else ""
    return f"🔥 OFERTA DEL DÍA\n\n{item_lines}\n\n💰 {price}\n\nHasta agotar stock.{warning}"

def build_commercial_answer(question: str, screen: str | None, business_name: str | None) -> str:
    q = question.lower()
    if has_any(q, ["stock", "clavado", "sobrando", "no sale", "mover", "oscuro", "batea", "liquidar", "atrasado"]):
        return "Marcá el producto atrasado, elegí cuánto querés bajar y tocá LIQUIDAR HOY. Carniza te arma una oferta lista para WhatsApp."
    if has_any(q, ["precio", "precios", "caro", "barato"]):
        return "Usá precios reales de tu lista. Para liquidar, bajá solo el producto urgente, no todo el combo."
    if has_any(q, ["combo", "oferta", "promo", "promoción"]):
        return "Armá una OFERTA DEL DÍA: producto atrasado con descuento + producto gancho a precio normal."
    if has_any(q, ["whatsapp", "mensaje", "mandar", "enviar"]):
        return "Mensaje corto: OFERTA DEL DÍA, productos, precio final y hasta agotar stock."
    today = get_daily_recommendation()
    return f"{today['title']}: {today['text']}"

def normalize_products(products: list[str]) -> list[str]:
    seen, result = set(), []
    for item in products or []:
        clean = clean_product_name(item)
        key = normalize_key(clean)
        if clean and key not in seen:
            seen.add(key)
            result.append(clean)
    return result

def normalize_prices(prices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for index, item in enumerate(prices or []):
        name = clean_product_name(item.get("name") or item.get("nombre") or "")
        try:
            price = float(item.get("price") if item.get("price") is not None else item.get("precio") or 0)
        except Exception:
            price = 0
        if name and price > 0 and item.get("active", True) is not False:
            result.append({
                "id": item.get("id") or item.get("productKey") or f"item_{index}",
                "name": name,
                "rubro": clean_product_name(item.get("rubro") or item.get("category") or item.get("categoria") or ""),
                "price": price,
                "unit": item.get("unit") or item.get("unidad") or "kg"
            })
    return result

def normalize_selected_products(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    seen = set()
    for index, item in enumerate(products or []):
        name = clean_product_name(item.get("name") or item.get("nombre") or "")
        if not name:
            continue
        item_id = clean_product_name(item.get("id") or item.get("productKey") or f"selected_{index}")
        key = item_id or f"{normalize_key(name)}:{normalize_key(item.get('rubro') or '')}"
        if key in seen:
            continue
        seen.add(key)
        try:
            price = float(item.get("price") if item.get("price") is not None else item.get("precio") or 0)
        except Exception:
            price = 0
        result.append({
            "id": item_id,
            "name": name,
            "rubro": clean_product_name(item.get("rubro") or item.get("category") or item.get("categoria") or ""),
            "price": price,
            "unit": item.get("unit") or item.get("unidad") or "kg"
        })
    return result

def normalize_discount(discount: int | float) -> int:
    try:
        n = int(round(float(discount)))
    except Exception:
        return 20
    return max(0, min(50, n))

def clean_product_name(value: Any) -> str:
    return " ".join(str(value or "").strip().split())

def normalize_key(value: Any) -> str:
    import unicodedata
    text = unicodedata.normalize("NFD", clean_product_name(value))
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()

def rubro_icon(rubro: str = "") -> str:
    key = normalize_key(rubro)
    if "cerdo" in key or "chancho" in key:
        return "🐖"
    if "pollo" in key or "ave" in key:
        return "🐔"
    if "novillo" in key or "vaca" in key or "ternera" in key or "res" in key:
        return "🐄"
    if "achura" in key:
        return "🔥"
    if "elaborado" in key or "milanesa" in key:
        return "🍽️"
    return "🥩"

def display_product_name(item: dict[str, Any]) -> str:
    rubro = clean_product_name(item.get("rubro") or "")
    name = clean_product_name(item.get("name") or "")
    return f"{name} — {rubro}" if rubro else name

def format_item_label(name: str, qty: float, rubro: str = "") -> str:
    qty_text = str(int(qty)) if float(qty).is_integer() else str(qty)
    icon = rubro_icon(rubro)
    rubro_text = f" — {clean_product_name(rubro)}" if clean_product_name(rubro) else ""
    if "pollo" in normalize_key(name) and qty >= 2:
        return f"{qty_text} {icon} pollos{rubro_text}"
    return f"{qty_text} kg {icon} {clean_product_name(name)}{rubro_text}"

def round_seller_price(value: float) -> int:
    if value <= 0:
        return 0
    return max(100, int(round(value / 100) * 100))

def format_money(value: float) -> str:
    if value <= 0:
        return "Precio a revisar"
    return "$" + f"{int(round(value)):,}".replace(",", ".")

def has_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)
