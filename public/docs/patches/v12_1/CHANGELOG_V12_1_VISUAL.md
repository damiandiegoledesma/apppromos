# CHANGELOG — V12.1 Visual

## Agregado

- Tarjeta “Carniza recomienda hoy” en Inicio.
- Carga segura de `public/js/services/ai-service.js` desde `app-main.js` sin tocar `app.html`.
- Consulta silenciosa a `GET /daily-recommendation`.
- Botón de acción que navega a `Crear oferta`.

## Seguridad

- Si el backend Python está apagado, la tarjeta no aparece.
- No se modifica Firebase.
- No se modifica `web.html`.
- No se agrega tracking.
