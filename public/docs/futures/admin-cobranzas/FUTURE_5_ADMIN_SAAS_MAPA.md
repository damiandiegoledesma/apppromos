# Future 5 — Admin SaaS / Tracking / Cobranzas / La Nelly

## Estado

Documento de planificación.

- Rama: `future/admin-tracking-cobranzas`
- No productivo
- No deploy
- No main
- No dev todavía

## Objetivo

Convertir el Panel Admin de AppPromos en una herramienta SaaS operativa para:

- ver estado del cliente;
- detectar riesgo;
- actuar rápido;
- registrar historia;
- cuidar cobros;
- acompañar pruebas;
- evitar abandono.

Idea madre:

> Panel Admin = ver estado + detectar riesgo + actuar rápido + registrar historia del cliente.

## Criterio general

El Admin no debe ser una tabla técnica ni un tablero de la NASA.

Debe ser una herramienta diaria para AppPromos:

- mirar clientes;
- detectar problemas;
- saber a quién escribir;
- cuidar pagos;
- convertir pruebas;
- registrar acciones;
- mantener la historia comercial de cada carnicería.

## Modularización propuesta

Panel Admin AppPromos:

- Control operativo
- Datos básicos
- Cobranzas
- Tracking
- Acciones

Regla central:

- **Datos básicos** = quién es.
- **Cobranzas** = qué tiene que resolver.
- **Tracking** = qué está haciendo.
- **Acciones** = qué hacemos nosotros con ese cliente.
- **Control** = a quién mirar primero hoy.

---

## 1. Datos básicos

### Pregunta que responde

¿Quién es este cliente?

### Incluye

- nombre de carnicería;
- responsable;
- email;
- WhatsApp;
- localidad;
- provincia;
- dirección;
- web / slug público;
- estado TEST o cliente real;
- ID técnico como referencia secundaria.

### Criterio UX

Mostrar primero datos humanos.

El ID técnico no desaparece, pero no debe mandar visualmente.

Ejemplo:

```txt
Carnicería Juan
Responsable: Juan Pérez
WhatsApp: 3462...
Plan: Salvador
Estado: Activa

ID técnico: biz_...
```

### Qué NO va acá

- botones peligrosos;
- notas de cobranza;
- historial de actividad;
- cambios de plan;
- acciones de eliminar;
- logs técnicos.

---

## 2. Cobranzas

### Pregunta que responde

¿Qué tiene que resolver este cliente con AppPromos?

### Incluye

- plan actual;
- estado de pago;
- próximo vencimiento;
- último pago;
- marcar pago recibido;
- nota interna de cobranza;
- link de pago manual;
- WhatsApp de cobranza;
- estado La Nelly;
- historial de acciones de cobranza.

### Nombres visibles recomendados

- Cobranzas
- Pagos pendientes
- Clientes por resolver

### Evitar como UI principal

- Morosos
- Deudores
- Bloqueados

### Mercado Pago

Primera etapa:

- links manuales sí;
- API Mercado Pago no todavía;
- webhooks no todavía;
- conciliación automática no todavía;
- no guardar secretos en frontend;
- no exponer access tokens.

### Tono La Nelly

La Nelly cuida, no castiga.

Evitar:

- Cuenta suspendida por falta de pago.
- Función bloqueada.
- Tu cuota venció.

Preferir:

```txt
Tenemos que resolver tu abono para que sigas vendiendo.
Lo vemos por WhatsApp y lo dejamos al día.
```

---

## 3. Tracking

### Pregunta que responde

¿Qué está haciendo este cliente dentro de AppPromos?

### Incluye

- último ingreso;
- última actividad;
- ofertas creadas;
- uso de Vender urgente;
- WhatsApps enviados;
- promociones guardadas;
- precios actualizados;
- web abierta;
- días sin actividad;
- hitos;
- salud del cliente.

### Métricas iniciales sugeridas

- `loginCount`;
- `lastLoginAt`;
- `lastActivityAt`;
- `offersCreatedCount`;
- `urgentOffersCreatedCount`;
- `whatsappSentCount`;
- `savedOffersCount`;
- `lastOfferCreatedAt`;
- `lastWhatsappSentAt`;
- `lastPriceUpdateAt`.

### Regla de costo

No hacer heartbeat agresivo.

No medir cada 10 segundos.

Medir lo suficiente para decidir.

### Salud del cliente

Primera lectura humana:

- Bien
- Revisar
- Riesgo de abandono
- Urgente

### Lógica inicial sugerida

**Bien:**  
Entró recientemente y usó alguna función comercial.

**Revisar:**  
Hace varios días que no entra o no creó ofertas.

**Riesgo de abandono:**  
Está activo o en prueba, pero no creó ofertas ni mandó WhatsApp en 7 días.

**Urgente:**  
Pago vencido, prueba por vencer en 48 hs, acceso bloqueado o cliente suspendido.

---

## 4. Acciones

### Pregunta que responde

¿Qué hacemos nosotros con este cliente?

### Acciones actuales o cercanas

- entrar como cliente;
- volver al Panel Admin;
- escribir por WhatsApp;
- ver web;
- gestionar módulos;
- archivar empresa;
- restaurar empresa;
- desactivar usuario;
- reactivar usuario;
- marcar como TEST;
- clonar como TEST;
- eliminar TEST;
- reparar configuración base;
- ver logs.

### Acciones futuras

- enviar seguimiento comercial;
- enviar mensaje de cobranza;
- reenviar link de acceso;
- restablecer contraseña;
- registrar contacto realizado;
- cambiar plan;
- pausar acceso;
- reactivar acceso;
- crear nota interna.

### Reglas

- acciones frecuentes visibles;
- acciones sensibles con confirmación;
- acciones destructivas solo para TEST;
- clientes reales no se eliminan desde frontend;
- usuarios de Firebase Auth no se borran desde frontend.

---

## 5. Control operativo

### Pregunta que responde

¿A quién tengo que mirar primero hoy?

### Incluye

- pruebas por vencer;
- pagos por vencer;
- pagos vencidos;
- clientes sin actividad;
- clientes en riesgo;
- clientes suspendidos;
- acciones sugeridas;
- WhatsApp contextual.

### Objetivo

Que el administrador no tenga que revisar todo.

El panel debe mostrar prioridades.

Ejemplos:

- Prueba por vencer mañana → escribir seguimiento.
- Pago vencido → enviar mensaje La Nelly.
- Sin actividad 7 días → ofrecer ayuda.
- Oferta creada sin WhatsApp → empujar envío.

---

## Archivos actuales relacionados

Archivos principales detectados en el repo actual:

- `public/js/modules/admin-users-module.js`
- `public/js/services/admin-service.js`
- `public/docs/PANEL_ADMIN_FUNCIONAMIENTO_V12_10_B2.md`
- `public/docs/PANEL_ADMIN_PLANES_PAGOS.md`
- `public/docs/EMPRESAS_TEST_APPPROMOS.md`
- `public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md`

## Lectura actual

El Admin ya tiene base operativa.

Ya existen:

- listado de carnicerías;
- listado de usuarios;
- pestaña Control;
- estados de acceso, pago, plan y admin;
- gestión comercial mínima;
- nota interna;
- acciones de empresas TEST;
- archivar/restaurar;
- desactivar/reactivar usuarios;
- WhatsApp admin;
- tracking básico de login y actividad.

## Problema actual

La información está mezclada en una misma ficha.

Future 5 debe separar intención:

- identidad;
- cobranza;
- uso;
- acciones;
- prioridades.

---

## Orden de implementación sugerido

### Future 5-A — Mapa Admin SaaS

Este documento.

No toca producción.

### Future 5-B — Reorden visual sin datos nuevos

Misma información actual, mejor agrupada:

- Datos básicos
- Cobranzas
- Tracking
- Acciones

### Future 5-C — Tracking mínimo real

Agregar contadores simples:

- ofertas creadas;
- WhatsApps enviados;
- uso de Vender urgente;
- precios actualizados;
- última acción comercial.

### Future 5-D — Salud y control operativo

Agregar lectura:

- Bien;
- Revisar;
- Riesgo;
- Urgente.

Y acciones sugeridas.

### Future 5-E — Cobranzas / La Nelly

Agregar submódulo más completo:

- clientes por vencer;
- pagos vencidos;
- links manuales;
- WhatsApp prearmado;
- marcar pago recibido;
- La Nelly en app del cliente.

---

## Qué NO se toca todavía

- main;
- dev;
- deploy;
- flujo de venta;
- Crear oferta;
- Vender urgente;
- WhatsApp;
- registro/login;
- Firebase Auth profundo;
- reglas de Firestore;
- backend;
- Mercado Pago API;
- webhooks;
- borrado real de usuarios Auth;
- borrado real de clientes.

---

## Regla final

El Admin nuevo puede crecer.

La producción no se contamina.

Primero se diseña y prueba en rama future.

Después, si funciona, se integra a dev.

Main queda para producción estable.
