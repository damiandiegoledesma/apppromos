# AppPromos V12.21-A1/A2 — Video landing + Cómo vender base

## Estado

Implementado para QA. No constituye todavía una versión cerrada ni desplegada.

## Objetivo

- Incorporar una pieza promocional breve en la landing.
- Crear la base pública y mobile-first de “Tres maneras de vender con AppPromos”.
- Explicar los recorridos sin modificar la lógica funcional cerrada en V12.20.

## Cambios

- Nuevo bloque de video inmediatamente después del hero de la landing.
- Video horizontal de 10 segundos con Carniza, reproducción manual y playsinline.
- Nueva página pública /como-vender.html.
- Explicación de:
  - Responder una consulta.
  - Crear promo o combo.
  - Crear una oferta del día.
- Comparador simple para elegir modalidad.
- Explicación del recorrido web, carrito y WhatsApp.
- CTA a demo, registro e ingreso.
- Uso exclusivo de assets oficiales existentes.
- Las capturas detalladas de cada recorrido quedan para el próximo bloque.

## Nomenclatura de evaluación

- Necesidad: vender urgente.
- Acción visible propuesta: Crear una oferta del día.
- Resultado público: Promo del día.

La lógica y los identificadores internos de V12.20 no cambian.

## Archivos

- public/index.html
- public/como-vender.html (nuevo)
- public/styles/landing-video.css (nuevo)
- public/styles/como-vender.css (nuevo)
- public/assets/product/landing/apppromos-carniza-10s.mp4 (nuevo)
- public/assets/product/landing/apppromos-carniza-10s-poster.webp (nuevo)

## Fuera de alcance

- Cambiar el nombre dentro de la app.
- Agregar el acceso desde Más.
- Incorporar las capturas reales de los tres recorridos.
- PDF.
- Git, PR o deploy.
- Firebase, BusinessStore, resolveSession, billing, reglas o lógica V12.20.

## QA requerido

1. Landing en 360, 390 y desktop.
2. Reproducción del video con controles y sonido.
3. Poster visible antes de reproducir.
4. Página /como-vender.html completa y sin overflow horizontal.
5. CTA demo, registro, login y carnicería real.
6. Consola sin errores.
7. Confirmar que no se modificó ningún flujo funcional de V12.20.
