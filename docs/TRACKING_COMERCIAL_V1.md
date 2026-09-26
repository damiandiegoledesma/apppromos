# TRACKING_COMERCIAL_V1 — Carnis.app

**Estado:** diseño aprobado (D1–D4 cerradas) e implementado en laboratorio. Pendiente: aplicación y QA sobre el repo real, deploy.
**Base:** V12.29 RC5.6 (`6eaa7d7`) + parches Carnis (V2.2, rebranding mínimo, Capturas Maestras V1).
**Objetivo:** medir el embudo comercial desde la llegada a la landing hasta que el carnicero comparte su vidriera, por visitante único y por campaña, con Firestore como fuente de verdad.

**Decisiones cerradas:**
- **D1:** snake_case en `funnelEvents`.
- **D2:** la instrumentación de la landing (`landing_view`, `cta_create_clicked`) se conecta junto con Landing 2. En V1 queda preparada (`attachLandingFunnel`) sin conectar.
- **D3:** `share_whatsapp_clicked` es solo el botón de la pantalla final del onboarding. El `web_share` posterior sigue en A1.
- **D4:** atribución por defecto con last_touch; first_touch seleccionable.

---

## 0. Resumen de decisiones

1. **Se extiende lo que existe.** Los eventos post-alta de A1 (`commercialEvents`), las señales de A2 (`publicSignals`), GA4 y `businesses/{id}.acquisition` quedan como están. Solo se agrega la parte que hoy no existe: el tramo anónimo **antes del alta**.
2. **Una sola colección nueva:** `funnelEvents` (raíz, append-only). No se puede reutilizar `businesses/{id}/commercialEvents` porque antes del alta no hay `businessId` ni sesión de dueño, y sus reglas exigen las dos cosas.
3. **Un solo servicio nuevo:** `public/js/services/funnel-tracking-service.js`. Maneja visitor_id, session_id, touches, modo interno, cola de envío y escritura.
4. **El vínculo visitante → carnicería** se guarda en dos lugares escritos una sola vez: el evento `business_created` (lleva `business_id`) y un mapa `funnel` dentro del documento del negocio, grabado en el mismo `setDoc` del alta. Ningún evento anterior se modifica.
5. **Centro de Control:** el bloque "Embudo" entra en la vista **Tracking** que ya existe (su botón dice "Embudo y métricas comerciales" pero hoy no muestra un embudo).

---

## 1. Auditoría del tracking actual (V12.29 RC5.6)

| Pieza | Dónde | Qué hace | Sirve para V1 |
|---|---|---|---|
| GA4 `G-EBJM7TQRSN` | `index.html:18`, `crear-carniceria.html:9`, `web.html:10`, `app.html:762` | Pageviews y eventos sueltos | Se mantiene en paralelo. No es fuente del embudo |
| `tracking-service.js` | `public/js/services/` | Wrapper GA4: `registration_started`, `trial_registered`, `first_price_saved`, `web_opened`, `web_shared`. Desactivado en localhost | Se mantiene sin cambios |
| Click handler inline de la landing | `index.html:1761-1880` | `ap_landing_cta_click`, `ap_signup_click`, `ap_demo_click`, `ap_login_click` a GA4, clasificando por texto del botón | Se mantiene. El embudo usa un atributo explícito, no el texto |
| Atribución del onboarding | `activation-onboarding-module.js:26-58` | Lee UTM de la URL de `crear-carniceria.html` y las guarda en **sessionStorage** (`apppromos_activation_attribution`) | Se reemplaza su origen de datos (ver conflicto C1) |
| `acquisition` en el negocio | `auth-service.js:500-506, 633` | Guarda `utm_source/medium/campaign/content` al crear el negocio | Se mantiene la forma. Se alimenta con el last_touch atribuible |
| Vista **Campañas** | `admin-users-module.js:1265` | Agrupa altas por `acquisition` | Sigue funcionando igual |
| A1: `commercialEvents` | `admin-service.js:269`, reglas `firestore.rules:167-204` | Línea de tiempo por negocio. Exige dueño autenticado con escritura habilitada | Se mantiene. No se duplica ningún evento post-alta |
| Alta en A1 | `auth-service.js:726` | Doc fijo `commercialEvents/business_registered` y `price_milestone_{5,12,15}` | Se mantiene |
| A2: `publicSignals` | `web.html:1948-1990`, reglas `:206-241` | Visitas y pedidos anónimos a la vidriera, visitor en `apppromos_public_signal_visitor_v1` | Fuera de V1 (vidriera del cliente) |
| `carniza-signals-service.js` | `public/js/services/` | Señales en localStorage + consola. No toca Firebase | No se usa |
| Vista **Tracking** del Centro de Control | `admin-users-module.js:1129` | Tabla por negocio: actividad, ofertas, WhatsApps, precios | Se le agrega el bloque Embudo arriba |
| Borrador del onboarding | `activation-draft-service.js` | sessionStorage. Se pierde al cerrar la pestaña | No cambia. El embudo no depende del borrador |

**Hallazgo principal:** hoy no existe ningún registro en Firestore de lo que pasa antes del alta. Si alguien abandona en precios, no queda rastro fuera de GA4. Y GA4 no tiene la mayoría de los pasos.

**Hallazgo secundario (bug actual de atribución):** los CTA de la landing (`index.html:1410, 1423, 1454, 1635, 1646, 1886`) apuntan a `/crear-carniceria.html` **sin** la query. Si un anuncio lleva a la landing, las UTM se pierden al tocar "Crear". Solo se atribuyen las altas de anuncios que llevan directo a `crear-carniceria.html` y que se completan en la misma pestaña.

---

## 2. Identidad: visitor_id

- **Clave:** `localStorage["carnis_funnel_visitor_v1"]`.
- **Valor:** `crypto.randomUUID()` sin guiones (32 caracteres `[a-f0-9]`). Si no hay `randomUUID`, se usa un fallback aleatorio de 32 caracteres alfanuméricos.
- **Sin PII:** no se guarda IP, user-agent, email, teléfono, nombre ni fingerprint.
- **Si localStorage falla** (modo privado estricto, almacenamiento bloqueado): el id vive en memoria para esa página y el evento sale con `storage_ok: false`. Esto infla visitantes, y el Centro de Control muestra cuántos eventos llegaron así.
- **Por qué no reutilizar `apppromos_public_signal_visitor_v1` (A2):** mide otra población (compradores de una vidriera) y forma parte del id de deduplicación diaria de `publicSignals`. Mezclarlos no aporta datos y ata dos sistemas con fines distintos.

## 3. Sesión: session_id

- **Clave:** `localStorage["carnis_funnel_session_v1"]` = `{ id, last_activity_at }`. Va en localStorage y no en sessionStorage para que sobreviva el salto de la vista previa (`web.html?preview=activation`) a `crear-carniceria.html?publish=1` y el paso entre pestañas.
- **Se abre una sesión nueva cuando:**
  1. no hay sesión guardada;
  2. pasaron **más de 30 minutos** desde `last_activity_at`;
  3. la URL trae UTM distintas del `current_touch` de la sesión abierta. Es el mismo criterio que usa GA4: una campaña nueva es una sesión nueva.
- `last_activity_at` se actualiza con cada evento del embudo y en cada carga de página que use el servicio.
- **No se generan eventos de sesión.** La sesión es un atributo de cada evento.

## 4. Touches: first, current, last

Cada touch es un mapa con esta forma:

```
{ source, medium, campaign, content, term, path, at }
```

- Las cinco UTM se normalizan: `trim`, minúsculas y un máximo de 100 caracteres cada una.
- `path`: pathname sin query (por ejemplo `/` o `/crear-carniceria.html`), hasta 120 caracteres.
- `at`: hora ISO del dispositivo en que se capturó el touch. Es un dato secundario.
- **Touch directo:** si la URL no trae ninguna UTM, el touch es `source: "(direct)"` y el resto de los campos va vacío.

| Touch | Clave localStorage | Regla |
|---|---|---|
| `first_touch` | `carnis_funnel_first_touch_v1` | Se escribe una única vez, en la primera página vista con el servicio (puede ser directo). Nunca cambia. |
| `current_touch` | dentro de la sesión | El touch con el que abrió la sesión actual (con UTM o directo). |
| `last_touch` | `carnis_funnel_last_touch_v1` | El último touch **con UTM**. Un regreso directo no lo pisa. Si nunca hubo UTM, queda igual a `first_touch`, que en ese caso es directo. |

**Ejemplo:** el lunes entra desde un anuncio de Meta (`utm_content=video_precios`). El jueves vuelve escribiendo carnis.app.
- `first_touch` = Meta / video_precios.
- `current_touch` = directo.
- `last_touch` = Meta / video_precios.
- El alta del jueves se atribuye a la campaña.

**Qué pasa con `acquisition` del negocio:** al crear el negocio, `registerClientAndBusiness` recibe `last_touch` en lugar de lo que hoy sale de sessionStorage. Se mantiene la forma actual `{utm_source, utm_medium, utm_campaign, utm_content}`, así que la vista Campañas no cambia. Si `last_touch` es directo, no se escribe `acquisition`, que es el mismo comportamiento de hoy.

**Sin vencimiento en V1.** `last_touch` no expira. Si más adelante hace falta una ventana (por ejemplo 90 días), se decide con datos.

## 5. Captura de UTM

- Se leen `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` y `utm_term` de `location.search` en **cualquier página que cargue el servicio**: landing, onboarding y vista previa.
- **No se reescribe la URL** ni se propaga la query a los CTA. La persistencia en localStorage alcanza, porque landing y onboarding están en el mismo origen.
- `fbclid` y `gclid` **no se guardan**. Los anuncios de Meta tienen que llevar UTM explícitas.
- **Convención para anuncios** (a validar con quien arma las campañas): `utm_source=meta`, `utm_medium=paid_social`, `utm_campaign=<campaña>`, `utm_content=<anuncio>`. `utm_content` identifica la pieza, por ejemplo `video_precios` o `carrusel_recalculo`.

---

## 6. Embudo: eventos, disparador real y datos mínimos

**Reglas generales:**
- Cada paso se envía **una vez por sesión** como máximo. El guard es `sessionStorage["carnis_funnel_sent_v1"]` con claves `session_id:event_name`.
- Una sesión nueva puede repetir un paso. Por eso el Centro de Control cuenta visitantes únicos.
- Ningún evento lleva nombre del negocio, teléfono, email ni precios.

| # | Evento | Archivo / módulo | Condición exacta (lo que el código puede detectar) | Datos propios |
|---|---|---|---|---|
| 1 | `landing_view` | `public/index.html` (la landing vigente o Landing 2) | Carga de la landing, una vez por sesión | — |
| 2 | `cta_create_clicked` | `public/index.html` | Click en un elemento con `data-funnel-cta="<posición>"` que lleva a `/crear-carniceria.html` | `cta_position` ∈ `nav, hero, how_it_works, pricing, final, sticky, other` |
| 3 | `onboarding_started` | `activation-onboarding-module.js`, `renderWelcome()` | Click en `data-action="start"` o `data-action="restart"`. "Continuar" (resume) **no** cuenta, porque ese visitante ya empezó | — |
| 4 | `rubros_completed` | `activation-onboarding-module.js`, `renderRubros()` | Click en `data-action="next"` con al menos 1 rubro elegido, justo antes de `setActivationDraftStep("prices")` | `count` = cantidad de rubros |
| 5 | `prices_started` | `activation-onboarding-module.js`, `renderPrices()` | El primer `save()` de un input `[data-price-key]` que deja un precio > 0 (eventos `change`/`blur`) | — |
| 6 | `prices_completed` | `activation-onboarding-module.js`, `renderPrices()` | Click en `data-action="next"` con `activationDraftPricedCount() >= 1` | `count` = productos con precio |
| 7 | `name_completed` | `activation-onboarding-module.js`, `renderIdentity()` | Click en `data-action="preview"` con nombre y localidad válidos, antes de `location.href = "/web.html?preview=activation"` | — |
| 8 | `storefront_previewed` | `public/web.html`, `resolveWebSource()` | `isActivationPreview()` y hay borrador válido (`source.type === "activation_preview"`). Si falta el borrador (`activation_preview_missing`) no se dispara | — |
| 9 | `signup_started` | `activation-onboarding-module.js`, `renderPublish()` | Submit que pasa las validaciones del cliente, en el mismo punto donde hoy se llama `trackRegistrationStarted` | — |
| 10 | `account_created` | `auth-service.js`, `registerClientAndBusiness()` | Inmediatamente después de que resuelve `createUserWithEmailAndPassword`. Se expone con un callback opcional `onAccountCreated`, así el servicio de auth no importa el de tracking | — |
| 11 | `business_created` | `activation-onboarding-module.js`, `renderPublish()` | Después de que `registerClientAndBusiness` devuelve `businessId`, en el mismo punto que `trackTrialRegistered` | `business_id`, `count` = precios guardados |
| 12 | `share_whatsapp_clicked` | `activation-onboarding-module.js`, `renderPublishedSuccess()` | Click en "📲 Compartir por WhatsApp". Hoy es un `<a target="_blank">` sin listener, hay que agregarlo. La página no navega, así que la escritura no se pierde | `business_id` |

**Lo que el código NO puede detectar y queda fuera:**
- El envío real del WhatsApp: solo se detecta el click.
- Vistas de pantalla sin acción, como "vio la pantalla de publicar": se puede agregar en V2 como `signup_viewed` si hace falta.
- Compartidos posteriores desde la app (`markActivationWebShared` en `app-main.js:1806`): ya quedan en A1 como `web_share`. V1 no los copia al embudo. Queda como decisión abierta D3.

**Riesgo de navegación (pasos 7 y 9 a 11):** en el paso 7 la página navega enseguida. Por eso el servicio usa una **cola persistente**, `localStorage["carnis_funnel_outbox_v1"]`, con un máximo de 50 eventos:
1. Encola el evento y lo intenta escribir.
2. En los pasos seguidos de navegación, espera la escritura hasta **800 ms** antes de `location.href`.
3. En cada carga de página, reintenta lo pendiente.

El id del documento es el `event_id` generado en el cliente, así que **un reintento nunca duplica**: si el documento ya existía, la regla lo trata como update y lo rechaza.
- `permission-denied`: el evento se descarta.
- Error de red: el evento queda en la cola.

---

## 7. Modelo de datos: `funnelEvents/{event_id}`

Append-only. Nombres en snake_case, igual que las UTM y los eventos pedidos. Ver conflicto C4.

```
{
  schema_version: 1,
  event_id:       "a1b2...",          // = id del documento, 32 alfanuméricos
  event_name:     "prices_completed", // allowlist
  visitor_id:     "…32…",
  session_id:     "…32…",
  occurred_at:    <serverTimestamp>,  // fuente de verdad (regla: == request.time)
  client_at:      "2026-09-26T14:03:11.402Z", // hora del dispositivo, secundaria
  page:           "onboarding",       // landing | onboarding | preview
  path:           "/crear-carniceria.html",
  build:          "V12.29-RC5.6",     // versión de la landing/app que generó el evento
  is_internal:    false,
  storage_ok:     true,
  first_touch:    { source, medium, campaign, content, term, path, at },
  current_touch:  { … },
  last_touch:     { … },
  // opcionales según evento:
  cta_position:   "hero",
  count:          12,
  business_id:    "biz_1758…"
}
```

- **Por qué touches en cada evento y no en un documento de visitante:** mantiene todo append-only. Además el Centro de Control puede filtrar por campaña con una sola lectura y sin joins, y nunca hay que actualizar un documento.
- **Tamaño estimado:** menos de 1 KB por evento.

## 8. Vínculo visitor_id → business_id sin reescribir historia

1. **`funnelEvents/{id}` con `event_name = "business_created"`**: lleva `visitor_id` + `business_id`. Es el vínculo canónico. Lo escribe el dueño recién autenticado, y la regla verifica que sea dueño de ese `business_id`.
2. **`businesses/{id}.funnel`**: `{ visitor_id, first_touch, last_touch, schema_version: 1 }`, escrito **dentro del mismo `setDoc` del alta** (`auth-service.js:602`). No es un update posterior. La regla actual de creación (`validSelfRegisteredBusiness`) no limita claves, así que no hace falta tocarla. El dueño no puede modificarlo después, porque `ownerCanUpdateBusinessControl` no incluye `funnel`.
3. **Los eventos anteriores del visitante no se tocan.** El Centro de Control une por `visitor_id` en lectura.

Si un mismo visitante crea dos negocios, hay dos eventos `business_created` con distinto `business_id`. Ninguno se pisa.

## 9. Firestore Rules (borrador para auditar, no aplicado)

```
function validFunnelTouch(t) {
  return t is map
    && t.keys().hasOnly(['source','medium','campaign','content','term','path','at'])
    && (!('source'   in t) || (t.source   is string && t.source.size()   <= 100))
    && (!('medium'   in t) || (t.medium   is string && t.medium.size()   <= 100))
    && (!('campaign' in t) || (t.campaign is string && t.campaign.size() <= 100))
    && (!('content'  in t) || (t.content  is string && t.content.size()  <= 100))
    && (!('term'     in t) || (t.term     is string && t.term.size()     <= 100))
    && (!('path'     in t) || (t.path     is string && t.path.size()     <= 120))
    && (!('at'       in t) || (t.at       is string && t.at.size()       <= 30));
}

match /funnelEvents/{eventId} {
  allow read: if isAdmin() || isSuperadmin();
  allow update, delete: if false;
  allow create: if eventId.matches('^[A-Za-z0-9]{20,40}$')
    && request.resource.data.keys().hasAll([
      'schema_version','event_id','event_name','visitor_id','session_id',
      'occurred_at','client_at','page','path','build','is_internal','storage_ok',
      'first_touch','current_touch','last_touch'])
    && request.resource.data.keys().hasOnly([
      'schema_version','event_id','event_name','visitor_id','session_id',
      'occurred_at','client_at','page','path','build','is_internal','storage_ok',
      'first_touch','current_touch','last_touch',
      'cta_position','count','business_id'])
    && request.resource.data.schema_version == 1
    && request.resource.data.event_id == eventId
    && request.resource.data.event_name in [
      'landing_view','cta_create_clicked','onboarding_started','rubros_completed',
      'prices_started','prices_completed','name_completed','storefront_previewed',
      'signup_started','account_created','business_created','share_whatsapp_clicked']
    && request.resource.data.visitor_id.matches('^[A-Za-z0-9]{16,40}$')
    && request.resource.data.session_id.matches('^[A-Za-z0-9]{16,40}$')
    && request.resource.data.occurred_at == request.time
    && request.resource.data.client_at is string && request.resource.data.client_at.size() <= 30
    && request.resource.data.page in ['landing','onboarding','preview']
    && request.resource.data.path is string && request.resource.data.path.size() <= 120
    && request.resource.data.build is string && request.resource.data.build.size() <= 24
    && request.resource.data.is_internal is bool
    && request.resource.data.storage_ok is bool
    && validFunnelTouch(request.resource.data.first_touch)
    && validFunnelTouch(request.resource.data.current_touch)
    && validFunnelTouch(request.resource.data.last_touch)
    && (!('cta_position' in request.resource.data)
        || (request.resource.data.event_name == 'cta_create_clicked'
            && request.resource.data.cta_position in
               ['nav','hero','how_it_works','pricing','final','sticky','other']))
    && (!('count' in request.resource.data)
        || (request.resource.data.event_name in ['rubros_completed','prices_completed','business_created']
            && request.resource.data.count is int
            && request.resource.data.count >= 0 && request.resource.data.count <= 500))
    && (('business_id' in request.resource.data)
        == (request.resource.data.event_name in ['business_created','share_whatsapp_clicked']))
    && (!('business_id' in request.resource.data)
        || (request.resource.data.business_id is string
            && request.resource.data.business_id.size() <= 60
            && ownsBusiness(request.resource.data.business_id)));
}
```

**Notas:**
- Se escribe sin autenticación, igual que `publicSignals`. Por eso el esquema es cerrado: allowlist de claves y de eventos, tamaños y tipos.
- `occurred_at == request.time` obliga a mandar `serverTimestamp()`, así que la hora del dispositivo no puede falsear el orden.
- `business_id` solo lo puede poner el dueño real. Nadie puede atribuirse un alta ajena.
- **La regla catch-all `businesses/{id}/{collectionId}/{document=**}` (línea 304) no aplica**, porque `funnelEvents` es de raíz.
- Hay que confirmar que no existe otra regla de raíz más amplia que la pise. En RC5.6 no existe.

## 10. Modo interno `?interno=1`

- `?interno=1` en cualquier página con el servicio guarda `localStorage["carnis_funnel_internal_v1"] = "1"`.
- **Es persistente:** queda marcado ese navegador, en ese dispositivo y en ese origen.
- `?interno=0` lo borra.
- Mientras esté activo, **los eventos se siguen escribiendo** con `is_internal: true`. Así se puede hacer QA en producción sin ensuciar números.
- El Centro de Control los excluye por defecto y tiene un interruptor "Incluir internos".
- **Además se marca interno automáticamente:** `localhost`, `127.0.0.1` y la conexión a emuladores (ya detectada en `firebase-core.js`).
- **No hay indicador visual en la página pública.** Solo aparece un `console.info` para verificar.
- **Checklist para Damián:** abrir `carnis.app/?interno=1` en cada navegador y dispositivo propio, incluido **el navegador interno de Instagram/Facebook**, que tiene almacenamiento separado.
- **No se usa el login para marcar interno.** En la landing no hay sesión. Además, un admin que prueba el alta desde cero no está logueado.

## 11. GA4 en paralelo

GA4 sigue igual: no se borran eventos, no se renombran y no se agregan nuevos en V1. **Firestore es la fuente del embudo comercial.** GA4 queda para tráfico general y para comparar.

| Paso Firestore | Equivalente GA4 existente |
|---|---|
| `landing_view` | `page_view` automático |
| `cta_create_clicked` | `ap_landing_cta_click` / `ap_signup_click` (inline `index.html`) |
| `onboarding_started` … `name_completed` | — |
| `storefront_previewed` | `page_view` de `web.html` (el `public_web_view` se omite en preview) |
| `signup_started` | `registration_started` |
| `account_created` | — |
| `business_created` | `trial_registered` |
| `share_whatsapp_clicked` | — (el `web_shared` de GA4 es de la app, no del onboarding) |

**Las diferencias entre GA4 y Firestore son esperables:**
- Los bloqueadores cortan GA4 más que Firestore.
- GA4 está desactivado en localhost.
- GA4 cuenta eventos; el embudo cuenta visitantes únicos.

## 12. Centro de Control: bloque "Embudo"

**Dónde:** arriba de la tabla actual de la vista **Tracking** (`admin-users-module.js:1129`). Se carga **bajo demanda** con un botón "Ver embudo", no al abrir el panel.

**Datos:** una función nueva `listFunnelEvents({ from, to })` en `admin-service.js`:
- Consulta: `funnelEvents` con `where occurred_at >= from && < to`, `orderBy occurred_at` y `limit 5000`.
- Usa solo el índice automático de campo único. No hace falta índice compuesto, porque internos y campañas se filtran en el cliente.
- Si llega a 5000 documentos, muestra el aviso "Período truncado: achicá el rango".

**Cálculo (en el cliente):**
1. Se descartan los `is_internal`, salvo que esté activo el interruptor.
2. **Campaña del visitante:** por defecto, el `last_touch` de su evento más reciente en el período, que es el mismo criterio que usa `acquisition` para las altas. Un selector permite cambiar a `first_touch` (tomado de cualquier evento, porque no cambia).
3. Para cada paso: **COUNT DISTINCT visitor_id** que tuvo ese evento en el período.
4. Conversión entre pasos: `únicos(paso k) / únicos(paso k-1)`.
5. Conversión total, en dos versiones: `business_created / landing_view` y `business_created / onboarding_started`.
6. **Mayor caída:** el par de pasos consecutivos con menor conversión, siempre que el paso anterior tenga al menos 5 visitantes (para no marcar ruido).
7. **Entradas directas al onboarding:** visitantes con `onboarding_started` y sin `landing_view` en el período (anuncios que llevan directo a `crear-carniceria.html`).

**Filtros:**
- Período: Hoy, 7 días, 30 días, o desde/hasta. Los días se cuentan en hora de Argentina.
- Campaña: `utm_campaign`.
- Anuncio: `utm_content`.
- Incluir internos.

**Vista mínima:** una tabla con Paso · Únicos · % vs anterior · % vs inicio, más tres tarjetas: Conversión total, Mayor caída y Entradas directas.

**Limitación a explicar en pantalla:** el conteo es por evento dentro del período, no por cohorte. Un visitante que llegó el día 30 y se registró el día 1 del mes siguiente aparece partido entre los dos períodos. Además, como hay entradas directas, un paso puede tener más únicos que el anterior. En ese caso el % se muestra tal cual y lleva una nota.

**Costo:** cada apertura lee N documentos. Con 200 visitantes por día y unos 6 eventos cada uno, 30 días son unas 36.000 lecturas, del orden de US$ 0,02.

## 13. Fuera de V1 (explícito)

- Tracking de la vidriera del cliente (`order_whatsapp_clicked` o similares). A2 ya cubre visitas y pedidos anónimos.
- QR, productos, promos vistas y cualquier evento dentro de la app post-alta más allá de lo que ya hace A1.
- Python, SQLite, exportaciones o ETL.
- Fingerprinting, IP, user-agent y unión de identidades entre dominios o navegadores.
- Cohortes, atribución multi-touch, tiempos entre pasos, A/B testing y dashboards avanzados.
- Nuevos eventos GA4.
- App Check (recomendado para V2 como defensa contra spam).

## 14. Mapa de archivos, colecciones, reglas y riesgos

### Archivos

| Archivo | Tipo | Cambio |
|---|---|---|
| `public/js/services/funnel-tracking-service.js` | **nuevo** | visitor/session/touches, modo interno, cola, `trackFunnelEvent(name, extra)`, `getAttributableTouch()`, `getFunnelLinkPayload()` |
| `firestore.rules` | modificado | `validFunnelTouch()` + `match /funnelEvents/{eventId}` |
| archivo de Landing 2 | **con Landing 2 (D2)** | importa el servicio (`type="module"`), `landing_view`, atributo `data-funnel-cta` en cada CTA de crear. No toca el handler GA4 inline |
| `public/js/modules/activation-onboarding-module.js` | modificado | pasos 3–7, 9, 11, 12. `resolveCampaignAttribution()` pasa a devolver `getAttributableTouch()` (misma forma de 4 UTM). Listener nuevo en "Compartir por WhatsApp" |
| `public/js/services/auth-service.js` | modificado | parámetro opcional `onAccountCreated` y el mapa `funnel` en el `setDoc` del negocio. No cambia la firma para los demás llamadores |
| `public/web.html` | modificado | `storefront_previewed` solo en `isActivationPreview()` |
| `public/js/services/admin-service.js` | modificado | `listFunnelEvents({from,to})` |
| `public/js/modules/admin-users-module.js` | modificado | bloque Embudo en `renderTracking()` + filtros |
| `tools/qa/funnel-rules-test.mjs` | **nuevo** | pruebas de reglas contra el emulador (positivas y negativas) |
| `docs/TRACKING_COMERCIAL_V1.md` | **nuevo** | este documento |
| `tracking-service.js`, `app-main.js`, `carniza-signals-service.js`, `activation-draft-service.js`, `crear-carniceria.html`, `app.html` | **sin cambios** | — |

### Colecciones

- **Nueva:** `funnelEvents` (raíz).
- **Campo nuevo, solo al crear:** `businesses/{id}.funnel`.
- **Sin cambios:** `commercialEvents`, `publicSignals`, `acquisition` (misma forma, mejor fuente).

### Orden de deploy (cuando se apruebe)

1. Reglas.
2. Hosting.

Al revés, los eventos fallan en silencio hasta que suben las reglas. El servicio nunca rompe la UI.

### Riesgos

| Riesgo | Impacto | Mitigación V1 |
|---|---|---|
| Colección pública escribible sin auth | Spam o inflado de números | Esquema cerrado, id con formato, `business_id` verificado, alerta de presupuesto en GCP. App Check en V2 |
| Navegador interno de Instagram/Facebook | El anuncio abre en el webview y el alta se hace después en Chrome: son dos visitantes, y el alta queda sin atribución | Sin solución sin fingerprinting. Se mide cuánto pasa (altas con last_touch directo vs campañas activas). Si es grande: CTA "abrir en el navegador" o link al onboarding con UTM en el mensaje final |
| `apppromos.web.app` vs `carnis.app` | localStorage separado: un mismo humano cuenta como dos visitantes | Los anuncios y la landing apuntan solo a `carnis.app` |
| localStorage bloqueado | Visitantes inflados | `storage_ok: false` visible en el Centro de Control |
| Navegación inmediata en `name_completed` | Evento perdido | Cola persistente + espera hasta 800 ms |
| Recorte por período | Pasos partidos entre meses | Nota en pantalla. Cohortes en V2 |
| 5000 eventos por consulta | Embudo truncado | Aviso y rango más corto. Contadores agregados en V2 si hace falta |
| Olvidar `?interno=1` en un dispositivo | QA propio contado como real | Checklist de dispositivos y el interruptor para revisar |

### Conflictos con A1/A2 y el Centro de Control actual

- **C1 — Atribución en sessionStorage.** La de `activation-onboarding-module.js` se reemplaza por `last_touch` persistente. Efecto: suben las altas atribuidas en Campañas. No se reescribe ninguna alta vieja. Hay que avisarlo para no leerlo como "mejoraron las campañas".
- **C2 — CTA sin query en la landing.** Se resuelve por persistencia, sin tocar los hrefs.
- **C3 — Dos visitor_id en el mismo origen.** Uno para A2 (vidriera) y otro nuevo para el embudo. Es deliberado (sección 2).
- **C4 — Convención de nombres.** A1/A2 usan camelCase (`occurredAt`, `businessId`) y el embudo usa snake_case, como se pidió. Además A1 guarda `occurredAt` como string ISO del cliente y el embudo como timestamp del servidor. Son colecciones separadas y no se mezclan en consultas. **Decisión a confirmar (D1).**
- **C5 — Exclusión de tráfico propio.** A2 excluye por sesión (dueño/superadmin) y el embudo por `?interno=1`. Son mecanismos distintos para poblaciones distintas. En V1 el modo interno no afecta a A2.
- **C6 — Vista "Tracking".** Hoy promete "Embudo" y no lo muestra. El bloque nuevo cumple eso sin sacar la tabla actual.
- **C7 — `business_registered` (A1) y `business_created` (embudo).** Registran el mismo hecho en dos lugares, a propósito: uno en la línea de tiempo del negocio y otro en el embudo anónimo. No se unifican en V1.
- **C8 — Nombre del evento en la maqueta V0.6.** La nota de la Landing 2 V0.6 dice `landing_cta_click · position=…` y `demo_storefront_click`. Con este documento pasa a `cta_create_clicked` + `cta_position`. `demo_storefront_click` ("Ver A La Estaca") queda solo en GA4, porque no es paso del embudo.
- **C9 — Seeder y emulador.** El seeder no debe escribir `funnelEvents`. Los eventos generados en localhost van al emulador y quedan `is_internal: true`.

### Decisiones (cerradas, ver encabezado)

- **D1:** ¿snake_case (como se pidió) o camelCase (como A1/A2) en `funnelEvents`?
- **D2:** ¿implementar el embudo sobre la landing actual antes de Landing 2, para tener una línea base, o junto con Landing 2? El campo `build` permite comparar las dos.
- **D3:** ¿el primer `web_share` desde la app, dentro de las 48 h del alta, cuenta como `share_whatsapp_clicked` o solo el botón de la pantalla final?
- **D4:** ¿el filtro de campaña usa last_touch por defecto (recomendado) o first_touch?

---

## 15. Matriz de QA

Todo corre en emuladores (auth 9099, firestore 8080) salvo lo marcado **PROD**, que se hace con `?interno=1` después del deploy aprobado. "Verificar" significa leer `funnelEvents` en la UI del emulador y el bloque Embudo del Centro de Control.

| # | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Primera entrada desde Meta | Abrir `/?utm_source=meta&utm_medium=paid_social&utm_campaign=lanz&utm_content=video_precios` | `landing_view` con first = current = last = meta/lanz/video_precios. visitor_id y session_id nuevos |
| 2 | Regreso directo | Después de 1, cerrar la pestaña y abrir `/` más de 30 min después | Nuevo session_id, mismo visitor_id. `current_touch.source = "(direct)"`. **first y last siguen siendo meta/video_precios** |
| 3 | Regreso dentro de los 30 min | Después de 1, abrir `/` a los 10 min | Mismo session_id. No hay segundo `landing_view` en esa sesión |
| 4 | Sesión vencida | Fijar `last_activity_at` en −31 min y recargar | Nuevo session_id. `landing_view` se vuelve a enviar |
| 5 | Nueva campaña en la misma sesión | Después de 1, abrir a los 5 min con `utm_content=carrusel` | Nuevo session_id. current = last = carrusel. first sigue siendo video_precios |
| 6 | Anuncio directo al onboarding | Abrir `/crear-carniceria.html?utm_source=meta&utm_content=x` y tocar Empezar | `onboarding_started` sin `landing_view`. Aparece en "Entradas directas" |
| 7 | CTA de la landing | Tocar cada CTA (hero, pasos, precio, cierre, sticky) | Un `cta_create_clicked` por sesión con el `cta_position` correcto. Las UTM llegan al onboarding sin estar en la URL |
| 8 | Tráfico interno | Abrir `/?interno=1`, recorrer todo y después abrir `/` sin parámetro | Todos los eventos con `is_internal: true`, también sin el parámetro. Embudo por defecto: 0. Con "Incluir internos": aparecen |
| 9 | Salir de interno | `/?interno=0` | Los eventos siguientes salen con `is_internal: false` |
| 10 | Abandono en rubros | Empezar y salir | `onboarding_started` sí. `rubros_completed` no. La mayor caída cae en ese par si es la menor conversión |
| 11 | Abandono en precios | Elegir rubros, escribir 1 precio y salir | `rubros_completed` y `prices_started` sí. `prices_completed` no |
| 12 | Abandono en nombre | Completar precios y salir en identidad | `prices_completed` con `count` correcto. `name_completed` no |
| 13 | Abandono en vista previa | Llegar a la vista previa y cerrar | `name_completed` y `storefront_previewed` sí, aunque la navegación sea inmediata (cola) |
| 14 | Abandono en registro | Tocar Publicar con la contraseña corta | No hay `signup_started`, porque falla la validación del cliente. Con datos válidos pero email ya usado: `signup_started` sí y `account_created` no |
| 15 | Alta completa | Recorrido entero + Compartir | Los 12 eventos, en orden de `occurred_at`. `business_created.business_id` = negocio creado. `share_whatsapp_clicked` con el mismo `business_id` |
| 16 | Vínculo visitor → business | Después de 15 | `businesses/{id}.funnel.visitor_id` = visitor_id de los eventos. `acquisition` = last_touch. Ningún evento previo tiene `updated_at` ni cambió |
| 17 | Alta tras regreso directo | Hacer 1, después 2, y completar el alta en la sesión directa | `acquisition` = meta/video_precios. En Campañas aparece bajo ese anuncio |
| 18 | Únicos con repetición | El mismo visitante hace Empezar → Atrás → Empezar en 3 sesiones distintas | 3 documentos `onboarding_started`, **1** único en el Embudo |
| 19 | Dos visitantes | Navegador A y B (incógnito) hacen el mismo recorrido | 2 únicos por paso |
| 20 | Filtro de período | Crear eventos con `occurred_at` en días distintos (seed de emulador vía admin) | Hoy/7d/30d cuentan correcto, con días en hora de Argentina |
| 21 | Filtro de campaña | Visitantes con `utm_content` distintos | Cada filtro muestra solo sus visitantes. "Sin atribución" agrupa los directos |
| 22 | Reintento sin duplicar | Cortar la red en `name_completed`, reconectar y recargar | La cola reenvía. Queda 1 documento. Un reenvío duplicado recibe `permission-denied` y se descarta |
| 23 | Regla: update/delete | Intentar actualizar o borrar un evento, como anónimo y como dueño | Denegado |
| 24 | Regla: evento fuera de la allowlist | `event_name: "hack"` | Denegado |
| 25 | Regla: campo extra o largo | Clave `email`, o `utm_campaign` de 101 caracteres | Denegado |
| 26 | Regla: hora del cliente | `occurred_at` = fecha del cliente | Denegado |
| 27 | Regla: business_id ajeno | Dueño A escribe `business_created` con el `business_id` de B | Denegado |
| 28 | Regla: lectura | Leer `funnelEvents` como anónimo y como dueño | Denegado. Como admin: permitido |
| 29 | localStorage bloqueado | Bloquear el almacenamiento del sitio | Los eventos salen con `storage_ok: false` y la UI no se rompe |
| 30 | No regresión A1/A2 | Alta completa y visita a la vidriera | `commercialEvents/business_registered` y `publicSignals` igual que antes. GA4 `registration_started` / `trial_registered` siguen saliendo |
| 31 | **PROD** humo | `carnis.app/?interno=1` y recorrido completo en el celular | 12 eventos internos en producción. Embudo por defecto sin cambios |

---

## 16. Implementación V1 — notas y desviaciones

Implementado exactamente según las secciones 1–15, con estas diferencias (todas menores y justificadas):

1. **Guard "una vez por sesión"** en `localStorage["carnis_funnel_sent_v1"]` asociado al `session_id`, en lugar de sessionStorage. Motivo: la sesión se comparte entre pestañas, y con sessionStorage dos pestañas de la misma sesión duplicaban el paso. Comportamiento idéntico en el caso normal.
2. **`?interno=0` guarda "0" (fuerza externo)** en lugar de borrar la marca. Motivo: en localhost el modo interno es automático; sin esta marca no se podían generar eventos externos en el QA local. En producción el efecto es el mismo que borrar.
3. **Archivo nuevo no previsto en el mapa:** `public/js/services/funnel-report-service.js`, con el cálculo del embudo en funciones puras (sin Firebase). El Centro de Control lo usa y las pruebas lo ejecutan en Node.
4. **`build` = `V12.29-RC5.6+T1`** (constante `FUNNEL_BUILD` en el servicio). Landing 2 debe actualizarla para poder comparar versiones.
5. **Reglas:** se agregó `is string` antes de cada `matches()`, para rechazar tipos incorrectos de forma explícita.
6. **`storefront_previewed`** se registra cuando la vista previa encuentra un borrador válido, antes de dibujar la página.
7. **La atribución del onboarding se calcula en el momento del registro** (antes se calculaba al cargar el módulo). Mantiene la misma forma de 4 UTM para `acquisition` y GA4.
8. **La clave de sessionStorage `apppromos_activation_attribution` deja de leerse y escribirse.** Los valores viejos que queden en navegadores se ignoran.

**Qué se tocó y qué no:**
- Archivos modificados: los previstos en la sección 14, más `funnel-report-service.js` y dos pruebas: `tools/qa/test-funnel-rules.mjs` y `tools/qa/test-funnel-report.mjs`.
- No se tocaron `tracking-service.js` (GA4), `app-main.js`, `index.html`, `crear-carniceria.html` ni `app.html`.

**Actualización (Landing 2 V0.6):** la instrumentación de la landing quedó conectada en `public/index.html` (`attachLandingFunnel`, `data-funnel-cta`) y `FUNNEL_BUILD` pasó a `V12.29-RC5.6+T1+L2`. Ver `docs/LANDING_2_V06.md`.
