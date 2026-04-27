# TESTING CHECKLIST — V11.4.1

## Objetivo

Validar registro normalizado, billing UX, CompanyAdmin y estabilidad general antes de aprobar deploy como nueva base estable.

## 1. Registro nuevo desde cero

- Abrir landing.
- Ir a Registrarse.
- Completar carnicería, responsable, email y password.
- Escribir localidad parcial, por ejemplo `Venado`.
- Seleccionar localidad del autocomplete.
- Confirmar que provincia se completa sola.
- Completar teléfono con formato sucio, por ejemplo `03462 15 123456`.
- Crear carnicería.
- Confirmar que entra a la app.

Verificar en Firestore:

- `businesses/{businessId}` existe.
- `users/{uid}` existe.
- `core/meta` existe.
- `core/state` existe.
- `phone`, `phoneE164`, `phoneKey`, `rawPhone` existen.
- `locality`, `localityKey`, `province`, `provinceId` existen.
- `billing.plan = trial`.
- `billing.status = active`.
- `trialEndsAt` existe.
- `core/state.products` fue clonado desde DEMO.

## 2. Teléfono duplicado

- Intentar registrar otra carnicería con el mismo teléfono en otro formato.
- Debe bloquear con mensaje de teléfono ya usado.

## 3. Localidad inválida

- Escribir localidad manual sin seleccionar sugerencia.
- Intentar crear.
- Debe pedir localidad válida/provincia automática.

## 4. CompanyAdmin crear empresa

- Entrar como superadmin.
- Crear empresa desde CompanyAdmin.
- Seleccionar localidad.
- Confirmar provincia automática.
- Confirmar root business con billing, módulos y geo.

## 5. CompanyAdmin clonar empresa

- Clonar desde DEMO u otra empresa.
- Confirmar datos geo/teléfono normalizados.
- Confirmar `core/state` clonado.

## 6. Billing UX

- Marcar una empresa como `billing.status = overdue`.
- Entrar como cliente.
- Confirmar que puede consultar módulos.
- Intentar guardar precios/combo/web.
- Debe bloquear guardado por WriteGuard.

## 7. No regresión crítica

- Login cliente existente.
- Login superadmin.
- DEMO sigue accesible.
- Precios carga.
- Combos carga.
- WhatsApp carga.
- Web Premium carga.
- Competencia carga.
- No aparecen errores de consola críticos.

## Resultado

Si todo pasa:

```txt
V11.4.1 deploy probado y aprobado = nueva base estable.
```
