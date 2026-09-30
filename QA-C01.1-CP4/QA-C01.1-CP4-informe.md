# QA-C01.1 — CP4: Catálogo tipo vidriera + vitrina reutilizable

**Fecha:** 30/09/2026 · **Entorno:** `C:\apppromos-qa`, rama `fix/branding-publico-login-pwa` (base: CP3 `7efca11`) · **Sin push, sin deploy, sin producción.** CP6 no se inició.

## 1. Objetivo

**MIRAR / DESCUBRIR.** Que Catálogo invite a mirar mercadería real antes de buscar, con una vitrina de fotos grandes que termine fácil en compra. Además, dejar la **vitrina como capacidad reutilizable** para los 4 estilos: en CP4 solo la usa Catálogo; el resto queda para CP6.

## 2. Archivos

| Archivo | Cambio |
|---|---|
| `public/web.html` | +108 −9 |
| `public/js/services/storefront-highlights-service.js` | +42 (nuevo `selectShowcase`, sin cambios en lo existente) |
| `tools/qa/test-storefront-highlights.mjs` | +52 (7 pruebas nuevas: 25–31) |

Diff completo: `QA-C01.1-CP4.diff`.

## 3. Arquitectura reutilizable (3 capas separadas)

| Capa | Dónde | Reutilizable en CP6 |
|---|---|---|
| **1. Selección / datos** | `selectShowcase(pool, {min, max})` en el **motor** (función pura, probada) | ✅ Cada estilo pasa su pool y ajusta `min`/`max` |
| **2. Markup** | `engineShowcaseHtml(items, {variant, title, autoplay})` en `web.html` | ✅ Clases base neutras `.sf-showcase-*` + modificador `.sf-showcase--<variant>`; **todo el tamaño y el color los define el CSS del estilo** |
| **3. Comportamiento** | `sfInitShowcase(root)` en `web.html` | ✅ Actúa sobre cualquier `[data-sf-showcase-autoplay]` |

Las **clases base** solo definen el scroll horizontal con snap, sin colores ni tamaños. El look de Catálogo vive completo bajo `html[data-storefront-theme="catalogo_vidriera"]`. Una versión discreta para otro estilo (por ejemplo, tarjetas de 120 px en Directo) sería **solo CSS + una llamada**.

Además, en `web.html`, `sfProductCartItem(p, index)` arma el `cartItem` del producto con **exactamente el mismo objeto** que ya arman las plantillas de producto. **No es un formato nuevo.** Se usa para que el producto de la vitrina comparta la celda de cantidad con la grilla.

## 4. Selección y prioridad

Entrada: el pool del motor (`buildStorefrontHighlights`), con el orden estable que ya estaba aprobado.

1. **Ofertas limpias para vitrina**, en el orden del pool (Promo del día → 1 corte con ahorro → resto):
   - 1 corte con foto real;
   - 2 cortes con 2 fotos reales;
   - **3 o más cortes: fuera** (quedan en Promos);
   - portada genérica: fuera.
2. **Productos con foto**, en el orden del pool (Novillo / Cerdo / Pollo alternados). **No se repite** un producto que ya está como promo de 1 corte (mismo nombre + rubro).
3. **Máximo 8.** **Con menos de 4, `[]`: no hay vitrina** (decisión 1.3, ver §19).

Sin aleatoriedad: 5 corridas dan idéntico resultado. Ninguna tarjeta dice "oferta" si no lo es: los productos no llevan badge.

## 5. Comportamiento

- **Swipe nativo** con `scroll-snap` (sin dependencias). Se ven 1,3 tarjetas: el borde de la siguiente invita a deslizar.
- **Autoavance lento: 7 s**, pasa a la siguiente tarjeta y vuelve al inicio al llegar al final.
  - **Se detiene para siempre** al primer toque, rueda, tecla o foco dentro de la vitrina.
  - **Se pausa** si la pestaña está oculta o la vista no está visible.
  - **No corre con "reducir movimiento"** (probado: no se mueve).
- **Sin layout shift:** solo cambia `scrollLeft`, nunca la altura.
- El carrusel legacy de `standard` **no se tocó** (sigue con su propio código).

## 6. Fotos

- Cortes **contenidos** sobre el rosa claro del estilo (160×140 px en la vitrina), nunca a sangre.
- **Promo de 1 corte:** su foto real. Se eliminó la tarjeta vacía / 🏷️.
- **Promo de 2 cortes:** dos cortes superpuestos (128 px), sin lista ni recuadro de Combos.
- **3+:** no entran en la vitrina. En Promos, hasta 3 fotos + "+N".
- Tiles de Promos: 80 px, arriba del texto, **sin taparlo** (tile de 208 px).

## 7. Rubro

Texto discreto en gris claro bajo el nombre: en la vitrina ("Pollo", "Novillo · Pollo") y en las tiles de Promos. **Sin emojis.** Los íconos propios de rubro quedan para CP6.

**Costeletas:**
- Vitrina: "1 kg de Costeletas · **Cerdo**", con foto de cerdo, y "2 kg de Costeletas · **Novillo**", con foto de novillo.
- Sin promos: los productos "Costeletas · Cerdo $8.000/kg" y "Costeletas · Novillo $16.500/kg" aparecen con fotos distintas.

## 8. Precio y ahorro

- Precio real: `h.price`. En los productos se agrega "/kg" (`priceUnit`).
- Badge **−N%** solo si el motor verificó el ahorro; "Hoy" solo en una Promo del día sin ahorro calculable.
- **Jerarquía de Catálogo:** foto → nombre → precio → acción. El precio va en blanco dentro del pie navy, de tamaño normal (.95rem), **no dominante** como en Oferta.

## 9. CTA

- **Ofertas:** "Agregar" (pastilla blanca) con `data-cart-add` + `engineOfferCartItem()`. El objeto de carrito es **idéntico** al de la tile de Promos de CP3.
- **Productos:** la **misma celda de cantidad (+ / −) de la grilla** (`renderProductActionCell`). Probado: al sumar Alitas desde la vitrina, la celda de la grilla se actualiza sola (las dos muestran "− 1 kg +").
- **WhatsApp:** el mensaje incluye la oferta × 2 y el producto con su rubro. Total correcto ($30.700).

## 10. Escenarios

| Escenario | Resultado |
|---|---|
| **Con promos** (datos QA) | 8 tarjetas: 5 ofertas limpias (D6, Costeletas cerdo, D1, D5, D2) + 3 productos (Alitas, Marucha, Pata y Muslo). D3 y D4 no entran (3+ cortes). |
| **Sin promos** (gancho de prueba, sin tocar Firestore) | 8 productos con foto, alternando rubros. Ningún badge de oferta. |
| **Pocos elementos** (Don José, 3 productos) | **Sin vitrina.** Portada **idéntica** a la de CP3: sin huecos, sin duplicar, sin autoavance. |

## 11. Pruebas funcionales (GO)

| # | Prueba | ✓ |
|---|---|---|
| 1 | Carga sin errores | ✅ 0 errores |
| 2 | La vitrina se renderiza | ✅ 8 tarjetas |
| 3 | Prioriza oportunidades | ✅ ofertas primero (pruebas 25 + visual) |
| 4 | Completa con productos | ✅ |
| 5 | Sin promos | ✅ 8 productos |
| 6 | Pocos elementos | ✅ Don José: sin vitrina (1.3) |
| 7 | No duplica | ✅ claves únicas; producto ≠ promo del mismo corte |
| 8 | Swipe/scroll | ✅ capturas en posición 4 y al final |
| 9 | Movimiento no molesto | ✅ 7 s, se detiene al tocar (`scrollLeft` fijo después del toque), off con reduced-motion |
| 10 | Promo de 1 corte con foto | ✅ |
| 11 | Promo de 2 cortes | ✅ D6, D2 |
| 12 | 3+ no contamina | ✅ |
| 13 | Producto con foto/precio | ✅ "/kg" |
| 14 | Rubro identificable | ✅ |
| 15 | Costeletas Novillo ≠ Cerdo | ✅ foto, rubro y texto |
| 16 | Precio correcto | ✅ |
| 17 | Ahorro solo verificable | ✅ |
| 18–20 | CTA / carrito / WhatsApp | ✅ |
| 21 | Grilla completa disponible | ✅ 13 productos, sin cambios |
| 22 | Promos funciona | ✅ 7 tiles con foto; **0 emoji 🏷️** |
| 23–26 | Directo / Oferta / Combos / standard sin cambios | ✅ HTML idéntico a CP3 (portada + Promos) |
| 27 | Sin errores relevantes | ✅ |

Motor: **30/30 PASS** (23 anteriores + 7 de vitrina: prioridad, fallback, sin promos, menos de 4, máximo, orden estable, sin duplicados, 3+, rubro, sin foto).

## 12. Mediciones (390×844)

| | CP0/CP3 | CP4 |
|---|---|---|
| Vitrina (sección) | — | 259 px (tarjeta 250×226) |
| Primer precio | 343 px (grilla) | **375 px** (vitrina) |
| Primer CTA | 314 px (grilla) | **366 px** (vitrina; presupuesto ≤ 360: +6 px) |
| Inicio de la grilla | 194 px | 463 px |
| Tarjetas visibles | — | 1 completa + borde de la 2.ª |
| Tile de promo | 172 px | 208 px |

Nota: el primer CTA queda 6 px por encima del presupuesto de 360 px del plan. Se acepta porque el CTA es de la vitrina misma. Si preferís cumplir estricto, se baja la tarjeta 10 px.

## 13. Antes / después

- **Antes:** header → chips → grilla de tiles. La vista Promos tenía **7 tiles con 🏷️**, "Promo 1/2" como título y un badge de kg que sumaba unidades distintas.
- **Después:** header → **"En la vidriera"** (fotos grandes, precio, rubro, Agregar) → chips → **la misma grilla**. En Promos: foto real del corte o cortes, "qué me llevo", rubro y −N%. El badge de kg solo aparece si todo es kg, y se reemplaza por −N% cuando hay ahorro.

## 14. 4-up actualizado (`4up__home__CP4.png`)

| Estilo | Qué se ve primero | Verbo |
|---|---|---|
| Directo | chips + cinta compacta + grilla con "+" | ENCONTRAR |
| Oferta | bloque navy con **$13.100** gigante y −20% | APROVECHAR |
| **Catálogo** | **"En la vidriera": foto grande del corte** + chips + tiles | **MIRAR / DESCUBRIR** |
| Combos | tarjetas blancas con la lista cantidad · corte · rubro | RESOLVER |

| Pregunta | Respuesta |
|---|---|
| ¿Invita más a mirar? | **Sí.** Lo primero es una foto grande que se mueve sola y se puede deslizar. |
| ¿La foto es más protagonista que en los otros estilos? | **Sí**: 160 px contra 48 (Directo), 104 (Oferta) y 100 (Combos). |
| ¿Sigue siendo fácil comprar? | **Sí.** Agregar / + en cada tarjeta. |
| ¿El carrusel parece nativo? | **Sí.** Mismo lenguaje que las tiles (rosa claro + pie navy + botón blanco). |
| ¿Consume demasiado viewport? | No: 259 px (31% del alto). La grilla empieza en la primera pantalla. |
| ¿Los otros tres conservan su identidad? | **Sí** (HTML idéntico). |
| ¿Parece reutilizable en versiones más discretas? | **Sí**: base sin estilos y modificador por estilo (§3). |

## 15. Regresión

HTML de `#app` idéntico entre CP3 y CP4 en **Directo, Oferta, Combos y standard** (portada + Promos). **Don José en Catálogo:** idéntico también (sin vitrina).

## 16. Lo reutilizable para CP6

- `selectShowcase(pool, {min, max})`: por ejemplo, Directo con `max: 4`; Combos filtrando antes a `kind !== "product"`.
- `engineShowcaseHtml(items, {variant: "directo" | "oferta" | "combos", title, autoplay})`.
- `sfInitShowcase(app)`: ya inicializa cualquier vitrina con autoplay.
- Solo falta el CSS `.sf-showcase--<estilo>` y decidir en cada `engineHome*Html()` dónde va y con cuánto protagonismo.

## 17. Incidencias (solo registro)

1. El primer CTA queda a 366 px (presupuesto 360; §12).
2. En la tile de Promos de D4 (4 cortes), el chip "+1" queda muy al borde derecho. Es legible, pero ajustable en CP6.
3. El título "Pata y Muslo + Pechuga con Hueso" en la vitrina usa **solo los nombres** (sin kg) para entrar en 2 líneas. El detalle de cantidades está en Promos. Es la única pieza donde se omite la cantidad en una promo de 2 cortes.
4. Pendientes transversales de CP6: carrito/WhatsApp con nombres genéricos ("1 oferta Promo 2") sin composición ni rubro; "Completá con"; íconos de rubro; filtros por rubro que no filtran (Oferta, Combos escenario 0).
5. Las Promos del día QA vencen hoy 30/09 a las 23:59.

## 18. Carniza Instant

Registrado como frente futuro. **No se integró ni se anticipó su modelo de datos.**

## 19. Diferencias respecto del plan / GO

1. **Pocos elementos:** el GO pide "adaptar comportamiento" y la **decisión 1.3 aprobada** dice que con menos de 4 candidatos la vitrina desaparece. Se aplicó la 1.3, que también cumple "sin duplicar, sin huecos, sin autoavance absurdo". No se reabrió. `selectShowcase` acepta `min` configurable por si en CP6 otro estilo quiere mostrar 2–3.
2. **Selección en el motor**, no en `web.html`: para que sea probable y reutilizable. Es solo un agregado; no cambia nada de CP1/CP5.
3. **Título "En la vidriera"** (neutro, sin "hoy").
4. **Tarjeta de 250×226** en lugar de ~280×210: se ven 1,3 tarjetas a 390 px y entra el nombre en 2 líneas.
5. **Autoavance de 7 s** (el plan decía ~6 s): más tranquilo.

## 20. Estado Git

Esta sesión no puede ejecutar `git`. Los 3 archivos quedaron escritos y verificados byte a byte, y las pruebas se volvieron a correr sobre las copias de tu carpeta: 30/30. Esperado:

```
 M public/web.html
 M public/js/services/storefront-highlights-service.js
 M tools/qa/test-storefront-highlights.mjs
```

```powershell
cd C:\apppromos-qa
git status --short
git diff --check
node tools/qa/test-storefront-highlights.mjs
git add public/web.html public/js/services/storefront-highlights-service.js tools/qa/test-storefront-highlights.mjs
git commit -m "feat: mejorar Catalogo y agregar vitrina reutilizable QA-C01.1"
git log -1 --stat
```

## 21. Recomendación

**CP4 LISTO.** Catálogo conserva su identidad y ahora invita a mirar y descubrir con una vitrina de fotos reales, sin perder precio, rubro ni compra. **La vitrina queda como capacidad reutilizable** (datos en el motor, markup y comportamiento genéricos, look por estilo), no como exclusividad de Catálogo. Falta solo tu commit local. CP6 no se inició.
