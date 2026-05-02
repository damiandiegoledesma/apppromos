// ======================================
// APPPROMOS — SEED DATA (V12.7.2 PATCH A)
// Demo fuerte + combos precargados
// ======================================

let rawDataCache = null;

// ===============================
// HELPERS
// ===============================

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

function normalizeKey(str) {
  return normalize(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function generateProductKey(product) {
  const rubro = normalizeKey(product?.rubro);
  const nombre = normalizeKey(product?.nombre);
  return `${rubro}_${nombre}`;
}

function normalizeProduct(product) {
  return {
    productKey: generateProductKey(product),
    nombre: product.nombre || "",
    rubro: product.rubro || "",
    subrubro: product.subrubro || "",
    unidad: product.unidad || "kg",
    precio: Number(product.precio || 0),
    activo: true,
    extraFields: {}
  };
}

function isDemoAllowedProduct(product) {
  const nombre = normalizeKey(product?.nombre);

  // V12.7.2: fuera de demo por confusión pieza/kg o por criterio comercial.
  if (nombre.includes("pollo_entero")) return false;
  if (nombre.includes("hamburguesa")) return false;

  return true;
}

function findProduct(products, nombre, rubro = null) {
  const wantedName = normalizeKey(nombre);
  const wantedRubro = rubro ? normalizeKey(rubro) : null;

  return products.find((product) => {
    const sameName = normalizeKey(product.nombre) === wantedName;
    const sameRubro = !wantedRubro || normalizeKey(product.rubro) === wantedRubro;
    return sameName && sameRubro;
  });
}

function buildComboItem(product, cantidad) {
  const qty = Number(cantidad || 1);
  return {
    productKey: product.productKey,
    nombre: product.nombre,
    rubro: product.rubro,
    unidad: product.unidad || "kg",
    cantidad: qty,
    precio: Number(product.precio || 0),
    subtotal: Number(product.precio || 0) * qty
  };
}

function buildPreloadedCombo(products, combo) {
  const items = combo.items
    .map((item) => {
      const product = findProduct(products, item.nombre, item.rubro);

      if (!product) {
        console.warn("Combo demo: producto no encontrado", combo.name, item);
        return null;
      }

      return buildComboItem(product, item.cantidad);
    })
    .filter(Boolean);

  const total = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

  return {
    id: combo.id,
    name: combo.name,
    description: combo.description,
    items,
    total,
    isDemoPreloaded: true,
    source: "v12_7_2_demo_fuerte",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildDemoCombos(products) {
  const definitions = [
    {
      id: "demo_combo_parrillera_hoy",
      name: "Promo Parrillera de Hoy",
      description: "Ideal para prender la parrilla sin dar vueltas.",
      items: [
        { nombre: "Asado Banderita", rubro: "Novillo", cantidad: 2 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Morcilla", rubro: "Elaborados", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_familiar",
      name: "Combo Familiar",
      description: "Para resolver el asado familiar del finde.",
      items: [
        { nombre: "Asado Costilla", rubro: "Novillo", cantidad: 2 },
        { nombre: "Vacio", rubro: "Novillo", cantidad: 1 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_economico",
      name: "Combo Económico",
      description: "Buena compra para llenar la heladera.",
      items: [
        { nombre: "Picada COMUN", rubro: "Elaborados", cantidad: 2 },
        { nombre: "Milanesa Ternera", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 }
      ]
    },
    {
      id: "demo_promo_finde",
      name: "Promo para el Finde",
      description: "Una promo fuerte para compartir.",
      items: [
        { nombre: "Vacio", rubro: "Novillo", cantidad: 1.5 },
        { nombre: "Matambre", rubro: "Novillo", cantidad: 1 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_mila_express",
      name: "Combo Mila Express",
      description: "Para resolver comidas rápidas de la semana.",
      items: [
        { nombre: "Milanesa Ternera", rubro: "Elaborados", cantidad: 2 },
        { nombre: "Milanesa Pollo", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Filet de Pechuga", rubro: "Pollo", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_parrilla_completa",
      name: "Combo Parrilla Completa",
      description: "Todo listo para una parrillada completa.",
      items: [
        { nombre: "Asado Banderita", rubro: "Novillo", cantidad: 2 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Morcilla", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Chinchulin", rubro: "Menudencias", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_achuras",
      name: "Combo Achuras",
      description: "Para los que arrancan el asado con todo.",
      items: [
        { nombre: "Chinchulin", rubro: "Menudencias", cantidad: 1 },
        { nombre: "Molleja", rubro: "Menudencias", cantidad: 0.5 },
        { nombre: "Riñon", rubro: "Menudencias", cantidad: 1 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 }
      ]
    },
    {
      id: "demo_combo_salvaventas",
      name: "Combo Salvaventas",
      description: "Promo especial hasta agotar stock.",
      items: [
        { nombre: "Marucha", rubro: "Novillo", cantidad: 1 },
        { nombre: "Picada COMUN", rubro: "Elaborados", cantidad: 1 },
        { nombre: "Chorizos", rubro: "Elaborados", cantidad: 1 }
      ]
    }
  ];

  return definitions.map((combo) => buildPreloadedCombo(products, combo));
}

// ===============================
// LOAD JSON (RUTA ABSOLUTA)
// ===============================

async function loadJSON() {
  if (rawDataCache) return rawDataCache;

  const jsonUrl = "/data/carniceria_datos_2026-04-20.json";

  const res = await fetch(jsonUrl, { cache: "no-store" });

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
  const demoProductsRaw = (activeList.products || []).filter(isDemoAllowedProduct);

  const BASE_PRODUCTS = demoProductsRaw.map((p) => {
    const product = normalizeProduct(p);
    return {
      productKey: product.productKey,
      nombre: product.nombre,
      rubro: product.rubro,
      subrubro: product.subrubro,
      unidad: product.unidad,
      activo: product.activo,
      extraFields: product.extraFields
    };
  });

  const ITEMS = demoProductsRaw.map(normalizeProduct);
  const DEMO_COMBOS = buildDemoCombos(ITEMS);

  const now = new Date().toISOString();

  const INITIAL_PRICE_LIST_VERSION = {
    versionId: "v1",
    versionName: activeList.name || "Lista 30",
    createdAt: now,
    active: true,
    observation: activeList.observation || "",
    items: ITEMS
  };

  const DEMO_BUSINESS_META = {
    businessId: "demo",
    name: "Demo Carnicería",
    createdAt: now,
    activePriceListId: "v1"
  };

  const DEMO_BUSINESS_STATE = {
    activePriceListId: "v1",
    products: ITEMS,
    savedCombos: DEMO_COMBOS,
    dashboard: {
      demoVersion: "V12.7.2 Patch A",
      demoNote: "Demo fuerte con combos precargados. Sin Pollo entero ni hamburguesas."
    }
  };

  return {
    activeList: {
      ...activeList,
      products: demoProductsRaw
    },
    BASE_PRODUCTS,
    INITIAL_PRICE_LIST_VERSION,
    DEMO_BUSINESS_META,
    DEMO_BUSINESS_STATE
  };
}
