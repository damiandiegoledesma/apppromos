# Cómo guardar este future en el repo

## 1. Crear rama future

```powershell
cd C:\apppromos
git status --short
git checkout main
git checkout -b future/admin-tracking-cobranzas
```

## 2. Copiar este paquete

Descomprimir el ZIP en la raíz del repo:

```powershell
cd C:\apppromos
Expand-Archive -Path "$env:USERPROFILE\Downloads\AppPromos_FUTURE_ADMIN_TRACKING_COBRANZAS_DOCS.zip" -DestinationPath . -Force
```

## 3. Verificar

```powershell
git status --short
git diff --stat
```

Esperado:

```txt
?? public/docs/futures/admin-tracking-cobranzas/
```

## 4. Commit de documentación

```powershell
git add public/docs/futures/admin-tracking-cobranzas
git commit -m "Future admin tracking y cobranzas"
git push -u origin future/admin-tracking-cobranzas
```

## Importante

Este paquete no toca producción.
No requiere deploy.
No modifica código.
No modifica dev ni main.
