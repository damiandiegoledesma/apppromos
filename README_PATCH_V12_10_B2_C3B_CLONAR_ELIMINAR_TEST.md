# PATCH V12.10-B2-C3B — Clonar y eliminar empresas TEST

## Objetivo

Agregar herramientas seguras para trabajar con empresas TEST desde el Panel Admin.

## Archivos incluidos

```txt
public/js/modules/admin-users-module.js
public/js/services/admin-service.js
public/docs/EMPRESAS_TEST_APPPROMOS.md
public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md
README_PATCH_V12_10_B2_C3B_CLONAR_ELIMINAR_TEST.md
```

## Cambios principales

1. Agrega acción **Clonar como TEST**.
2. Agrega acción **Eliminar TEST** en zona peligrosa.
3. Eliminar TEST pide confirmación exacta: `ELIMINAR TEST`.
4. Clonar como TEST no crea usuario Auth, no publica web y no duplica WhatsApp como índice real.
5. Eliminar TEST borra datos conocidos de prueba y puede liberar índices TEST de WhatsApp/web.
6. Incluye documentación de uso de empresas TEST en `public/docs`.
7. Incluye documentación future para referencias controladas de Mercado.

## Qué NO toca

```txt
Registro
Login
Web automática
Crear oferta
Vender urgente
WhatsApp del cliente final
Backend Python
SQLite
Borrado real de usuarios Auth
Referencias Mercado reales
```

## Test sugerido

```txt
1. Panel Admin abre.
2. En una empresa TEST aparece Clonar como TEST.
3. Clonar como TEST crea una nueva empresa TEST.
4. La copia aparece en filtro Empresas TEST.
5. La copia no tiene WhatsApp real activo ni web publicada.
6. Eliminar TEST pide escribir ELIMINAR TEST.
7. Cancelar no borra nada.
8. Confirmar elimina la empresa TEST.
9. Empresas reales no permiten eliminar directo.
10. Gestionar módulos sigue funcionando.
11. Archivar / Restaurar sigue funcionando.
12. WhatsApp TEST sigue funcionando si hay número válido.
13. Consola sin errores rojos nuevos.
```
