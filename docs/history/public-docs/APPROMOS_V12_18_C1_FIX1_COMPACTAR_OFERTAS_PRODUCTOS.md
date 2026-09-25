# AppPromos V12.18-C1-FIX1 — Vidriera mobile compacta

Objetivo: reducir el espacio vertical de la vidriera pública en celulares sin alterar la lógica ya validada de carrito y WhatsApp.

## Cambios
- Productos: fila compacta con precio y botón circular `+`.
- Ofertas/combos: tarjeta móvil compacta en dos columnas.
- El botón ancho `Agregar al pedido` se convierte visualmente en `+` en mobile.
- Precio, detalle y acción quedan visibles en una tarjeta de menor altura.
- Menos espacio entre tarjetas.
- Desktop conserva el diseño existente.

## QA
1. Abrir la vidriera con viewport <= 640 px.
2. Verificar que ofertas/combos ocupen menos alto.
3. Tocar `+` en una oferta y comprobar que suma al carrito.
4. Tocar `+` en un producto y comprobar que suma al carrito.
5. Verificar badge del Carrito en barra inferior.
6. Abrir pedido y confirmar cantidades/precios.
7. Confirmar WhatsApp final.
