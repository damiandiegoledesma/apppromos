# AppPromos V12.13-C6-FIX5A — Recorrido solo onboarding explícito

## Objetivo

Evitar que el bloque "Recorrido sugerido" quede fijo en Inicio diario, incluso en carnicerías demo como Carnes Sur.

## Regla actual

El recorrido sugerido solo se muestra si está activado explícitamente como onboarding / primer uso.

## Cómo mostrarlo para pruebas

Usar una de estas opciones:

- URL con ?recorrido=1
- URL con ?onboarding=1
- localStorage: apppromos_show_recorrido_sugerido_v1 = 1

## Future recomendado

Implementar onboarding real con marca persistente:

- localStorage para demo rápida;
- Firestore por usuario o carnicería para producción.

Campo sugerido futuro:

onboarding.homeRouteSeen = true

## Criterio UX

Inicio vende.
Carniza guía.
Más administra.
