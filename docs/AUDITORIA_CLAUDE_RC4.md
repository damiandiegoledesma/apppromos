# AUDITORÍA FINAL PRE-PRODUCCIÓN — AppPromos V12.29 RC4

SHA-256 verificado: `8ea8234506a3c23f270fdbdd6877e24f0d09a4e3ee1b1dcb40b6bf4381fdac05` — coincide con el esperado.
Diff contra RC3: tres archivos de código (`firestore.rules`, `web-premium-service.js`, `web.html`). Fecha: 21/09/2026.

---

# NO-GO PARA PRODUCCIÓN

Tres hallazgos P0. Los tres son de corrección corta —ninguno pide rediseño— pero cada uno cae dentro de tu propia lista de causales de NO-GO.

RC4 resolvió bien el problema central de RC3: **el alias dejó de ser una copia y ahora es una referencia.** Alias y canónico muestran el mismo precio, comprobado. Eso era lo más difícil y está bien hecho.

---

# A. BLOCKERS ENCONTRADOS

## P0-1 — La compatibilidad legado es un bypass permanente de billing

**Archivo:** `firestore.rules`, función `ownerCommercialWriteAllowed()`, líneas ~41-47 (bloque nuevo de RC4).

```
let legacyActive = !('writeAccessUntil' in billing) && billing.status == 'active';
```

**Escenario concreto.** El fallback mira únicamente `billing.status`. **Ignora por completo `trialEndsAt` y `nextPaymentDueAt`.** Como `status: "active"` es exactamente lo que escribe el registro y lo que `normalizeBilling()` pone por defecto, casi toda cuenta previa a RC3 lo tiene — incluidas las que vencieron hace meses.

**Reproducción** (14 estados contra las reglas de RC4, emulador):

| Caso | Esperado | Real |
| --- | --- | --- |
| Nueva, prueba vigente | PERMITIDO | PERMITIDO ✓ |
| Nueva, plan pago vigente | PERMITIDO | PERMITIDO ✓ |
| Prueba vencida (con `writeAccessUntil`) | DENEGADO | DENEGADO ✓ |
| Cuenta suspendida | DENEGADO | DENEGADO ✓ |
| Legado sin `writeAccessUntil`, al día | PERMITIDO | PERMITIDO ✓ |
| **Legado con prueba vencida hace 5 meses** | DENEGADO | **PERMITIDO ✗** |
| **Legado con pago vencido hace 90 días** | DENEGADO | **PERMITIDO ✗** |
| Legado con `status: overdue` | DENEGADO | DENEGADO ✓ |
| Legado con `status: suspended` | DENEGADO | DENEGADO ✓ |
| `writeAccessUntil` como string | DENEGADO | DENEGADO ✓ |
| `writeAccessUntil` null | DENEGADO | DENEGADO ✓ |

**Impacto.** Rompe tu prueba de aceptación 8 («la compatibilidad legado no crea un bypass de billing») y la 5 para toda cuenta previa. Dijiste que ya hay otras cuentas reales con poco uso: esas son justamente las que tienen la prueba vencida y `status: "active"`, y podrían escribir indefinidamente. El bypass no caduca solo: vive hasta que alguien repare cada cuenta a mano.

**Lo que sí está bien:** el cliente **no puede fabricarse** ese estado. Comprobado: intentar borrar `writeAccessUntil` del propio `billing` queda DENEGADO, porque `ownerCanUpdateBusinessControl()` no deja tocar `billing`. El razonamiento del comentario en la regla es correcto; lo que falla es que el estado legado preexistente no se valida contra sus propias fechas.

**Corrección mínima recomendada.** Acotar el fallback en el tiempo, que es lo que lo vuelve transitorio de verdad:

```
let legacyActive = !('writeAccessUntil' in billing)
  && billing.status == 'active'
  && request.time < timestamp.date(2026, 10, 15);
```

Las reglas de Firestore no pueden parsear las fechas ISO que guarda la app, así que validar `trialEndsAt` dentro de la regla no es viable. El límite duro sí, es una línea, y obliga a completar la migración antes de esa fecha. Combinalo con reparar todas las cuentas en el deploy: el fallback queda como red de seguridad de A La Estaca, no como puerta.

## P0-2 — Un segundo renombre rompe la URL más antigua

**Archivo:** `web.html`, `resolveWebSource()`, líneas ~1864-1885. Escritura en `web-premium-service.js` líneas ~450 y ~618.

**Escenario concreto.** La resolución sigue **un solo salto**. El alias nuevo siempre se crea apuntando al slug *inmediatamente anterior*, no al canónico:

1. El carnicero se llama A. Comparte `/A` por WhatsApp e imprime el QR.
2. Cambia el nombre → `A` pasa a ser alias→B. `/A` funciona.
3. Cambia el nombre otra vez → `B` pasa a ser alias→C. **Pero `A` sigue apuntando a `B`**, que ahora es un puntero sin productos.

**Reproducción** (navegador, 360×640, siete variantes de alias):

| Caso | Estado | Precio |
| --- | --- | --- |
| Canónico | carga | $ 18.900 |
| Alias simple (1 renombre) | carga | $ 18.900 ✓ |
| **Alias de alias (2 renombres)** | **carga** | **SIN PRECIO** ✗ |
| Alias intermedio | carga | $ 18.900 |
| Alias viejo estilo RC3 | carga | $ 18.900 ✓ |
| Alias con canónico inexistente | ERROR claro | — ✓ |
| Alias apuntando a otro negocio | ERROR claro | — ✓ |

**Impacto.** La URL más antigua —la más compartida, la del QR impreso— muestra una vidriera vacía. Y no da error: carga una carnicería sin nombre y sin nada para comprar. Rompe tus pruebas 12 y 13. No hay loops infinitos (la resolución es de un salto, no recursiva), así que ese riesgo está descartado.

**Corrección mínima recomendada.** Resolver la cadena con un bucle acotado en `resolveWebSource()`, tres o cuatro saltos máximo, cortando si se repite un slug ya visto. Cinco líneas y no requiere migrar datos, porque arregla también las cadenas que ya existieran. La alternativa —repuntar los aliases viejos al renombrar— exige consultar `publicWebSlugs` por `businessId` y es más trabajo por el mismo resultado.

## P0-3 — La landing depende de un dominio que todavía no existe

**Archivos:** `public/index.html` (líneas 1424, 1620, 1637, 1648), `public/como-vender.html` (20, 35, 198, 219), `public/js/modules/carniza-landing-module.js` (80).

**Escenario concreto.** Nueve enlaces apuntan a `https://carnis.app/carniceria-a-la-estaca-3462-543210`. El de `carniza-landing-module.js:80` no es un enlace sino una redirección dura:

```js
window.location.href = "https://carnis.app/carniceria-a-la-estaca-3462-543210";
```

En tu orden de deploy, el Hosting sale en el paso 10 y el DNS recién se conecta en el 12, con propagación de SSL en el 13. **Entre esos pasos, cada botón «Ver A La Estaca funcionando» de la landing lleva a un dominio muerto**, y el certificado de un dominio nuevo puede tardar horas. Es el principal llamado a la acción de tu embudo.

Rompe tu prueba de aceptación 20 («no hay una dependencia del DNS todavía inexistente que rompa producción actual»).

**Además, cumpliendo tu pedido explícito: el slug de A La Estaca está hardcodeado.** Nueve veces, con el valor `carniceria-a-la-estaca-3462-543210`, que no fue verificado contra Firestore producción. Si el slug real difiere, esos enlaces dan error aunque el DNS ya funcione.

**Corrección mínima recomendada.** Dos opciones; prefiero la primera:

1. **Reordenar el deploy:** conectar `carnis.app` y verificar SSL *antes* de desplegar el Hosting que lo referencia. Cuesta cero líneas de código.
2. Dejar esos nueve enlaces en `apppromos.web.app/{slug}` y cambiarlos en un segundo deploy, una vez verificado el dominio.

En cualquier caso, leer el slug productivo real antes, y corregir los nueve literales si difiere.

---

# B. SEGURIDAD FIRESTORE

Auditoría adversarial contra las reglas de RC4. **Las correcciones anteriores siguen cerradas.**

| Intento | Resultado |
| --- | --- |
| Auto-asignarse `role: superadmin` en el propio `users/{uid}` | DENEGADO |
| Apuntar el propio `users.businessId` a otro negocio | DENEGADO |
| Leer la ficha o los precios de otra carnicería | DENEGADO |
| Reescribir los precios de otra carnicería | DENEGADO |
| Suspender a otra carnicería | DENEGADO |
| Escribir en `catalogs` global | DENEGADO |
| Leer el seguimiento interno de otra carnicería | DENEGADO |
| Auto-extender `trialEndsAt` | DENEGADO |
| Auto-marcarse bonificado | DENEGADO |
| **Borrar `writeAccessUntil` para caer en el camino legado** | **DENEGADO** |
| `writeAccessUntil` con tipo incorrecto (string) o null | DENEGADO |
| Alias apropiándose del snapshot de otro negocio | DENEGADO (valida `businessId`) |
| Pisar la vidriera de otro negocio (anónimo o logueado) | DENEGADO |
| Borrar el índice de teléfono de otro negocio | DENEGADO |

El único camino de escritura indebida que encontré es P0-1, y no es una escalada: es la validación incompleta del estado legado preexistente.

`ownerCanUpdateBusinessControl()` restringe el update del dueño sobre el documento raíz a `metrics`, `commercialAssistant`, `lastLoginAt`, `firstLoginAt`, `lastActivityAt` y `updatedAt`. `ownerUid`, `billing`, `status`, `plan` y `modules` quedan fuera. Correcto.

---

# C. BILLING Y LEGADO

Los diez estados del pliego están en la tabla de P0-1. Resumen:

- Estados 1, 2, 10 (cuenta legítima vigente escribiendo precios, productos y promos): **funcionan**.
- Estados 3, 4 (vencida, suspendida): **bloqueados correctamente**.
- Estados 7, 8, 9 (billing manipulado, intento de habilitarse, tocar otro negocio): **bloqueados**.
- Estado 5 (legado sin `writeAccessUntil`): **funciona** — A La Estaca va a poder seguir guardando. Ese era el objetivo y se cumple.
- Estado 6 (legado parcialmente migrado): depende de cómo quede. Con `status: "pending"` queda **denegado**; con `status: "active"` y sin fecha, permitido. Es el eje de P0-1.

**El equilibrio que pediste buscar no está logrado:** RC4 falla del lado permisivo. Con el límite temporal de la corrección sugerida, sí queda logrado.

---

# D. SUPERADMIN

**No encontré ninguna secuencia de deploy, condición de carrera ni error de reglas que produzca lockout, siempre que se ejecute el preflight.**

La decisión de RC4 de **no** incluir una puerta de bootstrap en las reglas es correcta y la respaldo: cualquier mecanismo automático para crear el primer administrador habría sido una vulnerabilidad peor que el problema que resuelve. El documento lo dice explícitamente y hace bien.

Verificaciones:

- `get()` sobre un `admins/{uid}` inexistente produce error de evaluación y la regla **deniega**. Falla hacia el lado seguro, no abre.
- El despliegue de reglas en Firebase es atómico: no hay ventana de estado parcial.
- Si el documento existe pero le falta `active: true` o el `role` correcto, `isAdmin()` da falso. El preflight debe verificar **los dos campos**, no solo la existencia. El documento de RC4 lo especifica bien.

## MEDIO / P2 — El cliente y las reglas discrepan sobre quién es administrador

**Archivo:** `public/js/services/auth-service.js`, línea 303 (sin cambios desde RC1).

```js
if (adminProfile || normalizeRole(userDoc || {}) === "superadmin") { ... source: "legacy-users-role" }
```

Las reglas ya no aceptan `users.role`; el cliente sí. Si el preflight se saltea, la sesión se resuelve como superadmin, **el Centro de Control abre**, y después cada lectura y cada escritura falla por permisos. El síntoma no es «no tenés acceso» sino un panel que carga vacío y tira errores sueltos: mucho más difícil de diagnosticar a las 3 de la mañana.

**Corrección mínima:** alinear el cliente con las reglas — exigir `adminProfile` y quitar el camino heredado. No bloquea, pero convierte un fallo confuso en uno claro.

---

# E. SLUGS Y ALIASES

El modelo de referencia está bien resuelto. La tabla de P0-2 tiene los siete casos. Lo verificado:

- **Prueba fundamental superada:** alias y canónico muestran exactamente el mismo precio ($18.900), en vivo, sin copias sincronizadas. Es lo que pediste y RC4 lo cumple.
- **Aliases de RC3 siguen funcionando.** La rama de compatibilidad (`createdFrom === "slug_alias"` sin `aliasOf`) los resuelve en vivo contra el canónico. Buena decisión: no hace falta migrar los que ya existan.
- **Sin loops infinitos.** La resolución es de un salto, no recursiva. Un ciclo A→B→A no cuelga el navegador.
- **Sin apropiación de slug.** Si el canónico pertenece a otro `businessId`, corta con error explícito.
- **Canónico inexistente:** error claro y entendible.
- **Falla la cadena de dos renombres** (P0-2).

El slug deja de regenerarse al guardar Mi Web, así que el identificador productivo se conserva (prueba de aceptación 11), siempre que no se cambie nombre ni teléfono.

---

# F. CARNIS.APP / URLs

`PUBLIC_STOREFRONT_ORIGIN = "https://carnis.app"` en `web-premium-service.js:19` es fuente única, y `getPublicWebUrl()` es el único generador. Barrido de los puntos que pediste:

| Punto | Estado |
| --- | --- |
| Mi Web (`web-module.js:35`) | usa `getPublicWebUrl` ✓ |
| Inicio / dashboard (`dashboard-module.js:54,114`) | usa `getPublicWebUrl` ✓ |
| Onboarding y alta (`web-premium-service.js:126`) | usa `getPublicWebUrl` ✓ |
| Snapshot público (`:292`) | usa `getPublicWebUrl` ✓ |
| Mi Web al guardar (`:497,516`) | usa `getPublicWebUrl` ✓ |
| Centro de Impresiones / QR (`print-center-module.js:687`) | acepta ambos dominios ✓ |
| WhatsApp, Carniza, Compartir, Copiar enlace | derivan del mismo `publicUrl` ✓ |
| **Landing y como-vender (9 literales)** | **hardcodeados a carnis.app — P0-3** ✗ |

`apppromos.web.app/{slug}` sigue resolviendo, porque es el mismo Hosting y la resolución es por pathname. Prueba de aceptación 18: cumplida por construcción.

No se cambió el formato del slug al cambiar de dominio, como pediste.

---

# G. TRACKING

**No hay eventos duplicados por alias/canónico.** El identificador de la señal es `${tipo}_${día}_${visitorId}` y el `businessId` es el del canónico, porque `resolveWebSource()` reemplaza `publicIndex` por el documento canónico antes de construir el payload. Entrar por el alias y por el canónico el mismo día produce **el mismo id de documento**; la segunda escritura sería un update, y `allow update: if false` la rechaza. Además el guard de `localStorage` usa la misma clave. Una navegación, una señal.

Esto lo verifiqué **leyendo el código, no capturando las escrituras**: Firestore escribe por un canal gRPC-Web y mi intento de interceptarlo por URL no registró nada, así que el «0 señales» de mi corrida no es evidencia de nada.

De paso, RC4 corrige el RC3-06 que había reportado: `data.slug` ahora toma el canónico de forma explícita y `requestedSlug` conserva el de entrada. La analítica queda consistente.

---

# H. REGRESIONES FUNCIONALES

Pedido completo por ambas URLs, 360×640:

| | Por el alias | Por el canónico |
| --- | --- | --- |
| Agregar al carrito | ok | ok |
| Precio unitario | $ 18.900 | $ 18.900 |
| Destino WhatsApp | `wa.me/5493462543210` | `wa.me/5493462543210` |
| Formato móvil argentino | correcto | correcto |

Pruebas de aceptación 15 y 16: cumplidas. La línea del pedido difiere entre mis dos corridas solo porque el carrito persiste en `localStorage` dentro del mismo contexto de navegador — es un artefacto de mi prueba, no del producto.

No detecté regresiones en autenticación, sesión, precios, promos, Promo del día, carrito ni Centro de Control: RC4 no tocó esos archivos. El diff son tres archivos y está acotado, lo cual es una virtud de esta RC.

---

# I. DEUDA TÉCNICA NO BLOQUEANTE

| ID | Severidad | Detalle |
| --- | --- | --- |
| D-1 | P2 | Cliente y reglas discrepan sobre el rol admin (sección D) |
| D-2 | P2 | Bonificar una cuenta cuyo plan sigue en `trial` la bloquea igual: `bonified` exige `plan != 'trial'`. Comprobado DENEGADO. Viene de RC1 (B-04) y sigue sin resolverse |
| D-3 | P2 | `publicSignals` acepta escritura anónima de cualquiera que conozca el `businessId`. Preexistente y explícitamente postergado; **no es regresión de RC4** |
| D-4 | P3 | `web.html` sigue sin etiquetas `og:`. Al compartir `carnis.app/...` en un grupo, la previsualización es genérica. Si el argumento del dominio es la confianza, la tarjeta es la mitad de esa impresión |
| D-5 | P3 | La vista Productos de la vidriera sigue abriendo sin productos hasta elegir rubro (RC1, B-02) |

---

# J. ORDEN EXACTO RECOMENDADO DE DESPLIEGUE

Tu orden es correcto en lo esencial —el preflight de admin antes de las reglas, y la reparación de billing antes de confirmar A La Estaca están bien puestos—. **Cambio una sola cosa: el dominio va antes del Hosting, no después.**

Motivo: el Hosting que vas a desplegar contiene nueve enlaces a `carnis.app`. Desplegarlo antes de que el dominio resuelva deja la landing con el CTA principal roto durante todo el tiempo de propagación de SSL (P0-3).

1. Corregir P0-1 (límite temporal al fallback legado).
2. Corregir P0-2 (resolución de cadena acotada).
3. Leer el slug productivo real de A La Estaca en Firestore. Corregir los nueve literales si difiere.
4. Confirmar el UID real del superadmin.
5. Crear o verificar `admins/{uid}` desde la consola, con `active: true` y `role: "superadmin"`.
6. Comprobar acceso al Centro de Control **con las reglas viejas todavía activas**.
7. Desplegar `firestore.rules`.
8. Verificar nuevamente el acceso al Centro de Control.
9. Reparar el billing de todas las cuentas existentes.
10. Confirmar específicamente que A La Estaca puede **guardar un precio real**, no solo entrar.
11. **Conectar `carnis.app`, DNS y esperar SSL.** Verificar que `carnis.app/{slug}` responde.
12. Recién entonces desplegar la aplicación y el Hosting.
13. QA completo por `apppromos.web.app/{slug}`.
14. QA completo por `carnis.app/{slug}`.
15. Probar ambas URLs contra A La Estaca: mismo precio, mismo pedido.
16. Considerar V12.29 apta para relanzamiento.

Los pasos 1 a 3 son nuevos. El 11 subió de posición. El resto es tu orden.

---

# ¿CONECTARÍAS HOY EL DNS DE CARNIS.APP?

## NO

Por tres razones, en orden de peso:

**Primero, porque los dos P0 de datos siguen abiertos.** El bypass legado deja escribiendo a cuentas que deberían estar bloqueadas, y la cadena de aliases rompe la URL más vieja de cualquier carnicería que se renombre dos veces. Conectar el DNS no los empeora, pero pone tráfico real y links nuevos circulando sobre una base que todavía tiene que cambiar.

**Segundo, porque el orden importa más que la fecha.** Conectar el DNS hoy, antes de haber verificado `admins/{uid}` y reparado el billing, es hacerlo en el momento de máxima exposición: el dominio nuevo empieza a recibir visitas justo cuando A La Estaca podría no estar pudiendo guardar.

**Y tercero, porque una vez que `carnis.app/{slug}` esté circulando por WhatsApp, esas URLs son permanentes de hecho.** Un link compartido no se puede retirar. Conviene que el primer link que salga ya esté sobre reglas definitivas.

Dicho esto: RC4 está cerca. Los tres P0 suman menos de un día de trabajo y ninguno exige rediseñar nada. El modelo de alias por referencia —que era lo difícil— quedó bien resuelto y verificado.

---

## PRUEBAS DE ACEPTACIÓN

| # | Afirmación | Estado |
| --- | --- | --- |
| 1 | El superadmin existente no pierde acceso | ✓ con preflight |
| 2 | Ningún usuario normal puede convertirse en administrador | ✓ |
| 3 | A La Estaca puede seguir guardando | ✓ |
| 4 | Una cuenta legítima vigente puede escribir | ✓ |
| 5 | Una cuenta vencida no puede escribir | **✗ falla en legado (P0-1)** |
| 6 | Una cuenta suspendida no puede escribir | ✓ |
| 7 | Una cuenta legado no queda bloqueada accidentalmente | ✓ |
| 8 | La compatibilidad legado no crea un bypass de billing | **✗ (P0-1)** |
| 9 | El cliente no puede autoextender su acceso | ✓ |
| 10 | El usuario no puede modificar otro negocio | ✓ |
| 11 | El slug productivo existente se conserva | ✓ |
| 12 | Cambiar nombre/teléfono no rompe URLs compartidas | **✗ al segundo renombre (P0-2)** |
| 13 | Un alias siempre muestra información actual | **✗ al segundo renombre (P0-2)** |
| 14 | Alias y canonical muestran los mismos precios | ✓ verificado |
| 15 | El carrito funciona por cualquiera de las URLs | ✓ verificado |
| 16 | WhatsApp recibe el pedido correcto | ✓ verificado |
| 17 | Los nuevos enlaces usan carnis.app | ✓ |
| 18 | `apppromos.web.app/{slug}` sigue siendo compatible | ✓ |
| 19 | No aparecen dobles eventos por alias/canonical | ✓ por lectura de código |
| 20 | No hay dependencia del DNS inexistente | **✗ (P0-3)** |

16 de 20. Las cuatro que fallan corresponden a los tres P0.
