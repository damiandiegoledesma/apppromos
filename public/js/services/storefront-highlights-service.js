// QA-C01.1 CP1 — Motor común de destacados de la vidriera pública.
//
// Responsabilidad: convertir productos, promos/combos y Promos del día
// publicados en objetos de DATOS ("Highlight") reutilizables por los cuatro
// estilos. Este módulo NO produce HTML, tarjetas, CSS ni decide layouts:
// cada engineHome*Html() de web.html elige qué campos usa y cómo los dibuja.
//
// Contrato Highlight (QA-C01.1-plan-implementacion.md §4):
//   kind        "daily" | "promo" | "product"
//   key         string estable
//   title       qué me llevo (a partir de items) | nombre del producto
//   titleShort  resumen "2 kg Costilla + 2 cortes más" (solo 3+ ítems) | null
//   label       nombre comercial informativo | null
//   lines[]     [{qty, unit, name}] lista completa, en el orden cargado
//   price       precio final REAL publicado
//   priceUnit   "kg" (producto) | null
//   listPrice   precio de referencia | null (regla conservadora 1.1)
//   savingPct   entero | null (solo si >= 5%)
//   image       URL principal | null
//   images[]    hasta 3 URLs de cortes, en el orden cargado (decisión C)
//   extraCount  N de "+N": ítems sin foto mostrada en images[]
//   imageKind   "cut" | "cover" | "none"
//   isDaily     bool
//   cartItem    objeto que ya consume data-cart-add (lo arma web.html)
//   anchor      {view, id}
//
// Las funciones que dependen de web.html (miniaturas, portadas, total,
// cartItem, anclas) se inyectan: el motor no duplica el modelo del carrito.

export const MIN_SAVING_PCT = 5;
export const MAX_HIGHLIGHT_IMAGES = 3;
const MAIN_PRODUCT_RUBROS = ["novillo", "cerdo", "pollo"];

const GENERIC_NAMES = new Set([
  "oferta", "promo", "combo", "oferta-del-dia", "promo-del-dia",
  "oferta-de-hoy", "promo-de-hoy", "vender-urgente", "combo-del-dia"
]);
const NUMBERED_GENERIC = /^(promo|oferta|combo)(-(del-dia|de-hoy))?(-([0-9]+|[a-z]))?$/;

export function normalizeKey(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeUnit(value = "") {
  const clean = normalizeKey(value || "kg");
  if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos)$/.test(clean)) return "kg";
  if (/^(u|un|unid|unidad|unidades)$/.test(clean)) return "unidad";
  return clean || "kg";
}

function itemName(item = {}) {
  return String(item.nombre ?? item.name ?? "").trim();
}

function itemRubro(item = {}) {
  return String(item.rubro ?? item.category ?? item.categoria ?? "").trim();
}

function itemQty(item = {}) {
  return Number(item.cantidad ?? item.quantity ?? item.qty ?? 1);
}

function itemUnit(item = {}) {
  return normalizeUnit(item.unidad ?? item.unit ?? "kg");
}

function productPrice(product = {}) {
  return Number(product.precio ?? product.price ?? 0);
}

function defaultTotal(source = {}) {
  return Number(
    source.total ||
    source.finalTotal ||
    source?.snapshot?.totals?.total_redondeado ||
    source?.snapshot?.totals?.total ||
    0
  );
}

// ---------------------------------------------------------------------------
// Cruce ítem → producto del catálogo publicado.
// Regla: SIEMPRE nombre + rubro. Nunca solo nombre. Un id solo se acepta si
// además coincide el rubro. Ambigüedad (más de un candidato) => null.
// ---------------------------------------------------------------------------
export function matchCatalogProduct(item = {}, products = []) {
  const name = normalizeKey(itemName(item));
  const rubro = normalizeKey(itemRubro(item));
  if (!name || !rubro) return null;

  const sameRubro = products.filter((product) =>
    normalizeKey(product.rubro ?? product.category ?? product.categoria ?? "") === rubro
  );

  const itemId = String(item.productId ?? item.productoId ?? item.catalogProductId ?? "").trim();
  if (itemId) {
    const byId = sameRubro.filter((product) =>
      [product.id, product.productId, product.productoId]
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
        .map((value) => String(value).trim())
        .includes(itemId)
    );
    if (byId.length === 1) return byId[0];
  }

  const byName = sameRubro.filter((product) =>
    normalizeKey(product.nombre ?? product.name ?? "") === name
  );
  return byName.length === 1 ? byName[0] : null;
}

// ---------------------------------------------------------------------------
// "¿Qué me llevo?"
// ---------------------------------------------------------------------------
function formatQty(qty) {
  const safe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  return safe.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function lineText(line) {
  return `${formatQty(line.qty)} ${line.unit} ${line.name}`;
}

export function buildWhatYouGet(items = []) {
  const lines = (Array.isArray(items) ? items : [])
    .filter((item) => itemName(item))
    .map((item) => ({ qty: itemQty(item), unit: itemUnit(item), name: itemName(item) }));

  if (!lines.length) return { title: "", titleShort: null, lines };

  if (lines.length === 1) {
    const [line] = lines;
    return { title: `${formatQty(line.qty)} ${line.unit} de ${line.name}`, titleShort: null, lines };
  }

  const visible = lines.slice(0, 3).map(lineText).join(" + ");
  const rest = lines.length - 3;
  const title = rest > 0 ? `${visible} + ${rest} ${rest === 1 ? "corte" : "cortes"} más` : visible;

  let titleShort = null;
  if (lines.length >= 3) {
    const others = lines.length - 1;
    titleShort = `${lineText(lines[0])} + ${others} cortes más`;
  }
  return { title, titleShort, lines };
}

// ---------------------------------------------------------------------------
// Nombre comercial: solo si aporta información.
// ---------------------------------------------------------------------------
export function isInformativeLabel(name = "", allNames = []) {
  const key = normalizeKey(name);
  if (!key) return false;
  if (GENERIC_NAMES.has(key)) return false;
  if (NUMBERED_GENERIC.test(key)) return false;
  const repeated = allNames.filter((other) => normalizeKey(other) === key).length;
  return repeated <= 1;
}

// ---------------------------------------------------------------------------
// Imágenes (decisión C: orden de carga; máximo 3; sin duplicados).
// ---------------------------------------------------------------------------
function resolveItemImage(item, products, thumbFn) {
  const product = matchCatalogProduct(item, products);
  const fromCatalog = product ? String(thumbFn(product) || "") : "";
  if (fromCatalog) return fromCatalog;
  if (!itemName(item) || !itemRubro(item)) return "";
  return String(thumbFn({ nombre: itemName(item), rubro: itemRubro(item) }) || "");
}

export function resolveHighlightImages(items = [], products = [], { thumbFn, coverFn, source = {} } = {}) {
  const list = (Array.isArray(items) ? items : []).filter((item) => itemName(item));
  const cuts = [];
  for (const item of list) {
    const url = resolveItemImage(item, products, thumbFn);
    if (url && !cuts.includes(url)) cuts.push(url);
  }

  // Un solo producto: su foto. Varios: composición con al menos 2 cortes.
  const enoughCuts = list.length === 1 ? cuts.length >= 1 : cuts.length >= 2;
  if (enoughCuts) {
    const images = cuts.slice(0, MAX_HIGHLIGHT_IMAGES);
    return {
      image: images[0],
      images,
      extraCount: Math.max(0, list.length - images.length),
      imageKind: "cut"
    };
  }

  const cover = typeof coverFn === "function" ? String(coverFn(source) || "") : "";
  if (cover) return { image: cover, images: [], extraCount: 0, imageKind: "cover" };
  return { image: null, images: [], extraCount: 0, imageKind: "none" };
}

// ---------------------------------------------------------------------------
// Precio de referencia y ahorro (todo o nada; contra precio final REAL).
// ---------------------------------------------------------------------------
export function computeReferencePrice(items = [], products = [], finalPrice = 0) {
  const none = { listPrice: null, savingPct: null };
  const list = Array.isArray(items) ? items : [];
  const final = Number(finalPrice);
  if (!list.length || !Number.isFinite(final) || final <= 0) return none;

  let reference = 0;
  for (const item of list) {
    const product = matchCatalogProduct(item, products);
    if (!product) return none;
    const price = productPrice(product);
    const qty = itemQty(item);
    if (!Number.isFinite(price) || price <= 0) return none;
    if (!Number.isFinite(qty) || qty <= 0) return none;
    if (itemUnit(item) !== normalizeUnit(product.unidad ?? product.unit ?? "kg")) return none;
    reference += price * qty;
  }

  reference = Math.round(reference);
  if (!(reference > final)) return none;
  const savingPct = Math.floor(((reference - final) / reference) * 100);
  if (savingPct < MIN_SAVING_PCT) return none;
  return { listPrice: reference, savingPct };
}

// ---------------------------------------------------------------------------
// Armado de un destacado.
// ---------------------------------------------------------------------------
export function toHighlight(kind, source = {}, ctx = {}) {
  const {
    products = [], index = 0, allOfferNames = [],
    thumbFn = () => "", coverFn = () => "", totalFn = defaultTotal,
    cartItemFn = () => null, anchorFn = () => null, idFn = null
  } = ctx;

  if (kind === "product") {
    const image = String(thumbFn(source) || "") || null;
    const id = String(source.id ?? source.productId ?? source.nombre ?? index);
    return {
      kind,
      key: `product-${normalizeKey(`${source.rubro || ""}-${id}`)}`,
      title: String(source.nombre ?? source.name ?? "Producto"),
      titleShort: null,
      label: null,
      lines: [{ qty: 1, unit: normalizeUnit(source.unidad ?? source.unit ?? "kg"), name: String(source.nombre ?? source.name ?? "Producto") }],
      price: productPrice(source),
      priceUnit: normalizeUnit(source.unidad ?? source.unit ?? "kg"),
      listPrice: null,
      savingPct: null,
      image,
      images: image ? [image] : [],
      extraCount: 0,
      imageKind: image ? "cut" : "none",
      isDaily: false,
      cartItem: cartItemFn(source, index, kind),
      anchor: anchorFn(source, index, kind)
    };
  }

  const isDaily = kind === "daily";
  const items = Array.isArray(source.items) ? source.items : [];
  const { title, titleShort, lines } = buildWhatYouGet(items);
  const rawName = String(source.name ?? source.nombre ?? "").trim();
  const price = Number(totalFn(source)) || 0;
  const id = idFn ? idFn(source, index) : (source.id ?? source.comboId ?? rawName ?? index);

  return {
    kind,
    key: `${isDaily ? "daily" : "promo"}-${normalizeKey(String(id))}`,
    title,
    titleShort,
    label: isInformativeLabel(rawName, allOfferNames) ? rawName : null,
    lines,
    price,
    priceUnit: null,
    ...computeReferencePrice(items, products, price),
    ...resolveHighlightImages(items, products, { thumbFn, coverFn, source }),
    isDaily,
    cartItem: cartItemFn(source, index, kind),
    anchor: anchorFn(source, index, kind)
  };
}

// ---------------------------------------------------------------------------
// Pool ordenado (sin aleatoriedad, sin popularidad):
//   1. Promos del día, en el orden publicado
//   2. Promos de 1 ítem con ahorro, por % desc (estable)
//   3. Resto de promos/combos, en el orden del carnicero
//   4. Productos con foto, rubros Novillo/Cerdo/Pollo alternados, estable
// Si entryAnchor coincide con un destacado, ese va primero.
// ---------------------------------------------------------------------------
export function buildStorefrontHighlights(input = {}) {
  const {
    products = [], combos = [], dailyOffers = [], isStarter = false,
    entryAnchor = "", fns = {}
  } = input;

  const offers = isStarter ? [] : (Array.isArray(combos) ? combos : []);
  const daily = Array.isArray(dailyOffers) ? dailyOffers : [];
  const allOfferNames = [...daily, ...offers].map((o) => String(o?.name ?? o?.nombre ?? ""));
  const base = { ...fns, products, allOfferNames };

  const dailyHighlights = daily.map((offer, index) =>
    toHighlight("daily", offer, { ...base, index, idFn: fns.dailyIdFn || null })
  );

  const promoHighlights = offers.map((combo, index) => toHighlight("promo", combo, { ...base, index }));
  const singleWithSaving = promoHighlights
    .map((highlight, position) => ({ highlight, position }))
    .filter(({ highlight }) => highlight.lines.length === 1 && highlight.savingPct !== null)
    .sort((a, b) => (b.highlight.savingPct - a.highlight.savingPct) || (a.position - b.position))
    .map(({ highlight }) => highlight);
  const restPromos = promoHighlights.filter((highlight) => !singleWithSaving.includes(highlight));

  const byRubro = MAIN_PRODUCT_RUBROS.map((rubro) =>
    products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => normalizeKey(product.rubro ?? "") === rubro)
      .map(({ product, index }) => toHighlight("product", product, { ...base, index }))
      .filter((highlight) => highlight.image)
  );
  const productHighlights = [];
  for (let round = 0; byRubro.some((list) => list.length > round); round += 1) {
    byRubro.forEach((list) => { if (list[round]) productHighlights.push(list[round]); });
  }

  const pool = [...dailyHighlights, ...singleWithSaving, ...restPromos, ...productHighlights];

  const anchorId = String(entryAnchor || "").replace(/^#/, "");
  if (anchorId) {
    const position = pool.findIndex((highlight) => highlight.anchor && highlight.anchor.id === anchorId);
    if (position > 0) pool.unshift(...pool.splice(position, 1));
  }
  return pool;
}
