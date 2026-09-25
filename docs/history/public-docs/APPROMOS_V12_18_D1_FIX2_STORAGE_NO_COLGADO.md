# AppPromos V12.18-D1-FIX2 — Storage sin bloqueo silencioso

## Problema corregido
La selección y preview de logo/foto funcionaban, pero si Firebase Storage no respondía o rechazaba la carga,
el botón podía quedar indefinidamente en "Guardando logo..." sin permitir reintentar.

## Cambios
- upload resumable con progreso visible;
- timeout de 30 segundos sin progreso;
- cancelación segura si la carga queda trabada;
- mensajes humanos para errores comunes de Storage;
- el botón vuelve a habilitarse como "Reintentar" si falla;
- error técnico también se registra en consola para diagnóstico.

## No modifica
Firestore, modelo brand, web.html, carrito, ofertas, precios, WhatsApp, slug, registro ni PWA.

## Prueba
1. Abrir Datos de mi carnicería.
2. Elegir logo.
3. Guardar.
4. Debe mostrar porcentaje.
5. Si Storage está correctamente desplegado: termina y persiste.
6. Si Storage falla: en <=30 s debe mostrar un error y habilitar Reintentar.
