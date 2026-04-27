# AppPromos — Versión actual estable

## Versión base aprobada

**AppPromos V11.4.1B — Registro normalizado + Billing comercial + WriteGuard real**

## Estado

- Deploy realizado.
- Prueba funcional realizada.
- Validada como nueva base estable.

## Base técnica consolidada

Esta versión consolida:

- V11.4R Reconciliación Real FULL.
- V11.4.1 Registro Normalizado + Modelo Central.
- Patch V11.4.1A UX billing/status + ayudas visuales Admin.
- Patch V11.4.1B bloqueo real de guardado y navegación segura en módulos bloqueados.

## Validación funcional

- Cliente activo: entra, consulta y guarda correctamente.
- Cliente con pago pendiente: entra y consulta, pero no guarda precios ni ofertas.
- Cliente suspendido: entra a Inicio, ve mensaje claro, WhatsApp AppPromos y módulos bloqueados con botón Volver a Inicio.
- Superadmin: inicia por DEMO, administra estados desde Admin y al entrar a una empresa ve la misma lógica comercial del cliente.

## Decisiones clave vigentes

- DEMO sigue siendo template operativo actual.
- `catalogs/baseProducts/items` queda como catálogo formal futuro, todavía no fuente completa.
- El registro nuevo normaliza teléfono, localidad y provincia.
- El sistema prioriza UX comercial: acompañar al cliente para que compre o regularice, no expulsarlo.
- La interfaz del carnicero no debe mostrar términos técnicos como Firestore, backend, SaaS, tenant, billing, etc.

