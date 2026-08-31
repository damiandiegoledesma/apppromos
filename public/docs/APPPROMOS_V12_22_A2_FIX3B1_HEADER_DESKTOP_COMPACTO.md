# AppPromos V12.22-A2-FIX3B1 - Header desktop compacto

## Objetivo

Evitar la duplicación entre la navegación superior y la barra inferior aprobada en FIX3B.

## Cambio

En desktop:

- se oculta la fila superior Inicio, Precios, Vender, Promos, WhatsApp y Más;
- se conserva logo, identidad AppPromos, carnicería activa, estado, selector administrativo y Salir;
- el encabezado se presenta con menor altura;
- mantiene el autoocultado existente durante el scroll;
- la navegación permanente queda exclusivamente en la barra inferior.

Mobile no cambia.

## QA

1. Confirmar que en desktop exista una sola navegación: la inferior.
2. Verificar que arriba continúen el estado, la carnicería activa y Salir.
3. En modo administrador, verificar el selector de carnicería.
4. Navegar por todos los módulos usando la barra inferior.
5. Hacer scroll y comprobar el autoocultado del encabezado.
6. Probar 360 x 640 y confirmar que mobile siga igual.
