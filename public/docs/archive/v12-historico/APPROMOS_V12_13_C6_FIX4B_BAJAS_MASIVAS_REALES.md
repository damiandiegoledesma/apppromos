# AppPromos V12.13-C6-FIX4B — Bajas masivas reales

## Objetivo

Corregir el comportamiento de los ajustes masivos de precios cuando el carnicero aplica una baja por rubro.

## Problema

Antes, el ajuste -5% podía no verse aplicado en productos de precio bajo porque el sistema redondeaba siempre hacia arriba a la centena.

Ejemplo:

400 - 5% = 380
redondeo hacia arriba = 400

Resultado: visualmente no bajaba.

## Regla nueva

- Aumentos masivos: redondean hacia arriba a la centena.
- Bajas masivas: redondean hacia abajo a la centena para que la baja sea real.

## Ejemplos

400 + 5% = 420 → 500
400 - 5% = 380 → 300

5500 - 5% = 5225 → 5200

## Criterio UX

Si el carnicero toca -5%, tiene que ver una baja real.

## No toca

- Guardar global
- Deshacer ajuste masivo
- No uso
- Web Arranque
- WhatsApp
- Firebase/Auth
