# AppPromos V12.23.1 — Mobile Fix A

## Alcance

- Carrusel mobile reducido a aproximadamente la mitad de su tamaño anterior.
- Carrusel limitado a productos de Novillo, Cerdo y Pollo con imagen disponible.
- Precios de todos los productos expresados como precio por kilogramo (`/kg`).
- Las promociones y Ofertas del día conservan su precio total, sin `/kg`.

## QA local

1. Abrir la vidriera desde un teléfono o emulador mobile.
2. Confirmar que se ven aproximadamente dos tarjetas del carrusel por pantalla.
3. Recargar varias veces y verificar que no aparezcan otros rubros.
4. Verificar `/kg` en el carrusel y en todos los rubros de la lista.
5. Confirmar que las Promos y Ofertas del día no muestran `/kg`.
