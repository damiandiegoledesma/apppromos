// APPPROMOS TRACKING DEMO GA4 C1
// Tracking comercial mínimo para demo → WhatsApp → registro.
// No toca Firestore. No guarda datos personales. Usa GA4 si está disponible.
// En localhost / 127.0.0.1 no envía a GA4 real: solo informa por consola.

const DEMO_SESSION_KEY = "apppromos_demo_session_id";
const DEMO_STARTED_SESSION_KEY = "apppromos_demo_started_sent";

function isAnalyticsDisabled() {
  try {
    const host = window.location.hostname || "";
    return Boolean(window.__APPPROMOS_ANALYTICS_DISABLED__) || host === "localhost" || host === "127.0.0.1";
  } catch (_) {
    return false;
  }
}

function safeNow() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return "";
  }
}

function createId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (_) {}
  return `demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getDemoSessionId() {
  try {
    const existing = localStorage.getItem(DEMO_SESSION_KEY);
    if (existing) return existing;
    const next = createId();
    localStorage.setItem(DEMO_SESSION_KEY, next);
    return next;
  } catch (_) {
    return createId();
  }
}

function cleanParams(params = {}) {
  const output = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      output[key] = value.length;
      return;
    }
    output[key] = String(value);
  });
  return output;
}

export function trackAppPromosEvent(eventName, params = {}) {
  const name = String(eventName || "").trim();
  if (!name) return;

  const payload = cleanParams({
    ...params,
    app_name: "AppPromos",
    event_origin: "apppromos_web",
    page_path: `${window.location.pathname || ""}${window.location.search || ""}`,
    page_hash: window.location.hash || "",
    sent_at: safeNow()
  });

  try {
    if (isAnalyticsDisabled()) {
      console.info("[AppPromos Analytics:local]", name, payload);
      return;
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    } else {
      console.info("[AppPromos Analytics]", name, payload);
    }
  } catch (error) {
    console.warn("[AppPromos Analytics] No se pudo registrar evento", name, error);
  }
}

export function trackDemoEvent(eventName, params = {}) {
  trackAppPromosEvent(eventName, {
    ...params,
    is_demo: true,
    app_mode: "demo",
    demo_session_id: getDemoSessionId()
  });
}

export function trackDemoStartedOnce(params = {}) {
  try {
    if (sessionStorage.getItem(DEMO_STARTED_SESSION_KEY) === "1") return;
    sessionStorage.setItem(DEMO_STARTED_SESSION_KEY, "1");
  } catch (_) {}

  trackDemoEvent("demo_started", params);
}

export function trackTrialRegistered(params = {}) {
  trackAppPromosEvent("trial_registered", {
    ...params,
    plan: params?.plan || "trial",
    is_demo: false
  });
}


// V12.18-A — embudo de activación para primeras carnicerías reales.
export function trackRegistrationStarted(params = {}) {
  trackAppPromosEvent("registration_started", { ...params, is_demo: false });
}

export function trackFirstPriceSaved(params = {}) {
  trackAppPromosEvent("first_price_saved", { ...params, is_demo: false });
}

export function trackWebOpened(params = {}) {
  trackAppPromosEvent("web_opened", { ...params, is_demo: false });
}

export function trackWebShared(params = {}) {
  trackAppPromosEvent("web_shared", { ...params, is_demo: false });
}
