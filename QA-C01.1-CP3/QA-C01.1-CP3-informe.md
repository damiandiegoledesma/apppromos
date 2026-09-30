# QA-C01.1 — CP3: Oferta primero

**Fecha:** 30/09/2026 · **Entorno:** `C:\apppromos-qa`, rama `fix/branding-publico-login-pwa` (base: CP5 `aff990f`) · **Sin push, sin deploy, sin producción.** CP4 no se inició.

## 1. Objetivo

**APROVECHAR.** Que lo primero que vea el cliente sea qué conviene comprar hoy: **precio grande**, ahorro solo si es demostrable, foto real del corte y acción rápida. Todo dentro del navy de siempre. **Oferta vende la oportunidad; Combos vende la solución.**

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `public/web.html` | +74 −20 (diff en `QA-C01.1-CP3-web.diff`) |

**El motor no cambió** (23/23 PASS).

## 3. Integración con CP1

- Hero y oportunidades: `buildStorefrontHighlights(...)` del motor, filtrado a ofertas. El primero va al hero y los 6 siguientes a "Más oportunidades". Es la prioridad del motor: Promo del día → promos de 1 corte con ahorro (por %) → resto en el orden del carnicero. El ancla de entrada (`#promo-…`) pone esa promo primero.
- Fila de Promos: `sfOfferHighlight()`, el mismo cableado de CP2/CP5.
- Nuevo helper de presentación `sfRubroText(h)`: rubros distintos de `lines[]`, pasados por `publicRubroName`. **No calcula nada.**
- No se reimplementó en la UI el cruce, las fotos, el orden, el ahorro, el "+N" ni los nombres genéricos.

## 4. Hero

| | CP0 | CP3 |
|---|---|---|
| Rótulo | siempre "OFERTA DE HOY" | "Oferta de hoy" **solo si es Promo del día**; si no, "Promo" (+ nombre comercial si es útil) |
| Contenido | nombre + detalle gris | **qué me llevo** (resumen si son 3+ cortes) + rubro |
| Foto | bloque navy vacío de 150 px | foto del corte **sobre el navy**, con halo circular, a la derecha |
| Precio | 1.15rem | **2rem, blanco, el elemento más grande** |
| Ahorro | — | pastilla roja **−N%** + "antes $X" tachado (solo si el motor lo verificó) |
| CTA | verde "Pedir por WhatsApp" (agregaba al carrito) | rojo **"Agregar al pedido"** → pasa a **"✓ En tu pedido · Ver pedido"** → abre el carrito |
| Alto | 317 px | **247 px** |

## 5. Oportunidades ("Más oportunidades")

- **Título neutro "Más oportunidades"** (y no "de hoy"). Cada badge temporal individual es factual: "Hoy" solo en Promos del día **sin** ahorro calculable. Si hay ahorro, se muestra la pastilla −N%.
- **Hasta 6** en scroll horizontal. Tarjeta compacta de 164×192 px:
  - arriba, foto chica (56 px) + pastilla de ahorro;
  - **precio rojo grande (1.12rem) primero**;
  - después el contenido (2 líneas) y el rubro;
  - botón navy "Agregar".
- Reemplaza "Otros combos", que mostraba "Promo 2 · 1 producto" **sin CTA**.

## 6. Fotografías

- **1 corte:** 104 px sobre el halo en el hero, 56 px en la oportunidad y 40 px en la fila.
- **Varios cortes:** en el hero y las oportunidades, hasta 3 **en racimo apretado dentro del círculo** + "+N" rojo. En la fila de Promos, **solo la foto principal + un contador** con la cantidad de cortes (2, 3, 4).
- Siempre en el orden del carnicero (`images[]`).
- Tamaños siempre por debajo de la resolución de las fotos (320 px): nada se ve borroso.
- Sin foto: el recuadro se omite. No hay placeholders.

## 7. Multiproducto

- Resumen compacto del motor: `title` (1–2 cortes) o `titleShort` (3 o más, por ejemplo "2 kg Asado Costilla + 3 cortes más").
- **No hay lista completa en Oferta.** El detalle completo queda en Combos y en el carrito o WhatsApp, que siguen listando todos los ítems.

## 8. Precio

- `h.price` = el precio final real publicado. Nada se recalcula.
- En el hero es de 2rem (Combos: .98rem). En oportunidades y filas, el precio es el primer dato que se lee.

## 9. Ahorro

- Solo con `savingPct` del motor: pastilla roja **−N%** y, en el hero, "antes $X" tachado.
- Sin ahorro confiable no hay porcentaje, ni "antes", ni badge inventado. La propuesta **igual se muestra**: con los datos QA todas tienen ahorro, pero el camino sin ahorro quedó probado por código (§18) y cubierto por el motor.

## 10. Rubro

Texto discreto en el hero ("Novillo"), en la oportunidad (gris chico) y en la fila (dentro del meta: "Súper finde · Novillo · Pollo"). **Sin emojis.** Los íconos de rubro quedan para CP6.

## 11. Costeletas Novillo / Cerdo

| Pieza | Novillo (D5) | Cerdo (Promo del día) |
|---|---|---|
| Hero (con ancla) | "2 kg de Costeletas" · **Novillo** · `novillo/costeleta.webp` · −9% · antes $33.000 | — |
| Oportunidades | "2 kg de Costeletas" · **Novillo** · foto de novillo | "1 kg de Costeletas" · **Cerdo** · foto de cerdo |
| Fila de Promos | meta "**Novillo**" | meta "Oferta de hoy · **Cerdo**" |

Correcto en el dato, la foto y el rubro visible.

## 12. Corrección "OFERTA DE HOY"

Escenario sin Promo del día (gancho de prueba, sin tocar Firestore):
- **CP0/CP5:** "OFERTA DE HOY / Súper finde" ❌ (engañoso).
- **CP3:** "**PROMO** / 3 kg de Asado Costilla" ✅. Las oportunidades muestran solo −N% y **ningún "Hoy"**.

La lógica de vencimiento no se tocó.

## 13. Acción / carrito

- Hero: `data-cart-add` + `data-after-add="ver-pedido"`. En el manejador existente, **una rama nueva** (solo para botones con ese atributo) reemplaza el botón por "✓ En tu pedido · Ver pedido" (`data-store-view-target="cart"`).
- Oportunidades y filas: `data-cart-add` normal, con el feedback "Agregado ✓" de siempre.
- `cartItem` = `engineOfferCartItem()`, el mismo de siempre.

| Prueba | Resultado |
|---|---|
| Hero: el objeto de carrito coincide con el de CP0/CP5 (Promo del día D6) | ✅ idéntico |
| Hero: el botón pasa a "✓ En tu pedido · Ver pedido" y al tocarlo abre el carrito | ✅ |
| Oportunidad agrega (Costeletas cerdo) | ✅ |
| Fila de Promos × 2 (Promo 2) → cantidad 2, $29.800, 2 kg Costeletas | ✅ |
| WhatsApp: el mensaje incluye las 2 ofertas con sus ítems y el total $19.500 | ✅ |

## 14. Pruebas funcionales (GO §29)

| # | Prueba | ✓ |
|---|---|---|
| 1 | Carga sin errores | ✅ 0 errores |
| 2 | Consume CP1 | ✅ |
| 3 | El hero usa el candidato correcto | ✅ D6 (primera Promo del día); con ancla: D1, D4, D5 |
| 4 | Distingue Promo del día de promo común | ✅ "Oferta de hoy" / "Promo" |
| 5 | No aparece "OFERTA DE HOY" falso | ✅ |
| 6 | 1 producto muestra foto | ✅ D1, D5, Costeletas cerdo |
| 7 | 2 productos | ✅ D6, D2 |
| 8 | 3 productos | ✅ D3 (Matambre, Pechito, Pulpas) |
| 9 | 4 o más | ✅ D4: 3 fotos + "+1" |
| 10 | Contenido comprensible | ✅ qué me llevo / resumen |
| 11 | Precio final correcto | ✅ |
| 12 | Ahorro correcto | ✅ 20/10/9% del motor |
| 13 | Sin ahorro no se inventa | ✅ por código (§18) + motor |
| 14 | Rubro visible | ✅ |
| 15 | Costeletas Novillo ≠ Cerdo | ✅ |
| 16 | Oportunidades compactas | ✅ 164×192 px (una tarjeta de Combos mide unos 360×234–327 px) |
| 17–20 | Acción / cantidad / carrito / WhatsApp | ✅ |
| 21 | Nombres genéricos no dominan | ✅ "Promo 1/2" y "OFERTA DEL DÍA" nunca son el título; "Súper finde" como rótulo |
| 22–25 | Directo, Combos, Catálogo y standard sin cambios | ✅ HTML idéntico a CP5 (portada + Promos) |
| 26 | Sin errores relevantes | ✅ |

## 15. Pruebas visuales (390×844)

Evidencia en `QA-C01.1-CP3/evidencia/`:
- portada y Promos DESPUÉS (pantalla + página completa);
- `antes-despues__home.png` / `__promos.png`;
- **`oferta_vs_combos.png`**;
- `heroes.png` (D4 multiproducto y D5 Costeletas Novillo);
- `oferta_home__sin_promo_del_dia.png`.

## 16. Mediciones

| | CP0/CP5 | CP3 |
|---|---|---|
| Alto del hero | 317 px | **247 px** |
| Precio principal (Y) | 387 px (1.15rem) | **301 px (2rem)** |
| Primer CTA (Y) | 419 px | **348 px** |
| Primeras oportunidades (Y) | 519 px | **449 px** |
| Oportunidades visibles en el primer viewport | ~2,3 (con precio chico, sin foto ni CTA) | **2 completas + borde de la 3.ª**, con precio y CTA |
| Alto de una oportunidad | 150 px (sin CTA) | 192 px (con CTA) |
| Alto de una fila de Promos | ~64 px | 86 px |
| Alto de la portada | 1.273 px | 1.233 px |

## 17. Antes / después

- **Antes:** bloque navy con un rectángulo vacío arriba, un título con el nombre de la promo, un precio chico y "Pedir por WhatsApp" (que no abría WhatsApp). Debajo, tarjetas "Otros combos" vacías con "1 producto" y sin botón.
- **Después:** el mismo bloque navy, pero con la foto del corte, qué me llevo, el rubro, un **precio de 2rem** con −N% y "antes", y "Agregar al pedido". Debajo, oportunidades con precio primero, foto, ahorro y botón.

**¿Sigue siendo el mismo estilo?** Sí: el navy, el eyebrow rosado, las secciones "Elegí por rubro" y "Lo más pedido" y la paleta roja/navy se mantienen.

## 18. Oferta vs Combos

| Pregunta | Respuesta |
|---|---|
| ¿Oferta se ve claramente distinta de Combos? | **Sí.** Oferta es un bloque navy con precio gigante y un scroll horizontal de tarjetitas. Combos son tarjetas blancas apiladas con la foto arriba y la lista. |
| ¿En Oferta se detecta primero el precio/la oportunidad? | **Sí.** "$ 13.100" a 2rem, con −20%, es lo primero legible. |
| ¿En Combos se sigue detectando primero el contenido? | **Sí**, sin cambios desde CP5. |
| ¿Las fotos tienen roles distintos? | **Sí.** En Oferta: corte recortado sobre un halo en el navy, al lado del precio ("hace tangible la oportunidad"). En Combos: recuadro claro arriba, con los cortes en fila ("muestra el contenido"). |
| ¿El hero sigue siendo navy? | **Sí.** |
| ¿Es el mismo estilo, mejorado? | **Sí.** |

## 19. Regresión

HTML de `#app` idéntico entre CP5 y CP3 en **Directo**, **Combos**, **Catálogo** y **standard** (portada + Promos; el carrusel aleatorio de standard se excluye). Motor: 23/23.

## 20. Incidencias (solo registro)

1. **El carrito y WhatsApp siguen usando el nombre original del ítem**: "1 oferta Promo 2", "1 oferta 1 kg de Costeletas", sin rubro. El `cartItem` no se tocó por regla (no crear un segundo formato). Queda como candidato para CP6 (nombre + rubro en el pedido); requiere tu decisión, porque cambia el mensaje de WhatsApp.
2. En Oferta, "Lo más pedido" sigue igual. Es una corrección lateral de CP0, no incluida en CP3.
3. Los tiles "Elegí por rubro" siguen sin filtrar (lateral, CP0).
4. En el hero, con 3 cortes, el racimo de fotos queda algo apretado dentro del círculo. Es legible, pero es el punto visual más mejorable.
5. Las Promos del día QA vencen hoy 30/09 a las 23:59.

## 21. Diferencias respecto del plan

1. **CTA del hero en rojo `--sf-accent`**, no verde WhatsApp: ya no promete WhatsApp (corrección aprobada) y refuerza la identidad rojo/navy.
2. **Título "Más oportunidades"** en lugar de "Otras oportunidades de hoy" (GO §16: no afirmar "hoy" en general).
3. **Fila de Promos con foto principal + contador de cortes** en lugar de un mosaico: mantiene la lista escaneable y la diferencia de Directo y Combos.
4. Hero de 247 px en lugar de "hasta 340": entra más contenido en el primer viewport.

## 22. Estado Git

Esta sesión no puede ejecutar `git`. `public/web.html` quedó escrito y verificado byte a byte contra la versión probada. Esperado: ` M public/web.html`.

```powershell
cd C:\apppromos-qa
git status --short
git diff --check
node tools/qa/test-storefront-highlights.mjs
git add public/web.html
git commit -m "feat: mejorar Oferta primero QA-C01.1"
git log -1 --stat
```

## 23. Recomendación

**CP3 LISTO.** Oferta primero conserva su identidad navy y ahora muestra de inmediato qué oportunidad conviene: precio protagonista, ahorro solo cuando es demostrable, contenido comprensible con rubro, fotos reales y acción rápida. **Oferta vende la oportunidad; Combos vende la solución.** Falta solo tu commit local. CP4 no se inició.
