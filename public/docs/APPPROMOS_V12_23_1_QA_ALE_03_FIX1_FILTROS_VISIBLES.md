# AppPromos V12.23.1 — QA-ALE-03-FIX1

## Problema

El contador del filtro mostraba correctamente, por ejemplo, `7 de 40 promos`,
pero las 40 tarjetas seguían visibles.

## Causa

El atributo HTML `hidden` quedaba anulado visualmente por la regla propia
`.saved-card { display:grid; }`.

## Corrección

Se agrega `.saved-card[hidden] { display:none !important; }` para que solo se
vean las tarjetas que cumplen los filtros, sin reconstruirlas ni perder los
eventos de sus botones.
