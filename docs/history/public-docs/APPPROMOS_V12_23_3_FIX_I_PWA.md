# AppPromos V12.23.3 — FIX I

## Revisión de instalación PWA

Base funcional: AppPromos V12.23.2, commit `b9be988`.

## Alcance

- Unifica el CTA de instalación como `INSTALAR` en landing, aplicación y menú mobile.
- Cambia el estado visible a `INSTALADA` cuando AppPromos se ejecuta como PWA o el navegador registró su instalación.
- Informa que AppPromos ya está instalada si se pulsa nuevamente ese acceso.
- Actualiza inmediatamente todos los botones al completarse la instalación.
- Mantiene la detección separada por dispositivo, navegador y perfil.
- Aplica una espera de siete días después de rechazar la invitación automática.
- Actualiza la identificación del service worker a `apppromos-v12.23.3-fix-i`.

## Compatibilidad

- Conserva el cuadro nativo de instalación de Chrome y Edge.
- Conserva las instrucciones manuales para iPhone y iPad.
- No agrega caché offline: AppPromos continúa consultando siempre la versión vigente.
- No modifica Firebase, Firestore, autenticación, billing, BusinessStore ni datos de las carnicerías.

## Archivos modificados

- `public/index.html`
- `public/app.html`
- `public/js/app-main.js`
- `public/js/pwa-install.js`
- `public/sw.js`

## QA requerido

1. En Chrome sin instalar, comprobar CTA `INSTALAR` y cuadro nativo.
2. Completar la instalación y comprobar el cambio inmediato a `INSTALADA`.
3. Abrir AppPromos desde su icono y confirmar ventana independiente.
4. Pulsar `INSTALADA` y comprobar el mensaje informativo.
5. Rechazar una invitación automática y confirmar que no reaparece durante siete días.
6. En iPhone/iPad, comprobar las instrucciones para agregar a pantalla de inicio.
7. Confirmar que landing, ingreso y navegación interna continúan funcionando.
8. Confirmar consola sin errores rojos.
