# AppPromos V12.23-A7 — Archivar y restaurar promos

## Objetivo

Ordenar el Centro de Promos sin borrar recetas que pueden volver a utilizarse.

## Comportamiento

- `Archivar` retira una promo de la lista operativa.
- Si la promo estaba publicada, se despublica antes de archivarse.
- Las promos archivadas aparecen en una sección plegable independiente.
- Una promo archivada no puede publicarse, editarse, duplicarse ni enviarse.
- `Restaurar` devuelve la promo a la lista principal sin publicarla.
- Se conservan ID, receta, cantidades, descuentos y fechas de creación.
- Los precios vinculados continúan acompañando la lista de precios vigente.
- Las promos demo precargadas no se pueden archivar.

## Datos

El mismo objeto guardado utiliza:

- `status: "archived" | "active"`
- `archived: boolean`
- `archivedAt`
- `restoredAt`
- `updatedAt`

No se crean colecciones ni documentos nuevos.

## QA mínimo

1. Archivar una promo no publicada.
2. Confirmar que desaparece de la lista principal.
3. Abrir `Archivadas` y confirmar que conserva receta y precio.
4. Restaurarla y confirmar que vuelve sin publicarse.
5. Publicar una promo y luego archivarla.
6. Confirmar que desaparece de la web pública.
7. Restaurarla y confirmar que sigue sin publicarse.
8. Validar el flujo en mobile.

