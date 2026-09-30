# QA-C01.1 — CP5: Combos + pedido directo

**Fecha:** 30/09/2026 · **Entorno:** `C:\apppromos-qa`, rama `fix/branding-publico-login-pwa` (base: CP2 `7107b3f`) · **Sin push, sin deploy, sin producción.** CP3 no se inició.

## 1. Objetivo

**RESOLVER.** Cada propuesta de Combos explica qué incluye (cortes, cantidades y rubro), usa las fotos reales y agrega al pedido llevando al carrito. Sin nombres genéricos dominando y sin "Más pedido" inventado. **Manda la lista, no el precio.**

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `public/web.html` | +76 −13 |
| `public/js/services/storefront-highlights-service.js` | +4 −3 (se agrega `rubro` a `lines[]`, ver §3) |
| `tools/qa/test-storefront-highlights.mjs` | +15 −4 (prueba 05 actualizada + prueba nueva 24) |

Diff completo: `QA-C01.1-CP5.diff`.

## 3. Integración con CP1 y el único cambio del motor

La tarjeta usa `sfOfferHighlight()` (el mismo cableado de CP2), que a su vez usa `toHighlight` del motor. No se duplica en `web.html` el cruce, las fotos, el orden, el ahorro, el "+N", los nombres genéricos ni el pool.

**Cambio del motor (justificado):** el requisito transversal nuevo (GO §11) pide rubro visible. El rubro existe en cada ítem publicado, pero el contrato de `lines[]` no lo exponía. Sin este cambio, `web.html` habría tenido que volver a leer los ítems crudos, que es lo que el GO prohíbe.
- Cambio: `lines[] = [{qty, unit, name, **rubro**}]`. `rubro` es `null` si el ítem no lo trae; **no se inventa**.
- No cambia ningún otro campo, valor ni regla.
- Pruebas: **23/23 PASS**. Las 22 anteriores siguen (la 05 ahora espera también el rubro) y se agregó la **24**: "lines[] incluye el rubro; Costeletas Novillo ≠ Cerdo; sin rubro → null".
- **Directo (CP2) no usa ese campo en su HTML**: comparación de HTML idéntica (§16).

## 4. Estructura visual final (tarjeta-solución)

```
┌───────────────────────────────┐
│  [ fotos de los cortes ] (+N) │  ← recuadro rosa de 110 px que ya existía
├───────────────────────────────┤
│ Súper finde                   │  ← nombre comercial SOLO si es informativo
│ 2 kg  Asado Costilla · Novillo│  ← LISTA COMPLETA (protagonista)
│ 1 kg  Alitas · Pollo          │
│ 1 kg  Puchero · Novillo       │
│ 1 kg  Falda · Novillo         │
│ $ 59.500  Ahorrás 9% · antes $ 66.000   ← precio secundario
│ [      Pedir este combo      ]│  ← lleva al pedido
└───────────────────────────────┘
```

Se conservan el contenedor `.sf-combo-lg`, el thumb, el botón verde WA, los radios y las tipografías del estilo. **Nada fuera del recuadro que ya existía.**

## 5. Composición 1 / 2 / 3 / 4+ cortes

| Cortes | Fotos | Caso real |
|---|---|---|
| 1 | 1 foto contenida (100 px de alto) | D1, D5, Promo del día Costeletas |
| 2 | 2 superpuestas en diagonal (sin partir la tarjeta) | D2, D6 |
| 3 | principal + 2 secundarias | D3 (Matambre → Pechito → Pulpas) |
| 4+ | máximo 3 + chip navy **+N** | D4: Asado, Alitas, Puchero **+1** |

- **Orden:** el del carnicero (`images[]` del motor, decisión C).
- **Tamaño:** cada corte a unos 100–126 px CSS sobre el fondo del estilo. Nunca a sangre ni ampliado más allá de su resolución (320 px).
- **Sin foto:** el recuadro desaparece (`.is-empty`), sin placeholder ni tarjeta vacía.
- **Portada genérica:** solo si el motor devuelve `cover`, que en los datos QA no ocurre.

## 6. Contenido y cantidades

- La lista completa va renglón por renglón: **cantidad** (navy, en negrita), **corte** (seminegrita) y **rubro** (gris chico). Hasta 8 renglones visibles; si hay más, "y N cortes más".
- Cantidades con formato es-AR ("1,5 kg").
- Se entiende sin abrir otra pantalla.

## 7. Identificación de rubro

- Texto discreto "· Novillo", "· Cerdo", "· Pollo" en cada renglón, usando `publicRubroName()` (respeta los nombres propios de rubro de cada carnicería).
- **Sin emojis.**
- **Registrado para CP6:** evaluar un set propio de íconos de rubro Carnis que reemplace este texto cuando aporte claridad. No se diseñó en CP5.

## 8. Costeletas Novillo / Cerdo

| Tarjeta | Renglón | Foto |
|---|---|---|
| D5 "Promo 2" | **2 kg Costeletas · Novillo** | `novillo/costeleta.webp` |
| Promo del día | **1 kg Costeletas · Cerdo** | `cerdo/costeletas.webp` |

Se distinguen **en el texto y en la foto**. En la evidencia `combos_home__escenario_1-2__full.png` aparecen una debajo de la otra.

## 9. Precio y ahorro

- Precio `h.price` (el precio final real). Tamaño .98rem: **más chico que en CP0** (1.05rem), para que la lista mande.
- Ahorro: solo si el motor entrega `savingPct`. Se muestra como texto gris chico "Ahorrás 9% · antes $ 66.000", **sin pastilla, sin tachado grande y sin color de alerta**. El protagonismo del precio queda reservado para Oferta primero.

## 10. Acción

- "Pedir este combo" → mismo `data-cart-add` y mismo `engineOfferCartItem()` de siempre.
- **Decisión 1.2 implementada:** el botón lleva `data-after-add="cart"`. En el manejador existente, una línea nueva hace `applyStoreView("cart")` después de agregar.
- **Solo lo activan los botones que tienen ese atributo** (las tarjetas de Combos). Ningún otro botón cambia.
- Intro nueva y honesta: "Elegí un combo, revisalo en tu pedido y mandalo por WhatsApp." (antes: "…lo pedís directo por WhatsApp, sin armar el carrito").

## 11. "Más pedido"

**Eliminado** de la tarjeta, porque no hay dato de ventas que lo respalde. Solo queda el badge factual **"Hoy"** en las Promos del día.

## 12. Escenarios

Los escenarios 1–2 y 0 se probaron con un **gancho solo de prueba**, inyectado en el HTML servido al navegador de prueba (nunca en tu archivo) y que filtra las promos recibidas. **No se despublicó nada en QA.**

| Escenario | Resultado |
|---|---|
| **3+** (7 soluciones reales) | Solo soluciones + acceso "¿Preferís armar tu propio pedido?" (como antes). Sin grilla de productos. |
| **1–2** (Promo 2 Novillo + Promo del día Cerdo) | 2 soluciones + **"Completá con"**: 4 cortes con foto de los mismos rubros, sin repetir los que ya están en las soluciones (Marucha, Matambre, Pechito, Pulpas) + acceso a todos los cortes. |
| **0** | Sin tarjetas vacías: "Hoy no hay combos armados", 3 accesos por rubro con foto real (Cerdo 5, Novillo 5, Pollo 3 cortes) y "Consultar por WhatsApp". Tocar un rubro abre Productos. |

## 13. Pruebas funcionales (GO §23)

| # | Prueba | ✓ |
|---|---|---|
| 1 | Combos carga sin errores | ✅ 0 errores de consola |
| 2 | Motor CP1 consumido | ✅ |
| 3 | 1 corte muestra foto | ✅ D1, D5, Promo del día |
| 4 | 2 cortes: composición | ✅ D2, D6 |
| 5 | 3 cortes: hasta 3 fotos | ✅ D3 |
| 6 | 4+: máximo 3 fotos + +N | ✅ D4 → 3 + "+1" |
| 7 | Orden del carnicero | ✅ |
| 8 | Lista completa | ✅ D4 con 4 renglones |
| 9 | Cantidades | ✅ |
| 10 | Rubro identificable | ✅ en todos los renglones |
| 11 | Costeletas Novillo ≠ Cerdo | ✅ texto + foto |
| 12 | Precio correcto | ✅ |
| 13 | Ahorro solo cuando CP1 lo entrega | ✅ |
| 14 | El nombre genérico no domina | ✅ "Promo 1", "Promo 2" y "OFERTA DEL DÍA" no aparecen; manda la lista |
| 15 | "Más pedido" desaparece | ✅ |
| 16 | La acción agrega | ✅ y **lleva al carrito** (CP2 se quedaba en la portada) |
| 17 | Carrito correcto | ✅ Súper finde × 2: **objeto de carrito idéntico al de CP2** |
| 18 | WhatsApp correcto | ✅ **URL idéntica a la de CP2** |
| 19–21 | Escenarios 3+ / 1–2 / 0 | ✅ |
| 22 | Directo no cambia | ✅ HTML idéntico a CP2 (portada + Promos) |
| 23 | Oferta no cambia | ✅ |
| 24 | Catálogo no cambia | ✅ |
| 25 | `standard` no cambia | ✅ (sin contar el carrusel, que es aleatorio por diseño) |
| 26 | Sin errores relevantes | ✅ (solo los "Write transport errored" del test de carrito, causados a propósito al bloquear la escritura de analítica) |

La vista **Promos** de Combos usa la misma tarjeta: el contenido es idéntico al de la portada.

## 14–15. Pruebas visuales / antes-después (390×844)

Evidencia en `QA-C01.1-CP5/evidencia/`: portada y Promos DESPUÉS (pantalla y página completa), `antes-despues__home.png`, `antes-despues__promos.png`, escenarios 1–2 y 0.

| Pregunta | Respuesta |
|---|---|
| ¿Se entiende qué incluye cada solución sin abrirla? | **Sí.** Renglón por renglón, con cantidad y rubro. |
| ¿Las fotos ayudan? | **Sí.** Se reconocen los cortes y el orden coincide con la lista. |
| ¿Sigue pareciendo Combos? | **Sí.** Misma tarjeta, mismo botón verde, mismo recuadro superior (ahora lleno). |
| ¿La lista domina más que el precio? | **Sí.** 4 renglones de .92rem contra 1 precio de .98rem; el ahorro va en gris chico. |
| ¿El CTA es claro? | **Sí.** "Pedir este combo" y el paso siguiente (el pedido) se abre solo. |
| ¿El rubro es identificable? | **Sí.** |
| ¿Hay tarjetas vacías? | **No.** Ninguna, ni siquiera en el escenario 0. |
| ¿Se diferencia de lo que será Oferta? | **Sí** (§17). |

**Proporciones (§25):**

| | CP0/CP2 | CP5 |
|---|---|---|
| Tarjeta de 1 corte | 252 px | **234 px** (baja) |
| Tarjeta de 2 cortes | 252–255 px | 280–283 px |
| Tarjeta de 3 cortes | 252 px | 303 px |
| Tarjeta de 4 cortes | 273 px | 327 px |
| Primer CTA | 436 px | 464 px |
| Portada | 2.226 px | 2.357 px |

Las tarjetas de varios cortes crecen solo por la lista completa: un renglón por corte (unos 23 px cada uno) reemplaza la línea gris única de antes. Es el costo explícito de "manda el contenido". **La primera pantalla sigue mostrando 1,8 soluciones**: ninguna tarjeta ocupa la pantalla entera.

## 16. Regresión

HTML de `#app` idéntico entre CP2 y CP5 (con los mismos datos) en: **Directo** (portada + Promos), **Oferta primero**, **Catálogo** y **standard**, en portada y Promos. Motor: 23/23.

## 17. Lo que CP3 (Oferta primero) deberá diferenciar

**No copiar de CP5:**
- la lista renglón por renglón como elemento dominante;
- el precio chico y el ahorro en gris;
- las fotos en el recuadro claro **arriba** de la tarjeta;
- el nombre comercial como título.

**Sí debería tener CP3:**
- **el precio como el texto más grande**, con el ahorro visible (pastilla/tachado);
- los cortes **dentro del bloque navy** (sin recuadro claro);
- el contenido en forma **corta** (título "qué me llevo" o `titleShort`), no la lista completa;
- las oportunidades en fila horizontal, no tarjetas apiladas.

**Se puede reutilizar:** los datos del motor (incluido `rubro` en `lines`) y el principio de hasta 3 fotos + "+N", **con otra composición, otros tamaños y otras clases CSS** (`.sf-oferta-*`).

## 18. Incidencias (solo registro)

1. En las Promos del día sin nombre informativo, el badge "Hoy" queda solo en su renglón (unos 22 px). Es aceptable; si molesta, se puede llevar a la esquina de la foto en un ajuste menor.
2. "Completá con" toma los cortes en el orden del catálogo: con Novillo + Cerdo en las soluciones salieron 4 de Cerdo. Alternar rubros sería mejor, pero implica una regla de selección nueva: queda como decisión tuya (se puede resolver en el motor).
3. Los accesos por rubro del escenario 0 abren Productos **sin filtrar** por ese rubro: es la misma limitación lateral del filtro de rubros (Oferta), que no se tocó.
4. Siguen pendientes de CP0 (fuera de CP5): chips "Filtrar por kilos", emoji y redondeo del panel, hero "OFERTA DE HOY" de Oferta.
5. Las Promos del día QA vencen hoy 30/09 a las 23:59.

## 19. Diferencias respecto del plan

1. **Motor:** se agregó `rubro` a `lines[]`, por el requisito nuevo del GO §11 (§3).
2. **Ahorro en texto discreto**, no en pastilla: refuerza "manda la lista" y deja la pastilla para Oferta.
3. **Escenario 0:** mensaje "Hoy no hay combos armados" (el plan decía "Esta semana…"; la vigencia real de las promos es diaria).
4. En Promos del día sin nombre útil solo queda el badge "Hoy" (se probó con el texto "Oferta de hoy" y era redundante).

## 20. Estado Git

Esta sesión no puede ejecutar `git` en tu PC. Los 3 archivos quedaron escritos y verificados byte a byte (`cmp`) contra las versiones probadas. Esperado:

```
 M public/web.html
 M public/js/services/storefront-highlights-service.js
 M tools/qa/test-storefront-highlights.mjs
```

más las carpetas de evidencia sin seguimiento (no van en el commit).

```powershell
cd C:\apppromos-qa
git status --short
git diff --stat
git diff --check
node tools/qa/test-storefront-highlights.mjs
git add public/web.html public/js/services/storefront-highlights-service.js tools/qa/test-storefront-highlights.mjs
git commit -m "feat: mejorar Combos y pedido directo QA-C01.1"
git log -1 --stat
```

(`git diff --check` no debería marcar nada: los 4 espacios al final de línea de `web.html` ya existían antes y no están en líneas modificadas.)

## 21. Recomendación

**CP5 LISTO.** Combos conserva su identidad y ahora cada propuesta dice qué incluye, en qué cantidades y de qué rubro, con las fotos reales, sin "Promo 1" ni "Más pedido", y lleva al pedido. La lista domina sobre el precio y deja una identidad claramente diferenciable para Oferta primero. **Falta solo tu commit local.** CP3 no se inició.
