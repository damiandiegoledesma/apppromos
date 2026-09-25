# AppPromos V12.23-A6 — Editar promo

## Objetivo

Modificar una promo guardada reutilizando el constructor y su cálculo operativo.

## Alcance

- Cambiar el nombre.
- Agregar o quitar productos.
- Cambiar cantidades.
- Cambiar descuentos individuales y descuento general.
- Recalcular total y precio para la balanza.
- Guardar sobre el mismo ID sin crear una copia.

## Publicación

Si la promo está publicada, AppPromos avisa antes de guardar y regenera la
vidriera pública con la receta actualizada.

## Seguridad

- La fecha de creación y el ID se conservan.
- Se mantienen controles de acceso y escritura.
- La acción Duplicar continúa siendo el camino para crear una variante separada.

## Fuera de alcance

- Archivar, restaurar o eliminar promos.
