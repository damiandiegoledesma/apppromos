# CHANGELOG — AppPromos V11.4.1A

Fecha: 27 de abril de 2026
Tipo: Patch quirúrgico post-checklist
Base: AppPromos V11.4.1 Registro Normalizado

## Objetivo

Ajustar la lógica comercial de billing/status y la experiencia visual del Admin sin generar repo FULL.

## Cambios incluidos

### 1. UX comercial de billing/status

- `active`: entra, consulta y guarda.
- `overdue`: entra y consulta, pero no guarda.
- `suspended`: experiencia limitada, sin módulos operativos ni guardado.
- `trial` vencido: se comporta comercialmente como `overdue`.
- Trial por vencer: aviso amable orientado a conversión.

### 2. WhatsApp AppPromos

Se agregó CTA de contacto comercial/soporte:

- Número visible: `+54 9 3462 662053`
- Link WhatsApp: `5493462662053`

Se usa en avisos de:

- trial por vencer;
- trial vencido;
- pago pendiente;
- cuenta suspendida.

### 3. Panel Admin con ayudas visuales

El módulo Admin ahora muestra una lectura comercial más clara:

- Cliente activo.
- Trial activo.
- Trial por vencer.
- Trial vencido.
- Pago pendiente.
- Suspendida por pago.
- Acceso suspendido.

También muestra:

- si el cliente entra;
- si puede guardar;
- acción sugerida para el administrador.

### 4. Superadmin inicia en DEMO

Por seguridad operativa, al iniciar la app el SuperAdmin entra siempre en `demo`.

Si quiere operar una carnicería real, debe seleccionarla explícitamente desde Admin o switcher.

### 5. Superadmin conserva soporte

La lógica de `WriteGuardService` conserva el criterio aprobado:

- cliente vencido/suspendido: no guarda;
- superadmin: puede corregir datos para soporte.

## Archivos modificados

```txt
public/js/services/access-control-service.js
public/js/modules/admin-users-module.js
public/js/app-main.js
```

## Archivos nuevos

```txt
public/docs/historial/CHANGELOG_V11_4_1A.md
public/docs/testing/TESTING_CHECKLIST_V11_4_1A.md
public/docs/patches/INSTALAR_PATCH_V11_4_1A.md
```

## No incluido

- No cambia Firestore Rules.
- No cambia DEMO como template operativo.
- No cambia catálogo base.
- No incorpora PromosDepurador.
- No elimina archivos legacy.
- No toca backend Python, `.venv` ni `.sixth`.
