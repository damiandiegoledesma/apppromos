# AppPromos V12.15-D1 - Primera conexion controlada de helpers

## Objetivo

Conectar por primera vez los helpers verticales en un modulo chico y secundario.

## Archivo modificado

- public/js/modules/business-switcher-module.js

## Archivo de documentacion

- public/docs/APPPROMOS_V12_15_D1_BUSINESS_SWITCHER_HELPER.md

## Que se conecto

Se importo getBusinessLabel desde:

- public/js/config/vertical-config.js

Y se uso para labels simples del switcher de carnicerias del Panel/Admin.

## Regla principal

Este hito mantiene el mismo texto visible para la vertical carniceria.

No cambia comportamiento comercial.

## Que NO se toco

- Crear oferta
- Cambiar precios
- WhatsApp
- Web Arranque
- Demo
- Registro
- Panel Admin grande
- Firebase
- Mercado Pago
- Backend

## Motivo

V12.15-B creo la configuracion vertical base.

V12.15-C agrego helpers.

V12.15-D1 hace la primera conexion real, pero en una zona chica y de bajo riesgo.

## Resultado esperado

Para la vertical actual carniceria, el usuario sigue viendo textos equivalentes:

- Sin carnicerias
- Carniceria activa
- No se pudo cambiar la carniceria activa

La diferencia es que ahora esos textos salen desde helpers preparados para futuras verticales.
