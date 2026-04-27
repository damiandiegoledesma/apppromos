# CHANGELOG — V11.4.3 Carniza V1

## Objetivo

Incorporar **Carniza V1**, el vendedor interno de AppPromos dentro de la app.

## Qué incluye

- Botón flotante abajo a la derecha con ícono de vaca `🐮`.
- Panel simple, tipo tarjeta, sin chat largo.
- Mensajes cortos según situación comercial.
- Acciones directas:
  - Ir a Precios.
  - Armar oferta.
  - Ir a WhatsApp.
  - Regularizar por WhatsApp.
  - Reactivar por WhatsApp.
- Carniza avisa la situación comercial del cliente:
  - Al día.
  - Prueba.
  - Por vencer.
  - Pendiente.
  - Pausado.
- Mensajes contextuales según módulo:
  - Precios.
  - Ofertas.
  - WhatsApp.

## Qué NO incluye

- No usa IA.
- No usa Python.
- No usa Gemini.
- No usa WhatsApp API.
- No cambia precios sola.
- No guarda ofertas sola.
- No toca Firebase Rules.
- No toca WriteGuardService.
- No toca resolveSession.
- No toca BusinessStore.

## Archivos modificados

```txt
public/app.html
public/js/app-main.js
```

## Archivos nuevos

```txt
public/styles/carniza.css
public/js/modules/carniza-module.js
public/docs/historial/CHANGELOG_V11_4_3_CARNIZA_V1.md
public/docs/testing/TESTING_CHECKLIST_V11_4_3_CARNIZA_V1.md
public/docs/parches/INSTALAR_PATCH_V11_4_3_CARNIZA_V1.md
public/docs/futures/FUTURE_CARNIZA_V2.md
```

## Decisión de diseño

Carniza no se presenta como chatbot técnico ni IA protagonista.

Carniza es el vendedor de AppPromos:

```txt
Dale, vendamos.
Tocá acá.
Armá oferta.
Mandá WhatsApp.
```
