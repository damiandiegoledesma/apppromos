const PROJECT_ID = "apppromos";
const BUSINESS_ID = "biz_qa_completa";
const BASE_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function firestoreValue(value) {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (value && typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, firestoreValue(nested)])
        )
      }
    };
  }
  throw new Error(`Valor no soportado: ${String(value)}`);
}

function documentBody(data) {
  const fields = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      key === "createdAt" ? { timestampValue: value } : firestoreValue(value)
    ])
  );
  return JSON.stringify({ fields });
}

async function request(documentId, { method = "PATCH", data, admin = false } = {}) {
  const response = await fetch(
    `${BASE_URL}/businesses/${BUSINESS_ID}/publicSignals/${documentId}`,
    {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(admin ? { Authorization: "Bearer owner" } : {})
      },
      ...(data ? { body: documentBody(data) } : {})
    }
  );
  return response.status;
}

function signal(type, metadata, overrides = {}) {
  const now = new Date().toISOString();
  return {
    businessId: BUSINESS_ID,
    type,
    occurredAt: now,
    createdAt: now,
    origin: "public_web",
    source: type === "external_storefront_visit" ? "storefront_load" : "public_cart",
    metadata,
    schemaVersion: 1,
    ...overrides
  };
}

const suffix = `${Date.now()}`.slice(-12);
const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const validVisitId = `external_storefront_visit_${day}_qa${suffix}`;
const validOrderId = `public_order_whatsapp_started_${day}_qa${suffix}`;
const createdIds = [];
let failures = 0;

async function expect(label, expected, action) {
  const status = await action();
  const passed = expected.includes(status);
  console.log(`${passed ? "OK" : "ERROR"} ${label}: HTTP ${status}`);
  if (!passed) failures += 1;
}

try {
  await expect("crear visita válida", [200], async () => {
    const status = await request(validVisitId, {
      data: signal("external_storefront_visit", {})
    });
    if (status === 200) createdIds.push(validVisitId);
    return status;
  });

  await expect("crear pedido válido", [200], async () => {
    const status = await request(validOrderId, {
      data: signal("public_order_whatsapp_started", {
        itemCount: 2,
        containsOffer: true,
        containsDailyOffer: false
      })
    });
    if (status === 200) createdIds.push(validOrderId);
    return status;
  });

  await expect("rechazar tipo inventado", [403], () => request(
    `external_storefront_visit_${day}_badtype${suffix}`,
    { data: signal("tipo_inventado", {}) }
  ));

  await expect("rechazar metadata inválida", [403], () => request(
    `public_order_whatsapp_started_${day}_badmeta${suffix}`,
    {
      data: signal("public_order_whatsapp_started", {
        itemCount: "muchos",
        containsOffer: true,
        containsDailyOffer: false
      })
    }
  ));

  await expect("rechazar ID inválido", [403], () => request(
    `id_inventado_${suffix}`,
    { data: signal("external_storefront_visit", {}) }
  ));

  await expect("bloquear lectura pública", [401, 403], () => request(validVisitId, {
    method: "GET"
  }));

  await expect("bloquear actualización pública", [403], () => request(validVisitId, {
    data: signal("external_storefront_visit", {})
  }));

  await expect("bloquear borrado público", [403], () => request(validVisitId, {
    method: "DELETE"
  }));
} finally {
  for (const id of createdIds) {
    await request(id, { method: "DELETE", admin: true });
  }
}

if (failures > 0) {
  console.error(`\nA5 FIX1 rechazado: ${failures} prueba(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log("\nA5 FIX1 aprobado: reglas públicas endurecidas y datos de prueba eliminados.");
}
