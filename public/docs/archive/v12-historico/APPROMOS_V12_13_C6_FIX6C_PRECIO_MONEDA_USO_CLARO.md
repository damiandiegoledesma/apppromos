# AppPromos V12.13-C6-FIX6C — Precio moneda y uso claro

## Objetivo

Mejorar Cambiar precios para que el carnicero vea importes claros y entienda la columna de uso sin confusión.

## Cambios

- Se oculta el cartel grande "Tip para tu web".
- Se deja una ayuda chica:
  "Precios por kg · marcado = lo usás · desmarcado = no aparece en ofertas ni en tu web."
- Los precios se muestran como moneda argentina:
  $ 30.000
- El guardado interno sigue usando números limpios:
  30000
- Se mejora la confirmación al marcar un producto como No uso.

## Criterio UX

Cambiar Precios debe permitir:
buscar / filtrar → cambiar precio → guardar

La acción de uso/no uso debe ser clara y no debe parecer borrado definitivo.

## Regla actual

Todos los precios se cargan por kg.

## No toca

- Guardar global
- Deshacer ajuste masivo
- Ajustes por rubro
- Web Arranque
- WhatsApp
- Firebase/Auth
