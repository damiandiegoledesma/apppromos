# AppPromos V12.15-GH2 - Codespaces probado desde dev

## Objetivo

Validar que AppPromos puede correr desde GitHub Codespaces sin depender de la PC local.

Este hito no modifica codigo de producto.

## Estado validado

- Codespace creado desde la rama dev.
- Terminal cloud funcionando.
- Repo AppPromos abierto en VS Code Web.
- Rama activa: dev.
- Git status limpio antes de probar.
- Node disponible.
- npm disponible.
- Git disponible.
- GitHub CLI disponible.
- Java disponible.
- Firebase CLI instalado dentro del Codespace.
- Firestore Emulator levanta.
- Hosting Emulator levanta.
- Emulator UI abre.
- Landing de AppPromos abre desde puerto 5000.
- App demo abre en /app.html?demo=1.
- Crear oferta funciona.
- Enviar por WhatsApp abre correctamente.

## Entorno validado

- Rama: dev
- HEAD: d83780b - V12.15-GH1 documenta GitHub CLI y VS Code
- Node: v24.14.0
- npm: 11.9.0
- Firebase CLI: 15.17.0
- Java: OpenJDK 25.0.2 LTS

## Observacion tecnica

Durante la prueba aparecio en consola:

Listener business control error
FirebaseError: Missing or insufficient permissions

No bloqueo la prueba GH2. La app cargo, la demo abrio, Crear oferta funciono y WhatsApp se abrio.

Queda como pendiente tecnico para revisar mas adelante en entorno emulator/Codespaces.

## Resultado

AppPromos corrio desde GitHub Codespaces.

Esto confirma que el desarrollo puede hacerse desde un entorno cloud, sin depender exclusivamente de C:\apppromos en la PC local.

## Estado del hito

V12.15-GH2 validado.
Producto sin cambios funcionales.
Deploy no necesario.
