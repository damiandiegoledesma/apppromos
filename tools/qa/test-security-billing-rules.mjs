const PROJECT_ID = "apppromos";
const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const PASSWORD = "AppPromosSecurity29!";
const suffix = Date.now();

function fv(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fv) } };
  if (value && typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, fv(nested)])) } };
  }
  throw new Error(`Tipo no soportado: ${typeof value}`);
}

function body(data) {
  return JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fv(value)])) });
}

async function auth(email) {
  const response = await fetch(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=qa-local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Auth ${response.status}: ${JSON.stringify(data)}`);
  return { uid: data.localId, token: data.idToken, email };
}

async function write(path, data, token = "owner") {
  const response = await fetch(`${FIRESTORE_URL}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body(data)
  });
  return response.status;
}

async function read(path, token) {
  return (await fetch(`${FIRESTORE_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).status;
}

const future = new Date(Date.now() + 7 * 86400000);
const past = new Date(Date.now() - 86400000);

function userDoc(user, businessId, role = "client") {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.email,
    role,
    businessId,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function businessDoc(owner, businessId, billing) {
  return {
    businessId,
    ownerUid: owner.uid,
    name: businessId,
    status: billing.plan === "trial" ? "trial" : "active",
    plan: billing.plan,
    billing,
    metrics: {},
    commercialAssistant: {},
    modules: { prices: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

let failures = 0;
async function expect(label, expected, action) {
  const status = await action();
  const ok = expected.includes(status);
  console.log(`${ok ? "OK" : "ERROR"} ${label}: HTTP ${status}`);
  if (!ok) failures += 1;
}

const [ownerA, ownerB, expiredOwner, manualOwner, admin] = await Promise.all([
  auth(`security-a-${suffix}@apppromos.test`),
  auth(`security-b-${suffix}@apppromos.test`),
  auth(`security-expired-${suffix}@apppromos.test`),
  auth(`security-manual-${suffix}@apppromos.test`),
  auth(`security-admin-${suffix}@apppromos.test`)
]);
const newOwner = await auth(`security-register-${suffix}@apppromos.test`);

const ids = {
  active: `security_active_${suffix}`,
  other: `security_other_${suffix}`,
  expired: `security_expired_${suffix}`,
  manual: `security_manual_${suffix}`
};

const activeBusiness = businessDoc(ownerA, ids.active, {
  plan: "trial", status: "active", trialEndsAt: future.toISOString(), writeAccessUntil: future
});
const otherBusiness = businessDoc(ownerB, ids.other, {
  plan: "basic", status: "active", nextPaymentDueAt: future.toISOString(), writeAccessUntil: future
});
const expiredBusiness = businessDoc(expiredOwner, ids.expired, {
  plan: "trial", status: "active", trialEndsAt: past.toISOString(), writeAccessUntil: past
});
const manualBusiness = businessDoc(manualOwner, ids.manual, {
  plan: "basic", status: "manual", writeAccessUntil: null
});
const ownerAProfile = userDoc(ownerA, ids.active);

await write(`businesses/${ids.active}`, activeBusiness);
await write(`businesses/${ids.other}`, otherBusiness);
await write(`businesses/${ids.expired}`, expiredBusiness);
await write(`businesses/${ids.manual}`, manualBusiness);

await write(`users/${ownerA.uid}`, ownerAProfile);
await write(`users/${ownerB.uid}`, userDoc(ownerB, ids.other));
await write(`users/${expiredOwner.uid}`, userDoc(expiredOwner, ids.expired));
await write(`users/${manualOwner.uid}`, userDoc(manualOwner, ids.manual));
await write(`users/${admin.uid}`, userDoc(admin, ids.active, "superadmin"));
await write(`admins/${admin.uid}`, {
  uid: admin.uid, email: admin.email, role: "superadmin", active: true
});
await write(`publicWebSlugs/slug-ajeno-${suffix}`, {
  businessId: ids.other, slug: `slug-ajeno-${suffix}`, active: true
});
await write(`publicPhoneKeys/3462${String(suffix).slice(-6)}`, {
  businessId: ids.other, phoneKey: `3462${String(suffix).slice(-6)}`, active: true
});

await expect("dueño lee su negocio", [200], () => read(`businesses/${ids.active}`, ownerA.token));
await expect("dueño no lee otro tenant", [403], () => read(`businesses/${ids.other}`, ownerA.token));
await expect("cliente no se eleva a superadmin", [403], () => write(`users/${ownerA.uid}`, { ...ownerAProfile, role: "superadmin" }, ownerA.token));
await expect("cliente actualiza perfil inocuo", [200], () => write(`users/${ownerA.uid}`, {
  ...ownerAProfile, displayName: "Nombre seguro", updatedAt: new Date().toISOString()
}, ownerA.token));
await expect("dueño no altera billing", [403], () => write(`businesses/${ids.active}`, {
  ...activeBusiness, plan: "basic", status: "active",
  billing: { plan: "basic", status: "manual", writeAccessUntil: null }
}, ownerA.token));
await expect("dueño no secuestra slug ajeno", [403], () => write(`publicWebSlugs/slug-ajeno-${suffix}`, {
  businessId: ids.active, slug: `slug-ajeno-${suffix}`, active: true
}, ownerA.token));
await expect("dueño no secuestra teléfono ajeno", [403], () => write(`publicPhoneKeys/3462${String(suffix).slice(-6)}`, {
  businessId: ids.active, phoneKey: `3462${String(suffix).slice(-6)}`, active: true
}, ownerA.token));
await expect("trial activo actualiza métricas", [200], () => write(`businesses/${ids.active}`, {
  ...activeBusiness, metrics: { priceSaveCount: 1 }, updatedAt: new Date().toISOString()
}, ownerA.token));
await expect("trial activo guarda estado comercial", [200], () => write(`businesses/${ids.active}/core/state`, {
  businessId: ids.active, ownerUid: ownerA.uid, products: [{ id: "asado", precio: 10000 }]
}, ownerA.token));
await expect("trial vencido queda en solo lectura", [403], () => write(`businesses/${ids.expired}/core/state`, {
  businessId: ids.expired, ownerUid: expiredOwner.uid, products: [{ id: "asado", precio: 1 }]
}, expiredOwner.token));
await expect("bonificado pago puede guardar", [200], () => write(`businesses/${ids.manual}/core/state`, {
  businessId: ids.manual, ownerUid: manualOwner.uid, products: [{ id: "asado", precio: 12000 }]
}, manualOwner.token));
await expect("administrador lee otro tenant", [200], () => read(`businesses/${ids.other}`, admin.token));
await expect("administrador cambia billing", [200], () => write(`businesses/${ids.other}`, {
  ...otherBusiness, billing: { ...otherBusiness.billing, status: "pending" }
}, admin.token));

const registrationId = `security_registration_${suffix}`;
const registrationEnd = new Date(Date.now() + 14 * 86400000);
const registrationBusiness = businessDoc(newOwner, registrationId, {
  plan: "trial",
  status: "active",
  trialStartedAt: new Date().toISOString(),
  trialEndsAt: registrationEnd.toISOString(),
  writeAccessUntil: registrationEnd
});
await expect("alta crea negocio con prueba segura de 14 días", [200], () => write(
  `businesses/${registrationId}`,
  registrationBusiness,
  newOwner.token
));
await expect("alta crea perfil client ligado a su negocio", [200], () => write(
  `users/${newOwner.uid}`,
  userDoc(newOwner, registrationId),
  newOwner.token
));
await expect("alta crea estado inicial del negocio", [200], () => write(
  `businesses/${registrationId}/core/state`,
  { businessId: registrationId, ownerUid: newOwner.uid, products: [] },
  newOwner.token
));

if (failures) {
  console.error(`\nRC2 seguridad rechazada: ${failures} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log("\nRC2 seguridad aprobada: tenant, rol y cobranzas protegidos por Firestore.");
}
