// QA-C01.1 CP1 — Pruebas del motor común de destacados.
// Ejecutar desde la raíz del repo:  node tools/qa/test-storefront-highlights.mjs
// Sin dependencias: usa node:test/node:assert y la biblioteca real de fotos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getProductThumbnailPath } from "../../public/js/services/product-image-service.js";
import {
  matchCatalogProduct, buildWhatYouGet, isInformativeLabel, resolveHighlightImages,
  computeReferencePrice, toHighlight, buildStorefrontHighlights
} from "../../public/js/services/storefront-highlights-service.js";

const data = JSON.parse(readFileSync(new URL("./fixtures/cp0-carniceria-qa.json", import.meta.url), "utf8"));
const products = data.publicProducts;
const offers = data.publicOffers;
const daily = data.dailyOffers;
const byName = (name) => offers.find((o) => o.name === name);
const COVER = "/assets/web-arranque/combo-covers/combo-default.webp";
const fns = {
  thumbFn: getProductThumbnailPath,
  coverFn: () => COVER,
  cartItemFn: (source, index, kind) => ({ stub: true, kind, index, name: source.name || source.nombre }),
  anchorFn: (source, index, kind) => ({ view: kind === "product" ? "products" : kind === "daily" ? "daily" : "promos", id: `${kind}-${index}` })
};
const ctx = (extra = {}) => ({ ...fns, products, allOfferNames: [...daily, ...offers].map((o) => o.name), ...extra });
const img = (rubro, slug) => `/assets/cortes/${rubro}/${slug}.webp`;

// 1. Producto normal
test("01 producto normal", () => {
  const p = products.find((x) => x.id === "cerdo_pechito");
  const h = toHighlight("product", p, ctx());
  assert.equal(h.kind, "product");
  assert.equal(h.title, "Pechito");
  assert.equal(h.price, 10000);
  assert.equal(h.priceUnit, "kg");
  assert.equal(h.image, img("cerdo", "pechito"));
  assert.equal(h.listPrice, null);
  assert.equal(h.savingPct, null);
});

// 2. Promo 1 producto (D1)
test("02 promo 1 producto — D1", () => {
  const h = toHighlight("promo", byName("Promo 1"), ctx());
  assert.equal(h.title, "3 kg de Asado Costilla");
  assert.equal(h.label, null, "'Promo 1' no es informativo");
  assert.equal(h.imageKind, "cut");
  assert.deepEqual(h.images, [img("novillo", "costilla")]);
  assert.equal(h.extraCount, 0);
});

// 3. Promo 2 productos (D2)
test("03 promo 2 productos — D2", () => {
  const h = toHighlight("promo", byName("Para la parrilla"), ctx());
  assert.equal(h.title, "1 kg Falda + 1 kg Nalga");
  assert.equal(h.label, "Para la parrilla");
  assert.equal(h.titleShort, null);
  assert.deepEqual(h.images, [img("novillo", "falda"), img("novillo", "nalga")]);
});

// 4. Promo 3 productos (D3) + orden
test("04 promo 3 productos — D3 conserva orden", () => {
  const h = toHighlight("promo", byName("Promo cerdo"), ctx());
  assert.deepEqual(h.lines.map((l) => l.name), ["Matambre", "Pechito", "Pulpas"]);
  assert.equal(h.images[0], img("cerdo", "matambre"), "principal = primer ítem cargado");
  assert.equal(h.titleShort, "1 kg Matambre + 2 cortes más");
  assert.equal(h.extraCount, 0);
});

// 5. Promo 4+ (D4)
test("05 promo 4+ — D4 Súper finde", () => {
  const h = toHighlight("promo", byName("Súper finde"), ctx());
  assert.deepEqual(h.lines, [
    { qty: 2, unit: "kg", name: "Asado Costilla", rubro: "Novillo" },
    { qty: 1, unit: "kg", name: "Alitas", rubro: "Pollo" },
    { qty: 1, unit: "kg", name: "Puchero", rubro: "Novillo" },
    { qty: 1, unit: "kg", name: "Falda", rubro: "Novillo" }
  ], "contenido completo, en orden");
  assert.equal(h.images.length, 3);
  assert.equal(h.images[0], img("novillo", "costilla"), "principal = Asado");
  assert.equal(h.extraCount, 1, "+1");
  assert.equal(h.title, "2 kg Asado Costilla + 1 kg Alitas + 1 kg Puchero + 1 corte más");
  assert.equal(h.titleShort, "2 kg Asado Costilla + 3 cortes más");
});

// 6. Promo del día (multiproducto D6 y de 1 producto)
test("06 Promo del día — D6 multiproducto y Costeletas cerdo", () => {
  const d6 = toHighlight("daily", daily.find((o) => o.items.length === 2), ctx());
  assert.equal(d6.kind, "daily");
  assert.equal(d6.isDaily, true);
  assert.equal(d6.title, "1 kg Pata y Muslo + 1 kg Pechuga con Hueso");
  assert.equal(d6.label, null, "'OFERTA DEL DÍA' es genérico");
  assert.deepEqual(d6.lines.map((l) => l.name), ["Pata y Muslo", "Pechuga con Hueso"]);
  assert.equal(d6.price, 13100);
  const pd = toHighlight("daily", daily.find((o) => o.items.length === 1), ctx());
  assert.equal(pd.title, "1 kg de Costeletas");
  assert.equal(pd.image, img("cerdo", "costeletas"));
});

// 7. Mismo nombre / distinto rubro — ASERCIÓN OBLIGATORIA
test("07 Costeletas Novillo NO resuelve como Costeletas Cerdo", () => {
  const nov = matchCatalogProduct({ nombre: "Costeletas", rubro: "Novillo" }, products);
  const cer = matchCatalogProduct({ nombre: "Costeletas", rubro: "Cerdo" }, products);
  assert.equal(nov.id, "novillo_costeletas");
  assert.equal(nov.precio, 16500);
  assert.equal(cer.id, "cerdo_costeletas");
  assert.notEqual(nov.id, cer.id);
  const d5 = toHighlight("promo", byName("Promo 2"), ctx());
  assert.equal(d5.listPrice, 33000, "2 × 16.500 (Novillo), nunca 2 × 8.000 (Cerdo)");
  assert.equal(d5.image, img("novillo", "costeleta"));
  assert.notEqual(d5.image, img("cerdo", "costeletas"));
  assert.equal(matchCatalogProduct({ nombre: "Costeletas" }, products), null, "sin rubro no cruza");
});

// 8. Preservación del orden (ítems invertidos => resultado invertido)
test("08 preserva el orden de carga", () => {
  const src = { name: "X", total: 1000, items: [...byName("Promo cerdo").items].reverse() };
  const h = toHighlight("promo", src, ctx());
  assert.deepEqual(h.lines.map((l) => l.name), ["Pulpas", "Pechito", "Matambre"]);
  assert.equal(h.images[0], img("cerdo", "pulpas"));
});

// 9 y 10. Máximo 3 imágenes y +N
test("09-10 máximo 3 imágenes y +N = productos adicionales", () => {
  const items = ["Costeletas", "Marucha", "Matambre", "Pechito", "Pulpas"].map((n) => ({ nombre: n, rubro: "Cerdo", cantidad: 1, unidad: "kg" }));
  const h = toHighlight("promo", { name: "Mix", total: 40000, items }, ctx());
  assert.equal(h.images.length, 3);
  assert.equal(new Set(h.images).size, 3, "sin duplicados");
  assert.equal(h.extraCount, 2);
  assert.equal(h.lines.length, 5, "contenido completo");
});

// 11. Referencia correcta
test("11 referencia correcta (precio catálogo × cantidad)", () => {
  assert.equal(toHighlight("promo", byName("Promo 1"), ctx()).listPrice, 57000);
  assert.equal(toHighlight("promo", byName("Para la parrilla"), ctx()).listPrice, 36000);
  assert.equal(toHighlight("promo", byName("Promo cerdo"), ctx()).listPrice, 34900);
  assert.equal(toHighlight("promo", byName("Súper finde"), ctx()).listPrice, 66000);
});

// 12. Ahorro efectivo contra precio final REAL (redondeado por el panel)
test("12 ahorro efectivo usa el precio final publicado", () => {
  const d3 = toHighlight("promo", byName("Promo cerdo"), ctx());
  assert.equal(d3.price, 31500, "no 31.410");
  assert.equal(d3.savingPct, Math.floor((34900 - 31500) / 34900 * 100)); // 9
  assert.equal(d3.savingPct, 9);
  const d4 = toHighlight("promo", byName("Súper finde"), ctx());
  assert.equal(d4.price, 59500);
  assert.equal(d4.savingPct, 9);
  const d1 = toHighlight("promo", byName("Promo 1"), ctx());
  assert.equal(d1.savingPct, 10);
  const pd = toHighlight("daily", daily.find((o) => o.items.length === 1), ctx());
  assert.equal(pd.listPrice, 8000);
  assert.equal(pd.savingPct, 20);
});

// 13. Ahorro < 5%
test("13 ahorro menor a 5% => sin referencia ni %", () => {
  const r = computeReferencePrice([{ nombre: "Pechito", rubro: "Cerdo", cantidad: 1, unidad: "kg" }], products, 9600); // 4%
  assert.deepEqual(r, { listPrice: null, savingPct: null });
  const r5 = computeReferencePrice([{ nombre: "Pechito", rubro: "Cerdo", cantidad: 1, unidad: "kg" }], products, 9500); // 5%
  assert.deepEqual(r5, { listPrice: 10000, savingPct: 5 });
  assert.deepEqual(computeReferencePrice([{ nombre: "Pechito", rubro: "Cerdo", cantidad: 1 }], products, 12000), { listPrice: null, savingPct: null }, "final mayor que referencia");
});

// 14–18. Casos no calculables (fixtures controlados)
const NONE = { listPrice: null, savingPct: null };
test("14 producto inexistente", () => {
  assert.deepEqual(computeReferencePrice([{ nombre: "Chorizo", rubro: "Cerdo", cantidad: 1, unidad: "kg" }], products, 5000), NONE);
});
test("15 nombre correcto + rubro incorrecto", () => {
  assert.equal(matchCatalogProduct({ nombre: "Alitas", rubro: "Novillo" }, products), null);
  assert.deepEqual(computeReferencePrice([{ nombre: "Alitas", rubro: "Novillo", cantidad: 1, unidad: "kg" }], products, 3000), NONE);
});
test("16 unidad incompatible", () => {
  assert.deepEqual(computeReferencePrice([{ nombre: "Alitas", rubro: "Pollo", cantidad: 1, unidad: "unidad" }], products, 3000), NONE);
});
test("17 precio inválido", () => {
  const bad = products.map((p) => p.id === "pollo_alitas" ? { ...p, precio: 0 } : p);
  assert.deepEqual(computeReferencePrice([{ nombre: "Alitas", rubro: "Pollo", cantidad: 1, unidad: "kg" }], bad, 3000), NONE);
  const nan = products.map((p) => p.id === "pollo_alitas" ? { ...p, precio: "abc" } : p);
  assert.deepEqual(computeReferencePrice([{ nombre: "Alitas", rubro: "Pollo", cantidad: 1, unidad: "kg" }], nan, 3000), NONE);
});
test("18 multiproducto con un ítem irresoluble => sin ahorro parcial", () => {
  const items = [...byName("Súper finde").items, { nombre: "Chorizo", rubro: "Elaborados", cantidad: 1, unidad: "unidad" }];
  const h = toHighlight("promo", { name: "Súper finde +", total: 59500, items }, ctx());
  assert.equal(h.listPrice, null);
  assert.equal(h.savingPct, null);
  assert.equal(h.lines.length, 5, "el contenido se conserva igual");
});

// 19. Ausencia de imagen
test("19 ausencia de imagen: fallback seguro", () => {
  const one = resolveHighlightImages([{ nombre: "Corte raro", rubro: "Novillo" }], products, { thumbFn: getProductThumbnailPath, coverFn: () => COVER });
  assert.equal(one.imageKind, "cover");
  assert.equal(one.image, COVER);
  const none = resolveHighlightImages([{ nombre: "Corte raro", rubro: "Novillo" }], products, { thumbFn: getProductThumbnailPath, coverFn: () => "" });
  assert.deepEqual(none, { image: null, images: [], extraCount: 0, imageKind: "none" });
  // 4 productos, solo 2 con foto: 2 imágenes, +2, contenido completo
  const items = [
    { nombre: "Asado Costilla", rubro: "Novillo" }, { nombre: "Corte raro", rubro: "Novillo" },
    { nombre: "Falda", rubro: "Novillo" }, { nombre: "Otro raro", rubro: "Cerdo" }
  ];
  const two = resolveHighlightImages(items, products, { thumbFn: getProductThumbnailPath, coverFn: () => COVER });
  assert.equal(two.imageKind, "cut");
  assert.deepEqual(two.images, [img("novillo", "costilla"), img("novillo", "falda")]);
  assert.equal(two.extraCount, 2);
  // multiproducto con 1 sola foto => portada
  const single = resolveHighlightImages(items.slice(0, 2), products, { thumbFn: getProductThumbnailPath, coverFn: () => COVER });
  assert.equal(single.imageKind, "cover");
  // producto sin foto no es candidato en el pool
  const pool = buildStorefrontHighlights({ products: [{ id: "x", nombre: "Corte raro", rubro: "Novillo", precio: 100 }], fns });
  assert.equal(pool.length, 0);
});

// 20. Orden estable de candidatos
test("20 orden estable de candidatos", () => {
  const run = () => buildStorefrontHighlights({ products, combos: offers, dailyOffers: daily, fns }).map((h) => h.key);
  const first = run();
  for (let i = 0; i < 10; i += 1) assert.deepEqual(run(), first);
  const pool = buildStorefrontHighlights({ products, combos: offers, dailyOffers: daily, fns });
  const kinds = pool.map((h) => h.kind);
  assert.deepEqual(kinds.slice(0, 2), ["daily", "daily"], "Promos del día primero, en orden publicado");
  assert.equal(pool[0].price, 13100);
  // promos de 1 ítem con ahorro, por % desc: D1 (10%) antes que D5
  const d1 = pool.findIndex((h) => h.title === "3 kg de Asado Costilla");
  const d5 = pool.findIndex((h) => h.title === "2 kg de Costeletas");
  assert.ok(d1 === 2 && d5 === 3, `D1 y D5 en posiciones 2 y 3 (fueron ${d1}, ${d5})`);
  // resto de promos en orden del carnicero
  assert.deepEqual(pool.slice(4, 7).map((h) => h.label), ["Súper finde", "Promo cerdo", "Para la parrilla"]);
  // productos alternando Novillo/Cerdo/Pollo
  const prodRubros = pool.filter((h) => h.kind === "product").slice(0, 3).map((h) => h.key.split("-")[1]);
  assert.deepEqual(prodRubros, ["novillo", "cerdo", "pollo"]);
  // starter: sin combos
  assert.ok(buildStorefrontHighlights({ products, combos: offers, dailyOffers: [], isStarter: true, fns }).every((h) => h.kind === "product"));
  // entryAnchor mueve ese destacado al frente
  const target = pool[5].anchor.id;
  const withAnchor = buildStorefrontHighlights({ products, combos: offers, dailyOffers: daily, entryAnchor: `#${target}`, fns });
  assert.equal(withAnchor[0].anchor.id, target);
});

// Extra: contrato y ausencia de HTML
test("21 contrato exacto del plan y sin HTML", () => {
  const KEYS = ["kind", "key", "title", "titleShort", "label", "lines", "price", "priceUnit", "listPrice", "savingPct", "image", "images", "extraCount", "imageKind", "isDaily", "cartItem", "anchor"].sort();
  const pool = buildStorefrontHighlights({ products, combos: offers, dailyOffers: daily, fns });
  for (const h of pool) assert.deepEqual(Object.keys(h).sort(), KEYS);
  const src = readFileSync(new URL("../../public/js/services/storefront-highlights-service.js", import.meta.url), "utf8");
  assert.ok(!/<[a-z][^>]*>/i.test(src.replace(/\/\/.*$/gm, "")), "el motor no contiene markup");
  assert.ok(!/document\.|innerHTML|querySelector/.test(src), "el motor no toca el DOM");
});

test("22 isInformativeLabel", () => {
  for (const n of ["Promo 1", "Promo 2", "Combo A", "OFERTA DEL DÍA", "oferta", "Promo del día 3"]) assert.equal(isInformativeLabel(n, [n]), false, n);
  for (const n of ["Para la parrilla", "Súper finde", "Promo cerdo"]) assert.equal(isInformativeLabel(n, [n]), true, n);
  assert.equal(isInformativeLabel("Finde", ["Finde", "finde"]), false, "repetido");
});

test("23 buildWhatYouGet con decimales", () => {
  assert.equal(buildWhatYouGet([{ nombre: "Vacío", cantidad: 1.5, unidad: "kilos" }]).title, "1,5 kg de Vacío");
});

// CP5 — rubro visible por línea (requisito transversal de identificación)
test("24 lines[] incluye el rubro de cada corte (Costeletas Novillo ≠ Cerdo)", () => {
  const d5 = toHighlight("promo", byName("Promo 2"), ctx());
  assert.deepEqual(d5.lines, [{ qty: 2, unit: "kg", name: "Costeletas", rubro: "Novillo" }]);
  const pd = toHighlight("daily", daily.find((o) => o.items.length === 1), ctx());
  assert.deepEqual(pd.lines, [{ qty: 1, unit: "kg", name: "Costeletas", rubro: "Cerdo" }]);
  assert.notEqual(d5.lines[0].rubro, pd.lines[0].rubro);
  const prod = toHighlight("product", products.find((x) => x.id === "pollo_alitas"), ctx());
  assert.equal(prod.lines[0].rubro, "Pollo");
  assert.equal(buildWhatYouGet([{ nombre: "Vacío", cantidad: 1 }]).lines[0].rubro, null, "sin rubro => null, no se inventa");
});

// ---------------------------------------------------------------------------
// CP4 — selección de vitrina (selectShowcase)
// ---------------------------------------------------------------------------
import { selectShowcase, SHOWCASE_MAX } from "../../public/js/services/storefront-highlights-service.js";
const fullPool = () => buildStorefrontHighlights({ products, combos: offers, dailyOffers: daily, fns });

test("25 vitrina: prioriza ofertas limpias y completa con productos (máx 8)", () => {
  const v = selectShowcase(fullPool());
  assert.equal(v.length, SHOWCASE_MAX);
  const kinds = v.map((h) => h.kind);
  const firstProduct = kinds.indexOf("product");
  assert.ok(firstProduct > 0 && kinds.slice(firstProduct).every((k) => k === "product"), "ofertas primero, productos después");
  assert.deepEqual(v.slice(0, 2).map((h) => h.kind), ["daily", "daily"]);
});

test("26 vitrina: excluye 3+ cortes y deja 2 cortes solo con 2 fotos", () => {
  const v = selectShowcase(fullPool());
  assert.ok(v.every((h) => h.lines.length <= 2), "nada de 3+ cortes");
  assert.ok(!v.some((h) => h.label === "Súper finde" || h.label === "Promo cerdo"));
  for (const h of v.filter((x) => x.lines.length === 2)) assert.ok(h.images.length >= 2);
});

test("27 vitrina: sin promos funciona solo con productos", () => {
  const v = selectShowcase(buildStorefrontHighlights({ products, combos: [], dailyOffers: [], fns }));
  assert.equal(v.length, SHOWCASE_MAX);
  assert.ok(v.every((h) => h.kind === "product" && h.image));
});

test("28 vitrina: menos de 4 candidatos => [] (sin relleno)", () => {
  const few = products.filter((p) => p.rubro === "Pollo"); // 3 productos
  assert.deepEqual(selectShowcase(buildStorefrontHighlights({ products: few, fns })), []);
  assert.equal(selectShowcase(buildStorefrontHighlights({ products: few, fns }), { min: 3 }).length, 3, "min configurable para otros estilos");
});

test("29 vitrina: orden estable, sin duplicados, sin productos repetidos como promo", () => {
  const a = selectShowcase(fullPool()).map((h) => h.key);
  for (let i = 0; i < 5; i += 1) assert.deepEqual(selectShowcase(fullPool()).map((h) => h.key), a);
  assert.equal(new Set(a).size, a.length);
  const v = selectShowcase(fullPool());
  const promoCuts = v.filter((h) => h.kind !== "product" && h.lines.length === 1).map((h) => `${h.lines[0].rubro}|${h.lines[0].name}`);
  for (const h of v.filter((x) => x.kind === "product")) assert.ok(!promoCuts.includes(`${h.lines[0].rubro}|${h.lines[0].name}`), h.title);
});

test("30 vitrina: rubro presente y Costeletas Novillo ≠ Cerdo", () => {
  const v = selectShowcase(fullPool(), { max: 20 });
  assert.ok(v.every((h) => h.lines[0].rubro));
  const nov = v.find((h) => h.lines[0].name === "Costeletas" && h.lines[0].rubro === "Novillo");
  const cer = v.find((h) => h.lines[0].name === "Costeletas" && h.lines[0].rubro === "Cerdo");
  assert.ok(nov && cer);
  assert.notEqual(nov.image, cer.image);
});

test("31 vitrina: sin foto no entra", () => {
  const noPhoto = [{ id: "a", nombre: "Corte raro", rubro: "Novillo", precio: 1 }, { id: "b", nombre: "Otro raro", rubro: "Cerdo", precio: 1 }];
  assert.deepEqual(selectShowcase(buildStorefrontHighlights({ products: [...noPhoto, ...products.slice(0, 2)], fns })), []);
  const offer = { name: "X", total: 100, items: [{ nombre: "Corte raro", rubro: "Novillo", cantidad: 1, unidad: "kg" }] };
  const pool = buildStorefrontHighlights({ products, combos: [offer], dailyOffers: [], fns });
  assert.ok(!selectShowcase(pool).some((h) => h.kind === "promo"), "promo con portada genérica no entra");
});
