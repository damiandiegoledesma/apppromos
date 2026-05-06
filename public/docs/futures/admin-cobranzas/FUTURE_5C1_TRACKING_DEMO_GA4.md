# Future 5-C1 â€” Tracking demo mÃ­nimo GA4

## Estado

Patch de feature branch:

`feature/tracking-demo-ga4`

Objetivo: medir el embudo mÃ­nimo demo â†’ WhatsApp â†’ registro usando GA4.

No toca:

- Firestore;
- Admin;
- Cobranzas;
- reglas Firebase;
- lÃ³gica comercial de ofertas;
- Web Arranque;
- deploy automÃ¡tico.

## Problema

Firebase Authentication solo muestra usuarios que completaron registro.

Los visitantes que entran a:

```txt
app.html?demo=1
```

no aparecen en Authentication porque no crean usuario.

Para entender si la demo convierte, hace falta medir eventos anÃ³nimos de uso.

## Eventos agregados

```txt
demo_started
demo_offer_ready
demo_whatsapp_clicked
demo_register_clicked
trial_registered
```

## QuÃ© responde

```txt
Â¿CuÃ¡ntos entran a la demo?
Â¿CuÃ¡ntos arman una oferta?
Â¿CuÃ¡ntos tocan WhatsApp?
Â¿CuÃ¡ntos intentan registrarse desde la demo?
Â¿CuÃ¡ntos completan registro?
```

## ParÃ¡metros principales

```txt
source
offer_mode
product_count
total_amount
whatsapp_count
is_demo
app_mode
demo_session_id
page_path
page_hash
```

## Decisiones

- GA4 primero.
- Firestore despuÃ©s, si hace falta verlo dentro del Panel Admin.
- No se trackean datos personales.
- No se trackea contenido del mensaje de WhatsApp.
- No se trackea cada click.
- No se hace heartbeat.

## ValidaciÃ³n

En GA4 revisar:

```txt
Realtime / Tiempo real
Eventos
```

Eventos esperados durante prueba:

```txt
demo_started
demo_offer_ready
demo_whatsapp_clicked
demo_register_clicked
trial_registered
```

## Regla

Analytics muestra interÃ©s y embudo.

Firebase Auth muestra registros reales.

El Panel Admin futuro mostrarÃ¡ lectura operativa.

---

## Cierre operativo C1

Este hito queda acotado a medir el embudo mínimo útil:

```txt
demo_started
demo_whatsapp_clicked
demo_register_clicked
trial_registeredrn