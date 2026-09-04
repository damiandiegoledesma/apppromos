# AppPromos V12.23.2 — FIX E

## Navegación pública y superposiciones

Base: AppPromos V12.23.1, commit `b16e57b007a823843eaf939abbf49616aba40aa7`.

## Alcance

- Se agregó `Inicio` como primer acceso de la navegación pública.
- La barra contiene seis accesos: Inicio, Buscar, Promos, Hoy, Carrito y WhatsApp.
- Inicio desplaza la página hasta el comienzo real.
- Buscar conserva el desplazamiento al panel y el foco automático.
- Se conservaron el indicador y el total del carrito.
- Se mantuvo el icono SVG oficial de WhatsApp.
- Todos los accesos tienen `aria-label`, `title` y estado de foco visible.
- La grilla final de navegación utiliza seis columnas.
- Se ajustaron tamaños tipográficos para 360 px sin reducir la altura táctil.
- Se agregaron márgenes de desplazamiento a búsqueda, promociones, Ofertas de hoy y pedido.

## Carrito flotante y Carniza

- El carrito flotante se conserva.
- En mobile continúa oculta la versión flotante porque la barra inferior muestra Carrito, cantidad y total.
- Entre 641 y 1100 px el carrito queda a la izquierda y Carniza se compacta como avatar a la derecha.
- Desde 1101 px el carrito queda a la izquierda y la tarjeta completa de Carniza a la derecha.
- Ambos elementos quedan por encima de la navegación inferior sin ocupar la misma zona.
- Se ajustó el margen inferior de la firma AppPromos en mobile.

## Compatibilidad

No se modificaron Firebase, Firestore, `resolveSession`, billing, reglas de acceso, aislamiento multi-tenant ni estructuras de datos. Se mantienen los Fixes A, B, B1, C y D.

## Archivo modificado

- `public/web.html`

## QA requerido

1. Verificar los seis accesos en 360 × 640.
2. Confirmar Inicio, Buscar, Promos, Hoy, Carrito y WhatsApp.
3. Confirmar cantidad y total en Carrito.
4. Verificar foco por teclado y nombres accesibles.
5. Revisar que la barra no tape campos o acciones del checkout.
6. Revisar carrito flotante y Carniza en tablet/resolución intermedia.
7. Revisar carrito flotante y Carniza en desktop.
8. Confirmar que los Fixes A–D continúan funcionando.
9. Confirmar consola sin errores rojos.
