# AppPromos V12.18-D2 — Web pública con identidad real + UX mobile-first

## Objetivo
Mostrar automáticamente en la vidriera pública el logo y la foto real del frente guardados en `core/meta.brand`,
manteniendo la funcionalidad actual y priorizando UX/UI mobile-first.

## Cambios
- `meta.brand.logoUrl` y `meta.brand.frontPhotoUrl` pasan al payload vivo de la web.
- Logo real en encabezado mobile y hero.
- Foto real del frente como imagen protagonista del hero.
- Fallback al hero genérico actual si no existe foto.
- Fallback visual si no existe logo.
- Encabezado mobile más compacto.
- WhatsApp superior se reduce a icono en pantallas chicas.
- Hero reduce texto y prioriza identidad visual.
- CTA visuales: Productos / Ofertas.
- Se elimina el texto redundante bajo filtros de rubro.
- Carrito usa copy más corto.
- Carniza queda minimizada como avatar en mobile para no competir con navegación/carrito.
- Branding AppPromos del pie se compacta a “Con AppPromos”.
- Se conserva navegación inferior Productos / Ofertas / Carrito / WhatsApp.

## No cambia
- lógica de precios;
- ofertas;
- carrito;
- armado del pedido;
- WhatsApp;
- slug;
- Storage;
- Auth;
- Firestore rules;
- onboarding.

## QA prioritario
Probar primero A La Estaca en:
- 360px / 390px mobile;
- Android real;
- desktop.
Confirmar logo, foto, fallback, navegación inferior, carrito y WhatsApp.
