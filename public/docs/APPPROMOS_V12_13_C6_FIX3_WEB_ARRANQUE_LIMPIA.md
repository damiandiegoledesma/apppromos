# AppPromos V12.13-C6-FIX3 — Web Arranque limpia y vendedora

## Objetivo

Hacer que la Web Arranque se vea más clara, menos artificial y más enfocada en vender.

## Cambios

- El sello AppPromos ahora es clickeable y lleva a la landing principal.
- Las tarjetas de combos/ofertas dejan de mostrar fotos genéricas/artificiales.
- Cada oferta queda como tarjeta limpia:
  - nombre del combo/oferta;
  - contenido;
  - precio;
  - botón Pedir por WhatsApp.
- Se mantienen los assets en el repo para auditoría posterior.
- No se borran imágenes ni rutas todavía.

## Archivos tocados

- public/web.html

## No tocado

- public/assets
- Cambiar Precios
- Crear oferta
- Vender urgente
- WhatsApp
- Firebase/Auth
- Registro/Login
- Landing

## QA mínimo

1. Abrir Web Arranque local.
2. Confirmar que las ofertas no muestran fotos.
3. Confirmar que las cards muestran nombre, productos, precio y WhatsApp.
4. Confirmar que el sello AppPromos abre la landing.
5. Confirmar que WhatsApp sigue funcionando.
6. Confirmar que lista de precios sigue visible.
7. Confirmar que precio 0 y No uso siguen sin aparecer.
