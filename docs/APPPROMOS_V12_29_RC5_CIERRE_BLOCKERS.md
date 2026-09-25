# AppPromos V12.29 RC5 — Cierre de blockers RC4

Fecha: 2026-09-21
Base: RC4 SHA-256 8ea8234506a3c23f270fdbdd6877e24f0d09a4e3ee1b1dcb40b6bf4381fdac05

## Objetivo
RC5 es quirúrgica. No agrega features. Cierra los hallazgos convergentes de Claude/Gemini y reduce riesgo antes de producción.

## Cambios
1. Billing legado: el fallback sin `writeAccessUntil` expira el 2026-10-15 mediante `request.time < timestamp.date(2026, 10, 15)`. Antes de esa fecha todas las cuentas deben migrarse con `writeAccessUntil` explícito.
2. Aliases: `resolveWebSource()` sigue cadenas históricas hasta 4 saltos, valida `businessId`, detecta ciclos y falla explícitamente si supera el límite. No usa snapshots de precios.
3. Superadmin: el cliente deja de aceptar `users.role=superadmin` como autoridad. `admins/{uid}` queda como única fuente, alineada con Firestore Rules. NO se agregó email/UID hardcodeado a reglas.
4. Landing pre-DNS: los enlaces estáticos de A La Estaca vuelven temporalmente a `apppromos.web.app/{slug}`. No se publicará una landing dependiente de `carnis.app` hasta que DNS+SSL estén verificados.
5. Slug productivo: el literal existente de A La Estaca NO se considera confirmado. Debe leerse de Firestore producción antes del deploy final.

## Hallazgos externos que requieren revalidación
- Secuestro de slug (Gemini): RC4 ya exige en UPDATE conservar `businessId`, y CREATE no puede sobrescribir un documento existente. Pedir auditoría adversarial explícita antes de modificar reglas innecesariamente.
- Tracking duplicado (Gemini): el flujo actual resuelve `resolveWebSource()` y luego llama una sola vez a `renderWeb(payload)`, donde se registra la visita. Claude no pudo verificar la escritura gRPC-Web. Requiere prueba dinámica específica.

## P0 operacional: superadmin
NO desplegar reglas hasta verificar manualmente en producción `admins/{UID_REAL}` con `active: true` y `role: "superadmin"`. Si el acceso al Centro de Control falla antes o después del deploy de reglas, detener el procedimiento.

## Orden seguro propuesto
1. Leer/respaldar datos productivos necesarios y confirmar slug real de A La Estaca.
2. Confirmar UID real del superadmin.
3. Crear/verificar `admins/{uid}` por Firebase Console/Admin SDK.
4. Probar Centro de Control con reglas actuales.
5. Desplegar reglas RC5.
6. Volver a probar Centro de Control.
7. Migrar/reparar billing de TODAS las cuentas existentes con `writeAccessUntil` explícito.
8. Probar guardado real de A La Estaca.
9. Desplegar Hosting manteniendo enlaces públicos estáticos en `apppromos.web.app`.
10. QA histórico completo.
11. Conectar `carnis.app`, esperar DNS+SSL y probarlo directamente.
12. En un deploy posterior mínimo, cambiar CTAs estáticos de landing a `carnis.app/{slug-real}`.
13. QA cruzado de ambas URLs.

## No incluido
No se tocaron publicSignals pendientes, Open Graph, imágenes WebP, selector inicial de productos ni otras deudas no bloqueantes.
