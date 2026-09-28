# QA-03 — Auditoría visual integral del rebranding Carnis

**Fecha:** 28/09/2026 · **Entorno:** `https://apppromos-qa.web.app` (Firebase `apppromos-qa`) · **Viewport principal:** 390×844
**Repo:** `C:\apppromos-qa`, rama `fix/branding-publico-login-pwa`, HEAD `bc978cc` (sobre `c0d98f3` ← `4204253` ← `main 5294c8c`).
**Sesión de prueba:** carnicería "Carniceria QA" creada por Damián en QA (`/carniceria-qa-3415-555666`).
**Sin cambios:** no se modificó código, no hubo commit/push/deploy, producción no se tocó.

> Nota de método: las capturas de la app interna se tomaron desde el navegador integrado del escritorio, que escala la vista (quedan ~286 px de ancho, legibles pero más chicas). Las públicas (landing, crear carnicería, cómo vender, vidrieras) se tomaron a 390×844 reales.
> Limitaciones: `git status` no se pudo ejecutar (sin terminal en la PC); el carrito y el envío por WhatsApp no se capturaron (el carrito requiere agregar productos y abrir WhatsApp); no se capturaron listas/carteles/QR impresos porque QA no tiene ofertas publicadas.

---

## 1. Resumen ejecutivo

**La "cáscara" es Carnis; el interior todavía habla AppPromos.**

- 🟢 **Carnis: 7** — landing, crear carnicería, login, Inicio, Precios, Vender (selector + consulta + crear promo), vidriera pública.
- 🟡 **Parcial: 6** — Promo del día (Carniza), Promos (estado vacío), menú Más, Mi cuenta, Mi carnicería online, footer global de la app.
- 🔴 **Legacy: 2** — Centro de Impresiones (todas sus salidas dicen "Generado con AppPromos") y página "Cómo vender" (H1 "Tres maneras de vender con AppPromos").

Lo ya resuelto es sólido: favicon, manifest PWA ("Carnis.app", íconos Carnis), títulos de pestaña, logo en headers, login, rojo Carnis como color principal y la firma "Funciona con Carnis.app" en la vidriera.
Lo pendiente es sobre todo **microcopy** ("AppPromos" dentro de textos) y **salidas que llegan al cliente final** (impresos, PNG descargados, mensajes de WhatsApp de soporte). Hay además un **error visible** en la landing: el ejemplo "A La Estaca" apunta a una vidriera que no existe en QA.

---

## 2. Mapa maestro

| # | Pantalla | Estado | Principal hallazgo | Prioridad | Captura |
|---|---|---|---|---|---|
| 1 | Landing | 🟢 | Marca Carnis completa; footer dice "Una solución de AppPromos"; demo A La Estaca rota en QA | P2 | 01a, 01b |
| 2 | Crear carnicería / onboarding | 🟢 | Carnis + Carniza; tipografía distinta al resto (fuente del sistema) | P3 | 02 |
| 3 | Login | 🟢 | Limpio y Carnis | — | 03 |
| 4 | Inicio | 🟢 | Carnis; footer "una solución de AppPromos" | P2 | 04-superior, 04b |
| 5 | Precios | 🟢 | Ya dice "lo uso en Carnis"; demo dice "Estás probando AppPromos" (código) | P2 | 05 |
| 6 | Vender (selector) | 🟢 | Sin legacy visible | — | 06 |
| 7 | Responder consulta | 🟢 | Sin legacy visible | — | 06b |
| 8 | Crear promo/combo | 🟢 | Sin legacy visible | — | 07 |
| 9 | Promo del día (Carniza) | 🟡 | "AppPromos no agrega otros productos"; header azul marino distinto al resto | P1 | 08 |
| 10 | Promos (vacío) | 🟡 | Texto de desarrollo: "Corré el seeder y volvé a entrar a la demo" | P1 | 09 |
| 11 | Menú Más | 🟡 | Bien; "INSTALAR" en mayúsculas desentona | P3 | 10 |
| 12 | Mi cuenta | 🟡 | aria-label "Mi cuenta AppPromos"; mensajes de soporte "Hola AppPromos…" | P2 | 11 |
| 13 | Mi carnicería online | 🟡 | "AppPromos actualiza la vidriera automáticamente" | P1 | 15 |
| 14 | Centro de Impresiones | 🔴 | "…que ya tenés en AppPromos"; "AppPromos genera 8 folletos" | P1 | 14, 14b |
| 15 | Salidas impresas / PNG / QR | 🔴 | "Generado con AppPromos", "Modelo 2 · AppPromos", archivos `AppPromos-*.png` (código) | P1 | — (código) |
| 16 | Cómo vender | 🔴 | H1 "Tres maneras de vender con AppPromos" + 6 menciones más + logo diminuto | P1 | 13 |
| 17 | Vidriera pública | 🟢 | "Funciona con Carnis.app"; avatar "CQ" azul marino | P3 | 16, 16b |
| 18 | Vidriera ejemplo (landing) | 🔴 (roto) | "Error cargando web" en QA | P2 | 12 |
| 19 | PWA / favicon / títulos | 🟢 | Manifest y favicons Carnis en todas las páginas | — | código |

---

## 3. Auditoría pantalla por pantalla

### 1. Landing — 🟢 · `01a-landing-mobile.png`, `01b-landing-desktop.png`
- **Bien:** logo Carnis.app, rojo Carnis, tipografía Kanit/Poppins, CTA "Crear mi carnicería gratis", favicon y título Carnis.
- **Legacy:** footer "Una solución de AppPromos". Hay comentarios en el HTML marcando capturas de A La Estaca "con AppPromos" como pendientes.
- **Consistencia:** el mockup del hero enlaza a `/carniceria-a-la-estaca-3462-543210`, que en QA da **"Error cargando web"** (captura 12).
- **Propuesta:** definir la firma corporativa (¿se mantiene "una solución de AppPromos"?). En QA, apuntar el ejemplo a una vidriera QA existente o sembrarla.
- **Prioridad:** P2.

### 2. Crear carnicería / onboarding — 🟢 · `02-crear-carniceria-mobile.png`
- **Bien:** logo, Carniza con delantal, copy "Creá tu carnicería online", rojo Carnis.
- **Consistencia:** se ve con la fuente del sistema, mientras landing y app usan Kanit/Poppins. El título tiene otro peso y otro ritmo.
- **Propuesta:** cargar las mismas fuentes que la landing.
- **Prioridad:** P3.

### 3. Login — 🟢 · `03-app-entrada-mobile.png`
- **Bien:** "Ingresá a Carnis", logo, botón rojo, link a crear carnicería. Sin legacy.

### 4. Inicio — 🟢 · `04-inicio-superior-mobile.png`, `04b-inicio-inferior-mobile.png`, `04a-inicio-carga-previa-mobile.png`
- **Bien:** header con ícono Carnis, card de activación con Carniza y QR, botonera inferior clara.
- **Legacy:** footer global "© 2026 Carnis.app — una solución de AppPromos" (visible en 04a y en todas las secciones de la app).
- **Consistencia:** durante la carga aparece un header distinto ("Acciones rápidas para el mostrador" con chips Inicio / Cambiar precios / Vender), otro diseño que después desaparece (04a). El botón "WhatsApp" usa el verde de WhatsApp: correcto por ser marca externa.
- **Prioridad:** P2 (footer) · P3 (flash de carga).

### 5. Precios — 🟢 · `05-precios-mobile.png`
- **Bien:** banner rojo con Carniza, "Marcado = lo uso en Carnis".
- **Legacy (código, no capturado):** en modo demo muestra "Estás probando AppPromos. Estos cambios quedan solo en esta demo." (`prices-module.js`).
- **Prioridad:** P2.

### 6–8. Vender / Responder consulta / Crear promo — 🟢 · `06`, `06b`, `07`
- **Bien:** hoja inferior con tres caminos, títulos azul marino + rótulos rojos coherentes con Precios. Sin legacy visible.
- **Consistencia:** los botones "Inicio" y "← Cambiar modo" son grises planos, distintos a los botones con borde del resto (UX, no rebranding).

### 9. Promo del día (Carniza) — 🟡 · `08-promo-del-dia-carniza-mobile.png`
- **Bien:** Carniza como guía, avatar consistente.
- **Legacy:** el aviso dice "AppPromos no agrega otros productos automáticamente." (`app-main.js`).
- **Consistencia:** el header del modal es **azul marino sólido** (paleta anterior), mientras el resto de los encabezados son rojos o claros. El CTA principal es **verde**, no rojo.
- **Propuesta:** reemplazar por "Carnis no agrega…"; alinear el header del modal de Carniza con los banners rojos.
- **Prioridad:** P1 (texto) · P2 (color).

### 10. Promos (estado vacío) — 🟡 · `09-promos-vacio-mobile.png`
- **Bien:** banner Carniza, filtros.
- **Problema:** "Todavía no hay combos u ofertas guardadas. **Corré el seeder y volvé a entrar a la demo.**" Es un texto de desarrollo que ve un usuario real. "Combo demo" también en el subtítulo.
- **Propuesta:** estado vacío comercial ("Todavía no guardaste promos. Creá la primera desde Vender").
- **Prioridad:** P1. No es AppPromos literal, pero rompe la percepción de producto terminado.

### 11. Menú Más — 🟡 · `10-menu-mas-mobile.png`
- **Bien:** estructura clara; "Cerrar sesión" destacado.
- **Consistencia:** "INSTALAR" en mayúsculas y sin ícono propio, distinto al resto de las tarjetas.
- **Prioridad:** P3.

### 12. Mi cuenta — 🟡 · `11-mi-cuenta-mobile.png`
- **Bien:** datos claros, sin logo legacy.
- **Legacy (no visible en pantalla):** `aria-label="Mi cuenta AppPromos"`, que leen los lectores de pantalla. Los accesos de plan, pago y reactivación abren WhatsApp con "Hola AppPromos, quiero…" (`carniza-module.js`, `status-compact.js`).
- **Prioridad:** P2. Lo ve el cliente cuando escribe a soporte.

### 13. Mi carnicería online — 🟡 · `15-mi-carniceria-online-mobile.png`
- **Bien:** banner "Así ve tu carnicería un cliente", estados claros, selector de estilos.
- **Legacy:** "Marcá o desmarcá una oferta. **AppPromos** actualiza la vidriera automáticamente." (`web-module.js`).
- **Prioridad:** P1.

### 14. Centro de Impresiones — 🔴 · `14-centro-impresiones-mobile.png`, `14b-folletos-mobile.png`
- **Bien:** banner Carniza, tarjetas coherentes.
- **Legacy visible:** "Convertí la información que ya tenés en **AppPromos**…"; "**AppPromos** genera 8 folletos iguales…"; "…pegalo acá y AppPromos lo convierte en una comanda".
- **Legacy en salidas (código, `print-center-module.js`):** "Generado con AppPromos" en comanda, listas, carteles, QR y folletos; "Precios sujetos a modificación · Generado con AppPromos"; selector de modelos "Modelo 2 · AppPromos"; descargas `AppPromos-<nombre>.png` y `AppPromos-QR-<nombre>.png`; comanda sin nombre → "PEDIDO APPPROMOS"; error "No reconocimos un pedido de AppPromos".
- **Riesgo:** estas piezas **salen del local** (cartel en vidriera, folletos a clientes). Es la mayor exposición de la marca vieja.
- **Prioridad:** P1.

### 15. Cómo vender — 🔴 · `13-como-vender-mobile.png`
- **Bien:** favicon y título de pestaña Carnis; Carniza grande.
- **Legacy:** H1 "Tres maneras de vender con **AppPromos**", "AppPromos calcula el total", textos alternativos de imágenes, footer.
- **Consistencia:** logo Carnis minúsculo (~40 px) en el header; el botón "Ver A La Estaca online" probablemente lleva a la misma vidriera inexistente en QA.
- **Prioridad:** P1.

### 16. Vidriera pública — 🟢 · `16-vidriera-publica-qa-mobile.png`, `16-...-full.png`, `16b-...-desktop.png`
- **Bien:** título "Carnicería online | Carnis.app", favicon Carnis, cierre "Funciona con Carnis.app · Conocé Carnis.app →".
- **Consistencia:** sin logo propio aparece un avatar "CQ" en **azul marino** (paleta anterior); los botones "+" rojos con ícono marrón tienen bajo contraste.
- **Legacy (código):** botón "Volver a AppPromos" en la vista previa desde la app; nombres de clase `apppromos-signature` (internos, sin impacto).
- **Prioridad:** P3.

### 17. Vidriera ejemplo de la landing — 🔴 roto · `12-vidriera-publica-mobile.png`
- "Error cargando web": A La Estaca no existe en Firestore QA. Es un problema de datos QA, no de marca. Igual rompe el recorrido de la landing en QA.
- **Prioridad:** P2 (sólo QA).

---

## 4. Hallazgos transversales

- **Branding / logos:** los logos visibles ya son todos Carnis. Los PNG `assets/logo/apppromos-*` y `assets/pwa/apppromos-*` siguen en el repo; no se vieron en pantalla.
- **PWA:** 🟢 manifest "Carnis.app", íconos Carnis 192/512 + maskable, apple-touch Carnis, favicons Carnis en las 5 páginas. `theme_color` = `#0A2E5B` (azul marino): la barra del sistema del celular queda azul marino en la app instalada y en app.html, mientras landing y crear-carnicería usan rosado o rojo. **Hay que decidir el color de sistema de Carnis.**
- **Colores:** conviven el rojo Carnis (principal) y el **azul marino heredado** (títulos, modal de Carniza, avatar de vidriera, theme-color, franjas degradé rojo-azul arriba y abajo de la app). Los títulos azul marino funcionan como color secundario. El header sólido azul del modal de Carniza es lo que más desentona.
- **Tipografía:** la app y la landing usan Kanit/Poppins; crear-carniceria y cómo-vender caen en la fuente del sistema.
- **Microcopy:** unas 20 frases visibles con "AppPromos", concentradas en Impresiones, Cómo vender, Web y Promo del día. Todas se resuelven con cambio de texto.
- **Footer global de la app:** "Carnis.app — una solución de AppPromos". Es una decisión de marca: endoso corporativo o eliminarlo.
- **Carniza:** aparece en banners de cada sección, en onboarding, en el modal Promo del día y en cómo vender. **Ya se siente parte del producto.** Tamaño y posición son consistentes (arriba a la derecha de los banners rojos). Queda por revisar el `aria-label` "Carniza, vendedor de AppPromos" y el header azul del modal.
- **Soporte WhatsApp:** todos los mensajes precargados empiezan con "Hola AppPromos…".

## 5. Legacy técnico con impacto visible

| Elemento | Impacto |
|---|---|
| Nombres de archivos descargados `AppPromos-*.png` | El comerciante los ve en su celular o PC |
| Texto dibujado en canvas "Generado con AppPromos" (QR, folletos, carteles) | Queda impreso y a la vista del público |
| `aria-label` "Mi cuenta AppPromos" / "Carniza, vendedor de AppPromos" | Lo leen los lectores de pantalla |
| `theme_color #0A2E5B` en manifest y app.html | Barra del sistema azul marino en la PWA |
| Mensajes WhatsApp de soporte "Hola AppPromos" | Lo ve el comerciante al escribir |
| Datos QA sin vidriera A La Estaca | Landing y cómo vender llevan a un error en QA |

Sin impacto (no tocar): clases `apppromos-*`, claves `localStorage`, eventos `apppromos:*`, `SW_VERSION`, comentarios de versión.

## 6. Hallazgos UX fuera de alcance (no incluir en QA-03)

1. Flash de header distinto durante la carga de la app (04a).
2. Botones "Inicio / ← Cambiar modo" grises planos en Vender.
3. CTA verde "3. Armar Promo del día" frente a CTAs rojos en el resto.
4. Botón "+" de la vidriera con ícono de bajo contraste.
5. "INSTALAR" en mayúsculas en el menú Más.
6. Precios: filas con el campo de precio vacío y chip "No uso" podrían confundir (a validar con usuarios).

## 7. Mapa de intervención recomendado

- **R1 — Impresiones y salidas físicas** (P1): textos del Centro de Impresiones, "Generado con…", modelos, nombres de archivo PNG, errores del parser. Es la mayor exposición externa; un solo módulo.
- **R2 — Microcopy interno de la app** (P1): Mi carnicería online, Promo del día, estado vacío de Promos (texto del seeder), demo de Precios, labels accesibles.
- **R3 — Cómo vender** (P1): H1, textos, alts, logo del header.
- **R4 — Decisión de firma corporativa** (P2): footer "una solución de AppPromos" en app, landing y cómo vender; mensajes de soporte "Hola AppPromos". Requiere tu decisión antes de tocar.
- **R5 — Color de sistema y acentos azul marino** (P2): theme-color, header del modal de Carniza, avatar de la vidriera. También requiere decisión de paleta.
- **R6 — Datos QA** (P2, sin código): sembrar la vidriera ejemplo o apuntar la landing QA a una existente.
- **R7 — Tipografía onboarding** (P3).

**Decisiones abiertas para vos:** (a) ¿se mantiene "una solución de AppPromos" como endoso? (b) ¿el azul marino queda como color secundario de Carnis o se reemplaza?
