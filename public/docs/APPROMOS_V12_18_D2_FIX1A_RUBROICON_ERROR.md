# V12.18-D2-FIX1A — Corrección rubroIcon

FIX1 llamó por error a `rubroIcon(r)`, función inexistente en `web.html`.
Se reemplaza por el helper existente `icon(r, "")`.

No modifica UX, carrito, filtros, Firebase ni datos.
