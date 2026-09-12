// AppPromos V12.27-A5.2
// Draft temporal del onboarding preview-first.
// No usa Firebase ni Auth. Persiste solo en sessionStorage.

const ACTIVATION_DRAFT_KEY = "apppromos_activation_draft_v1";
const ACTIVATION_DRAFT_VERSION = 1;
const ACTIVATION_DRAFT_TTL_MS = 60 * 60 * 1000;

const VALID_STEPS = new Set([
  "welcome",
  "rubros",
  "prices",
  "identity",
  "preview",
  "publish",
  "done"
]);

function nowIso() {
  return new Date().toISOString();
}

function expiresIso() {
  return new Date(Date.now() + ACTIVATION_DRAFT_TTL_MS).toISOString();
}

function cleanString(value = "", max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanRubros(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => cleanString(value, 80))
      .filter(Boolean)
  )];
}

function cleanPrices(prices = {}) {
  const next = {};
  if (!prices || typeof prices !== "object" || Array.isArray(prices)) return next;

  Object.entries(prices).forEach(([key, raw]) => {
    const productKey = cleanString(key, 160);
    const value = Number(raw);
    if (!productKey) return;
    if (!Number.isFinite(value) || value <= 0) return;
    next[productKey] = Math.round(value * 100) / 100;
  });

  return next;
}

function normalizeStep(step = "welcome") {
  return VALID_STEPS.has(step) ? step : "welcome";
}

export function createEmptyActivationDraft() {
  const createdAt = nowIso();

  return {
    version: ACTIVATION_DRAFT_VERSION,
    createdAt,
    updatedAt: createdAt,
    expiresAt: expiresIso(),
    step: "welcome",
    selectedRubros: [],
    prices: {},
    identity: {
      businessName: "",
      locality: "",
      province: "",
      provinceId: ""
    },
    publish: {
      telefono: "",
      email: ""
    }
  };
}

export function normalizeActivationDraft(raw = {}) {
  const base = createEmptyActivationDraft();
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    version: ACTIVATION_DRAFT_VERSION,
    createdAt: cleanString(source.createdAt || base.createdAt, 64),
    updatedAt: cleanString(source.updatedAt || base.updatedAt, 64),
    expiresAt: cleanString(source.expiresAt || base.expiresAt, 64),
    step: normalizeStep(source.step),
    selectedRubros: cleanRubros(source.selectedRubros),
    prices: cleanPrices(source.prices),
    identity: {
      businessName: cleanString(source?.identity?.businessName, 120),
      locality: cleanString(source?.identity?.locality, 120),
      province: cleanString(source?.identity?.province, 120),
      provinceId: cleanString(source?.identity?.provinceId, 80)
    },
    publish: {
      telefono: cleanString(source?.publish?.telefono, 40),
      email: cleanString(source?.publish?.email, 160)
    }
  };
}

export function isActivationDraftExpired(draft = {}) {
  const expiresAtMs = Date.parse(String(draft?.expiresAt || ""));
  if (!Number.isFinite(expiresAtMs)) return true;
  return Date.now() >= expiresAtMs;
}

export function saveActivationDraft(draft = {}) {
  const normalized = normalizeActivationDraft({
    ...draft,
    updatedAt: nowIso(),
    expiresAt: expiresIso()
  });

  try {
    sessionStorage.setItem(ACTIVATION_DRAFT_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.warn("No se pudo guardar el borrador de activación", error);
    return normalized;
  }
}

export function loadActivationDraft({ createIfMissing = false } = {}) {
  try {
    const raw = sessionStorage.getItem(ACTIVATION_DRAFT_KEY);

    if (!raw) {
      return createIfMissing ? saveActivationDraft(createEmptyActivationDraft()) : null;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeActivationDraft(parsed);

    if (
      Number(parsed?.version) !== ACTIVATION_DRAFT_VERSION ||
      isActivationDraftExpired(normalized)
    ) {
      clearActivationDraft();
      return createIfMissing ? saveActivationDraft(createEmptyActivationDraft()) : null;
    }

    return normalized;
  } catch (error) {
    console.warn("No se pudo leer el borrador de activación", error);
    clearActivationDraft();
    return createIfMissing ? saveActivationDraft(createEmptyActivationDraft()) : null;
  }
}

export function patchActivationDraft(patch = {}) {
  const current = loadActivationDraft({ createIfMissing: true });
  const source = patch && typeof patch === "object" ? patch : {};

  return saveActivationDraft({
    ...current,
    ...source,
    identity: {
      ...current.identity,
      ...(source.identity && typeof source.identity === "object" ? source.identity : {})
    },
    publish: {
      ...current.publish,
      ...(source.publish && typeof source.publish === "object" ? source.publish : {})
    },
    prices: source.prices === undefined ? current.prices : source.prices,
    selectedRubros:
      source.selectedRubros === undefined
        ? current.selectedRubros
        : source.selectedRubros
  });
}

export function setActivationDraftStep(step = "welcome") {
  return patchActivationDraft({ step: normalizeStep(step) });
}

export function setActivationDraftRubros(selectedRubros = []) {
  return patchActivationDraft({
    selectedRubros: cleanRubros(selectedRubros)
  });
}

export function setActivationDraftPrice(productKey = "", rawPrice = null) {
  const current = loadActivationDraft({ createIfMissing: true });
  const key = cleanString(productKey, 160);
  if (!key) return current;

  const nextPrices = { ...current.prices };
  const price = Number(rawPrice);

  if (!Number.isFinite(price) || price <= 0) {
    delete nextPrices[key];
  } else {
    nextPrices[key] = Math.round(price * 100) / 100;
  }

  return patchActivationDraft({ prices: nextPrices });
}

export function setActivationDraftIdentity(identity = {}) {
  return patchActivationDraft({
    identity: {
      businessName: cleanString(identity.businessName, 120),
      locality: cleanString(identity.locality, 120),
      province: cleanString(identity.province, 120),
      provinceId: cleanString(identity.provinceId, 80)
    }
  });
}

export function setActivationDraftPublishData(publish = {}) {
  return patchActivationDraft({
    publish: {
      telefono: cleanString(publish.telefono, 40),
      email: cleanString(publish.email, 160)
    }
  });
}

export function activationDraftPricedCount(draft = null) {
  const current = draft || loadActivationDraft() || {};
  return Object.keys(cleanPrices(current.prices)).length;
}

export function hasRecoverableActivationDraft() {
  const draft = loadActivationDraft();
  if (!draft) return false;

  return Boolean(
    draft.selectedRubros?.length ||
    activationDraftPricedCount(draft) ||
    draft.identity?.businessName ||
    draft.identity?.locality
  );
}

export function clearActivationDraft() {
  try {
    sessionStorage.removeItem(ACTIVATION_DRAFT_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar el borrador de activación", error);
  }
}

export function getActivationDraftStorageKey() {
  return ACTIVATION_DRAFT_KEY;
}

export function getActivationDraftVersion() {
  return ACTIVATION_DRAFT_VERSION;
}
