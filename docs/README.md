# Docs internos del repo AppPromos

Esta carpeta contiene documentación interna del repositorio.

## Diferencia importante

- docs/
  - Documentación interna del repo.
  - No se sirve directamente por Firebase Hosting.
  - Sirve para inventarios, mantenimiento, futures técnicos y archivo histórico interno.

- public/
  - Contiene solamente archivos necesarios para ejecutar la aplicación.
  - No debe alojar documentación interna, prompts, backups ni informes de QA.

## Estructura actual

- docs/repo/
  - Inventarios, criterios de orden y notas de mantenimiento del repo.

- docs/futures/
  - Futures internos o documentación de ideas no productivas.

- docs/archive/v12-7-2/
  - Documentación histórica de patches V12.7.2.

- docs/history/public-docs/
  - Documentación histórica preservada desde la antigua carpeta `public/docs`.
  - Se mantiene versionada, pero ya no forma parte de Firebase Hosting.

## Regla de mantenimiento

No mezclar documentación histórica suelta en la raíz de docs ni volver a colocarla dentro de `public/`.

La raíz de docs debe quedar simple y explicar la estructura.

## Documentos internos destacados

- repo/APPPROMOS_V12_13_C7_MANTENIMIENTO_REPO.md — resumen del hito V12.13-C7 de limpieza de assets, logo liviano y orden de documentación.
