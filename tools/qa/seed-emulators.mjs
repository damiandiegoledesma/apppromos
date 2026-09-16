const PROJECT_ID = "apppromos";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = "http://127.0.0.1:8080";
const PASSWORD = "AppPromosQA27!";

const now = new Date();
const iso = (d = now) => d.toISOString();
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();

const scenarios = [
  { key: "05", email: "qa-05@apppromos.test", name: "Carnicería QA 05 Precios", prices: 5, share: 0, created: 0, published: 0, daily: 0, expected: "completar vidriera" },
  { key: "12", email: "qa-12@apppromos.test", name: "Carnicería QA 12 Activada", prices: 12, share: 1, created: 0, published: 0, daily: 0, expected: "completar catálogo" },
  { key: "15", email: "qa-15@apppromos.test", name: "Carnicería QA 15 Primera Promo", prices: 15, share: 1, created: 0, published: 0, daily: 0, expected: "crear primera promo" },
  { key: "promo", email: "qa-promo@apppromos.test", name: "Carnicería QA Promo Creada", prices: 15, share: 1, created: 1, published: 0, daily: 0, combo: true, expected: "publicar promo" },
  { key: "publicada", email: "qa-publicada@apppromos.test", name: "Carnicería QA Promo Publicada", prices: 15, share: 1, created: 1, published: 1, daily: 0, combo: true, selected: true, expected: "Promo del día" },
  { key: "completa", email: "qa-completa@apppromos.test", name: "Carnicería QA Completa", prices: 15, share: 1, created: 1, published: 1, daily: 1, combo: true, selected: true, themePromptSeen: true, expected: "activa" },
  { key: "reactivacion", email: "qa-reactivacion@apppromos.test", name: "Carnicería QA Reactivación", prices: 15, share: 1, created: 1, published: 1, daily: 1, combo: true, selected: true, themePromptSeen: true, inactiveDays: 8, expected: "reactivación" }
];

function fv(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fv) } };
  if (typeof value === "object") {
    const fields = {};
    for (const [key, entry] of Object.entries(value)) if (entry !== undefined) fields[key] = fv(entry);
    return { mapValue: { fields } };
  }
  throw new Error(`Tipo no soportado: ${typeof value}`);
}

function docBody(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) if (value !== undefined) fields[key] = fv(value);
  return { fields };
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function assertEmulators() {
  for (const [name, url] of [["Auth", AUTH], ["Firestore", FIRESTORE]]) {
    try { await fetch(url); }
    catch { throw new Error(`${name} Emulator no responde en ${url}. Ejecutá firebase emulators:start primero.`); }
  }
}

async function ensureAuth(email) {
  try {
    const created = await jsonFetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=qa-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
    });
    return created.localId;
  } catch (error) {
    if (!String(error.message).includes("EMAIL_EXISTS")) throw error;
    const signed = await jsonFetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=qa-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
    });
    return signed.localId;
  }
}

function firestoreUrl(path) {
  return `${FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

async function putDoc(path, data) {
  return jsonFetch(firestoreUrl(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer owner"
    },
    body: JSON.stringify(docBody(data))
  });
}

async function getDoc(path) {
  return jsonFetch(firestoreUrl(path), {
    headers: { "Authorization": "Bearer owner" }
  });
}

function readNumber(field) {
  if (!field || typeof field !== "object") return 0;
  return Number(field.integerValue ?? field.doubleValue ?? 0);
}

function products(count) {
  // Catálogo comercial para QA: una vidriera creíble de 15 precios, con
  // imágenes reales y dos rubros para revisar la navegación y los temas.
  const catalog = [
    ["novillo_asado_costilla", "Asado", "Novillo"],
    ["novillo_vacio", "Vacío", "Novillo"],
    ["novillo_matambre", "Matambre", "Novillo"],
    ["novillo_tapa_de_asado", "Tapa de asado", "Novillo"],
    ["novillo_aguja_comun", "Aguja", "Novillo"],
    ["novillo_marucha", "Marucha", "Novillo"],
    ["novillo_roast_beef", "Roast beef", "Novillo"],
    ["novillo_bola_de_lomo", "Bola de lomo", "Novillo"],
    ["cerdo_bondiola", "Bondiola", "Cerdo"],
    ["cerdo_costeletas", "Costeletas", "Cerdo"],
    ["cerdo_pechito", "Pechito", "Cerdo"],
    ["cerdo_matambre", "Matambre", "Cerdo"],
    ["cerdo_huesitos", "Huesitos", "Cerdo"],
    ["cerdo_pulpas", "Pulpa", "Cerdo"],
    ["cerdo_vacio", "Vacío", "Cerdo"]
  ];
  return catalog.map(([id, nombre, rubro], index) => ({
    id,
    productKey: id,
    nombre,
    rubro,
    subrubro: "",
    precio: index < count ? 9500 + index * 800 : 0,
    unidad: "kg",
    active: true
  }));
}

function promo() {
  return {
    id: "qa-promo-1",
    comboId: "qa-promo-1",
    name: "Promo QA Parrillera",
    nombre: "Promo QA Parrillera",
    status: "active",
    createdAt: iso(),
    updatedAt: iso(),
    total: 35000,
    total_final: 35000,
    peso_total: 3,
    items: [
      { id: "novillo_asado_costilla", nombre: "Asado", rubro: "Novillo", cantidad: 2, unidad: "kg", precio_unitario: 9500 },
      { id: "novillo_vacio", nombre: "Vacío", rubro: "Novillo", cantidad: 1, unidad: "kg", precio_unitario: 10300 }
    ]
  };
}

function buildMetrics(scenario) {
  const activatedAt = scenario.share && scenario.prices >= 10 ? daysAgo(1) : undefined;
  const lastCommercialActionAt = scenario.inactiveDays ? daysAgo(scenario.inactiveDays) : iso();
  const metrics = {
    webShareCount: scenario.share,
    offerCreatedCount: scenario.created,
    offerPublishedCount: scenario.published,
    dailyPromoPublishedCount: scenario.daily,
    lastCommercialActionAt
  };

  if (scenario.share) Object.assign(metrics, { firstWebSharedAt: daysAgo(1), lastWebSharedAt: daysAgo(1) });
  if (activatedAt) metrics.commercialActivatedAt = activatedAt;
  if (scenario.created) Object.assign(metrics, { firstOfferCreatedAt: daysAgo(1), lastOfferCreatedAt: daysAgo(1) });
  if (scenario.published) metrics.lastOfferPublishedAt = daysAgo(1);
  if (scenario.daily) Object.assign(metrics, { firstDailyPromoPublishedAt: daysAgo(1), lastDailyPromoPublishedAt: daysAgo(1) });
  return metrics;
}

async function verifyScenarioState(scenario, businessId) {
  const root = await getDoc(`businesses/${businessId}`);
  const metrics = root?.fields?.metrics?.mapValue?.fields || {};
  const checks = [
    ["webShareCount", scenario.share],
    ["offerCreatedCount", scenario.created],
    ["offerPublishedCount", scenario.published],
    ["dailyPromoPublishedCount", scenario.daily]
  ];

  for (const [field, expected] of checks) {
    const actual = readNumber(metrics[field]);
    if (actual !== expected) throw new Error(`${businessId}: ${field} esperado=${expected}, actual=${actual}`);
  }

  const activeAt = metrics.commercialActivatedAt?.stringValue || "";
  if (scenario.share && scenario.prices >= 10 && !activeAt) {
    throw new Error(`${businessId}: falta metrics.commercialActivatedAt`);
  }
}

async function seedScenario(scenario) {
  const uid = await ensureAuth(scenario.email);
  const businessId = `biz_qa_${scenario.key}`;
  const phone = `34620000${String(scenarios.indexOf(scenario) + 1).padStart(2, "0")}`;
  const phoneForSlug = phone.length === 10
    ? `${phone.slice(0, 4)}-${phone.slice(4)}`
    : phone;
  const publicName = String(scenario.name || "")
    .trim()
    .replace(/^(carnicer[i\u00ed]a\s*)+/i, "")
    .trim();
  const slug = `Carniceria ${publicName}-${phoneForSlug}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const priceList = products(scenario.prices);
  const visibleRubros = [...new Set(priceList.filter((product) => Number(product.precio || 0) > 0).map((product) => product.rubro))];
  const combos = scenario.combo ? [promo()] : [];
  const selectedOffers = scenario.selected ? ["qa-promo-1"] : [];
  const publicProducts = priceList
    .filter((product) => Number(product.precio || 0) > 0)
    .map(({ id, nombre, rubro, precio }) => ({ id, nombre, rubro, precio }));
  const publicOffers = selectedOffers.length
    ? combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      total: combo.total,
      items: combo.items.map(({ nombre, rubro, cantidad, unidad }) => ({ nombre, rubro, cantidad, unidad }))
    }))
    : [];
  const metrics = buildMetrics(scenario);
  const web = {
    enabled: true,
    published: true,
    active: true,
    mode: "web_premium",
    priceListStatus: "confirmed",
    showPriceList: true,
    slug,
    publicUrl: `http://127.0.0.1:5000/${slug}`,
    visibleRubros,
    selectedOffers,
    ...(scenario.themePromptSeen ? { storefrontThemePromptSeenAt: iso() } : {})
  };
  const preferences = { selectedRubros: visibleRubros, source: "qa_seed", updatedAt: iso() };

  await putDoc(`users/${uid}`, {
    uid,
    email: scenario.email,
    displayName: `QA ${scenario.key}`,
    role: "client",
    businessId,
    status: "active",
    createdAt: iso(),
    updatedAt: iso()
  });

  await putDoc(`businesses/${businessId}`, {
    businessId,
    name: scenario.name,
    businessName: scenario.name,
    displayName: scenario.name,
    publicDisplayName: scenario.name,
    publicName: scenario.name,
    ownerUid: uid,
    ownerEmail: scenario.email,
    email: scenario.email,
    telefono: phone,
    phone,
    ciudad: "Venado Tuerto",
    locality: "Venado Tuerto",
    provincia: "Santa Fe",
    province: "Santa Fe",
    status: "trial",
    plan: "trial",
    active: true,
    isTestBusiness: true,
    isTemplateBusiness: false,
    createdBy: "qa_seed",
    modules: { prices: true, competition: true, combos: true, offers: true, webPremium: true, whatsapp: true },
    billing: { status: "active", plan: "trial", trialStartedAt: iso(), trialEndsAt: daysAgo(-90), updatedAt: iso(), updatedBy: "qa_seed" },
    metrics,
    commercialAssistant: {},
    createdAt: iso(),
    updatedAt: iso()
  });

  await putDoc(`businesses/${businessId}/core/meta`, {
    businessId,
    name: scenario.name,
    businessName: scenario.name,
    displayName: scenario.name,
    publicDisplayName: scenario.name,
    ownerUid: uid,
    email: scenario.email,
    telefono: phone,
    phone,
    ciudad: "Venado Tuerto",
    locality: "Venado Tuerto",
    provincia: "Santa Fe",
    province: "Santa Fe",
    createdAt: iso(),
    updatedAt: iso(),
    sourceType: "qa_seed",
    createdBy: "qa_seed",
    activePriceListId: "v1"
  });

  await putDoc(`businesses/${businessId}/core/state`, {
    businessId,
    ownerUid: uid,
    ownerEmail: scenario.email,
    businessName: scenario.name,
    activePriceListId: "v1",
    products: priceList,
    savedCombos: combos,
    businessPreferences: preferences,
    dashboard: {},
    web,
    createdAt: iso(),
    updatedAt: iso()
  });

  await putDoc(`publicWebSlugs/${slug}`, {
    businessId,
    slug,
    active: true,
    enabled: true,
    published: true,
    mode: web.mode,
    priceListStatus: web.priceListStatus,
    showPriceList: web.showPriceList,
    visibleRubros,
    publicRubroNames: { Novillo: "Novillo" },
    storefrontTheme: "standard",
    publicUrl: web.publicUrl,
    publicProducts,
    publicOffers,
    dailyOffers: [],
    name: scenario.name,
    businessName: scenario.name,
    publicDisplayName: scenario.name,
    meta: { businessId, name: scenario.name, telefono: phone, ciudad: "Venado Tuerto", provincia: "Santa Fe" },
    state: { businessId, products: priceList, savedCombos: combos, businessPreferences: preferences, web },
    web,
    plan: "web_premium",
    createdFrom: "qa_seed",
    updatedAt: iso()
  });

  await verifyScenarioState(scenario, businessId);
  console.log(`OK  ${scenario.email.padEnd(32)} -> ${businessId} | ${scenario.expected}`);
}

await assertEmulators();
console.log("\n===== APPPROMOS A7.6.6 — RESEED QA LOCAL =====");
console.log("Destino EXCLUSIVO: Firebase Emulators 127.0.0.1\n");
for (const scenario of scenarios) await seedScenario(scenario);
console.log("\n===== CREDENCIALES =====");
console.log(`Contraseña común: ${PASSWORD}`);
console.log("Emulator UI: http://127.0.0.1:4000");
console.log("App QA:      http://127.0.0.1:5000/app.html?commercialQa=1");
console.log("\nSeed terminado y estados comerciales verificados. No se escribió Firebase producción.");
