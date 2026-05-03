# Panel Admin — Planes, pagos y notas internas

Documento de respaldo para el bloque **V12.10-B2-D — Planes, pagos y notas internas mínimo**.

## Objetivo

Permitir que el administrador de AppPromos pueda operar lo básico de cada cliente sin depender de memoria ni de datos técnicos:

- qué plan tiene;
- en qué situación de pago está;
- cuándo vence o cuándo conviene volver a escribirle;
- qué nota interna hay que recordar antes de tocar el acceso o la cobranza.

Este bloque no automatiza cobranzas y no reemplaza un sistema contable. Es una capa operativa mínima para gestión comercial.

## Planes visibles

Los planes comerciales vigentes para administración son:

- **Prueba gratis**: acceso inicial sin costo, orientado a conversión.
- **ARRANQUE**: plan de entrada para vender rápido por WhatsApp.
- **SALVADOR**: plan core recomendado para anti-merma y venta urgente.
- **DUEÑO**: plan superior, pensado para mirar mercado, cuidar precios y personalizar la web.

Regla comercial definida:

> Todos los planes tienen web propia. DUEÑO tiene web personalizada.

## Estados de pago

Los estados humanos usados en el Panel Admin son:

- **Al día**: no hay alerta de cobranza cargada.
- **Pendiente**: hay una situación a conversar, pero no necesariamente vencida.
- **Vencido**: hay un pago o regularización vencida.
- **Suspendido**: la cuenta está pausada por cobranza.
- **Bonificado / manual**: caso especial manejado por AppPromos; revisar nota interna antes de cobrar, pausar o cambiar estado.

## Próximo vencimiento / fecha de pago

El campo de próximo vencimiento sirve para seguimiento manual. Puede representar:

- fecha de fin de prueba;
- fecha de próximo pago;
- fecha pactada para volver a escribir;
- fecha de control comercial.

No dispara mensajes automáticos en este bloque.

## Marcar pago recibido

La acción **Marcar pago recibido** debe:

- poner el pago como **Al día**;
- registrar la fecha actual como último pago;
- mantener o actualizar el próximo vencimiento si fue cargado;
- dejar un registro en `adminActions`.

No borra datos, no toca Auth y no cambia la empresa de TEST a real.

## Nota interna

La nota interna es solo para administración. No la ve el carnicero.

Ejemplos útiles:

- “Cliente amigo, avisar antes de pausar.”
- “Quiere pasar a Salvador cuando termine la prueba.”
- “Lo contacté por WhatsApp el 03/05.”
- “Bonificado por demo comercial.”

## Qué NO hace este bloque

No incluye:

- automatización de WhatsApp 48/72 hs antes;
- cobranza automática;
- pasarela de pago;
- backend Python;
- borrado real de usuarios Auth;
- usuarios adicionales;
- numeración interna AppPromos;
- Web automática desde registro;
- reportes pesados.

## Regla de UX

El Panel Admin debe ayudar a decidir rápido, no solo mostrar etiquetas.

Cada estado debe responder:

1. qué significa;
2. qué acción conviene tomar;
3. qué dato humano hay que mirar antes de tocar algo sensible.
