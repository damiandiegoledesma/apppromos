# Panel Admin AppPromos — Funcionamiento V12.10-B2

**Estado documentado:** `9fef3cf — V12.10-B2-D planes pagos y notas internas`  
**Fecha de cierre del bloque:** 2026-05-03  
**Alcance:** módulo de administración operativo, empresas TEST, gestión comercial mínima y documentación asociada.

---

## 1. Objetivo del módulo Administración

El Panel Admin de AppPromos dejó de ser una vista meramente informativa y pasó a ser una herramienta de operación diaria para administrar carnicerías, usuarios, estados de acceso, estados de pago, planes, vencimientos, empresas TEST y acciones seguras.

El criterio de producto es:

> El Panel Admin debe ayudar a decidir y actuar rápido.

El administrador necesita ver información real de clientes y tomar acciones sin mirar datos técnicos como primer dato. Los IDs técnicos siguen existiendo, pero quedan como referencia secundaria.

---

## 2. Filosofía UX del Panel Admin

La app comercial del carnicero es mobile-first. El Panel Admin puede ser más desktop/notebook-first porque lo usa el administrador con más pantalla.

Reglas:

- Mostrar datos humanos primero: nombre, responsable, email, WhatsApp, localidad, provincia y estado.
- No mostrar IDs técnicos como dato principal.
- Separar estados para que no se mezclen acceso, pago, plan y administración interna.
- Toda acción fuerte debe pedir confirmación.
- Empresas reales no se eliminan directo; se archivan.
- Empresas TEST sí pueden clonarse y eliminarse con confirmación fuerte.
- Carniza no aparece en Admin como vendedor genérico: en esta versión se oculta para no tapar información.

---

## 3. Archivos principales del módulo

### Código

```txt
public/js/modules/admin-users-module.js
public/js/services/admin-service.js
public/js/services/access-control-service.js
public/js/app-main.js
```

### Documentación relacionada

```txt
public/docs/EMPRESAS_TEST_APPPROMOS.md
public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md
public/docs/PANEL_ADMIN_PLANES_PAGOS.md
public/docs/PANEL_ADMIN_FUNCIONAMIENTO_V12_10_B2.md
```

---

## 4. Acceso al Panel Admin

El acceso se valida con perfil de administrador.

Funciones relevantes:

```js
getAdminProfile()
requireAdmin()
```

Solo perfiles con rol permitido pueden operar el panel:

```js
superadmin
admin
```

---

## 5. Vista Carnicerías

La vista de carnicerías muestra una ficha compacta por empresa, orientada a lectura rápida.

Datos humanos visibles:

- nombre de carnicería;
- responsable;
- email;
- WhatsApp;
- localidad/provincia;
- dirección si existe;
- estado de acceso;
- estado de pago;
- plan;
- estado administrativo;
- etiqueta `EMPRESA TEST` si corresponde;
- ID técnico como dato secundario.

La ficha incluye el bloque **Ver detalle y acciones**, donde aparecen las acciones operativas.

---

## 6. Filtros del Panel Admin

La vista de carnicerías permite filtrar por:

### Estado de acceso

```txt
Todos
Activo
Prueba
Suspendido
Bloqueado
Archivadas
```

### Estado de pago

```txt
Todos
Al día
Pendiente
Vencido
Suspendido
Bonificado / manual
```

### Plan

```txt
Todos
Prueba gratis
ARRANQUE
SALVADOR
DUEÑO
```

### Estado administrativo

```txt
Todas
Clientes reales
Empresas TEST
Archivadas
```

---

## 7. Estados visibles y ayudas para el administrador

Cada ficha separa cuatro dimensiones distintas.

### 7.1 Acceso

Indica si la empresa puede usar la app.

| Estado | Significado | Acción sugerida |
|---|---|---|
| Activo | Puede entrar y usar normalmente. | Mantener seguimiento comercial. |
| Prueba activa | Está probando AppPromos. | Acompañar y convertir antes del vencimiento. |
| Suspendido | Acceso pausado o limitado. | Revisar pago/acceso y escribir por WhatsApp. |
| Bloqueado | No debería operar la app. | Reactivar solo si corresponde. |
| Archivada | Empresa guardada fuera del uso normal. | Restaurar si vuelve a operar. |

### 7.2 Pago

Indica situación comercial/cobranza.

| Estado | Significado | Acción sugerida |
|---|---|---|
| Al día | Pago o situación comercial al día. | Mantener activo y mirar vencimiento. |
| Pendiente | Hay algo comercial por resolver. | Escribir antes de pausar. |
| Vencido | Hay pago vencido o situación para resolver. | Contactar por WhatsApp. |
| Suspendido por pago | Cuenta pausada por cobranza. | Resolver pago antes de reactivar. |
| Bonificado / manual | Caso manejado manualmente por AppPromos. | Revisar nota interna antes de cobrar o pausar. |

### 7.3 Plan

Planes comerciales actuales:

| Plan técnico | Nombre visible | Uso comercial |
|---|---|---|
| `trial` | Prueba gratis | Acceso inicial sin costo. |
| `basic` / `arranque` | ARRANQUE | Plan de entrada para vender rápido por WhatsApp. |
| `pro` / `salvador` | SALVADOR | Plan core anti-merma y venta urgente. |
| `dueno` / `dueño` / `owner` | DUEÑO | Plan superior con mercado y web personalizada. |

### 7.4 Admin

Indica si la empresa es real, TEST, clon TEST o archivada.

| Estado | Significado |
|---|---|
| Cliente real | Empresa real. No se elimina directo. |
| Empresa TEST | Empresa de prueba interna. |
| Test / clon | Copia creada para desarrollo/pruebas. |
| Archivada | Empresa fuera del uso normal, pero no borrada. |

---

## 8. WhatsApp desde el Panel Admin

El panel permite abrir WhatsApp directo a la carnicería desde la ficha.

Comportamiento:

- Si la empresa tiene WhatsApp válido, aparece botón de escribir.
- Si la empresa es TEST y tiene WhatsApp válido, aparece como `📲 Escribir TEST`.
- Si no hay WhatsApp válido, el botón queda deshabilitado.
- En empresas TEST se muestra advertencia para verificar que el número sea de prueba.

Importante:

> Los mensajes contextuales por pago, prueba por vencer o cambio de plan quedan para el futuro bloque de Control Operativo.

---

## 9. Archivar y restaurar empresas

### Archivar empresa

Acción segura para sacar una empresa del uso normal sin borrarla.

Efecto:

```js
archived: true
archivedAt: fecha actual
status: "suspended"
updatedAt: fecha actual
```

Regla:

> Archivar no elimina datos ni Auth.

### Restaurar empresa

Vuelve a poner la empresa disponible.

Efecto:

```js
archived: false
restoredAt: fecha actual
status: "active" // si estaba suspended/archived
updatedAt: fecha actual
```

---

## 10. Desactivar y reactivar usuarios

El Panel Admin permite desactivar o reactivar usuarios a nivel Firestore.

### Desactivar usuario

Efecto:

```js
disabled: true
status: "disabled"
disabledAt: fecha actual
restoredAt: null
updatedAt: fecha actual
```

### Reactivar usuario

Efecto:

```js
disabled: false
status: "active"
disabledAt: null
restoredAt: fecha actual
updatedAt: fecha actual
```

Limitación actual:

> No se borra ni deshabilita Firebase Auth desde frontend. Eso queda para backend/Admin SDK futuro.

---

## 11. Empresas TEST

La versión actual deja diferenciadas las empresas de prueba.

Una empresa TEST puede tener:

```js
isTestBusiness: true
adminStatus: "test"
testMarkedAt: fecha
testReason: motivo
```

Objetivo:

- probar cambios sin tocar clientes reales;
- clonar escenarios;
- eliminar basura de pruebas;
- validar estados de acceso/pago/plan;
- probar Web futura;
- evitar confundir empresas de prueba con clientes reales.

Documento específico:

```txt
public/docs/EMPRESAS_TEST_APPPROMOS.md
```

---

## 12. Marcar base actual como TEST

Existe herramienta para marcar toda la base actual como TEST.

Confirmación requerida:

```txt
MARCAR TEST
```

Marca:

- empresas actuales;
- usuarios asociados;
- `publicPhoneKeys` asociados;
- `publicWebSlugs` asociados.

No hace:

- no borra nada;
- no toca Auth;
- no libera WhatsApp;
- no libera slug.

Esta herramienta se usó antes de tener clientes reales, para dejar la base de pruebas claramente identificada.

---

## 13. Clonar empresa como TEST

Acción disponible en empresas marcadas como TEST.

Reglas:

- Solo se puede clonar una empresa marcada como TEST.
- Crea una nueva empresa TEST.
- No crea usuario Auth.
- No publica web.
- No duplica WhatsApp como índice real.
- No duplica slug público real.

Datos esperados en la copia:

```js
isTestBusiness: true
adminStatus: "test"
clonedFromBusinessId: businessId original
clonedAt: fecha actual
archived: false
status: "active"
```

Se copian datos seguros de prueba, incluyendo configuración y subcolecciones conocidas cuando existen.

Uso recomendado:

- crear escenarios de prueba;
- reproducir bugs;
- probar estados;
- validar cambios sin tocar la empresa original.

---

## 14. Eliminar empresa TEST

Acción disponible solo para empresas TEST.

Confirmación requerida:

```txt
ELIMINAR TEST
```

Efecto:

- borra documento de empresa TEST;
- borra subcolecciones conocidas de prueba si existen;
- borra `core/meta` y `core/state` si existen;
- libera índices TEST en `publicPhoneKeys` y `publicWebSlugs` si corresponden;
- registra acción en `adminActions`.

No hace:

- no borra Firebase Auth;
- no debe usarse para clientes reales;
- no borra usuarios Auth asociados.

Regla:

> Cliente real no se elimina directo. Cliente real se archiva.

---

## 15. Gestión comercial mínima

Dentro de **Ver detalle y acciones** aparece el bloque **Gestión comercial**.

Permite operar:

- plan;
- estado de pago;
- próximo vencimiento;
- pago recibido;
- nota interna.

### 15.1 Cambiar plan

Planes visibles:

```txt
Prueba gratis
ARRANQUE
SALVADOR
DUEÑO
```

Internamente se normalizan valores:

```js
trial
basic
pro
dueno
```

### 15.2 Cambiar estado de pago

Estados visibles:

```txt
Al día
Pendiente
Vencido
Suspendido
Bonificado / manual
```

Internamente se normalizan valores:

```js
active
pending
overdue
suspended
manual
```

### 15.3 Próximo vencimiento

Campo fecha editable. Guarda en:

```js
billing.nextPaymentDueAt
billing.currentPeriodEnd
nextPaymentDueAt
updatedAt
```

### 15.4 Marcar pago recibido

Efecto:

```js
billing.status: "active"
billing.lastPaymentAt: fecha actual
lastPaymentAt: fecha actual
```

Mantiene o actualiza vencimiento según el valor disponible.

### 15.5 Nota interna

Campo para memoria comercial del administrador.

Guarda en:

```js
internalNote
adminNote
updatedAt
```

Ejemplos de uso:

```txt
Cliente amigo, avisar antes de pausar.
Quiere pasar a Salvador al terminar la prueba.
Lo contacté por WhatsApp el 03/05.
```

Documento específico:

```txt
public/docs/PANEL_ADMIN_PLANES_PAGOS.md
```

---

## 16. Módulos

La herramienta **Gestionar módulos** permite modificar módulos habilitados para la empresa.

En esta versión se validó que:

- abre correctamente;
- guarda cambios;
- cierra sin colgarse;
- no rompe estados de empresa;
- no interfiere con clonar/eliminar TEST.

---

## 17. Entrar como cliente / Modo administrador

Desde el Panel Admin se puede entrar como cliente.

Comportamiento validado:

- entra a la app como la empresa seleccionada;
- aparece banda de `Modo administrador`;
- existe acción para volver al Panel Admin;
- Carniza funciona en la app comercial;
- Carniza se oculta dentro del Panel Admin.

---

## 18. Registro de acciones administrativas

El servicio registra acciones en:

```txt
adminActions
```

Acciones registradas, entre otras:

```txt
business_status_changed
business_plan_changed
business_billing_status_changed
business_payment_due_changed
business_payment_received
business_internal_note_changed
business_module_changed
business_modules_bulk_changed
business_test_flag_changed
current_base_marked_as_test
business_archived
business_restored
user_disabled
user_restored
test_business_cloned
test_business_clone_created
test_business_deleted
```

Cada acción guarda:

```js
adminUid
adminEmail
adminRole
action
targetBusinessId
before
after
createdAt
createdAtIso
```

---

## 19. Future documentado: Mercado / Competencia

No se debe clonar empresas cliente para alimentar Mercado.

Cuando se revise integralmente Mercado/Competencia, se deben crear referencias de mercado controladas en una colección separada, por ejemplo:

```txt
marketSnapshots
```

Con marcas:

```js
verified: true
locked: true
source: "admin_seed"
```

No deben tener:

- Auth;
- login;
- web;
- WhatsApp;
- phoneKey;
- slug;
- presencia como cliente real.

Objetivo:

> Proteger el promedio de mercado frente a precios absurdos cargados por usuarios reales o de prueba.

Documento específico:

```txt
public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md
```

---

## 20. Pendientes del Panel Admin

### 20.1 Guardar gestión comercial en una sola acción

Actualmente plan, pago, vencimiento y nota pueden guardarse como eventos separados.

Pendiente:

```txt
Editar gestión comercial
Guardar cambios
```

Objetivo:

- evitar muchos eventos sueltos;
- hacer la operación más clara;
- reducir sensación de tablero complejo.

### 20.2 Separar Gestión comercial

La ficha puede crecer demasiado.

Pendiente:

- separar Gestión comercial como bloque más claro;
- evaluar pestaña o panel propio;
- evitar “tablero de la NASA”.

### 20.3 Control operativo

Future:

- pruebas por vencer;
- pagos por vencer;
- pagos vencidos;
- clientes sin actividad;
- salud del cliente;
- acciones pendientes;
- WhatsApp contextual.

Objetivo:

```txt
Damian, hoy tenés que escribirle a estos clientes.
```

### 20.4 Actividad e hitos

Future:

- primera oferta creada;
- primer WhatsApp enviado;
- web publicada;
- 50/100 WhatsApps enviados;
- cambio de plan;
- pago registrado.

### 20.5 Usuarios múltiples

Future:

- varios usuarios por carnicería;
- cada usuario con login propio;
- roles menores;
- cobro de usuarios adicionales.

### 20.6 Numeración interna AppPromos

Future:

```txt
Carnicería Nº 1
Usuario 1.1
AP-0001
AP-0001-U01
```

No reemplaza IDs técnicos. Requiere contador seguro.

---

## 21. Próximo hito recomendado

Después de V12.10-B2-D, el próximo hito natural es:

```txt
V12.11 — Web automática desde el registro
```

Pero antes debe hacerse diagnóstico de arquitectura.

Motivo: toca registro, `phoneKey`, slug, `publicWebSlugs`, `publicPhoneKeys`, web pública, estado web y primer ingreso con Carniza.

Regla:

> El Panel Admin ordena la casa. La Web automática vende la prueba gratis.

---

## 22. Checklist de funcionamiento validado

Validado en esta versión:

- Panel Admin abre.
- Carnicerías cargan.
- Usuarios cargan.
- Estados Acceso / Pago / Plan / Admin visibles.
- Ayudas simples por estado.
- Filtro Empresas TEST funciona.
- WhatsApp Admin funciona.
- WhatsApp TEST funciona si hay número válido.
- Archivar / Restaurar funciona.
- Desactivar / Reactivar usuario funciona.
- Entrar como cliente funciona.
- Volver al Panel Admin funciona.
- Carniza se oculta en Admin.
- Gestionar módulos funciona.
- Marcar base actual como TEST funciona.
- Clonar TEST funciona.
- Eliminar TEST funciona con confirmación fuerte.
- Gestión comercial aparece.
- Cambiar plan funciona.
- Cambiar estado de pago funciona.
- Cambiar vencimiento funciona.
- Marcar pago recibido funciona.
- Nota interna guarda y persiste al recargar.
- Consola sin errores rojos nuevos.

---

## 23. Comandos recomendados al recibir este paquete

```powershell
cd C:\apppromos

node --check .\public\js\app-main.js
node --check .\public\js\modules\admin-users-module.js
node --check .\public\js\services\admin-service.js
node --check .\public\js\services\access-control-service.js

git status --short
git diff --stat
```

Si está todo correcto, commitear solo si corresponde:

```powershell
git add public/js/app-main.js
git add public/js/modules/admin-users-module.js
git add public/js/services/admin-service.js
git add public/js/services/access-control-service.js
git add public/docs/EMPRESAS_TEST_APPPROMOS.md
git add public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md
git add public/docs/PANEL_ADMIN_PLANES_PAGOS.md
git add public/docs/PANEL_ADMIN_FUNCIONAMIENTO_V12_10_B2.md
```

---

## 24. Nota final

Este documento describe el funcionamiento actual del módulo Administración luego del cierre de V12.10-B2-D. Debe mantenerse como documentación viva: cuando el Panel Admin incorpore Control Operativo, Web automática, usuarios múltiples o numeración interna, actualizar este archivo o crear una nueva versión.
