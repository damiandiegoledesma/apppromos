# AppPromos V12.13-C5-FIX1 — Mi Web limpia + planes humanos

## Objetivo

Pulir C5 para que la app no muestre datos técnicos al carnicero.

## Cambios

- Mi Web / Vidriera online oculta slug y URL completa en pantalla.
- Mantiene internamente el enlace para Copiar enlace y Ver mi web.
- Mi cuenta muestra planes comerciales humanos.
- Mapea valores viejos como premium a DUEÑO.
- Dashboard deja de mostrar slug como dato protagonista.

## No toca

- public/web.html
- publicWebSlugs
- precios vivos
- precio 0 oculta producto
- Firebase/Auth
- registro/login
- Crear oferta
- Vender urgente
- WhatsApp

## Test mínimo

1. Más / Mi cuenta: el plan debe verse como Prueba gratis, ARRANQUE, SALVADOR o DUEÑO.
2. Más / Mi cuenta: Mi web debe mostrar Vidriera activa.
3. Más / Mi Web: no debe mostrar slug ni URL técnica visible.
4. Botones Copiar enlace y Ver mi web deben seguir funcionando.
5. Web pública debe seguir mostrando precios vivos y ocultando precio 0.
