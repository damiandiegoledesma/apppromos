# SPEC TÉCNICA FUTURE — Cobranzas / La Nelly

> Basado en la especificación técnica recibida para Cobranzas, adaptado al criterio actual de AppPromos.
>
> Estado: documentación future. No implementar directo.

## Objetivo futuro

Implementar un submódulo de cobranzas dentro del Panel Admin con tres piezas operativas:

1. **Bandeja de pagos pendientes / vencidos**.
2. **WhatsApp + link de pago prearmado**.
3. **La Nelly en app del carnicero** para avisar y guiar regularización.

## No incluir en primera implementación

- webhooks automáticos;
- scheduler automático;
- conciliación sin intervención;
- API de Mercado Pago desde frontend;
- bloqueo agresivo por defecto;
- Realtime Database.

## Adaptación obligatoria a AppPromos

La especificación original usa ejemplos con `firebase.database()` y rutas tipo `empresas/{id}`. En AppPromos se debe adaptar a Firestore y a la estructura real del repo.

```txt
NO usar firebase.database().
NO usar Realtime Database.
SÍ adaptar a Firestore.
SÍ pasar por servicios existentes como admin-service.js si corresponde.
```

## Pieza 1 — Bandeja de pagos pendientes

Nombre UI recomendado:

```txt
Cobranzas
Pagos pendientes
Clientes por resolver
```

Evitar como texto visible principal:

```txt
Morosos
Deudores
Bloqueados
```

### Criterio de filtro

Mostrar carnicerías que cumplan alguna condición:

- `billing.status === "overdue"`;
- `billing.status === "pending"`;
- próximo vencimiento dentro de 7 días;
- acceso pausado/suspendido por pago.

Orden sugerido:

1. vencidos más antiguos;
2. por vencer más próximos;
3. pendientes manuales;
4. bonificados/manuales al final.

### Datos visibles por fila

- nombre de carnicería;
- responsable;
- WhatsApp;
- email;
- plan;
- estado de pago;
- vencimiento;
- días calculados;
- nota corta;
- último contacto si existe.

### Acciones

- `WhatsApp` con mensaje sugerido;
- `Marcar pago recibido`;
- `Ver ficha`;
- `Agregar nota`;
- `Pausar/Reactivar acceso` si ya existe regla segura.

## Pieza 2 — WhatsApp + link de pago

### Criterio

El admin no debería redactar desde cero.

Mensaje sugerido, humano:

```txt
Hola {responsable}, soy Damian de AppPromos.
Tenemos que resolver el abono de {carniceria} para que sigas usando la app sin cortes.
Te dejo el link de pago: {linkPago}
Cuando lo hagas, avisame y lo dejamos al día.
```

### Mercado Pago

Primera versión:

- links cargados manualmente por admin;
- `mercadoPago.linkActivo` por cliente/plan;
- no usar API desde frontend;
- no guardar credenciales en navegador.

Futuro:

- generación backend;
- webhooks;
- conciliación automática.

## Pieza 3 — La Nelly en la app

### Tono

La Nelly cuida/resuelve. No castiga.

Estados sugeridos:

#### Por vencer

Aviso suave. No bloquear.

```txt
Tu abono está por vencer. Lo resolvemos cuando puedas para que sigas vendiendo tranquilo.
```

#### Pendiente / vencido leve

Aviso más visible. Limitar guardado/acciones críticas si corresponde.

```txt
Tenemos que resolver tu abono para que sigas vendiendo con AppPromos.
```

#### Suspendido / acceso pausado

Bloqueo más fuerte, con CTA claro.

```txt
Tu acceso está pausado por un tema de pago. Escribime y lo resolvemos.
```

### Regla visual

- La Nelly aparece como chip/flotante o panel claro.
- Carniza se oculta o minimiza cuando La Nelly está activa.
- CTA principal: `Resolver ahora`.
- No usar mensajes técnicos.

## Testing futuro mínimo

### Empresa TEST 1 — al día

- No aparece en Cobranzas.
- La Nelly no molesta.
- App funciona normal.

### Empresa TEST 2 — por vencer

- Aparece en Cobranzas con badge suave.
- La Nelly avisa, no bloquea.
- WhatsApp sugerido abre correcto.

### Empresa TEST 3 — vencida/suspendida

- Aparece arriba en Cobranzas.
- La Nelly aparece clara.
- Acciones críticas se limitan según regla.
- `Marcar pago recibido` actualiza estado.

## Archivos posibles cuando se implemente

Revisar antes:

```txt
public/js/modules/admin-users-module.js
public/js/services/admin-service.js
public/js/modules/nelly-module.js
public/js/services/access-control-service.js
public/js/services/write-guard-service.js
public/docs/PANEL_ADMIN_PLANES_PAGOS.md
```

No tocar sin diagnóstico:

```txt
Auth
resolveSession
BusinessStore profundo
Crear oferta
Vender urgente
WhatsApp comercial
```
