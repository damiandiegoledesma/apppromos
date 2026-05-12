# AppPromos V12.15-C — Vertical helpers base

## Objetivo

Agregar helpers simples para leer la configuración vertical sin conectar todavía esa configuración a los módulos grandes.

## Archivos modificados

- public/js/config/vertical-config.js
- public/docs/APPPROMOS_V12_15_C_VERTICAL_HELPERS_BASE.md

## Qué agrega

Helpers disponibles:

- getVerticalLabel
- getBusinessLabel
- getProductLabel
- getCategoryLabel
- getDefaultUnit
- getAllowedUnits
- getVerticalCategories
- getVerticalDemoCopy
- getVerticalUrgentModeCopy
- getVerticalWhatsappCopy
- getVerticalWebCopy
- getCarnizaVerticalCopy

## Regla principal

Este hito no cambia comportamiento visible.

Los helpers quedan disponibles, pero todavía no se importan en Crear oferta, Cambiar precios, Web Arranque, WhatsApp, Demo, Registro ni Panel Admin.

## Motivo

V12.15-B creó la primera configuración vertical base para carnicería.

V12.15-C agrega una forma prolija de leer esa configuración sin obligar a los módulos grandes a conocer la estructura interna del objeto.

## Qué NO se hizo

- No se reemplazaron textos hardcodeados.
- No se tocaron flujos sagrados.
- No se modificó Firebase.
- No se modificó Mercado Pago.
- No se modificó el backend.
- No se modificó la UI visible.

## Próximo paso futuro

V12.15-D debería elegir una primera conexión controlada y de bajo riesgo.

La recomendación es no empezar por builder-module, prices-module ni app-main.

Primero conviene conectar helpers en una zona chica o crear tests manuales de lectura.
