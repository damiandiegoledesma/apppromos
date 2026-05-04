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
- Se agregan 8 combos precargados demo:
  - Promo Parrillera de Hoy
  - Combo Familiar
  - Combo Económico
  - Promo para el Finde
  - Combo Mila Express
  - Combo Parrilla Completa
  - Combo Achuras
  - Combo Salvaventas
- Se actualiza la pantalla de combos/ofertas para mostrar mejor los combos precargados.
- Se cambia el tab visible de `Guardados` a `Combos`.
- No se toca registro, web automática, tracking ni backend.

## V12.0.NNN.7.1 — Pulido visual seguro pre-dev

- Agranda visualmente el chip flotante de Carniza mediante CSS.
- Agranda el chip de La Nelly y mejora la presencia del botón Resolver.
- Resalta campos de descuento con fondo celeste/azulado suave.
- Baja el impacto visual del Resumen operativo.
- No modifica builder, WhatsApp, nombre de oferta ni flujo comercial.
