# INSTALAR PATCH — V11.4.1B

## Tipo de entrega

Patch quirúrgico. No es repo FULL.

## Archivos a renombrar antes de copiar

Renombrar estos archivos actuales:

```txt
public/js/services/write-guard-service.js
→ public/js/services/write-guard-service__backup_v11_4_1A.js

public/js/services/access-control-service.js
→ public/js/services/access-control-service__backup_v11_4_1A.js

public/js/modules/prices-module.js
→ public/js/modules/prices-module__backup_v11_4_1A.js

public/js/modules/builder-module.js
→ public/js/modules/builder-module__backup_v11_4_1A.js

public/js/app-main.js
→ public/js/app-main__backup_v11_4_1A.js
```

Después copiar los archivos del patch respetando la misma estructura de carpetas.

## Rollback

Si algo falla:

1. borrar los archivos nuevos copiados;
2. restaurar los archivos `__backup_v11_4_1A.js` con su nombre original;
3. recargar la app / redeployar la versión anterior.

## Validación mínima

Usar `public/docs/testing/TESTING_CHECKLIST_V11_4_1B.md`.
