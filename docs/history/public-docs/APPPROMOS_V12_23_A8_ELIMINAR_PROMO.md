# AppPromos V12.23-A8 — Eliminar definitivamente una promo

## Objetivo

Permitir la limpieza definitiva de promociones que ya no tienen valor, sin
exponer la operación diaria a eliminaciones accidentales.

## Reglas de seguridad

- La acción solo aparece dentro de `Archivadas`.
- Una promo activa o publicada no puede eliminarse directamente.
- Para confirmar hay que escribir `ELIMINAR`.
- Antes de borrar se relee el estado actual de la promo.
- Se elimina cualquier referencia residual en la web pública.
- La eliminación es irreversible.
- Las promos demo precargadas no se pueden eliminar.

## Persistencia

La promo se retira del arreglo `savedCombos`. No se crean colecciones ni
documentos nuevos y no se modifica la arquitectura de sesión o acceso.

## QA mínimo

1. Archivar una promo creada para la prueba.
2. Cancelar el diálogo de eliminación y confirmar que se conserva.
3. Escribir un texto distinto de `ELIMINAR` y confirmar que se conserva.
4. Escribir `ELIMINAR` y comprobar que desaparece de Archivadas.
5. Recargar la app y verificar que no reaparece.
6. Confirmar que no aparece en la web pública.
7. Validar el flujo en mobile.

