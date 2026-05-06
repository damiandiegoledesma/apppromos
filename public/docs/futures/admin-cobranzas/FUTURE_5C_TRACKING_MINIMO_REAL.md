# Future 5-C — Tracking mínimo real

## Estado

Documento de planificación dentro de la rama:

`future/admin-tracking-cobranzas`

No productivo.  
No main.  
No dev todavía.  
No deploy.

Este documento continúa:

- `FUTURE_5_ADMIN_SAAS_MAPA.md`
- `FUTURE_5B_REORDEN_VISUAL_ADMIN.md`

## Objetivo

Definir el tracking mínimo real de AppPromos para que el Panel Admin pueda responder:

> ¿El carnicero está usando AppPromos o se está enfriando?

El tracking no debe ser un tablero técnico ni una analítica pesada.

Debe servir para:

- detectar activación;
- detectar abandono;
- saber si la demo convence;
- saber si una carnicería llegó al momento de valor;
- acompañar mejor con Carniza;
- cobrar y cuidar mejor con La Nelly;
- dar contexto al Panel Admin.

## Regla central

Medir lo suficiente para decidir.  
No medir por medir.

## Qué NO queremos

- heartbeat cada 10 segundos;
- guardar cada click;
- escribir demasiado en Firestore;
- romper el flujo si falla el tracking;
- depender de tracking para vender;
- convertir AppPromos en un panel de analítica pesado;
- mostrar métricas técnicas al carnicero.

## Qué sí queremos

Señales simples, comerciales y accionables:

- entró;
- cambió precios;
- creó una oferta;
- usó vender urgente;
- mandó WhatsApp;
- guardó una promo;
- abrió su web;
- abandonó antes de vender;
- lleva días sin actividad.

---

# 1. Eventos mínimos

## 1. `business_login`

Cuando una carnicería inicia sesión o se resuelve correctamente la sesión.

### Sirve para

- saber si entra;
- saber frecuencia de uso;
- alimentar último ingreso;
- detectar abandono.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "business_login",
  createdAt,
  source: "app",
  isDemo: false
}
```

### Resumen acumulado

```js
{
  loginCount,
  lastLoginAt
}
```

---

## 2. `business_activity`

Actividad general resumida y con throttle.

### Sirve para

- saber si estuvo activo sin registrar cada click;
- alimentar `lastActivityAt`.

### Regla

No escribir cada 10 segundos.

Usar throttle mínimo:

```txt
1 escritura cada 60 segundos como máximo
```

o incluso:

```txt
1 escritura cada 3 a 5 minutos para sesiones reales
```

### Resumen acumulado

```js
{
  lastActivityAt
}
```

---

## 3. `price_updated`

Cuando actualiza precios.

### Sirve para

- saber si completó parte clave del onboarding;
- saber si preparó su web;
- detectar si entró pero no cargó precios.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "price_updated",
  createdAt,
  source: "prices",
  changedCount
}
```

### Resumen acumulado

```js
{
  priceUpdateCount,
  lastPriceUpdateAt,
  lastPriceUpdateChangedCount
}
```

---

## 4. `offer_created`

Cuando genera una oferta, especialmente si llega a una oferta lista.

### Sirve para

- detectar momento de valor;
- saber si entendió la app;
- medir activación real.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "offer_created",
  createdAt,
  source: "offer",
  mode: "quick" | "discount" | "saved_combo" | "unknown",
  productCount,
  totalAmount
}
```

### Resumen acumulado

```js
{
  offersCreatedCount,
  lastOfferCreatedAt
}
```

---

## 5. `urgent_offer_created`

Cuando usa Vender urgente y llega a oferta lista.

### Sirve para

- medir uso del diferencial anti-merma;
- detectar si entendió el valor más fuerte de AppPromos;
- priorizar seguimiento comercial.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "urgent_offer_created",
  createdAt,
  source: "urgent",
  productCount,
  totalAmount
}
```

### Resumen acumulado

```js
{
  urgentOffersCreatedCount,
  lastUrgentOfferCreatedAt
}
```

---

## 6. `whatsapp_sent`

Cuando toca Enviar por WhatsApp desde oferta, combo o vender urgente.

### Sirve para

- detectar venta real o intención fuerte de venta;
- saber si llegó al momento más importante;
- medir valor real de AppPromos.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "whatsapp_sent",
  createdAt,
  source: "quick_offer" | "discount_offer" | "urgent" | "saved_promo" | "web" | "unknown",
  productCount,
  totalAmount
}
```

### Resumen acumulado

```js
{
  whatsappSentCount,
  lastWhatsappSentAt
}
```

---

## 7. `promo_saved`

Cuando guarda una promo.

### Sirve para

- detectar uso más avanzado;
- saber si está armando sistema repetible de ofertas;
- alimentar hitos.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "promo_saved",
  createdAt,
  source: "offer" | "discount" | "combo" | "unknown",
  productCount,
  totalAmount
}
```

### Resumen acumulado

```js
{
  savedPromosCount,
  lastPromoSavedAt
}
```

---

## 8. `web_opened`

Cuando abre su web propia desde la app o desde Admin.

### Sirve para

- medir interés en Web Arranque;
- saber si vio la vidriera;
- conectar con onboarding.

### Campos sugeridos

```js
{
  businessId,
  userId,
  eventType: "web_opened",
  createdAt,
  source: "app" | "admin" | "public" | "unknown",
  slug
}
```

### Resumen acumulado

```js
{
  webOpenedCount,
  lastWebOpenedAt
}
```

---

# 2. Demo y conversión

El tracking de demo debe ser mínimo y separado del cliente real.

## Eventos demo sugeridos

- `demo_started`
- `demo_offer_created`
- `demo_urgent_offer_created`
- `demo_whatsapp_clicked`
- `demo_web_preview_clicked`
- `demo_register_clicked`
- `trial_registered`

## Objetivo del embudo demo

```txt
demo_started
↓
demo_offer_created
↓
demo_whatsapp_clicked
↓
demo_register_clicked
↓
trial_registered
```

En paralelo:

```txt
demo_web_preview_clicked
```

## Regla

No mezclar datos demo con métricas reales de una carnicería registrada.

La demo sirve para conversión.

La carnicería real sirve para retención, salud y cobranzas.

---

# 3. Dónde guardar

## Resumen por carnicería

Ruta sugerida:

```txt
businesses/{businessId}/metrics/summary
```

Documento:

```js
{
  businessId,
  loginCount,
  lastLoginAt,
  lastActivityAt,

  priceUpdateCount,
  lastPriceUpdateAt,

  offersCreatedCount,
  lastOfferCreatedAt,

  urgentOffersCreatedCount,
  lastUrgentOfferCreatedAt,

  whatsappSentCount,
  lastWhatsappSentAt,

  savedPromosCount,
  lastPromoSavedAt,

  webOpenedCount,
  lastWebOpenedAt,

  updatedAt
}
```

## Eventos recientes

Ruta posible:

```txt
businesses/{businessId}/events/{eventId}
```

Uso:

- últimos eventos;
- debugging;
- hitos;
- historial comercial.

## Regla de costo

No guardar eventos eternamente sin criterio.

Opciones futuras:

- guardar solo últimos 100 eventos;
- guardar eventos de hito;
- compactar eventos viejos;
- mantener solo summary para control diario.

---

# 4. Dónde mostrar en Admin

## En card de cliente

Mostrar solo resumen humano:

```txt
Última actividad: ayer
WhatsApps: 12
Ofertas: 8
Salud: Bien
```

## En detalle → Tracking

Mostrar:

```txt
Último ingreso
Última actividad
Ofertas creadas
Vender urgente usado
WhatsApps enviados
Promos guardadas
Precios actualizados
Web abierta
Hitos
```

## En Control operativo

Usar para listas:

```txt
Sin actividad hace 7 días
Creó oferta pero no mandó WhatsApp
Prueba activa sin ofertas
Pago vencido y sin actividad
Cliente activo usando Vender urgente
```

---

# 5. Salud del cliente

## Lectura humana inicial

- Bien
- Revisar
- Riesgo de abandono
- Urgente

## Lógica sugerida

### Bien

```txt
Entró recientemente y usó alguna función comercial.
```

Ejemplos:

- entró en últimos 3 días;
- creó oferta;
- mandó WhatsApp;
- actualizó precios.

### Revisar

```txt
Hace varios días que no entra o no creó ofertas.
```

Ejemplos:

- sin actividad 4 a 7 días;
- entró pero no creó ofertas;
- actualizó precios pero no vendió.

### Riesgo de abandono

```txt
Está activo o en prueba, pero no creó ofertas ni mandó WhatsApp en 7 días.
```

Ejemplos:

- trial sin momento de valor;
- usuario activo sin WhatsApp;
- muchas visitas pero ninguna acción comercial.

### Urgente

```txt
Pago vencido, prueba por vencer en 48 hs, acceso bloqueado o cliente suspendido.
```

Ejemplos:

- pago vencido;
- trial vence mañana y no activó;
- suspendido;
- acceso pausado.

---

# 6. Hitos de uso

Los hitos no son métricas frías. Sirven para historia comercial.

## Hitos sugeridos

- primera vez que entró;
- primera actualización de precios;
- primera oferta creada;
- primer WhatsApp enviado;
- primera promo guardada;
- primera vez que usó Vender urgente;
- primera vez que abrió su web;
- 10 WhatsApps enviados;
- 50 WhatsApps enviados;
- 100 WhatsApps enviados;
- primer pago registrado;
- primer cambio de plan;
- reactivación después de pausa.

## Uso comercial

Ejemplo de mensaje:

```txt
Vi que ya mandaste tus primeras promos por WhatsApp.
Buenísimo. Si querés, te ayudo a dejar armado el plan Salvador para vender antes de picar y cuidar margen.
```

---

# 7. Reglas técnicas

## Tracking no debe bloquear

Si falla el tracking:

- no romper la app;
- no impedir vender;
- no impedir WhatsApp;
- no mostrar error técnico al usuario.

## Tracking debe ser silencioso

El carnicero no necesita ver:

- evento guardado;
- métrica enviada;
- error de tracking;
- nombre de colección;
- Firestore.

## Tracking debe ser barato

Evitar:

- escrituras por cada click;
- loops;
- heartbeat agresivo;
- logs infinitos;
- eventos duplicados.

## Tracking debe ser entendible

El Admin no debe mostrar:

```txt
eventType: urgent_offer_created
timestamp: 2026...
```

Debe mostrar:

```txt
Usó Vender urgente hace 2 días.
```

---

# 8. Posibles funciones futuras

## Servicio futuro

Archivo posible:

```txt
public/js/services/admin-tracking-service.js
```

o dentro de:

```txt
public/js/services/admin-service.js
```

Funciones sugeridas:

```js
trackBusinessEvent(businessId, eventType, payload)
updateBusinessMetricsSummary(businessId, eventType, payload)
trackOfferCreated(...)
trackUrgentOfferCreated(...)
trackWhatsappSent(...)
trackPriceUpdated(...)
trackWebOpened(...)
```

## Regla

No crear muchos servicios si no hace falta.

Primero simple.

Después separar si crece.

---

# 9. Qué NO se implementa en 5-C todavía

- IA real;
- scoring complejo;
- dashboards pesados;
- gráficos;
- segmentación avanzada;
- campañas automáticas;
- WhatsApp masivo;
- Mercado Pago API;
- webhooks;
- backend;
- Cloud Functions;
- machine learning;
- recomendaciones automáticas.

---

# 10. Criterios de aceptación del futuro desarrollo

Cuando se implemente 5-C, debería validarse:

- login actualiza `lastLoginAt`;
- actividad actualiza `lastActivityAt` con throttle;
- crear oferta suma contador;
- Vender urgente suma contador;
- WhatsApp suma contador;
- actualizar precios suma contador;
- guardar promo suma contador;
- abrir web suma contador;
- Admin muestra resumen sin romper;
- si Firestore falla, la app sigue vendiendo;
- consola sin errores rojos nuevos;
- no se dispara escritura excesiva;
- demo no contamina métricas reales.

---

# Regla final

Tracking en AppPromos no es vigilancia.

Es memoria comercial para cuidar clientes, convertir pruebas y ayudar a vender más rápido.
