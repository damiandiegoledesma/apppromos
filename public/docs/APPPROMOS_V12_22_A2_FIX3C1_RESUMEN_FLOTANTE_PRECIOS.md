# AppPromos V12.22-A2-FIX3C1 - Resumen flotante de Precios

## Objetivo

Permitir que el carnicero vea cuántos precios modificó y pueda guardarlos aunque esté desplazado hacia el final de una lista extensa.

## Alcance

- Solo en desktop, desde 761 px.
- Aparece únicamente cuando existe al menos un precio modificado sin guardar.
- Muestra la cantidad de precios pendientes.
- Reutiliza el guardado por lote existente.
- Desaparece después de guardar correctamente.
- No modifica Firestore, permisos, bloqueo de escritura ni publicación automática.
- Mobile no cambia.

## QA

1. En desktop, entrar en Precios y bajar por la lista.
2. Modificar un precio: debe aparecer el resumen sobre la barra inferior.
3. Modificar varios precios: la cantidad debe actualizarse.
4. Guardar desde el resumen flotante.
5. Confirmar el guardado y que el resumen desaparezca.
6. Cambiar un precio y devolverlo a su valor original: el contador debe reducirse.
7. Confirmar que el resumen no tape la barra de navegación inferior.
8. Probar 360 x 640 y confirmar que mobile siga igual.
