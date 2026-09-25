# CHANGELOG — V11.4.7 DEMO WOW CTA GLOBAL

## Objetivo
Convertir la demo de AppPromos en una experiencia más vendible y visible desde toda la landing.

## Cambios
- Demo entra por `/app.html?demo=1` como Carnicería de Carniza.
- Sesión demo en memoria: no crea empresa real y no usa Firestore para datos demo.
- Productos demo con precios actualizados:
  - Asado $15.990
  - Vacío $18.990
  - Chorizo $5.990
  - Pollo entero $3.999
  - Picada común $8.999
- Combo demo precargado: Combo Parrillero.
- Banner superior dentro de la app demo con CTA a registro.
- Bloqueo de guardado en modo demo con mensaje comercial.
- CTA global flotante en landing para probar demo.
- Se elimina el botón demo del formulario de registro.

## Reglas respetadas
- No se toca `web.html`.
- No se escribe en Firestore desde demo.
- Demo y registro quedan separados.
- Probar gratis lleva a registro.
- Probar demo lleva a Carnicería de Carniza.
