# Prompt para nuevo hilo — AppPromos V11.4.1B

Estoy desarrollando un SaaS llamado AppPromos orientado a carnicerías.

En el siguiente mensaje voy a subir el repositorio completo del proyecto en formato `.zip`.

## Versión base actual aprobada

**AppPromos V11.4.1B — Registro normalizado + Billing comercial + WriteGuard real**

## Estado

- Deploy realizado.
- Probado.
- Aprobado como nueva base estable.
- Repo FULL consolidado, sin archivos `__backup` dentro del repo activo.

## Contexto clave del sistema

- Firebase Auth + Firestore.
- Firebase Hosting.
- Multi-tenant: 1 usuario cliente = 1 carnicería.
- HTML + JS modular, sin frameworks.
- Arquitectura basada en:
  - resolveSession
  - BusinessStore
  - BusinessService
  - AccessControlService
  - WriteGuardService
- Admin SaaS dentro de la app.
- `admin.html` marcado como legacy/no usar.
- Documentación técnica en `public/docs`.
- Repo FULL: conservar estructura completa, incluyendo carpetas no deployables como `.venv`, `.sixth` y `backend_python`.

## Billing / acceso vigente

Estados técnicos vigentes:

- `active`
- `overdue`
- `suspended`

Regla comercial:

- Cliente activo: entra, consulta y guarda.
- Cliente con pago pendiente / overdue: entra y consulta, pero NO guarda precios, ofertas ni cambios operativos.
- Cliente suspendido: entra a experiencia limitada, ve mensaje claro, WhatsApp AppPromos y botón Volver a Inicio.
- Trial vencido: se comporta comercialmente como pago pendiente.
- Superadmin inicia siempre en DEMO y administra estados desde Admin.
- Si el superadmin entra a una empresa como cliente, ve la misma lógica comercial del cliente.

## Registro / modelo de datos

V11.4.1 incorporó:

- teléfono normalizado desde el alta;
- localidad con autocomplete;
- provincia automática;
- `provinceId`;
- `localityKey`;
- CompanyAdmin más consistente;
- documentación del modelo central.

Decisión vigente:

- DEMO sigue siendo template operativo actual para inicialización.
- `catalogs/baseProducts/items` existe, pero no está completo y queda como future.

## UX global obligatoria

AppPromos debe estar pensada para carniceros argentinos que usan el celular mientras trabajan. La app debe parecer que trabaja sola: con 2 o 3 clicks el carnicero debería poder vender.

No usar en la UI términos técnicos como:

- Firestore
- backend
- SaaS
- tenant
- billing
- write guard
- core/state
- session
- deploy

Usar lenguaje humano, comercial y argentino:

- Cambiar precios
- Crear oferta
- Enviar WhatsApp
- Pago pendiente
- Acceso pausado
- Guardado pausado
- Volver a Inicio
- Contactar AppPromos

## Futures ya agendados

- V11.4.2: Header inteligente unificado.
- V11.5: modo nocturno automático y tema visual por estado comercial.
- Admin > Salud de Base.
- PromosDepurador / mantenimiento y sanitización de base.
- Catálogo formal completo para reemplazar dependencia de DEMO como template.

## Instrucciones para este nuevo hilo

Necesito que:

1. Analices el repo completo antes de proponer cambios.
2. Verifiques que coincide con la documentación de V11.4.1B.
3. No rompas Firebase, `resolveSession`, `BusinessStore`, `BusinessService`, `AccessControlService` ni `WriteGuardService`.
4. No elimines carpetas Python/backend/IA ni carpetas legacy sin documentar.
5. Mantengas estabilidad.
6. Pienses siempre en experiencia de usuario móvil y comercial.
7. Si proponés un parche, que sea incremental, chico y seguro.
8. Si se genera patch, debe incluir solo archivos modificados/nuevos, con instrucciones de renombrado, copia, prueba y rollback.

Esperá el `.zip` en el próximo mensaje antes de responder.
