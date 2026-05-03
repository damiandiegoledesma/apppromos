# PATCH V12.10-B2-C3A-FIX1 — WhatsApp habilitado en empresas TEST

## Objetivo
Permitir usar el botón de WhatsApp en empresas marcadas como TEST cuando tengan un número válido, sin liberar teléfonos ni tocar datos reales.

## Archivos incluidos

- `public/js/modules/admin-users-module.js`
- `public/js/services/admin-service.js`

## Qué corrige

1. El botón de WhatsApp ya no queda inutilizado solo porque la empresa sea TEST.
2. Si la empresa TEST tiene número válido, el botón se muestra como `📲 Escribir TEST`.
3. Si no hay WhatsApp válido, el botón sigue deshabilitado.
4. La ficha de detalle muestra una advertencia simple para empresas TEST: verificar que el número sea de prueba antes de enviar.
5. El Panel Admin ahora también puede usar `publicPhoneKeys` como respaldo si la empresa no tiene teléfono visible en root/meta.

## Qué NO toca

- Registro
- Login
- Web automática
- Crear oferta
- Vender urgente
- WhatsApp del cliente final
- Auth
- Clonado/eliminación TEST
- Liberación de WhatsApp/slug

## Test sugerido

1. Panel Admin abre.
2. Filtro Admin → Empresas TEST funciona.
3. Empresa TEST con WhatsApp válido muestra `📲 Escribir TEST`.
4. El botón abre WhatsApp con número correcto y mensaje base.
5. Empresa sin WhatsApp válido sigue deshabilitada.
6. Gestionar módulos sigue funcionando.
7. Archivar / Restaurar sigue funcionando.
8. Consola sin errores rojos nuevos.
