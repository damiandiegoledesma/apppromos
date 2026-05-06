# Future 5-D — Salud del cliente + Control operativo

## Estado

Documento de planificación dentro de la rama:

`future/admin-tracking-cobranzas`

No productivo.  
No main.  
No dev todavía.  
No deploy.

Este documento continúa:

- `FUTURE_5_ADMIN_SAAS_MAPA.md`
- `FUTURE_5B_REORDEN_VISUAL_ADMIN.md`
- `FUTURE_5C_TRACKING_MINIMO_REAL.md`

## Objetivo

Definir cómo el Panel Admin de AppPromos puede transformar datos simples en decisiones operativas.

El Admin no solo debe mostrar información.

Debe responder:

```txt
¿A quién tengo que mirar primero hoy?
¿A quién le tengo que escribir?
¿Qué cliente se está enfriando?
¿Qué prueba puede convertirse?
¿Qué pago hay que resolver?
¿Qué acción concreta conviene hacer ahora?
```

## Frase madre

```txt
El Admin no solo muestra datos.
El Admin te dice dónde actuar.
```

## Regla central

La salud del cliente no debe ser una métrica técnica.

Debe ser una lectura humana, simple y accionable.

---

# 1. Estados de salud

## Estados iniciales

```txt
Bien
Revisar
Riesgo de abandono
Urgente
```

## Lectura visual sugerida

```txt
🟢 Bien
🟡 Revisar
🟠 Riesgo de abandono
🔴 Urgente
```

## Regla de uso

Estos estados son para el administrador de AppPromos, no necesariamente para el carnicero.

No deben mostrarse como etiqueta cruda en la app del cliente.

---

# 2. Estado: Bien

## Qué significa

El cliente está usando AppPromos con señales saludables.

## Condiciones sugeridas

Puede marcarse como Bien si cumple una o varias:

- ingresó recientemente;
- actualizó precios;
- creó ofertas;
- usó Vender urgente;
- mandó WhatsApp;
- guardó promos;
- abrió su web;
- no tiene pagos vencidos;
- no está suspendido.

## Ejemplo de lectura

```txt
Salud: Bien
Motivo: usó AppPromos esta semana y mandó WhatsApp.
```

## Acción sugerida

No molestar.

Opcional:

- felicitar si alcanzó un hito;
- ofrecer upgrade si hay uso fuerte;
- recomendar Salvador si está aprovechando vender urgente.

## Mensaje posible

```txt
Vi que ya estás mandando promos por WhatsApp. Buenísimo. Si querés, después vemos cómo sacarle más provecho con Salvador.
```

---

# 3. Estado: Revisar

## Qué significa

El cliente no está en peligro inmediato, pero muestra señales flojas.

## Condiciones sugeridas

Puede marcarse como Revisar si:

- no entra hace varios días;
- entró pero no creó ofertas;
- actualizó precios pero no mandó WhatsApp;
- abrió la web pero no cargó precios;
- tiene actividad baja;
- prueba activa sin avance claro.

## Ejemplo de lectura

```txt
Salud: Revisar
Motivo: entró hace 5 días, pero no creó ofertas.
```

## Acción sugerida

Seguimiento liviano.

## Mensaje posible

```txt
Hola, soy Damian de AppPromos. Vi que ya entraste a la app. Si querés, te ayudo a armar tu primera promo y mandarla por WhatsApp.
```

---

# 4. Estado: Riesgo de abandono

## Qué significa

El cliente puede abandonar si no se lo acompaña.

## Condiciones sugeridas

Puede marcarse como Riesgo si:

- está en prueba y no creó ofertas;
- está en prueba y no mandó WhatsApp;
- no usa la app hace 7 días;
- creó una oferta pero no la envió;
- nunca llegó al momento de valor;
- tiene precios cargados pero no vende;
- se registró y no volvió a entrar.

## Ejemplo de lectura

```txt
Salud: Riesgo de abandono
Motivo: prueba activa sin WhatsApp enviado en 7 días.
```

## Acción sugerida

Escribir seguimiento.

## Mensaje posible

```txt
Hola, soy Damian de AppPromos. Vi que todavía no llegaste a mandar una promo por WhatsApp. Si querés, te ayudo a salir vendiendo rápido con una oferta simple.
```

## Carniza como soporte interno

Para este caso, Carniza puede ayudar con copy o acción sugerida, pero no debe aparecer como vendedor genérico en Admin.

Ejemplo interno:

```txt
Sugerencia Carniza: ayudalo a crear la primera oferta.
```

---

# 5. Estado: Urgente

## Qué significa

Hay una situación que requiere acción rápida.

## Condiciones sugeridas

Puede marcarse como Urgente si:

- pago vencido;
- acceso suspendido;
- acceso pausado;
- prueba por vencer en 48 horas;
- cliente activo con pago pendiente;
- cliente de plan pago sin actividad reciente;
- problema de configuración crítica;
- web activa pero sin precios publicados;
- usuario bloqueado o desactivado.

## Ejemplo de lectura

```txt
Salud: Urgente
Motivo: pago vencido y acceso pausado.
```

## Acción sugerida

Enviar mensaje La Nelly o resolver acceso.

## Mensaje posible

```txt
Hola, soy Damian de AppPromos. Tenemos que resolver tu abono para que sigas vendiendo sin cortar el acceso. Lo vemos por WhatsApp y lo dejamos al día.
```

## Tono

Firme, humano y resolutivo.

No usar tono de castigo.

La Nelly cuida, no amenaza.

---

# 6. Prioridad del Control operativo

El Control operativo debe ordenar clientes por prioridad.

## Orden sugerido

```txt
1. Urgente
2. Riesgo de abandono
3. Revisar
4. Bien
```

Dentro de cada grupo, ordenar por:

```txt
- vencimiento más cercano;
- más días sin actividad;
- mayor plan;
- prueba más cercana a vencer;
- cliente pago con problema;
- último contacto más antiguo.
```

## Objetivo

Que el administrador entre y vea:

```txt
Hoy tenés que mirar estos 5 clientes.
```

No una lista infinita sin jerarquía.

---

# 7. Bloques del Control operativo

## A. Urgentes

Incluye:

- pagos vencidos;
- accesos suspendidos;
- pruebas por vencer;
- clientes pagos sin actividad;
- errores de configuración importantes.

Visual sugerido:

```txt
🔴 Urgentes
3 clientes necesitan acción hoy
```

Acciones:

- Escribir por WhatsApp;
- Marcar pago recibido;
- Resolver acceso;
- Ver detalle.

---

## B. Riesgo de abandono

Incluye:

- pruebas sin ofertas;
- pruebas sin WhatsApp;
- registrados que no volvieron;
- ofertas listas sin enviar;
- clientes activos sin actividad.

Visual sugerido:

```txt
🟠 Riesgo de abandono
Clientes que pueden enfriarse
```

Acciones:

- Escribir seguimiento;
- Ayudar a crear primera oferta;
- Enviar mensaje de activación;
- Ver detalle.

---

## C. Revisar

Incluye:

- clientes con actividad baja;
- precios cargados pero sin ofertas;
- web sin precios publicados;
- usuarios que entraron pero no vendieron.

Visual sugerido:

```txt
🟡 Revisar
Clientes con señales flojas
```

Acciones:

- Ver detalle;
- Sugerir próxima acción;
- WhatsApp liviano.

---

## D. Bien

Incluye:

- clientes activos;
- clientes que mandan WhatsApp;
- clientes que usan Vender urgente;
- clientes con pagos al día.

Visual sugerido:

```txt
🟢 Bien
Clientes usando AppPromos
```

Acciones:

- Ver hitos;
- Ofrecer upgrade;
- Felicitar;
- No molestar.

---

# 8. Acciones sugeridas

## Tipos de acción

```txt
Escribir seguimiento
Enviar mensaje La Nelly
Ayudar con primera oferta
Recordar cargar precios
Sugerir Vender urgente
Sugerir plan Salvador
Marcar pago recibido
Reactivar acceso
Ver detalle
Entrar como cliente
```

## Reglas

Cada acción sugerida debe tener:

- motivo;
- botón claro;
- mensaje prearmado si corresponde;
- posibilidad de ver detalle antes de actuar.

## Ejemplo

```txt
Cliente: Carnicería Juan
Estado: Riesgo de abandono
Motivo: prueba activa, sin WhatsApp enviado.
Acción sugerida: Escribir seguimiento.
```

---

# 9. Mensajes prearmados

## Seguimiento por baja actividad

```txt
Hola, soy Damian de AppPromos.

Vi que todavía no llegaste a armar ofertas esta semana. Si querés, te ayudo a salir vendiendo rápido por WhatsApp.
```

## Primera oferta

```txt
Hola, soy Damian de AppPromos.

Vi que ya entraste a la app. Te puedo ayudar a armar tu primera promo para mandarla por WhatsApp en un minuto.
```

## Prueba por vencer

```txt
Hola, soy Damian de AppPromos.

Tu prueba está por terminar. Si la app te sirvió para vender más rápido, lo resolvemos y seguís usando AppPromos sin cortar el ritmo.
```

## Pago pendiente

```txt
Hola, soy Damian de AppPromos.

Tenemos que resolver tu abono para que sigas vendiendo tranquilo. Lo vemos por WhatsApp y lo dejamos al día.
```

## Cliente activo con buen uso

```txt
Hola, soy Damian de AppPromos.

Vi que ya estás usando AppPromos para mandar promos. Buenísimo. Si querés, podemos ver cómo aprovechar mejor el plan Salvador para vender antes de picar y cuidar margen.
```

---

# 10. Relación con Tracking

El Control operativo depende del tracking mínimo definido en Future 5-C.

Datos de entrada:

- lastLoginAt;
- lastActivityAt;
- offersCreatedCount;
- urgentOffersCreatedCount;
- whatsappSentCount;
- savedPromosCount;
- lastOfferCreatedAt;
- lastWhatsappSentAt;
- lastPriceUpdateAt;
- lastWebOpenedAt.

Si un dato no existe todavía, la salud debe calcularse con lo disponible.

No debe romper el Admin por falta de métricas.

---

# 11. Relación con Cobranzas

La salud también debe mirar datos comerciales:

- estado de pago;
- próximo vencimiento;
- último pago;
- plan;
- acceso;
- suspensión;
- notas internas.

Ejemplo:

Un cliente puede estar activo en uso, pero con pago vencido.

En ese caso:

```txt
Uso: Bien
Cobranzas: Urgente
Salud general: Urgente
```

La salud general prioriza lo que requiere acción.

---

# 12. Relación con La Nelly

La Nelly entra cuando la acción sugerida es de cobro, cuenta o continuidad.

## Casos La Nelly

- pago pendiente;
- pago vencido;
- acceso pausado;
- acceso suspendido;
- prueba vencida;
- regularización manual.

## Tono

```txt
Lo resolvemos.
Te ayudo a seguir vendiendo.
No te quedes sin AppPromos.
```

## Regla

La Nelly no amenaza.

La Nelly ayuda a resolver.

---

# 13. Relación con Carniza

Carniza entra cuando la acción sugerida es comercial.

## Casos Carniza

- crear primera oferta;
- mandar WhatsApp;
- usar Vender urgente;
- actualizar precios;
- ver web;
- aprovechar Salvador;
- reactivar uso por valor.

## Regla

En Admin, Carniza no aparece como vendedor flotante.

Puede aparecer como sugerencia contextual interna:

```txt
Sugerencia Carniza: ayudalo a mandar su primera promo.
```

---

# 14. Diseño visual sugerido

## Card de Control

```txt
Carnicería Juan
Plan: Prueba
Salud: Riesgo de abandono
Motivo: no mandó WhatsApp en 7 días
Acción: Escribir seguimiento

[WhatsApp] [Ver detalle]
```

## Detalle

En el detalle del cliente:

```txt
Salud del cliente: Riesgo de abandono

Motivo principal:
No llegó al momento de valor.

Señales:
- Último ingreso: hace 5 días
- Ofertas creadas: 1
- WhatsApp enviados: 0
- Precios actualizados: sí

Acción sugerida:
Escribir seguimiento.
```

---

# 15. Reglas técnicas futuras

## No guardar salud como única verdad

La salud puede calcularse en pantalla desde métricas y datos actuales.

Si se guarda, debe ser como cache o snapshot, no como verdad definitiva.

## Evitar inconsistencias

No guardar campos calculados como:

- diasSinActividad;
- diasVencido;
- diasParaVencer;

si pueden calcularse desde fechas fuente.

Guardar fechas fuente:

- lastActivityAt;
- nextPaymentDueAt;
- trialEndsAt;
- lastPaymentAt.

## Tolerancia

Si faltan datos, mostrar:

```txt
Sin datos suficientes
```

No romper.

---

# 16. Qué NO se implementa todavía

- IA real;
- scoring complejo;
- dashboards con gráficos;
- predicción de churn;
- campañas automáticas;
- mensajes masivos;
- webhooks de pago;
- conciliación automática;
- backend;
- Cloud Functions;
- reglas nuevas de Firestore;
- PR a dev;
- deploy.

---

# 17. Criterios de aceptación futura

Cuando se implemente Future 5-D:

- el Admin carga sin errores;
- Control muestra prioridades;
- los estados son humanos;
- cada estado tiene motivo;
- cada estado tiene acción sugerida;
- no se muestran tecnicismos;
- no se rompe si faltan métricas;
- no se hacen escrituras excesivas;
- no se mezcla Carniza con La Nelly;
- no se toca flujo de venta;
- no se toca producción sin aprobación.

---

# Frase final

Control operativo no es mirar números.

Es saber a quién cuidar, a quién activar y a quién escribirle hoy.
