const PREFIX = 'apppromos_cache_v1';

function key(businessId) {
  return `${PREFIX}:${String(businessId || 'global').trim()}`;
}

export function loadBusinessCache(businessId) {
  try {
    const raw = localStorage.getItem(key(businessId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('cache load error', error);
    return null;
  }
}

export function saveBusinessCache(businessId, payload = {}) {
  try {
    localStorage.setItem(key(businessId), JSON.stringify({
      ...payload,
      cachedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('cache save error', error);
  }
}

export function patchCachedProducts(businessId, products = []) {
  const current = loadBusinessCache(businessId) || {};
  saveBusinessCache(businessId, {
    ...current,
    products,
    state: {
      ...(current.state || {}),
      products
    }
  });
}

export function clearBusinessCache(businessId) {
  try {
    localStorage.removeItem(key(businessId));
  } catch (error) {
    console.warn('cache clear error', error);
  }
}
