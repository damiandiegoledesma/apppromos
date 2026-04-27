# INSTALAR PATCH — V11.4.3 Carniza V1

Este patch se aplica sobre **AppPromos V11.4.2 base estable**.

## Archivos incluidos

```txt
public/app.html
public/js/app-main.js
public/styles/carniza.css
public/js/modules/carniza-module.js
public/docs/historial/CHANGELOG_V11_4_3_CARNIZA_V1.md
public/docs/testing/TESTING_CHECKLIST_V11_4_3_CARNIZA_V1.md
public/docs/parches/INSTALAR_PATCH_V11_4_3_CARNIZA_V1.md
public/docs/futures/FUTURE_CARNIZA_V2.md
```

## Antes de copiar

Renombrar estos archivos en tu repo local:

```txt
public/app.html
→ public/app__backup_v11_4_2.html

public/js/app-main.js
→ public/js/app-main__backup_v11_4_2.js
```

## Copiar

Copiar el contenido del patch respetando carpetas.

## Probar

Seguir:

```txt
public/docs/testing/TESTING_CHECKLIST_V11_4_3_CARNIZA_V1.md
```

## Rollback

Si algo sale mal:

1. borrar los nuevos `public/app.html` y `public/js/app-main.js`;
2. restaurar los backups renombrándolos a su nombre original;
3. borrar si hace falta:
   - `public/styles/carniza.css`
   - `public/js/modules/carniza-module.js`
4. recargar la app;
5. si ya se deployó, volver a deployar la versión anterior.

## No tocar

```txt
Firebase Rules
resolveSession
BusinessStore
WriteGuardService
backend_python
.venv
.sixth
catálogo base
DEMO/template
```
