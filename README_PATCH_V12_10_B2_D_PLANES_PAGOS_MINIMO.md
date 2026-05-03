# PATCH V12.10-B2-D — Planes, pagos y notas internas mínimo

## Objetivo

Agregar una capa mínima de gestión comercial al Panel Admin para operar clientes reales o TEST con más claridad.

## Archivos incluidos

- `public/js/modules/admin-users-module.js`
- `public/js/services/admin-service.js`
- `public/docs/PANEL_ADMIN_PLANES_PAGOS.md`
- `README_PATCH_V12_10_B2_D_PLANES_PAGOS_MINIMO.md`

## Cambios principales

1. Agrega bloque **Gestión comercial** dentro de cada carnicería.
2. Permite editar:
   - plan;
   - estado de pago;
   - próximo vencimiento / fecha de pago.
3. Agrega botón **Marcar pago recibido**.
4. Agrega **Nota interna** editable por carnicería.
5. Amplía estados de pago humanos:
   - Al día;
   - Pendiente;
   - Vencido;
   - Suspendido;
   - Bonificado / manual.
6. Mantiene logs en `adminActions` para las acciones comerciales.
7. Documenta el criterio en `public/docs/PANEL_ADMIN_PLANES_PAGOS.md`.

## Qué NO toca

- Registro/login.
- Web automática.
- Crear oferta.
- Vender urgente.
- WhatsApp del cliente final.
- Backend Python.
- SQLite.
- Borrado real de Auth.
- Clonar/eliminar TEST ya validado.

## Test mínimo

1. Panel Admin abre.
2. Ver detalle y acciones abre.
3. Aparece bloque Gestión comercial.
4. Cambiar plan funciona.
5. Cambiar estado de pago funciona.
6. Cambiar próximo vencimiento funciona.
7. Marcar pago recibido deja pago Al día y registra último pago.
8. Guardar nota interna funciona y persiste al recargar.
9. Clonar TEST sigue funcionando.
10. Eliminar TEST sigue funcionando.
11. Archivar / Restaurar sigue funcionando.
12. Gestionar módulos sigue funcionando.
13. Consola sin errores rojos nuevos.
