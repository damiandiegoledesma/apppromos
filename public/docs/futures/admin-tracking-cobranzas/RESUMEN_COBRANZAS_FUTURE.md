# RESUMEN FUTURE — Cobranzas / La Nelly

Este paquete documenta una idea futura para AppPromos:

```txt
Panel Admin → Cobranzas → WhatsApp + Link de pago → Marcar pago → La Nelly cuida acceso
```

## Material recibido

La propuesta original trae:

- especificación técnica mínima;
- data model;
- resumen final;
- diagramas SVG.

## Decisión AppPromos

Se acepta como **future**, no como implementación inmediata.

Motivos:

1. La idea es valiosa para operar clientes reales.
2. Debe vivir como submódulo separado para no sobrecargar la ficha.
3. Hay que adaptarla a Firestore, porque la propuesta original usa ejemplos de Realtime Database.
4. La Nelly debe mantener tono humano, no de castigo.
5. Mercado Pago debe arrancar con links manuales/controlados, sin API ni secretos en frontend.

## Qué queda aprobado conceptualmente

```txt
- Bandeja de pagos pendientes/vencidos.
- WhatsApp prearmado para seguimiento.
- Link de pago por cliente/plan.
- Marcar pago recibido manualmente.
- Historial de acciones admin.
- La Nelly avisa y ayuda a resolver.
```

## Qué NO queda aprobado todavía

```txt
- Implementar directo en producción.
- Usar firebase.database().
- Usar Realtime Database.
- Meter Mercado Pago API en frontend.
- Webhooks.
- Scheduler.
- Conciliación automática.
- Bloqueos agresivos sin criterio de UX.
```

## Frase guía

```txt
Cobranzas no es perseguir al cliente.
Es cuidar continuidad para que siga vendiendo.
```

## Rama sugerida

```txt
future/admin-tracking-cobranzas
```

## Carpeta sugerida

```txt
public/docs/futures/admin-tracking-cobranzas/
```
