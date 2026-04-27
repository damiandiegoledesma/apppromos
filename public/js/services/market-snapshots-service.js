import {
  readCollection,
  readPath,
  writePath,
  getBusinessMetaPath,
  getBusinessStatePath
} from "../core/firebase-core.js";

import {
  hasMarketCache,
  setMarketCache,
  getMarketCache,
  upsertMarketSnapshot
} from "./business-store.js";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getProductCompareKey(product = {}) {
  return normalizeText(
    product.compareKey ||
    product.productKey ||
    product.id ||
    product.key ||
    ""
  );
}

function getProductName(product = {}) {
  return normalizeText(
    product.nombre ||
    product.name ||
    product.label ||
    product.title ||
    getProductCompareKey(product)
  );
}

function getProductPrice(product = {}) {
  return normalizeNumber(product.precio ?? product.price);
}

function isActiveProduct(product = {}) {
  return product.active !== false && product.activo !== false;
}

export function generateMarketSnapshot(businessId, meta = {}, state = {}) {
  if (!businessId || businessId === "demo") return null;

  const products = {};
  const productNames = {};
  const productCategories = {};
  const sourceProducts = Array.isArray(state?.products) ? state.products : [];

  sourceProducts.forEach((product) => {
    if (!isActiveProduct(product)) return;

    const compareKey = getProductCompareKey(product);
    const price = getProductPrice(product);

    if (!compareKey || !price) return;

    products[compareKey] = price;
    productNames[compareKey] = getProductName(product);
    productCategories[compareKey] = normalizeText(product.rubro || product.category || product.categoria || "");
  });

  return {
    businessId,
    name: normalizeText(meta?.name || meta?.nombre || businessId),
    telefono: normalizeText(meta?.telefono || meta?.phone || ""),
    location: {
      province: normalizeText(meta?.province || meta?.provincia || ""),
      city: normalizeText(meta?.city || meta?.ciudad || meta?.localidad || "")
    },
    products,
    productNames,
    productCategories,
    updatedAt: new Date().toISOString()
  };
}

export async function saveMarketSnapshot(businessId, meta = {}, state = {}) {
  const snapshot = generateMarketSnapshot(businessId, meta, state);
  if (!snapshot) return null;

  await writePath(`marketSnapshots/${businessId}`, snapshot);
  upsertMarketSnapshot(snapshot);

  return snapshot;
}

export async function loadMarketSnapshots() {
  const docs = await readCollection("marketSnapshots");
  return docs.map((docSnap) => ({
    businessId: docSnap.data?.businessId || docSnap.id,
    ...docSnap.data
  }));
}

export async function loadMarketCacheOnce(options = {}) {
  if (!options.force && hasMarketCache()) {
    return getMarketCache();
  }

  const snapshots = await loadMarketSnapshots();
  return setMarketCache(snapshots);
}


/**
 * Herramienta ADMIN/MIGRACIÓN: genera snapshots para todas las empresas existentes.
 * No se usa en el flujo normal del módulo Competencia. Es manual para inicializar mercado.
 */
export async function rebuildMarketSnapshotsFromBusinesses(options = {}) {
  const includeDemo = options.includeDemo === true;
  const businessDocs = await readCollection("businesses");
  const rebuilt = [];
  const errors = [];

  for (const docSnap of businessDocs) {
    const businessId = docSnap.id;
    if (!includeDemo && businessId === "demo") continue;

    try {
      const [meta, state] = await Promise.all([
        readPath(getBusinessMetaPath(businessId)),
        readPath(getBusinessStatePath(businessId))
      ]);

      if (!meta || !state) continue;
      const snapshot = await saveMarketSnapshot(businessId, meta, state);
      if (snapshot) rebuilt.push(snapshot);
    } catch (error) {
      console.warn(`No se pudo generar marketSnapshot para ${businessId}`, error);
      errors.push({ businessId, error: error?.message || String(error) });
    }
  }

  setMarketCache(rebuilt);
  return { rebuilt, errors };
}
