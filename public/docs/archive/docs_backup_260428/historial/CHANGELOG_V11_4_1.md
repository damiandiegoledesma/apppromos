# CHANGELOG — V11.4.1

## Objetivo

Mejorar el alta y la consistencia inicial del modelo de datos sin romper Firebase, `resolveSession`, `BusinessStore` ni el flujo SaaS actual.

## Archivos modificados/agregados

### Agregados

- `public/js/vendor/localidades-ar.plugin.js`
- `public/js/services/normalization-service.js`
- `public/docs/CURRENT_VERSION.md`
- `public/docs/modelo/DATA_MODEL_CORE.md`
- `public/docs/futures/FUTURE_DATABASE_MAINTENANCE_AND_SANITIZATION.md`
- `public/docs/testing/TESTING_CHECKLIST_V11_4_1.md`
- `public/docs/plantillas/PROMPT_NUEVO_HILO_V11_4_1.md`

### Modificados

- `public/index.html`
- `public/app.html`
- `public/js/modules/auth-module.js`
- `public/js/services/auth-service.js`
- `public/js/modules/company-admin-module.js`
- `public/js/services/company-admin-service.js`
- `public/js/services/access-control-service.js`
- `firestore.rules`

## Cambios funcionales

### Registro público

- Campo localidad con autocomplete.
- Campo provincia autocompletado y readonly.
- Campo oculto `provinceId`.
- Teléfono normalizado antes de guardar.
- Nuevas carnicerías nacen con `address`, `locality`, `localityKey`, `province`, `provinceId`, `phone`, `phoneE164`, `phoneKey`, `rawPhone`.
- El `core/state` sigue clonándose desde `demo`.

### CompanyAdmin

- Crear/clonar empresas ahora usa la misma normalización básica.
- Root `businesses/{businessId}` incluye billing trial, módulos default, flags operativos y datos geo.

### Billing UX

- Pago vencido / trial vencido no oculta módulos.
- Usuario puede consultar.
- Guardado queda bloqueado por `WriteGuardService`.

### Firestore Rules

- `publicPhoneKeys` permite lectura pública para validar duplicados antes de crear Auth.
- La escritura sigue restringida a usuarios autenticados / dueños / admins.
- Importante: los documentos de `publicPhoneKeys` deben mantenerse mínimos.

## Decisión técnica crítica

`catalogs/baseProducts/items` NO se toma todavía como fuente completa.

La fuente template operativa actual sigue siendo:

```txt
businesses/demo/core/state
```

`catalogs/baseProducts/items` queda como catálogo formal futuro a completar y validar.
