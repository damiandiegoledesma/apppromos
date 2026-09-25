# AppPromos V12.18-C3 — Rubros + categorías de ofertas

## Objetivo
Evitar listas eternas en móvil y ayudar al comprador a encontrar rápido productos y ofertas.

## Productos
En móvil aparece una barra horizontal:
- Todos
- Novillo
- Cerdo
- Pollo
- etc. según los rubros reales disponibles.

Al tocar un rubro se muestran solo sus productos.

## Ofertas
Categorías oficiales iniciales:
- 2 Kgs
- 3 Kgs
- 5 Kgs
- 10 Kgs
- Pieza Entera

La vidriera:
1. usa la categoría explícita si la oferta ya la trae;
2. si todavía no existe ese dato, intenta inferirla por el nombre o por la suma de kilos;
3. las ofertas no clasificables siguen apareciendo en “Todas”.

Esto permite implementar navegación ahora sin bloquearse por la futura parametrización del Centro de Promos.

## No cambia
- Carrito.
- Checkout.
- WhatsApp aprobado.
- Firestore/rules.
- Desktop de forma relevante.

## QA
1. Ver chips de rubros en 360x640.
2. Cambiar Novillo/Cerdo/Pollo/Todos.
3. Confirmar que + sigue agregando.
4. Ver filtros disponibles de ofertas.
5. Probar Todas / 2 / 3 / 5 / 10 Kgs / Pieza Entera según datos existentes.
6. Abrir carrito y enviar WhatsApp.
