# AppPromos — Versión actual

## V12.12-A — Especificación mobile-first AppPromos

Base de trabajo:

- V12.11-B crea Web de Arranque desde el registro.
- V12.11-D1 deja la guía de precios dentro de Cambiar precios.
- V12.11-D2 suma navegación segura en Carniza.
- V12.11-D3 mejora el acceso mobile en landing.

## Objetivo

Definir el rediseño mobile-first integral antes de enviar a `dev`.

La app debe diseñarse para el celular real del carnicero argentino:

- Android gama media / entrada.
- Samsung Galaxy A06 / A15 como referencia principal.
- Xiaomi Redmi 14c / Moto G04s como alternativas frecuentes.
- Pantalla vertical.
- Uso con una mano.
- Mostrador, apuro y necesidad de vender ya.

## Decisión principal

La navegación mobile base será:

```txt
[Inicio] [Precios] [Vender] [WhatsApp] [Más]
```

Con esta lógica:

- **Inicio:** tablero principal.
- **Precios:** cambiar precios.
- **Vender:** Oferta rápida / Oferta con descuentos / Vender urgente.
- **WhatsApp:** salida comercial / última oferta / ayuda si no hay oferta lista.
- **Más:** Mi cuenta, Mi web, Ofertas guardadas, Competencia, Ayuda, Panel Admin si corresponde y Cerrar sesión.

## Regla UX

```txt
La botonera mueve.
Carniza orienta.
El cuerpo vende.
```

## Incluye

- Documento `V12.12-A_ESPECIFICACION_MOBILE_FIRST.md`.
- Definición de botonera inferior.
- Definición de rol de Carniza en mobile.
- Definición de rol de La Nelly en mobile.
- Criterio de header compacto y modo foco.
- Checklist de aceptación mobile.
- Plan de implementación por etapas V12.12-B a V12.12-F.

## No toca

- Código de navegación.
- App interna funcional.
- Web de Arranque.
- Registro/Login.
- Cambiar precios.
- Crear oferta.
- Vender urgente.
- WhatsApp.
- Panel Admin.
- Firebase/Auth.
- Backend Python.

## Pendiente siguiente

### V12.12-B — Botonera inferior base

Implementar la primera botonera mobile sin romper navegación actual ni flujos comerciales.
