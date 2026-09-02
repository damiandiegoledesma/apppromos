# AppPromos V12.23-A4 — Publicar desde Promos

## Objetivo

Permitir que el carnicero publique o despublique una promo guardada sin salir de
la pantalla **Promos**.

## Comportamiento

- Cada tarjeta muestra **Publicar** o **Despublicar** según su estado real.
- Al publicar, la promo se agrega a `web.selectedOffers`.
- Al despublicar, se elimina de `web.selectedOffers`.
- El estado y el snapshot público se actualizan mediante el mismo servicio que
  usa **Mi carnicería online**.
- La tarjeta confirma visualmente cuando la promo está publicada.

## Compatibilidad

- No cambia el formato de las promos.
- No duplica la lógica de publicación.
- Conserva los controles de acceso y escritura existentes.
- **Mi carnicería online** continúa permitiendo administrar las mismas ofertas.

## Fuera de alcance

- Editar promos.
- Duplicar promos.
- Archivar o eliminar promos.
