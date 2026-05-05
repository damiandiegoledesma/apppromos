# Future — Panel Admin, tracking, salud del cliente y cobranzas

## Estado

```txt
Future importante para operar AppPromos como SaaS
Cercanía: media
Implementación: después de web/flujo comercial estable
```

## Idea madre

```txt
Panel Admin = ver estado + detectar riesgo + actuar rápido + registrar historia del cliente.
```

## Piezas futuras

### 1. Salud del cliente

Estados humanos:

```txt
Bien
Revisar
Riesgo de abandono
Urgente
```

Lógica inicial:

```txt
Bien:
entró recientemente y usó función comercial.

Revisar:
hace varios días que no entra o no creó ofertas.

Riesgo:
activo o en prueba, pero no creó ofertas ni mandó WhatsApp en 7 días.

Urgente:
pago vencido, prueba por vencer, acceso bloqueado o suspendido.
```

### 2. Control operativo

Bandeja de trabajo:

```txt
pruebas por vencer
pagos por vencer
pagos vencidos
clientes sin actividad
clientes sin primer WhatsApp
clientes activos pero dormidos
```

### 3. WhatsApp contextual

Ejemplos:

```txt
seguimiento por falta de uso
recordatorio de prueba por vencer
regularización de pago
felicitación por primer uso
upsell a SALVADOR
```

### 4. Hitos de éxito

```txt
primera oferta creada
primer WhatsApp enviado
primer combo guardado
primera vez que usó Vender urgente
web publicada
10 WhatsApps enviados
50 WhatsApps enviados
pago registrado
reactivación
```

### 5. Cobranzas / La Nelly

Submódulo futuro:

```txt
clientes por vencer
clientes vencidos
mensaje WhatsApp prearmado
link de pago
marcar pago recibido
nota interna
historial de acciones
La Nelly avisando en app
```

Tono:

```txt
Lo resolvemos.
Te ayudo a seguir vendiendo.
```

No usar lenguaje frío como primera capa visible:

```txt
moroso
bloqueado
deudor
```

### 6. Mercado Pago

Primera etapa:

```txt
links manuales por plan/cliente
sin API secreta en frontend
sin webhooks automáticos
sin conciliación automática
```

Más adelante:

```txt
webhooks
conciliación
facturación
recordatorios
```

## Qué NO hacer ahora

- backend nuevo;
- SQLite;
- panel de NASA;
- heartbeat cada 10 segundos;
- scraping;
- automatización pesada;
- cobranzas agresivas.

## Regla de medición

```txt
Medir lo suficiente para decidir.
No medir por medir.
```

## Frase guía

```txt
Carniza ayuda a vender.
La Nelly ayuda a no cortar el servicio.
El Panel Admin ayuda a saber a quién escribirle hoy.
```
