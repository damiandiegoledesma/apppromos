# AppPromos — Versión actual

## V12.13-B-FIX1 — Resumen de descuentos sobre Carniza

Base de trabajo:

- V12.13-B compactó **Oferta con descuentos** para mobile.
- En test mobile, el flujo quedó funcional, pero Carniza podía tapar el total con descuento del resumen flotante.

## Objetivo

Evitar que Carniza tape el resumen de **Oferta con descuentos** en celulares, especialmente el total final.

## Incluye

- Reubica el resumen flotante de descuento por encima de Carniza.
- Agrega más espacio inferior en la pantalla de ajuste de descuentos.
- Mantiene visible el total final sin scroll horizontal.

## No toca

- Oferta rápida.
- Vender urgente.
- WhatsApp.
- Cálculo de descuentos.
- Redondeo.
- Guardado.
- Registro/Login.
- Web pública/Web de Arranque.
- Panel Admin.
- Firebase/Auth profundo.
