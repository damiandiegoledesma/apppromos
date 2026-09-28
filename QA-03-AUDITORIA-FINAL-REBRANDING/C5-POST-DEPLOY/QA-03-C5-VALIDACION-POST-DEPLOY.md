# QA-03 — Validación visual C5 post-deploy

**Fecha:** 28/09/2026 · **Entorno:** https://apppromos-qa.web.app · sesión "Carniceria QA" · 390×844
**Sin cambios:** no se modificó ningún archivo, ni hubo commit ni deploy.

## Veredicto: **NO-GO**, por 3 mensajes de WhatsApp

C5 quedó bien aplicado: los 19 archivos desplegados son **idénticos byte a byte** a los de C5 y todo lo que cambió se ve correctamente. Pero el recorrido encontró **3 textos con "Hola AppPromos"** que el inventario de C5 no detectó. Uno de ellos es visible hoy en el botón **"Consultar planes"** del modal de prueba.

## Método

- **Pantallas públicas** (landing, crear carnicería, login, cómo vender, términos, privacidad, vidriera, carrito): Chromium a 390×844. Búsqueda de "AppPromos" en todo el texto visible, `alt`, `aria-label`, `title` y `placeholder`.
- **App interna:** búsqueda en vivo en cada pantalla (texto visible + atributos + `href` de WhatsApp). Capturas de las superficies C5; el navegador de la app pintó en blanco algunas veces.
- **Material generado:** comanda y lista de precios generadas en vivo (locales, sin guardar datos). QR, cartel, folleto y PNG no se pudieron generar en QA; se verificaron en el código desplegado.
- **Caché:** el navegador de la app mostraba JS viejos. Hosting sirve los JS con `Cache-Control: max-age=3600` y `app.html` llegaba nuevo mientras los módulos seguían cacheados. Forcé la recarga de los recursos y repetí el recorrido completo.

## Prioridad 1 — Fugas de AppPromos

| Superficie | Resultado |
|---|---|
| Landing, crear carnicería, login, Cómo vender, términos, privacidad, vidriera pública, carrito | ✅ 0 apariciones |
| Inicio, Precios, menú Vender, Responder consulta, Crear promo, Promo del día, menú Carniza, Promos, Más, Mi cuenta, Mi carnicería online, Centro de Impresiones (hub, comanda, lista, QR) | ✅ 0 apariciones |
| **Estado de cuenta / trial** | ❌ Texto OK, pero el botón **"Consultar planes"** abre WhatsApp con **"Hola AppPromos, quiero consultar los planes para mi carnicería."** |

**Causa de la omisión en el inventario C5:** en `access-control-service.js` las líneas 183, 221 y 244 contienen a la vez el nombre de función `buildAppPromosWhatsAppUrl` (técnico) y el mensaje. El clasificador automático marcó la línea completa como D. Una búsqueda más estricta sobre las 258 restantes encontró solo estos 3 casos; el resto son mensajes de consola o de analytics.

| Archivo:línea | Texto | Cuándo aparece |
|---|---|---|
| `js/services/access-control-service.js:244` | "Hola AppPromos, quiero consultar los planes para mi carnicería." | Prueba activa → "Consultar planes" (**confirmado en vivo**) |
| `js/services/access-control-service.js:183` | "Hola AppPromos, quiero reactivar mi cuenta de AppPromos." | Cuenta pausada/suspendida |
| `js/services/access-control-service.js:221` | "Hola AppPromos, quiero regularizar mi pago y mantener activa mi cuenta." | Pago en gracia |

Propuesta, con el mismo criterio que C5 (el nombre de la función no se toca):
- 244 → "Hola, quiero consultar los planes de Carnis para mi carnicería."
- 183 → "Hola, quiero reactivar mi cuenta de Carnis."
- 221 → "Hola, quiero regularizar mi pago y mantener activa mi cuenta de Carnis."

## Prioridad 2 — Cambios C5

| Cambio | Estado | Evidencia |
|---|---|---|
| "Estás probando Carnis…" | ✅ | Modal de estado en vivo (`18-estado-de-cuenta-C5.png`) |
| Detección de demo | ✅ (verificada en código) | `normalizeText("Estás probando Carnis…")` contiene "estas probando carnis" para los 6 textos. No se probó con una sesión demo real |
| "Carnis no agrega otros productos…" | ✅ | `09-promo-del-dia-C5.png` |
| "Carnis actualiza la vidriera…" | ✅ | DOM en vivo |
| Firma "una solución de AppPromos" eliminada | ✅ | Pie de la app en vivo, landing, Cómo vender, términos, privacidad |
| Cómo vender 100 % Carnis (textos + `alt`) | ✅ | `16-como-vender-*.png` + búsqueda de atributos |
| Promos vacío sin seeder | ✅ | `10-promos-vacio-C5.png` |
| `aria-label` "Mi cuenta Carnis" | ✅ | DOM en vivo |
| Mensajes de soporte con Carnis | ⚠️ Parcial | Los de C5 sí. Faltan los 3 de arriba |
| Centro de Control superadmin | ✅ (verificado en código) | La cuenta QA no es superadmin. El código desplegado dice "Centro de Control Carnis" y "soy Damian de Carnis" |

## Prioridad 3 — Material generado

| Pieza | Resultado | Validación |
|---|---|---|
| Ticket / comanda | ✅ "PEDIDO CARNIS" + "Generado con Carnis" | **Generada en vivo** (pedido de ejemplo) · `23-comanda-generada-render.png` |
| Error del lector de pedidos | ✅ "No reconocimos un pedido de Carnis…" | En vivo |
| Lista de precios | ✅ Modelos "1 · Clásico / 2 · Carnis / 3 · Comercial", pie "Precios sujetos a modificación · Generado con Carnis" | **Generada en vivo** |
| QR | ⚠️ En QA no se genera: "No encontramos la dirección pública de tu carnicería." (validación de URL de producción, D, no la cambió C5) | Código desplegado: `fillText("Generado con Carnis")`, `Carnis-QR-${safe}.png` |
| Cartel | ⚠️ Sin ofertas publicadas en QA | Código: "Modelo 2 · Carnis", `fillText("Generado con Carnis")`, `Carnis-${safe}.png` |
| Folleto | ⚠️ Sin ofertas publicadas en QA | Código: `brand.textContent="Generado con Carnis"` |
| PNG compartible | ⚠️ No generable en QA (depende de QR y cartel) | Código: nombres `Carnis-*.png` |

## Prioridad 4 — Regresiones

- **Ninguna regresión funcional atribuible a C5.** Navegación, menús, paneles, Promo del día, comanda, lista, estados vacíos y modales funcionan. La consola no muestra errores de los archivos modificados.
- Dos errores 400 de recursos de red en la consola: no se pudieron atribuir y no provienen de archivos de C5.
- El único error de JS es el QR ("No encontramos la dirección pública…"), que es la validación de URL de producción esperada en QA.

## Clasificación final

### 1. Bloqueantes del rebranding
1. `access-control-service.js:244` — "Hola AppPromos, quiero consultar los planes…" (visible hoy en "Consultar planes").
2. `access-control-service.js:183` — "Hola AppPromos, quiero reactivar mi cuenta de AppPromos."
3. `access-control-service.js:221` — "Hola AppPromos, quiero regularizar mi pago…"

### 2. Ajustes menores no bloqueantes
- **Caché de deploy:** los JS se sirven con `max-age=3600`. Después de un deploy, un usuario puede ver hasta una hora la mezcla de `app.html` nuevo con módulos viejos. Para el pase a producción conviene revisar los headers de caché o versionar los imports.
- Promos: el subtítulo dice "Elegí una promo guardada o combo **demo**…" (no es marca, pero es microcopy de demo).
- Pendientes ya registrados: tarjeta de marca y pie durante el arranque, botón "Mostrar QR" violeta, familia naranja/marrón.

### 3. Deuda técnica invisible — no corresponde tocar
- 255 ocurrencias técnicas: `projectId`, `apppromos.web.app`, claves, eventos, variables, funciones (incluida `buildAppPromosWhatsAppUrl`), clases CSS y comentarios.
- Mensajes de consola y `app_name: "AppPromos"` de GA4.
- C4 (estilos inyectados desde JS).
- QA no puede generar QR, cartel, folleto ni PNG por la validación de URL de producción.
