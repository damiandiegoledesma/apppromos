# AppPromos V12.13-C7-B — Logo liviano en login/registro

## Objetivo

Reducir peso de assets publicos y unificar el logo usado en login/registro con el logo liviano ya usado por la app, landing y Web Arranque.

## Base

- Rama de trabajo: maintenance/repo-cleanup-v12-13
- Base productiva: V12.13-C6-FIX3 web arranque limpia
- C7-A aplicado: limpieza segura de assets no usados

## Diagnostico

El diagnostico C7-B detecto que public/assets/images/logo.png pesaba cerca de 1 MB y tenia una sola referencia productiva en public/js/modules/public-auth-module.js.

Tambien se detecto que public/assets/brand/logo/apppromos-square-transparent.png no tenia referencias productivas, mientras que la app, landing y web usan public/assets/logo/apppromos-square-transparent.png.

## Cambios realizados

- public/js/modules/public-auth-module.js ahora usa /assets/logo/apppromos-square-transparent.png.
- Se elimino public/assets/images/logo.png.
- Se elimino public/assets/brand/logo/apppromos-square-transparent.png.

## Que NO se toco

- Crear oferta
- Vender urgente
- WhatsApp
- Cambiar precios
- Web Arranque
- Firebase/Auth
- BusinessStore
- Landing logica

## QA recomendado

- Landing carga.
- Login/registro muestra logo.
- Probar demo funciona.
- App/demo abre.
- Carniza aparece.
- Web Arranque carga.
- Logo AppPromos se ve.
- WhatsApp abre.
- Consola sin 404 de /assets/images/logo.png ni /assets/brand/logo/apppromos-square-transparent.png.
