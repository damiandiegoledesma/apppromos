// ======================================
// APPPROMOS — SEED DATA (FINAL FUNCIONANDO)
// ======================================

let rawDataCache = null;

// ===============================
// HELPERS
// ===============================

function normalize(str) {
  return (str || '').toString().trim().toLowerCase();
}

function generateProductKey(product) {
  const rubro = normalize(product?.rubro).replace(/\s+/g, '_');
  const nombre = normalize(product?.nombre).replace(/\s+/g, '_');
  return `${rubro}_${nombre}`;
}

// ===============================
// LOAD JSON (RUTA ABSOLUTA)
// ===============================

async function loadJSON() {
  if (rawDataCache) return rawDataCache;

  const jsonUrl = '/data/carniceria_datos_2026-04-20.json';

  const res = await fetch(jsonUrl, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`No se pudo cargar el JSON (${res.status}) en ${jsonUrl}`);
  }

  rawDataCache = await res.json();
  return rawDataCache;
}

// ===============================
// LISTA ACTIVA
// ===============================

async function getActiveList() {
  const data = await loadJSON();

  const activeName = data?.meta?.activeList;

  const list = data?.data?.priceVersions?.find(
    (l) => normalize(l?.name) === normalize(activeName)
  );

  if (!list) {
    throw new Error(`No se encontró la lista activa: ${activeName}`);
  }

  return list;
}

// ===============================
// EXPORT PRINCIPAL
// ===============================

export async function buildSeedData() {
  const activeList = await getActiveList();

  const BASE_PRODUCTS = activeList.products.map((p) => ({
    productKey: generateProductKey(p),
    nombre: p.nombre || '',
    rubro: p.rubro || '',
    subrubro: p.subrubro || '',
    unidad: p.unidad || 'kg',
    activo: true,
    extraFields: {}
  }));

  const ITEMS = activeList.products.map((p) => ({
    productKey: generateProductKey(p),
    nombre: p.nombre || '',
    rubro: p.rubro || '',
    subrubro: p.subrubro || '',
    unidad: p.unidad || 'kg',
    precio: Number(p.precio || 0),
    activo: true,
    extraFields: {}
  }));

  const now = new Date().toISOString();

  const INITIAL_PRICE_LIST_VERSION = {
    versionId: 'v1',
    versionName: activeList.name || 'Lista 30',
    createdAt: now,
    active: true,
    observation: activeList.observation || '',
    items: ITEMS
  };

  const DEMO_BUSINESS_META = {
    businessId: 'demo',
    name: 'Demo Carnicería',
    createdAt: now,
    activePriceListId: 'v1'
  };

  const DEMO_BUSINESS_STATE = {
    activePriceListId: 'v1',
    products: ITEMS,
    savedCombos: [],
    dashboard: {}
  };

  return {
    activeList,
    BASE_PRODUCTS,
    INITIAL_PRICE_LIST_VERSION,
    DEMO_BUSINESS_META,
    DEMO_BUSINESS_STATE
  };
}