# AppPromos V12.23-A2 — Recálculo de Promos guardadas

## Regla

Al guardar cambios en la lista de precios, AppPromos recalcula automáticamente
las Promos guardadas que utilicen esos productos.

## Alcance

- Solo promos con `schemaVersion: 2`.
- Solo promos con `pricingMode: linked_to_price_list`.
- Las promos antiguas permanecen congeladas.
- Productos y promos se escriben juntos en el documento `core/state`.
- Se conservan cantidades, descuentos individuales y descuento global.
- Se recalculan subtotal, ahorro, total y precio para la balanza.
- Se registra `lastPriceSync` con total anterior, total nuevo y productos
  afectados.
- La pantalla de Precios informa cuántas promos fueron actualizadas.

## Fuera de alcance

- Regenerar automáticamente publicaciones de la web pública.
- Migrar promos antiguas.
- Editar o eliminar promos.
