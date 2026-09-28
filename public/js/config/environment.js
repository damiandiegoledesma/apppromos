// AppPromos / Carnis — Entorno de ejecución (QA-ISO-3)
//
// Fuente central para:
//   - qué hostnames son PRODUCCIÓN / LOCAL / QA;
//   - qué origen usan los enlaces públicos de vidriera (compartir, QR, WhatsApp).
//
// Regla fail-safe: solo los hostnames de PRODUCTION_HOSTNAMES son producción.
// Cualquier otro hostname (QA, preview, desconocido, vacío o error de lectura)
// se trata como QA y NUNCA genera enlaces internos de producción.
//
// IMPORTANTE: public/js/analytics-gate.js es un script clásico y conserva una
// copia de PRODUCTION_HOSTNAMES. Si esta lista cambia, actualizar ambas.

export const PRODUCTION_HOSTNAMES = Object.freeze([
  "apppromos.web.app",
  "carnis.app"
]);

export const LOCAL_HOSTNAMES = Object.freeze([
  "127.0.0.1",
  "localhost",
  "::1"
]);

// Origen canónico de vidrieras en producción (sin cambios respecto de RC3).
export const PRODUCTION_PUBLIC_ORIGIN = "https://carnis.app";
// Orígenes que producción ya aceptaba como "vidriera propia" (p. ej. QR impreso).
const PRODUCTION_STOREFRONT_ORIGINS = Object.freeze([
  "https://carnis.app",
  "https://apppromos.web.app"
]);

export const QA_PUBLIC_ORIGIN = "https://apppromos-qa.web.app";

function readHostname() {
  try {
    return String(globalThis.location?.hostname || "").trim().toLowerCase();
  } catch (_) {
    return "";
  }
}

function readLocalOrigin() {
  try {
    const origin = String(globalThis.location?.origin || "").trim();
    return /^https?:\/\//i.test(origin) ? origin.replace(/\/+$/, "") : "";
  } catch (_) {
    return "";
  }
}

const hostname = readHostname();
const isLocal = LOCAL_HOSTNAMES.includes(hostname);
const isProduction = !isLocal && PRODUCTION_HOSTNAMES.includes(hostname);
const isQa = !isLocal && !isProduction;

const publicStorefrontOrigin = isProduction
  ? PRODUCTION_PUBLIC_ORIGIN
  : (isLocal ? (readLocalOrigin() || QA_PUBLIC_ORIGIN) : QA_PUBLIC_ORIGIN);

const ownStorefrontOrigins = Object.freeze(
  isProduction ? [...PRODUCTION_STOREFRONT_ORIGINS] : [publicStorefrontOrigin]
);

export const APP_ENV = Object.freeze({
  mode: isProduction ? "production" : (isLocal ? "local" : "qa"),
  hostname,
  isProduction,
  isLocal,
  isQa,
  publicStorefrontOrigin,
  ownStorefrontOrigins
});

// true si la URL es una vidriera pública de ESTE entorno.
// En producción conserva exactamente la regla previa: https://(carnis.app|apppromos.web.app)/...
export function isOwnPublicStorefrontUrl(value = "") {
  const url = String(value || "").trim().toLowerCase();
  if (!url) return false;
  return ownStorefrontOrigins.some((origin) => url.startsWith(`${origin.toLowerCase()}/`));
}
