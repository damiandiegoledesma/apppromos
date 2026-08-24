# AppPromos V12.18-C1-FIX2 — WhatsApp Pedido Operativo

Objetivo: hacer que el pedido que el cliente envía a la carnicería sea rápido de leer, consistente y robusto en WhatsApp.

## Cambios
- Mensaje dividido en bloques claros: pedido, total, cliente, entrega/pago y aclaración.
- Combos muestran sus componentes debajo del nombre del combo.
- Productos sueltos muestran cantidad, nombre y subtotal.
- Se eliminan emojis y símbolos decorativos del cuerpo del mensaje para evitar caracteres de reemplazo por problemas de encoding.
- Se mantiene formato nativo de WhatsApp con negritas e itálicas.
- Saltos de línea explícitos y dobles entre bloques.

## QA
1. Agregar combo y producto.
2. Completar nombre y teléfono.
3. Probar retiro + efectivo.
4. Probar envío + dirección + transferencia.
5. Agregar aclaración.
6. Abrir WhatsApp y verificar que no aparezcan caracteres rotos y que el mensaje sea legible en pocos segundos.
