# AppPromos V12.13-C6-FIX1 — Inicio limpio + WhatsApp real

## Objetivo

Pulir la pantalla de Inicio mobile después del header compacto.

## Cambios

1. Se elimina de Inicio el bloque **Resumen operativo**.
2. Se eliminan accesos duplicados:
   - **Ver guardados**
   - **Ver competencia**
3. Se cambia el icono de WhatsApp de la botonera inferior por un icono tipo WhatsApp reconocible.

## Criterio UX

```txt
Inicio = acción comercial inmediata.
Más = administración / módulos secundarios.
```

La botonera inferior ya permite acceder a Guardadas y Competencia desde **Más**, por eso esos accesos no deben duplicarse en el cuerpo de Inicio.

## No toca

- Web Arranque.
- Precios vivos.
- Precio 0 oculta producto.
- Crear oferta.
- Oferta rápida.
- Oferta con descuentos.
- Vender urgente.
- WhatsApp funcional.
- Firebase/Auth.
- Mi Cuenta / Mi Web.

## Test mínimo

1. Inicio carga.
2. Header compacto sigue visible.
3. No aparece Resumen operativo.
4. No aparecen botones Ver guardados / Ver competencia en Inicio.
5. La botonera inferior muestra WhatsApp con icono reconocible.
6. WhatsApp abre igual desde la botonera.
7. Más sigue mostrando Guardadas / Competencia.
8. Crear oferta y Vender urgente siguen funcionando.
