# AppPromos V12.18-D2-FIX1 CORREGIDO

Corrección del error `rubroIcon is not defined`.

El FIX1 original introdujo dos llamadas a `rubroIcon(r)`, pero `web.html` ya utiliza el helper existente `icon(rubro, nombre)`.

Este patch reemplaza ambas llamadas por:

`icon(r,"")`

Mantiene:
- hero mobile limpio;
- eliminación de “Carnicería online”;
- navegación de productos por rubro;
- primer rubro visible por defecto;
- “Todos” como opción secundaria;
- barra inferior;
- carrito;
- WhatsApp;
- ofertas.

No toca Firebase, Storage, Firestore, Auth ni datos.
