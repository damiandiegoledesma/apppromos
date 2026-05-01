# AppPromos PATCH V12.0.NNN.7.1 — Pulido visual seguro pre-dev

## Importante

Este patch reemplaza al NNN.7 como candidato pre-dev.

El NNN.7 quedó observado porque pisó cosas ya corregidas del flujo de WhatsApp/nombre de oferta. Este NNN.7.1 es deliberadamente más chico.

## Archivos incluidos

```txt
public/js/status-compact.js
public/docs/CURRENT_VERSION.md
public/docs/CHANGELOG.md
```

## Qué corrige

- Carniza flotante un poco más grande.
- La Nelly más visible y botón Resolver más cómodo.
- Campos de descuento con fondo celeste suave.
- Resumen operativo menos protagonista.

## Qué NO toca

- `public/js/modules/builder-module.js`
- `public/js/app-main.js`
- WhatsApp
- nombre comercial editable
- formato del mensaje final
- descuentos/lógica de cálculo
- Firebase/Auth/BusinessStore

## Test mínimo

1. Abrir app.html.
2. Probar Crear oferta y verificar que el nombre comercial/WhatsApp siguen como antes.
3. Probar Enviar WhatsApp: no debe haber caracteres raros `�`.
4. Verificar Carniza más visible abajo derecha.
5. Verificar La Nelly más visible abajo izquierda en pago/acceso sensible.
6. Verificar que los campos de descuento se ven más claros.
