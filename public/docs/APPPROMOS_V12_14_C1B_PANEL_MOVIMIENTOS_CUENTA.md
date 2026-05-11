# AppPromos V12.14-C1B — Panel con movimientos reales de cuenta corriente

## Objetivo

Conectar la tabla de cuenta corriente del Panel Admin con movimientos reales persistidos en Firestore.

## Qué conecta

- Lee `businesses/{businessId}/billingMovements`.
- Muestra movimientos reales si existen.
- Mantiene fallback visual si todavía no hay movimientos reales.
- Registra movimiento cuando se genera un link Mercado Pago.
- Registra movimiento cuando se marca pago manual.

## Movimientos generados

### Link Mercado Pago

Tipo: `mp_link_created`

- Débito: importe del link MP.
- Crédito: 0.
- Guarda período, preferenceId, externalReference e initPoint.

### Pago manual

Tipo: `manual_payment`

- Débito: 0.
- Crédito: saldo/importe estimado.
- Actualiza la tabla real de movimientos.

## Qué NO hace todavía

- No concilia webhooks de Mercado Pago.
- No genera cargos mensuales masivos.
- No automatiza cortes ni suspensiones.
- No toca backend Mercado Pago.
- No toca app del carnicero.

## Próximos pasos posibles

V12.14-C2:

- Registrar movimiento al cargar último link si no existe.
- Evitar duplicados por externalReference.
- Agregar botón Ajuste / Bonificación.
- Agregar cierre mensual manual.
