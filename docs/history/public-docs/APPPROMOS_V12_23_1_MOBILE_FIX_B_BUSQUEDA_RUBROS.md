# AppPromos V12.23.1 — Mobile Fix B

## Alcance

- Se agrega búsqueda pública por nombre de producto.
- Novillo, Cerdo y Pollo quedan como accesos rápidos táctiles.
- Los rubros secundarios quedan agrupados en `Más rubros`.
- En mobile no se muestran inicialmente los 88 productos.
- Se informa la cantidad de productos resultantes.
- El carrusel conserva el acceso directo al producto y activa su rubro.
- Desktop conserva la vista inicial de todos los productos.
- La navegación inferior incluye `Buscar` y lleva directamente al campo de búsqueda.

## QA local

1. En mobile, abrir Productos y comprobar que inicialmente no aparece el listado completo.
2. Probar Novillo, Cerdo y Pollo.
3. Probar un rubro desde `Más rubros`.
4. Buscar por nombre con y sin rubro seleccionado.
5. Verificar el contador y el mensaje sin resultados.
6. Elegir un producto del carrusel y comprobar que abre el producto exacto.
