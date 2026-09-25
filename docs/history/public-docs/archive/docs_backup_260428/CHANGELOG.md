# CHANGELOG — V12.2.3

## V12.2.3 — Carniza Liquidador Real

### Corregido

- El módulo ya no pisa productos con el mismo nombre.
- La selección se maneja por ID/productKey real.
- Se muestran iconos por rubro:
  - 🐄 Novillo / Res
  - 🐖 Cerdo
  - 🐔 Pollo / Aves
  - 🥩 genérico
- La oferta y el mensaje de WhatsApp muestran rubro para no confundir al carnicero ni al cliente.
- Se eliminó el botón “Editar oferta” del resultado del Liquidador.
- El resultado ahora queda orientado a venta directa: WhatsApp + copiar mensaje.

### Mantiene

- Descuento elegido por el carnicero.
- Descuento aplicado solo sobre productos urgentes.
- Productos gancho a precio normal.
- Fallback si Python no responde.
- Sin tocar Firebase ni web.html.
