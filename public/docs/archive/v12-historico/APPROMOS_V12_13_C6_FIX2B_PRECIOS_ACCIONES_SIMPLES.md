# AppPromos V12.13-C6-FIX2B — Precios acciones simples

## Objetivo

Simplificar la pantalla Cambiar precios para que sea más clara en celular y más útil para el carnicero.

## Cambios

- Se eliminaron los botones por producto:
  - guardar individual
  - editar producto
  - tacho/eliminar

- Cada fila ahora queda centrada en:
  - nombre del producto
  - precio editable
  - botón No uso

## Criterio UX

Editar nombre o rubro no está permitido desde esta pantalla.

El flujo correcto es:

Buscar / filtrar rubro
→ cambiar precio
→ guardar cambios

o:

Producto que no uso
→ No uso

## Regla comercial

- Precio 0: el producto no aparece en la web pública.
- No uso: el producto se desactiva del catálogo activo.

## Archivos tocados

- public/js/modules/prices-module.js

## No toca

- Crear oferta
- Vender urgente
- WhatsApp
- Web Arranque
- Firebase/Auth
