# AppPromos V12.22-A2 — 90 días sin cargo

## Objetivo

Dar a cada carnicería nueva 90 días de acceso completo sin cargo desde la fecha de registro.

## Alcance

- El registro público y la creación desde Panel Admin usan `createTrialEndsAt()`.
- La duración predeterminada cambia de 30 a 90 días.
- La landing y el registro informan “90 días sin cargo” y “Sin tarjeta”.
- Las fechas ya guardadas en `billing.trialEndsAt` no se recalculan ni migran.
- A La Estaca conserva su acceso actual.
- Demo y empresas Test no forman parte de la campaña ni del conteo comercial.
- La campaña se desactivará manualmente al alcanzar 50 carnicerías reales.

## Sin cambios

- Firebase Rules.
- `resolveSession`.
- `BusinessStore`.
- `WriteGuardService`.
- Estados de acceso, vencimiento, mora o suspensión.
- Backend Python y Mercado Pago.

## QA mínimo

1. Registrar una carnicería nueva en emuladores.
2. Confirmar `billing.plan = "trial"`.
3. Confirmar que `billing.trialEndsAt` sea aproximadamente 90 días posterior a `trialStartedAt`.
4. Confirmar que puede entrar, usar módulos y guardar.
5. Confirmar que una carnicería existente conserva su `trialEndsAt`.
6. Confirmar los textos de 90 días en landing y registro.
