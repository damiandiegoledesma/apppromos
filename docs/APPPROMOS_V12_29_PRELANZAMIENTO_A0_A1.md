# AppPromos V12.29 — Prelanzamiento A0 + A1

## Base

- Rama base: `main`
- Commit base: `6aa141c`
- Producción no modificada.

## A0 — Limpieza conservadora

- La documentación histórica de `public/docs` se preservó en `docs/history/public-docs`.
- Los documentos internos, prompts, backups e informes de QA dejan de formar parte de Firebase Hosting.
- No se borraron documentos ni assets.
- La exportación `public/data/carniceria_datos_2026-04-20.json` se conserva porque todavía alimenta el seeder interno; su reemplazo requiere un fixture específico y queda fuera de esta limpieza segura.

## A1 — Conversión y vidriera

- La prueba gratuita pasa de 90 a 14 días en copy y lógica de acceso.
- La landing explica el recorrido real: elegir productos, cargar precios, completar los datos mínimos, publicar, compartir y recibir el pedido por WhatsApp.
- Las fichas públicas muestran nombre, rubro, precio y unidad.
- El snapshot público incorpora `unidad` con fallback `kg`.
- Una imagen faltante conserva una referencia visual en vez de dejar un hueco.
- Inicio muestra una continuación clara aun cuando no existen destacados.
- El destino mobile de Promo del día se acorta a `Hoy`.
- El copy público usa `Promo del día` y `Hasta agotar stock`.
- La foto del frente mantiene la regla existente que conserva sus colores originales en todos los temas.

## QA ejecutado

- `node --check` sobre todos los archivos JS/MJS: OK.
- extracción y chequeo sintáctico del módulo inline de `web.html`: OK.
- `git diff --check`: OK.
- búsqueda de copy o constantes activas de 90 días: sin coincidencias en `public/` y `tools/`.
- Firebase Auth, Firestore, Storage y Hosting Emulator: OK.
- reseed de siete escenarios comerciales: OK.
- reglas de señales públicas válidas e inválidas: OK.
- respuesta local de landing, onboarding y ruta pública: HTTP 200.

## Pendiente antes de producción

- QA visual humano en 360 px, mobile real y desktop.
- Recorrido interactivo desde alta hasta compartir la vidriera.
- Carrito y apertura real de WhatsApp con un mensaje extenso.
- Revisión visual de los cuatro estilos de vidriera.
- Aprobación explícita antes de desplegar.
