# Carnis.app — Asset Pack V2.2

Redibujo vectorial del logo aprobado V2.1. Reemplaza al pack V2.1 (recortes de imagen).

## Qué cambió respecto de V2.1
- Todo nace de vectores: nítido a cualquier tamaño, sin halos sobre fondos oscuros.
- Colores exactos de la paleta: rojo #E52223 y azul #0A2E5B.
- Se agregaron las versiones a una tinta (negro y blanco) y sobre fondo oscuro.
- Tipografía del logo: Kanit (700 en "Carnis.app", 600 en la bajada), convertida a trazos.
  La tipografía de interfaz y textos sigue siendo Poppins.

## Carpetas
- `public/assets/brand/carnis/svg/` — originales vectoriales. Usar estos siempre que se pueda (web, app, imprenta).
- `public/assets/brand/carnis/png/` — 1200 px de ancho y @3x (3600 px), fondo transparente.
- `docs/brand/carnis-v2.2/pdf/` — vectoriales para imprenta (color y negro).
- `public/assets/brand/carnis/app-icons/` — favicon.ico (16/32/48), favicon.svg, íconos 16 a 1024, apple-touch 180, maskable 192/512.
- `docs/brand/carnis-v2.2/fuente/build.py` — script que genera todo el pack.

## Variantes
| Pieza | Uso |
|---|---|
| horizontal | Landing, anuncios, materiales grandes. Incluye la bajada. |
| compacto | Barra de navegación, app, espacios chicos. Sin bajada. |
| wordmark | Solo texto, cuando el ícono ya está presente en la pieza. |
| icono | App, favicon, redes, centro de un QR. |

Sufijos: `color` (fondo claro) · `fondo-oscuro` (sobre azul o negro) · `negro` (una tinta, térmica y fotocopia) · `blanco` (una tinta sobre fondos oscuros).

## Reglas
- Impresora térmica de 58 mm y folletos chicos: usar `compacto-negro` o `icono-negro`. La bajada no se lee a ese tamaño.
- En piezas para el cliente final (carteles, QR, folletos), la carnicería va primero; Carnis va chico ("Funciona con Carnis.app").
- El punto de la "i" es redondo. No agregar hojas, tildes ni adornos.
