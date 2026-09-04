# AppPromos V12.23.3 — Identidad de la pestaña pública

## Objetivo

Reemplazar el título genérico de la web pública por la identidad real de cada carnicería.

## Comportamiento

- La pestaña muestra `Nombre de la carnicería | AppPromos`.
- El favicon utiliza el logo publicado de la carnicería.
- Si todavía no existe logo o la imagen no puede cargarse, utiliza el favicon oficial de AppPromos.
- El cambio se aplica al resolver los datos públicos de la carnicería, sin modificar el slug ni la URL.

## Persistencia

Reutiliza `logoUrl` y el nombre ya incluidos en el snapshot público. No agrega datos ni escrituras.

## Archivo modificado

- `public/web.html`

## QA requerido

1. Abrir una carnicería con nombre y logo: comprobar ambos en la pestaña.
2. Abrir una carnicería sin logo: comprobar el favicon de AppPromos.
3. Confirmar que el título no permanece como `Web de Arranque`.
4. Revisar recarga, link directo y navegación del carrito.
