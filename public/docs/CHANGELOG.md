# CHANGELOG AppPromos

## V12.11-D1 — Activación Web de Arranque: guía para precios

- Agrega un tip dentro de **Cambiar precios** para explicar que solo los productos con precio real se publican.
- Explica al carnicero: a los productos que no vendés, poneles 0; AppPromos no los muestra en tu web.
- Retira el aviso/card de Web de Arranque del cuerpo principal de Inicio para no tapar el foco de venta.
- Deja pendiente llevar ese aviso a Carniza como mensaje contextual seguro, sin overlay bloqueante.
- No toca registro, web pública, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

# Changelog

## V12.11-C2 — Card simple de Web de Arranque en Inicio

- Se agrega una card simple de Carniza en Inicio para empresas con Web de Arranque pendiente de precios reales.
- La card muestra el mensaje “Ya tenés tu web propia” sin usar overlay, modal ni capa oscura.
- Se agrega botón “Actualizar mis precios” hacia el módulo de precios.
- Se agrega botón “Ver mi web” para abrir la URL pública generada.
- Se agrega botón “Ocultar por ahora” para ocultar la card durante la sesión.
- No se toca registro, web pública, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-B — Web de Arranque desde registro

- Se documenta el diagnóstico V12.11-A para Web automática desde registro.
- El registro crea Web de Arranque en modo `starter`.
- La web nace publicada de forma segura con identidad real, WhatsApp y slug propio.
- `publicWebSlugs` queda activo desde el alta para permitir URL pública.
- La web pública no muestra productos sin precio válido o con precio 0.
- La web pública no muestra lista de precios cuando `priceListStatus` está en `pending_real_prices`.
- Se evita publicar precios/ofertas demo como si fueran datos reales de la carnicería.
- No se toca Crear oferta, Vender urgente, WhatsApp, backend ni SQLite.

## V12.7.2-A — Demo fuerte + combos precargados

- Se excluye `Pollo entero` de la demo para evitar confusión pieza/kg.
- Se excluyen hamburguesas de los combos y del catálogo demo sembrado.
- Se agregan 8 combos precargados demo.
- Se actualiza la pantalla de combos/ofertas para mostrar mejor los combos precargados.
- Se cambia el tab visible de `Guardados` a `Combos`.
- No se toca registro, web automática, tracking ni backend.
