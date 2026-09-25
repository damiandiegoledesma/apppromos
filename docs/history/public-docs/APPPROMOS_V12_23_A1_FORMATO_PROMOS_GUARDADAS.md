# AppPromos V12.23-A1 — Formato de Promos guardadas

## Objetivo

Guardar cada nueva promo como una receta versionada y vinculada a la lista de
precios, sin romper los consumidores históricos de Promos, WhatsApp y web
pública.

## Decisión de producto

- `schemaVersion: 2`
- `pricingMode: linked_to_price_list`
- Los precios actuales quedan registrados como fotografía inicial.
- En bloques posteriores, los cambios de la lista recalcularán las promos y sus
  publicaciones automáticamente.

## Datos agregados

- Identificación estable de cada producto (`productId` y `productKey`).
- Cantidad, unidad y precio de lista fotografiado.
- Descuento individual y descuento global.
- Subtotales, descuento aplicado y total matemático.
- Peso total y precio operativo para la balanza.
- Tipo, modo, estado y condición promocional.
- Fotografía del cálculo con fecha.

## Compatibilidad

Las claves históricas `name`, `description`, `items`, `total`, `createdAt` y
`updatedAt` se conservan. Las promos anteriores no se modifican ni se migran en
este bloque.

## Fuera de alcance

- Recalcular al cambiar precios.
- Actualizar automáticamente la web pública.
- Editar, duplicar, archivar o eliminar promos.
- Migrar promos antiguas.
