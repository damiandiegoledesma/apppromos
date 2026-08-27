# AppPromos V12.20 — Vender urgente de punta a punta

## Objetivo

Permitir que un carnicero transforme mercadería que necesita sacar hoy en una oferta clara, publicable y vendible en pocos pasos, sin obligarlo a planificar un combo permanente.

## Decisión funcional

**Vender urgente** es distinto de **Crear promo o combo**:

- urgente resuelve una necesidad del día;
- no se guarda en `savedCombos`;
- puede publicarse temporalmente en la web;
- vence al terminar el día o se finaliza manualmente;
- queda como antecedente interno aunque deje de ser pública.

V12.20-B, que proponía complementos para formar combos urgentes, se descartó. El carnicero elige exactamente la mercadería que quiere sacar y AppPromos no agrega productos por su cuenta.

## V12.20-A — Cálculo controlado

- Búsqueda de productos como camino principal.
- Lista completa opcional, sin mostrar todas las tarjetas al abrir.
- Selección múltiple con nombre y rubro visibles.
- Cantidades ajustables de 0,5 en 0,5.
- Acción para quitar productos seleccionados.
- Resumen económico en vivo: lista, ahorro, cálculo y total comercial.
- Regreso desde el resultado para corregir productos o cantidades.
- Cálculo frontend local y determinista sobre precios reales.
- Backend Python alineado para respetar cantidades y no agregar productos gancho.

## V12.20-C — Promo del día

### C1 — Publicación

- Acción **Publicar por hoy en mi carnicería**.
- Varias publicaciones diarias permitidas.
- Estado privado en `state.dailyPromos`.
- Snapshot público sanitizado en `dailyOffers`.
- Escritura coordinada mediante batch de Firestore.
- Demo exclusivamente local.
- Escrituras reales protegidas por `WriteGuardService`.

### C2 — Web y carrito

- Bloque destacado **Promos del día** en la vidriera pública.
- Sello **Solo por hoy** y texto **Hasta agotar stock**.
- Detalle de productos y cantidades sin exponer descuento ni cálculos internos.
- Integración con carrito y pedido final por WhatsApp.
- Filtro temporal en cliente para no renderizar ofertas vencidas.

### C3 — Finalización anticipada

- Sección **Publicadas hoy** dentro de Vender urgente.
- Muestra nombre, precio y hora de publicación.
- Acción **Finalizar** con confirmación.
- Cambia el estado a `ended` y registra `endedAt` y `endedReason: manual`.
- Retira inmediatamente la oferta del snapshot público.
- Mantiene la publicación como antecedente interno.

## Modelo privado

Cada elemento de `state.dailyPromos` contiene, entre otros:

- `id`, `schemaVersion` y `origin`;
- nombre, productos, cantidades y precios internos;
- total de lista, descuento, total calculado y total comercial;
- `status`, `dayKey`, `publishedAt`, `expiresAt` y `endedAt`.

## Contrato público

`dailyOffers` publica solamente:

- identificación y nombre comercial;
- total final;
- estado y vigencia;
- nombres, rubros, cantidades y unidades de los productos.

No expone precios unitarios, porcentaje de descuento, total de lista ni ahorro.

## Compatibilidad y seguridad

- No modifica `savedCombos` ni el flujo de promos permanentes.
- No modifica Firebase Auth, `resolveSession`, billing ni reglas de Firestore.
- Mantiene BusinessStore y cache después de cada escritura.
- Las cuentas bloqueadas pueden consultar, pero no publicar ni finalizar.
- La web pública sigue leyendo desde `publicWebSlugs/{slug}`.

## Archivos funcionales modificados

- `backend_python/main.py`
- `public/js/app-main.js`
- `public/js/services/ai-service.js`
- `public/js/services/daily-promos-service.js` (nuevo)
- `public/js/services/web-premium-service.js`
- `public/web.html`

## QA final

- V12.20-A: OK.
- V12.20-C1: OK.
- V12.20-C2: OK.
- V12.20-C3: OK.
- QA integral de consultas, promos permanentes, urgente, web, carrito y WhatsApp: OK.
- Consola sin errores rojos.
