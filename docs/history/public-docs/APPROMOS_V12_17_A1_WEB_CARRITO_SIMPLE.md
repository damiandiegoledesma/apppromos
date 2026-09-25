# AppPromos V12.17-A1 — Web Arranque con carrito simple

## Objetivo

Agregar carrito simple a la Web Arranque pública para que el cliente pueda armar un pedido desde la vidriera online y enviarlo por WhatsApp al carnicero.

## Alcance

Se toca:

- `public/web.html`

Se agrega:

- botones `Agregar al pedido` en ofertas activas;
- botones `Agregar` en productos con precio real;
- sección `Tu pedido`;
- sumar/restar/quitar ítems;
- total estimado;
- nombre del cliente;
- dirección o aclaración;
- envío del pedido por WhatsApp.

## Reglas

- No se agrega pago online.
- No se toca Firebase/Auth.
- No se toca Crear oferta.
- No se toca Panel Admin.
- No se publican productos sin precio.
- El pedido se cierra por WhatsApp.

## Mensaje de pedido

El mensaje debe incluir:

- nombre de la carnicería;
- productos/ofertas elegidas;
- cantidades;
- total estimado;
- nombre del cliente;
- dirección o aclaración;
- aviso de precios sujetos a disponibilidad.

## Testing mínimo

1. Abrir una web pública por slug.
2. Agregar una oferta al pedido.
3. Agregar un producto con precio al pedido.
4. Sumar/restar cantidades.
5. Quitar un ítem.
6. Completar nombre y aclaración.
7. Enviar pedido por WhatsApp.
8. Validar mensaje limpio y ordenado.
9. Validar consola sin errores rojos nuevos.
