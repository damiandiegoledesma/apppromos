# AppPromos — Versión actual

## V12.0.NNN.7.1 — Pulido visual seguro pre-dev

Parche correctivo posterior a V12.0.NNN.7.

Objetivo: mejorar presencia visual de Carniza, La Nelly, campos de descuento y resumen operativo **sin tocar lógica comercial**.

Toca solamente:

- `public/js/status-compact.js`

No toca:

- builder / armado de ofertas
- WhatsApp
- nombre comercial de oferta
- formato del mensaje final
- Firebase
- Auth
- BusinessStore
- reglas de precios

Criterio: aplicar pulido por CSS inyectado, preservando el estado estable anterior.
