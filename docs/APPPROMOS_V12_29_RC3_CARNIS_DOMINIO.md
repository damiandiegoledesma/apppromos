# AppPromos V12.29 RC3 — carnis.app como dominio público canónico

## Objetivo
Preparar, sin desplegar ni tocar DNS, la migración de las vidrieras públicas al dominio `https://carnis.app`, manteniendo compatibilidad permanente con las rutas históricas de Firebase Hosting.

## Decisión de arquitectura
- AppPromos sigue siendo la aplicación/backoffice del carnicero.
- Carnis (`carnis.app`) pasa a ser la dirección comercial pública que se genera y comparte.
- El slug sigue siendo el identificador de resolución en `publicWebSlugs/{slug}`.
- `apppromos.web.app/{slug}` no se redirige ni se elimina: al estar ambos dominios sobre el mismo Hosting, resuelve la misma vidriera por el mismo slug.
- Un guardado normal de Mi Web ya no regenera un slug existente.
- Si nombre/teléfono cambian mediante el flujo explícito de identidad, el slug anterior deja de borrarse: queda como alias permanente y se refresca con el snapshot vigente.

## Cambios RC3
1. `public/js/services/web-premium-service.js`
   - `PUBLIC_STOREFRONT_ORIGIN = "https://carnis.app"`.
   - `getPublicWebUrl()` genera URLs comerciales en Carnis.
   - `saveWebConfig()` conserva el slug ya existente; sólo genera uno si falta.
   - Los dos flujos que antes borraban `publicWebSlugs/{previousSlug}` ahora preservan ese documento como alias y lo actualizan con el snapshot vigente.
2. `public/js/app-main.js`
   - Carniza/activación y Mi Cuenta dejan de priorizar `web.publicUrl` legacy persistido y reconstruyen la URL canónica desde el slug vigente.
   - Centro de Impresiones deja de hardcodear `apppromos.web.app` y usa `getPublicWebUrl()`.
3. `public/js/modules/print-center-module.js`
   - El layout con franja protegida para QR reconoce tanto `carnis.app` como la URL histórica de AppPromos.
4. `public/index.html`, `public/como-vender.html`, `public/js/modules/carniza-landing-module.js`
   - Los accesos públicos estáticos a A La Estaca pasan a Carnis conservando el slug que actualmente figura en el código: `carniceria-a-la-estaca-3462-543210`.

## Slug de A La Estaca: control obligatorio antes de deploy
El repositorio RC2 contiene de forma consistente la ruta pública actual `carniceria-a-la-estaca-3462-543210` en landing, Cómo vender y Carniza Landing. También existe documentación histórica que usa esa misma ruta.

**RC3 no reconstruye ese slug y no modifica datos de producción.** Este entorno de auditoría no tiene acceso de red/credenciales a Firestore producción, por lo que antes de deploy debe leerse el valor real de `businesses/{A_LA_ESTACA}/state.web.slug` y comprobar que coincide exactamente con `carniceria-a-la-estaca-3462-543210`. Si no coincide, deben corregirse únicamente los enlaces estáticos de A La Estaca antes del deploy; nunca modificar el slug productivo para hacerlo coincidir con el código.

## Tracking
La vidriera continúa ejecutando una sola llamada a `recordPublicSignal()` por carga externa y una sola al iniciar pedido por WhatsApp. El `signalId` conserva su deduplicación diaria por negocio/tipo/visitorId. RC3 no agrega redirects ni una segunda inicialización de `web.html`, por lo que el nuevo dominio no introduce doble evento en una misma carga.

Nota: `localStorage` está aislado por dominio. Si un mismo cliente abre deliberadamente el link viejo y el nuevo durante el mismo día, cada dominio puede tener un visitorId diferente. Eso no es doble registro de una misma carga; es una limitación normal del aislamiento entre orígenes. No se agregó fingerprinting ni tracking invasivo para unir identidades entre dominios.

## Fuera de alcance deliberadamente
- No se conectó `carnis.app` a Firebase Hosting.
- No se modificó DNS.
- No se desplegó producción.
- No se migraron documentos Firestore de las otras carnicerías.
- No se cambió el slug productivo de A La Estaca.

## QA ejecutado sobre RC3
- `node --check` sobre todos los archivos `public/js/**/*.js`: OK.
- Extracción del `<script type="module">` de `public/web.html` + `node --check`: OK.
- Assert: origen canónico `https://carnis.app`: OK.
- Assert: guardado normal conserva slug existente: OK.
- Assert: no quedan borrados de `publicWebSlugs/{previousSlug}` en `web-premium-service.js`: OK.
- Assert: `app-main.js` ya no hardcodea `https://apppromos.web.app`: OK.
- Assert: Centro de Impresiones reconoce Carnis + dominio histórico para QR: OK.

## QA de producción requerido después de auditoría y DNS
1. Leer y anotar el slug real de A La Estaca en Firestore antes de tocar nada.
2. Conectar `carnis.app` al mismo Firebase Hosting de AppPromos y completar DNS/SSL.
3. Abrir `https://carnis.app/{slug-real}`.
4. Abrir `https://apppromos.web.app/{slug-real}`.
5. Confirmar misma identidad, productos, promociones y carrito.
6. Desde AppPromos: compartir por WhatsApp, Carniza, Mi Web, QR e impresiones; todos los enlaces nuevos deben mostrar `carnis.app/{slug-real}`.
7. Hacer un pedido desde Carnis y verificar WhatsApp.
8. Verificar una sola señal `external_storefront_visit` por carga y una sola `public_order_whatsapp_started` al iniciar pedido.
9. Cambiar identidad sólo en emulador/QA y confirmar que slug nuevo + slug anterior abren el mismo negocio.
10. No retirar nunca la ruta histórica `apppromos.web.app/{slug}`.
