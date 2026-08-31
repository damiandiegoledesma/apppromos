# AppPromos V12.22-A2 FIX2 — Catálogo inicial de 88 productos

## Objetivo

Toda carnicería nueva debe comenzar con el catálogo oficial completo de 88 productos, sin precios cargados y sin depender de Carnicería Demo.

## Cambios

- Se incorpora `starter-products.js` como catálogo inicial oficial versionado.
- Contiene 88 productos con nombre, rubro, subrubro y unidad.
- Todos los precios comienzan en `$0`.
- El registro público usa este catálogo en lugar de `businesses/demo/core/state`.
- La creación de una empresa base desde Panel Admin usa el mismo catálogo.
- Al cargar una empresa existente con un catálogo incompleto, se agregan en memoria los productos faltantes.
- Cuando el carnicero guarda un precio, la lista completa queda persistida mediante el flujo normal existente.

## Protección de datos

- No se copian precios de A La Estaca.
- No se copian promociones, combos, clientes ni datos comerciales.
- Los productos propios agregados por una carnicería se conservan.
- Los precios ya cargados se conservan.
- Demo continúa funcionando, pero deja de ser requisito para registrar carnicerías.

## QA con Carnicería Rosana

1. Ingresar a Rosana sin crear otra empresa.
2. Abrir Precios y confirmar al menos 88 productos visibles. Rosana puede conservar algún producto adicional proveniente de su plantilla anterior.
3. Confirmar que los productos previamente existentes conservan sus valores.
4. Confirmar que los productos agregados por FIX2 están en `$0`.
5. Cambiar el precio de un solo producto nuevo y guardar.
6. Recargar y confirmar que continúan al menos 88 productos y el precio guardado.
7. Abrir A La Estaca y confirmar que mantiene sus 88 productos y precios.
