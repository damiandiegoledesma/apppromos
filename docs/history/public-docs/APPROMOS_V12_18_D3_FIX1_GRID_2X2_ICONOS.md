# AppPromos V12.18-D3-FIX1 — Grid 2x2 + iconos

## Problema detectado en 360x640
El D3 tenía una grilla de 4 columnas aplicada inline, que prevalecía sobre la regla mobile.
Resultado: botones demasiado angostos, textos cortados e iconos sin protagonismo.

## Corrección
- Elimina la grilla inline de 4 columnas.
- En <=700px fuerza 2 columnas x 2 filas.
- Centra icono + etiqueta.
- Asegura visibilidad del icono.
- Mantiene las acciones secundarias compactas.
- No agrega texto explicativo.

## No cambia
Navegación, acciones, Firebase, web pública, precios, ofertas, WhatsApp, carrito ni Carniza.
