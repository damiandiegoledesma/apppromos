# AppPromos V12.28-A3 — Seguimiento manual y mensajes

## Objetivo

Convertir el detalle de cada carnicería en una herramienta operativa para registrar contactos, definir el próximo paso y resolver bloqueos sin confundir el seguimiento humano con la actividad comercial automática.

## Seguimiento estructurado

El documento administrativo `businesses/{businessId}/followupState/current` conserva el estado vigente:

- `status`: `pending`, `contacted`, `helped`, `resolved` o `no_response`;
- `outcome`: resultado del contacto;
- `nextAction`: próxima acción;
- `nextContactAt`: fecha y hora del próximo contacto;
- `note`: nota interna;
- responsable y fecha de la última actualización.

Cada guardado agrega además un documento inmutable en:

`businesses/{businessId}/followupEvents/{eventId}`

El estado vigente y estos eventos se muestran en la línea de tiempo unificada. Solo administradores pueden leerlos o escribirlos. Los eventos no pueden modificarse ni eliminarse y el dueño de la carnicería no accede a las notas internas.

## Biblioteca inicial de mensajes

La interfaz ofrece mensajes editables para:

1. bienvenida y solicitud de nombre, carnicería y WhatsApp;
2. ningún precio cargado;
3. entre 1 y 4 precios;
4. avance desde 5 precios;
5. entre 12 y 14 precios;
6. catálogo completo sin promo;
7. promo creada sin publicar;
8. vidriera lista sin compartir;
9. identidad incompleta;
10. vidriera compartida sin visitas;
11. visitas sin inicio de pedido;
12. pedido iniciado;
13. inactividad;
14. prueba próxima a vencer;
15. falta de respuesta;
16. cierre de ayuda.

El sistema sugiere una situación según la información disponible, pero el administrador puede elegir otra y editar el texto.

## Regla operativa

Copiar un mensaje o abrir WhatsApp no registra un contacto. El estado cambia únicamente cuando el administrador selecciona el estado correspondiente y pulsa **Guardar seguimiento**.

## Privacidad

- No se almacena contenido de pedidos ni información del comprador final.
- Los mensajes sugeridos no se envían automáticamente.
- El número de WhatsApp se toma de los datos confirmados de la carnicería.
- Las notas y el historial de seguimiento son exclusivamente internos.

## QA local

El reseed agrega para `qa-reactivacion@apppromos.test` el recorrido:

`pending → contacted → no_response`

La validación debe comprobar:

- guardado y recarga del estado vigente;
- incorporación inmediata del evento a la línea de tiempo;
- persistencia de próxima acción y próximo contacto;
- selección, edición y copia de mensajes;
- apertura manual de WhatsApp;
- ausencia de cambios de estado al copiar o abrir WhatsApp;
- rechazo de lectura de `followupEvents` por parte del dueño.
