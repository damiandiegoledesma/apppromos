# AppPromos V12.14-B2 — Cuenta corriente con tabla real

## Objetivo

Agregar una primera tabla visual de cuenta corriente en la ficha del cliente.

## Tabla agregada

- Fecha
- Movimiento
- Débito
- Crédito
- Saldo

## Alcance

Esta versión usa datos ya disponibles en el Panel Admin:

- estado de pago;
- plan;
- vencimiento;
- último pago;
- último link Mercado Pago;
- importe del link si está cargado;
- importe estimado por plan si no hay link.

## Límites

No es todavía una cuenta corriente persistida real.

No crea subcolección de movimientos.
No concilia webhooks.
No aplica pagos automáticos.
No toca backend Mercado Pago.
No toca app del carnicero.

## Próximo hito

V12.14-C — Movimientos reales persistidos:

- cargo mensual;
- link MP generado;
- pago manual;
- pago MP confirmado;
- bonificación;
- ajuste;
- saldo persistido.
