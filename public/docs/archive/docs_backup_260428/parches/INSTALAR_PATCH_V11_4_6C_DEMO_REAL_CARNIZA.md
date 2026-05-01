# INSTALAR PATCH — V11.4.6C Demo real Carnicería de Carniza

## Antes de instalar

Base esperada:

- Repo local actualizado desde `dev` sincronizado.
- Versión previa: V11.4.5F.
- No tener cambios locales sin respaldo.

## Archivos incluidos en el patch

Copiar y reemplazar en el repo local:

```txt
public/index.html
public/app.html
public/js/app-main.js
public/js/services/auth-service.js
public/js/services/business-service.js
public/js/services/write-guard-service.js
public/js/services/demo-session-service.js
public/docs/CURRENT_VERSION.md
public/docs/historial/CHANGELOG_V11_4_6C_DEMO_REAL_CARNIZA.md
public/docs/testing/TESTING_CHECKLIST_V11_4_6C_DEMO_REAL_CARNIZA.md
public/docs/parches/INSTALAR_PATCH_V11_4_6C_DEMO_REAL_CARNIZA.md
public/docs/historial/changelog.txt
public/docs/futures/FUTURE_V12_PYTHON_SQLITE_IA.md
```

## Pasos

1. Cerrar servidor/emuladores si están corriendo.
2. Hacer backup del repo local actual.
3. Descomprimir el patch.
4. Copiar los archivos respetando carpetas.
5. Levantar Firebase local:

```bash
firebase emulators:start
```

6. Probar landing:

```txt
http://127.0.0.1:5000/index.html
```

7. Probar demo directa:

```txt
http://127.0.0.1:5000/app.html?demo=1
```

## No hacer todavía

- No subir a `dev` sin checklist OK.
- No hacer deploy sin probar usuario real.
- No tocar `web.html`.
