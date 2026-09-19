# AppPromos V12.28-A5 FIX1 — Seguridad de métricas públicas

## Objetivo

Endurecer la entrada anónima de las dos métricas públicas incorporadas en A2,
sin cambiar la experiencia de la vidriera ni del pedido por WhatsApp.

## Protecciones

- Solo se aceptan visitas externas e inicios de pedido por WhatsApp.
- El identificador debe respetar el tipo, la fecha y el visitante anónimo.
- `occurredAt` debe usar el formato ISO generado por la aplicación.
- Cada tipo exige su `source` correspondiente.
- Las visitas exigen metadata vacía.
- Los pedidos exigen una cantidad entera de 1 a 99 y dos indicadores booleanos.
- La lectura continúa reservada al dueño y al equipo administrador.
- Las actualizaciones y eliminaciones continúan bloqueadas.

## Prueba local

Con Firestore Emulator activo y el seed QA cargado:

```powershell
node tools/qa/test-public-signals-rules.mjs
```

La prueba confirma creaciones válidas, rechazos de datos adulterados y bloqueo
de lectura, actualización y borrado públicos. Los documentos temporales válidos
se eliminan al finalizar.

## Alcance

Estas reglas reducen datos incorrectos y adulteraciones simples. No constituyen
un sistema de protección total contra automatizaciones masivas. Si el volumen
real lo requiere, el siguiente nivel será Firebase App Check o una API
controlada del lado servidor.
