const DEMO_PRODUCTS = [
  { id: "demo_asado", productKey: "demo_asado", nombre: "Asado", rubro: "Novillo", subrubro: "Parrilla", unidad: "kg", precio: 7490, active: true, activo: true },
  { id: "demo_vacio", productKey: "demo_vacio", nombre: "Vacío", rubro: "Novillo", subrubro: "Parrilla", unidad: "kg", precio: 8990, active: true, activo: true },
  { id: "demo_picada", productKey: "demo_picada", nombre: "Picada común", rubro: "Novillo", subrubro: "Molida", unidad: "kg", precio: 4990, active: true, activo: true },
  { id: "demo_pollo", productKey: "demo_pollo", nombre: "Pollo entero", rubro: "Pollo", subrubro: "Entero", unidad: "kg", precio: 2890, active: true, activo: true },
  { id: "demo_chorizo", productKey: "demo_chorizo", nombre: "Chorizo", rubro: "Cerdo", subrubro: "Embutidos", unidad: "kg", precio: 5490, active: true, activo: true }
];

export const DEMO_BUSINESS_ID = "demo-carniza";
export const DEMO_BUSINESS_NAME = "Carnicería de Carniza";
export const DEMO_WRITE_BLOCK_MESSAGE = "Estás probando la Carnicería de Carniza. Para guardar tus precios y ofertas, registrate gratis.";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isDemoRequest() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("demo") === "1";
  } catch (error) {
    return false;
  }
}

export function isDemoBusinessId(businessId) {
  return String(businessId || "").trim() === DEMO_BUSINESS_ID;
}

export function createDemoSession() {
  return {
    firebaseUser: null,
    userDoc: null,
    adminProfile: null,
    adminRole: null,
    appMode: "demo",
    isDemo: true,
    businessId: DEMO_BUSINESS_ID,
    businessName: DEMO_BUSINESS_NAME,
    user: {
      email: "demo@appromos.local"
    }
  };
}

export function createDemoBusinessPayload() {
  const now = new Date().toISOString();
  const products = clone(DEMO_PRODUCTS);
  const meta = {
    name: DEMO_BUSINESS_NAME,
    nombre: DEMO_BUSINESS_NAME,
    direccion: "Demo virtual",
    ciudad: "Argentina",
    provincia: "Demo",
    telefono: "3462-662053",
    whatsapp: "3462662053",
    status: "active",
    plan: "demo",
    isDemo: true,
    createdAt: now,
    updatedAt: now
  };
  const state = {
    products,
    savedCombos: [],
    activePriceListId: "demo-v1",
    isDemo: true,
    updatedAt: now
  };

  return {
    businessId: DEMO_BUSINESS_ID,
    meta,
    state
  };
}

export function getDemoWriteBlockMessage() {
  return DEMO_WRITE_BLOCK_MESSAGE;
}
