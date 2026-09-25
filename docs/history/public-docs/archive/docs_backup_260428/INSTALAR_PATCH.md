# INSTALAR PATCH V12.2.3

## Archivos incluidos

```txt
backend_python/main.py
backend_python/app/db.py
backend_python/.gitignore
public/js/app-main.js
public/js/services/ai-service.js
public/docs/*
```

## Instalación

1. Copiar los archivos del patch sobre el repo local `C:\apppromos`.
2. Reemplazar archivos cuando Windows lo pregunte.
3. Reiniciar backend Python:

```bash
cd backend_python
python -m uvicorn main:app --reload --port 8000
```

4. Abrir AppPromos local:

```txt
http://localhost:5000/app.html
```

## Importante

No subir a GitHub hasta validar localmente.
