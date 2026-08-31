# AppPromos V12.22-A2-FIX3C2A - Nombres en el resumen de consulta

## Objetivo

Permitir que el carnicero confirme qué productos eligió sin tener que volver hacia arriba en Responder una consulta.

## Cambio

- Desktop muestra hasta tres nombres de productos.
- Mobile muestra hasta dos nombres.
- Cuando hay más productos, se indica +N más.
- Los nombres permanecen en una sola línea compacta.
- Se conservan productos distintos, cantidad total, total estimado y Ver respuesta lista.
- No cambia selección, cantidades, WhatsApp ni persistencia.

## QA

1. En desktop, elegir uno, tres y más de tres productos.
2. Confirmar que se muestren hasta tres nombres y luego +N más.
3. Verificar que el resumen no aumente excesivamente de altura.
4. En 360 x 640, elegir uno, dos y más de dos productos.
5. Confirmar hasta dos nombres y luego +N más.
6. Hacer scroll y verificar que nombres, cantidades y total se actualicen.
7. Pulsar Ver respuesta lista y completar el flujo.
8. Confirmar que no se guarde en Promos.
