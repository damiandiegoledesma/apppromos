# AppPromos — Versión actual

## V12.12-D-FIX1 — Inicio autoresponsive mobile

Base de trabajo:

- V12.12-A definió la especificación mobile-first.
- V12.12-B implementó la botonera inferior mobile-first.
- V12.12-C compactó el header y activó modo foco mobile.
- V12.12-D limpió Inicio y llevó datos del negocio a **Más → Mi cuenta**.
- V12.12-D-FIX1 corrige el ancho/responsive de Inicio, la botonera inferior y Carniza en mobile.

## Objetivo

Asegurar que Inicio se adapte bien a celulares Android gama media/entrada, sin desbordar el viewport ni dejar Carniza fuera de pantalla.

```txt
Inicio entra completo.
Botonera entra completa.
Carniza queda adentro.
El centro sigue vendiendo.
```

## Incluye

- Ajustes mobile para evitar overflow horizontal en app, paneles y body.
- Botonera inferior limitada al ancho real del viewport.
- Carniza ajustado para quedar dentro del área visible y arriba de la botonera.
- Inicio con cards y acciones fluidas en pantallas chicas.
- Resumen operativo y acciones secundarias sin min-width que provoque desborde.
- Mantiene **Más → Mi cuenta** como lugar de datos del negocio.

## No toca

- Registro.
- Web de Arranque.
- Web pública.
- Lógica de precios.
- Lógica de ofertas.
- Lógica de WhatsApp.
- Vender urgente.
- Panel Admin profundo.
- Firebase/Auth profundo.
