# DATA MODEL FUTURE — Cobranzas / Tracking Admin

> Basado en el data model recibido, adaptado a AppPromos Firestore-first.
>
> Estado: documentación future. No implementar directo.

## Objetivo

Agregar información de pago y seguimiento sin romper la estructura actual.

## Principio

No duplicar verdad innecesaria.

Guardar como fuente:

```txt
plan
billing.status
billing.lastPaymentAt
billing.nextDueAt
billing.amountMonthly
mercadoPago.linkActivo
lastAdminAction
```

Calcular en pantalla:

```txt
diasParaVencer
diasVencido
estado visual
prioridad
salud
```

## Estructura sugerida Firestore

Adaptar nombres a la estructura real del repo.

### businesses/{businessId}

```js
{
  name: "Carnicería La Estancia",
  ownerName: "Juan García",
  email: "juan@carniceria.com",
  whatsapp: "3462543210",
  city: "Venado Tuerto",
  province: "Santa Fe",
  address: "3 de Febrero 136",

  plan: "salvador",

  billing: {
    status: "paid",              // paid | due_soon | pending | overdue | suspended | manual_free
    amountMonthly: 34999,
    lastPaymentAt: Timestamp,
    nextDueAt: Timestamp,
    paymentMethod: "mercado_pago",
    updatedAt: Timestamp,
    updatedBy: "admin_uid"
  },

  mercadoPago: {
    linkArranque: "https://mpago.la/...",
    linkSalvador: "https://mpago.la/...",
    linkDueno: "https://mpago.la/...",
    linkActivo: "https://mpago.la/..."
  },

  adminSummary: {
    internalNote: "Cliente muy activo",
    health: "review",            // good | review | risk | urgent
    lastContactAt: Timestamp,
    lastContactReason: "payment_reminder"
  },

  lastAdminAction: {
    at: Timestamp,
    type: "payment_confirmed",    // payment_confirmed | reminder_sent | access_paused | access_reactivated
    by: "admin_uid",
    detail: "Pago confirmado manualmente"
  }
}
```

## Historial opcional futuro

### businesses/{businessId}/payments/{paymentId}

```js
{
  at: Timestamp,
  amount: 34999,
  method: "mercado_pago",        // mercado_pago | transferencia | efectivo | bonificado
  status: "approved",            // approved | pending | rejected | manual
  reference: "MP-xxx",
  nextDueAt: Timestamp,
  confirmedByAdmin: true,
  confirmedBy: "admin_uid",
  confirmedAt: Timestamp,
  note: "Pago confirmado vía MP"
}
```

### businesses/{businessId}/adminActions/{actionId}

```js
{
  at: Timestamp,
  type: "payment_reminder_sent",
  by: "admin_uid",
  channel: "whatsapp",
  messagePreview: "Hola Juan...",
  result: "sent",
  note: "Aviso enviado antes del vencimiento"
}
```

### businesses/{businessId}/metrics/summary

```js
{
  lastLoginAt: Timestamp,
  loginCount: 12,
  offersCreatedCount: 8,
  urgentOffersCreatedCount: 3,
  whatsappSentCount: 15,
  savedOffersCount: 4,
  publicWebViews: 40,
  publicWebWhatsappClicks: 6,
  updatedAt: Timestamp
}
```

## Campos calculados, no persistidos

```js
function calcularDiasParaVencer(nextDueAt) {
  const ms = nextDueAt.toMillis() - Date.now();
  return Math.ceil(ms / 86400000);
}

function calcularDiasVencido(nextDueAt) {
  const ms = Date.now() - nextDueAt.toMillis();
  return ms > 0 ? Math.floor(ms / 86400000) : 0;
}
```

## Estados recomendados

```txt
paid         = Al día
due_soon     = Por vencer
pending      = Pendiente
overdue      = Vencido
suspended    = Suspendido
manual_free  = Bonificado / manual
```

## Índices Firestore futuros

Evaluar cuando se implemente:

```txt
businesses: billing.status ASC, billing.nextDueAt ASC
businesses: adminSummary.health ASC, billing.nextDueAt ASC
businesses: plan ASC, billing.status ASC
```

## Seguridad futura

- Solo admin puede escribir `billing`, `mercadoPago`, `lastAdminAction`.
- Cliente puede leer un resumen mínimo de su estado de acceso/pago si corresponde.
- No exponer notas internas al cliente.
- No exponer links internos de otros clientes.

## Regla clave

```txt
No guardar días vencidos como verdad fija.
Guardar fechas. Calcular días en pantalla.
```
