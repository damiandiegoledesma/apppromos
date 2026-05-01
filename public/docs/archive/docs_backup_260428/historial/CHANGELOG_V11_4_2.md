# CHANGELOG — V11.4.2 Header Inteligente Unificado

## Objetivo
Transformar el header del usuario final en una botonera de venta rápida, con estética mobile-first basada en la opción visual 2 aprobada.

## Cambios incluidos

- Header superior más compacto, cálido y comercial.
- Nueva jerarquía visible: **Precios → Ofertas → WhatsApp**.
- Renombre visible de botones:
  - “Cambiar precios” → “Precios”
  - “Crear oferta” → “Ofertas”
  - “WhatsApp” mantiene foco comercial.
- Estado comercial simple en header:
  - ✅ Al día
  - 🎁 Prueba
  - ⏳ Por vencer
  - ⚠️ Pendiente
  - 🔒 Pausado
- Estado visual automático con tonos suaves:
  - Por vencer: amarillo suave.
  - Pendiente: naranja claro.
  - Pausado: rojo suave.
- Se elimina del header visible el texto “SaaS controlado”.
- El header sigue ocultándose al bajar y apareciendo al subir.
- Se mantiene la regla de Admin: en panel Admin el header grande queda oculto para liberar espacio.

## No incluido

- No se incorpora Carniza todavía.
- No se incorpora modo oscuro todavía.
- No se modifican Firebase Rules.
- No se modifica resolveSession.
- No se modifica BusinessStore.
- No se modifica WriteGuardService.
- No se modifica DEMO/template ni catálogo base.

## Decisión visual

Modo normal: estética clara, suave y amigable.
Modo oscuro: queda como future, inspirado en las opciones visuales 1/3.
Modos comerciales: quedan preparados de forma suave, sin tono punitivo.
