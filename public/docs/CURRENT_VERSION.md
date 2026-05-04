# AppPromos — Versión actual

## V12.12-E-FIX2 — Vender urgente sobre resúmenes flotantes

Base de trabajo:

- V12.12-A definió la especificación mobile-first.
- V12.12-B implementó la botonera inferior mobile-first.
- V12.12-C compactó el header y activó modo foco mobile.
- V12.12-D limpió Inicio y llevó datos del negocio a **Más → Mi cuenta**.
- V12.12-E mejoró la selección de productos en Crear oferta para mobile.
- V12.12-E-FIX1 restauró Vender urgente y buscadores fluidos.
- V12.12-E-FIX2 asegura que Vender urgente quede por encima de resúmenes flotantes y llegue a WhatsApp.

## Objetivo

Cerrar el bloque de ofertas mobile sin romper el camino sagrado:

```txt
Elegir producto
↓
Armar oferta urgente
↓
Oferta lista
↓
WhatsApp
```

## Incluye

- Overlay de Carniza por encima de navegación mobile y resúmenes flotantes.
- Estado visual seguro mientras Carniza está abierto.
- Scroll/posición del modal ajustado para que **Oferta lista** quede visible.
- Mantiene buscadores fluidos y rubro compacto.

## No toca

- Registro.
- Web de Arranque.
- Web pública.
- Lógica de precios.
- Cálculo de descuentos.
- Redondeo.
- Guardado.
- Panel Admin profundo.
- Firebase/Auth profundo.
