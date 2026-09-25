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
  { key: "completa", email: "qa-completa@apppromos.test", name: "Carnicería QA Completa", prices: 15, share: 1, created: 1, published: 1, daily: 1, combo: true, selected: true, themePromptSeen: true, externalVisit: 1, orderStart: 1, expected: "activa + señales públicas" },
  { key: "reactivacion", email: "qa-reactivacion@apppromos.test", name: "Carnicería QA Reactivación", prices: 15, share: 1, created: 1, published: 1, daily: 1, combo: true, selected: true, themePromptSeen: true, inactiveDays: 8, expected: "reactivación" }
];

function fv(value) {
  if (value === null) return { nullValue: null };
  if (value && typeof value === "object" && typeof value.__timestamp === "string") {
    return { timestampValue: value.__timestamp };
  }
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

async function seedQaSuperadmin() {
  const email = "qa-superadmin@apppromos.test";
  const uid = await ensureAuth(email);
  await putDoc(`users/${uid}`, {
    uid,
    email,
    displayName: "QA Superadmin",
    role: "superadmin",
    status: "active",
    createdAt: iso(),
    updatedAt: iso()
  });
  await putDoc(`admins/${uid}`, {
    uid,
    email,
    role: "superadmin",
    active: true,
    createdAt: iso(),
    updatedAt: iso()
  });
  return email;
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
    priceSaveCount: scenario.prices > 0 ? 1 : 0,
    maxPricedProductCount: scenario.prices,
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

function buildCommercialEvents(scenario, businessId) {
  const events = [
    ["001_registered", "business_registered", daysAgo(3), { pricedProductCount: 0 }],
    ["002_first_login", "first_login", daysAgo(3), {}]
  ];
  for (const milestone of [5, 12, 15]) {
    if (scenario.prices >= milestone) {
      events.push([
        `01${milestone}_prices`,
        "price_milestone_reached",
        daysAgo(2),
        { milestone, pricedProductCount: scenario.prices }
      ]);
    }
  }
  if (scenario.share) events.push(["020_web_share", "web_share", daysAgo(1), {}]);
  if (scenario.created) events.push(["030_offer_created", "offer_created", daysAgo(1), {}]);
  if (scenario.published) events.push(["040_offer_published", "offer_published", daysAgo(1), {}]);
  if (scenario.daily) events.push(["050_daily_promo", "daily_promo_published", daysAgo(1), {}]);

  return events.map(([id, type, occurredAt, metadata]) => ({
    id,
    data: {
      businessId,
      type,
      occurredAt,
      createdAt: occurredAt,
      origin: "qa_seed",
      actorType: "owner",
      source: "qa_scenario",
      metadata,
      schemaVersion: 1
    }
  }));
}

function buildPublicSignals(scenario, businessId) {
  const signals = [];
  if (scenario.externalVisit) {
    signals.push(["qa_external_visit", "external_storefront_visit", { }]);
  }
  if (scenario.orderStart) {
    signals.push(["qa_order_started", "public_order_whatsapp_started", {
      itemCount: 3,
      containsOffer: true,
      containsDailyOffer: false
    }]);
  }
  return signals.map(([id, type, metadata]) => ({
    id,
    data: {
      businessId,
      type,
      occurredAt: iso(),
      createdAt: iso(),
      origin: "public_web",
      source: type === "external_storefront_visit" ? "storefront_load" : "public_cart",
      metadata,
      schemaVersion: 1
    }
  }));
}

function buildFollowupEvents(scenario, businessId) {
  if (scenario.key !== "reactivacion") return [];
  return [
    ["001_pending", "pending", daysAgo(3), "Revisar inactividad", "Escribir por WhatsApp", daysAgo(2)],
    ["002_contacted", "contacted", daysAgo(2), "Se envió mensaje de ayuda", "Esperar respuesta", daysAgo(1)],
    ["003_no_response", "no_response", daysAgo(1), "Todavía no respondió", "Volver a contactar", daysAgo(-1)]
  ].map(([id, status, occurredAt, outcome, nextAction, nextContactAt]) => ({
    id,
    data: {
      businessId,
      type: "manual_followup_updated",
      occurredAt,
      createdAt: occurredAt,
      status,
      outcome,
      nextAction,
      nextContactAt,
      note: "Seguimiento QA interno",
      operatorUid: "qa-superadmin",
      operatorEmail: "qa-superadmin@apppromos.test",
      schemaVersion: 1
    }
  }));
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

  const timeline = await getDoc(`businesses/${businessId}/commercialEvents`);
  const eventTypes = (timeline?.documents || [])
    .map((item) => item?.fields?.type?.stringValue || "")
    .filter(Boolean);
  if (!eventTypes.includes("business_registered")) {
    throw new Error(`${businessId}: falta evento business_registered`);
  }
  for (const milestone of [5, 12, 15]) {
    if (scenario.prices < milestone) continue;
    const found = (timeline?.documents || []).some((item) => {
      const fields = item?.fields || {};
      return fields.type?.stringValue === "price_milestone_reached"
        && readNumber(fields.metadata?.mapValue?.fields?.milestone) === milestone;
    });
    if (!found) throw new Error(`${businessId}: falta hito de ${milestone} precios`);
  }

  if (scenario.externalVisit || scenario.orderStart) {
    const publicSignals = await getDoc(`businesses/${businessId}/publicSignals`);
    const signalDocs = publicSignals?.documents || [];
    const signalTypes = signalDocs.map((item) => item?.fields?.type?.stringValue || "");
    if (scenario.externalVisit && !signalTypes.includes("external_storefront_visit")) {
      throw new Error(`${businessId}: falta señal external_storefront_visit`);
    }
    if (scenario.orderStart && !signalTypes.includes("public_order_whatsapp_started")) {
      throw new Error(`${businessId}: falta señal public_order_whatsapp_started`);
    }
    const forbiddenKeys = new Set(["name", "nombre", "phone", "telefono", "address", "direccion", "cart", "pedido", "message", "mensaje"]);
    for (const signal of signalDocs) {
      const metadataKeys = Object.keys(signal?.fields?.metadata?.mapValue?.fields || {});
      if (metadataKeys.some((key) => forbiddenKeys.has(String(key).toLowerCase()))) {
        throw new Error(`${businessId}: señal pública contiene PII o contenido de pedido`);
      }
    }
  }


  if (scenario.key === "reactivacion") {
    const followups = await getDoc(`businesses/${businessId}/followupEvents`);
    const followupDocs = followups?.documents || [];
    const statuses = followupDocs.map((item) => item?.fields?.status?.stringValue || "");
    for (const expected of ["pending", "contacted", "no_response"]) {
      if (!statuses.includes(expected)) throw new Error(`${businessId}: falta seguimiento ${expected}`);
    }
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
  const followup = scenario.key === "reactivacion" ? {
    status: "no_response",
    outcome: "Todavía no respondió",
    nextAction: "Volver a contactar",
    nextContactAt: daysAgo(-1),
    note: "Seguimiento QA interno",
    updatedAt: daysAgo(1),
    updatedByUid: "qa-superadmin",
    updatedByEmail: "qa-superadmin@apppromos.test"
  } : undefined;
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
    billing: {
      status: "active",
      plan: "trial",
      trialStartedAt: iso(),
      trialEndsAt: daysAgo(-14),
      writeAccessUntil: { __timestamp: daysAgo(-14) },
      updatedAt: iso(),
      updatedBy: "qa_seed"
    },
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

  for (const event of buildCommercialEvents(scenario, businessId)) {
    await putDoc(`businesses/${businessId}/commercialEvents/${event.id}`, event.data);
  }
  for (const signal of buildPublicSignals(scenario, businessId)) {
    await putDoc(`businesses/${businessId}/publicSignals/${signal.id}`, signal.data);
  }
  for (const event of buildFollowupEvents(scenario, businessId)) {
    await putDoc(`businesses/${businessId}/followupEvents/${event.id}`, event.data);
  }
  if (followup) {
    await putDoc(`businesses/${businessId}/followupState/current`, followup);
  }

  await verifyScenarioState(scenario, businessId);
  console.log(`OK  ${scenario.email.padEnd(32)} -> ${businessId} | ${scenario.expected}`);
}

await assertEmulators();
console.log("\n===== APPPROMOS V12.28-A3 — RESEED QA LOCAL =====");
console.log("Destino EXCLUSIVO: Firebase Emulators 127.0.0.1\n");
const qaSuperadminEmail = await seedQaSuperadmin();
for (const scenario of scenarios) await seedScenario(scenario);
console.log("\n===== CREDENCIALES =====");
console.log(`Contraseña común: ${PASSWORD}`);
console.log(`Superadmin QA: ${qaSuperadminEmail}`);
console.log("Emulator UI: http://127.0.0.1:4000");
console.log("App QA:      http://127.0.0.1:5000/app.html?commercialQa=1");
console.log("\nSeed terminado: estados comerciales, señales públicas y seguimiento manual verificados. No se escribió Firebase producción.");
