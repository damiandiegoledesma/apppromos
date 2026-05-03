# AppPromos PATCH V12.10-B2-C1-FIX1 — Panel Admin usable

## Objetivo

Corregir los puntos detectados en el test de B2-C1 sin tocar registro, login, Web automática ni flujos comerciales.

## Archivos incluidos

- `public/js/modules/admin-users-module.js`
- `public/js/services/admin-service.js`
- `public/js/services/access-control-service.js`

## Cambios principales

1. **Plan DUEÑO visible**
   - Se agrega `dueno` a los planes aceptados.
   - El select de plan muestra `DUEÑO`.

2. **Filtro Empresas TEST**
   - Nuevo filtro `Admin` con:
     - Todos
     - Clientes reales
     - Empresas TEST
     - Archivadas
     - Clones

3. **Vista más compacta**
   - La tabla grande se reemplaza por fichas operativas compactas.
   - La vista principal muestra lo esencial:
     - Cliente
     - WhatsApp
     - Acceso
     - Pago
     - Plan
     - Admin
     - Acciones principales
   - Los datos largos quedan dentro de `Ver detalle y acciones`.

4. **“Establecer defaults” renombrado**
   - Ahora se muestra como `Reparar configuración base`.
   - Incluye confirmación y explicación simple.

5. **Gestionar módulos menos colgado**
   - El modal guarda módulos en una sola operación bulk.
   - Evita múltiples escrituras secuenciales y múltiples logs.
   - Cierra el modal y recarga datos después de guardar.

6. **Limpieza técnica**
   - Se elimina un duplicado interno de `const before` en `setBusinessTestFlag`.

## Qué NO toca

- Registro
- Login
- Web automática
- Crear oferta
- Vender urgente
- WhatsApp del cliente final
- Backend Python
- SQLite
- Borrado real de Auth

## Test mínimo

1. Panel Admin abre.
2. Carnicerías carga.
3. Usuarios carga.
4. Filtro `Admin > Empresas TEST` funciona.
5. Plan DUEÑO aparece en filtro y selector.
6. Fichas se ven más compactas.
7. `Ver detalle y acciones` despliega datos largos.
8. `Reparar configuración base` pide confirmación.
9. Gestionar módulos guarda y cierra sin quedar colgado.
10. Archivar / Restaurar sigue funcionando.
11. Desactivar / Reactivar usuario sigue funcionando.
12. Entrar como cliente sigue funcionando.
13. Consola sin errores rojos nuevos.

## Chequeo de sintaxis

```powershell
node --check .\public\js\modules\admin-users-module.js
node --check .\public\js\services\admin-service.js
node --check .\public\js\services\access-control-service.js
```
