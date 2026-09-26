// Tracking Comercial V1 — pruebas de Firestore Rules para funnelEvents.
// Requiere: firebase emulators:start --only auth,firestore (proyecto apppromos).
// Uso: node tools/qa/test-funnel-rules.mjs
// No usa dependencias: REST del emulador + fetch de Node 18+.

const PROJECT_ID = "apppromos";
const DB = `projects/${PROJECT_ID}/databases/(default)/documents`;
const FS = `http://127.0.0.1:8080/v1/${DB}`;
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

let passed = 0;
let failed = 0;
const failures = [];

function value(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === "number") return { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v && typeof v === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, n]) => [k, value(n)])) } };
  }
  throw new Error(`Valor no soportado: ${v}`);
}

function fields(data) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
}

async function signUp(email) {
  const response = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "carnis123", returnSecureToken: true })
  });
  const data = await response.json();
  if (!data.idToken) throw new Error(`No se pudo crear usuario ${email}: ${JSON.stringify(data)}`);
  return { uid: data.localId, token: data.idToken };
}

// Escritura privilegiada (el emulador acepta "Bearer owner" como admin del proyecto).
async function seed(path, data) {
  const response = await fetch(`${FS}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: fields(data) })
  });
  if (!response.ok) throw new Error(`Seed ${path}: HTTP ${response.status}`);
}

// Escritura como la hace el SDK con setDoc: sin precondición, occurred_at = REQUEST_TIME.
async function write(id, data, { token = null, serverTime = true } = {}) {
  const body = {
    writes: [{
      update: { name: `${DB}/funnelEvents/${id}`, fields: fields(data) },
      ...(serverTime ? { updateTransforms: [{ fieldPath: "occurred_at", setToServerValue: "REQUEST_TIME" }] } : {})
    }]
  };
  const response = await fetch(`${FS}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return response.status;
}

async function remove(id, token = null) {
  const response = await fetch(`${FS}/funnelEvents/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.status;
}

async function list(token = null) {
  const response = await fetch(`${FS}/funnelEvents?pageSize=5`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.status;
}

function rid() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 32);
}

const touch = (overrides = {}) => ({
  source: "meta", medium: "paid_social", campaign: "lanzamiento", content: "video_precios",
  term: "", path: "/", at: new Date().toISOString(), ...overrides
});

function event(name, overrides = {}, id = rid()) {
  const data = {
    schema_version: 1,
    event_id: id,
    event_name: name,
    visitor_id: "v".repeat(1) + rid().slice(1),
    session_id: rid(),
    client_at: new Date().toISOString(),
    page: "onboarding",
    path: "/crear-carniceria.html",
    build: "V12.29-RC5.6+T1",
    is_internal: false,
    storage_ok: true,
    first_touch: touch(),
    current_touch: touch({ source: "(direct)", medium: "", campaign: "", content: "" }),
    last_touch: touch(),
    ...overrides
  };
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return { id, data };
}

async function expectStatus(label, promise, ok) {
  const status = await promise;
  const good = ok ? status === 200 : status === 403;
  if (good) passed += 1;
  else {
    failed += 1;
    failures.push(`${label}: esperado ${ok ? 200 : 403}, obtuvo ${status}`);
  }
  console.log(`${good ? "OK  " : "FAIL"} ${label} -> ${status}`);
}

async function main() {
  try {
    await fetch(`${FS}/funnelEvents?pageSize=1`, { headers: { Authorization: "Bearer owner" } });
  } catch (_) {
    throw new Error("Firestore Emulator no responde en 127.0.0.1:8080. Ejecutá firebase emulators:start primero.");
  }

  const stamp = Date.now();
  const ownerA = await signUp(`funnel-a-${stamp}@qa.carnis`);
  const ownerB = await signUp(`funnel-b-${stamp}@qa.carnis`);
  const admin = await signUp(`funnel-admin-${stamp}@qa.carnis`);
  const bizA = `biz_funnel_a_${stamp}`;
  const bizB = `biz_funnel_b_${stamp}`;
  await seed(`businesses/${bizA}`, { businessId: bizA, ownerUid: ownerA.uid, status: "trial", isTestBusiness: true });
  await seed(`businesses/${bizB}`, { businessId: bizB, ownerUid: ownerB.uid, status: "trial", isTestBusiness: true });
  await seed(`users/${ownerA.uid}`, { uid: ownerA.uid, businessId: bizA, role: "client" });
  await seed(`users/${ownerB.uid}`, { uid: ownerB.uid, businessId: bizB, role: "client" });
  await seed(`admins/${admin.uid}`, { active: true, role: "admin" });

  console.log("\n== Creación válida");
  const anonymousSteps = [
    ["landing_view", { page: "landing", path: "/" }],
    ["cta_create_clicked", { page: "landing", path: "/", cta_position: "hero" }],
    ["onboarding_started", {}],
    ["rubros_completed", { count: 3 }],
    ["prices_started", {}],
    ["prices_completed", { count: 12 }],
    ["name_completed", {}],
    ["storefront_previewed", { page: "preview", path: "/web.html" }],
    ["signup_started", {}]
  ];
  for (const [name, extra] of anonymousSteps) {
    const e = event(name, extra);
    await expectStatus(`anónimo crea ${name}`, write(e.id, e.data), true);
  }
  {
    const e = event("account_created");
    await expectStatus("dueño recién creado registra account_created", write(e.id, e.data, { token: ownerA.token }), true);
  }
  {
    const e = event("business_created", { business_id: bizA, count: 12 });
    await expectStatus("dueño A registra business_created de A", write(e.id, e.data, { token: ownerA.token }), true);
  }
  {
    const e = event("share_whatsapp_clicked", { business_id: bizA });
    await expectStatus("dueño A registra share_whatsapp_clicked de A", write(e.id, e.data, { token: ownerA.token }), true);
  }
  {
    const e = event("landing_view", { page: "landing", path: "/", is_internal: true });
    await expectStatus("evento interno (is_internal=true) se acepta", write(e.id, e.data), true);
  }

  console.log("\n== Append-only");
  const base = event("onboarding_started");
  await expectStatus("crear base", write(base.id, base.data), true);
  await expectStatus("reenviar el mismo id (update) se rechaza", write(base.id, base.data), false);
  await expectStatus("modificar un evento como dueño se rechaza", write(base.id, { ...base.data, is_internal: true }, { token: ownerA.token }), false);
  await expectStatus("borrar como anónimo se rechaza", remove(base.id), false);
  await expectStatus("borrar como admin se rechaza", remove(base.id, admin.token), false);

  console.log("\n== Esquema");
  const reject = async (label, name, overrides, opts) => {
    const e = event(name, overrides);
    await expectStatus(label, write(e.id, e.data, opts), false);
  };
  await reject("evento fuera de la allowlist", "hack");
  await reject("campo extra (email)", "onboarding_started", { email: "x@y.z" });
  await reject("utm_campaign de 101 caracteres", "onboarding_started", { last_touch: touch({ campaign: "c".repeat(101) }) });
  await reject("touch con clave extra", "onboarding_started", { first_touch: { ...touch(), fbclid: "abc" } });
  await reject("falta storage_ok", "onboarding_started", { storage_ok: undefined });
  await reject("is_internal no booleano", "onboarding_started", { is_internal: "true" });
  await reject("schema_version 2", "onboarding_started", { schema_version: 2 });
  await reject("page desconocida", "onboarding_started", { page: "admin" });
  await reject("visitor_id con caracteres inválidos", "onboarding_started", { visitor_id: "abc-def-ghi-jkl-mno" });
  await reject("build de 25 caracteres", "onboarding_started", { build: "b".repeat(25) });
  await reject("cta_position en otro evento", "onboarding_started", { cta_position: "hero" });
  await reject("cta_position inválida", "cta_create_clicked", { page: "landing", cta_position: "footer" });
  await reject("count en landing_view", "landing_view", { page: "landing", count: 1 });
  await reject("count 501", "prices_completed", { count: 501 });
  await reject("count negativo", "prices_completed", { count: -1 });
  await reject("count no entero", "prices_completed", { count: 1.5 });
  {
    const e = event("onboarding_started");
    await expectStatus("event_id distinto del id del documento", write(e.id, { ...e.data, event_id: rid() }), false);
  }
  {
    const id = "corto";
    const e = event("onboarding_started", {}, id);
    await expectStatus("id de documento con formato inválido", write(id, e.data), false);
  }

  console.log("\n== Hora del servidor");
  {
    const e = event("onboarding_started", { occurred_at: new Date(Date.now() - 86400000) });
    await expectStatus("occurred_at con hora del cliente se rechaza", write(e.id, e.data, { serverTime: false }), false);
  }

  console.log("\n== Vínculo con la carnicería");
  await reject("business_created anónimo", "business_created", { business_id: bizA, count: 1 });
  await reject("business_created de B escrito por dueño A", "business_created", { business_id: bizB, count: 1 }, { token: ownerA.token });
  await reject("business_created sin business_id", "business_created", { count: 1 }, { token: ownerA.token });
  await reject("business_id en un evento que no lo lleva", "signup_started", { business_id: bizA }, { token: ownerA.token });
  await reject("share_whatsapp_clicked de B por dueño A", "share_whatsapp_clicked", { business_id: bizB }, { token: ownerA.token });

  console.log("\n== Lectura");
  await expectStatus("anónimo no lee", list(), false);
  await expectStatus("dueño no lee", list(ownerA.token), false);
  await expectStatus("admin lee", list(admin.token), true);

  console.log(`\nResultado: ${passed} OK, ${failed} FAIL`);
  if (failed) {
    failures.forEach((line) => console.log(` - ${line}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
