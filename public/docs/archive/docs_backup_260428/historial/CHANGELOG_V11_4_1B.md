# CHANGELOG — AppPromos V11.4.1B

Tipo: patch quirúrgico post-checklist sobre V11.4.1A.

## Objetivo

Corregir dos problemas detectados en testing real:

1. Las cuentas `overdue` podían guardar cuando el usuario estaba operando la app en sesión superadmin.
2. Los módulos bloqueados, especialmente Competencia/Mercados, podían dejar al usuario sin salida clara.

## Cambios incluidos

- `WriteGuardService` ya no permite que el superadmin saltee reglas comerciales dentro de la app cliente.
- El superadmin sigue administrando estados, planes y módulos desde Admin SaaS.
- Las cuentas `overdue` quedan en modo consulta: pueden ver datos, pero no guardar precios/ofertas/web.
- Precios muestra modo consulta y desactiva guardado/edición cuando la cuenta no puede escribir.
- Crear Oferta muestra guardado pausado cuando la cuenta no puede escribir.
- Los módulos bloqueados incluyen botón `Volver a Inicio`.
- Se mantiene botón WhatsApp AppPromos para regularización/reactivación.

## No incluido

- No toca Firestore Rules.
- No toca DEMO como template operativo.
- No toca catálogo base.
- No toca backend Python / IA.
- No incluye header inteligente ni modo nocturno; quedan como futures.
