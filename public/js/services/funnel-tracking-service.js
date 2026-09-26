// Carnis.app — Tracking Comercial V1 (embudo de adquisición del carnicero).
// Especificación: docs/TRACKING_COMERCIAL_V1.md
//
// - visitor_id anónimo y persistente, sin PII ni fingerprinting.
// - session_id: nueva sesión tras 30 min de inactividad o con una campaña nueva.
// - first_touch inmutable, current_touch de la sesión, last_touch atribuible
//   (un regreso directo no pisa una campaña conocida).
// - Escritura append-only en funnelEvents/{event_id}; occurred_at = hora del servidor.
// - Cola persistente: un evento que no llegó se reintenta en la próxima carga;
//   el id fijo evita duplicados (un segundo create del mismo id lo rechazan las reglas).
// - Modo interno: ?interno=1 (persistente) / ?interno=0. En localhost es interno por defecto.
//
// El import no tiene efectos: nada se guarda ni se envía hasta llamar initFunnelTracking().
// Nunca lanza errores hacia la UI.

import { db, isLocalQa } from "../core/firebase-core.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const FUNNEL_SCHEMA_VERSION = 1;
export const FUNNEL_BUILD = "V12.29-RC5.6+T1+L2";
export const FUNNEL_COLLECTION = "funnelEvents";

export const FUNNEL_EVENTS = Object.freeze([
  "landing_view",
  "cta_create_clicked",
  "onboarding_started",
  "rubros_completed",
  "prices_started",
  "prices_completed",
  "name_completed",
  "storefront_previewed",
  "signup_started",
  "account_created",
  "business_created",
  "share_whatsapp_clicked"
]);

const CTA_POSITIONS = new Set(["nav", "hero", "how_it_works", "pricing", "final", "sticky", "other"]);
const PAGES = new Set(["landing", "onboarding", "preview"]);
const COUNT_EVENTS = new Set(["rubros_completed", "prices_completed", "business_created"]);
const BUSINESS_EVENTS = new Set(["business_created", "share_whatsapp_clicked"]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const KEY_VISITOR = "carnis_funnel_visitor_v1";
const KEY_SESSION = "carnis_funnel_session_v1";
const KEY_FIRST = "carnis_funnel_first_touch_v1";
const KEY_LAST = "carnis_funnel_last_touch_v1";
const KEY_INTERNAL = "carnis_funnel_internal_v1";
const KEY_SENT = "carnis_funnel_sent_v1";
const KEY_OUTBOX = "carnis_funnel_outbox_v1";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const OUTBOX_MAX = 50;
const OUTBOX_MAX_TRIES = 5;
const DIRECT_SOURCE = "(direct)";

const memory = new Map();
let storageOk = true;
let context = null;
let flushing = null;

// ---------- almacenamiento tolerante a fallos ----------

function readRaw(key) {
  try {
    return globalThis.localStorage.getItem(key);
  } catch (_) {
    storageOk = false;
    return memory.has(key) ? memory.get(key) : null;
  }
}

function writeRaw(key, value) {
  memory.set(key, value);
  try {
    if (value === null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, value);
  } catch (_) {
    storageOk = false;
  }
}

function readJson(key) {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeJson(key, value) {
  writeRaw(key, value === null ? null : JSON.stringify(value));
}

// ---------- utilidades ----------

function randomId() {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  } catch (_) {}
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isValidId(value) {
  return typeof value === "string" && /^[A-Za-z0-9]{16,40}$/.test(value);
}

function clean(value, max = 100) {
  return String(value ?? "").trim().toLowerCase().slice(0, max);
}

function currentPath() {
  return String(globalThis.location?.pathname || "/").slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

function directTouch(path = currentPath()) {
  return { source: DIRECT_SOURCE, medium: "", campaign: "", content: "", term: "", path, at: nowIso() };
}

function normalizeTouch(touch) {
  const t = touch && typeof touch === "object" ? touch : {};
  return {
    source: clean(t.source) || DIRECT_SOURCE,
    medium: clean(t.medium),
    campaign: clean(t.campaign),
    content: clean(t.content),
    term: clean(t.term),
    path: String(t.path || "/").slice(0, 120),
    at: String(t.at || "").slice(0, 30)
  };
}

function isDirect(touch) {
  return !touch || touch.source === DIRECT_SOURCE;
}

function sameCampaign(a, b) {
  if (!a || !b) return false;
  return ["source", "medium", "campaign", "content", "term"].every((key) => (a[key] || "") === (b[key] || ""));
}

function touchFromUrl(search) {
  const params = new URLSearchParams(search || "");
  const values = Object.fromEntries(UTM_KEYS.map((key) => [key, clean(params.get(key))]));
  if (!UTM_KEYS.some((key) => values[key])) return null;
  return {
    source: values.utm_source || "(not set)",
    medium: values.utm_medium,
    campaign: values.utm_campaign,
    content: values.utm_content,
    term: values.utm_term,
    path: currentPath(),
    at: nowIso()
  };
}

function resolveInternalFlag(search) {
  const flag = new URLSearchParams(search || "").get("interno");
  if (flag === "1") writeRaw(KEY_INTERNAL, "1");
  if (flag === "0") writeRaw(KEY_INTERNAL, "0");
  const stored = readRaw(KEY_INTERNAL);
  if (stored === "1") return true;
  if (stored === "0") return false;
  // Sin marca explícita, localhost/emuladores cuentan como internos.
  return Boolean(isLocalQa);
}

// ---------- contexto: visitante, sesión y touches ----------

export function initFunnelTracking({ page = "onboarding" } = {}) {
  try {
    const safePage = PAGES.has(page) ? page : "onboarding";
    const search = globalThis.location?.search || "";
    const urlTouch = touchFromUrl(search);
    const nowMs = Date.now();

    let visitorId = readRaw(KEY_VISITOR);
    if (!isValidId(visitorId)) {
      visitorId = randomId();
      writeRaw(KEY_VISITOR, visitorId);
    }

    let firstTouch = readJson(KEY_FIRST);
    if (!firstTouch) {
      firstTouch = urlTouch || directTouch();
      writeJson(KEY_FIRST, firstTouch);
    }

    let lastTouch = readJson(KEY_LAST);
    if (urlTouch) {
      lastTouch = urlTouch;
      writeJson(KEY_LAST, lastTouch);
    }
    if (!lastTouch) lastTouch = firstTouch;

    let session = readJson(KEY_SESSION);
    const expired = !session
      || !isValidId(session.id)
      || !Number.isFinite(Number(session.last_activity_at))
      || nowMs - Number(session.last_activity_at) > SESSION_TIMEOUT_MS;
    const newCampaign = Boolean(urlTouch && session && !sameCampaign(urlTouch, session.current_touch));

    if (expired || newCampaign) {
      session = { id: randomId(), last_activity_at: nowMs, current_touch: urlTouch || directTouch() };
    } else {
      session.last_activity_at = nowMs;
    }
    writeJson(KEY_SESSION, session);

    context = {
      page: safePage,
      visitorId,
      sessionId: session.id,
      firstTouch: normalizeTouch(firstTouch),
      currentTouch: normalizeTouch(session.current_touch),
      lastTouch: normalizeTouch(lastTouch),
      isInternal: resolveInternalFlag(search)
    };

    if (context.isInternal) console.info("[Carnis funnel] modo interno activo");
    void flushFunnelOutbox();
    return getFunnelContext();
  } catch (error) {
    console.warn("[Carnis funnel] no se pudo iniciar", error);
    return null;
  }
}

export function getFunnelContext() {
  return context ? JSON.parse(JSON.stringify({ ...context, storageOk })) : null;
}

function touchSession() {
  const session = readJson(KEY_SESSION);
  if (!session || session.id !== context?.sessionId) return;
  session.last_activity_at = Date.now();
  writeJson(KEY_SESSION, session);
}

// Forma de 4 UTM que ya usan registerClientAndBusiness (acquisition) y GA4.
export function getAttributableUtm() {
  const empty = { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "" };
  if (!context || isDirect(context.lastTouch)) return empty;
  return {
    utm_source: context.lastTouch.source,
    utm_medium: context.lastTouch.medium,
    utm_campaign: context.lastTouch.campaign,
    utm_content: context.lastTouch.content
  };
}

// Se graba dentro del mismo setDoc del alta del negocio: businesses/{id}.funnel
export function getFunnelLinkPayload() {
  if (!context) return null;
  return {
    visitor_id: context.visitorId,
    first_touch: context.firstTouch,
    last_touch: context.lastTouch,
    schema_version: FUNNEL_SCHEMA_VERSION
  };
}

// ---------- una vez por sesión ----------

function alreadySent(eventName) {
  const sent = readJson(KEY_SENT);
  return Boolean(sent && sent.session_id === context.sessionId && Array.isArray(sent.events) && sent.events.includes(eventName));
}

function markSent(eventName) {
  const sent = readJson(KEY_SENT);
  const events = sent && sent.session_id === context.sessionId && Array.isArray(sent.events) ? sent.events : [];
  writeJson(KEY_SENT, { session_id: context.sessionId, events: [...new Set([...events, eventName])] });
}

// ---------- cola persistente ----------

function readOutbox() {
  const raw = readRaw(KEY_OUTBOX);
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeOutbox(items) {
  writeRaw(KEY_OUTBOX, JSON.stringify(items.slice(-OUTBOX_MAX)));
}

function removeFromOutbox(eventId) {
  writeOutbox(readOutbox().filter((item) => item?.id !== eventId));
}

function bumpTries(eventId) {
  const items = readOutbox()
    .map((item) => (item?.id === eventId ? { ...item, tries: Number(item.tries || 0) + 1 } : item))
    .filter((item) => Number(item?.tries || 0) < OUTBOX_MAX_TRIES);
  writeOutbox(items);
}

async function sendItem(item) {
  if (!item || !isValidId(item.id) || !item.payload) return;
  try {
    await setDoc(doc(db, FUNNEL_COLLECTION, item.id), {
      ...item.payload,
      occurred_at: serverTimestamp()
    });
    removeFromOutbox(item.id);
  } catch (error) {
    // permission-denied: ya existía (reintento de un evento entregado) o el esquema no pasa.
    // En ambos casos reintentar no sirve.
    if (error?.code === "permission-denied" || error?.code === "invalid-argument") {
      removeFromOutbox(item.id);
    } else {
      bumpTries(item.id);
    }
  }
}

export function flushFunnelOutbox() {
  if (flushing) return flushing;
  const items = readOutbox();
  if (!items.length) return Promise.resolve();
  flushing = Promise.all(items.map(sendItem)).finally(() => {
    flushing = null;
  });
  return flushing;
}

// ---------- evento ----------

function buildPayload(eventId, eventName, extra) {
  const payload = {
    schema_version: FUNNEL_SCHEMA_VERSION,
    event_id: eventId,
    event_name: eventName,
    visitor_id: context.visitorId,
    session_id: context.sessionId,
    client_at: nowIso(),
    page: context.page,
    path: currentPath(),
    build: FUNNEL_BUILD,
    is_internal: Boolean(context.isInternal),
    storage_ok: Boolean(storageOk),
    first_touch: context.firstTouch,
    current_touch: context.currentTouch,
    last_touch: context.lastTouch
  };

  if (eventName === "cta_create_clicked") {
    const position = String(extra.cta_position || "other");
    payload.cta_position = CTA_POSITIONS.has(position) ? position : "other";
  }
  if (COUNT_EVENTS.has(eventName) && Number.isFinite(Number(extra.count))) {
    payload.count = Math.max(0, Math.min(500, Math.round(Number(extra.count))));
  }
  if (BUSINESS_EVENTS.has(eventName)) {
    const businessId = String(extra.business_id || "").trim().slice(0, 60);
    if (!businessId) return null; // la regla exige business_id en estos eventos
    payload.business_id = businessId;
  }
  return payload;
}

/**
 * Registra un paso del embudo (como máximo una vez por sesión).
 * @param {string} eventName uno de FUNNEL_EVENTS
 * @param {object} extra     cta_position | count | business_id según el evento
 * @param {object} options   waitMs: espera máxima antes de resolver (para pasos que navegan)
 * @returns {Promise<boolean>} true si se encoló
 */
export async function trackFunnelEvent(eventName, extra = {}, { waitMs = 0 } = {}) {
  try {
    if (!context) return false;
    if (!FUNNEL_EVENTS.includes(eventName)) return false;
    if (alreadySent(eventName)) return false;

    const eventId = randomId();
    const payload = buildPayload(eventId, eventName, extra || {});
    if (!payload) return false;

    markSent(eventName);
    touchSession();
    writeOutbox([...readOutbox(), { id: eventId, payload, tries: 0 }]);

    const sending = sendItem({ id: eventId, payload });
    if (waitMs > 0) {
      await Promise.race([sending, new Promise((resolve) => setTimeout(resolve, waitMs))]);
    }
    return true;
  } catch (error) {
    console.warn("[Carnis funnel] evento no registrado", eventName, error);
    return false;
  }
}

// ---------- landing (preparado, sin conectar hasta Landing 2) ----------

/**
 * Para Landing 2: registra landing_view y escucha clicks en [data-funnel-cta="<posición>"].
 * No se llama desde ningún archivo en V1.
 */
export function attachLandingFunnel(root = globalThis.document) {
  initFunnelTracking({ page: "landing" });
  void trackFunnelEvent("landing_view");
  root?.addEventListener?.("click", (event) => {
    const element = event.target?.closest?.("[data-funnel-cta]");
    if (!element) return;
    void trackFunnelEvent("cta_create_clicked", { cta_position: element.getAttribute("data-funnel-cta") }, { waitMs: 400 });
  });
}
