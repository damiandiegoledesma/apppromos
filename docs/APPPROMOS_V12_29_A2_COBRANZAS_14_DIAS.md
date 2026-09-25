# AppPromos V12.29-A2 — Cobranzas y prueba de 14 días

## Objetivo

Cerrar el ciclo manual de los primeros 50 usuarios sin automatizar envíos masivos ni migrar cuentas existentes sin decisión humana.

## Prueba

- Altas nuevas: 14 días desde la creación.
- Mitad de prueba: quedan entre 5 y 7 días.
- Conversión: quedan entre 2 y 4 días.
- Último aviso: vence hoy o mañana.
- Vencida: puede entrar y consultar, pero no guardar ni publicar.
- Las pruebas existentes no se acortan en masa.
- El administrador puede reiniciar 14 días para una carnicería puntual.

## Conversión a plan pago

La acción administrativa `Activar plan pago` guarda atómicamente:

- plan elegido;
- pago activo;
- acceso activo;
- fecha de conversión;
- inicio del período;
- próximo vencimiento;
- último pago.

Esto evita que una cuenta paga continúe interpretándose como prueba por conservar un estado raíz anterior.

## Ciclo mensual manual

- Día de vencimiento hasta día 5: período de gracia; puede trabajar y recibe aviso.
- Día 6: pago vencido; puede entrar y consultar, pero no guardar.
- Día 7: pausa automática de módulos hasta regularizar.
- Pago confirmado: estado activo y recuperación inmediata de permisos.
- Si el vencimiento anterior ya pasó, el próximo pago se calcula a un mes desde la confirmación.

## Centro de Control

- Mensajes separados para mitad de prueba, conversión, último día y prueba vencida.
- Presentación diferenciada de gracia, vencido y pausa automática.
- Activación de plan pago en una sola acción.
- Reinicio individual de prueba, nunca masivo.

## Fuera de alcance

- Migración masiva de pruebas históricas.
- Envíos automáticos de WhatsApp.
- Confirmación automática desde webhooks de Mercado Pago hacia Firestore.
- Cambios de precios de los planes existentes.
