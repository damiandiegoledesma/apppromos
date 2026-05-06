# Future 5-C1 — Tracking demo mínimo GA4

## Estado

Feature branch:

```txt
feature/tracking-demo-ga4
```

Objetivo: medir el embudo mínimo de demo a WhatsApp y registro usando GA4, sin tocar la lógica comercial de AppPromos.

## Alcance C1

Este hito mide solo eventos simples y útiles:

```txt
demo_started
demo_whatsapp_clicked
demo_register_clicked
trial_registered
```

## Qué responde

```txt
¿Cuántos entran a la demo?
¿Cuántos llegan al momento WhatsApp?
¿Cuántos intentan registrarse desde la demo?
¿Cuántos completan el registro gratuito?
```

## Decisión de producto

`demo_whatsapp_clicked` queda como evento comercial principal del hito, porque confirma que la persona probó la demo y llegó al momento de venta.

Se descarta por ahora medir oferta lista, porque en AppPromos una oferta puede quedar lista, enviarse o no guardarse según el flujo. Para C1 conviene medir menos eventos, pero más claros.

## Protección local

En `localhost` y `127.0.0.1`, Analytics queda desactivado para no ensuciar GA4 real durante pruebas locales.

En producción, si GA4 está disponible, los eventos se envían con parámetros básicos como:

```txt
is_demo
app_mode
demo_session_id
page_path
page_hash
source
whatsapp_count
```

## No toca

```txt
Firestore
Admin
Cobranzas
reglas Firebase
Web Arranque
lógica comercial de ofertas
WhatsApp
deploy automático
```

## Validación

En GA4 revisar:

```txt
Realtime / Tiempo real
Eventos
```

Eventos esperados:

```txt
demo_started
demo_whatsapp_clicked
demo_register_clicked
trial_registered
```

## Cierre operativo

C1 queda como tracking mínimo real. La lectura operativa más profunda para Panel Admin, Cobranzas o salud del cliente queda para futures posteriores.
