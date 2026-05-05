# FUTURE — Panel Admin: Tracking + Cobranzas

> Documento future. No implementar directo en producción.
>
> Rama sugerida: `future/admin-tracking-cobranzas`

## Objetivo

Separar dentro del Panel Admin dos submódulos futuros:

1. **Tracking / Actividad**: entender si cada carnicería está usando AppPromos y si llegó al momento de valor.
2. **Cobranzas / La Nelly**: resolver pagos, vencimientos y continuidad sin convertir la ficha del cliente en un tablero inmanejable.

La ficha de cada cliente debe mostrar un resumen humano. Los submódulos profundos deben vivir separados.

```txt
La ficha del cliente muestra el resumen.
Cobranzas resuelve pagos.
Tracking entiende uso.
Admin decide qué hacer.
```

## Regla de arquitectura

AppPromos sigue siendo **Firebase-first / Firestore**.

Este future NO debe implementarse con Firebase Realtime Database ni con `firebase.database()`.

```txt
Adaptar a Firestore.
No implementar con Realtime Database.
No usar secretos/API keys de Mercado Pago en frontend.
No abrir backend hasta que haga falta.
```

## 1. Submódulo Tracking / Actividad

### Objetivo

Responder rápido:

```txt
¿El cliente está usando AppPromos?
¿Llegó a crear ofertas?
¿Llegó a WhatsApp?
¿Está en riesgo de abandono?
¿Qué tengo que hacer hoy?
```

### Señales mínimas futuras

- último ingreso;
- cantidad de ingresos;
- ofertas creadas;
- WhatsApps enviados;
- uso de Vender urgente;
- ofertas guardadas;
- web pública abierta;
- clicks a WhatsApp desde web;
- demo → registro.

### Salud del cliente

Empezar simple:

```txt
🟢 Bien
🟡 Revisar
🟠 Riesgo de abandono
🔴 Urgente
```

Criterio sugerido:

- **Bien**: entró recientemente y usó una función comercial.
- **Revisar**: hace días que no entra o no creó ofertas.
- **Riesgo**: está en prueba pero no llegó a WhatsApp.
- **Urgente**: pago vencido, prueba por vencer o acceso pausado.

## 2. Submódulo Cobranzas / La Nelly

### Objetivo

Separar la gestión de pagos del detalle general del cliente.

Debe responder:

```txt
A quién hay que escribirle.
Qué pago está por vencer.
Qué cliente está pendiente.
Qué acceso hay que cuidar.
Qué cliente podemos recuperar.
```

### Piezas futuras

1. Bandeja de pagos pendientes / vencidos.
2. Mensaje WhatsApp prearmado.
3. Link de pago Mercado Pago por cliente/plan.
4. Marcar pago recibido manualmente.
5. Historial de acciones administrativas.
6. La Nelly como aviso de regularización dentro de la app.
7. Reglas de acceso según estado:
   - al día;
   - por vencer;
   - pendiente;
   - vencido;
   - suspendido;
   - bonificado/manual.

### Tono de La Nelly

La Nelly no debe sonar a cobradora fría.

Evitar:

```txt
Función bloqueada hasta regularizar pago.
Tu cuota venció.
No puedes crear ofertas.
```

Preferir:

```txt
Tenemos que resolver tu abono para que sigas vendiendo.
Lo vemos por WhatsApp y lo dejamos al día.
```

### Regla de convivencia

```txt
Carniza vende.
La Nelly cuida/resuelve.
No compiten en la misma pantalla.
```

## 3. Ficha del cliente: resumen, no tablero NASA

La ficha debe mostrar solo resumen:

```txt
Plan: SALVADOR
Pago: Pendiente
Uso: Bajo
Salud: Revisar
Último ingreso: hace 5 días
```

Botones:

```txt
Ver cobranzas
Ver tracking
Escribir por WhatsApp
```

Los detalles profundos viven en submódulos.

## 4. Orden recomendado

```txt
Ahora:
V12.13-C4-DOCS — Future Tracking + Cobranzas documentado.

Después:
V12.14 — Tracking mínimo comercial.

Más adelante:
V12.15 / V13 — Submódulo Cobranzas operativo.
```

## 5. Qué NO hacer ahora

- No tocar producción.
- No deployar.
- No modificar Firestore rules.
- No tocar `admin-users-module.js` todavía.
- No tocar `nelly-module.js` todavía.
- No meter API de Mercado Pago en frontend.
- No implementar webhooks.
- No implementar scheduler.
- No hacer conciliación automática.

## 6. Future posterior

Cuando Cobranzas funcione manualmente, evaluar:

- webhooks de Mercado Pago;
- conciliación automática;
- recordatorios programados;
- historial de pagos completo;
- tablero de salud comercial;
- mensajes sugeridos por La Nelly según caso.
