/* AppPromos / Carnis — Analytics Gate (QA-ISO-2)
 *
 * Único punto de carga de Google Analytics 4 (G-EBJM7TQRSN).
 * Regla fail-safe: GA de producción se carga SOLO en hostnames productivos
 * explícitamente autorizados. Cualquier otro hostname (QA, localhost, previews,
 * desconocido, vacío o error de detección) deja GA deshabilitado.
 *
 * window.gtag existe SIEMPRE:
 *   - producción: cola estándar en window.dataLayer (gtag.js la procesa);
 *   - resto: no-op seguro que no encola ni envía nada.
 * Todos los llamadores usan `typeof window.gtag === "function"` y no dependen
 * de callbacks ni de valores de retorno.
 *
 * Debe cargarse como script clásico SINCRÓNICO en <head>, antes de cualquier
 * código que llame a gtag.
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-EBJM7TQRSN";
  var PRODUCTION_HOSTNAMES = ["apppromos.web.app", "carnis.app"];

  var host = "";
  try {
    host = String((window.location && window.location.hostname) || "").trim().toLowerCase();
  } catch (_) {
    host = "";
  }

  var enabled = false;
  for (var i = 0; i < PRODUCTION_HOSTNAMES.length; i++) {
    if (host === PRODUCTION_HOSTNAMES[i]) { enabled = true; break; }
  }

  if (!enabled) {
    window.__APPPROMOS_ANALYTICS_DISABLED__ = true;
    window.gtag = function () { /* no-op: GA producción deshabilitado fuera de producción */ };
    window.__APPPROMOS_ANALYTICS__ = Object.freeze({ enabled: false, hostname: host });
    try { console.info("[AppPromos Analytics] GA4 deshabilitado en " + (host || "hostname vacío") + "."); } catch (_) {}
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.__APPPROMOS_ANALYTICS__ = Object.freeze({ enabled: true, hostname: host });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
})();
