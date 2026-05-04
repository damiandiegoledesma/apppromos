# AppPromos — Versión actual

## V12.11-C2 — Card simple de Web de Arranque en Inicio

Base de trabajo:

- V12.11-B ya crea una Web de Arranque desde el registro.
- La web pública abre con identidad real y no publica precios demo ni productos sin precio válido.
- El primer intento V12.11-C quedó descartado porque generaba una capa/overlay bloqueante en Inicio.

## Objetivo

Mostrar en Inicio una card simple de Carniza para que el carnicero vea el efecto wow de la Web de Arranque sin bloquear la pantalla.

Mensaje central:

- “Ya tenés tu web propia”.
- “La dejamos preparada con tu nombre y tu WhatsApp”.
- “Ahora actualizá tus precios reales y salís vendiendo”.

## Incluye

- Card normal dentro del módulo Inicio.
- Botón **Actualizar mis precios** que abre Cambiar precios.
- Botón **Ver mi web** que abre la web pública generada.
- Botón **Ocultar por ahora** que oculta la card durante la sesión.
- Documento `V12.11-C2_CARD_WEB_ARRANQUE_INICIO.md`.

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

### V12.11-D — Confirmación de precios reales

- Cuando el carnicero actualiza precios, marcar la web como lista o confirmar precios.
- Permitir que la web pública empiece a mostrar productos válidos.

### V12.11-E — Estado web en Panel Admin

- Mostrar link público, slug, estado starter/lista y último cambio.
