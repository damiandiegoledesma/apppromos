const SW_VERSION = "apppromos-v12.23.3-fix-i";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // V12.22-A1: PWA instalable sin caché offline. La app siempre consulta
  // la versión vigente y Firebase mantiene su flujo normal de sesión/datos.
  event.respondWith(fetch(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "SW_VERSION", version: SW_VERSION });
  }
});
