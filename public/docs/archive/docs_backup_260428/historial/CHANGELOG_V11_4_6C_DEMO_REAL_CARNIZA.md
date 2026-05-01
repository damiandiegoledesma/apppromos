# CHANGELOG — V11.4.6C Demo real Carnicería de Carniza

Fecha: 2026-04-28
Base: V11.4.5F — Carniza Landing + Demo conectado

## Objetivo

Dejar funcionando una demo real desde la landing, sin registro, sin crear empresas y sin tocar datos reales.

## Cambios incluidos

### Landing

- Se agrega CTA visible en el hero: **Probar demo sin registro**.
- El CTA entra directo a `./app.html?demo=1`.
- Se elimina el botón **Probar demo** del formulario de registro.
- Se mantiene separado el flujo comercial:
  - **Probar gratis** → registro.
  - **Probar demo sin registro** → demo inmediata.

### Sesión demo

- Se agrega `public/js/services/demo-session-service.js`.
- Se define negocio virtual:
  - `businessId`: `demo-carniza`
  - `businessName`: `Carnicería de Carniza`
- La sesión demo usa `appMode: "demo"` e `isDemo: true`.
- La demo no requiere Firebase Auth.

### Datos demo

- Se crean datos mínimos en memoria:
  - Asado
  - Vacío
  - Picada común
  - Pollo entero
  - Chorizo
- Los datos demo no se guardan en Firestore.
- Los datos se regeneran al entrar en modo demo.

### App

- `app-main.js` permite iniciar con `appMode: "demo"`.
- En demo se evita:
  - tracking de login/actividad,
  - listener de control de negocio,
  - carga de cache de competencia,
  - módulos Admin, Competencia y Web Premium.
- Se agrega banner superior de demo con CTA a registro.

### Escrituras

- `write-guard-service.js` bloquea guardados cuando la sesión o el negocio son demo.
- Mensaje comercial:
  - "Estás probando la Carnicería de Carniza. Para guardar tus precios y ofertas, registrate gratis."

## No incluido

- No se toca `web.html`.
- No se crean documentos nuevos en Firebase.
- No se modifica la estructura real de negocios.
- No se cambia el flujo de usuarios reales.
- No se integra todavía Python, SQLite ni IA V12.

## Riesgo controlado

La demo queda aislada por URL, sesión y `businessId` virtual. Cualquier intento de escritura se corta antes de Firestore.
