# AppPromos V12.18-C2 — Header, navegación y checkout mobile

Objetivo:
Mejorar la experiencia del comprador en celular sin cambiar la lógica de carrito ni WhatsApp.

Cambios:
- Header móvil más compacto.
- Barra inferior más compacta.
- Checkout más corto y legible.
- Ítems del carrito más compactos.
- Campos de cliente y opciones de entrega/pago adaptados a pantalla chica.
- Botón principal “Enviar pedido por WhatsApp” sticky sobre la navegación inferior.
- En pantallas >=390 px, entrega y pago pueden mostrarse en dos columnas.
- Oculta el sello AppPromos en mobile para priorizar compra y navegación.

No cambia:
- Firestore.
- Cálculos del carrito.
- Texto del pedido WhatsApp aprobado en C1-FIX2.1.
- Desktop.

QA sugerido:
1. Agregar 3 productos.
2. Abrir carrito.
3. Probar 360x640 y 412x823.
4. Completar nombre/teléfono.
5. Retiro y envío.
6. Efectivo y transferencia.
7. Confirmar que el botón de WhatsApp no queda tapado por la barra inferior.
8. Enviar pedido.
