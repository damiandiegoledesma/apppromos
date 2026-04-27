import {
  getActiveBusinessId as getFirebaseActiveBusinessId,
  setActiveBusinessId as setFirebaseActiveBusinessId,
  getBusinessMetaPath,
  getBusinessStatePath,
  readPath,
  writePath,
  readCollection
} from "../core/firebase-core.js";

import {
  resolveSession,
  validateUserCanAccessBusiness
} from "./auth-service.js";

import {
  hasBusinessInStore,
  getBusinessStore,
  setBusinessStore,
  patchBusinessStore,
  resetBusinessStore,
  startAppSession
} from "./business-store.js";

import {
  loadBusinessCache,
  saveBusinessCache
} from "./cache-service.js";

import { saveMarketSnapshot } from "./market-snapshots-service.js";
import { assertBusinessCanWrite } from "./write-guard-service.js";

const STORAGE_KEY = "activeBusinessId";
const DEFAULT_ID = "demo";

export async function getResolvedBusinessId() {
  const session = await resolveSession();

  if (session.appMode === "client") {
    return session.businessId;
  }

  if (session.appMode === "superadmin") {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local && local.trim()) return local;
    } catch (e) {
      console.warn("localStorage read error", e);
    }

    const firebaseId = getFirebaseActiveBusinessId();
    return firebaseId || DEFAULT_ID;
  }

  return DEFAULT_ID;
}

export function getActiveBusinessId() {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local && local.trim()) {
      return local;
    }
  } catch (e) {
    console.warn("localStorage read error", e);
  }

  const firebaseId = getFirebaseActiveBusinessId();
  return firebaseId || DEFAULT_ID;
}

export async function setActiveBusinessId(id) {
  const session = await resolveSession().catch(() => ({
    appMode: "guest",
    businessId: null
  }));

  const cleanId = String(id || "").trim();

  if (!cleanId) {
    throw new Error("setActiveBusinessId: id inválido");
  }

  if (session.appMode === "client") {
    if (session.businessId !== cleanId) {
      throw new Error("Cliente no puede cambiar empresa");
    }
    return cleanId;
  }

  try {
    localStorage.setItem(STORAGE_KEY, cleanId);
  } catch (e) {
    console.warn("localStorage write error", e);
  }

  setFirebaseActiveBusinessId(cleanId);
  resetBusinessStore(cleanId);
  return cleanId;
}

export async function listBusinesses() {
  const session = await resolveSession().catch(() => ({
    appMode: "guest"
  }));

  if (session.appMode !== "superadmin") {
    return [];
  }

  const businessDocs = await readCollection("businesses");

  const businesses = await Promise.all(
    businessDocs.map(async (docSnap) => {
      const rootData = docSnap.data || {};
      const businessId = docSnap.id;

      let meta = null;
      try {
        meta = await readPath(getBusinessMetaPath(businessId));
      } catch (error) {
        console.warn(`No se pudo leer meta de ${businessId}`, error);
      }

      return {
        businessId,
        id: businessId,
        name: meta?.name || rootData?.name || businessId,
        status: rootData?.status || meta?.status || "active",
        ownerUid: rootData?.ownerUid || null,
        createdAt: meta?.createdAt || rootData?.createdAt || null,
        updatedAt: meta?.updatedAt || rootData?.updatedAt || null,
        direccion: meta?.direccion || "",
        telefono: meta?.telefono || "",
        ciudad: meta?.ciudad || "",
        meta
      };
    })
  );

  return businesses.sort((a, b) =>
    String(a.name || a.businessId).localeCompare(
      String(b.name || b.businessId),
      "es"
    )
  );
}

export async function openBusiness(businessId, options = {}) {
  if (!businessId || typeof businessId !== "string") {
    throw new Error("openBusiness: businessId inválido");
  }

  startAppSession(businessId);

  const forceRemote = options.forceRemote === true;
  if (!forceRemote && hasBusinessInStore(businessId)) {
    return getBusinessStore(businessId);
  }

  const hasAccess = await validateUserCanAccessBusiness(businessId);
  if (!hasAccess) {
    throw new Error(`Acceso denegado a empresa: ${businessId}`);
  }

  const session = await resolveSession().catch(() => ({
    appMode: "guest"
  }));

  if (session.appMode === "superadmin" || businessId === "demo") {
    try {
      localStorage.setItem(STORAGE_KEY, businessId);
    } catch (e) {
      console.warn("localStorage write error", e);
    }

    try {
      setFirebaseActiveBusinessId(businessId);
    } catch (e) {
      console.warn("firebase-core setActiveBusinessId error", e);
    }
  }

  if (!forceRemote) {
    const cached = loadBusinessCache(businessId);
    if (cached?.meta && cached?.state) {
      return setBusinessStore({ businessId, meta: cached.meta, state: cached.state }, { source: "localStorage" });
    }
  }

  const [meta, state] = await Promise.all([
    readPath(getBusinessMetaPath(businessId)),
    readPath(getBusinessStatePath(businessId))
  ]);

  if (!meta) {
    throw new Error(`Empresa no existe: ${businessId}`);
  }

  if (!state) {
    throw new Error(`Estado no encontrado para: ${businessId}`);
  }

  const payload = setBusinessStore({ businessId, meta, state }, { source: "firestore" });

  saveBusinessCache(businessId, {
    meta,
    state,
    products: Array.isArray(state.products) ? state.products : []
  });

  return payload;
}

export async function openDemoBusiness() {
  return openBusiness("demo");
}

export function getCurrentBusinessId() {
  return getActiveBusinessId();
}

export function formatCurrency(amount) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function normalizeProductsFromState(state) {
  if (!state) return [];
  if (Array.isArray(state.products)) return state.products;
  return [];
}

export function normalizeSavedCombosFromState(state) {
  if (!state) return [];
  if (Array.isArray(state.savedCombos)) return state.savedCombos;
  return [];
}


export async function updateBusinessState(businessId, partialState) {
  if (!businessId || typeof businessId !== "string") {
    throw new Error("updateBusinessState: businessId requerido y debe ser string");
  }

  if (!partialState || typeof partialState !== "object") {
    throw new Error("updateBusinessState: partialState inválido");
  }

  await assertBusinessCanWrite(businessId, "guardar cambios");

  const cachedPayload = getBusinessStore(businessId) || loadBusinessCache(businessId) || {};
  const currentState = cachedPayload.state || {};

  const nextState = {
    ...currentState,
    ...partialState,
    updatedAt: new Date().toISOString()
  };

  await writePath(getBusinessStatePath(businessId), nextState);

  const currentMeta = cachedPayload.meta || null;
  if (currentMeta && Array.isArray(nextState.products)) {
    await saveMarketSnapshot(businessId, currentMeta, nextState);
  }
  if (currentMeta) {
    patchBusinessStore(businessId, { state: nextState });
    saveBusinessCache(businessId, {
      meta: currentMeta,
      state: nextState,
      products: Array.isArray(nextState.products) ? nextState.products : []
    });
  }

  console.log("✅ Estado actualizado para:", businessId);

  return nextState;
}

export async function getUserBusinesses() {
  const session = await resolveSession().catch(() => ({
    appMode: "guest"
  }));

  if (session.appMode === "guest") {
    return [{ businessId: "demo", name: "Demo" }];
  }

  if (session.appMode === "client") {
    try {
      const data = await openBusiness(session.businessId);
      return [{
        businessId: session.businessId,
        name: data.meta?.name || session.businessId
      }];
    } catch (error) {
      console.error("Error obteniendo empresa del cliente:", error);
      return [];
    }
  }

  try {
    return await listBusinesses();
  } catch (error) {
    console.error("Error obteniendo empresas:", error);
    return [];
  }
}
