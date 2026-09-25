# AppPromos V12.23.2 — Retiro de la demo pública

## Alcance aprobado

Se aplicó la Opción 1: retirar la experiencia pública de demo y conservar temporalmente el tenant técnico aislado que protege el arranque del superadmin.

## Cambios

- Se eliminó `Probar demo sin registro` de la pantalla pública de ingreso y registro.
- `app.html?demo=1` ya no crea una sesión ficticia ni permite entrar como cliente demo.
- Un visitante sin sesión permanece en Ingresar/Registrarse.
- La navegación móvil interna no se crea ni se muestra en la pantalla pública de ingreso.
- Los invitados ya no reciben la empresa demo desde `getUserBusinesses()`.
- La validación de acceso a `businessId = demo` quedó limitada al superadmin.
- Las reglas de Firestore dejaron de permitir lectura pública de `businesses/demo` y sus subdocumentos.

## Compatibilidad conservada

- El tenant técnico `demo` permanece disponible únicamente para el arranque seguro del superadmin.
- No se eliminan datos históricos ni archivos de seeder.
- No se modifica el inicio de clientes reales.
- No se modifica el registro ni el catálogo inicial de 84 productos.
- No se modifica billing, BusinessStore, WriteGuard ni la estructura multi-tenant.
- Se conservan los Fixes A–H.

## Archivos modificados

- `public/js/modules/public-auth-module.js`
- `public/js/app-main.js`
- `public/js/services/auth-service.js`
- `public/js/services/business-service.js`
- `firestore.rules`

## QA requerido

1. Abrir `app.html` sin sesión: debe mostrar Ingresar/Registrarse y no mostrar Probar demo.
2. Abrir `app.html?demo=1` sin sesión: debe continuar mostrando Ingresar/Registrarse, sin la barra inferior interna.
3. Confirmar que no se abre Carnicería de Carniza ni aparece banner demo.
4. Iniciar sesión con una carnicería real y comprobar su `businessId` correcto.
5. Probar registro nuevo y catálogo inicial.
6. Iniciar sesión como superadmin y confirmar que arranca en el tenant técnico aislado.
7. Desde Admin, seleccionar explícitamente una carnicería real y comprobar la navegación.
8. Confirmar que un invitado no puede leer `businesses/demo` con las reglas actualizadas.
9. Confirmar consola sin errores rojos.
10. Ejecutar QA breve de la web pública y Fixes E–H.

## Nota de despliegue

Este cambio incluye `firestore.rules`. En producción deberá desplegarse Hosting junto con las reglas de Firestore después de aprobar el QA local.
