# AppPromos V12.22-A2-FIX3C1A - Resumen flotante de Precios en mobile

## Objetivo

Extender a celulares el resumen aprobado en FIX3C1 para que el carnicero no pierda el contador ni la acción Guardar al recorrer una lista extensa.

## Alcance

- Reutiliza exactamente el mismo contador y guardado de Precios.
- Aparece solo cuando existen cambios pendientes.
- En mobile se muestra en formato compacto.
- Se ubica por encima de Carniza y de la navegación inferior.
- Respeta el área segura inferior del dispositivo.
- Desaparece después de guardar.
- No modifica Firebase, datos, permisos ni reglas de acceso.

## QA

1. Probar en 360 x 640.
2. Modificar un precio y bajar por la lista.
3. Confirmar que aparece el resumen compacto.
4. Modificar varios precios y comprobar el contador.
5. Guardar desde el resumen.
6. Confirmar que desaparezca después de guardar.
7. Verificar que no tape Carniza, la navegación inferior ni el producto que se está editando.
8. Confirmar que desktop continúe funcionando igual.
