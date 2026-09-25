# INSTALAR PATCH — V11.4.4C Carniza V1.1 contextual corregida

## Archivos incluidos

```txt
public/js/modules/carniza-module.js
public/docs/historial/CHANGELOG_V11_4_4C_CARNIZA_V1_1.md
public/docs/testing/TESTING_CHECKLIST_V11_4_4C_CARNIZA_V1_1.md
public/docs/patches/INSTALAR_PATCH_V11_4_4C_CARNIZA_V1_1.md
```

## Antes de copiar

Renombrar:

```txt
public/js/modules/carniza-module.js
→ public/js/modules/carniza-module__backup_v11_4_4B.js
```

## Copiar

Copiar los archivos del patch respetando carpetas.

## Probar

Seguir:

```txt
public/docs/testing/TESTING_CHECKLIST_V11_4_4C_CARNIZA_V1_1.md
```

## Rollback

Si algo sale mal, restaurar el backup de `carniza-module.js`.
