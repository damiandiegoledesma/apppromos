# AppPromos V12.23.1 — QA-ALE-01 Sincronización multidispositivo

## Problema

Dos dispositivos autenticados sobre la misma carnicería podían mostrar estados
distintos. En el caso detectado, desktop mostraba 40 promos guardadas y mobile
solo 33.

## Causa

`openBusiness()` aceptaba la copia de `localStorage` como respuesta definitiva
antes de consultar Firestore. La caché no tenía vencimiento ni revalidación, por
lo que cada dispositivo podía conservar una versión diferente indefinidamente.

## Corrección

- En una sesión nueva, Firestore vuelve a ser la fuente de verdad.
- La respuesta remota actualiza BusinessStore y la caché local.
- La caché se conserva como respaldo si Firestore falla por conectividad.
- No se modifican datos, reglas, permisos, `resolveSession` ni documentos.

## QA esperado

Después de recargar y seleccionar la misma carnicería, desktop y mobile deben
mostrar la misma cantidad de promos guardadas.
