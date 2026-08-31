# AppPromos V12.22-A2-FIX3 — Navegación superior permanente en desktop

## Objetivo

Probar la barra superior existente como navegación permanente en pantallas de escritorio.

## Alcance

- Desde 769 px, la barra superior queda visible al desplazarse.
- También queda disponible dentro de Precios y Admin.
- El botón del módulo activo continúa marcado por la navegación existente.
- En 768 px o menos no se modifica el comportamiento mobile ni su barra inferior.

## Fuera de alcance

- No cambia Firebase, sesiones, permisos, facturación ni datos.
- No modifica la navegación funcional ni la lógica de los módulos.
- No define todavía si la ubicación final en desktop será superior o inferior.

## QA visual

1. Abrir la app con un ancho mayor a 768 px.
2. Recorrer Inicio, Precios, Vender / Crear promo, Promos, WhatsApp, Más y Admin.
3. Desplazarse hacia abajo en cada pantalla y comprobar que la barra superior siga visible.
4. Confirmar que el módulo activo quede marcado.
5. Repetir con 360 x 640 y comprobar que la barra inferior y el autoocultado mobile sigan iguales.
6. Evaluar si la barra superior ocupa demasiado espacio antes de decidir su posición definitiva.
