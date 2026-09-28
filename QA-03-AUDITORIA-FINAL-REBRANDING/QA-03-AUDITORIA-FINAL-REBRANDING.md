# QA-03 — Auditoría visual final post-rebranding

**Fecha:** 28/09/2026 · **Checkpoint:** `edea21a` (qa: eliminar flash de navegacion superior en mobile)
**Entorno:** https://apppromos-qa.web.app · sesión QA "Carniceria QA" · viewport 390×844
**Sin cambios:** no se modificó ningún archivo de la app, ni hubo commit, push ni deploy.

## Método

- **Pantallas públicas** (landing, crear carnicería, login, cómo vender, vidriera, carrito, arranque): capturas reales tomadas con Chromium a 390×844.
- **Pantallas internas:** capturas del navegador de la app de escritorio con la sesión QA. A mitad del recorrido el navegador dejó de pintar las capturas. Para Mi carnicería online, Impresiones y sus herramientas verifiqué **los textos visibles leyendo el DOM en vivo**, solo nodos visibles en pantalla, y además revisé el código desplegado en QA.
- **Piezas de impresión** (lista, cartel, QR, folleto, ticket): no se generaron. QA no tiene ofertas publicadas y el ticket requiere pegar un pedido real. Su contenido se verificó en el código desplegado.
- **Carrito:** se abrió vacío y **no se envió** ningún pedido por WhatsApp.

## Conclusión

# NO-GO

El lenguaje visual ya es Carnis en toda la app: Poppins, blanco, rojo y azul marino, paneles unificados, iconografía SVG y navegación inferior. **La marca AppPromos sigue visible en textos y en piezas que salen del local.** Las etapas B, C1, C2 y C3 fueron visuales por decisión, y la microcopy quedó pendiente desde la auditoría inicial (R1 a R4). Esa es la brecha que falta cerrar.

## Tabla por pantalla

| # | Pantalla | Estado | Qué quedó | Prioridad | Acción propuesta |
|---|---|---|---|---|---|
| 0 | Arranque (mobile) | 🟡 | **Ya no aparece la barra de navegación superior** (`nav-shell` = none en todas las muestras, desde ~600 ms). Siguen apareciendo la tarjeta de marca grande y el pie "una solución de AppPromos" hasta que resuelve la sesión | P2 | Pie: se resuelve junto con A3. Tarjeta grande: observación aparte |
| 1 | Landing | 🟡 | Pie "Una solución de AppPromos". El ejemplo "A La Estaca" sigue llevando a "Error cargando web" en QA | P2 | Definir el endoso (A3). Dato QA (D) |
| 2 | Crear carnicería | 🟢 | Carnis + Carniza. Fuente del sistema, distinta a Poppins | P3 | B |
| 3 | Login | 🟢 | Referencia de marca. Nada que corregir | — | — |
| 4 | Inicio | 🟡 | Visual Carnis y SVG. Botón "Mostrar QR" violeta (icono azul sobre texto violeta). Pie AppPromos | P2 | A3 + B |
| 5 | Precios | 🟢 | Encabezado SVG, Carnis. "Estás probando AppPromos" solo en demo (no visible con cuenta real) | P2 | A1 (texto demo) |
| 6 | Menú Vender | 🟢 | Panel C2 + SVG `bolt`/`tag`/`sell`. Textos verde/naranja/rojo conservados por decisión | — | — |
| 7 | Responder consulta | 🟢 | Botones secundarios Carnis | — | — |
| 8 | Crear promo/combo | 🟢 | Paso activo y "Rubro opcional" en naranja (familia naranja sin decisión) | P3 | Decisión naranja |
| 9 | Promo del día | 🔴 | **"AppPromos no agrega otros productos automáticamente."** Contenido interno marrón/naranja (sin decisión) | P1 | A1 |
| 10 | Promos (vacío) | 🟡 | **"Corré el seeder y volvé a entrar a la demo."** Texto de desarrollo visible, sin marca AppPromos | P1 | A2 |
| 11 | Menú Más | 🟢 | SVG consistentes. "INSTALAR" en mayúsculas con el icono arriba del texto. "Panel AppPromos" solo para superadmin | P3 | B |
| 12 | Mi cuenta | 🟢 | Contenedor C2. `aria-label` "Mi cuenta AppPromos" (no visible, lo leen los lectores de pantalla) | P3 | B |
| 13 | Mi carnicería online | 🔴 | **"Marcá o desmarcá una oferta. AppPromos actualiza la vidriera automáticamente."** | P1 | A1 |
| 14 | Estilos de vidriera | 🟢 | Modal C2 (verificado en código, no capturado) | — | — |
| 15 | Centro de Impresiones | 🔴 | **"Convertí la información que ya tenés en AppPromos…"**, **"Modelo 2 · AppPromos"** (listas y cartel), **"…AppPromos lo convierte en una comanda"**, **"AppPromos genera 8 folletos"** | P1 | A1 |
| 15b | Piezas impresas y descargas | 🔴 | **"Generado con AppPromos"** en comanda, lista, cartel, QR y folletos (también dibujado en los PNG). Archivos **`AppPromos-<nombre>.png`** / **`AppPromos-QR-…png`**. Comanda sin nombre: **"PEDIDO APPPROMOS"** | P1 | A1 |
| 16 | Cómo vender | 🔴 | **H1 "Tres maneras de vender con AppPromos"**, "AppPromos calcula el total", textos alternativos de imágenes, pie. Logo del encabezado diminuto. "Ver A La Estaca online" lleva a una vidriera inexistente en QA | P1 | A4 |
| 17 | Carniza (menú de opciones) | 🟢 | SVG y panel C2. Tarjetas con fondo tintado naranja/verde | P3 | B |
| 18 | Estado de cuenta | 🔴 | **"Estás probando AppPromos con acceso completo…"**. Círculo de avatar de "La Nelly" vacío | P1 | A1 · D |
| 19 | Vidriera pública QA | 🟢 | "Funciona con Carnis.app", sin AppPromos. Avatar "CQ" azul marino | P3 | — |
| 20 | Carrito / pedido | 🟢 | Carnis. "Enviar pedido" en verde WhatsApp. No se envió nada | — | — |
| — | Pie global de la app | 🔴 | **"© 2026 Carnis.app — una solución de AppPromos"** en todas las secciones internas y durante el arranque | P1/P2 | A3 |
| — | Mensajes de soporte WhatsApp | 🟡 | "Hola AppPromos, quiero…" en los mensajes precargados de planes y regularización (lo ve el comerciante al abrir WhatsApp) | P2 | A3 |

Capturas en `capturas/`. Las pantallas 13, 14 y 15 no tienen captura por la falla del navegador; su texto quedó verificado en vivo en el DOM.

## A. Obligatorio antes de cerrar QA-03

Todos son **textos visibles**, sin cambios de estilo ni de lógica:

1. **Microcopy AppPromos → Carnis en la app:**
   - Promo del día (`app-main.js`:629).
   - Mi carnicería online (`web-module.js`:151).
   - Estado de cuenta (`access-control-service.js`, "Estás probando AppPromos…").
   - Modo demo de Precios (`prices-module.js`:68, 304, 1356).
   - Banner de demo (`app-main.js`:300–311).
   - Ayuda para subir foto (`app-main.js`:2710).
2. **Promos vacío:** reemplazar el texto del seeder por un mensaje comercial (`saved-module.js`).
3. **Decisión de endoso + aplicación:** "una solución de AppPromos" en el pie de la app (`app.html`:85), en la landing (`index.html`:419) y en Cómo vender. Lo mismo para "Hola AppPromos…" en los mensajes de soporte (`carniza-module.js`, `status-compact.js`).
4. **Cómo vender:** H1 y textos (`como-vender.html`).
5. **Centro de Impresiones y piezas** (`print-center-module.js`): textos de la pantalla, "Modelo 2 · AppPromos", "Generado con AppPromos" (texto y canvas), nombres de archivo `AppPromos-*.png`, "PEDIDO APPPROMOS" y el mensaje de error del parser.

   **Cuidado:** `parseAppPromosOrder` y las validaciones de URL son lógica, no se tocan. Solo se cambian las cadenas visibles.

## B. Recomendado, no bloqueante

- Botón "Mostrar QR" violeta en Inicio: pasarlo a secundario Carnis.
- Crear carnicería y Cómo vender en Poppins. Logo de Cómo vender más grande.
- Tarjetas tintadas del menú de Carniza.
- Ítem "INSTALAR" (mayúsculas e icono arriba).
- `aria-label` "Mi cuenta AppPromos" y "Carniza, vendedor de AppPromos".
- "Panel AppPromos" (solo superadmin).
- Tarjeta de marca grande durante el arranque.

## C. Deuda técnica — NO hacer ahora

- C4: estilos inyectados desde JS y ~430 estilos inline.
- Secciones legacy de `carnis.css` (capa de marca vieja).
- CSS sin uso: `design-system.css`, `app-brand-refresh.css`, `carnis-ui.css`, etc.
- Nombres internos `apppromos-*`, clases, eventos y claves.
- `SW_VERSION`, `console.info` "AppPromos Firestore reads".
- Logos AppPromos sin uso en `assets/logo` y `assets/pwa`.

## D. Fuera del rebranding

- La vidriera ejemplo "A La Estaca" no existe en Firestore QA ("Error cargando web" desde la landing y desde Cómo vender).
- Círculo de avatar vacío de "La Nelly" en el modal de estado de cuenta.
- Emojis que vuelven después de algunas acciones (textos de feedback acordados).
- Familia de colores naranja/marrón sin decisión (Promo del día, Crear promo, avisos).
- Resumen "Publicadas hoy": el icono quedó a la izquierda y el título centrado.

## Veredicto

**NO-GO.** Para dar el rebranding por cerrado hay que corregir los cinco puntos de la lista A. Son todos cambios de texto visible. El más importante es el Centro de Impresiones, porque "Generado con AppPromos" sale impreso y en las imágenes que el comerciante comparte con sus clientes.
