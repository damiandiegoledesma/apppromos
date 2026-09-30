# QA-C01.1 — CP0: datos QA + baseline visual "ANTES"

**Fecha:** 29/09/2026 23:48 – 30/09/2026 00:30 (ART) · **Versión final (incluye D4)** · **Entorno:** QA (`apppromos-qa`, `https://apppromos-qa.web.app`) · **Comercio:** Carnicería QA (`carniceria-qa-3415-555666`)
**Sin código, sin commit, push ni deploy, sin tocar producción. CP1 no se inició.**

## A. Inventario cargado

Carga hecha desde el panel QA, con la sesión ya abierta de Carnicería QA, siguiendo el flujo normal:
- D1, D2, D3 y D5: *Vender → Crear promo o combo → Productos → Descuentos → Vender → Guardar* y después *Promos → Publicar*.
- D6: *Vender → Promo del día (Carniza) → productos → Armar → Publicar por hoy*.

Estado previo verificado: **0 promos guardadas**, 1 Promo del día activa ("1 kg de Costeletas" cerdo, $6.400, publicada 18:46).

| ID | Nombre | Ítems (orden de carga) | Rubro | Cant. | Unidad | Lista | Desc. | Precio final | Estado |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Promo 1 | 1. Asado Costilla | Novillo | 3 | kg | $57.000 | 10% | **$51.300** | Guardada + publicada |
| D2 | Para la parrilla | 1. Falda · 2. Nalga | Novillo · Novillo | 1 · 1 | kg | $36.000 | 10% c/u | **$32.400** | Guardada + publicada |
| D3 | Promo cerdo | 1. Matambre · 2. Pechito · 3. Pulpas | Cerdo ×3 | 1 · 1 · 1 | kg | $34.900 | 10% c/u | **$31.500** | Guardada + publicada |
| D4 | Súper finde | 1. Asado Costilla · 2. Alitas · 3. Puchero · 4. Falda | Novillo · Pollo · Novillo · Novillo | 2 · 1 · 1 · 1 | kg | $66.000 | 10% c/u | **$59.500** | Guardada + publicada (30/09 00:16) |
| D5 | Promo 2 | 1. Costeletas | **Novillo** | 2 | kg | $33.000 | 10% | **$29.800** | Guardada + publicada |
| D6 | OFERTA DEL DÍA (nombre por defecto) | 1. Pata y Muslo · 2. Pechuga con Hueso | Pollo · Pollo | 1 · 1 | kg | $16.400 | 20% (default de Carniza) | **$13.100** | Publicada 29/09; **re-publicada 30/09** (vence 30/09 23:59) |
| PD | Promo del día "existente" | Costeletas | Cerdo | 1 | kg | $8.000 | 20% | $6.400 | Venció 29/09 23:59; **re-publicada igual el 30/09** (vence 30/09 23:59) |

En la web pública, D6 aparece como **"Pata y Muslo y Pechuga con Hueso"**, porque `dailyOfferDisplayName` reemplaza el nombre genérico.

## B. Diferencias respecto del plan

1. **D4, primer intento detenido y luego resuelto.** El creador de promos **solo permite productos del catálogo publicado**: al buscar "Chorizo" responde "No encontré productos con ese filtro". Tampoco ofrece elegir unidad (todo en kg, pasos de 0,5). No se puede cargar un ítem sin producto ni en unidades. **Por instrucción del brief no se cargó ningún sustituto.** Efecto: quedan **sin ejercitar** "promo de 4 o más productos" y "ahorro no calculable". *(Hallazgo para CP1: por el panel, todo ítem cruza con el catálogo; el caso "no calculable" solo aparecería si el carnicero cambia o borra un producto después de crear la promo, o con precios desactualizados.)* **Resolución (autorizada 30/09 00:15):** D4 se cargó con 4 productos reales del catálogo (tabla A). Queda ejercitado "4 o más productos". **"Ahorro no calculable" queda sin ejercitar en datos QA** y se cubre con casos de prueba en CP1.
2. **Descuento, precisión del plan.** El plan no fijaba precios. Usé **10% por producto** en D1–D5 (la convención del propio preview de Carnis) y el **20% por defecto** de Carniza en D6. Todos quedan por encima del umbral del 5%.
3. **Promos del día efímeras (y se filtran al publicar).** Al publicar D4 (00:16 del 30/09) la vidriera pública se regeneró y **las dos Promos del día vencidas quedaron afuera de los datos publicados**: el vencimiento se filtra al generar el snapshot (`web-premium-service.js`), no solo al mostrar. Por eso se **re-publicaron las mismas dos Promos del día** el 30/09 (mismos productos, mismo 20%, mismo orden) y el baseline final se capturó con la hora real. D6 y la Promo del día existente **vencen a las 23:59 del día de publicación**. El baseline se tomó a las 23:57 (texto, desde el navegador del panel) y con reloj fijado en 23:57 para las capturas (ver C). Después de la medianoche, la web pública muestra solo D1, D2, D3 y D5. **Consecuencia:** en cada checkpoint con UI hay que **re-publicar la Promo del día ese mismo día** (o capturar con el reloj fijado) para comparar contra este baseline.
4. **"Mantener la Promo del día existente":** no depende de nosotros; vence sola hoy (publicada 18:46).

## C. Evidencia visual (archivos en esta carpeta)

**Baseline oficial = esta carpeta (versión final, 30/09 ~00:25, hora real, 7 soluciones: D1–D6 + la Promo del día).** Capturas a **390×844, DPR 2, perfil mobile**, con Chromium headless desde el entorno de trabajo. La versión anterior, sin D4 (reloj fijado a 29/09 23:57), queda en `v1-sin-D4/` solo como histórico. Los datos son reales de Firestore QA; el único parámetro es `themePreview` + `previewView`, que no persisten nada.

| Vista | Pantalla (390×844) | Página completa |
|---|---|---|
| Directo — portada | `directo_al_grano__home.png` | `…__home__full.png` |
| Directo — Promos | `directo_al_grano__promos.png` | `…__promos__full.png` |
| Oferta primero — portada | `oferta_primero__home.png` | idem |
| Oferta primero — Promos | `oferta_primero__promos.png` | idem |
| Catálogo — portada | `catalogo_vidriera__home.png` | idem |
| Catálogo — Promos | `catalogo_vidriera__promos.png` | idem |
| Combos — portada | `combos_pedido_directo__home.png` | idem |
| Combos — Promos | `combos_pedido_directo__promos.png` | idem |
| **4-up portadas** | `4up__home.png` | — |
| **4-up Promos** | `4up__promos.png` | — |

Contraprueba en texto a las 23:57 reales (navegador del panel): contenido idéntico al de las capturas.

## D. Reversión (volver al estado previo a CP0)

| Qué | Cómo |
|---|---|
| D1, D2, D3, D4, D5 | Panel → Promos → **Despublicar** en cada una → **Archivar** (o borrar, si se quiere eliminar del todo) |
| D6 y PD | Vencen solas a las 23:59 del 30/09. Si hiciera falta antes: Carniza → Publicadas hoy → **Finalizar** |
| Promo del día existente | No se modificó |
| Catálogo, precios, estilo, datos del comercio | **No se modificaron** |

Estado previo = 0 promos guardadas + 1 Promo del día (que igual vencía hoy).

## E. Escenarios secundarios (reproducibilidad comprobada)

| Escenario | Cómo reproducirlo | Comprobado |
|---|---|---|
| 3 o más soluciones | D1–D5 publicadas (+ Promo del día del día) → 4–6 soluciones | ✅ baseline |
| 1–2 | Despublicar D2, D3, D4 y D5 (queda D1 + la Promo del día si se publica) | ✅ el botón Publicar/Despublicar existe y funciona |
| 0 | Despublicar D1–D5 y no publicar la Promo del día (o Finalizarla) | ✅ mismo mecanismo |
| Catálogo con menos de 4 candidatos | Carnicería Don José `carniceria-don-jose-3462-149693` (3 productos) con `themePreview=catalogo_vidriera` | ✅ el slug responde, 3 productos (verificado en QA-C01) |

## F. Incidencias observadas (solo hechos; no se corrigieron)

**Web pública (baseline):**
1. **Oferta primero, "Otros combos":** "Promo 2 · 1 producto · $29.800", "Promo 1 · 1 producto · $51.300", sin foto ni contenido. Es el caso "Promo 2 — $30.000" del brief.
2. **Oferta primero, hero:** bloque navy vacío en la mitad superior; botón "Pedir por WhatsApp".
3. **Combos:** badge **"Más pedido"** sobre "Promo 2" (el primer combo por orden, no por ventas). Todas las tarjetas tienen el thumb rosa vacío.
4. **Catálogo, Promos:** 6 tiles con el emoji 🏷️; los títulos son "Promo 1", "Promo 2", "Promo cerdo". En "Promo 1" solo se lee "3 kg" y el precio, no qué corte es.
5. **Catálogo, portada:** no muestra ninguna promo ni Promo del día.
6. **Directo, cinta:** muestra solo la **primera** Promo del día (D6); la de Costeletas no aparece en la portada.
7. **"Promo 2 · 2 kg · Costeletas"** en la web **no dice que es Novillo**. El cliente no puede distinguirla de la Costeleta de cerdo (la de $6.400).
8. **Chips de Promos:** "Filtrar por kilos: Todas / 2 Kgs / 3 Kgs". Mezclan el total de kg con categorías.

**Panel (otro frente, solo registro):**
9. En el mensaje de WhatsApp de D5, la línea es "🐖 2 kg Costeletas — Novillo": **emoji de cerdo para un corte de novillo** (probablemente se resuelve el ícono por nombre sin rubro).
10. **Redondeo del total:** D3 $34.900 − 10% = $31.410 → se muestra **$31.500**; D5 $33.000 − 10% = $29.700 → **$29.800**. Parece redondeo hacia arriba a la centena. Es relevante para el cálculo de ahorro de CP1: el % real queda un poco por debajo del nominal.
11. Al quedar **solo promos regulares** (sin Promo del día vigente; captura intermedia de las 00:20), el hero de Oferta primero rotuló **"OFERTA DE HOY"** a "Súper finde", que no es una Promo del día. Directo la rotuló "PROMO" (correcto).
12. El badge **"Más pedido"** de Combos pasa al combo más reciente (hoy "Súper finde"): confirma que depende del orden, no de ventas.
13. D4: $66.000 − 10% = $59.400 → se muestra **$59.500** (mismo redondeo que la 10).
14. Chips de Promos ahora: "Todas / 2 Kgs / 3 Kgs / 5 Kgs".
15. Carniza informa "No se guardó en Promos" para la Promo del día: es coherente con el diseño, se registra solo como contexto.

---

**CP0 LISTO.** D1–D6 + Promo del día cargadas, documentadas y capturadas con exactamente los mismos datos en los 4 estilos. Única cobertura pendiente: "ahorro no calculable" (no reproducible desde el panel), que se cubre con pruebas en CP1. **CP1 no se inició.**

**Atención para los próximos checkpoints:** las Promos del día de este baseline vencen el **30/09 a las 23:59**. Para comparar el antes y el después en otro día, hay que re-publicarlas (Costeletas cerdo 1 kg 20%, y después Pata y Muslo + Pechuga 1 kg c/u 20%).
