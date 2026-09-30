# QA-C01.1 — CP1: Motor común de destacados

**Fecha:** 30/09/2026 · **Entorno:** `C:\apppromos-qa` (QA) · **Sin push, sin deploy, sin producción.** CP2 no se inició.

## 1. Contrato exacto tomado del plan (§4 de `QA-C01.1-plan-implementacion.md`)

```text
kind        "daily" | "promo" | "product"
key         string estable
title       qué me llevo | nombre del producto
titleShort  resumen "2 kg Costilla + N cortes más" (solo 3+ ítems) | null
label       nombre comercial informativo | null
lines[]     [{qty, unit, name}] lista completa, en orden de carga
price       precio final REAL publicado
priceUnit   "kg" (producto) | null
listPrice   número | null
savingPct   entero | null
image       URL principal | null
images[]    hasta 3 URLs (orden = orden de carga, decisión C)
extraCount  N de "+N"
imageKind   "cut" | "cover" | "none"
isDaily     bool
cartItem    objeto de data-cart-add (lo arma web.html; el motor no lo modela)
anchor      {view, id}
```

Hay una prueba (la 21) que verifica que **todos** los destacados reales tienen **exactamente** estas 17 claves. No se usaron los nombres alternativos de un mensaje anterior (`source`, `sourceId`, `referencePrice`, `imageUrl`, `product`, `productItems`), tal como indica el GO: el plan es la fuente de verdad.

## 2. Archivos

| Archivo | Estado | Líneas |
|---|---|---|
| `public/js/services/storefront-highlights-service.js` | **NUEVO** | 338 |
| `tools/qa/test-storefront-highlights.mjs` | **NUEVO** (sigue la convención existente `tools/qa/test-*.mjs`) | 259 |
| `tools/qa/fixtures/cp0-carniceria-qa.json` | **NUEVO**: snapshot público real de Carnicería QA (productos, promos, Promos del día) tomado de Firestore QA el 30/09 | — |

**Archivos existentes modificados: ninguno.** `web.html` **no importa todavía** el motor, así que no hay ningún cambio visible ni de comportamiento en la web pública.

## 3. Funciones (todas puras: sin DOM, sin Firebase, sin HTML)

| Función | Qué hace |
|---|---|
| `normalizeKey`, `normalizeUnit` | Normalizan texto (sin tildes) y unidades (kg/kgs/kilo… → `kg`; u/unidad… → `unidad`) |
| `matchCatalogProduct(item, products)` | Cruce ítem → producto (§4) |
| `buildWhatYouGet(items)` | `title`, `titleShort`, `lines[]` |
| `isInformativeLabel(name, allNames)` | ¿El nombre comercial aporta algo? |
| `resolveHighlightImages(items, products, {thumbFn, coverFn, source})` | `image`, `images[]`, `extraCount`, `imageKind` |
| `computeReferencePrice(items, products, finalPrice)` | `listPrice`, `savingPct` |
| `toHighlight(kind, source, ctx)` | Arma un destacado |
| `buildStorefrontHighlights({products, combos, dailyOffers, isStarter, entryAnchor, fns})` | Pool ordenado |

**Dependencias inyectadas** (desde web.html en CP2+): `thumbFn` = `getProductThumbnailPath`, `coverFn` = `comboCover`, `totalFn` (opcional; por defecto la misma lógica que `getTotal`), `cartItemFn` = `engineOfferCartItem` / ítem de producto actual, `anchorFn` = `productAnchorId` / `promoAnchorId` / `dailyAnchorId`, `dailyIdFn` = `dailyOfferId`. **El motor no crea un segundo modelo de carrito**: el `cartItem` lo sigue armando el código existente.

## 4. Reglas de cruce

- **Siempre nombre + rubro**, normalizados. **Nunca solo por nombre**: si el ítem no tiene rubro, no cruza.
- Un `productId` en el ítem solo se acepta si además coincide el rubro. Hoy los ítems publicados no traen id; queda preparado para el día en que lo traigan.
- Si hay **más de un** producto con el mismo nombre + rubro, se considera ambiguo y no cruza.
- ✅ **Costeletas Novillo → `novillo_costeletas` ($16.500). Nunca resuelve como Cerdo** (prueba 07).

## 5. Reglas de imágenes

1. Por cada ítem, en orden: foto del producto cruzado (`getProductThumbnailPath`); si no cruza, se prueba la foto directo con `{nombre, rubro}` del ítem (paso 2 aprobado en la especificación §4.1).
2. Sin duplicados. Solo URLs no vacías.
3. **1 producto:** con foto → `cut`.
4. **2 o más productos:** con **al menos 2 fotos** → `cut` y hasta 3 en `images[]`. Con 0–1 fotos → `comboCover` → `cover` (regla de la especificación §16.2). Sin portada → `none`.
5. Principal = `images[0]` = primer ítem cargado que tenga foto (decisión C). No se ordena por precio ni por nombre.
6. **Productos del pool:** sin foto no son candidatos.

## 6. Semántica de `+N`

`extraCount` = **cantidad de productos de la promo que no están representados en `images[]`** = `lines.length − images.length`, solo cuando `imageKind = "cut"`. Con `cover`/`none` vale 0, porque no hay mosaico al que sumarle "+N".

- 4 productos con foto → 3 imágenes + **+1** ✅
- 5 productos con foto → 3 + **+2** ✅
- **4 productos con solo 2 fotos → 2 imágenes + +2**, contenido completo en `lines`.

> El GO pedía documentar este último caso si el plan no era inequívoco. El plan define `extraCount` como "cantidad de ítems sin foto mostrada", y eso da **+2**. Así quedó implementado. Si preferís otra lectura (por ejemplo, no mostrar "+N" cuando faltan fotos), es un cambio de una línea.

## 7. Precio de referencia

`listPrice = Σ (precio catálogo × cantidad)`, **solo si todos** los ítems:
- cruzan (nombre + rubro, sin ambigüedad);
- tienen un precio numérico > 0;
- tienen una cantidad numérica > 0;
- tienen una unidad **igual** a la del producto (después de normalizar).

Si **cualquiera** falla: `listPrice = null` y `savingPct = null`. **Nunca se calcula en forma parcial.**

## 8. Ahorro efectivo

- Se compara contra el **precio final REAL** publicado (`total`), nunca contra el % nominal. Ejemplo D3: referencia $34.900 contra final **$31.500** (no $31.410) → **9%**, no 10%.
- Condiciones: referencia confiable, final > 0, referencia > final, ahorro ≥ **5%**.
- **Redondeo: hacia abajo (`Math.floor`)**. Ver diferencia 1 en §11.
- Si el ahorro es menor al 5%: **ni referencia ni porcentaje** (los dos `null`).

| Caso real CP0 | Referencia | Final publicado | Ahorro |
|---|---|---|---|
| D1 Promo 1 | 57.000 | 51.300 | 10% |
| D2 Para la parrilla | 36.000 | 32.400 | 10% |
| D3 Promo cerdo | 34.900 | 31.500 | **9%** |
| D4 Súper finde | 66.000 | 59.500 | **9%** |
| D5 Promo 2 (Novillo) | 33.000 | 29.800 | **9%** |
| D6 Promo del día | 16.400 | 13.100 | **20%** (20,1) |
| PD Costeletas cerdo | 8.000 | 6.400 | 20% |

## 9. Casos no calculables (fixtures controlados)

| Caso | Resultado |
|---|---|
| A. Producto inexistente ("Chorizo" Cerdo) | sin referencia ni ahorro ✅ |
| B. Nombre correcto + rubro incorrecto ("Alitas" Novillo) | no cruza; sin ahorro ✅ |
| C. Precio inválido (0 y "abc") | sin ahorro ✅ |
| D. Unidad incompatible ("unidad" contra kg) | sin ahorro ✅ |
| E. D4 + un ítem irresoluble | sin ahorro; **contenido completo igual** (5 líneas) ✅ |

## 10. Pruebas y resultados

**Ejecución:** `node tools/qa/test-storefront-highlights.mjs` (mismo mecanismo que las demás pruebas del repo; usa `node:test`/`node:assert`, que vienen con Node, sin instalar dependencias). Importa **la biblioteca real de fotos** y **los datos reales de CP0**.

```
# tests 22
# pass 22
# fail 0
```

| # obligatoria | Prueba | ✓ |
|---|---|---|
| 1 | producto normal | ✅ |
| 2 | promo 1 producto (D1) | ✅ |
| 3 | promo 2 productos (D2) | ✅ |
| 4 | promo 3 productos (D3) | ✅ |
| 5 | promo 4+ (D4: principal Asado, 3 imágenes, +1, contenido completo) | ✅ |
| 6 | Promo del día (D6 multiproducto + Costeletas cerdo) | ✅ |
| 7 | mismo nombre / distinto rubro: **Costeletas Novillo ≠ Cerdo** | ✅ |
| 8 | preservación del orden (ítems invertidos → resultado invertido) | ✅ |
| 9 | máximo 3 imágenes, sin duplicados | ✅ |
| 10 | `+N` | ✅ |
| 11 | referencia correcta (D1, D2, D3, D4) | ✅ |
| 12 | ahorro efectivo contra el precio final real | ✅ |
| 13 | ahorro < 5% (4% → nada; 5% exacto → sí; final > referencia → nada) | ✅ |
| 14 | producto inexistente | ✅ |
| 15 | rubro incorrecto | ✅ |
| 16 | unidad incompatible | ✅ |
| 17 | precio inválido | ✅ |
| 18 | multiproducto con un ítem irresoluble | ✅ |
| 19 | ausencia de imagen (cover / none / 4 con 2 fotos / multi con 1 foto / producto sin foto fuera del pool) | ✅ |
| 20 | orden estable (10 corridas idénticas; daily → 1 ítem con ahorro → resto en orden del carnicero → productos alternando Novillo/Cerdo/Pollo; starter; `entryAnchor`) | ✅ |
| extra 21 | contrato exacto de 17 claves + el motor no contiene markup ni acceso al DOM | ✅ |
| extra 22–23 | etiquetas informativas ("Promo 1", "Combo A", "OFERTA DEL DÍA" → ocultas); decimales "1,5 kg" | ✅ |

**Pool real de Carnicería QA (salida del motor):**
1. daily · "1 kg Pata y Muslo + 1 kg Pechuga con Hueso" · $13.100 · ~~16.400~~ 20% · 2 fotos
2. daily · "1 kg de Costeletas" · $6.400 · ~~8.000~~ 20%
3. promo · "3 kg de Asado Costilla" · $51.300 · 10% *(etiqueta oculta: "Promo 1")*
4. promo · "2 kg de Costeletas" · $29.800 · 9% · **foto de novillo** *(etiqueta oculta: "Promo 2")*
5. promo · "2 kg Asado Costilla + 1 kg Alitas + 1 kg Puchero + 1 corte más" · etiqueta "Súper finde" · 9% · 3 fotos +1
6. promo · "1 kg Matambre + 1 kg Pechito + 1 kg Pulpas" · "Promo cerdo" · 9%
7. promo · "1 kg Falda + 1 kg Nalga" · "Para la parrilla" · 10%
8. en adelante: productos con foto, alternando Novillo, Cerdo y Pollo.

## 11. Diferencias respecto del plan / GO (documentadas, no improvisadas)

1. **Redondeo del %.** El GO §9 dice "fórmula conceptual `round(...)`"; la especificación aprobada (§13.1) dice "**redondeando el porcentaje hacia abajo** para no exagerar". Implementé **floor**, que es lo aprobado y además lo más conservador. Con los datos reales la diferencia es solo D6 (20,1 → 20 con los dos métodos). Si preferís `round`, es un cambio de una línea y de 2 aserciones.
2. **`listPrice` con ahorro menor al 5%.** El GO dice "no mostrar porcentaje"; el plan §4.3 dice "si no, no se muestra nada". Implementé **los dos en `null`**, para que ningún estilo pueda mostrar un "antes" sin porcentaje verificado.
3. **Nombre del archivo de pruebas.** El plan decía `tools/qa/highlights.test.mjs` "o carpeta equivalente". Usé `tools/qa/test-storefront-highlights.mjs` para seguir la convención existente del repo, más un fixture JSON con los datos reales.
4. **Multiproducto con 1 sola foto → `cover`** (especificación §16.2). No es una diferencia; se aclara para que quede claro que no es un error.

## 12. Limitaciones

- **No hay terminal en tu PC desde esta sesión**: no pude ejecutar `git` (status, diff, diff --check, commit). Todo lo demás se ejecutó en el entorno de trabajo, sobre copias idénticas de los archivos de tu carpeta (verificado byte a byte con `cmp` después de escribirlos).
- El equivalente a `git diff --check` se hizo a mano: 0 espacios al final de línea, 0 tabulaciones, 0 CRLF, salto de línea final presente. Cumple con `.editorconfig` y `.gitattributes` (LF).
- `node --check` OK en los 2 archivos JS.
- El fixture es una foto del 30/09: si cambian los precios de QA, las pruebas siguen usando el fixture (a propósito, para que sean reproducibles).

## 13. Diff resumido

```
 public/js/services/storefront-highlights-service.js   | 338 +++++ (nuevo)
 tools/qa/test-storefront-highlights.mjs               | 259 +++++ (nuevo)
 tools/qa/fixtures/cp0-carniceria-qa.json              |  ~250 +++ (nuevo, datos)
 0 archivos existentes modificados
```

## 14. Estado del working tree y commit

No pude verificarlo desde aquí: no hay `git` sin terminal en tu PC. Esperado: **3 archivos sin seguimiento (untracked)**, más la carpeta de evidencia `QA-C01.1-CP0/` de CP0 (también sin seguimiento; **no va en este commit**).

**Commit local pendiente, para que lo corras vos** (PowerShell, en `C:\apppromos-qa`):

```powershell
git status --short
node tools/qa/test-storefront-highlights.mjs
git add public/js/services/storefront-highlights-service.js tools/qa/test-storefront-highlights.mjs tools/qa/fixtures/cp0-carniceria-qa.json
git diff --cached --check
git commit -m "feat: agregar motor comun de destacados QA-C01.1"
git log -1 --stat
```

(NO push. NO deploy.)

---

**CP1 LISTO**: motor y pruebas en verde, archivos en su lugar, sin tocar ninguna interfaz. **Solo falta ejecutar el commit local**, porque esta sesión no puede correr `git` en tu PC. CP2 no se inició.
