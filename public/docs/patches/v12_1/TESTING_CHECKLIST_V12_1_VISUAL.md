# TESTING_CHECKLIST — V12.1 Visual

## 1. Backend prendido

Desde `backend_python`:

```bash
python -m uvicorn main:app --reload --port 8000
```

Abrir AppPromos y entrar a Inicio.

Esperado:

```txt
✔ Aparece tarjeta “Carniza recomienda hoy”
✔ Muestra title/text/action desde /daily-recommendation
✔ Botón lleva a Crear oferta
```

## 2. Backend apagado

Apagar Python y recargar AppPromos.

Esperado:

```txt
✔ La tarjeta no aparece
✔ No hay error visible
✔ AppPromos sigue funcionando normal
```

## 3. Seguridad

Validar:

```txt
✔ No se tocó web.html
✔ No se tocó Firebase
✔ Demo sigue entrando
✔ Precios / Ofertas / WhatsApp siguen funcionando
```
