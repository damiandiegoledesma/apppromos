# AppPromos — Versión actual

## V12.7.2-A — Demo fuerte + combos precargados

Primer patch del hito **V12.7.2 Demo Fuerte + Conversión**.

Objetivo: mejorar la demo para que muestre valor rápido sin tocar todavía registro, web automática, tracking ni lógica profunda.

Incluye:

- Demo sin productos ambiguos por unidad/pieza:
  - se excluye `Pollo entero`;
  - se excluyen hamburguesas.
- 8 combos precargados de ejemplo:
  1. Promo Parrillera de Hoy
  2. Combo Familiar
  3. Combo Económico
  4. Promo para el Finde
  5. Combo Mila Express
  6. Combo Parrilla Completa
  7. Combo Achuras
  8. Combo Salvaventas
- Módulo Guardados renombrado visualmente como `Combos`.
- Vista de combos/ofertas ajustada para mostrar descripciones comerciales.

No toca:

- Firebase/Auth profundo
- BusinessStore
- Registro
- Web automática
- Tracking
- Backend Python IA
- Bot WhatsApp

Criterio: avanzar por partes. Este patch solo fortalece demo + combos.
