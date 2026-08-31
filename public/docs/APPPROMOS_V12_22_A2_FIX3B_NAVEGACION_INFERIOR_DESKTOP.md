# AppPromos V12.22-A2-FIX3B - Navegación inferior en desktop

## Decisión de prueba

Se descarta la cabecera completa permanentemente visible de FIX3. En desktop se prueba una barra inferior fija basada en la navegación mobile ya existente.

## Alcance

- La barra inferior aparece también desde 761 px.
- Mantiene Inicio, Precios, Vender, Promos y Más.
- Vender y Más reutilizan sus menús actuales.
- El módulo activo permanece marcado.
- La cabecera superior recupera su autoocultado normal al desplazarse.
- Mobile conserva sus medidas y comportamiento actuales.

## Pendiente separado

FIX3C deberá evaluar resúmenes operativos flotantes para:

- cantidad de precios modificados y acción Guardar;
- productos, cantidades y total durante las tres maneras de vender.

## QA

1. Probar con un ancho mayor a 760 px.
2. Recorrer Inicio, Precios, Vender, Promos y Más desde la barra inferior.
3. Abrir Vender y confirmar sus tres modalidades.
4. Abrir Más y comprobar WhatsApp, Mi carnicería, Cómo vender, Ayuda, Admin si corresponde y Salir.
5. Hacer scroll en Precios, Vender, Promos y WhatsApp: la barra inferior debe permanecer visible.
6. Confirmar que el encabezado superior se oculta al bajar y reaparece al subir, salvo los modos de foco ya existentes.
7. Abrir Promo del día y comprobar que el modal quede por encima de la navegación.
8. Repetir en 360 x 640 y confirmar que mobile no cambió.
