# AppPromos V12.18-A-FIX1 — Onboarding de activación Web

## Objetivo

Cerrar el salto entre "me registré" y "mi carnicería online ya está lista para recibir pedidos".

## Cambios

- El catálogo inicial de una carnicería nueva se clona sin precios demo visibles.
- Los precios de la plantilla se conservan solo como `precioSugerido`; el precio real arranca en `0`.
- Cambiar Precios muestra el catálogo completo aunque todavía esté en $0.
- Al guardar los primeros precios reales, AppPromos activa y actualiza automáticamente la vidriera:
  - `priceListStatus: ready`
  - lista de precios visible
  - todos los rubros con productos activos y precio > 0
  - sin necesidad de entrar a Mi Web ni tocar "Guardar configuración web".
- El onboarding inicial cambia de foco:
  - confirma que la carnicería online ya fue creada;
  - invita a cargar al menos 5 precios reales;
  - permite ver la carnicería;
  - permite compartirla por WhatsApp cuando la vidriera ya tiene precios;
  - muestra progreso de activación.
- Al activarse automáticamente la web después del primer guardado, vuelve al onboarding para mostrar el resultado.
- Se registra `first_price_saved`, `web_opened` y `web_shared` usando el tracking existente.

## Decisión sobre ofertas iniciales

FIX1 no inventa ofertas ni precios. Primero se cierra la activación real Web → productos → carrito → WhatsApp.
El siguiente paso puede generar 3 ofertas sugeridas usando exclusivamente productos a los que el carnicero ya haya puesto precio real.

## Archivos modificados

- `public/js/app-main.js`
- `public/js/modules/prices-module.js`
- `public/js/services/auth-service.js`
- `public/js/services/web-premium-service.js`

## Prueba obligatoria

Usar una carnicería NUEVA creada después de aplicar FIX1.

1. Registrar carnicería.
2. Confirmar mensaje "Tu carnicería online ya está creada".
3. Entrar a Cambiar precios.
4. Confirmar catálogo precargado con precios vacíos / $0.
5. Cargar 5 precios reales y guardar.
6. Confirmar regreso al onboarding y estado "Vidriera actualizada automáticamente".
7. Abrir "Ver mi carnicería".
8. Confirmar que solo aparecen productos con precio real.
9. Agregar productos al carrito.
10. Completar pedido y abrir WhatsApp.
11. Volver y probar "Compartir por WhatsApp".
12. Consola sin errores rojos.

## No toca

- `public/web.html`
- carrito V12.17
- Panel Admin
- Mercado Pago
- backend Python
- Centro de Promos
- Impresión
