# PATCH V12.10-B2-C3A — Marcar base actual como TEST

## Objetivo
Dejar claramente marcada la base actual de AppPromos como entorno de prueba antes de que entre el primer cliente real.

## Archivos incluidos

```txt
public/js/modules/admin-users-module.js
public/js/services/admin-service.js
README_PATCH_V12_10_B2_C3A_MARCAR_BASE_TEST.md
```

## Qué cambia

1. Agrega en el Panel Admin una herramienta protegida:

```txt
Marcar base actual como TEST
```

2. La acción pide confirmación fuerte escribiendo:

```txt
MARCAR TEST
```

3. Marca todas las carnicerías actuales como prueba:

```js
isTestBusiness: true
adminStatus: "test"
testMarkedAt
testReason
updatedAt
```

4. Marca también `businesses/{businessId}/core/meta` con la misma información TEST.

5. Marca usuarios asociados como prueba:

```js
isTestUser: true
testMarkedAt
testReason
updatedAt
```

6. Marca índices públicos asociados, si existen:

```txt
publicPhoneKeys
publicWebSlugs
```

con:

```js
isTestBusiness: true
adminStatus: "test"
testMarkedAt
testReason
updatedAt
```

7. Registra la acción en `adminActions` como:

```txt
current_base_marked_as_test
```

## Qué NO hace

```txt
No borra empresas.
No borra usuarios.
No toca Firebase Auth.
No libera WhatsApp.
No libera slug.
No cambia acceso/pago/plan.
No toca registro/login.
No toca Web automática.
No toca Crear oferta, Vender urgente ni WhatsApp del cliente final.
```

## Test mínimo

```powershell
cd C:\apppromos

node --check .\public\js\modules\admin-users-module.js
node --check .\public\js\services\admin-service.js

git status --short
git diff --stat
```

Después en navegador:

```txt
1. Panel Admin abre.
2. En Carnicerías aparece el bloque Base actual: X TEST · Y sin marca TEST.
3. El botón Marcar base actual como TEST aparece si hay empresas sin marca TEST.
4. Al tocarlo, pide escribir MARCAR TEST.
5. Si se cancela, no cambia nada.
6. Si se confirma, marca todas las empresas actuales como TEST.
7. El filtro Admin > Empresas TEST muestra todas las empresas actuales.
8. Cada ficha muestra EMPRESA TEST.
9. Usuarios asociados quedan con isTestUser: true en Firestore.
10. No se borró nada.
11. Archivar / Restaurar sigue funcionando.
12. Gestionar módulos sigue funcionando.
13. WhatsApp admin sigue funcionando.
14. Consola sin errores rojos nuevos.
```

## Criterio de cierre

Se puede cerrar B2-C3A si el Panel Admin diferencia claramente:

```txt
Empresas TEST actuales
Clientes reales futuros
```

y queda lista la base para el siguiente bloque:

```txt
V12.10-B2-C3B — Clonar TEST + Eliminar TEST
```
