# CHANGELOG AppPromos

## V12.12-A — Especificación mobile-first AppPromos

- Agrega documento de especificación mobile-first integral.
- Define como referencia de diseño celulares Android gama media/entrada usados por carniceros argentinos.
- Define botonera inferior base: Inicio, Precios, Vender, WhatsApp y Más.
- Define que Vender debe abrir: Oferta rápida, Oferta con descuentos y Vender urgente.
- Define que Más agrupa: Mi cuenta, Mi web, Ofertas guardadas, Competencia, Ayuda, Panel Admin si corresponde y Cerrar sesión.
- Define la regla UX: “La botonera mueve. Carniza orienta. El cuerpo vende.”
- Define criterios de header compacto, modo foco, Carniza contextual y La Nelly sin competencia visual.
- No implementa código ni toca flujos existentes.

## V12.11-D3 — Landing mobile acceso visible

- Mejora la primera vista mobile de la landing.
- Mantiene visible **Iniciar sesión** en mobile.
- Oculta solo **Cómo funciona** en la barra superior mobile para ahorrar espacio.
- Compacta el header para celulares Android gama media/entrada.
- Agrega enlace bajo el hero: “¿Ya tenés cuenta? Iniciar sesión”.
- Mantiene **Probar demo** y **Empezá gratis ahora** como acciones principales.
- No toca app interna, Web de Arranque, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-D2 — Carniza navegación segura

- Agrega en el menú de Carniza la acción **Volver a Inicio**.
- Agrega salida segura desde Carniza:
  - **Salir de la demo** cuando el usuario está en modo demo.
  - **Cerrar sesión** cuando el usuario está logueado.
- Mantiene en Carniza las acciones comerciales:
  - Armar oferta.
  - Vender urgente.
  - Ir a WhatsApp.
- Refuerza el criterio UX: Carniza ayuda a vender, pero también debe evitar que el carnicero se pierda.
- No toca registro, Web de Arranque, Cambiar precios, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-D1 — Activación Web de Arranque: guía para precios

- Agrega un tip dentro de **Cambiar precios** para explicar que solo los productos con precio real se publican.
- Explica al carnicero: a los productos que no vendés, poneles 0; AppPromos no los muestra en tu web.
- Retira el aviso/card de Web de Arranque del cuerpo principal de Inicio para no tapar el foco de venta.
- Deja pendiente llevar ese aviso a Carniza como mensaje contextual seguro, sin overlay bloqueante.
- No toca registro, web pública, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

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
