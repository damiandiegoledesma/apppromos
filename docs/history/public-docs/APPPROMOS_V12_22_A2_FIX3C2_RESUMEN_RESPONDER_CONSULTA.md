# AppPromos V12.22-A2-FIX3C2 - Resumen de Responder una consulta

## Objetivo

Mantener visible el estado de una respuesta puntual mientras el carnicero busca y selecciona productos en una lista extensa.

## Alcance

- Se aplica solo a Responder una consulta, durante la selección de productos.
- Aparece después de elegir el primer producto.
- Muestra productos distintos, cantidad total y total estimado.
- Incluye la acción Ver respuesta lista.
- Funciona en desktop y mobile por encima de la navegación inferior.
- Desaparece al volver al selector de modalidades o avanzar a la respuesta lista.
- No guarda la consulta como promo.
- No modifica WhatsApp, Firebase, precios ni reglas de acceso.

## QA

1. Entrar en Vender > Responder una consulta.
2. Elegir un producto: debe aparecer el resumen fijo.
3. Agregar productos y comprobar productos, cantidad total y total.
4. Hacer scroll largo y confirmar que permanezca visible.
5. Pulsar Ver respuesta lista.
6. Confirmar productos, cantidades y total en la respuesta final.
7. Volver a Productos, quitar o modificar selecciones y verificar el resumen.
8. Confirmar que no tape la barra inferior ni Carniza.
9. Repetir en desktop y 360 x 640.
10. Confirmar que la consulta no aparezca en Promos guardadas.
