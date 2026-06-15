# AppPromos V12.16-A1 - WhatsApp saliente premium base

## Objetivo

Unificar el formato de mensajes salientes de WhatsApp desde el carnicero hacia sus clientes compradores.

El mensaje de WhatsApp es la cara del carnicero frente al cliente. Debe verse claro, comercial y confiable.

## Cambios

- Nuevo servicio comun: `public/js/services/whatsapp-message-service.js`.
- Oferta rapida usa el nuevo formato.
- Oferta con descuentos usa el nuevo formato.
- Promos guardadas usa el nuevo formato.
- Panel WhatsApp reutiliza el mismo formato.
- Se pasan datos reales de la carniceria como `businessMeta`.

## Reglas comerciales

- Saludo separado.
- Titulo separado.
- Productos en lineas.
- Iconito representativo por rubro/producto.
- Total separado.
- Cierre comercial simple.
- Pie con datos de la carniceria.
- Nada de "liquidacion" hacia el cliente final.
- Nada de explicacion de descuentos aplicados en WhatsApp.

## Fuera de alcance

No toca Admin cobranzas, Mercado Pago, Auth, Firebase rules, Precios, Redondeos, Helpers verticales ni logica de descuentos.
