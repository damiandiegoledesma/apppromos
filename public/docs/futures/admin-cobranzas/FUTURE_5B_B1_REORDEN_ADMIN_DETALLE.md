# Future 5-B1 — Reorden visual Admin detalle

## Estado

Rama objetivo: `future/admin-tracking-cobranzas`.

Patch no productivo. No main. No dev. No deploy.

## Objetivo

Reordenar visualmente el detalle de cada carnicería en el Panel Admin sin agregar datos nuevos ni tocar servicios.

## Archivo modificado

- `public/js/modules/admin-users-module.js`

## Qué cambia

El detalle de cada carnicería deja de mostrarse como una grilla mezclada y pasa a separarse en secciones:

- Datos básicos
- Cobranzas
- Tracking
- Acciones

## Qué NO cambia

- No agrega métricas nuevas.
- No cambia Firestore.
- No cambia Auth.
- No toca `admin-service.js`.
- No toca venta, WhatsApp, Crear oferta, Vender urgente, Web Arranque, landing ni registro.
- No cambia permisos.
- No cambia empresas TEST.

## Atributos preservados

Se preservan los `data-*` usados por los listeners actuales:

- `data-status-business`
- `data-billing-business`
- `data-plan-business`
- `data-payment-due-business`
- `data-payment-received-business`
- `data-internal-note-business`
- `data-save-internal-note`
- `data-whatsapp-business`
- `data-enter-business`
- `data-manage-modules`
- `data-test-business`
- `data-logs-business`
- `data-defaults-business`
- `data-clone-test-business`
- `data-delete-test-business`
- `data-archive-business`
- `data-restore-business`

## Criterios de prueba

1. Entrar al Panel Admin.
2. Abrir pestaña Carnicerías.
3. Abrir “Ver detalle ordenado”.
4. Confirmar secciones: Datos básicos, Cobranzas, Tracking, Acciones.
5. Probar WhatsApp admin.
6. Probar Entrar como cliente.
7. Probar Gestionar módulos.
8. Probar cambio de acceso/pago/plan en una empresa TEST.
9. Probar Guardar nota.
10. Probar Ver logs.
11. Probar Clonar como TEST.
12. Probar Eliminar TEST solo en empresa TEST.
13. Confirmar consola sin errores rojos nuevos.

## Regla

Misma información. Mejor orden. Cero lógica nueva.
