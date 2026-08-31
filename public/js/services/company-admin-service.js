import {
  readPath,
  getBusinessMetaPath,
  getBusinessStatePath,
  db,
  trackedGetDocs
} from "../core/firebase-core.js";

import {
  buildBusinessSlug,
  getPhoneKey
} from "./web-premium-service.js";

import { createTrialEndsAt } from "./access-control-service.js";
import { buildBusinessIdentity } from "./normalization-service.js";
import { createStarterProducts, STARTER_CATALOG_VERSION } from "../data/starter-products.js";

import {
  collectionGroup,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function generateBusinessId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `biz_${timestamp}_${random}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTemplateProduct(product = {}, index = 0) {
  const productKey = String(product.productKey || product.id || `item_${index}`).trim();

  return {
    ...deepClone(product),
    id: product.id || productKey,
    productKey,
    nombre: String(product.nombre || product.name || "").trim(),
    rubro: String(product.rubro || product.category || "").trim(),
    subrubro: String(product.subrubro || "").trim(),
    unidad: String(product.unidad || "kg").trim(),
    precio: Number(product.precio ?? product.precioSugerido ?? product.price ?? 0),
    active: product.active !== false && product.activo !== false,
    activo: product.activo !== false,
    extraFields: product.extraFields || {}
  };
}

function generateCompanyMeta(companyData = {}, sourceType = "manual", metadata = {}) {
  const now = new Date().toISOString();
  const businessId = metadata.businessId || generateBusinessId();
  const identity = buildBusinessIdentity(companyData);

  return {
    businessId,
    name: String(companyData.nombre || companyData.name || "").trim(),
    businessName: String(companyData.nombre || companyData.name || "").trim(),
    displayName: String(companyData.nombre || companyData.name || "").trim(),
    direccion: identity.address,
    address: identity.address,
    ciudad: identity.locality,
    locality: identity.locality,
    localityKey: identity.localityKey,
    provincia: identity.province,
    province: identity.province,
    provinceId: identity.provinceId,
    telefono: identity.phone,
    phone: identity.phone,
    phoneE164: identity.phoneE164,
    phoneKey: identity.phoneKey,
    rawPhone: identity.rawPhone,
    ownerUid: metadata.ownerUid || null,
    createdAt: metadata.createdAt || now,
    activePriceListId: metadata.activePriceListId || "v1",
    sourceType,
    createdBy: metadata.createdBy || "admin",
    clonedFrom: metadata.clonedFrom || null,
    updatedAt: now
  };
}

function generateCompanyState(products = [], savedCombos = [], activePriceListId = "v1", web = null) {
  return {
    activePriceListId,
    products: Array.isArray(products) ? products : [],
    savedCombos: Array.isArray(savedCombos) ? savedCombos : [],
    dashboard: {},
    ...(web ? { web } : {}),
    updatedAt: new Date().toISOString()
  };
}

function ensureValidPhone(meta = {}) {
  const phoneKey = meta.phoneKey || getPhoneKey(meta.telefono || meta.phone || "");
  if (phoneKey.length < 8) {
    throw new Error("Teléfono / WhatsApp válido requerido");
  }
  return phoneKey;
}

async function ensurePhoneAvailable(phoneKey, businessId) {
  const existingPhone = await readPath(`publicPhoneKeys/${phoneKey}`);
  if (existingPhone?.businessId && existingPhone.businessId !== businessId) {
    throw new Error("Ese teléfono / WhatsApp ya está usado por otra empresa");
  }
}

async function loadStarterTemplate() {
  const products = createStarterProducts()
    .map((product, index) => normalizeTemplateProduct(product, index));

  return {
    originMeta: { activePriceListId: "v1", starterCatalogVersion: STARTER_CATALOG_VERSION },
    originState: { activePriceListId: "v1", starterCatalogVersion: STARTER_CATALOG_VERSION },
    products
  };
}

async function writeBusinessShell(meta, state) {
  const phoneKey = ensureValidPhone(meta);
  if (!meta.locality || !meta.province || !meta.provinceId) {
    throw new Error("Seleccioná una localidad válida para completar provincia automáticamente");
  }
  await ensurePhoneAvailable(phoneKey, meta.businessId);
  const slug = buildBusinessSlug(meta, meta.businessId);
  const now = new Date().toISOString();
  const stateWithWeb = {
    ...state,
    web: state.web || {
      enabled: false,
      slug,
      selectedOffers: [],
      showPriceList: false,
      visibleRubros: [],
      updatedAt: now
    },
    updatedAt: now
  };

  const batch = writeBatch(db);

  const billing = {
    status: "active",
    plan: "trial",
    trialStartedAt: now,
    trialEndsAt: createTrialEndsAt(),
    graceEndsAt: null,
    updatedAt: now,
    updatedBy: "system:company_admin"
  };

  const modules = {
    prices: true,
    competition: true,
    combos: true,
    offers: true,
    webPremium: true,
    whatsapp: true
  };

  batch.set(doc(db, "businesses", meta.businessId), {
    businessId: meta.businessId,
    name: meta.name,
    businessName: meta.businessName || meta.name,
    displayName: meta.displayName || meta.name,
    direccion: meta.direccion || "",
    address: meta.address || meta.direccion || "",
    ciudad: meta.ciudad || "",
    locality: meta.locality || meta.ciudad || "",
    localityKey: meta.localityKey || "",
    provincia: meta.provincia || "",
    province: meta.province || "",
    provinceId: meta.provinceId || "",
    telefono: meta.telefono || "",
    phone: meta.phone || meta.telefono || "",
    phoneE164: meta.phoneE164 || meta.phone || meta.telefono || "",
    phoneKey,
    rawPhone: meta.rawPhone || "",
    ownerUid: meta.ownerUid || null,
    status: "active",
    plan: "trial",
    active: true,
    isTestBusiness: false,
    isTemplateBusiness: false,
    createdBy: meta.createdBy || "admin",
    modules,
    billing,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt
  });

  batch.set(doc(db, ...getBusinessMetaPath(meta.businessId).split("/")), meta);
  batch.set(doc(db, ...getBusinessStatePath(meta.businessId).split("/")), stateWithWeb);
  batch.set(doc(db, "publicWebSlugs", slug), {
    businessId: meta.businessId,
    slug,
    businessName: meta.name || "",
    ownerUid: meta.ownerUid || null,
    phoneKey,
    active: false,
    plan: "web_premium",
    updatedAt: now
  });
  batch.set(doc(db, "publicPhoneKeys", phoneKey), {
    businessId: meta.businessId,
    phoneKey,
    active: true,
    updatedAt: now
  });

  await batch.commit();
}

export async function createCompanyFromBase(companyData = {}, metadata = {}) {
  const nombre = String(companyData.nombre || "").trim();
  const telefono = String(companyData.telefono || "").trim();

  if (!nombre) {
    throw new Error("Nombre de empresa requerido");
  }
  if (getPhoneKey(telefono).length < 8) {
    throw new Error("Teléfono / WhatsApp válido requerido");
  }

  const template = await loadStarterTemplate();

  const meta = generateCompanyMeta(companyData, "base", {
    ...metadata,
    clonedFrom: "starter-catalog",
    activePriceListId:
      metadata.activePriceListId ||
      template.originState.activePriceListId ||
      template.originMeta.activePriceListId ||
      "v1"
  });

  const state = generateCompanyState(
    template.products,
    [],
    meta.activePriceListId
  );

  await writeBusinessShell(meta, state);

  return {
    businessId: meta.businessId,
    meta,
    state
  };
}

export async function listAllCompanies() {
  try {
    const snap = await trackedGetDocs(collectionGroup(db, "core"), "collectionGroup:core");
    const companies = [];

    snap.forEach((docSnap) => {
      if (docSnap.id !== "meta") return;
      const data = docSnap.data() || {};
      if (!data.businessId) return;

      companies.push({
        businessId: data.businessId,
        name: data.name || data.businessId,
        direccion: data.direccion || "",
        ciudad: data.ciudad || "",
        telefono: data.telefono || "",
        createdAt: data.createdAt || null
      });
    });

    companies.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
    return companies;
  } catch (error) {
    console.error("Error en listAllCompanies:", error);
    return [];
  }
}

export async function cloneCompany(originBusinessId, companyData = {}, metadata = {}) {
  if (!originBusinessId || !String(originBusinessId).trim()) {
    throw new Error("ID de empresa origen requerido");
  }

  const nombre = String(companyData.nombre || "").trim();
  const telefono = String(companyData.telefono || "").trim();
  if (!nombre) {
    throw new Error("Nombre de nueva empresa requerido");
  }
  if (getPhoneKey(telefono).length < 8) {
    throw new Error("Teléfono / WhatsApp válido requerido");
  }

  const originMeta = await readPath(getBusinessMetaPath(originBusinessId));
  const originState = await readPath(getBusinessStatePath(originBusinessId));

  if (!originMeta || !originState) {
    throw new Error(`Empresa no encontrada: ${originBusinessId}`);
  }

  const newMeta = generateCompanyMeta(companyData, "clone", {
    clonedFrom: originBusinessId,
    ownerUid: metadata.ownerUid || null,
    activePriceListId:
      originState.activePriceListId ||
      originMeta.activePriceListId ||
      "v1"
  });

  const products = Array.isArray(originState.products)
    ? originState.products.map((p, index) => normalizeTemplateProduct({ ...p }, index))
    : [];

  const savedCombos = Array.isArray(originState.savedCombos)
    ? originState.savedCombos.map((c) => ({ ...deepClone(c) }))
    : [];

  const newState = generateCompanyState(products, savedCombos, newMeta.activePriceListId);

  await writeBusinessShell(newMeta, newState);

  return {
    businessId: newMeta.businessId,
    meta: newMeta,
    state: newState
  };
}

export function validateCompanyName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = String(name).trim();
  return trimmed.length >= 3 && trimmed.length <= 100;
}
