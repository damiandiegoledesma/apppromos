import {
  db,
  doc,
  writeBatch,
  getBusinessMetaPath,
  getBusinessStatePath,
  readPath
} from "../core/firebase-core.js";

import { getBusinessStore, patchBusinessStore } from "./business-store.js";
import { loadBusinessCache, saveBusinessCache } from "./cache-service.js";
import { assertBusinessCanWrite } from "./write-guard-service.js";

export function normalizeSlug(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `web-${Date.now()}`;
}


export function buildPublicBusinessName(value = "") {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  const withoutPrefix = clean.replace(/^(carnicer[ií]a\s*)+/i, "").trim();
  const base = withoutPrefix || clean || "Carnicería";
  if (/^carnicer[ií]a\b/i.test(base)) {
    return base.trim().replace(/\s+/g, " ");
  }
  return `Carnicería ${base}`.trim().replace(/\s+/g, " ");
}

export function getPhoneKey(phone = "") {
  let digits = String(phone || "").replace(/\D/g, "");

  // Normalización canónica para comparar teléfonos aunque el usuario los escriba distinto.
  digits = digits.replace(/^00+/, "");

  if (digits.startsWith("54") && digits.length > 10) {
    digits = digits.slice(2);
  }

  // Móviles argentinos con 9 después del código país: +54 9 3462... => 3462...
  if (digits.startsWith("9") && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Quitar 0 inicial de característica: 03462... => 3462...
  digits = digits.replace(/^0+/, "");

  return digits;
}

export function formatPhoneForSlug(phone = "") {
  const clean = getPhoneKey(phone);
  if (clean.length < 8) return "";

  if (clean.length === 10) {
    if (clean.startsWith("11")) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }

  if (clean.length === 9) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return clean;
}

export function buildBusinessSlug(meta = {}, businessId = "") {
  const publicName = buildPublicBusinessName(meta.name || meta.nombre || businessId);
  const nameSlug = normalizeSlug(publicName || businessId);
  const phoneSlug = formatPhoneForSlug(meta.telefono || meta.phone || "");
  if (!phoneSlug) {
    throw new Error("Teléfono / WhatsApp válido requerido para generar el link público");
  }
  return normalizeSlug(`${nameSlug}-${phoneSlug}`);
}

function pathDoc(path) {
  return doc(db, ...String(path).split("/").filter(Boolean));
}

export function buildDefaultWebConfig(meta = {}, businessId = "") {
  let slug = "";
  try {
    slug = buildBusinessSlug(meta, businessId);
  } catch {
    // Compatibilidad para empresas viejas sin teléfono válido.
    slug = normalizeSlug(meta.name || meta.nombre || businessId);
  }

  return {
    enabled: false,
    slug,
    selectedOffers: [],
    showPriceList: false,
    visibleRubros: [],
    updatedAt: new Date().toISOString()
  };
}


export function buildStarterWebConfig(meta = {}, businessId = "", now = new Date().toISOString()) {
  const slug = buildBusinessSlug(meta, businessId);
  return {
    enabled: true,
    published: true,
    active: true,
    mode: "starter",
    priceListStatus: "pending_real_prices",
    offersStatus: "empty",
    slug,
    publicUrl: getPublicWebUrl(businessId, slug),
    selectedOffers: [],
    showPriceList: false,
    visibleRubros: [],
    createdFrom: "registration_auto",
    createdAt: now,
    updatedAt: now
  };
}


function toPublicText(value = "") {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function publicNumber(value = 0) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validPublicPrice(product = {}) {
  const price = publicNumber(product?.precio ?? product?.price ?? 0);
  return price > 0;
}

function comboPublicTotal(combo = {}) {
  return publicNumber(
    combo?.total ??
    combo?.finalTotal ??
    combo?.snapshot?.totals?.total_redondeado ??
    combo?.snapshot?.totals?.total ??
    combo?.price ??
    combo?.precio ??
    0
  );
}

function sanitizePublicOffer(combo = {}) {
  const id = toPublicText(combo.id || combo.comboId || combo.name || combo.nombre);
  const name = toPublicText(combo.name || combo.nombre || "Oferta");
  const total = comboPublicTotal(combo);
  const items = Array.isArray(combo.items) ? combo.items : [];

  return {
    id,
    name,
    total,
    items: items.map((item = {}) => ({
      nombre: toPublicText(item.nombre || item.name || "Producto"),
      rubro: toPublicText(item.rubro || item.category || ""),
      cantidad: publicNumber(item.cantidad ?? item.qty ?? 1) || 1,
      unidad: toPublicText(item.unidad || item.unit || "kg") || "kg"
    })).filter((item) => item.nombre)
  };
}

function sanitizePublicProduct(product = {}) {
  const price = publicNumber(product.precio ?? product.price ?? 0);
  return {
    id: toPublicText(product.id || product.productId || product.nombre || product.name),
    nombre: toPublicText(product.nombre || product.name || "Producto"),
    rubro: toPublicText(product.rubro || product.category || "Sin rubro") || "Sin rubro",
    precio: price
  };
}

export function buildPublicWebPayload({
  businessId = "",
  slug = "",
  meta = {},
  state = {},
  web = {},
  phoneKey = "",
  plan = "web_premium",
  createdFrom = "web_config",
  updatedAt = new Date().toISOString()
} = {}) {
  const publicName = buildPublicBusinessName(
    web?.publicDisplayName ||
    meta?.publicDisplayName ||
    meta?.publicName ||
    meta?.name ||
    meta?.nombre ||
    meta?.businessName ||
    "Carnicería"
  );
  const cleanSlug = normalizeSlug(slug || web?.slug || "");
  const cleanPhoneKey = getPhoneKey(phoneKey || meta?.phoneKey || meta?.telefono || meta?.phone || "");
  const mode = toPublicText(web?.mode || "web_premium") || "web_premium";
  const priceListStatus = toPublicText(web?.priceListStatus || "");
  const isStarter = mode === "starter" || priceListStatus === "pending_real_prices";
  const canShowRealPrices = !isStarter && (!priceListStatus || priceListStatus === "confirmed" || priceListStatus === "ready");
  const selected = new Set(Array.isArray(web?.selectedOffers) ? web.selectedOffers.map(String) : []);
  const visibleRubros = new Set(Array.isArray(web?.visibleRubros) ? web.visibleRubros.map((r) => toPublicText(r)).filter(Boolean) : []);
  const savedCombos = Array.isArray(state?.savedCombos) ? state.savedCombos : [];
  const publicOffers = isStarter ? [] : savedCombos
    .filter((combo = {}) => selected.has(String(combo.id || combo.comboId || "")))
    .map(sanitizePublicOffer)
    .filter((combo) => combo.name && combo.items.length);

  const publicProducts = (web?.showPriceList && canShowRealPrices)
    ? (Array.isArray(state?.products) ? state.products : [])
      .filter((product = {}) => product.active !== false && validPublicPrice(product))
      .map(sanitizePublicProduct)
      .filter((product) => product.nombre && (!visibleRubros.size || visibleRubros.has(product.rubro)))
      .sort((a, b) => String(a.rubro).localeCompare(String(b.rubro), "es") || String(a.nombre).localeCompare(String(b.nombre), "es"))
    : [];

  return {
    businessId,
    slug: cleanSlug,
    active: Boolean(web?.enabled) && web?.active !== false && web?.published !== false && meta?.webPremiumEnabled !== false,
    enabled: Boolean(web?.enabled),
    published: web?.published !== false,
    mode,
    priceListStatus,
    offersStatus: publicOffers.length ? "ready" : (web?.offersStatus || "empty"),
    plan,
    createdFrom,
    businessName: publicName,
    publicDisplayName: publicName,
    address: toPublicText(meta?.direccion || meta?.address || ""),
    city: toPublicText(meta?.localidad || meta?.ciudad || meta?.city || meta?.locality || ""),
    province: toPublicText(meta?.provincia || meta?.province || ""),
    phone: toPublicText(meta?.telefono || meta?.phone || ""),
    phoneKey: cleanPhoneKey,
    whatsapp: cleanPhoneKey,
    showPriceList: Boolean(web?.showPriceList) && canShowRealPrices,
    visibleRubros: [...visibleRubros],
    publicOffers,
    publicProducts,
    publicUrl: getPublicWebUrl(businessId, cleanSlug),
    updatedAt
  };
}

export async function setWebPremiumEnabled(businessId, enabled) {
  if (!businessId) throw new Error("businessId requerido");
  await assertBusinessCanWrite(businessId, "activar o desactivar Web Premium");
  const metaPath = getBusinessMetaPath(businessId);
  const currentMeta = await readPath(metaPath);
  if (!currentMeta) throw new Error("No existe meta para " + businessId);
  const nextMeta = {
    ...currentMeta,
    webPremiumEnabled: Boolean(enabled),
    webPremiumUpdatedAt: new Date().toISOString()
  };

  const batch = writeBatch(db);
  batch.set(pathDoc(metaPath), nextMeta);
  await batch.commit();
  return nextMeta;
}

export async function loadWebConfig(businessId, preloaded = null) {
  const cachedPayload = preloaded || getBusinessStore(businessId) || loadBusinessCache(businessId) || {};
  let meta = cachedPayload.meta || null;
  let state = cachedPayload.state || null;

  if (!meta || !state) {
    [meta, state] = await Promise.all([
      readPath(getBusinessMetaPath(businessId)),
      readPath(getBusinessStatePath(businessId))
    ]);
  }

  const config = {
    ...buildDefaultWebConfig(meta || {}, businessId),
    ...(state?.web || {})
  };
  return { meta, state, config, webPremiumEnabled: Boolean(meta?.webPremiumEnabled) };
}

export async function saveWebConfig(businessId, configPatch = {}) {
  if (!businessId) throw new Error("businessId requerido");
  await assertBusinessCanWrite(businessId, "guardar Web Premium");

  const { state, config, meta } = await loadWebConfig(businessId);
  const previousSlug = normalizeSlug(config?.slug || "");
  const phoneKey = getPhoneKey(meta?.telefono || meta?.phone || "");
  if (phoneKey.length < 8) {
    throw new Error("Teléfono / WhatsApp válido requerido para activar o guardar Web Premium");
  }

  const generatedSlug = buildBusinessSlug(meta || {}, businessId);
  const nextWeb = {
    ...config,
    ...configPatch,
    slug: generatedSlug,
    updatedAt: new Date().toISOString()
  };

  const [existingSlug, existingPhone] = await Promise.all([
    readPath(`publicWebSlugs/${nextWeb.slug}`),
    readPath(`publicPhoneKeys/${phoneKey}`)
  ]);

  if (existingSlug?.businessId && existingSlug.businessId !== businessId) {
    throw new Error(`El link "${nextWeb.slug}" ya está usado por otra carnicería.`);
  }

  if (existingPhone?.businessId && existingPhone.businessId !== businessId) {
    throw new Error("Ese teléfono / WhatsApp ya está usado por otra carnicería.");
  }

  let shouldDeletePreviousSlug = false;
  let shouldDeletePreviousPhoneKey = false;
  let previousPhoneKey = "";
  if (previousSlug && previousSlug !== nextWeb.slug) {
    const previousIndex = await readPath(`publicWebSlugs/${previousSlug}`);
    // Solo borrar índices anteriores si existen y pertenecen a esta carnicería.
    // Borrar un documento inexistente puede fallar por reglas porque no hay resource.data.
    shouldDeletePreviousSlug = previousIndex?.businessId === businessId;
    previousPhoneKey = shouldDeletePreviousSlug ? (previousIndex?.phoneKey || "") : "";
    if (previousPhoneKey && previousPhoneKey !== phoneKey) {
      const previousPhoneIndex = await readPath(`publicPhoneKeys/${previousPhoneKey}`);
      shouldDeletePreviousPhoneKey = previousPhoneIndex?.businessId === businessId;
    }
  }

  const updatedAt = new Date().toISOString();
  const nextState = {
    ...(state || {}),
    web: nextWeb,
    updatedAt
  };

  const batch = writeBatch(db);
  batch.set(pathDoc(getBusinessStatePath(businessId)), nextState);
  batch.set(doc(db, "publicWebSlugs", nextWeb.slug), buildPublicWebPayload({
    businessId,
    slug: nextWeb.slug,
    meta,
    state: nextState,
    web: nextWeb,
    phoneKey,
    plan: "web_premium",
    createdFrom: nextWeb.createdFrom || "web_config",
    updatedAt
  }));
  batch.set(doc(db, "publicPhoneKeys", phoneKey), {
    businessId,
    phoneKey,
    slug: nextWeb.slug,
    businessName: buildPublicBusinessName(meta?.publicDisplayName || meta?.publicName || meta?.name || meta?.nombre || ""),
    publicDisplayName: buildPublicBusinessName(meta?.publicDisplayName || meta?.publicName || meta?.name || meta?.nombre || ""),
    active: Boolean(nextWeb.enabled) && nextWeb.active !== false && nextWeb.published !== false,
    updatedAt
  });

  if (shouldDeletePreviousSlug) {
    batch.delete(doc(db, "publicWebSlugs", previousSlug));
    if (shouldDeletePreviousPhoneKey) {
      batch.delete(doc(db, "publicPhoneKeys", previousPhoneKey));
    }
  }

  await batch.commit();
  patchBusinessStore(businessId, { state: nextState });
  if (meta) saveBusinessCache(businessId, { meta, state: nextState, products: Array.isArray(nextState.products) ? nextState.products : [] });
  return nextWeb;
}


function cleanBusinessText(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export async function updateBusinessBasicData(businessId, formData = {}, currentMeta = {}, currentState = {}) {
  if (!businessId) throw new Error("businessId requerido");
  await assertBusinessCanWrite(businessId, "guardar datos de la carnicería");

  const nextName = cleanBusinessText(formData.name || formData.nombre);
  const nextTelefono = cleanBusinessText(formData.telefono || formData.phone);
  const nextDireccion = cleanBusinessText(formData.direccion || formData.address);
  const nextCiudad = cleanBusinessText(formData.ciudad || formData.city);

  if (!nextName) throw new Error("Nombre comercial requerido");
  if (!nextDireccion) throw new Error("Dirección requerida");
  if (!nextCiudad) throw new Error("Ciudad requerida");

  const nextPhoneKey = getPhoneKey(nextTelefono);
  if (nextPhoneKey.length < 8) throw new Error("Teléfono / WhatsApp válido requerido");

  const previousName = cleanBusinessText(currentMeta?.name || currentMeta?.nombre || "");
  const previousTelefono = cleanBusinessText(currentMeta?.telefono || currentMeta?.phone || "");
  const previousPhoneKey = getPhoneKey(previousTelefono);
  const previousSlug = normalizeSlug(currentState?.web?.slug || "");

  const nextMeta = {
    ...(currentMeta || {}),
    name: nextName,
    nombre: nextName,
    telefono: nextTelefono,
    phoneKey: nextPhoneKey,
    direccion: nextDireccion,
    ciudad: nextCiudad,
    updatedAt: new Date().toISOString()
  };

  const nameChanged = normalizeSlug(previousName) !== normalizeSlug(nextName);
  const phoneChanged = previousPhoneKey !== nextPhoneKey;
  const shouldChangeSlug = nameChanged || phoneChanged || !previousSlug;
  const nextSlug = shouldChangeSlug ? buildBusinessSlug(nextMeta, businessId) : previousSlug;

  const [existingPhone, existingSlug, previousSlugIndex, previousPhoneIndex] = await Promise.all([
    phoneChanged ? readPath(`publicPhoneKeys/${nextPhoneKey}`) : Promise.resolve(null),
    (shouldChangeSlug && nextSlug !== previousSlug) ? readPath(`publicWebSlugs/${nextSlug}`) : Promise.resolve(null),
    (shouldChangeSlug && previousSlug && previousSlug !== nextSlug) ? readPath(`publicWebSlugs/${previousSlug}`) : Promise.resolve(null),
    (phoneChanged && previousPhoneKey && previousPhoneKey !== nextPhoneKey) ? readPath(`publicPhoneKeys/${previousPhoneKey}`) : Promise.resolve(null)
  ]);

  if (existingPhone?.businessId && existingPhone.businessId !== businessId) {
    throw new Error("Ese teléfono / WhatsApp ya está usado por otra carnicería.");
  }
  if (existingSlug?.businessId && existingSlug.businessId !== businessId) {
    throw new Error(`El link "${nextSlug}" ya está usado por otra carnicería.`);
  }

  const canDeletePreviousSlug = previousSlugIndex?.businessId === businessId;
  const canDeletePreviousPhoneKey = previousPhoneIndex?.businessId === businessId;

  const updatedAt = new Date().toISOString();
  const nextWeb = {
    ...(currentState?.web || buildDefaultWebConfig(nextMeta, businessId)),
    slug: nextSlug,
    updatedAt
  };
  const nextState = { ...(currentState || {}), web: nextWeb, updatedAt };

  const batch = writeBatch(db);
  batch.set(pathDoc(getBusinessMetaPath(businessId)), nextMeta);
  batch.set(pathDoc(getBusinessStatePath(businessId)), nextState);

  if (nextSlug) {
    batch.set(doc(db, "publicWebSlugs", nextSlug), buildPublicWebPayload({
      businessId,
      slug: nextSlug,
      meta: nextMeta,
      state: nextState,
      web: nextWeb,
      phoneKey: nextPhoneKey,
      plan: "web_premium",
      createdFrom: nextWeb.createdFrom || "business_data_update",
      updatedAt
    }));
  }
  if (canDeletePreviousSlug) batch.delete(doc(db, "publicWebSlugs", previousSlug));

  if (phoneChanged || !previousPhoneKey || shouldChangeSlug) {
    batch.set(doc(db, "publicPhoneKeys", nextPhoneKey), {
      businessId,
      phoneKey: nextPhoneKey,
      slug: nextSlug,
      businessName: buildPublicBusinessName(nextName),
      publicDisplayName: buildPublicBusinessName(nextName),
      active: Boolean(nextWeb.enabled) && nextWeb.active !== false && nextWeb.published !== false,
      updatedAt
    });
    if (canDeletePreviousPhoneKey) batch.delete(doc(db, "publicPhoneKeys", previousPhoneKey));
  }

  await batch.commit();
  patchBusinessStore(businessId, { meta: nextMeta, state: nextState });
  saveBusinessCache(businessId, { meta: nextMeta, state: nextState, products: Array.isArray(nextState.products) ? nextState.products : [] });
  return { meta: nextMeta, state: nextState, slugChanged: nextSlug !== previousSlug };
}

export function getPublicWebUrl(businessId, slug = "") {
  const cleanSlug = normalizeSlug(slug);
  if (cleanSlug) {
    return `${window.location.origin}/${cleanSlug}`;
  }

  const url = new URL(`${window.location.origin}/web.html`);
  url.searchParams.set("biz", businessId);
  return url.toString();
}
