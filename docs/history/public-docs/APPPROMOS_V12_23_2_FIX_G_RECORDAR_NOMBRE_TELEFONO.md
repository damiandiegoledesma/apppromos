# AppPromos V12.23.2 — FIX G

## Recordar nombre y teléfono del comprador

Base: AppPromos V12.23.2 con FIX E y FIX F aprobados por QA.

## Alcance

- Se agregó al checkout la opción `Recordar mi nombre y teléfono en este dispositivo`.
- La opción requiere consentimiento explícito.
- Al activarla, nombre y teléfono se guardan y se actualizan localmente mientras el comprador los modifica.
- En futuras visitas a la misma carnicería, ambos campos se completan automáticamente.
- `Olvidar mis datos` elimina la copia local, desmarca la opción y limpia nombre y teléfono del formulario.

## Datos excluidos

No se guardan mediante este mecanismo:

- dirección;
- retiro o envío;
- medio de pago;
- productos;
- promociones;
- carrito;
- total;
- pedido o mensaje de WhatsApp.

## Privacidad y separación

Los datos se guardan solamente en `localStorage` con una clave separada por tenant:

```text
apppromos_web_customer_{tenantKey}
```

No se envían a Firebase ni a AppPromos. No se modificaron reglas, servicios Firebase, BusinessStore, `resolveSession`, billing ni estructuras del tenant.

## Archivo modificado

- `public/web.html`

## QA requerido

1. Sin activar Recordar, recargar y confirmar que AppPromos no conserva los datos.
2. Activar Recordar, completar nombre y teléfono y recargar.
3. Confirmar que nombre y teléfono reaparezcan.
4. Cambiar ambos datos y confirmar que la copia se actualice.
5. Confirmar que dirección, entrega y pago no se restauren por FIX G.
6. Usar Olvidar mis datos y confirmar que nombre y teléfono se limpien.
7. Recargar y confirmar que continúen vacíos.
8. Abrir otra carnicería y confirmar que no se mezclen los datos.
9. Confirmar carrito y WhatsApp.
10. Revisar mobile, desktop y consola.
11. Confirmar que FIX E, FIX F y los Fixes A–D continúen funcionando.
