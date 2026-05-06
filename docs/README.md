# Docs internos del repo AppPromos

Esta carpeta contiene documentación interna del repositorio.

## Diferencia importante

- docs/
  - Documentación interna del repo.
  - No se sirve directamente por Firebase Hosting.
  - Sirve para inventarios, mantenimiento, futures técnicos y archivo histórico interno.

- public/docs/
  - Documentación que queda dentro de public.
  - Puede ser servida por Firebase Hosting.
  - Debe usarse para documentos vigentes o referenciados desde la app.

## Estructura actual

- docs/repo/
  - Inventarios, criterios de orden y notas de mantenimiento del repo.

- docs/futures/
  - Futures internos o documentación de ideas no productivas.

- docs/archive/v12-7-2/
  - Documentación histórica de patches V12.7.2.

## Regla de mantenimiento

No mezclar documentación histórica suelta en la raíz de docs.

La raíz de docs debe quedar simple y explicar la estructura.
