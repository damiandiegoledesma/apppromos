# CHANGELOG — V11.4.7B HOTFIX DEMO ROUTE

## Objetivo
Corregir el arranque de la demo cuando se ingresa desde la landing a `/app.html?demo=1`.

## Cambios
- Se define `isDemoRoute()` dentro de `auth-service.js`.
- Se define sesión demo como cliente falso (`appMode: "client"`) con `isDemo: true`.
- Se protege `demoBtn` en `auth-module.js` para evitar error si el botón no existe en el registro.
- El botón demo apunta a `./app.html?demo=1`.

## Resultado esperado
- La landing no muestra error en consola por `demoBtn` nulo.
- La demo no vuelve inmediatamente a landing.
- La demo entra como Carnicería de Carniza.
