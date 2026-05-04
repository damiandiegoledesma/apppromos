# AppPromos — Versión actual

## V12.11-B — Web de Arranque desde registro

Base de trabajo:

- V12.10-B2 cerrado con Panel Admin operativo, empresas TEST, planes/pagos y documentación de funcionamiento.
- Último punto local previo: `c665ed2 — Docs panel admin funcionamiento V12.10-B2`.
- Próximo foco comercial: convertir la web propia automática en gancho del trial.

## Objetivo

Crear una **Web de Arranque** automáticamente cuando una carnicería se registra gratis.

La web debe generar efecto wow sin publicar datos incompletos:

- muestra identidad real de la carnicería;
- muestra WhatsApp real;
- usa slug público propio;
- no publica precios demo;
- no publica ofertas demo;
- no publica productos con precio 0 o sin precio válido.

## Incluye

- Documento `V12.11-A_DIAGNOSTICO_WEB_AUTOMATICA_REGISTRO.md`.
- Registro con web starter creada desde el alta.
- `publicWebSlugs` activo desde el registro.
- `publicPhoneKeys` mantiene la unicidad de WhatsApp.
- Estado web:
  - `enabled: true`;
  - `published: true`;
  - `active: true`;
  - `mode: "starter"`;
  - `priceListStatus: "pending_real_prices"`.
- Web pública con aviso seguro mientras faltan precios reales.
- Web pública filtrando productos sin precio válido.

## No toca

- Crear oferta.
- Oferta rápida.
- Oferta con descuentos.
- Vender urgente.
- WhatsApp.
- Backend Python.
- SQLite.
- Borrado real Auth.
- Panel Admin salvo documentación indirecta.

## Pendiente siguiente

### V12.11-C — Carniza efecto wow primer ingreso

- Mostrar mensaje de Carniza: “Ya tenés tu web propia”.
- Botón principal: Actualizar mis precios.
- Botón secundario: Ver mi web.

### V12.11-D — Confirmación de precios reales

- Cuando el carnicero actualiza precios, marcar web como lista o confirmar precios.
- Permitir que la web muestre productos válidos.

### V12.11-E — Estado web en Panel Admin

- Mostrar link público, slug, estado starter/lista y último cambio.
