const CarnizaAIService = (() => {
  const API_URL = "http://localhost:8000";
  function isCarnizaBackendEnabled() {
    try {
      return window.APPPROMOS_CARNIZA_BACKEND === true || localStorage.getItem("apppromos:carniza-backend") === "on";
    } catch (_) {
      return window.APPPROMOS_CARNIZA_BACKEND === true;
    }
  }
  const CACHE_PREFIX = "carniza_ai_cache_v12_2_3_";
  const TIMEOUT_MS = 3500;

  async function health() {
    if (!isCarnizaBackendEnabled()) return false;
    try {
      const response = await fetchWithTimeout(`${API_URL}/health`, { method: "GET" });
      if (!response.ok) return false;
      const data = await response.json();
      return Boolean(data.ok);
    } catch (_) {
      return false;
    }
  }

  async function getDailyRecommendation() {
    if (!isCarnizaBackendEnabled()) return null;
    try {
      const response = await fetchWithTimeout(`${API_URL}/daily-recommendation`, { method: "GET" });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || !data.ok || !data.title || !data.text) return null;
      return {
        ok: true,
        title: data.title,
        text: data.text,
        action: data.action || "Crear oferta",
        source: data.source || "backend",
      };
    } catch (_) {
      return null;
    }
  }

  async function buildUrgentStockCombo({ products = [], selectedProducts = [], complementProducts = [], discount = 20, prices = [], businessName = null } = {}) {
    const cleanProducts = normalizeProductList(products);
    const cleanSelectedProducts = normalizeSelectedProductList(selectedProducts);
    const cleanComplementProducts = normalizeSelectedProductList(complementProducts);
    const cleanDiscount = normalizeDiscount(discount);
    const cleanPrices = normalizePriceList(prices);

    const hasSelection = cleanSelectedProducts.length || cleanProducts.length;
    if (!hasSelection) {
      return {
        ok: false,
        answer: "Marcá al menos un producto atrasado para liquidar hoy.",
        source: "validation",
      };
    }

    // V12.20-A: el calculo urgente es local y determinista. No depende del
    // backend opcional ni agrega productos que el carnicero no haya elegido.
    return buildUrgentStockFallback({
      products: cleanProducts,
      selectedProducts: cleanSelectedProducts,
      complementProducts: cleanComplementProducts,
      discount: cleanDiscount,
      prices: cleanPrices,
      businessName,
    });
  }

  async function ask({ question, screen = null, businessName = null } = {}) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) return fallbackAnswer("", screen, businessName);
    const cacheKey = buildCacheKey(cleanQuestion, screen);
    const cached = readLocalCache(cacheKey);
    if (cached) return { ok: true, answer: cached, source: "localStorage_cache" };

    if (!isCarnizaBackendEnabled()) return fallbackAnswer(cleanQuestion, screen, businessName);

    try {
      const response = await fetchWithTimeout(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, screen, business_name: businessName }),
      });
      if (!response.ok) throw new Error("Carniza backend unavailable");
      const data = await response.json();
      if (!data || !data.answer) throw new Error("Carniza empty response");
      saveLocalCache(cacheKey, data.answer);
      return { ok: true, answer: data.answer, source: data.source || "backend" };
    } catch (_) {
      return fallbackAnswer(cleanQuestion, screen, businessName);
    }
  }

  function buildUrgentStockFallback({ products = [], selectedProducts = [], complementProducts = [], discount = 20, prices = [], businessName = null } = {}) {
    const urgentProducts = normalizeProductList(products);
    const urgentItems = normalizeSelectedProductList(selectedProducts);
    const complementItems = normalizeSelectedProductList(complementProducts);
    const cleanPrices = normalizePriceList(prices);
    const cleanDiscount = normalizeDiscount(discount);
    const plan = buildLocalLiquidationPlan(urgentItems, urgentProducts, complementItems, cleanDiscount, cleanPrices);
    return {
      ok: true,
      title: "🔥 OFERTA DEL DÍA",
      combo: plan.items.map((item) => item.label).join(" + "),
      items: plan.items,
      total: plan.total,
      display_price: formatMoney(plan.total),
      missing_prices: plan.missingPrices,
      discount: cleanDiscount,
      message: buildWhatsAppMessage(plan.items, plan.total, plan.missingPrices),
      source: "frontend_liquidator_fallback",
      business_name: businessName || null,
    };
  }

  function buildLocalLiquidationPlan(urgentItems = [], urgentNames = [], complementItems = [], discount, prices) {
    const itemMap = new Map();
    const missing = new Set();

    const sourceUrgentItems = urgentItems.length
      ? urgentItems
      : urgentNames.map((name) => {
          const found = findProductPrice({ name }, prices);
          return found || { name, price: 0, unit: "kg", rubro: "" };
        });

    sourceUrgentItems.forEach((item) => {
      addItem(itemMap, {
        id: item.id,
        name: item.name,
        rubro: item.rubro,
        price: item.price,
        unit: item.unit || "kg",
        qty: Math.max(0.5, Number(item.qty || getDefaultQty(item.name))),
        urgent: true
      });
    });

    complementItems.forEach((item) => {
      addItem(itemMap, {
        id: item.id,
        name: item.name,
        rubro: item.rubro,
        price: item.price,
        unit: item.unit || "kg",
        qty: Math.max(0.5, Number(item.qty || 1)),
        urgent: false
      });
    });

    const items = Array.from(itemMap.values()).map((item) => {
      const found = item.price > 0 ? item : findProductPrice(item, prices);
      const unitPrice = Number(found?.price || 0);
      if (!unitPrice) missing.add(displayProductName(item));
      const gross = unitPrice * item.qty;
      const final = item.urgent ? gross * (1 - discount / 100) : gross;
      return {
        id: item.id || "",
        name: item.name,
        rubro: item.rubro || "",
        qty: item.qty,
        unit: item.unit || "kg",
        urgent: item.urgent,
        unit_price: Math.round(unitPrice),
        subtotal: Math.round(final),
        estimated: !unitPrice,
        label: formatItemLabel(item.name, item.qty, item.rubro),
      };
    });

    const total = roundSellerPrice(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
    return { items, total, missingPrices: Array.from(missing) };
  }

  function addItem(map, item = {}) {
    const cleanName = cleanProductName(item.name);
    if (!cleanName) return;

    // Si viene de la selección del usuario, el ID manda.
    // Esto evita pisar Marucha Cerdo con Marucha Novillo.
    const key = item.id ? `id:${String(item.id)}` : `name:${normalizeKey(cleanName)}:${normalizeKey(item.rubro || "")}`;
    const current = map.get(key);
    if (current) {
      current.qty = Math.max(current.qty, Number(item.qty || 1));
      current.urgent = current.urgent || item.urgent === true;
      return;
    }

    map.set(key, {
      id: item.id || "",
      name: cleanName,
      rubro: String(item.rubro || "").trim(),
      price: Number(item.price || 0),
      unit: item.unit || "kg",
      qty: Number(item.qty || 1),
      urgent: item.urgent === true,
    });
  }

  function getDefaultQty(name) {
    const key = normalizeKey(name);
    if (key.includes("milanesa") || key.includes("mila")) return 2;
    if (key.includes("pollo")) return 2;
    return 1;
  }

  function findProductPrice(query, prices) {
    const queryId = String(query?.id || "").trim();
    const target = normalizeKey(query?.name || query);
    if (queryId) {
      const byId = prices.find((item) => String(item.id || "").trim() === queryId);
      if (byId) return byId;
    }
    if (!target) return null;
    let found = prices.find((item) => normalizeKey(item.name) === target);
    if (!found) found = prices.find((item) => {
      const itemKey = normalizeKey(item.name);
      return itemKey && (itemKey.includes(target) || target.includes(itemKey));
    });
    return found || null;
  }

  function estimateUnitPrice(prices) {
    const valid = prices.map((item) => Number(item.price || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (!valid.length) return 0;
    return valid.reduce((sum, n) => sum + n, 0) / valid.length;
  }

  function buildWhatsAppMessage(items, total, missingPrices = []) {
    const lines = items.map((item) => `• ${item.label}`);
    const priceLine = total > 0 ? `💰 ${formatMoney(total)}` : "💰 Precio a confirmar";
    const warning = missingPrices.length ? "\n⚠️ Revisá precios faltantes antes de enviar." : "";
    return `🔥 OFERTA DEL DÍA\n\n${lines.join("\n")}\n\n${priceLine}\n\nHasta agotar stock.${warning}`;
  }

  function fallbackAnswer(question, screen, businessName) {
    const q = String(question || "").toLowerCase();
    const name = businessName || "tu carnicería";
    let answer = "";
    if (containsAny(q, ["stock", "clavado", "sobrando", "no sale", "mover", "oscuro", "batea", "liquidar", "atrasado"])) {
      answer = "Marcá el producto atrasado, elegí cuánto querés bajar y tocá LIQUIDAR HOY. Carniza te arma una oferta lista para WhatsApp.";
    } else if (containsAny(q, ["precio", "precios", "caro", "barato"])) {
      answer = `Para vender mejor en ${name}, revisá los cortes principales y armá una oferta con precio claro para WhatsApp.`;
    } else if (containsAny(q, ["oferta", "promo", "promoción"])) {
      answer = "Armá una oferta corta: pocos productos, precio final visible y hasta agotar stock.";
    } else if (containsAny(q, ["combo", "combos"])) {
      answer = "En un combo urgente, elegí vos cada producto. El descuento va solo sobre lo que necesitás vender urgente.";
    } else if (containsAny(q, ["whatsapp", "mensaje", "mandar", "enviar"])) {
      answer = "Usá mensaje corto: OFERTA DEL DÍA, productos, precio final y hasta agotar stock.";
    } else if (screen === "prices") {
      answer = "Estás en precios. Revisá los cortes principales y después liquidá lo atrasado desde Inicio.";
    } else if (screen === "offers") {
      answer = "Estás en ofertas. Elegí pocos productos, guardá la promo y mandala por WhatsApp.";
    } else if (screen === "whatsapp") {
      answer = "Estás en WhatsApp. Mensaje corto, precio claro y urgencia: hasta agotar stock.";
    } else {
      answer = "Decime qué producto tenés atrasado y te ayudo a venderlo hoy.";
    }
    return { ok: true, answer, source: "frontend_fallback" };
  }

  function normalizePriceList(prices = []) {
    if (!Array.isArray(prices)) return [];
    return prices.map((item, index) => ({
      id: item.id || item.productKey || `item_${index}`,
      name: cleanProductName(item.nombre || item.name || item.label || item.title || ""),
      rubro: String(item.rubro || item.category || item.categoria || "").trim(),
      price: Number(item.precio ?? item.price ?? 0),
      unit: item.unidad || item.unit || "kg",
      active: item.active !== false && item.activo !== false,
    })).filter((item) => item.name && item.active && Number.isFinite(item.price) && item.price > 0);
  }

  function normalizeProductList(products = []) {
    if (!Array.isArray(products)) return [];
    return [...new Set(products.map(cleanProductName).filter(Boolean))];
  }

  function normalizeSelectedProductList(products = []) {
    if (!Array.isArray(products)) return [];
    const seen = new Set();
    const result = [];
    products.forEach((item, index) => {
      const name = cleanProductName(item?.name || item?.nombre || item?.label || "");
      if (!name) return;
      const id = String(item?.id || item?.productKey || `selected_${index}`).trim();
      const key = id || `${normalizeKey(name)}:${normalizeKey(item?.rubro || "")}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        id,
        name,
        rubro: String(item?.rubro || item?.category || item?.categoria || "").trim(),
        price: Number(item?.price ?? item?.precio ?? 0),
        unit: item?.unit || item?.unidad || "kg",
        qty: Number(item?.qty ?? item?.cantidad ?? 1) || 1,
      });
    });
    return result;
  }

  function normalizeDiscount(discount) {
    const n = Number(discount || 20);
    if (!Number.isFinite(n)) return 20;
    return Math.min(50, Math.max(0, Math.round(n)));
  }

  function cleanProductName(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeKey(value) {
    return cleanProductName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function getRubroIcon(rubro = "") {
    const key = normalizeKey(rubro);
    if (key.includes("cerdo") || key.includes("chancho")) return "🐖";
    if (key.includes("pollo") || key.includes("ave")) return "🐔";
    if (key.includes("novillo") || key.includes("vaca") || key.includes("ternera") || key.includes("res")) return "🐄";
    if (key.includes("achura")) return "🔥";
    if (key.includes("elaborado") || key.includes("milanesa")) return "🍽️";
    return "🥩";
  }

  function displayProductName(item = {}) {
    const name = cleanProductName(item.name || item);
    const rubro = String(item.rubro || "").trim();
    return `${name}${rubro ? " — " + rubro : ""}`;
  }

  function formatItemLabel(name, qty, rubro = "") {
    const cleanQty = Number(qty || 1);
    const icon = getRubroIcon(rubro);
    const cleanName = cleanProductName(name);
    if (normalizeKey(name).includes("pollo") && cleanQty >= 2) return `${cleanQty} ${icon} pollos${rubro ? " — " + rubro : ""}`;
    return `${cleanQty} kg ${icon} ${cleanName}${rubro ? " — " + rubro : ""}`;
  }

  function roundSellerPrice(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.max(100, Math.round(n / 100) * 100);
  }

  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "Precio a revisar";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
  }

  function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  }

  function buildCacheKey(question, screen) {
    return `${CACHE_PREFIX}${screen || "general"}_${normalizeForCache(question)}`;
  }

  function normalizeForCache(text) {
    return String(text || "").toLowerCase().trim().replace(/\s+/g, "_").slice(0, 120);
  }

  function containsAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function readLocalCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const maxAgeMs = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.createdAt > maxAgeMs) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.answer;
    } catch (_) {
      return null;
    }
  }

  function saveLocalCache(key, answer) {
    try {
      localStorage.setItem(key, JSON.stringify({ answer, createdAt: Date.now() }));
    } catch (_) {}
  }

  return { health, ask, getDailyRecommendation, buildUrgentStockCombo };
})();

window.CarnizaAIService = CarnizaAIService;
