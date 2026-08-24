# AppPromos V12.18-C1 — Vidriera Mobile: navegación + productos compactos

Objetivo: mejorar la experiencia del comprador en celular sin cambiar la lógica comercial ya validada de la vidriera, carrito ni WhatsApp.

## Cambios

- Cabecera móvil sticky con nombre de la carnicería y acceso directo a WhatsApp.
- Navegación inferior fija en móvil con Productos, Ofertas, Carrito y WhatsApp.
- El Carrito muestra una insignia con la cantidad de ítems y se actualiza al agregar/quitar productos.
- Productos más compactos en móvil.
- El botón grande `Agregar` pasa visualmente a un botón circular `+` en móvil; en desktop conserva el comportamiento previo.
- Ofertas más compactas en pantallas chicas.
- El carrito flotante anterior se oculta en móvil para no duplicar navegación.
- Carniza flotante se oculta temporalmente en móvil para evitar que tape contenido; su nueva ubicación se resolverá en un subhito posterior.
- Se agrega `id="ofertas"` para navegación directa desde el panel inferior.

## No cambia

- Carga de datos / Firestore.
- Reglas de productos con precio > 0.
- Cálculo del carrito.
- Checkout.
- Texto y apertura del pedido por WhatsApp.
- Comportamiento desktop principal.

## Prueba mínima

1. Abrir una carnicería pública en un viewport móvil.
2. Ver cabecera superior fija al hacer scroll.
3. Probar Productos / Ofertas / Carrito / WhatsApp desde el menú inferior.
4. Confirmar que los productos se muestran compactos y el botón `+` agrega al carrito.
5. Confirmar que el badge del carrito cambia al agregar/quitar.
6. Abrir carrito y completar un pedido.
7. Enviar por WhatsApp.
8. Revisar consola sin errores.
9. Revisar desktop para confirmar que no se degradó.
