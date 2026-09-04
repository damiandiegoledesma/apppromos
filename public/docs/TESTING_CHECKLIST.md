# AppPromos — Testing Checklist

## V12.23.2 — Cierre

Base: V12.23.1, commit `b16e57b007a823843eaf939abbf49616aba40aa7`.

### Validaciones locales aprobadas

- [x] FIX E — Navegación pública y superposiciones.
- [x] FIX F — Nombre público configurable de Novillo.
- [x] FIX G — Recordar solamente nombre y teléfono.
- [x] FIX H — Ajustes finales del carrito público.
- [x] QA integral de FIX E–H.
- [x] Retiro de la DEMO pública mediante Opción 1.
- [x] `app.html?demo=1` sin sesión muestra ingreso/registro.
- [x] La pantalla pública de ingreso no muestra navegación interna.
- [x] Validación sintáctica de los seis archivos JavaScript modificados.
- [x] `git diff --check` sin errores; avisos LF/CRLF no bloqueantes.

### Cierre Git pendiente

- [ ] Revisar archivos incluidos con `git status --short`.
- [ ] Crear commit definitivo en `dev`.
- [ ] Enviar `dev` al remoto.
- [ ] Crear y revisar PR `dev` → `main`.
- [ ] Mergear el PR.
- [ ] Confirmar hash definitivo de `main`.

### Despliegue pendiente

- [ ] Desplegar Firebase Hosting.
- [ ] Desplegar reglas de Firestore.
- [ ] Confirmar que producción sirve la nueva versión sin caché anterior.

### QA de producción pendiente

- [ ] Ingreso de una carnicería real.
- [ ] Registro de una carnicería nueva y catálogo inicial.
- [ ] Inicio del superadmin en el tenant técnico aislado.
- [ ] Cambio explícito del superadmin hacia una carnicería real.
- [ ] `app.html?demo=1` sin sesión no habilita una DEMO pública.
- [ ] Un invitado no puede leer `businesses/demo`.
- [ ] Navegación pública de seis accesos.
- [ ] Productos, rubros, alias de Novillo y búsqueda.
- [ ] Promos y Ofertas de hoy.
- [ ] Carrito, cantidades, componentes y total.
- [ ] Recordar y olvidar nombre y teléfono.
- [ ] Retiro, envío, pago y pedido por WhatsApp.
- [ ] Carrito flotante y Carniza sin superposiciones.
- [ ] Consola sin errores rojos.

### Entregable final pendiente

- [ ] Sincronizar `main` → `dev`.
- [ ] Generar ZIP desde el commit definitivo de `main`.
- [ ] Registrar nombre, tamaño y SHA-256 del ZIP.
