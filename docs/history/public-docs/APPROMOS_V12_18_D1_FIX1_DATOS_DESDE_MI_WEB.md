# AppPromos V12.18-D1-FIX1 — Datos desde Mi carnicería online

## Problema corregido
D1 había dejado el editor de identidad disponible mediante una ruta “Mi cuenta” que no forma parte de la navegación superior real de V12.18.

## Decisión UX
La edición de identidad vive dentro de:

`Más → Mi carnicería online → Datos de mi carnicería`

Esto agrupa los datos que construyen la presencia pública del negocio: nombre, responsable, WhatsApp, dirección, localidad, logo y foto del frente.

## Implementación
- `web-module.js` expone el CTA `Datos de mi carnicería`.
- `app-main.js` conecta ese CTA con el editor D1 existente mediante callback.
- No se duplica persistencia ni se crea una nueva fuente de verdad.

## Fuera de alcance
No se modifica web pública, Storage, Firestore, carrito, ofertas, precios, WhatsApp, slug ni registro.
