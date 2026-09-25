# AppPromos V12.23.2 — FIX F

## Nombre público configurable del rubro Novillo

Base: AppPromos V12.23.2 con FIX E aprobado por QA.

## Alcance

- Se agregó en `Mi carnicería online` una configuración para mostrar Novillo como Novillo, Ternera, Vaca o un nombre personalizado.
- El nombre personalizado admite hasta 24 caracteres y normaliza espacios.
- Un nombre personalizado vacío vuelve al valor predeterminado `Novillo`.
- La categoría interna continúa siendo `Novillo`.
- No se modifican productos, IDs, imágenes, filtros internos, promociones ni datos históricos.

## Persistencia

El alias se guarda dentro de la configuración web existente del tenant:

```text
state.web.publicRubroNames.Novillo
```

El snapshot público recibe el mismo valor en:

```text
publicWebSlugs/{slug}.publicRubroNames.Novillo
```

No se crearon colecciones ni documentos nuevos. No se modificaron reglas de Firestore. Las carnicerías sin configuración siguen mostrando `Novillo`.

## Textos públicos

El alias se aplica al botón rápido, título del rubro, contadores, mensaje inicial, subtítulo del carrusel, carrito y mensaje de WhatsApp. Los valores internos usados para filtrar y conservar el estado siguen siendo `Novillo`.

## Archivos modificados

- `public/js/modules/web-module.js`
- `public/js/services/web-premium-service.js`
- `public/web.html`

## QA requerido

1. Sin configuración debe mostrar Novillo.
2. Guardar Ternera y revisar la web pública.
3. Guardar Vaca y revisar la web pública.
4. Guardar un nombre personalizado corto.
5. Probar Personalizado vacío y confirmar Novillo.
6. Confirmar que el filtro continúa funcionando.
7. Confirmar buscador y carrusel.
8. Confirmar carrito y WhatsApp.
9. Confirmar separación entre dos carnicerías.
10. Revisar mobile y desktop.
11. Confirmar consola sin errores rojos.
12. Confirmar que FIX E y los Fixes A–D continúan funcionando.
