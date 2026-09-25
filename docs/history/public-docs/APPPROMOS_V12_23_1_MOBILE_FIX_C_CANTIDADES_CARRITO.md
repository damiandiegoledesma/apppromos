# AppPromos V12.23.1 — Mobile Fix C

## Alcance

- Los productos se agregan inicialmente con 1 kg.
- Los productos se ajustan de 0,5 kg en 0,5 kg, con mínimo de 0,5 kg.
- Las promociones se ajustan de una unidad completa por vez.
- La cantidad queda visible entre los controles menos y más.
- El precio total se recalcula según la cantidad elegida.
- La barra inferior cuenta líneas de productos/promos, no suma kilogramos como ítems.
- El pedido de WhatsApp expresa cantidades con coma decimal: 0,5 kg, 1,5 kg, etc.
- Al agregar se muestra una confirmación visual temporal.

## QA local

1. Agregar un producto y comprobar que comienza en 1 kg.
2. Bajar a 0,5 kg y verificar que no permite bajar más.
3. Subir a 1,5 kg y comprobar precio y total.
4. Agregar una promo y verificar pasos de una unidad.
5. Revisar contador y total en la barra inferior.
6. Abrir el pedido de WhatsApp y comprobar cantidades y totales sin enviarlo.
