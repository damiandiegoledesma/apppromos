# AppPromos V12.18-A — Activación 50 usuarios

## Objetivo
Reducir la fricción entre la landing y una carnicería online creada.

## Tesis
**Tu carnicería online, gratis para empezar.** Los clientes ven cortes, precios y ofertas, arman el pedido y lo envían por WhatsApp.

## Cambios
- Hero de landing reenfocado en carnicería online 24/7 + WhatsApp.
- Registro inicial reducido a: nombre de carnicería, email, contraseña, WhatsApp y localidad.
- Dirección y nombre del responsable dejan de bloquear el alta y se completan después.
- Provincia sigue resolviéndose desde localidad.
- Alta continúa creando catálogo inicial y vidriera automáticamente.
- Después del alta se entra con `?onboarding=1` para mostrar el recorrido de primer uso.
- Tracking agregado: `registration_started`, `first_price_saved`, `web_opened`, `web_shared` (los últimos tres quedan disponibles para conectar a los puntos exactos de uso).

## Checklist
1. Registro nuevo desde landing.
2. Validar teléfono duplicado.
3. Validar localidad/provincia.
4. Confirmar creación de usuario y negocio.
5. Confirmar catálogo inicial.
6. Confirmar `publicWebSlugs`.
7. Confirmar ingreso a `app.html?onboarding=1`.
8. Confirmar que la cuenta puede completar dirección después desde Mi cuenta.
9. Probar en Android/mobile.
10. Revisar consola sin errores.

## No incluido
Centro de Promos, impresión, automatización entrante de WhatsApp y pricing. Se desarrollan en hitos posteriores.
