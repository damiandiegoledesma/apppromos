// Carniza Signals — tracking comercial liviano (semilla HITO)
// No depende de backend. No toca Firebase. Guarda señales mínimas en localStorage y consola.

const STORAGE_KEY = "apppromos:carniza-signals";
const MAX_SIGNALS = 150;

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function trackCarnizaSignal(eventName, data = {}) {
  try {
    const name = String(eventName || "").trim();
    if (!name) return null;

    const payload = {
      event: name,
      data: data && typeof data === "object" ? data : {},
      ts: Date.now(),
      iso: new Date().toISOString()
    };

    const next = [...safeRead(), payload].slice(-MAX_SIGNALS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    console.log("🐮 Carniza Signal", payload);
    return payload;
  } catch (_) {
    console.log("🐮 Carniza Signal fallback", eventName);
    return null;
  }
}

export function getCarnizaSignals() {
  return safeRead();
}

export function clearCarnizaSignals() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
