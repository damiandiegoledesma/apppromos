# TESTING CHECKLIST — V11.4.1B

## 1. Cliente active

- Entrar a empresa activa.
- Cambiar un precio.
- Guardar.
- Crear oferta.
- Guardar oferta.

Resultado esperado: guarda normalmente.

## 2. Cliente overdue / pago pendiente

- Desde Admin poner billing.status = overdue.
- Entrar a la empresa.
- Confirmar que Inicio muestra Pago pendiente + WhatsApp.
- Entrar a Cambiar precios.
- Confirmar que se ve la lista.
- Confirmar que aparece modo consulta / guardado pausado.
- Intentar guardar precio.
- Entrar a Crear Oferta.
- Confirmar que permite armar/revisar pero no guardar.

Resultado esperado: consulta sí, guardado no.

## 3. Cliente suspended

- Desde Admin poner billing.status = suspended.
- Entrar a la empresa.
- Confirmar cartel claro de cuenta suspendida.
- Entrar a módulos bloqueados.
- Confirmar que aparece WhatsApp AppPromos.
- Confirmar que aparece botón Volver a Inicio.
- Probar Mercados/Competencia y volver a Inicio sin desloguearse.

Resultado esperado: no queda encerrado; siempre puede volver a Inicio o contactar AppPromos.

## 4. Superadmin

- Login superadmin.
- Confirmar que inicia en DEMO.
- Desde Admin cambiar estados de una empresa.
- Entrar a esa empresa.
- Confirmar que, dentro de la app cliente, respeta el estado comercial de la empresa.

Resultado esperado: el superadmin no saltea reglas comerciales dentro de la app cliente; administra desde Admin.
