const SESSION_KEY = "__APPPROMOS_SESSION__";
const STORE_KEY = "__APPPROMOS_BUSINESS_STORE__";

function nowIso() {
  return new Date().toISOString();
}

function ensureGlobals() {
  if (!window[SESSION_KEY]) {
    window[SESSION_KEY] = {
      started: false,
      loaded: false,
      businessId: null,
      startedAt: null,
      loadedAt: null
    };
  }

  if (!window[STORE_KEY]) {
    window[STORE_KEY] = {
      businessId: null,
      meta: null,
      state: null,
      products: [],
      savedCombos: [],
      marketCache: null,
      marketCacheLoadedAt: null,
      loadedAt: null,
      source: null,
      dirty: false
    };
  }

  window.AppSession = window[SESSION_KEY];
  window.AppPromosStore = window[STORE_KEY];

  return {
    session: window[SESSION_KEY],
    store: window[STORE_KEY]
  };
}

function normalizeProducts(state = {}) {
  return Array.isArray(state?.products) ? state.products : [];
}

function normalizeSavedCombos(state = {}) {
  return Array.isArray(state?.savedCombos) ? state.savedCombos : [];
}

export function getAppSession() {
  return ensureGlobals().session;
}

export function startAppSession(businessId) {
  const { session } = ensureGlobals();
  if (!session.started) {
    session.started = true;
    session.startedAt = nowIso();
  }
  if (businessId) {
    session.businessId = businessId;
  }
  return session;
}

export function hasBusinessInStore(businessId) {
  const { session, store } = ensureGlobals();
  return Boolean(
    businessId &&
    session.loaded &&
    session.businessId === businessId &&
    store.businessId === businessId &&
    store.meta &&
    store.state
  );
}

export function getBusinessStore(businessId = null) {
  const { store } = ensureGlobals();
  if (businessId && store.businessId !== businessId) return null;
  if (!store.meta || !store.state) return null;
  return {
    businessId: store.businessId,
    meta: store.meta,
    state: store.state,
    products: store.products,
    savedCombos: store.savedCombos,
    loadedAt: store.loadedAt,
    source: store.source,
    dirty: store.dirty
  };
}

export function setBusinessStore(payload = {}, options = {}) {
  const { session, store } = ensureGlobals();
  const businessId = payload.businessId;

  if (!businessId) {
    throw new Error("setBusinessStore: businessId requerido");
  }

  store.businessId = businessId;
  store.meta = payload.meta || null;
  store.state = payload.state || null;
  store.products = normalizeProducts(payload.state);
  store.savedCombos = normalizeSavedCombos(payload.state);
  store.loadedAt = nowIso();
  store.source = options.source || payload.source || "memory";
  store.dirty = Boolean(options.dirty);

  session.started = true;
  session.loaded = Boolean(store.meta && store.state);
  session.businessId = businessId;
  session.loadedAt = store.loadedAt;
  if (!session.startedAt) session.startedAt = store.loadedAt;

  return getBusinessStore(businessId);
}

export function patchBusinessStore(businessId, partial = {}) {
  const current = getBusinessStore(businessId);
  if (!current) return null;

  const nextMeta = partial.meta
    ? { ...(current.meta || {}), ...(partial.meta || {}) }
    : current.meta;

  const nextState = partial.state
    ? { ...(current.state || {}), ...(partial.state || {}) }
    : current.state;

  return setBusinessStore({
    businessId,
    meta: nextMeta,
    state: nextState
  }, {
    source: "memory-patch",
    dirty: Boolean(partial.dirty)
  });
}

export function resetBusinessStore(nextBusinessId = null) {
  const { session, store } = ensureGlobals();

  store.businessId = nextBusinessId;
  store.meta = null;
  store.state = null;
  store.products = [];
  store.savedCombos = [];
  store.loadedAt = null;
  store.source = null;
  store.dirty = false;

  session.loaded = false;
  session.businessId = nextBusinessId;
  session.loadedAt = null;

  return { session, store };
}


export function hasMarketCache() {
  const { store } = ensureGlobals();
  return Array.isArray(store.marketCache);
}

export function getMarketCache() {
  const { store } = ensureGlobals();
  return Array.isArray(store.marketCache) ? store.marketCache : [];
}

export function setMarketCache(snapshots = []) {
  const { store } = ensureGlobals();
  store.marketCache = Array.isArray(snapshots) ? snapshots : [];
  store.marketCacheLoadedAt = nowIso();
  return store.marketCache;
}

export function upsertMarketSnapshot(snapshot = {}) {
  if (!snapshot?.businessId) return getMarketCache();

  const { store } = ensureGlobals();
  const current = Array.isArray(store.marketCache) ? [...store.marketCache] : [];
  const index = current.findIndex((item) => item?.businessId === snapshot.businessId);

  if (index >= 0) {
    current[index] = snapshot;
  } else {
    current.push(snapshot);
  }

  store.marketCache = current;
  store.marketCacheLoadedAt = store.marketCacheLoadedAt || nowIso();
  return store.marketCache;
}

ensureGlobals();
