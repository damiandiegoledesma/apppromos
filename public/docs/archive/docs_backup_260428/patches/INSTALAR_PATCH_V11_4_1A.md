# INSTALAR PATCH — AppPromos V11.4.1A

Este patch NO es repo FULL. Incluye únicamente archivos modificados/nuevos.

## 1. Archivos a renombrar antes de copiar

Desde la raíz del repo `apppromos`, renombrar:

```txt
public/js/services/access-control-service.js
→ public/js/services/access-control-service__backup_v11_4_1.js

public/js/modules/admin-users-module.js
→ public/js/modules/admin-users-module__backup_v11_4_1.js

public/js/app-main.js
→ public/js/app-main__backup_v11_4_1.js
```

## 2. Archivos nuevos/modificados a copiar

Copiar desde el patch estos archivos respetando carpetas:

```txt
public/js/services/access-control-service.js
public/js/modules/admin-users-module.js
public/js/app-main.js
public/docs/historial/CHANGELOG_V11_4_1A.md
public/docs/testing/TESTING_CHECKLIST_V11_4_1A.md
public/docs/patches/INSTALAR_PATCH_V11_4_1A.md
```

## 3. Qué probar

Usar:

```txt
public/docs/testing/TESTING_CHECKLIST_V11_4_1A.md
```

## 4. Rollback

Si algo falla:

```txt
Borrar public/js/services/access-control-service.js
Renombrar public/js/services/access-control-service__backup_v11_4_1.js
→ public/js/services/access-control-service.js

Borrar public/js/modules/admin-users-module.js
Renombrar public/js/modules/admin-users-module__backup_v11_4_1.js
→ public/js/modules/admin-users-module.js

Borrar public/js/app-main.js
Renombrar public/js/app-main__backup_v11_4_1.js
→ public/js/app-main.js
```

Los documentos nuevos no afectan ejecución; se pueden dejar o borrar.
