# AppPromos V12.19-A — Tres maneras de vender

## Objetivo

Ordenar la experiencia comercial de Promos para que el carnicero distinga tres necesidades reales:

1. **Responder una consulta:** combinación puntual pedida por un cliente; se calcula y se responde por WhatsApp, sin guardarse.
2. **Vender urgente:** mercadería que debe salir hoy antes de perderla o mandarla a picar; se envía o copia, sin guardarse como combo permanente.
3. **Crear promo o combo:** estrategia comercial reutilizable; se guarda, puede publicarse y puede compartirse.

## Decisión funcional

No todas las ofertas deben guardarse. El Centro de Promos futuro debe reservarse para promociones y combos pensados para repetirse.

## Cambios visibles

- `Oferta rápida` pasa a mostrarse como **Responder una consulta**.
- `Oferta con descuentos` pasa a mostrarse como **Crear promo o combo**.
- `Vender urgente` conserva su nombre y explica que es una acción puntual.
- Se ajustan accesos, ayudas, CTA y mensajes contextuales para reflejar la finalidad de cada flujo.

## Compatibilidad mantenida

- Los modos internos continúan siendo `quick` y `discount`.
- No cambia `savedCombos`.
- No cambia `saveCombo()`.
- No cambian Firebase, Firestore rules, Storage ni resolveSession.
- No cambian BusinessStore, billing ni control de acceso.
- No cambian snapshot público, web pública, carrito ni estructura de WhatsApp.
- Responder una consulta y Vender urgente continúan sin guardado automático.
- Crear promo o combo conserva el guardado existente.

## Archivos modificados

- `public/app.html`
- `public/js/app-main.js`
- `public/js/modules/builder-module.js`
- `public/js/modules/carniza-module.js`
- `public/js/modules/dashboard-module.js`
- `public/js/modules/web-module.js`
- `public/js/modules/whatsapp-module.js`
- `public/docs/CURRENT_VERSION.md`
- `public/docs/CHANGELOG.md`

## Fuera de alcance

- Centro de Promos completo.
- Editar, duplicar, archivar o eliminar promociones.
- Publicar Vender urgente por tiempo limitado.
- Categorías persistidas.
- Promociones modelo para clientes reales.
- PDF y videos de Carniza.

## QA requerido

1. Responder una consulta con 2 o 3 productos y confirmar que no se guarda.
2. Generar Vender urgente, copiar/enviar y confirmar que no se guarda.
3. Crear promo o combo, guardarlo y verificar Promos guardadas.
4. Compartir la promo por WhatsApp.
5. Publicarla desde Mi carnicería online.
6. Verificar web pública, componentes, carrito y pedido final.
7. Probar accesos desktop y mobile.
8. Verificar demo, cuenta con escritura bloqueada y consola limpia.

## FIX1 — Accesos coherentes

- Agrega **Vender urgente** como tercera tarjeta de “Tres maneras de vender”.
- La tarjeta abre el Liquidador existente de Carniza sin duplicar lógica.
- Promueve **Promos** a la navegación inferior mobile.
- Traslada el acceso al panel general de **WhatsApp** dentro de “Más”.
- Mantiene cinco destinos en la navegación inferior para no apretar la interfaz en 360 px.
