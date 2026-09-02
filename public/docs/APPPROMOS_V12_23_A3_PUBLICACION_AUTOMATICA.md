# AppPromos V12.23-A3 — Publicación automática de Promos

## Regla

Cuando cambia el precio de un producto, AppPromos recalcula las Promos
guardadas vinculadas. Si alguna de esas promos está seleccionada para la web,
la publicación pública se regenera automáticamente con el nuevo total.

## Flujo

1. Guardar los nuevos precios y las promos recalculadas en `core/state`.
2. Propagar las nuevas promos al estado activo de la aplicación.
3. Regenerar `publicWebSlugs/{slug}`.
4. Confirmar el guardado después de finalizar la sincronización.

## Mensaje

La pantalla informa cuántas promos y publicaciones fueron actualizadas.

## Compatibilidad

- Solo se recalculan promos `schemaVersion: 2` vinculadas a la lista.
- Las promos antiguas permanecen congeladas.
- Las promos no seleccionadas para la web se actualizan como guardadas pero no
  se publican automáticamente.
