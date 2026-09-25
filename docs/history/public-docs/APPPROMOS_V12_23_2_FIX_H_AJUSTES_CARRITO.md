# AppPromos V12.23.2 — FIX H

## Ajustes finales del carrito público

Base: AppPromos V12.23.2 con FIX E, FIX F y FIX G aprobados por QA.

## Alcance

- El carrito flotante se conserva durante la navegación.
- Cuando el checkout entra en pantalla, el carrito flotante y Carniza se ocultan temporalmente para no cubrir campos ni acciones.
- Al salir del checkout, ambos reaparecen.
- La detección se actualiza durante scroll, resize y re-renderizados del carrito.
- El carrito vacío incorpora `Ver productos`, que lleva a la lista de precios.
- La confirmación de agregado conserva el check y suma un estado verde temporal.
- Se agregó un anuncio no intrusivo `aria-live` para tecnologías de asistencia.

## Compatibilidad

Se mantienen:

- productos en pasos de 0,5 kg;
- promociones por unidades enteras;
- componentes de promociones;
- total estimado;
- nombre y teléfono recordados;
- carrito persistente;
- mensaje de WhatsApp;
- navegación de seis accesos;
- alias público de Novillo.

No se modificaron Firebase, Firestore, reglas, BusinessStore, `resolveSession`, billing ni estructuras de datos.

## Archivo modificado

- `public/web.html`

## QA integral requerido

1. Comprobar carrito vacío y `Ver productos`.
2. Agregar un producto y observar check/estado verde.
3. Agregar una promoción y revisar sus componentes.
4. Confirmar el anuncio accesible sin alertas visibles.
5. Comprobar cantidades de 0,5 kg y promociones enteras.
6. Entrar al checkout y confirmar que carrito flotante y Carniza se oculten.
7. Salir del checkout y confirmar que reaparezcan.
8. Revisar campos y botones sin superposiciones.
9. Confirmar total y WhatsApp.
10. Revisar 360 × 640, mobile ancho, tablet y desktop.
11. Confirmar consola sin errores rojos.
12. Confirmar Fixes A–G.
