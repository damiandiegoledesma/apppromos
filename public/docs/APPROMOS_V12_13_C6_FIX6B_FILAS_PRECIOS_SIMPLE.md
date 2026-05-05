# AppPromos V12.13-C6-FIX6B — Filas de precios simples

## Objetivo

Simplificar la fila de Cambiar precios para celulares chicos.

## Cambios

- Se elimina /kg /un de cada fila.
- Se agrega una aclaración general: "Precios por kg".
- Se oculta el texto repetido "No uso" en cada producto.
- Se deja solo una casilla visual para marcar productos que no se usan.
- El nombre del producto puede ocupar hasta 2 líneas.
- El precio queda claro y alineado.

## Regla comercial

Todos los precios se cargan por kg.

Si algún producto especial, como hamburguesas, se maneja por unidad en la práctica, para AppPromos se carga convertido a precio por kg para mantener simple la lista.

## Criterio UX

Producto · Precio · Uso.

Sin repetir textos innecesarios en cada fila.

## No toca

- Guardar global
- Deshacer ajuste masivo
- Ajustes por rubro
- No uso como lógica
- Web Arranque
- WhatsApp
- Firebase/Auth
