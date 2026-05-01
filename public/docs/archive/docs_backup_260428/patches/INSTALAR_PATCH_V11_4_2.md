# INSTALAR PATCH — V11.4.2 Header Inteligente Unificado

Este patch es visual/controlado y se aplica sobre **AppPromos V11.4.1B FULL Base Estable**.

## Archivos incluidos

```txt
public/app.html
public/js/app-main.js
public/docs/historial/CHANGELOG_V11_4_2.md
public/docs/testing/TESTING_CHECKLIST_V11_4_2.md
public/docs/patches/INSTALAR_PATCH_V11_4_2.md
public/docs/modelo/V11_4_2_HEADER_INTELIGENTE_UNIFICADO_SPEC.md
```

## Antes de copiar

Renombrar estos archivos en el repo local:

```txt
public/app.html
→ public/app__backup_v11_4_1B.html

public/js/app-main.js
→ public/js/app-main__backup_v11_4_1B.js
```

## Copiar

Copiar los archivos del patch respetando carpetas.

## Probar

Seguir:

```txt
public/docs/testing/TESTING_CHECKLIST_V11_4_2.md
```

## Rollback

Si algo sale mal:

1. borrar los nuevos `public/app.html` y `public/js/app-main.js`;
2. restaurar los backups renombrándolos a su nombre original;
3. recargar la app;
4. si ya se deployó, redeployar versión anterior.

## No tocar

Este patch no requiere tocar:

```txt
Firebase Rules
backend_python
.venv
.sixth
firestore.rules
firebase.json
DEMO/template
catálogo base
```
