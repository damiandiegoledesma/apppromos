# AppPromos — Versión actual

## V12.12-B-FIX4 — Oferta rápida: acción visible arriba del listado

Base de trabajo:

- V12.12-A definió la especificación mobile-first.
- V12.12-B implementó la botonera inferior base.
- V12.12-B-FIX1 corrigió Carniza y varios solapamientos.
- V12.12-B-FIX2 intentó separar Oferta rápida de la botonera inferior.
- V12.12-B-FIX3 movió el resumen al flujo, pero el test mostró que faltaba la acción visible.

## Objetivo

Dejar Oferta rápida usable en mobile:

```txt
Elegís productos → ves el resumen → tocás Ver oferta lista → mandás WhatsApp.
```

## Incluye

- El resumen de Oferta rápida queda arriba del listado de productos.
- El botón **Ver oferta lista** queda visible junto al resumen.
- Se evita que la botonera inferior tape la acción principal.
- Mantiene Carniza por encima de la botonera inferior.
- Mantiene la botonera inferior mobile.

## Regla UX

```txt
La botonera mueve.
Carniza orienta.
El cuerpo vende.
Oferta rápida no puede esconder su acción principal.
```

## No toca

- Registro.
- Web de Arranque.
- Web pública.
- Lógica de precios.
- Lógica de WhatsApp.
- Vender urgente.
- Oferta con descuentos.
- Panel Admin profundo.
- Firebase/Auth.
