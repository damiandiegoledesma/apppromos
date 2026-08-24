# AppPromos V12.18-A-FIX3 — Mi carnicería online simple

Objetivo: alinear la UX con la nueva tesis comercial de AppPromos: la carnicería online se mantiene automáticamente y debe estar siempre fácil de abrir, compartir y actualizar.

## Cambios

- Inicio muestra siempre accesos directos a:
  - Ver mi carnicería.
  - Actualizar precios.
  - Crear oferta.
  - WhatsApp.
  - Compartir mi carnicería.
- “Mi Web” pasa a llamarse “Mi carnicería online”.
- Se eliminan de la UX normal:
  - Mostrar lista de precios en la web.
  - Selección manual de rubros.
  - Guardar configuración web.
  - Estado técnico / slug como configuración.
- Los productos activos con precio mayor a $0 se muestran automáticamente.
- Los productos en $0 no se publican.
- Las ofertas siguen pudiendo publicarse/despublicarse, pero cada cambio se guarda automáticamente al marcar/desmarcar.
- La pantalla muestra nombre, dirección, WhatsApp, localidad y link público.

## Regla de producto

> El carnicero actualiza sus precios. AppPromos actualiza la vidriera.

## Test mínimo

1. Inicio abre y muestra “Ver mi carnicería” y “Actualizar precios”.
2. “Ver mi carnicería” abre la web pública.
3. “Compartir mi carnicería” abre WhatsApp con el link público.
4. “Actualizar precios” abre Cambiar precios.
5. “Mi carnicería online” abre sin controles de configuración técnica.
6. Cambiar un precio y guardar actualiza la web sin entrar a esta pantalla.
7. Marcar/desmarcar una oferta actualiza la web automáticamente.
8. Consola sin errores rojos nuevos.
