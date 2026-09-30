# QA-C01.1 — CP2: Directo al grano

**Fecha:** 30/09/2026 · **Entorno:** `C:\apppromos-qa`, rama `fix/branding-publico-login-pwa` (base: CP1 `d77d5c2`) · **Sin push, sin deploy, sin producción.** CP5 no se inició.

## 1. Objetivo

Que **Directo al grano** comunique mejor qué se compra, use la foto real del corte y muestre el ahorro solo cuando es verificable, con acción rápida al carrito. Todo **sin perder su identidad compacta** y consumiendo el motor de CP1, sin duplicarlo.

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `public/web.html` | **+68 −10** líneas (diff completo en `QA-C01.1-CP2-web.diff`) |

Sin cambios en: el motor (`storefront-highlights-service.js`), las pruebas de CP1, el carrito, el checkout, WhatsApp, `web-premium-service.js`, el panel, los datos y los otros 3 estilos.

## 3. Integración con CP1

- Un `import { buildStorefrontHighlights, toHighlight }` del motor, junto al import existente de `getProductThumbnailPath`.
- Un bloque `sfHighlightFns` que **solo inyecta funciones existentes** de la página: `getProductThumbnailPath`, `comboCover`, `getTotal`, `dailyOfferId`, `engineOfferCartItem` y `dailyAnchorId` / `promoAnchorId` / `productAnchorId`.
- `sfOfferHighlight(source, index, isDaily)` = llamada directa a `toHighlight` del motor.
- **No se reimplementó en `web.html`** ninguna de estas reglas: el cruce nombre + rubro, el ahorro, el orden, las fotos, el "+N", el ocultamiento de nombres genéricos ni la prioridad del pool.
- **El motor no se modificó.** No faltó nada del contrato.

## 4. Markup, CSS y JS incorporado

**JS / markup:**
- `engineBannerHtml()` (cinta de Directo) se reescribió con el primer destacado de oferta del pool del motor.
- `engineComboCardHtml()` (tarjeta de la vista Promos, que **solo usa Directo**) toma título, etiqueta, foto y ahorro del motor.
- Sin cambios en los manejadores de eventos: el botón nuevo usa el `data-cart-add` que ya existía.

**CSS:** 21 reglas nuevas, **todas bajo `html[data-storefront-theme="directo_al_grano"]`**:
- `.sf-banner--strip`, `-main`, `-thumb`, `-copy`, `-side`, `-price` y `-add`;
- `.sf-combo-thumb img`, `.sf-combo-mosaic`, `.sf-combo-more`, `.sf-combo-label`, `.sf-combo-was` y `.sf-combo-off`.

La cinta reutiliza las clases y colores de siempre (`.sf-banner`, navy, eyebrow rosado, botón rojo `--sf-accent`), así que se ve **nativa del estilo**.

## 5. Qué se preservó

- La grilla de productos, las tarjetas, el stepper "+", los chips de rubro, el buscador, la barra inferior, el carrito, el formulario, el mensaje de WhatsApp y la vista Nosotros.
- El `cartItem` de la vista Promos es **el mismo objeto de antes** (no se tocó su construcción).
- Oferta primero, Catálogo, Combos y `standard`: **HTML idéntico** al original (ver §16).

## 6. Comportamiento de la cinta

- **Candidato:** el primer destacado de oferta del pool del motor. En el orden aprobado: Promo del día → promos de 1 ítem con ahorro (por % de mayor a menor) → resto de promos en el orden del carnicero.
- Si se entra con un ancla de promo (`#promo-…` / `#oferta-…`), esa promo va primero. Es el caso "vi la promo por WhatsApp".
- **Estructura:** [miniatura 48 px] [eyebrow + qué me llevo (máx. 2 líneas)] [precio + botón **Agregar**].
- **Toque en la miniatura o el texto:** abre la vista de la promo (Promo del día o Promos), igual que el botón "Ver" de antes.
- **Botón Agregar:** agrega al pedido (§10).
- **Sin ofertas:** no hay cinta (igual que antes).

## 7. Foto

- Una sola miniatura: `h.image` del motor, en un recuadro blanco de 48 px con la imagen de 44 px contenida.
- No hay mosaico en la cinta. Si hay varias imágenes, se usa solo la principal (decisión C).
- Si no hay foto (`image = null`) o falla la carga, la miniatura se omite y la cinta sigue funcionando.
- **Vista Promos (ajuste pedido por Damián, 30/09):** dentro del recuadro rosa `.sf-combo-thumb`, que antes estaba vacío:
  - promo de **1 corte**: su foto (86 px de alto);
  - promo de **2 o más cortes**: **hasta 3 fotos superpuestas** (`images[]` del motor, en el orden cargado, decisión C) y un chip **"+N"** navy si hay más cortes (`extraCount`). D4 Súper finde muestra Asado + Alitas + Puchero y **+1**.
  - La cinta de la portada sigue con **una sola** miniatura (la de la especificación de Directo).

## 8. Resumen multiproducto (decisión B)

- 1–2 cortes: `title` del motor ("3 kg de Asado Costilla", "1 kg Falda + 1 kg Nalga").
- 3 o más cortes: `titleShort` del motor ("1 kg Matambre + 2 cortes más", "2 kg Asado Costilla + 3 cortes más").
- Máximo 2 líneas (`-webkit-line-clamp: 2`). **El precio va en su propia columna y nunca se recorta.**
- En la vista Promos, la tarjeta muestra el `title` completo y, **solo con 4 o más cortes**, además la lista completa en renglón aparte (D4).

## 9. Precio y ahorro

- Precio: `h.price` (el precio final real publicado).
- Ahorro: solo si `h.savingPct` existe. En la cinta aparece como "**Ahorrás N%**" en el eyebrow; en Promos, como ~~$ referencia~~ + pastilla navy "−N%".
- **No se recalcula nada en la interfaz.** Sin `savingPct`: no hay tachado, ni porcentaje, ni badge.

## 10. Acción rápida

- Botón **"Agregar"** con `data-cart-add = encodeCartItem(h.cartItem)`. `h.cartItem` sale de `engineOfferCartItem()`, la función existente.
- Usa el manejador de siempre: el feedback "Agregado ✓" (verde) y el anuncio accesible son los que ya existían.
- **Texto "Agregar" y no "+"**: evita confundirlo con el "+" de "+ N cortes más" que puede aparecer en el título, como pide la sección 13 del GO. Ver §18.

## 11. Carrito

| Prueba | Resultado |
|---|---|
| Agregar desde la cinta **nueva** × 2 contra agregar desde la tarjeta Promos **original** × 2 (misma Promo del día) | **Objeto de carrito idéntico** (`cartEqual: true`); cantidad **2** en los dos casos |
| Badge del carrito | 1 ítem, igual en los dos casos |
| Envío por WhatsApp (formulario completo → "Pedir") | **URL `wa.me` idéntica** entre la versión nueva y la original (`waEqual: true`) |

*Durante la prueba bloqueé solo el canal de **escritura** de Firestore en el navegador de prueba, para no registrar señales de analítica en QA. Los 2 errores de consola "Write … transport errored" de ese test se deben a ese bloqueo intencional.*

## 12. Pruebas funcionales (GO §24)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Directo carga sin errores | ✅ 0 errores de consola |
| 2 | Motor CP1 integrado | ✅ import + `sfHighlightFns` |
| 3 | La cinta muestra el candidato correcto | ✅ D6 (primera Promo del día) por defecto |
| 4 | Foto correcta | ✅ `pollo/pata-muslo.webp` |
| 5 | **Costeletas Novillo ≠ Cerdo** | ✅ D5 → `novillo/costeleta.webp`; la Promo del día de cerdo → `cerdo/costeletas.webp` (ver imagen de evidencia) |
| 6 | Promo de 1 producto | ✅ D1 "3 kg de Asado Costilla", 1 línea |
| 7 | Promo multiproducto | ✅ D6 "1 kg Pata y Muslo + 1 kg Pechuga con Hueso", 2 líneas |
| 8 | Resumen de 3 o más | ✅ D3 "1 kg Matambre + 2 cortes más", D4 "2 kg Asado Costilla + 3 cortes más" |
| 9 | Ahorro verificable | ✅ 20% / 10% / 9%, según el motor |
| 10 | Caso sin ahorro | ✅ por código: sin `savingPct` no se agrega nada. **Con los datos QA no hay un caso real** (todas las promos ahorran 9% o más); la regla está cubierta por las pruebas del motor (13–18) |
| 11 | Caso sin foto | ✅ por código: la miniatura se omite si `image = null` o si falla `onerror`. Sin caso real en QA (todos los cortes tienen foto); cubierto por la prueba 19 del motor |
| 12 | El botón rápido agrega | ✅ |
| 13 | Cantidad correcta | ✅ 2 clics → `quantity: 2` |
| 14 | El carrito existente sigue funcionando | ✅ |
| 15 | WhatsApp recibe el pedido correcto | ✅ URL idéntica a la original |
| 16 | Navegación | ✅ cinta → vista daily/promos; barra inferior intacta |
| 17 | Filtros | ✅ chip "Novillo" → los mismos 5 productos que el original; la cinta sigue visible |
| 18 | Los otros 3 estilos no cambian | ✅ HTML idéntico (home + Promos) |
| 19 | `standard` no cambia | ✅ HTML idéntico sin contar el carrusel, que es **aleatorio por diseño** (dos cargas del original también difieren entre sí) |
| 20 | Sin errores de consola relevantes | ✅ |

Con ancla de entrada (vengo desde un link de promo): D1, D3, D4, D5 y la Promo del día aparecen en la cinta con su foto, título, precio y ahorro correctos (`pruebas-funcionales.json`).

## 13. Pruebas visuales (390×844, DPR 2)

Evidencia en `QA-C01.1-CP2/evidencia/`:
- `directo_al_grano__home__DESPUES.png` + `…__full__DESPUES.png`
- `directo_al_grano__promos__DESPUES.png` + `…__full__DESPUES.png`
- `antes-despues__home.png`, `antes-despues__promos.png` (a la izquierda CP0, a la derecha CP2)
- `cinta__D5-costeletas-novillo__D4-super-finde.png`

Método: la web real de QA con los datos reales de Firestore QA. Solo `web.html` y el motor se sirvieron desde la copia modificada (interceptados en el navegador de prueba). **No hubo deploy.**

## 14. Mediciones (390×844)

| | CP0 (original) | CP2 |
|---|---|---|
| Alto de la cinta | 74 px | **67 px** |
| Primer CTA de compra | 492 px (grilla) | **238 px** (Agregar de la cinta) |
| Primer "Agregar" de la grilla | 492 px | **485 px** (presupuesto ≤ 500 ✅) |
| Inicio de la grilla | 298 px | 291 px |
| Alto total de la portada | 2.139 px | 2.132 px |
| Líneas máximas del resumen | 2 | 2 |
| Miniatura | — | 48 px (imagen de 44 px) |

## 15. Comparación antes / después

| Pregunta | Respuesta |
|---|---|
| ¿Sigue siendo claramente Directo al grano? | **Sí.** Header, chips, cinta navy, grilla 2×N con "+": misma estructura y mismos colores. |
| ¿La nueva pieza parece nativa del estilo? | **Sí.** Es la misma cinta navy, con eyebrow rosado y botón rojo; suma una miniatura blanca chica. No parece un hero de Oferta, ni una vitrina de Catálogo, ni una tarjeta de Combos. |
| ¿Se entiende más rápido qué se compra? | **Sí.** "1 kg Pata y Muslo + 1 kg Pechuga con Hueso" en vez de "Pata y Muslo y Pechuga con Hueso"; "3 kg de Asado Costilla" en vez de "Promo 1". |
| ¿La foto ayuda sin dominar? | **Sí.** 48 px, del mismo alto que el texto. |
| ¿El CTA aparece suficientemente pronto? | **Sí, antes que nunca**: 238 px (antes, el primer CTA estaba a 492). |
| ¿Más información sin más scroll? | **Sí.** La cinta es 7 px más baja y la portada, 7 px más corta. |

**Vista Promos:** las tarjetas pasan de un rectángulo rosa vacío + "Promo 2" a la foto del corte + "2 kg de Costeletas" + $29.800 ~~$33.000~~ −9%. Los nombres útiles quedan como etiqueta chica ("SÚPER FINDE", "PARA LA PARRILLA", "PROMO CERDO"); "Promo 1" y "Promo 2" desaparecen.

## 16. Regresión de otros estilos

Comparación del `innerHTML` de `#app` entre el `web.html` original y el nuevo, con los mismos datos:

| Estilo | Portada | Promos |
|---|---|---|
| Oferta primero | idéntico | idéntico |
| Catálogo tipo vidriera | idéntico | idéntico |
| Combos + pedido directo | idéntico | idéntico |
| standard (sin el carrusel aleatorio) | idéntico | idéntico |

Además, las capturas de página completa de los 3 estilos engine tienen el mismo tamaño en bytes. Pruebas CP1: **22/22 PASS** (sin cambios en el motor).

## 17. Incidencias (solo registro; no se corrigieron)

1. **Nombre sin rubro:** "2 kg de Costeletas" (D5, novillo) y "1 kg de Costeletas" (Promo del día, cerdo) se leen igual. **La foto sí los distingue**, pero el texto no, porque el contrato no incluye el rubro en `lines`/`title`. Es una posible mejora del motor para un checkpoint futuro (requiere decisión).
2. "Agregado ✓": el manejador existente reemplaza el texto del botón durante 1,4 s. En la cinta, el botón se ensancha un poco en ese lapso. Es el comportamiento de siempre en las tarjetas y no se tocó.
3. Las Promos del día de este baseline vencen el **30/09 a las 23:59**. Para volver a comparar otro día, hay que re-publicarlas (procedimiento del informe CP0).
4. Siguen pendientes las incidencias de CP0 que no eran de CP2: chips "Filtrar por kilos", emoji del panel, redondeo del panel, "Más pedido" (Combos) y hero "OFERTA DE HOY" (Oferta).

## 18. Diferencias respecto del plan

1. **Botón "Agregar" en lugar de "+"** en la cinta. El plan §6.1 decía "+". Lo cambié por el GO §13, que exige que el botón no se confunda con el "+ N cortes más" del título. Además, "Agregar" es el texto que ya usan las tarjetas de Promos del mismo estilo.
2. **Sin "+N ofertas" en la cinta.** El plan §6.1 B lo proponía como texto opcional cuando hay más de una Promo del día. Lo saqué porque alargaba el eyebrow a 2 renglones y empujaba la grilla (primer CTA de la grilla a ~500 px). Las demás ofertas siguen a un toque, en la vista de la promo.
3. **Precio en una columna aparte** (junto al botón), en lugar de al final del título como la cinta original. En la primera versión, el recorte a 2 líneas cortaba el precio ("…"); así nunca se pierde.
5. **Composición de varios cortes en la ficha de Promos de Directo.** La especificación (matriz §19.1) reservaba los mosaicos para Oferta y Combos, y Directo tenía una sola miniatura. **Decisión de Damián del 30/09: la ficha quedaba muy vacía.** Se aplica **solo a la ficha de la vista Promos**; la cinta sigue con una miniatura. Para diferenciarla de Oferta y Combos, la composición de Directo es chica (cortes de 86 px dentro del recuadro rosa de 90 px ya existente), sin fondo nuevo y sin agrandar la ficha.
4. **Lista completa en la tarjeta de Promos solo con 4 o más cortes.** Con 1–3 cortes, el título ya dice todo el contenido y repetirlo era redundante.

## 19. Estado Git

Esta sesión **no puede ejecutar `git`** en tu PC. Los cambios quedaron escritos y verificados byte a byte contra la copia probada.

Esperado en `git status`: **` M public/web.html`**, más las carpetas de evidencia sin seguimiento (`QA-C01.1-CP0/`, `QA-C01.1-CP1/`, `QA-C01.1-CP2/`), que **no** van en el commit.

```powershell
cd C:\apppromos-qa
git status --short
git diff --stat
git diff --check
node tools/qa/test-storefront-highlights.mjs
git add public/web.html
git commit -m "feat: mejorar Directo al grano QA-C01.1"
git log -1 --stat
```

(NO push. NO deploy.)

## 20. Recomendación

**CP2 LISTO.** Directo conserva su identidad compacta y rápida, comunica qué se compra, usa la foto real solo como reconocimiento, muestra el ahorro solo cuando el motor lo verificó y agrega al mismo carrito, con el primer CTA más arriba que antes. Oferta primero, Catálogo, Combos y `standard` quedan sin cambios. **Falta solo tu commit local.** CP5 no se inició.
