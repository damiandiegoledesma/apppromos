# AppPromos V12.18-B1 FIX7 — Carniza Landing contextual

## Objetivo
Alinear los contextuales de Carniza en la landing con la nueva tesis comercial de AppPromos: una carnicería online 24/7 integrada operativamente con WhatsApp.

## Cambios
- Elimina la demo genérica como CTA principal de Carniza en la landing.
- Carniza deriva a la web pública real de Carnicería A La Estaca.
- Hero: “Ver A La Estaca”.
- Cómo funciona: precios → vidriera → pedido por WhatsApp.
- Sección web: A La Estaca como ejemplo real.
- Registro: Carniza acompaña a crear la carnicería online, sin referencias a 30 días ni pricing.
- Mantiene CTA secundario de creación/registro.

## URL usada para el ejemplo real
`/carniceria-a-la-estaca-3462-543210`

## Archivos
- `public/js/modules/carniza-landing-module.js`
- `public/docs/APPROMOS_V12_18_B1_FIX7_CARNIZA_LANDING_CONTEXTUAL.md`

## Test mínimo
1. Abrir landing.
2. Abrir Carniza en hero: debe decir “Ver A La Estaca”.
3. CTA principal abre la web pública de A La Estaca.
4. Scroll a “Cómo funciona”: el contextual cambia.
5. Scroll a la sección de la carnicería online: el contextual habla de A La Estaca.
6. Abrir registro: Carniza acompaña el registro y ya no ofrece “seguir probando demo”.
7. Consola sin errores.
