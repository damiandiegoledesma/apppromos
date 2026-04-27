# TESTING CHECKLIST — V11.4.2 Header Inteligente Unificado

## 1. Cliente active / Al día

- [ ] Entra correctamente.
- [ ] Header muestra `✅ Al día`.
- [ ] Se ven botones principales: Precios, Ofertas, WhatsApp.
- [ ] Precios guarda normalmente.
- [ ] Ofertas guarda normalmente.
- [ ] WhatsApp funciona.
- [ ] El header se oculta al bajar y vuelve al subir.

## 2. Cliente trial / Prueba

- [ ] Header muestra `🎁 Prueba`.
- [ ] Puede entrar, consultar y guardar.
- [ ] No se muestra lenguaje técnico.

## 3. Trial por vencer

- [ ] Header muestra `⏳ Por vencer`.
- [ ] La app toma tono amarillo suave.
- [ ] Puede guardar normalmente.
- [ ] El mensaje comercial no asusta.

## 4. Pago pendiente / overdue

- [ ] Header muestra `⚠️ Pendiente`.
- [ ] La app toma tono naranja suave.
- [ ] Puede consultar precios.
- [ ] NO puede guardar precios.
- [ ] NO puede guardar ofertas.
- [ ] Ve WhatsApp AppPromos para regularizar.

## 5. Pausado / suspended

- [ ] Header muestra `🔒 Pausado`.
- [ ] La app toma tono rojo suave.
- [ ] Módulos bloqueados no dejan atrapado al usuario.
- [ ] Aparece botón Volver a Inicio.
- [ ] Aparece WhatsApp AppPromos.

## 6. Superadmin

- [ ] Inicia en DEMO.
- [ ] Admin sigue funcionando.
- [ ] En Admin el header grande queda oculto.
- [ ] Puede cambiar estados/planes desde Admin.
- [ ] Si entra a empresa pendiente/pausada, ve la lógica comercial del cliente.

## 7. Mobile

- [ ] En celular se ve claro el core: Precios → Ofertas → WhatsApp.
- [ ] Los botones son fáciles de tocar.
- [ ] El header no ocupa media pantalla.
- [ ] No aparece texto técnico.

## Resultado

- [ ] Aprobado para deploy.
- [ ] Requiere ajuste menor.
- [ ] Requiere rollback.
