# AppPromos V12.29 RC5.1 — UX Landing + Onboarding

Base: V12.29 RC5 preproducción auditada por Claude y Gemini.
Fecha: 2026-09-21.

## Alcance deliberadamente acotado

1. Onboarding mobile: Carniza reduce su bloque visual a un máximo aproximado de 180 px para que la primera acción aparezca en el primer pantallazo.
2. Progreso onboarding: bienvenida = 0/4, rubros = 1/4, precios = 2/4, identidad = 3/4 y publicación = 4/4. Ya no se muestra la barra completa en “Paso 3 de 4”.
3. Landing: se retira INSTALAR del hero y se mueve al final, después de explicar el valor del producto.
4. Landing: CTA fijo mobile usa el mismo texto que el CTA principal del hero.
5. Targets táctiles pequeños relevantes se llevan a un mínimo de 44 px en mobile/login/social.

## Fuera de alcance

No se modifican Firestore Rules, billing, aliases, publicWebSlugs, tracking comercial, slugs, superadmin, origen `carnis.app`, carrito, WhatsApp ni el catálogo/precios del onboarding.

## QA técnico

- `node --check public/js/modules/activation-onboarding-module.js`: OK.
- `node --check public/js/pwa-install.js`: OK.
- Revisión de diff: cambios limitados a `public/index.html`, `public/crear-carniceria.html`, `public/js/modules/activation-onboarding-module.js` y esta documentación.

## QA visual requerido antes de producción

Probar landing y onboarding completo en 360×640, 390×844 y 412×915. Confirmar: botón Empezar visible sin scroll; identidad accionable; progreso coherente; hero con dos CTA; CTA fijo con el mismo copy; instalación disponible al final; flujo preview-first sin regresiones.
