# TESTING CHECKLIST — V11.4.3 Carniza V1

## 1. Visual

- [ ] Aparece botón flotante `🐮` abajo a la derecha.
- [ ] No tapa botones importantes.
- [ ] No molesta en mobile.
- [ ] Al tocar abre panel.
- [ ] Al volver a tocar cierra panel.
- [ ] Al tocar X cierra panel.
- [ ] Con Escape cierra panel en desktop.

## 2. Cliente Al día

- [ ] Carniza muestra `✅ Al día`.
- [ ] Mensaje orientado a vender.
- [ ] Botón Precios abre módulo Precios.
- [ ] Botón Ofertas abre módulo Ofertas.
- [ ] Botón WhatsApp abre módulo WhatsApp.
- [ ] Precios sigue guardando.
- [ ] Ofertas sigue guardando.

## 3. Cliente Prueba

- [ ] Carniza muestra `🎁 Prueba`.
- [ ] Mensaje invita a probar la app vendiendo.
- [ ] Botones llevan a Ofertas / Precios / WhatsApp.
- [ ] Puede guardar normalmente.

## 4. Trial por vencer

- [ ] Carniza muestra `⏳ Por vencer`.
- [ ] Avisa que la prueba termina pronto.
- [ ] Muestra acción para consultar planes.
- [ ] Puede operar normalmente.

## 5. Cliente Pendiente / overdue

- [ ] Carniza muestra `⚠️ Pendiente`.
- [ ] Explica que puede mirar pero no guardar.
- [ ] Botón regularizar abre WhatsApp AppPromos.
- [ ] Precios NO guarda.
- [ ] Ofertas NO guarda.
- [ ] No aparece lenguaje técnico.

## 6. Cliente Pausado / suspended

- [ ] Carniza muestra `🔒 Pausado`.
- [ ] Explica que la cuenta está pausada.
- [ ] Botón reactivar abre WhatsApp AppPromos.
- [ ] Botón Inicio vuelve a Inicio.
- [ ] Módulos siguen bloqueados correctamente.
- [ ] No queda encerrado.

## 7. Superadmin

- [ ] Superadmin inicia en DEMO.
- [ ] Admin sigue funcionando.
- [ ] Carniza se oculta en panel Admin.
- [ ] Si superadmin entra a una empresa como cliente, ve la misma lógica comercial.

## 8. Seguridad

- [ ] No hay errores de consola relacionados con Carniza.
- [ ] No rompe resolveSession.
- [ ] No rompe BusinessStore.
- [ ] No rompe WriteGuardService.
- [ ] No modifica datos sin confirmación.
