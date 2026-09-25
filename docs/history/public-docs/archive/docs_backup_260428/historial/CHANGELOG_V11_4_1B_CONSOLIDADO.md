# Changelog — AppPromos V11.4.1B Consolidado

## Tipo

Repo FULL consolidado como nueva base estable.

## Incluye

- V11.4.1 Registro Normalizado.
- V11.4.1A UX comercial billing/status.
- V11.4.1B bloqueo real de guardado y navegación segura.

## Cambios funcionales consolidados

- Superadmin inicia por DEMO.
- Admin muestra ayudas visuales para estados.
- Cliente activo guarda normalmente.
- Cliente con pago pendiente puede consultar pero no guardar.
- Cliente suspendido ve experiencia limitada con salida clara.
- Módulos bloqueados muestran WhatsApp AppPromos y Volver a Inicio.
- Superadmin administra estados desde Admin y no saltea reglas comerciales dentro de la app cliente.

## Validación

Checklist funcional aprobado por pruebas manuales:

- active: OK.
- overdue: OK.
- suspended: OK.
- superadmin/admin: OK.

## Limpieza

- Repo consolidado sin archivos `__backup`.
- Backups locales deben conservarse fuera del repo activo.
