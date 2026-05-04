# AppPromos — Versión actual

## V12.11-D1 — Activación Web de Arranque: guía para precios

Base de trabajo:

- V12.11-B crea una Web de Arranque desde el registro.
- V12.11-C2 validó el aviso de Web de Arranque, pero se decide no dejarlo como bloque permanente del cuerpo de Inicio.
- La web pública no publica precios demo ni productos sin precio válido.

## Objetivo

Bajar la fricción del primer paso importante después del registro: actualizar precios reales.

Mensaje clave:

> A los productos que no vendés, poneles 0. AppPromos no los muestra en tu web.

## Incluye

- Tip claro dentro del módulo **Cambiar precios**.
- Retiro del aviso/card de Web de Arranque del cuerpo principal de Inicio para no quitar foco al flujo de venta.
- Documentación `V12.11-D1_ACTIVACION_WEB_ARRANQUE_PRECIOS.md`.

## No toca

- Registro.
- Web pública.
- Crear oferta.
- Oferta rápida.
- Oferta con descuentos.
- Vender urgente.
- WhatsApp.
- Panel Admin.
- Carniza flotante / overlays.
- Backend Python.
- SQLite.

## Pendiente siguiente

### V12.11-D2 — Carniza navegación segura y aviso contextual

- Llevar los avisos de Web de Arranque dentro de Carniza, sin overlay bloqueante.
- Agregar en Carniza: Volver a Inicio y Salir/Cerrar sesión.
- Mantener la app mobile-first y sin bloques que roben foco al cuerpo principal.

### V12.12 — Navegación mobile-first

- Evaluar botonera inferior para Android gama media/entrada.
- Priorizar: Inicio, Precios, Vender/Crear, WhatsApp y Más.
