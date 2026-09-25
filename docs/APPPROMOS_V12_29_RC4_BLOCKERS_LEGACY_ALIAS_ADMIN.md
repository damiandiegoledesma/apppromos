# AppPromos V12.29 RC4 — cierre de blockers RC3

Base: V12.29 RC3 Carnis Domain.
Objetivo: corregir los tres blockers encontrados en auditoría externa sin desplegar producción ni DNS.

## 1. P0 — no bloquear al superadmin

RC4 NO cambia el modelo seguro de `admins/{uid}` introducido en RC3. No se reabre la compatibilidad de autorización por `users.role`, para no reintroducir A-01/A-01b.

### Preflight obligatorio antes de desplegar firestore.rules
1. En Firebase Console > Firestore, obtener el UID real del superadmin autenticado.
2. Confirmar que existe `admins/{UID}` con `active: true` y `role: "superadmin"`.
3. Si no existe, crearlo desde Firebase Console ANTES de desplegar reglas.
4. Mantener abierta la sesión actual y verificar acceso al Centro de Control.
5. Recién entonces desplegar reglas.
6. Si cualquiera de 1–4 falla: ABORTAR DEPLOY. No desplegar reglas, Hosting ni DNS.

No hay operación automática que pueda adivinar el UID productivo. Por seguridad RC4 no incluye emails/UID hardcodeados ni una puerta trasera de bootstrap.

## 2. P0 — billing legado

`ownerCommercialWriteAllowed()` incorpora compatibilidad transitoria para documentos raíz existentes cuyo `billing.writeAccessUntil` todavía no existe y cuyo `billing.status == active`.

Esto evita congelar A La Estaca y las cuentas previas a RC3 al desplegar reglas. El propietario no puede modificar `billing` mediante las reglas de negocio, por lo que el fallback no habilita al cliente a autoextenderse.

La migración sigue siendo obligatoria mediante `ensureBusinessAdminDefaults()` desde Centro de Control. Una vez migrados todos los negocios, el fallback `legacyActive` debe retirarse en un release posterior.

Pruebas obligatorias antes de retirar fallback:
- legado activo sin writeAccessUntil: puede guardar;
- trial vigente con timestamp: puede guardar;
- trial vencido: no puede guardar;
- pago vigente: puede guardar;
- suspendido/inactivo: no puede guardar.

## 3. P0 — aliases sin snapshots congelados

Los aliases nuevos en `publicWebSlugs/{slugViejo}` son punteros mínimos:
- businessId
- slug (slug solicitado/histórico)
- aliasOf (slug canónico)
- active
- createdFrom: slug_alias
- updatedAt

`web.html` detecta `aliasOf`, carga el documento canónico y valida que ambos documentos pertenezcan al mismo businessId. Por lo tanto precios, promociones y carrito siempre salen del snapshot canónico actual.

Compatibilidad RC3: si encuentra un alias viejo con `createdFrom == slug_alias` y `slug` distinto del ID solicitado, interpreta ese `slug` como canónico y lo resuelve en vivo. Así los aliases creados durante pruebas RC3 tampoco quedan congelados.

## 4. Orden de producción (NO ejecutar durante auditoría)

1. Confirmar/crear `admins/{UID}` del superadmin desde consola.
2. Verificar login y Centro de Control.
3. Desplegar reglas.
4. Verificar inmediatamente que superadmin sigue entrando.
5. Reparar/migrar billing de A La Estaca primero y luego cada negocio legado.
6. Probar guardar precio en A La Estaca.
7. Leer de Firestore el slug productivo exacto de A La Estaca; no reconstruirlo.
8. Verificar URL histórica y canónica con mismo precio/carrito.
9. Recién con todo aprobado conectar `carnis.app` y DNS.

## 5. No incluido
- No se conectó DNS.
- No se hizo deploy.
- No se modificó el slug productivo de A La Estaca.
- No se hardcodeó identidad del superadmin.
- Los dos desvíos `publicSignals` siguen para próximo ciclo, como ya estaba acordado.
