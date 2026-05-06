# Future 5-B — Reorden visual del Admin sin datos nuevos

## Estado

Documento de planificación dentro de la rama:

`future/admin-tracking-cobranzas`

No productivo.  
No main.  
No dev todavía.  
No deploy.

Este documento continúa el mapa:

`FUTURE_5_ADMIN_SAAS_MAPA.md`

## Objetivo

Reordenar visualmente el Panel Admin actual para que deje de sentirse como una ficha mezclada y empiece a funcionar como una herramienta SaaS operativa.

La regla central sigue siendo:

- **Datos básicos** = quién es.
- **Cobranzas** = qué tiene que resolver.
- **Tracking** = qué está haciendo.
- **Acciones** = qué hacemos nosotros con ese cliente.
- **Control** = a quién mirar primero hoy.

## Principio del Future 5-B

Este paso NO agrega datos nuevos.

Reorganiza lo que ya existe.

No se implementan todavía:

- nuevos contadores;
- nueva lógica de salud;
- nuevos eventos de tracking;
- Mercado Pago API;
- webhooks;
- backend;
- cambios de reglas Firestore;
- borrado real de usuarios Auth.

## Problema actual

El Admin actual ya tiene mucha información útil, pero aparece mezclada en la ficha de cada carnicería:

- datos del cliente;
- explicación de estados;
- cambio de acceso;
- cambio de pago;
- cambio de plan;
- próximo vencimiento;
- nota interna;
- actividad;
- módulos;
- contacto por WhatsApp;
- herramientas;
- zona peligrosa;
- acciones TEST.

Eso funciona, pero si sigue creciendo así se convierte en un panel difícil de operar.

## Solución propuesta

Al abrir el detalle de una carnicería, mostrar una navegación interna simple:

```txt
[Datos básicos] [Cobranzas] [Tracking] [Acciones]
```

Opcionalmente:

```txt
[Datos] [Cobranzas] [Uso] [Acciones]
```

La etiqueta visible puede ajustarse más adelante, pero la intención debe quedar separada.

## Vista resumen de carnicería

En la lista principal, cada card debería mostrar solo lo indispensable:

```txt
Carnicería Juan
SALVADOR · Pago al día · Salud: Bien
Última actividad: ayer
WhatsApp: 3462...

[Ver detalle] [WhatsApp] [Entrar]
```

No mostrar toda la gestión comercial en la card principal.

La card principal debe responder rápido:

- quién es;
- cómo está;
- si hay que mirar algo;
- qué acción rápida corresponde.

## Detalle de carnicería

### 1. Datos básicos

Debe mostrar:

- nombre de carnicería;
- responsable;
- email;
- WhatsApp;
- localidad;
- provincia;
- dirección;
- web / slug público;
- cliente real o empresa TEST;
- ID técnico como referencia secundaria.

No debe mostrar:

- botones peligrosos;
- cambios de pago;
- notas de cobranza;
- logs;
- eliminar;
- clonar.

### 2. Cobranzas

Debe agrupar lo que hoy aparece como gestión comercial:

- plan actual;
- estado de pago;
- próximo vencimiento;
- último pago;
- marcar pago recibido;
- nota interna;
- mensaje de cobranza por WhatsApp futuro;
- link de pago manual futuro;
- estado La Nelly futuro.

En Future 5-B solo se reordena lo existente.

No se agrega Mercado Pago todavía.

### 3. Tracking

Debe agrupar señales actuales de uso:

- último login;
- última actividad;
- módulos activos;
- actividad comercial visible si ya existe;
- logs o resumen si corresponde.

En Future 5-B puede mostrar solo lo que ya existe:

- `lastLoginAt`;
- `lastActivityAt`;
- datos de módulos;
- últimos accesos si ya están disponibles.

No se agregan contadores nuevos todavía.

### 4. Acciones

Debe agrupar botones operativos:

#### Acciones rápidas

- Entrar como cliente.
- Escribir por WhatsApp.
- Ver web.
- Gestionar módulos.

#### Acciones administrativas

- Reparar configuración base.
- Ver logs.
- Marcar como TEST.
- Clonar como TEST.

#### Zona segura / peligrosa

- Archivar.
- Restaurar.
- Eliminar TEST.

Reglas:

- acciones frecuentes visibles;
- acciones sensibles con confirmación;
- acciones destructivas solo TEST;
- clientes reales no se eliminan desde frontend.

## Control operativo

La pestaña Control actual puede mantenerse.

En Future 5-B no hace falta rediseñarla completa.

Solo debe respetar la idea:

```txt
Control = a quién mirar primero hoy.
```

A futuro, Control debería mostrar:

- pruebas por vencer;
- pagos vencidos;
- clientes sin actividad;
- clientes en riesgo;
- acciones sugeridas.

## Archivos probablemente involucrados

Para Future 5-B, el cambio visual probablemente impactaría en:

- `public/js/modules/admin-users-module.js`

Idealmente NO tocar todavía:

- `public/js/services/admin-service.js`
- reglas Firestore;
- Auth;
- app principal;
- módulos de venta;
- web pública;
- landing.

Si al implementar se detecta que hay que tocar servicios, frenar y diagnosticar.

## Enfoque técnico sugerido

Primera implementación simple:

1. Mantener las funciones actuales.
2. Reordenar el HTML renderizado en el detalle.
3. Separar bloques visuales por intención.
4. No cambiar nombres de campos.
5. No cambiar escrituras.
6. No cambiar permisos.
7. No cambiar lógica de empresas TEST.
8. No cambiar lógica de archivar/restaurar.

## Opción visual A — Bloques apilados

Más simple y segura:

```txt
Datos básicos
Cobranzas
Tracking
Acciones
```

Ventaja:

- menos JS;
- menos riesgo;
- todo visible;
- fácil de probar.

Desventaja:

- puede quedar largo.

## Opción visual B — Tabs internas

Más ordenada:

```txt
[Datos básicos] [Cobranzas] [Tracking] [Acciones]
```

Ventaja:

- más limpio;
- mejor para Admin desktop;
- permite crecer.

Desventaja:

- requiere un poco más de JS/eventos;
- hay que cuidar que no se rompan los botones actuales.

## Recomendación

Arrancar con Opción A o tabs muy simples.

No hacer un componente complejo.

El objetivo no es lucirse.  
El objetivo es ordenar.

## Criterios de aceptación

Future 5-B queda aceptado si:

- el Admin abre sin errores;
- la lista de carnicerías sigue cargando;
- la lista de usuarios sigue cargando;
- Ver detalle abre;
- Datos básicos se ven separados;
- Cobranzas se ve como bloque propio;
- Tracking se ve como bloque propio;
- Acciones se ven agrupadas;
- Archivar/restaurar siguen funcionando;
- Clonar TEST sigue funcionando;
- Eliminar TEST sigue protegido;
- Desactivar/reactivar usuario sigue funcionando;
- WhatsApp admin sigue funcionando;
- No aparece Carniza vendedor en Admin;
- Consola sin errores rojos nuevos.

## Qué NO se toca

- main;
- dev;
- deploy;
- Crear oferta;
- Vender urgente;
- WhatsApp de venta;
- Cambiar precios;
- Web Arranque;
- landing;
- registro/login;
- Firebase Auth profundo;
- reglas de Firestore;
- backend;
- Mercado Pago API;
- webhooks.

## Orden recomendado

1. Confirmar rama `future/admin-tracking-cobranzas`.
2. Crear backup de rama si se va a tocar JS.
3. Implementar reorden visual mínimo.
4. Probar Admin local.
5. Commit en rama future.
6. No PR todavía.
7. No merge a dev todavía.
8. Revisar con calma si el nuevo Admin realmente ayuda.

## Mensaje de commit sugerido

```txt
Future 5B reorden visual admin sin datos nuevos
```

## Regla final

El Admin debe volverse más claro sin volverse más pesado.

Si un cambio no ayuda a decidir o actuar, no entra.
