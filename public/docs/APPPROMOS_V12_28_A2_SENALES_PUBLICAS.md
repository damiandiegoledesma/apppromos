# AppPromos V12.28-A2 - Señales comerciales públicas

## Objetivo

Completar la cronología comercial con señales anónimas de la vidriera pública y
con eventos internos que faltaban, sin almacenar datos del comprador final.

## Señales públicas

- `external_storefront_visit`: una visita externa válida a la vidriera.
- `public_order_whatsapp_started`: inicio del envío de un pedido por WhatsApp.

Las señales se guardan en `businesses/{businessId}/publicSignals` y son
inmutables. El dueño y el superadmin quedan excluidos antes de escribir. Ante
una sesión indeterminada, la captura falla de forma cerrada y no cuenta visita.

La deduplicación usa negocio, tipo de señal, día y un identificador aleatorio
local del navegador. No representa una persona y no se comparte entre sitios.

## Privacidad

Las reglas solo aceptan:

- cantidad de ítems;
- indicador de que el pedido incluye una promo;
- indicador de que incluye una Promo del día.

No se admite nombre, teléfono, dirección, texto, carrito ni contenido del
pedido. Los documentos no pueden modificarse ni eliminarse desde clientes.

## Eventos internos agregados

- `business_identity_completed`;
- `offer_shared`;
- `daily_promo_created`.

La identidad se considera completa cuando existen datos básicos, logo y foto
del frente. Se registra una sola vez por carnicería.

## Centro de Control

La línea de tiempo administrativa combina eventos internos con señales
públicas. Las señales externas se muestran como anónimas y no exponen PII.

## QA local

El seed A2 agrega a `qa-completa` una visita externa y un inicio de pedido, y
verifica que ambos existan y que sus metadatos no contengan claves de PII.

La exclusión de dueño y superadmin se valida navegando la URL pública con esas
sesiones y comprobando que no aparezca una nueva señal.
