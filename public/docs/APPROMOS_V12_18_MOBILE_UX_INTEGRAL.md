# AppPromos V12.18-MOBILE-UX Integral

## Alcance
Un único archivo funcional: `public/web.html`.

## Cambios
- Targets táctiles críticos >=44px en mobile.
- Inputs del checkout a 16px / 44px.
- Carrito mobile en una columna.
- Botones + / - / quitar con etiquetas accesibles.
- Agregar producto/oferta conserva el + compacto, con aria-label/title.
- Dirección se oculta en Retiro y aparece en Envío.
- Validación de nombre/teléfono/dirección inline, con foco al primer error.
- Nav inferior muestra cantidad y total del carrito.
- CTA final muestra `Pedir · $TOTAL`.
- Safe-area/scroll-padding reforzados.

## Preservado
No se crea otro carrito ni otra navegación. Se preservan `cartItems`, `addCartItem`,
`changeCartItem`, `removeCartItem`, `saveCartItems`, `sendCartOrder` como flujo base,
la persistencia existente y el armado actual del mensaje WhatsApp.

## Fuera de alcance
QA-PROD-01 (logo/foto no cargan en producción) y QA-PROD-02 (Carniza tapa nav)
se diagnostican aparte.
