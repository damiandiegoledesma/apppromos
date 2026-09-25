# AppPromos V12.23-A5 — Duplicar promo

## Objetivo

Reutilizar una receta guardada sin alterar la promo original.

## Comportamiento

- La acción **Duplicar** solicita el nombre de la nueva promo.
- La copia conserva productos, cantidades, descuentos, precio operativo y total.
- La copia recibe un ID y fechas nuevos.
- Se registra el ID de origen en `duplicatedFrom`.
- La copia queda activa pero no publicada.
- La promo original conserva su nombre, contenido y estado de publicación.

## Compatibilidad

- La escritura usa el guardado versionado existente de Promos.
- La copia queda en formato `schemaVersion: 2` y vinculada a la lista de precios.
- Se mantienen los controles de acceso y escritura.

## Fuera de alcance

- Editar productos, cantidades o descuentos.
- Archivar o eliminar promos.
