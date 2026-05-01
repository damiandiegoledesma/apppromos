# V12.7.1.2 — Orden repo / assets / bot congelado

## Alcance
Patch de orden técnico. No toca Firebase, Auth, BusinessStore, lógica de precios, demo, pricing, Web automática ni flujo de WhatsApp.

## Cambios realizados
- Se agrega `.gitignore` raíz.
- Se excluyen del zip limpio: `.git/`, `.firebase/`, `node_modules/`, `whatsapp-bot/auth_info/`, logs y cachés.
- Se documenta el bot WhatsApp como future congelado.
- Se agrega `whatsapp-bot/README.md`.
- Se agregan carpetas ordenadas para assets de producto/landing/personajes.
- Se generan assets WEBP livianos para landing y personajes.
- Se mueven posts/historias/flyers desde `public/assets/images/` hacia `public/assets/marketing/`.
- `public/assets/images/` queda solo como carpeta de compatibilidad.
- Se actualizan referencias de Carniza/La Nelly a avatares WEBP livianos.
- Se actualiza la landing para usar imágenes WEBP optimizadas.

## No cambia
- No cambia la lógica comercial.
- No cambia el registro.
- No cambia Firebase.
- No cambia demo/tracking/pricing todavía.
- No borra assets originales.

## Próximo paso sugerido
V12.7.2 — Demo fuerte + precios realistas + tracking mínimo + web propia desde registro.
