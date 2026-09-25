# V12.18 QA-PROD01-FIX1 — Snapshot público autónomo

## Causa
La URL pública intentaba leer `core/meta` y `core/state` como visitante anónimo.
Firestore devolvía `Missing or insufficient permissions`; la página caía al snapshot
`publicWebSlugs`, que no incluía logo/foto.

## Corrección
- `publicWebSlugs` incluye `logoUrl` y `frontPhotoUrl`.
- `syncPublicWebSnapshot()` reconstruye el snapshot público desde datos privados
  sólo con sesión autorizada.
- Se sincroniza al abrir workspace, cambiar precios/datos y subir/quitar identidad.
- `web.html` usa sólo el snapshot público para las URLs públicas.
- No cambia `firestore.rules` ni `storage.rules`.

## QA producción
1. Login y abrir la empresa una vez.
2. Abrir URL pública en incógnito.
3. Logo y frente visibles.
4. Precios/ofertas actuales.
5. Consola sin `Missing or insufficient permissions`.
