# CHANGELOG — V11.4.4C Carniza V1.1 contextual corregida

## Objetivo
Ajustar Carniza para que respete mejor el flujo real de venta:

```txt
Inicio → Precios / Ofertas
Precios → Ofertas
Ofertas → Guardar oferta / WhatsApp solo después
WhatsApp → enviar oferta guardada
Pendiente/Pausado → WhatsApp AppPromos
```

## Cambios

- En Inicio, Carniza ya no empuja directo a WhatsApp.
- En Precios, Carniza empuja a Ofertas.
- En Ofertas, Carniza aclara que primero hay que guardar la oferta.
- En Ofertas, el botón a WhatsApp dice: `Ya la guardé: WhatsApp`.
- En WhatsApp, Carniza indica elegir una oferta guardada.
- En Pendiente/Pausado, Carniza deriva a WhatsApp AppPromos para regularizar/reactivar.
- Se eliminan frases internas o técnicas.
- Se mantiene la arquitectura buena de Carniza V1:
  - `access-control-service`
  - WhatsApp real AppPromos
  - navegación por paneles reales
  - `escapeHtml`
  - `updateCarnizaContext`

## No toca

- Firebase
- resolveSession
- BusinessStore
- WriteGuardService
- backend_python
- reglas de seguridad
