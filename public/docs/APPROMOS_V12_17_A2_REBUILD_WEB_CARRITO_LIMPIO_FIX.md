# AppPromos V12.17-A2 REBUILD — Web carrito limpio FIX

## Objetivo
Dejar `public/web.html` operativo con carrito simple, checkout y pedido por WhatsApp, partiendo de la web estable.

## Corrección aplicada
- Se evita el uso de template literals anidados como fallback en IDs de combos/productos.
- Se mantiene el bloque `carnizaAttrs` separado para no romper el template literal principal.
- Se conserva el carrito limpio:
  - agregar productos y combos al pedido;
  - ver total estimado;
  - datos del cliente;
  - retiro/envío;
  - efectivo/transferencia;
  - aclaración;
  - envío del pedido por WhatsApp.

## Test mínimo
1. Abrir web pública por slug.
2. Agregar un combo al pedido.
3. Agregar un producto al pedido.
4. Sumar/restar/quitar.
5. Completar nombre y teléfono.
6. Probar retiro + efectivo.
7. Probar envío + dirección + transferencia.
8. Abrir WhatsApp y revisar texto.
