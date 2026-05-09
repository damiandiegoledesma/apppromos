# AppPromos V12.14-C1A — Movimientos persistidos de cuenta corriente

## Objetivo

Crear los servicios mínimos para guardar y leer movimientos reales de cuenta corriente por carnicería.

## Colección

`businesses/{businessId}/billingMovements/{movementId}`

## Servicios agregados

### `listBusinessBillingMovements(businessId, options)`

Lee movimientos persistidos de una carnicería.

### `recordBusinessBillingMovement(businessId, movement)`

Guarda un movimiento nuevo y actualiza el saldo visual persistido en el root de la carnicería.

## Tipos previstos

- `charge_created`
- `mp_link_created`
- `manual_payment`
- `mp_payment_confirmed`
- `bonus`
- `adjustment_debit`
- `adjustment_credit`
- `note`

## Campos principales

- `date`
- `description`
- `debit`
- `credit`
- `balanceBefore`
- `balanceAfter`
- `source`
- `periodKey`
- `mpPreferenceId`
- `mpExternalReference`
- `createdAt`

## Qué NO hace este hito

- No conecta todavía la UI.
- No registra todavía movimientos al generar link MP.
- No registra todavía pagos manuales.
- No concilia webhooks de Mercado Pago.
- No genera cargos mensuales masivos.
- No toca la app del carnicero.

## Próximo paso

V12.14-C1B:

- importar estos servicios en `admin-users-module.js`;
- leer movimientos reales al abrir ficha;
- mostrar movimientos reales si existen;
- registrar movimiento al generar link MP;
- registrar movimiento al marcar pago manual.
