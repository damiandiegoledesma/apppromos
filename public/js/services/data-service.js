import {
  getCurrentBusinessId,
  openBusiness,
  updateBusinessState
} from "./business-service.js";

const DEMO_LOCAL_COMBOS_KEY = "apppromos_demo_local_saved_combos_v12_7_2";
const DEMO_LOCAL_PRODUCTS_KEY = "apppromos_demo_local_products_v12_7_2";


const DEFAULT_DEMO_PRODUCTS = {
  asado_banderita: { nombre: "Asado Banderita", rubro: "Novillo", subrubro: "Parrilla", precio: 15990, unidad: "kg" },
  asado_costilla: { nombre: "Asado Costilla", rubro: "Novillo", subrubro: "Parrilla", precio: 14990, unidad: "kg" },
  vacio: { nombre: "Vacío", rubro: "Novillo", subrubro: "Parrilla", precio: 18990, unidad: "kg" },
  matambre: { nombre: "Matambre", rubro: "Novillo", subrubro: "Parrilla", precio: 16990, unidad: "kg" },
  tapa_asado: { nombre: "Tapa de Asado", rubro: "Novillo", subrubro: "Parrilla", precio: 13990, unidad: "kg" },
  entrana: { nombre: "Entraña", rubro: "Novillo", subrubro: "Parrilla", precio: 21990, unidad: "kg" },
  marucha: { nombre: "Marucha", rubro: "Novillo", subrubro: "Cocina", precio: 12990, unidad: "kg" },
  paleta: { nombre: "Paleta", rubro: "Novillo", subrubro: "Cocina", precio: 11990, unidad: "kg" },
  roast_beef: { nombre: "Roast Beef", rubro: "Novillo", subrubro: "Cocina", precio: 10990, unidad: "kg" },
  osobuco: { nombre: "Osobuco", rubro: "Novillo", subrubro: "Cocina", precio: 7990, unidad: "kg" },
  bola_lomo: { nombre: "Bola de Lomo", rubro: "Novillo", subrubro: "Milanesa", precio: 14990, unidad: "kg" },
  nalga: { nombre: "Nalga", rubro: "Novillo", subrubro: "Milanesa", precio: 15990, unidad: "kg" },
  cuadrada: { nombre: "Cuadrada", rubro: "Novillo", subrubro: "Milanesa", precio: 14990, unidad: "kg" },
  peceto: { nombre: "Peceto", rubro: "Novillo", subrubro: "Especial", precio: 18990, unidad: "kg" },
  bife_ancho: { nombre: "Bife Ancho", rubro: "Novillo", subrubro: "Bifes", precio: 19990, unidad: "kg" },
  bife_angosto: { nombre: "Bife Angosto", rubro: "Novillo", subrubro: "Bifes", precio: 20990, unidad: "kg" },
  colita_cuadril: { nombre: "Colita de Cuadril", rubro: "Novillo", subrubro: "Especial", precio: 17990, unidad: "kg" },
  lomo: { nombre: "Lomo", rubro: "Novillo", subrubro: "Especial", precio: 25990, unidad: "kg" },

  bondiola: { nombre: "Bondiola", rubro: "Cerdo", subrubro: "Parrilla", precio: 9990, unidad: "kg" },
  pechito_cerdo: { nombre: "Pechito de Cerdo", rubro: "Cerdo", subrubro: "Parrilla", precio: 8990, unidad: "kg" },
  matambrito_cerdo: { nombre: "Matambrito de Cerdo", rubro: "Cerdo", subrubro: "Parrilla", precio: 11990, unidad: "kg" },
  costeleta_cerdo: { nombre: "Costeleta de Cerdo", rubro: "Cerdo", subrubro: "Bifes", precio: 7990, unidad: "kg" },
  carre_cerdo: { nombre: "Carré de Cerdo", rubro: "Cerdo", subrubro: "Bifes", precio: 8990, unidad: "kg" },
  bife_tocino: { nombre: "Bife Tocino", rubro: "Cerdo", subrubro: "Bifes", precio: 7490, unidad: "kg" },
  pulpa_cerdo: { nombre: "Pulpa de Cerdo", rubro: "Cerdo", subrubro: "Cocina", precio: 8490, unidad: "kg" },

  pata_muslo: { nombre: "Pata Muslo", rubro: "Pollo", subrubro: "Fresco", precio: 3990, unidad: "kg" },
  suprema: { nombre: "Suprema", rubro: "Pollo", subrubro: "Fresco", precio: 9990, unidad: "kg" },
  alitas: { nombre: "Alitas", rubro: "Pollo", subrubro: "Fresco", precio: 4490, unidad: "kg" },
  filet_pollo: { nombre: "Filet de Pollo", rubro: "Pollo", subrubro: "Fresco", precio: 9490, unidad: "kg" },
  milanesa_pollo: { nombre: "Milanesa de pollo", rubro: "Pollo", subrubro: "Preparado", precio: 8990, unidad: "kg" },

  chinchulin: { nombre: "Chinchulín", rubro: "Achuras", subrubro: "Parrilla", precio: 5990, unidad: "kg" },
  molleja: { nombre: "Molleja", rubro: "Achuras", subrubro: "Parrilla", precio: 18990, unidad: "kg" },
  rinon: { nombre: "Riñón", rubro: "Achuras", subrubro: "Parrilla", precio: 4990, unidad: "kg" },
  higado: { nombre: "Hígado", rubro: "Achuras", subrubro: "Fresco", precio: 3990, unidad: "kg" },

  chorizos: { nombre: "Chorizos", rubro: "Elaborados", subrubro: "Parrilla", precio: 6990, unidad: "kg" },
  morcilla: { nombre: "Morcilla", rubro: "Elaborados", subrubro: "Parrilla", precio: 4990, unidad: "kg" },
  picada_comun: { nombre: "Picada común", rubro: "Elaborados", subrubro: "Picada", precio: 6990, unidad: "kg" },
  picada_especial: { nombre: "Picada especial", rubro: "Elaborados", subrubro: "Picada", precio: 8990, unidad: "kg" },
  milanesa_ternera: { nombre: "Milanesa de carne", rubro: "Elaborados", subrubro: "Milanesa", precio: 13990, unidad: "kg" },
  carne_empanadas: { nombre: "Carne para Empanadas", rubro: "Elaborados", subrubro: "Cocina", precio: 8990, unidad: "kg" },
  albondigas: { nombre: "Albóndigas", rubro: "Elaborados", subrubro: "Preparado", precio: 8990, unidad: "kg" }
};

function buildDefaultDemoProducts() {
  const now = new Date().toISOString();
  return Object.entries(DEFAULT_DEMO_PRODUCTS).map(([productKey, product]) => ({
    id: productKey,
    productKey,
    nombre: product.nombre,
    rubro: product.rubro,
    subrubro: product.subrubro || "",
    precio: Number(product.precio || 0),
    unidad: product.unidad || "kg",
    active: true,
    activo: true,
    isDemoPreloaded: true,
    source: "v12_7_2_demo_fuerte_products",
    createdAt: now,
    updatedAt: now
  }));
}

function isWeakDemoProductList(products) {
  if (!Array.isArray(products)) return true;
  const active = products.filter((product) => product && product.active !== false && product.activo !== false);
  if (active.length < 20) return true;

  const names = active.map((product) => String(product.nombre || "").toLowerCase());
  if (names.some((name) => name.includes("pollo entero") || name.includes("hamburgues"))) return true;

  return false;
}

function mergeDemoProducts(baseProducts = [], overrideProducts = []) {
  const byId = new Map();

  baseProducts.forEach((product) => {
    const id = String(product.productKey || product.id || "").trim();
    if (id) byId.set(id, product);
  });

  (Array.isArray(overrideProducts) ? overrideProducts : []).forEach((product) => {
    const id = String(product.productKey || product.id || "").trim();
    const name = String(product.nombre || "").toLowerCase();
    if (!id || name.includes("pollo entero") || name.includes("hamburgues")) return;

    if (byId.has(id)) {
      byId.set(id, {
        ...byId.get(id),
        ...product,
        id,
        productKey: id,
        precio: Number(product.precio ?? byId.get(id).precio ?? 0),
        active: product.active !== false && product.activo !== false,
        activo: product.activo !== false && product.active !== false
      });
    }
  });

  return Array.from(byId.values());
}

function getStrongDemoProducts(rawProducts = [], localProducts = null) {
  const base = buildDefaultDemoProducts();

  if (Array.isArray(localProducts) && !isWeakDemoProductList(localProducts)) {
    return mergeDemoProducts(base, localProducts);
  }

  if (Array.isArray(rawProducts) && !isWeakDemoProductList(rawProducts)) {
    return mergeDemoProducts(base, rawProducts);
  }

  return base;
}

const DEFAULT_DEMO_COMBO_DEFINITIONS = [
  {
    id: "demo_combo_parrillera_hoy",
    name: "Promo Parrillera de Hoy",
    description: "Ideal para prender la parrilla sin dar vueltas.",
    items: [
      ["asado_banderita", 2],
      ["chorizos", 1],
      ["morcilla", 1]
    ]
  },
  {
    id: "demo_combo_familiar",
    name: "Combo Familiar",
    description: "Para resolver el asado familiar del finde.",
    items: [
      ["asado_costilla", 2],
      ["vacio", 1],
      ["chorizos", 1]
    ]
  },
  {
    id: "demo_combo_economico",
    name: "Combo Económico",
    description: "Buena compra para llenar la heladera.",
    items: [
      ["picada_comun", 2],
      ["milanesa_ternera", 1],
      ["chorizos", 1]
    ]
  },
  {
    id: "demo_promo_finde",
    name: "Promo para el Finde",
    description: "Una promo fuerte para compartir.",
    items: [
      ["vacio", 1.5],
      ["matambre", 1],
      ["chorizos", 1]
    ]
  },
  {
    id: "demo_combo_mila_express",
    name: "Combo Mila Express",
    description: "Para resolver comidas rápidas de la semana.",
    items: [
      ["milanesa_ternera", 2],
      ["milanesa_pollo", 1],
      ["suprema", 1]
    ]
  },
  {
    id: "demo_combo_parrilla_completa",
    name: "Combo Parrilla Completa",
    description: "Todo listo para una parrillada completa.",
    items: [
      ["asado_banderita", 2],
      ["chorizos", 1],
      ["morcilla", 1],
      ["chinchulin", 1]
    ]
  },
  {
    id: "demo_combo_achuras",
    name: "Combo Achuras",
    description: "Para los que arrancan el asado con todo.",
    items: [
      ["chinchulin", 1],
      ["molleja", 0.5],
      ["rinon", 1],
      ["chorizos", 1]
    ]
  },
  {
    id: "demo_combo_salvaventas",
    name: "Combo Salvaventas",
    description: "Promo especial hasta agotar stock.",
    items: [
      ["marucha", 1],
      ["picada_comun", 1],
      ["chorizos", 1]
    ]
  }
];

function isDemoRuntime(businessId = null) {
  const id = String(businessId || getCurrentBusinessId() || "").trim();

  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("demo") === "1" || params.get("mode") === "demo") {
      return true;
    }
  } catch (error) {
    // No rompe si URLSearchParams/window no está disponible.
  }

  return id === "demo";
}


const DEMO_SAFE_PRICE_MESSAGE = "Estás probando AppPromos. Estos cambios quedan solo en esta demo.";

export function isDemoMode(businessId = null) {
  return isDemoRuntime(businessId);
}

function installDemoSafeUiGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const shouldRun = () => {
    try {
      return isDemoRuntime();
    } catch (error) {
      return false;
    }
  };

  const rewriteDemoAccessMessages = () => {
    if (!shouldRun()) return;

    const roots = [
      document.getElementById("pricesPanel"),
      document.querySelector("[data-panel-root='prices']"),
      document.body
    ].filter(Boolean);

    const seen = new Set();

    roots.forEach((root) => {
      if (seen.has(root)) return;
      seen.add(root);

      root.querySelectorAll("button, p, span, div, strong, small").forEach((el) => {
        const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
        if (!text || text.length > 220) return;

        const looksLikeDemoBlocker =
          /para guardar/i.test(text) &&
          (/ponete al d[ií]a/i.test(text) || /estado de cuenta/i.test(text));

        if (!looksLikeDemoBlocker) return;

        if (el.tagName === "BUTTON") {
          el.textContent = "Guardar cambios de prueba";
          el.title = DEMO_SAFE_PRICE_MESSAGE;
        } else {
          el.textContent = DEMO_SAFE_PRICE_MESSAGE;
          el.setAttribute("data-demo-safe-message", "true");
          el.style.borderColor = "#93c5fd";
          el.style.background = "#eff6ff";
          el.style.color = "#1d4ed8";
        }
      });

      root.querySelectorAll("button, input, select, textarea").forEach((el) => {
        const text = String(el.textContent || el.value || "").replace(/\s+/g, " ").trim();
        const isDemoSaveControl =
          el.matches("[data-save], [data-demo-save]") ||
          /guardar/i.test(text) ||
          el.getAttribute("aria-label")?.toLowerCase().includes("guardar") ||
          el.title?.toLowerCase().includes("guardar");

        if (isDemoSaveControl) {
          el.disabled = false;
          el.removeAttribute("disabled");
          el.removeAttribute("aria-disabled");
        }
      });
    });
  };

  const start = () => {
    rewriteDemoAccessMessages();
    setTimeout(rewriteDemoAccessMessages, 250);
    setTimeout(rewriteDemoAccessMessages, 1000);

    try {
      const observer = new MutationObserver(() => rewriteDemoAccessMessages());
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (error) {
      window.setInterval(rewriteDemoAccessMessages, 1500);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

installDemoSafeUiGuard();

function readJsonFromLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.warn("No se pudo leer localStorage:", key, error);
    return fallback;
  }
}

function writeJsonToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("No se pudo escribir localStorage:", key, error);
  }
}

function readLocalDemoCombos() {
  const parsed = readJsonFromLocalStorage(DEMO_LOCAL_COMBOS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeLocalDemoCombos(combos) {
  writeJsonToLocalStorage(DEMO_LOCAL_COMBOS_KEY, Array.isArray(combos) ? combos : []);
}

function readLocalDemoProducts() {
  const parsed = readJsonFromLocalStorage(DEMO_LOCAL_PRODUCTS_KEY, null);
  return Array.isArray(parsed) ? parsed : null;
}

function writeLocalDemoProducts(products) {
  writeJsonToLocalStorage(DEMO_LOCAL_PRODUCTS_KEY, Array.isArray(products) ? products : []);
}

function buildDefaultDemoCombo(definition) {
  const now = new Date().toISOString();
  const items = definition.items.map(([productKey, cantidad]) => {
    const product = DEFAULT_DEMO_PRODUCTS[productKey];
    const qty = Number(cantidad || 1);
    const price = Number(product?.precio || 0);

    return {
      productKey,
      nombre: product?.nombre || productKey,
      rubro: product?.rubro || "",
      unidad: product?.unidad || "kg",
      cantidad: qty,
      precio: price,
      subtotal: price * qty
    };
  });

  const total = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    items,
    total,
    isDemoPreloaded: true,
    source: "v12_7_2_demo_fuerte_fallback",
    createdAt: now,
    updatedAt: now
  };
}

function getDefaultDemoPreloadedCombos() {
  return DEFAULT_DEMO_COMBO_DEFINITIONS.map(buildDefaultDemoCombo);
}

function mergeDemoCombos(remoteCombos = [], localCombos = []) {
  const seen = new Set();
  const defaultCombos = getDefaultDemoPreloadedCombos();

  return [...localCombos, ...remoteCombos, ...defaultCombos].filter((combo) => {
    const id = combo?.id || `${combo?.name || "combo"}-${combo?.createdAt || "sin_fecha"}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeProducts(rawProducts = []) {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts.map((item, index) => ({
    id: item.id ?? item.productKey ?? `item-${index}`,
    productKey: item.productKey ?? item.id ?? `item-${index}`,
    nombre: item.nombre ?? "",
    rubro: item.rubro ?? "",
    subrubro: item.subrubro ?? "",
    precio: Number(item.precio ?? 0),
    unidad: item.unidad ?? "kg",
    active: item.active !== false,
    raw: item,
  }));
}

function getProductIdentity(product = {}) {
  return String(product.id ?? product.productKey ?? product.productId ?? "").trim();
}

function normalizeBatchUpdates(updates) {
  const map = new Map();

  if (Array.isArray(updates)) {
    updates.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const id = String(item.id ?? item.productKey ?? item.productId ?? "").trim();
      const price = Number(item.precio ?? item.price ?? item.newPrice ?? item.value ?? 0);
      if (id && Number.isFinite(price) && price > 0) {
        map.set(id, price);
      }
    });
    return map;
  }

  if (updates && typeof updates === "object") {
    Object.entries(updates).forEach(([id, value]) => {
      const price = Number(
        typeof value === "object" && value !== null
          ? value.precio ?? value.price ?? value.newPrice ?? value.value ?? 0
          : value
      );
      if (id && Number.isFinite(price) && price > 0) {
        map.set(String(id), price);
      }
    });
  }

  return map;
}

function applyPriceUpdateMap(products = [], updateMap = new Map()) {
  let changed = 0;

  const updatedProducts = products.map((product) => {
    const id = getProductIdentity(product);
    const productKey = String(product.productKey ?? "").trim();
    const price = updateMap.get(id) ?? updateMap.get(productKey);

    if (price === undefined) return product;

    changed += 1;
    return {
      ...product,
      precio: Number(price),
      updatedAt: new Date().toISOString(),
    };
  });

  return { updatedProducts, changed };
}

/**
 * Carga datos activos.
 * En demo, mezcla combos precargados de Firebase con combos locales de la sesión.
 * También respeta precios/productos editados localmente para no pisar la empresa demo.
 */
export async function loadActiveBusinessData(providedBusinessId = null) {
  const businessId = providedBusinessId || getCurrentBusinessId();

  if (!businessId) {
    throw new Error("loadActiveBusinessData: businessId no disponible");
  }

  const payload = await openBusiness(businessId);

  if (!payload) {
    throw new Error("openBusiness devolvió vacío");
  }

  const meta = payload.meta ?? null;
  const rawState = payload.state ?? null;

  if (!meta) {
    throw new Error("No existe meta para la empresa: " + businessId);
  }

  if (!rawState) {
    throw new Error("No existe state para la empresa: " + businessId);
  }

  const demoMode = isDemoRuntime(payload.businessId ?? businessId);
  const localDemoProducts = demoMode ? readLocalDemoProducts() : null;

  const state = demoMode
    ? {
        ...rawState,
        products: getStrongDemoProducts(rawState.products || [], localDemoProducts),
        savedCombos: mergeDemoCombos(rawState.savedCombos || [], readLocalDemoCombos()),
      }
    : rawState;

  const activePriceListId =
    state.activePriceListId ??
    meta.activePriceListId ??
    null;

  const products = normalizeProducts(state.products ?? []);

  return {
    businessId: payload.businessId ?? businessId,
    meta,
    state,
    activePriceListId,
    products,
    rawPayload: payload,
  };
}

export async function debugLoadActiveBusinessData(providedBusinessId = null) {
  const data = await loadActiveBusinessData(providedBusinessId);

  console.log("Business activo:", data.businessId);
  console.log("Meta:", data.meta);
  console.log("State:", data.state);
  console.log("Lista activa:", data.activePriceListId);
  console.table(data.products);

  return data;
}

export async function updateProductPrice(productId, newPrice, businessId = null) {
  if (!productId) {
    throw new Error("updateProductPrice: productId requerido");
  }

  if (isNaN(newPrice) || Number(newPrice) <= 0) {
    throw new Error("updateProductPrice: precio inválido");
  }

  return updateProductPricesBatch({ [productId]: Number(newPrice) }, businessId);
}

/**
 * Compatibilidad para prices-module.js.
 * Permite guardar varios precios en lote.
 * En modo demo NO escribe en Firebase: guarda la lista editada en localStorage.
 */
export async function updateProductPricesBatch(updates = [], businessId = null) {
  const updateMap = normalizeBatchUpdates(updates);

  if (!updateMap.size) {
    console.warn("updateProductPricesBatch: no hay precios válidos para guardar", updates);
    return { updatedProducts: [], changed: 0, demo: isDemoRuntime(businessId) };
  }

  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};

  const currentProducts = Array.isArray(state.products)
    ? state.products
    : [];

  const { updatedProducts, changed } = applyPriceUpdateMap(currentProducts, updateMap);

  if (!changed) {
    console.warn("updateProductPricesBatch: ningún producto coincidió con los ids recibidos", Array.from(updateMap.keys()));
    return {
      businessId: finalBusinessId,
      updatedProducts: currentProducts,
      changed: 0,
      demo: isDemoRuntime(finalBusinessId),
    };
  }

  if (isDemoRuntime(finalBusinessId)) {
    writeLocalDemoProducts(updatedProducts);
    console.log("🧪 PRECIOS DEMO GUARDADOS LOCALMENTE:", {
      businessId: finalBusinessId,
      changed,
    });
    return {
      businessId: finalBusinessId,
      updatedProducts,
      changed,
      demo: true,
    };
  }

  await updateBusinessState(finalBusinessId, {
    products: updatedProducts,
  });

  console.log("💰 Precios actualizados en lote:", {
    businessId: finalBusinessId,
    changed,
  });

  return {
    businessId: finalBusinessId,
    updatedProducts,
    changed,
    demo: false,
  };
}

export async function createProduct(product, businessId = null) {
  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};

  const currentProducts = Array.isArray(state.products)
    ? state.products
    : [];

  const newProductId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newProduct = {
    id: newProductId,
    productKey: newProductId,
    nombre: product.nombre || "",
    rubro: product.rubro || "",
    subrubro: product.subrubro || "",
    precio: Number(product.precio || 0),
    unidad: product.unidad || "kg",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedProducts = [newProduct, ...currentProducts];

  if (isDemoRuntime(finalBusinessId)) {
    writeLocalDemoProducts(updatedProducts);
    console.log("🧪 PRODUCTO DEMO CREADO LOCALMENTE:", newProduct);
    return newProduct;
  }

  await updateBusinessState(finalBusinessId, {
    products: updatedProducts,
  });

  console.log("✅ Producto creado en:", finalBusinessId, newProduct);

  return newProduct;
}

export async function updateProduct(productId, updates = {}, businessId = null) {
  if (!productId) {
    throw new Error("updateProduct: productId requerido");
  }

  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};

  const currentProducts = Array.isArray(state.products)
    ? state.products
    : [];

  let found = false;

  const updatedProducts = currentProducts.map((p) => {
    const id = p.id ?? p.productKey;

    if (id === productId) {
      found = true;
      return {
        ...p,
        ...updates,
        precio:
          updates.precio !== undefined
            ? Number(updates.precio || 0)
            : Number(p.precio || 0),
        updatedAt: new Date().toISOString(),
      };
    }

    return p;
  });

  if (!found) {
    console.warn("⚠️ Producto no encontrado para update:", productId);
    return false;
  }

  if (isDemoRuntime(finalBusinessId)) {
    writeLocalDemoProducts(updatedProducts);
    console.log("🧪 PRODUCTO DEMO ACTUALIZADO LOCALMENTE:", productId);
    return true;
  }

  await updateBusinessState(finalBusinessId, {
    products: updatedProducts,
  });

  return true;
}

export async function disableProduct(productId, businessId = null) {
  return updateProduct(productId, { active: false }, businessId);
}

export async function saveCombo(combo, businessId = null) {
  if (!combo || !combo.name || !Array.isArray(combo.items)) {
    throw new Error("saveCombo: combo inválido");
  }

  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};

  const newCombo = {
    id: `combo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: combo.name,
    description: combo.description || "Oferta creada en modo prueba.",
    items: combo.items,
    total: Number(combo.total || 0),
    isDemoLocal: isDemoRuntime(finalBusinessId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isDemoRuntime(finalBusinessId)) {
    const localCombos = readLocalDemoCombos();
    const updatedLocalCombos = [newCombo, ...localCombos];
    writeLocalDemoCombos(updatedLocalCombos);

    console.log("🧪 COMBO DEMO GUARDADO LOCALMENTE:", {
      businessId: finalBusinessId,
      combo: newCombo,
    });

    return newCombo;
  }

  const currentSavedCombos = Array.isArray(state.savedCombos)
    ? state.savedCombos
    : [];

  const updatedCombos = [newCombo, ...currentSavedCombos];

  await updateBusinessState(finalBusinessId, {
    savedCombos: updatedCombos,
  });

  console.log("🔥 GUARDADO EN FIREBASE:", {
    businessId: finalBusinessId,
    combo: newCombo,
  });

  return newCombo;
}

export async function validateBusinessExists(businessId) {
  if (!businessId) {
    throw new Error("validateBusinessExists: businessId requerido");
  }

  try {
    const data = await loadActiveBusinessData(businessId);
    return data && data.businessId === businessId;
  } catch (error) {
    console.error("❌ Empresa no válida:", businessId, error.message);
    return false;
  }
}

export async function getSavedCombos(businessId = null) {
  const data = await loadActiveBusinessData(businessId);
  return Array.isArray(data.state.savedCombos) ? data.state.savedCombos : [];
}

export async function getProducts(businessId = null) {
  const data = await loadActiveBusinessData(businessId);
  return data.products || [];
}
