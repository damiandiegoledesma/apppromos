# AppPromos V12.29 RC5.4 — Mobile UX Final

Base: RC5.3.

Cambio único funcional: `public/js/app-main.js`.

Cierre de N-1 validado previamente en Chromium por la auditoría RC5.3:
- En pantallas de hasta 760px de ancho y 620px de alto, se oculta la ilustración decorativa del motor comercial `strong`.
- En ese mismo rango, el título baja a 20px.
- No se modifica lógica, acciones, navegación, Firestore, billing, aliases, tracking, Carnis, carrito ni WhatsApp.

Objetivo: evitar que el CTA principal quede bajo la barra inferior en 360x560 y 320x568.
