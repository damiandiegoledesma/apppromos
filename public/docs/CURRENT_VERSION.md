# AppPromos — Versión actual

## V12.11-D2 — Carniza navegación segura

Base de trabajo:

- V12.11-B crea una Web de Arranque desde el registro.
- V12.11-D1 deja la guía de precios dentro de **Cambiar precios** y retira la card grande del cuerpo de Inicio.
- La app debe seguir orientada a mobile-first para Android gama media/entrada.

## Objetivo

Mejorar el menú de Carniza para que no sea solo un acceso comercial, sino también un salvavidas de navegación.

Carniza debe ayudar a vender, pero también permitir:

- volver a Inicio;
- salir de la demo;
- cerrar sesión en cuenta real.

## Incluye

- Nuevas acciones en Carniza:
  - **Volver a Inicio**.
  - **Salir de la demo** cuando el usuario está probando.
  - **Cerrar sesión** cuando el usuario está logueado.
- Mantiene:
  - **Armar oferta**.
  - **Vender urgente**.
  - **Ir a WhatsApp**.
- Documentación `V12.11-D2_CARNIZA_NAVEGACION_SEGURA.md`.

## No toca

- Registro.
- Web de Arranque.
- Web pública.
- Cambiar precios.
- Crear oferta.
- Vender urgente.
- WhatsApp.
- Panel Admin.
- Backend Python.
- SQLite.

## Pendiente siguiente

### V12.12 — Navegación mobile-first

Evaluar rediseño mobile para Android gama media/entrada:

- botonera inferior;
- navegación al pulgar;
- header más compacto;
- Carniza contextual sin competir con la navegación;
- cuerpo principal enfocado en vender.
