import {
  getCurrentBusinessId,
  openBusiness,
  updateBusinessState
} from "./business-service.js";

import {
  loadBusinessCache,
  saveBusinessCache,
  patchCachedProducts
} from "./cache-service.js";

import {
  getBusinessStore,
  setBusinessStore,
  patchBusinessStore
} from "./business-store.js";

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

function buildDataResult(businessId, meta, state, rawPayload = {}, fromCache = false) {
  const products = normalizeProducts(state?.products ?? rawPayload?.products ?? []);
  return {
    businessId,
    meta,
    state,
    activePriceListId: state?.activePriceListId ?? meta?.activePriceListId ?? null,
    products,
    rawPayload,
    fromCache,
  };
}

export async function loadActiveBusinessData(providedBusinessId = null, options = {}) {
  const businessId = providedBusinessId || getCurrentBusinessId();

  if (!businessId) {
    throw new Error("loadActiveBusinessData: businessId no disponible");
  }

  const forceRemote = options.forceRemote === true;
  const useCache = options.useCache !== false;

  if (!forceRemote) {
    const memoryPayload = getBusinessStore(businessId);
    if (memoryPayload?.meta && memoryPayload?.state) {
      return buildDataResult(businessId, memoryPayload.meta, memoryPayload.state, memoryPayload, true);
    }
  }

  if (!forceRemote && useCache) {
    const cached = loadBusinessCache(businessId);
    if (cached?.meta && cached?.state) {
      setBusinessStore({ businessId, meta: cached.meta, state: cached.state }, { source: "localStorage" });
      return buildDataResult(businessId, cached.meta, cached.state, cached, true);
    }
  }

  const payload = await openBusiness(businessId, { forceRemote });

  if (!payload) {
    throw new Error("openBusiness devolvió vacío");
  }

  const meta = payload.meta ?? null;
  const state = payload.state ?? null;

  if (!meta) {
    throw new Error("No existe meta para la empresa: " + businessId);
  }

  if (!state) {
    throw new Error("No existe state para la empresa: " + businessId);
  }

  const result = buildDataResult(payload.businessId ?? businessId, meta, state, payload, false);

  saveBusinessCache(result.businessId, {
    meta,
    state,
    products: result.products
  });

  return result;
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

  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};
  const currentProducts = Array.isArray(state.products) ? state.products : [];

  let found = false;

  const updatedProducts = currentProducts.map((p) => {
    const id = p.id ?? p.productKey;

    if (id === productId) {
      found = true;
      return {
        ...p,
        precio: Number(newPrice),
        updatedAt: new Date().toISOString(),
      };
    }

    return p;
  });

  if (!found) {
    console.warn("⚠️ Producto no encontrado:", productId);
    return false;
  }

  await updateBusinessState(finalBusinessId, { products: updatedProducts });
  patchCachedProducts(finalBusinessId, updatedProducts);
  patchBusinessStore(finalBusinessId, { state: { products: updatedProducts } });

  console.log("💰 Precio actualizado:", {
    productId,
    newPrice,
    businessId: finalBusinessId,
  });

  return true;
}

export async function createProduct(product, businessId = null) {
  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};
  const currentProducts = Array.isArray(state.products) ? state.products : [];

  const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newProduct = {
    id: productId,
    productKey: productId,
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

  await updateBusinessState(finalBusinessId, { products: updatedProducts });
  patchCachedProducts(finalBusinessId, updatedProducts);
  patchBusinessStore(finalBusinessId, { state: { products: updatedProducts } });

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
  const currentProducts = Array.isArray(state.products) ? state.products : [];

  let found = false;

  const updatedProducts = currentProducts.map((p) => {
    const id = p.id ?? p.productKey;

    if (id === productId) {
      found = true;
      return {
        ...p,
        ...updates,
        precio: updates.precio !== undefined ? Number(updates.precio || 0) : Number(p.precio || 0),
        updatedAt: new Date().toISOString(),
      };
    }

    return p;
  });

  if (!found) {
    console.warn("⚠️ Producto no encontrado para update:", productId);
    return false;
  }

  await updateBusinessState(finalBusinessId, { products: updatedProducts });
  patchCachedProducts(finalBusinessId, updatedProducts);
  patchBusinessStore(finalBusinessId, { state: { products: updatedProducts } });

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
  const currentSavedCombos = Array.isArray(state.savedCombos) ? state.savedCombos : [];

  const newCombo = {
    id: `combo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: combo.name,
    items: combo.items,
    total: Number(combo.total || 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedCombos = [newCombo, ...currentSavedCombos];

  await updateBusinessState(finalBusinessId, { savedCombos: updatedCombos });
  patchBusinessStore(finalBusinessId, { state: { savedCombos: updatedCombos } });

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

export async function updateProductPricesBatch(changes = {}, businessId = null) {
  const cleanChanges = Object.fromEntries(
    Object.entries(changes || {}).filter(([productId, value]) => productId && !Number.isNaN(Number(value)) && Number(value) > 0)
  );

  const ids = Object.keys(cleanChanges);

  if (!ids.length) {
    return { ok: true, updatedProducts: [] };
  }

  const data = await loadActiveBusinessData(businessId);
  const finalBusinessId = data.businessId;
  const state = data.state || {};
  const currentProducts = Array.isArray(state.products) ? state.products : [];

  const updatedProducts = currentProducts.map((product) => {
    const id = product.id ?? product.productKey;
    if (!Object.prototype.hasOwnProperty.call(cleanChanges, id)) return product;

    return {
      ...product,
      precio: Number(cleanChanges[id]),
      updatedAt: new Date().toISOString(),
    };
  });

  await updateBusinessState(finalBusinessId, { products: updatedProducts });
  patchCachedProducts(finalBusinessId, updatedProducts);
  patchBusinessStore(finalBusinessId, { state: { products: updatedProducts } });

  return {
    ok: true,
    businessId: finalBusinessId,
    updatedProducts: normalizeProducts(updatedProducts),
    appliedChanges: cleanChanges,
  };
}
