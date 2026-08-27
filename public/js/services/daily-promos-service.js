import { db, doc, writeBatch } from "../core/firebase-core.js";
import { patchBusinessStore } from "./business-store.js";
import { saveBusinessCache } from "./cache-service.js";
import { assertBusinessCanWrite } from "./write-guard-service.js";
import { buildPublicWebPayload, loadWebConfig, normalizeSlug } from "./web-premium-service.js";

const DEMO_DAILY_PROMOS_KEY = "apppromos_demo_daily_promos_v1";

function cleanText(value = "") {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function number(value = 0) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDailyPromoId() {
  try {
    if (crypto?.randomUUID) return `daily_${crypto.randomUUID()}`;
  } catch (_) {}
  return `daily_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getArgentinaDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getArgentinaEndOfDayIso(date = new Date()) {
  const [year, month, day] = getArgentinaDayKey(date).split("-").map(Number);
  // Buenos Aires usa UTC-3. Las 00:00 del día siguiente equivalen a las 03:00 UTC.
  return new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0) - 1).toISOString();
}

function normalizeDailyPromoItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item = {}) => ({
    productId: cleanText(item.productId || item.id || ""),
    name: cleanText(item.name || item.nombre || "Producto"),
    rubro: cleanText(item.rubro || item.category || ""),
    qty: Math.max(0.5, number(item.qty ?? item.cantidad ?? 1) || 1),
    unit: cleanText(item.unit || item.unidad || "kg") || "kg",
    unitPrice: Math.max(0, number(item.unitPrice ?? item.unit_price ?? item.price ?? 0)),
    subtotal: Math.max(0, Math.round(number(item.subtotal ?? item.discountedSubtotal ?? 0)))
  })).filter((item) => item.name && item.unitPrice > 0 && item.subtotal > 0);
}

export function buildDailyPromo({ name = "", items = [], discountPct = 0, total = 0, now = new Date() } = {}) {
  const cleanName = cleanText(name);
  const cleanItems = normalizeDailyPromoItems(items);
  const listTotal = cleanItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const calculatedTotal = cleanItems.reduce((sum, item) => sum + item.subtotal, 0);
  const commercialTotal = Math.max(0, Math.round(number(total || calculatedTotal)));
  if (!cleanName) throw new Error("Poné un nombre comercial antes de publicar.");
  if (!cleanItems.length || commercialTotal <= 0) throw new Error("La oferta no tiene productos y precios válidos para publicar.");

  const createdAt = now.toISOString();
  return {
    id: createDailyPromoId(),
    schemaVersion: 1,
    origin: "urgent_sale",
    name: cleanName,
    items: cleanItems,
    listTotal: Math.round(listTotal),
    discountPct: Math.max(0, Math.min(50, Math.round(number(discountPct)))),
    calculatedTotal: Math.round(calculatedTotal),
    total: commercialTotal,
    status: "active",
    dayKey: getArgentinaDayKey(now),
    createdAt,
    publishedAt: createdAt,
    expiresAt: getArgentinaEndOfDayIso(now),
    endedAt: null
  };
}

function readDemoDailyPromos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_DAILY_PROMOS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeDemoDailyPromos(promos = []) {
  try { localStorage.setItem(DEMO_DAILY_PROMOS_KEY, JSON.stringify(promos)); } catch (_) {}
}

export function getDailyPromosForManagement({ state = {}, isDemo = false } = {}) {
  return isDemo
    ? readDemoDailyPromos()
    : (Array.isArray(state?.dailyPromos) ? state.dailyPromos : []);
}

export async function publishDailyPromo({ businessId = "", meta = {}, state = {}, offer = {}, isDemo = false } = {}) {
  const promo = buildDailyPromo(offer);
  const currentDailyPromos = isDemo
    ? readDemoDailyPromos()
    : (Array.isArray(state?.dailyPromos) ? state.dailyPromos : []);
  const dailyPromos = [promo, ...currentDailyPromos];
  const nextState = { ...(state || {}), dailyPromos, updatedAt: new Date().toISOString() };

  if (isDemo) {
    writeDemoDailyPromos(dailyPromos);
    return { promo, state: nextState, demo: true, publicSnapshot: null };
  }

  if (!businessId) throw new Error("No se encontró la carnicería para publicar.");
  await assertBusinessCanWrite(businessId, "publicar una Promo del día");

  const loaded = await loadWebConfig(businessId, { businessId, meta, state });
  const web = loaded?.config || nextState.web || {};
  const rawSlug = String(web?.slug || "").trim();
  if (!rawSlug) throw new Error("Tu carnicería online todavía no tiene un enlace público válido.");
  const slug = normalizeSlug(rawSlug);

  const publicSnapshot = buildPublicWebPayload({
    businessId,
    slug,
    meta,
    state: nextState,
    web,
    phoneKey: meta?.phoneKey || meta?.telefono || meta?.phone || "",
    plan: "web_premium",
    createdFrom: "daily_promo_publish",
    updatedAt: new Date().toISOString()
  });

  const batch = writeBatch(db);
  batch.set(doc(db, "businesses", businessId, "core", "state"), nextState);
  batch.set(doc(db, "publicWebSlugs", slug), publicSnapshot);
  await batch.commit();

  patchBusinessStore(businessId, { state: nextState });
  saveBusinessCache(businessId, {
    meta,
    state: nextState,
    products: Array.isArray(nextState.products) ? nextState.products : []
  });
  return { promo, state: nextState, demo: false, publicSnapshot };
}

export async function finishDailyPromo({ businessId = "", meta = {}, state = {}, promoId = "", isDemo = false } = {}) {
  const cleanId = cleanText(promoId);
  if (!cleanId) throw new Error("No se encontró la oferta para finalizar.");

  const currentDailyPromos = getDailyPromosForManagement({ state, isDemo });
  const current = currentDailyPromos.find((promo = {}) => String(promo.id || "") === cleanId);
  if (!current) throw new Error("La oferta ya no está disponible.");
  if (current.status !== "active") throw new Error("La oferta ya estaba finalizada.");

  const endedAt = new Date().toISOString();
  const dailyPromos = currentDailyPromos.map((promo = {}) => String(promo.id || "") === cleanId
    ? { ...promo, status: "ended", endedAt, endedReason: "manual" }
    : promo);
  const nextState = { ...(state || {}), dailyPromos, updatedAt: endedAt };

  if (isDemo) {
    writeDemoDailyPromos(dailyPromos);
    return { promo: { ...current, status: "ended", endedAt, endedReason: "manual" }, state: nextState, demo: true, publicSnapshot: null };
  }

  if (!businessId) throw new Error("No se encontró la carnicería para finalizar la oferta.");
  await assertBusinessCanWrite(businessId, "finalizar una Promo del día");

  const loaded = await loadWebConfig(businessId, { businessId, meta, state: nextState });
  const web = loaded?.config || nextState.web || {};
  const rawSlug = String(web?.slug || "").trim();
  if (!rawSlug) throw new Error("Tu carnicería online todavía no tiene un enlace público válido.");
  const slug = normalizeSlug(rawSlug);
  const publicSnapshot = buildPublicWebPayload({
    businessId,
    slug,
    meta,
    state: nextState,
    web,
    phoneKey: meta?.phoneKey || meta?.telefono || meta?.phone || "",
    plan: "web_premium",
    createdFrom: "daily_promo_finish",
    updatedAt: endedAt
  });

  const batch = writeBatch(db);
  batch.set(doc(db, "businesses", businessId, "core", "state"), nextState);
  batch.set(doc(db, "publicWebSlugs", slug), publicSnapshot);
  await batch.commit();

  patchBusinessStore(businessId, { state: nextState });
  saveBusinessCache(businessId, {
    meta,
    state: nextState,
    products: Array.isArray(nextState.products) ? nextState.products : []
  });
  return { promo: { ...current, status: "ended", endedAt, endedReason: "manual" }, state: nextState, demo: false, publicSnapshot };
}
