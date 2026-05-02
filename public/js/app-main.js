import {
  openBusiness,
  setActiveBusinessId,
  getResolvedBusinessId
} from "./services/business-service.js";

import { resolveSession } from "./services/auth-service.js";

import { renderDashboard } from "./modules/dashboard-module.js";
import { renderPrices } from "./modules/prices-module.js";
import { renderSaved } from "./modules/saved-module.js";
import { renderBuilder } from "./modules/builder-module.js";
import { renderAdminUsers } from "./modules/admin-users-module.js";
import { renderMarket } from "./modules/market-module.js";
import { renderWhatsApp } from "./modules/whatsapp-module.js";
import { renderWebPremium } from "./modules/web-module.js";
import { initCarniza, updateCarnizaContext } from "./modules/carniza-module.js";
import { renderPublicAuth } from "./modules/public-auth-module.js";
import { trackCarnizaSignal } from "./services/carniza-signals-service.js";

import { updateBusinessBasicData } from "./services/web-premium-service.js";
import { loadActiveBusinessData } from "./services/data-service.js";
import {
  loadMarketCacheOnce,
  rebuildMarketSnapshotsFromBusinesses
} from "./services/market-snapshots-service.js";
import { getReadDebug } from "./core/firebase-core.js";

import {
  isModuleEnabled,
  renderModuleLocked,
  renderAccessWarning,
  getAccessState,
  getBusinessWriteBlockReason
} from "./services/access-control-service.js";

import {
  readBusinessRoot,
  buildBusinessDefaults,
  trackBusinessLogin,
  trackBusinessActivityThrottled,
  subscribeBusinessControl
} from "./services/admin-service.js";

const dashboardPanel = document.getElementById("dashboardPanel");
const pricesPanel = document.getElementById("pricesPanel");
const savedPanel = document.getElementById("savedPanel");
const builderPanel = document.getElementById("builderPanel");
const whatsappPanel = document.getElementById("whatsappPanel");
const usersPanel = document.getElementById("usersPanel");
const marketPanel = document.getElementById("marketPanel");
const webPanel = document.getElementById("webPanel");
const moreLinks = document.getElementById("moreLinks");

let currentPayload = null;
let currentBusinessId = null;
let currentSession = null;
let currentBusinessControl = null;
let unsubscribeBusinessControl = null;
let lazyRenderInProgress = null;
let currentPanelId = "dashboardPanel";
let currentActiveProducts = [];

function normalizeActiveProductCatalog(products = []) {
  return (Array.isArray(products) ? products : [])
    .filter((product) => {
      if (!product) return false;
      if (product.active === false || product.activo === false) return false;
      const price = Number(product.precio ?? product.price ?? product.precioFinal ?? product.valor ?? 0);
      return Number.isFinite(price) && price > 0;
    });
}

function setActiveProductCatalog(products = []) {
  currentActiveProducts = normalizeActiveProductCatalog(products);
  return currentActiveProducts;
}

function getActiveProductCatalog() {
  if (Array.isArray(currentActiveProducts) && currentActiveProducts.length) return currentActiveProducts;
  const fromState = currentPayload?.state?.products || currentPayload?.products || [];
  return normalizeActiveProductCatalog(fromState);
}

function markLazyPanelsDirty() {
  [usersPanel, marketPanel, webPanel].forEach((panel) => {
    if (panel) panel.dataset.rendered = "";
  });
}

function setPanelLocked(panel, moduleKey) {
  if (!panel) return true;
  if (!isModuleEnabled(currentBusinessControl || {}, moduleKey)) {
    panel.innerHTML = renderModuleLocked(moduleKey, currentBusinessControl || {});
    panel.dataset.rendered = "true";
    return true;
  }
  return false;
}

function injectAccessWarning(target = dashboardPanel) {
  if (!target || !currentBusinessControl) return;
  target.querySelectorAll('[data-access-warning="true"]').forEach((node) => node.remove());
  const warning = renderAccessWarning(currentBusinessControl);
  if (!warning) return;
  target.insertAdjacentHTML("afterbegin", warning);
}

function isPaymentOverdue() {
  return getAccessState(currentBusinessControl || {}).level === "warning";
}

function publishAccessStatus() {
  const access = getAccessState(currentBusinessControl || {});
  window.dispatchEvent(new CustomEvent("apppromos:access-state", {
    detail: { access, business: currentBusinessControl || {} }
  }));
}

function getWriteOptions() {
  if (currentSession?.isDemo) {
    return {
      canWrite: false,
      writeBlockMessage: "Esta es una demo. Podés armar ofertas y probar WhatsApp. Para guardar tus datos reales, creá tu carnicería gratis."
    };
  }

  const access = getAccessState(currentBusinessControl || {});
  const reason = getBusinessWriteBlockReason(currentBusinessControl || {});
  return {
    canWrite: access.canEdit === true,
    writeBlockMessage: reason || "La cuenta está en modo consulta. Para volver a guardar cambios, regularizá tu plan."
  };
}

function restartBusinessControlListener(businessId) {
  if (typeof unsubscribeBusinessControl === "function") {
    unsubscribeBusinessControl();
    unsubscribeBusinessControl = null;
  }
  if (!businessId) return;
  unsubscribeBusinessControl = subscribeBusinessControl(businessId, async (control) => {
    const previous = JSON.stringify(currentBusinessControl || {});
    currentBusinessControl = control;
    updateCarnizaContext({
      businessControl: currentBusinessControl,
      payload: currentPayload,
      panelId: currentPanelId,
      appMode: currentSession?.appMode || "client"
    });
    publishAccessStatus();
    const next = JSON.stringify(control || {});
    if (previous !== next && currentPayload) {
      markLazyPanelsDirty();
      await renderBusinessWorkspace({ skipTracking: true });
      goToPanel(currentPanelId || "dashboardPanel", { keepMoreOpen: true });
    }
  });
}



const DEMO_LIMITS = {
  whatsappMax: 10,
  promosMax: 10,
  daysMax: 15
};
const DEMO_USAGE_KEY = "apppromos:demo:usage:v1";

function readDemoUsage() {
  const fallback = {
    firstUsedAt: new Date().toISOString(),
    whatsappSentCount: 0,
    promosSavedCount: 0
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_USAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      firstUsedAt: parsed.firstUsedAt || fallback.firstUsedAt,
      whatsappSentCount: Number(parsed.whatsappSentCount || 0),
      promosSavedCount: Number(parsed.promosSavedCount || 0)
    };
  } catch (_) {
    return fallback;
  }
}

function saveDemoUsage(usage) {
  try {
    localStorage.setItem(DEMO_USAGE_KEY, JSON.stringify({
      firstUsedAt: usage.firstUsedAt || new Date().toISOString(),
      whatsappSentCount: Math.max(0, Number(usage.whatsappSentCount || 0)),
      promosSavedCount: Math.max(0, Number(usage.promosSavedCount || 0))
    }));
  } catch (_) {}
}

function ensureDemoUsage() {
  const usage = readDemoUsage();
  saveDemoUsage(usage);
  return usage;
}

function getDemoAgeDays(usage = readDemoUsage()) {
  const first = Date.parse(usage.firstUsedAt || "");
  if (!Number.isFinite(first)) return 0;
  return Math.max(0, Math.floor((Date.now() - first) / 86400000));
}

function getDemoDaysRemaining(usage = readDemoUsage()) {
  return Math.max(0, DEMO_LIMITS.daysMax - getDemoAgeDays(usage));
}

function isDemoExpired(usage = readDemoUsage()) {
  const first = Date.parse(usage.firstUsedAt || "");
  if (!Number.isFinite(first)) return false;
  return Date.now() - first >= DEMO_LIMITS.daysMax * 86400000;
}

function updateDemoBannerUsage() {
  if (!currentSession?.isDemo) return;
  const usage = ensureDemoUsage();
  const el = document.getElementById("demoUsageText");
  if (!el) return;
  const days = getDemoDaysRemaining(usage);
  el.textContent = `Demo: ${usage.whatsappSentCount}/${DEMO_LIMITS.whatsappMax} WhatsApps · ${usage.promosSavedCount}/${DEMO_LIMITS.promosMax} promos · ${days} día${days === 1 ? "" : "s"} disponibles.`;
}

function showDemoConversionPrompt(kind = "whatsapp") {
  const existing = document.getElementById("demoConversionPrompt");
  if (existing) existing.remove();

  const usage = ensureDemoUsage();
  const expired = isDemoExpired(usage);
  const title = expired
    ? "Tu demo ya cumplió su trabajo"
    : kind === "promo"
      ? "La demo ya guardó 10 promos"
      : "Ya probaste bastante la demo";
  const message = expired
    ? "Para seguir vendiendo, creá tu carnicería gratis, cargá tus precios y salí andando. Tenés 30 días sin costo."
    : kind === "promo"
      ? "Para guardar más promos, creá tu carnicería gratis y seguí trabajando con tus propios precios."
      : "Para seguir mandando ofertas por WhatsApp, creá tu carnicería gratis y usá AppPromos con tus propios precios.";

  const overlay = document.createElement("div");
  overlay.id = "demoConversionPrompt";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:18px;";
  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="demoConversionTitle" style="width:min(520px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.28);border:1px solid #fed7aa;">
      <div style="font-size:.78rem;font-weight:1000;color:#b45309;text-transform:uppercase;letter-spacing:.04em;">Demo de AppPromos</div>
      <h2 id="demoConversionTitle" style="margin:8px 0 8px;color:#7c2d12;line-height:1.1;">${title}</h2>
      <p style="margin:0;color:#374151;font-weight:800;line-height:1.45;">${message}</p>
      <div style="margin:14px 0 0;padding:12px;border-radius:16px;background:#fff7ed;color:#7c2d12;font-weight:900;line-height:1.35;">
        Probá AppPromos en demo. Si te sirve, hacela tuya.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;">
        <button type="button" id="demoGoSignupBtn" style="min-height:48px;border:0;border-radius:15px;background:#16a34a;color:white;font-weight:1000;cursor:pointer;">Crear mi carnicería gratis</button>
        <button type="button" id="demoBackHomeBtn" style="min-height:48px;border:1px solid #fed7aa;border-radius:15px;background:#fff;color:#7c2d12;font-weight:1000;cursor:pointer;">Volver al inicio</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#demoGoSignupBtn")?.addEventListener("click", () => {
    window.location.href = "./index.html#signup";
  });
  overlay.querySelector("#demoBackHomeBtn")?.addEventListener("click", () => {
    overlay.remove();
    goToPanel("dashboardPanel");
  });
}

function registerDemoWhatsappAttempt(source = "demo") {
  if (!currentSession?.isDemo) return true;
  const usage = ensureDemoUsage();
  if (isDemoExpired(usage)) {
    showDemoConversionPrompt("expired");
    return false;
  }
  if (usage.whatsappSentCount >= DEMO_LIMITS.whatsappMax) {
    showDemoConversionPrompt("whatsapp");
    return false;
  }
  usage.whatsappSentCount += 1;
  saveDemoUsage(usage);
  updateDemoBannerUsage();
  trackCarnizaSignal("demo_whatsapp_clicked", { source, count: usage.whatsappSentCount });
  return true;
}

function registerDemoPromoSaveAttempt(payload = {}) {
  if (!currentSession?.isDemo) return true;
  const usage = ensureDemoUsage();
  if (isDemoExpired(usage)) {
    showDemoConversionPrompt("expired");
    return false;
  }
  if (usage.promosSavedCount >= DEMO_LIMITS.promosMax) {
    showDemoConversionPrompt("promo");
    return false;
  }
  usage.promosSavedCount += 1;
  saveDemoUsage(usage);
  updateDemoBannerUsage();
  trackCarnizaSignal("demo_promo_saved", { source: payload?.mode || "discount", count: usage.promosSavedCount });
  return true;
}

function getDemoActionOptions() {
  return {
    onBeforeWhatsapp: ({ source } = {}) => registerDemoWhatsappAttempt(source || "demo"),
    onBeforePromoSave: ({ payload } = {}) => registerDemoPromoSaveAttempt(payload || {})
  };
}

function getBuilderOptions() {
  return {
    businessId: currentBusinessId,
    ...getWriteOptions(),
    ...getDemoActionOptions()
  };
}

function getShareOptions(source = "saved") {
  return {
    onBeforeWhatsapp: () => registerDemoWhatsappAttempt(source)
  };
}

function insertDemoBanner() {
  if (!currentSession?.isDemo) return;
  ensureDemoUsage();
  if (document.getElementById("demoModeBanner")) {
    updateDemoBannerUsage();
    return;
  }
  const appRoot = document.querySelector(".app");
  if (!appRoot) return;
  const banner = document.createElement("div");
  banner.id = "demoModeBanner";
  banner.className = "demo-mode-banner app-demo-banner";
  banner.innerHTML = `
    <div class="app-demo-banner__copy">
      <strong>Estás probando la Carnicería de Carniza.</strong>
      <span>Podés navegar, armar ofertas y probar WhatsApp. Si te sirve, hacela tuya.</span>
      <small id="demoUsageText" style="display:block;margin-top:4px;font-weight:900;color:#7c2d12;"></small>
    </div>
    <button type="button" id="demoCreateAccountBtn" class="app-demo-banner__btn">Crear mi carnicería gratis</button>
  `;
  appRoot.insertBefore(banner, appRoot.firstChild);
  banner.querySelector("#demoCreateAccountBtn")?.addEventListener("click", () => {
    window.location.href = "./index.html#signup";
  });
  updateDemoBannerUsage();
}


/* =========================
   V12.2.3 — CARNIZA LIQUIDADOR REAL / PRODUCTOS EXACTOS
========================= */
const CARNIZA_AI_SERVICE_SRC = "./js/services/ai-service.js";
let carnizaServiceLoadingPromise = null;

function ensureCarnizaAIService() {
  if (window.CarnizaAIService) return Promise.resolve(window.CarnizaAIService);
  if (carnizaServiceLoadingPromise) return carnizaServiceLoadingPromise;
  carnizaServiceLoadingPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="' + CARNIZA_AI_SERVICE_SRC + '"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.CarnizaAIService || null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = CARNIZA_AI_SERVICE_SRC;
    script.defer = true;
    script.onload = () => resolve(window.CarnizaAIService || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return carnizaServiceLoadingPromise;
}

function getCurrentProductsForCarniza() {
  return getActiveProductCatalog();
}

function getBusinessNameForCarniza() {
  return currentPayload?.meta?.name || currentPayload?.meta?.nombre || currentPayload?.businessId || "tu carnicería";
}

function getBusinessWhatsappForCarniza() {
  return String(currentPayload?.meta?.whatsapp || currentPayload?.meta?.telefono || currentPayload?.meta?.phone || "").replace(/\D/g, "");
}

function escapeCarnizaHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCarnizaMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Precio a revisar";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

async function renderCarnizaDailyPostIt(container) {
  if (!container || container.querySelector("#carnizaDailyPostIt")) return;
  try {
    const service = await ensureCarnizaAIService();
    if (!service?.getDailyRecommendation) return;
    const data = await service.getDailyRecommendation();
    if (!data?.ok || !data.title || !data.text) return;
    const card = document.createElement("div");
    card.id = "carnizaDailyPostIt";
    card.style.cssText = "margin:0 0 14px;padding:14px;border:1px solid #d9f1df;border-left:6px solid #25a244;border-radius:16px;background:#f3fff6;box-shadow:0 8px 20px rgba(0,0,0,.05);";
    card.innerHTML = '<div style="font-weight:1000;color:#155724;margin-bottom:4px;"><img src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" style="width:28px;height:28px;border-radius:999px;object-fit:cover;border:1px solid #bbf7d0;vertical-align:middle;margin-right:7px;" />Carniza recomienda hoy: ' + escapeCarnizaHtml(data.title) + '</div>' +
      '<div style="font-size:14px;line-height:1.35;color:#31543a;font-weight:700;margin-bottom:10px;">' + escapeCarnizaHtml(data.text) + '</div>' +
      '<button type="button" data-carniza-go-builder="true" style="min-height:38px;border:none;border-radius:999px;background:#25a244;color:white;font-weight:1000;padding:0 14px;cursor:pointer;">' + escapeCarnizaHtml(data.action || "Crear oferta") + '</button>';
    card.querySelector("[data-carniza-go-builder]")?.addEventListener("click", () => goToPanel("builderPanel"));
    container.prepend(card);
  } catch (_) {}
}

function normalizeCarnizaProductKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCarnizaProductName(product = {}) {
  return String(product.nombre || product.name || product.label || product.title || "").trim();
}

function getCarnizaProductId(product = {}, index = 0) {
  return String(product.id || product.productKey || product.key || getCarnizaProductName(product) || `item_${index}`).trim();
}

function getCarnizaProductPrice(product = {}) {
  const n = Number(product.precio ?? product.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getCarnizaRubroIcon(rubro = "") {
  const key = normalizeCarnizaProductKey(rubro);
  if (key.includes("cerdo") || key.includes("chancho")) return "🐖";
  if (key.includes("pollo") || key.includes("ave")) return "🐔";
  if (key.includes("novillo") || key.includes("vaca") || key.includes("ternera") || key.includes("res")) return "🐄";
  if (key.includes("achura")) return "🔥";
  if (key.includes("elaborado") || key.includes("milanesa")) return "🍽️";
  return "🥩";
}

function formatCarnizaProductDisplay(item = {}) {
  const icon = getCarnizaRubroIcon(item.rubro);
  const rubro = String(item.rubro || "").trim();
  return `${icon} ${item.name}${rubro ? " — " + rubro : ""}`;
}

function normalizeCarnizaRealProducts(products = []) {
  if (!Array.isArray(products)) return [];
  return products
    .map((product, index) => {
      const name = getCarnizaProductName(product);
      const price = getCarnizaProductPrice(product);
      return {
        id: getCarnizaProductId(product, index),
        name,
        rubro: String(product.rubro || product.category || product.categoria || "").trim(),
        unit: String(product.unidad || product.unit || "kg").trim(),
        price,
        active: product.active !== false && product.activo !== false,
        raw: product
      };
    })
    .filter((item) => item.name && item.active && item.price > 0);
}

function renderCarnizaUrgentStockCard(container) {
  if (!container || container.querySelector("#carnizaUrgentStockCard")) return;
  const realProducts = normalizeCarnizaRealProducts(getCurrentProductsForCarniza());
  const discounts = [10, 15, 20, 25];
  const selectedIds = new Set();
  const selectedQty = new Map();
  let selectedDiscount = 20;
  let searchText = "";

  const card = document.createElement("div");
  card.id = "carnizaUrgentStockCard";
  card.style.cssText = "margin:0 0 14px;padding:15px;border:2px solid #ffd6b0;border-radius:18px;background:#fff8f0;box-shadow:0 10px 24px rgba(0,0,0,.06);";
  card.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">' +
      '<div><div style="font-size:17px;font-weight:1000;color:#8a2600;line-height:1.15;">🔥 Decile a Carniza qué necesitás vender URGENTE</div><div style="font-size:13px;color:#6b4b3e;font-weight:800;margin-top:4px;line-height:1.28;">Marcá productos reales de tu lista. Carniza arma la oferta para vender hoy.</div></div>' +
      '<img src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" style="width:46px;height:46px;border-radius:999px;object-fit:cover;border:2px solid #fed7aa;background:#fff;" /></div>' +
    '<div style="font-size:13px;font-weight:1000;color:#8a2600;margin:4px 0 7px;">1. Elegí producto</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;"><input data-carniza-product-search type="text" inputmode="text" placeholder="Buscar producto real: marucha, osobuco, alitas..." style="flex:1;min-width:0;min-height:44px;border:1px solid #e7c6a8;border-radius:13px;padding:0 12px;font-weight:900;background:#fff;" /><button type="button" data-carniza-clear-search style="min-width:48px;border:1px solid #e7c6a8;border-radius:13px;background:#fff;color:#8a2600;font-size:18px;font-weight:1000;cursor:pointer;">×</button></div>' +
    '<div data-carniza-selected style="display:none;margin:2px 0 12px;padding:10px;border-radius:13px;background:#fff;border:2px solid #fdba74;color:#4b2a12;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(251,146,60,.12);"></div>' +
    '<div data-carniza-real-products style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;"></div>' +
    '<div style="font-size:15px;font-weight:1000;color:#8a2600;margin:8px 0;">2. Ajustá descuento</div>' +
    '<div data-carniza-discounts style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:8px;"></div>' +
    '<div data-carniza-discount-help style="font-size:12px;font-weight:900;color:#6b4b3e;margin:0 0 6px;">20% = vender rápido sin regalar todo.</div>' +
    '<div style="font-size:12px;font-weight:1000;color:#8a2600;margin:0 0 12px;padding:9px;border-radius:12px;background:#fff4e5;border:1px solid #f6c391;">🔥 El descuento se aplica SOLO a los productos que marcaste para liquidar. Los productos gancho van a precio normal.</div>' +
    '<button type="button" data-carniza-liquidate style="width:100%;min-height:52px;border:none;border-radius:16px;background:#c41e3a;color:#fff;font-size:16px;font-weight:1000;cursor:pointer;box-shadow:0 10px 20px rgba(196,30,58,.22);">3. Armar oferta urgente</button>' +
    '<div data-carniza-error style="display:none;margin-top:10px;padding:10px;border-radius:12px;background:#fff1f0;color:#9f1239;font-size:13px;font-weight:900;"></div>' +
    '<div data-carniza-result style="display:none;margin-top:12px;"></div>';

  const productsEl = card.querySelector("[data-carniza-real-products]");
  const selectedEl = card.querySelector("[data-carniza-selected]");
  const discountsEl = card.querySelector("[data-carniza-discounts]");
  const searchInput = card.querySelector("[data-carniza-product-search]");
  const errorEl = card.querySelector("[data-carniza-error]");
  const resultEl = card.querySelector("[data-carniza-result]");
  const helpEl = card.querySelector("[data-carniza-discount-help]");

  function getSelectedProducts() {
    return realProducts
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({ ...item, qty: Math.max(0.5, Number(selectedQty.get(item.id) || 1)) }));
  }

  function getVisibleProducts() {
    const q = normalizeCarnizaProductKey(searchText);
    let source = realProducts;
    if (q) {
      source = realProducts.filter((item) => {
        const nameKey = normalizeCarnizaProductKey(item.name);
        const rubroKey = normalizeCarnizaProductKey(item.rubro);
        return nameKey.includes(q) || rubroKey.includes(q) || q.includes(nameKey);
      });
    }
    const selected = getSelectedProducts();
    const selectedIdsLocal = new Set(selected.map((item) => item.id));
    const merged = [...selected, ...source.filter((item) => !selectedIdsLocal.has(item.id))];
    return merged.slice(0, 10);
  }

  function renderSelectedSummary() {
    const selected = getSelectedProducts();
    if (!selected.length) {
      selectedEl.style.display = "none";
      selectedEl.innerHTML = "";
      return;
    }
    selectedEl.style.display = "block";
    selectedEl.innerHTML = '<div style="font-size:13px;color:#8a2600;font-weight:1000;margin-bottom:7px;">2. Ajustá cantidad antes de liquidar</div>' +
      selected.map((item) =>
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid #f3dcc7;">' +
          '<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔥 ' + escapeCarnizaHtml(formatCarnizaProductDisplay(item)) + '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;">' +
            '<button type="button" data-urgent-qty-minus="' + escapeCarnizaHtml(item.id) + '" style="min-width:30px;min-height:30px;border-radius:10px;border:1px solid #e7c6a8;background:#fff;font-weight:1000;">−</button>' +
            '<strong style="min-width:48px;text-align:center;">' + escapeCarnizaHtml(String(item.qty).replace(".", ",")) + ' ' + escapeCarnizaHtml(item.unit || "kg") + '</strong>' +
            '<button type="button" data-urgent-qty-plus="' + escapeCarnizaHtml(item.id) + '" style="min-width:30px;min-height:30px;border-radius:10px;border:1px solid #e7c6a8;background:#fff;font-weight:1000;">+</button>' +
          '</span>' +
        '</div>'
      ).join("");
  }

  function renderProductButtons() {
    if (!realProducts.length) {
      productsEl.innerHTML = '<div style="grid-column:1/-1;padding:12px;border-radius:12px;background:#fff1f0;color:#9f1239;font-weight:900;font-size:13px;">No encontré productos con precio cargado. Primero cargá precios reales.</div>';
      renderSelectedSummary();
      return;
    }
    const visible = getVisibleProducts();
    if (!visible.length) {
      productsEl.innerHTML = '<div style="grid-column:1/-1;padding:12px;border-radius:12px;background:#fff8e1;color:#7a4b00;font-weight:900;font-size:13px;">No encontré ese producto en tu lista de precios. Para liquidarlo, primero tiene que existir con precio real.</div>';
      renderSelectedSummary();
      return;
    }
    productsEl.innerHTML = visible.map((item) => {
      const active = selectedIds.has(item.id);
      const subtitle = item.rubro ? item.rubro + " · " + formatCarnizaMoney(item.price) : formatCarnizaMoney(item.price);
      return '<button type="button" data-product-id="' + escapeCarnizaHtml(item.id) + '" style="min-height:52px;text-align:left;border-radius:14px;border:1px solid ' + (active ? "#c41e3a" : "#ead5bf") + ';background:' + (active ? "#c41e3a" : "#fff") + ';color:' + (active ? "#fff" : "#4b2a12") + ';font-weight:1000;cursor:pointer;padding:8px 10px;line-height:1.15;">' +
        '<div>' + escapeCarnizaHtml(formatCarnizaProductDisplay(item)) + (active ? " ✔" : "") + '</div>' +
        '<div style="font-size:11px;font-weight:900;opacity:.82;margin-top:3px;">' + escapeCarnizaHtml(subtitle) + '</div>' +
      '</button>';
    }).join("");
    renderSelectedSummary();
  }

  function renderDiscountButtons() {
    const helpMap = { 10: "10% = suave, para empujar sin tocar mucho margen.", 15: "15% = buen empujón sin regalar la mercadería.", 20: "20% = vender rápido sin regalar todo.", 25: "25% = para sacarlo hoy sí o sí." };
    helpEl.textContent = helpMap[selectedDiscount] || (selectedDiscount + "% aplicado solo a lo urgente.");
    discountsEl.innerHTML = discounts.map((pct) => {
      const active = pct === selectedDiscount;
      return '<button type="button" data-discount="' + pct + '" style="min-height:44px;border-radius:14px;border:1px solid ' + (active ? "#25a244" : "#ead5bf") + ';background:' + (active ? "#25a244" : "#fff") + ';color:' + (active ? "#fff" : "#4b2a12") + ';font-weight:1000;cursor:pointer;">' + pct + '%</button>';
    }).join("");
  }

  function showError(message) { errorEl.textContent = message; errorEl.style.display = "block"; }
  function hideError() { errorEl.textContent = ""; errorEl.style.display = "none"; }

  productsEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-product-id]");
    if (!btn) return;
    const id = String(btn.dataset.productId || "").trim();
    if (!id) return;
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      selectedQty.delete(id);
    } else {
      selectedIds.add(id);
      selectedQty.set(id, selectedQty.get(id) || 1);
    }
    renderProductButtons();
    hideError();
  });

  selectedEl.addEventListener("click", (event) => {
    const minus = event.target.closest("[data-urgent-qty-minus]");
    const plus = event.target.closest("[data-urgent-qty-plus]");
    const btn = minus || plus;
    if (!btn) return;
    const id = String(btn.dataset.urgentQtyMinus || btn.dataset.urgentQtyPlus || "").trim();
    if (!id) return;
    const current = Math.max(0.5, Number(selectedQty.get(id) || 1));
    const next = plus ? current + 0.5 : Math.max(0.5, current - 0.5);
    selectedQty.set(id, next);
    renderSelectedSummary();
    hideError();
  });

  searchInput?.addEventListener("input", () => {
    searchText = searchInput.value || "";
    renderProductButtons();
    hideError();
  });

  card.querySelector("[data-carniza-clear-search]")?.addEventListener("click", () => {
    searchText = "";
    if (searchInput) searchInput.value = "";
    renderProductButtons();
    hideError();
  });

  discountsEl.addEventListener("click", (event) => { const btn = event.target.closest("[data-discount]"); if (!btn) return; selectedDiscount = Number(btn.dataset.discount || 20); renderDiscountButtons(); });

  card.querySelector("[data-carniza-liquidate]")?.addEventListener("click", async () => {
    hideError(); resultEl.style.display = "none"; resultEl.innerHTML = "";
    const selectedProducts = getSelectedProducts();
    if (!selectedProducts.length) { showError("Marcá al menos un producto real de tu lista para liquidar hoy."); return; }
    const button = card.querySelector("[data-carniza-liquidate]");
    const previousText = button.textContent;
    button.disabled = true; button.textContent = "Carniza armando oferta...";
    try {
      const service = await ensureCarnizaAIService();
      const urgentNames = selectedProducts.map((item) => item.name);
      const selectedItems = selectedProducts.map((item) => ({
        id: item.id,
        name: item.name,
        rubro: item.rubro,
        unit: item.unit,
        price: item.price,
        qty: Math.max(0.5, Number(item.qty || 1))
      }));
      const response = service?.buildUrgentStockCombo ? await service.buildUrgentStockCombo({
        products: urgentNames,
        selectedProducts: selectedItems,
        discount: selectedDiscount,
        prices: getCurrentProductsForCarniza(),
        businessName: getBusinessNameForCarniza()
      }) : null;
      if (!response?.ok) throw new Error("Sin respuesta de Carniza");
      renderUrgentResult(response);
    } catch (_) { showError("No pude armar la oferta. Probá otra vez o revisá los productos."); }
    finally { button.disabled = false; button.textContent = previousText; }
  });

  function suggestCommercialOfferName(items = []) {
    const names = items.map((item) => String(item?.name || item?.label || "").trim()).filter(Boolean);
    const joined = names.slice(0, 2).join(names.length > 1 ? " y " : "");
    const lower = names.join(" ").toLowerCase();
    if (/asado|vac[ií]o|chorizo|morcilla|entra[nñ]a|matambre|costilla|tira/.test(lower)) return "Promo parrillera de hoy";
    if (names.length >= 2) return "Promo especial: " + joined;
    if (names.length === 1) return "Oferta del día: " + names[0];
    return "Oferta especial de hoy";
  }

  function cleanExternalOfferTitle(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "Oferta especial de hoy";
    return raw
      .replace(/^[\s🔥🥩📣💥•\-]+/gu, "")
      .replace(/liquidaci[oó]n/gi, "oferta")
      .replace(/producto atrasado/gi, "promo especial")
      .replace(/sacar hoy/gi, "aprovechar hoy")
      .replace(/mercader[ií]a para mover/gi, "promo especial")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripGeneratedTitle(message = "") {
    const lines = String(message || "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length && /^[\s🔥🥩📣💥•\-]*(oferta|promo|combo|liquidaci[oó]n)/i.test(lines[0].trim())) {
      lines.shift();
      while (lines.length && !lines[0].trim()) lines.shift();
    }
    return lines.join("\n").trim();
  }

  function sanitizeOfferTextForWhatsApp(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/[—–]/g, "-")
      .replace(/[•·]/g, "-")
      .replace(/[\uFFFD]/g, "")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function buildFallbackOfferLines(items = []) {
    return items.map((item) => {
      const label = sanitizeOfferTextForWhatsApp(item?.label || item?.name || "Producto");
      return "- " + label;
    }).join("\n");
  }

  function buildExternalOfferMessage(title, baseMessage, items = [], total = 0, missing = []) {
    const safeTitle = sanitizeOfferTextForWhatsApp(cleanExternalOfferTitle(title || suggestCommercialOfferName(items))) || "OFERTA DEL DIA";
    const fallbackLines = buildFallbackOfferLines(items);
    const priceLine = Number(total || 0) > 0 ? "Total: " + formatCarnizaMoney(total) : "Precio especial a confirmar";
    const warning = missing.length ? "\n\nRevisa precios antes de enviar." : "";

    return [
      safeTitle.toUpperCase(),
      fallbackLines,
      priceLine,
      "Hasta agotar stock."
    ].filter(Boolean).join("\n\n") + warning;
  }

  function buildWhatsAppUrlForCarniza(message) {
    const whatsappDigits = getBusinessWhatsappForCarniza();
    if (!whatsappDigits || !message) return "";
    const phone = whatsappDigits.startsWith("54") ? whatsappDigits : "549" + whatsappDigits;
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
  }

  function renderUrgentResult(data) {
    const items = Array.isArray(data.items) ? data.items : [];
    const baseMessage = data.message || "";
    const missing = Array.isArray(data.missing_prices) ? data.missing_prices : [];
    const suggestedName = cleanExternalOfferTitle(data.offer_name || data.title || suggestCommercialOfferName(items));
    const setupNodes = Array.from(card.children).filter((node) => node !== resultEl);
    setupNodes.forEach((node) => { node.style.display = "none"; });

    resultEl.innerHTML = '<div style="border:1px solid #bfdbfe;border-radius:18px;background:#eff6ff;padding:14px;box-shadow:0 10px 22px rgba(37,99,235,.08);">' +
      '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">' +
        '<div><div style="font-size:18px;font-weight:1000;color:#1d4ed8;line-height:1.15;">🔥 Oferta lista</div><div style="font-size:13px;color:#1e3a8a;font-weight:850;margin-top:4px;line-height:1.28;">Promo clara, precio claro y lista para mandar por WhatsApp.</div></div>' +
        '<div style="font-size:26px;line-height:1;">📲</div>' +
      '</div>' +
      '<label style="display:block;font-size:13px;font-weight:1000;color:#1e3a8a;margin:8px 0 6px;">Nombre comercial de la oferta</label>' +
      '<input data-urgent-offer-name type="text" value="' + escapeCarnizaHtml(suggestedName) + '" placeholder="Ej: Promo parrillera de hoy" style="width:100%;box-sizing:border-box;min-height:48px;border:2px solid #93c5fd;border-radius:14px;padding:0 12px;background:#fff;color:#172554;font-weight:1000;font-size:15px;" />' +
      '<div style="font-size:12px;font-weight:900;color:#1e3a8a;margin:7px 0 10px;">Internamente vendés urgente. Al cliente le llega una oportunidad atractiva.</div>' +
      (missing.length ? '<div style="margin:8px 0;padding:8px;border-radius:10px;background:#fff8e1;color:#7a4b00;font-size:12px;font-weight:900;">⚠️ Revisá precio de: ' + escapeCarnizaHtml(missing.join(", ")) + '. No se encontró precio real.</div>' : '') +
      '<pre data-urgent-message-preview style="white-space:pre-wrap;font-family:inherit;margin:10px 0;padding:12px;border-radius:12px;background:#fff;color:#1f1f1f;font-weight:900;line-height:1.38;max-height:245px;overflow:auto;"></pre>' +
      '<div data-urgent-name-error style="display:none;margin:8px 0;padding:9px;border-radius:11px;background:#fff1f0;color:#9f1239;font-size:13px;font-weight:1000;">Poné un nombre claro para esta oferta antes de enviarla.</div>' +
      '<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:8px;">' +
        '<a data-urgent-whatsapp href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:14px;background:#1fa855;color:#fff;text-decoration:none;font-weight:1000;">📲 Enviar por WhatsApp</a>' +
        '<button type="button" data-copy-message style="min-height:50px;border:none;border-radius:14px;background:#2563eb;color:white;font-weight:1000;cursor:pointer;">Copiar texto</button>' +
      '</div>' +
      '<button type="button" data-urgent-back style="width:100%;min-height:44px;margin-top:9px;border:1px solid #bfdbfe;border-radius:13px;background:#fff;color:#1d4ed8;font-weight:1000;cursor:pointer;">← Volver y ajustar</button>' +
      '</div>';

    const nameInput = resultEl.querySelector("[data-urgent-offer-name]");
    const preview = resultEl.querySelector("[data-urgent-message-preview]");
    const whatsapp = resultEl.querySelector("[data-urgent-whatsapp]");
    const error = resultEl.querySelector("[data-urgent-name-error]");

    const getFinalMessage = () => buildExternalOfferMessage(nameInput?.value || suggestedName, baseMessage, items, data.total, missing);
    const refresh = () => {
      const cleanName = cleanExternalOfferTitle(nameInput?.value || "");
      const finalMessage = getFinalMessage();
      if (preview) preview.textContent = finalMessage;
      const waUrl = buildWhatsAppUrlForCarniza(finalMessage);
      if (whatsapp) {
        whatsapp.href = waUrl || "#";
        whatsapp.style.opacity = waUrl ? "1" : ".55";
        whatsapp.style.pointerEvents = waUrl ? "auto" : "none";
      }
      if (error) error.style.display = cleanName.length ? "none" : "block";
    };

    nameInput?.addEventListener("input", refresh);
    whatsapp?.addEventListener("click", (event) => {
      const cleanName = cleanExternalOfferTitle(nameInput?.value || "");
      if (!cleanName) { event.preventDefault(); if (error) error.style.display = "block"; nameInput?.focus(); return; }
      if (!registerDemoWhatsappAttempt("vender_urgente")) { event.preventDefault(); return; }
      trackCarnizaSignal("whatsapp_abierto", { source: "liquidador", offerName: cleanName, businessId: currentPayload?.businessId || currentBusinessId || null });
    });
    resultEl.querySelectorAll("[data-copy-message]").forEach((node) => node.addEventListener("click", async () => {
      const cleanName = cleanExternalOfferTitle(nameInput?.value || "");
      if (!cleanName) { if (error) error.style.display = "block"; nameInput?.focus(); return; }
      const finalMessage = getFinalMessage();
      try { await navigator.clipboard.writeText(finalMessage); alert("Mensaje copiado para WhatsApp."); } catch (_) { alert(finalMessage); }
    }));
    resultEl.querySelector("[data-urgent-back]")?.addEventListener("click", () => {
      resultEl.style.display = "none";
      resultEl.innerHTML = "";
      setupNodes.forEach((node) => { node.style.display = ""; });
    });
    refresh();
    resultEl.style.display = "block";
  }
  renderProductButtons(); renderDiscountButtons(); container.prepend(card);
}

function getCarnizaUnifiedContext() {
  const panel = currentPanelId || "dashboardPanel";
  if (panel === "builderPanel") {
    return {
      title: "Ya estás armando una oferta",
      hint: "Seguí con la promo normal o pasá a vender algo urgente.",
      primary: "offer"
    };
  }
  if (panel === "pricesPanel") {
    return {
      title: "Dejá precios listos y vendé",
      hint: "Actualizá lo necesario y después armá una oferta para WhatsApp.",
      primary: "offer"
    };
  }
  if (panel === "whatsappPanel") {
    return {
      title: "Estás en WhatsApp",
      hint: "Si ya tenés una oferta lista, este es el último paso: mandarla.",
      primary: "whatsapp"
    };
  }
  return {
    title: "¿Qué querés vender hoy?",
    hint: "Elegí una promo normal o una oferta urgente para mover stock rápido.",
    primary: "offer"
  };
}

function closeCarnizaUnifiedOverlay() {
  const overlay = document.getElementById("carnizaFloatingLiquidatorOverlay");
  overlay?.classList.remove("open");
  overlay?.setAttribute("aria-hidden", "true");
}

function renderCarnizaUnifiedMenu() {
  const body = document.getElementById("carnizaFloatingLiquidatorBody");
  if (!body || !currentPayload) return;
  const ctx = getCarnizaUnifiedContext();
  body.innerHTML = `
    <div class="carniza-unified-card">
      <div class="carniza-unified-kicker">Carniza vendedor</div>
      <h3>${escapeCarnizaHtml(ctx.title)}</h3>
      <p>${escapeCarnizaHtml(ctx.hint)}</p>
      <div class="carniza-unified-actions">
        <button type="button" class="carniza-unified-action primary" data-carniza-unified-action="offer">
          <strong>🔥 Armar oferta</strong>
          <span>Combo o promo tradicional para vender por WhatsApp.</span>
        </button>
        <button type="button" class="carniza-unified-action urgent" data-carniza-unified-action="urgent">
          <strong>⚡ Vender urgente</strong>
          <span>Elegí productos atrasados y sacalos hoy.</span>
        </button>
        <button type="button" class="carniza-unified-action" data-carniza-unified-action="whatsapp">
          <strong>📲 Ir a WhatsApp</strong>
          <span>Mandá una oferta guardada o lista.</span>
        </button>
      </div>
      <div class="carniza-unified-foot">Carniza no viene a charlar: viene a ayudarte a vender.</div>
    </div>
  `;
  body.querySelectorAll("[data-carniza-unified-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.carnizaUnifiedAction;
      trackCarnizaSignal("carniza_context_action", { action, businessId: currentPayload?.businessId || currentBusinessId || null, panelId: currentPanelId, appMode: currentSession?.appMode || "client" });
      if (action === "offer") {
        closeCarnizaUnifiedOverlay();
        goToPanel("builderPanel");
        return;
      }
      if (action === "whatsapp") {
        closeCarnizaUnifiedOverlay();
        goToPanel("whatsappPanel");
        return;
      }
      if (action === "urgent") {
        renderCarnizaUnifiedUrgentFlow();
      }
    });
  });
}

function renderCarnizaUnifiedUrgentFlow() {
  const body = document.getElementById("carnizaFloatingLiquidatorBody");
  if (!body || !currentPayload) return;
  body.innerHTML = `
    <button type="button" class="carniza-unified-back" data-carniza-back-menu>← Volver a opciones</button>
    <div data-carniza-urgent-slot></div>
  `;
  body.querySelector("[data-carniza-back-menu]")?.addEventListener("click", renderCarnizaUnifiedMenu);
  const slot = body.querySelector("[data-carniza-urgent-slot]");
  renderCarnizaUrgentStockCard(slot);
}

function ensureCarnizaFloatingLiquidator() {
  if (!currentPayload) return;

  if (!document.getElementById("carnizaFloatingLiquidatorStyle")) {
    const style = document.createElement("style");
    style.id = "carnizaFloatingLiquidatorStyle";
    style.textContent = `
      #carnizaFloatingLiquidatorFab {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 9997;
        min-width: 128px;
        height: 68px;
        border: none;
        border-radius: 999px;
        padding: 0 18px 0 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: linear-gradient(135deg, #0f4c81, #2563eb);
        color: #fff;
        font-weight: 1000;
        font-size: 15px;
        letter-spacing: .01em;
        box-shadow: 0 18px 38px rgba(15, 76, 129, .28);
        cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
      }
      body.apppromos-nelly-mode #carnizaFloatingLiquidatorShell,
      body.apppromos-nelly-mode .carniza-root,
      body.apppromos-nelly-mode .dash-carniza-card {
        display: none !important;
      }
      #carnizaFloatingLiquidatorFab:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 22px 46px rgba(15, 76, 129, .34);
        filter: brightness(1.04);
      }
      #carnizaFloatingLiquidatorFab .fab-avatar {
        width: 48px;
        height: 48px;
        max-width: 48px;
        max-height: 48px;
        border-radius: 999px;
        object-fit: cover;
        display: block;
        background: rgba(255,255,255,.18);
        border: 2px solid rgba(255,255,255,.58);
        box-shadow: 0 6px 14px rgba(15, 23, 42, .18);
      }
      #carnizaFloatingLiquidatorFab .fab-text {
        display: inline-block;
        white-space: nowrap;
      }
      @media (max-width: 520px) {
        #carnizaFloatingLiquidatorFab {
          right: 14px;
          bottom: 14px;
          min-width: 72px;
          width: 72px;
          height: 72px;
          padding: 0;
        }
        #carnizaFloatingLiquidatorFab .fab-avatar { width: 54px; height: 54px; max-width:54px; max-height:54px; }
        #carnizaFloatingLiquidatorFab .fab-text { display: none; }
      }
      #carnizaFloatingLiquidatorOverlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
        display: none;
        align-items: flex-end;
        justify-content: center;
        background: rgba(8, 20, 35, .56);
        backdrop-filter: blur(4px);
        padding: 18px;
      }
      #carnizaFloatingLiquidatorOverlay.open { display: flex; }
      #carnizaFloatingLiquidatorModal {
        width: min(720px, 100%);
        max-height: min(88vh, 760px);
        overflow: auto;
        border-radius: 24px;
        background: #f8fafc;
        box-shadow: 0 28px 80px rgba(2, 6, 23, .32);
        border: 1px solid rgba(226, 232, 240, .9);
      }
      .carniza-floating-avatar {
        width: 50px;
        height: 50px;
        max-width: 50px;
        max-height: 50px;
        border-radius: 999px;
        object-fit: cover;
        display:block;
        background: rgba(255,255,255,.16);
        border: 2px solid rgba(255,255,255,.42);
        flex: 0 0 auto;
      }
      .carniza-floating-title-row { display: flex; align-items: center; gap: 10px; }
      .carniza-floating-header {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 16px 12px;
        background: linear-gradient(135deg, #0f2742, #123f66);
        color: #fff;
      }
      .carniza-floating-header strong { display:block; font-size:18px; font-weight:1000; line-height:1.1; }
      .carniza-floating-header span { display:block; margin-top:4px; color:rgba(255,255,255,.82); font-size:13px; font-weight:800; line-height:1.3; }
      #carnizaFloatingLiquidatorClose {
        width:38px; height:38px; border:1px solid rgba(255,255,255,.28); border-radius:999px; background:rgba(255,255,255,.12); color:#fff; font-size:22px; font-weight:900; cursor:pointer;
      }
      #carnizaFloatingLiquidatorBody { padding:14px; }
      .carniza-unified-card {
        border:1px solid #dbeafe;
        border-radius:22px;
        background:linear-gradient(135deg,#ffffff,#eff6ff);
        padding:18px;
        box-shadow:0 16px 42px rgba(15,23,42,.08);
      }
      .carniza-unified-kicker { color:#0b63ce; text-transform:uppercase; letter-spacing:.05em; font-size:12px; font-weight:1000; margin-bottom:8px; }
      .carniza-unified-card h3 { margin:0 0 8px; color:#0f172a; font-size:26px; line-height:1.05; }
      .carniza-unified-card p { margin:0 0 14px; color:#475569; font-weight:850; line-height:1.4; }
      .carniza-unified-actions { display:grid; grid-template-columns:1fr; gap:10px; }
      .carniza-unified-action {
        border:1px solid #dbeafe;
        border-radius:18px;
        background:#fff;
        color:#0f172a;
        min-height:72px;
        padding:12px 14px;
        text-align:left;
        cursor:pointer;
        display:grid;
        gap:3px;
        box-shadow:0 6px 16px rgba(15,23,42,.05);
      }
      .carniza-unified-action strong { font-size:17px; font-weight:1000; }
      .carniza-unified-action span { color:#64748b; font-size:13px; font-weight:800; line-height:1.3; }
      .carniza-unified-action.primary { border-color:#93c5fd; background:linear-gradient(135deg,#eff6ff,#ffffff); }
      .carniza-unified-action.urgent { border-color:#fed7aa; background:linear-gradient(135deg,#fff7ed,#ffffff); }
      .carniza-unified-foot { margin-top:12px; color:#64748b; font-size:12px; font-weight:900; }
      .carniza-unified-back { width:100%; min-height:44px; border:1px solid #cbd5e1; border-radius:14px; background:#fff; color:#0f172a; font-weight:1000; cursor:pointer; margin-bottom:12px; }
      #carnizaFloatingLiquidatorBody #carnizaUrgentStockCard { margin:0 !important; border:1px solid #e2e8f0 !important; border-radius:20px !important; background:#ffffff !important; box-shadow:0 16px 42px rgba(15, 23, 42, .08) !important; }
      #carnizaFloatingLiquidatorBody input { border-color:#cbd5e1 !important; background:#fff !important; }
      #carnizaFloatingLiquidatorBody [data-carniza-liquidate] { background:linear-gradient(135deg,#16a34a,#15803d) !important; box-shadow:0 12px 24px rgba(22,163,74,.22) !important; }
    `;
    document.head.appendChild(style);
  }

  let shell = document.getElementById("carnizaFloatingLiquidatorShell");
  if (!shell) {
    shell = document.createElement("div");
    shell.id = "carnizaFloatingLiquidatorShell";
    shell.innerHTML = `
      <button id="carnizaFloatingLiquidatorFab" type="button" title="Abrir Carniza" aria-label="Abrir Carniza">
        <img class="fab-avatar" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
        <span class="fab-text">Carniza</span>
      </button>
      <div id="carnizaFloatingLiquidatorOverlay" aria-hidden="true">
        <div id="carnizaFloatingLiquidatorModal" role="dialog" aria-modal="true" aria-label="Carniza vendedor">
          <div class="carniza-floating-header">
            <div class="carniza-floating-title-row">
              <img class="carniza-floating-avatar" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
              <div>
                <strong>Carniza</strong>
                <span>Elegí el camino más rápido para vender.</span>
              </div>
            </div>
            <button id="carnizaFloatingLiquidatorClose" type="button" aria-label="Cerrar">×</button>
          </div>
          <div id="carnizaFloatingLiquidatorBody"></div>
        </div>
      </div>
    `;
    document.body.appendChild(shell);

    const overlay = shell.querySelector("#carnizaFloatingLiquidatorOverlay");
    shell.querySelector("#carnizaFloatingLiquidatorFab")?.addEventListener("click", () => {
      trackCarnizaSignal("carniza_unificado_abierto", { businessId: currentPayload?.businessId || currentBusinessId || null, panelId: currentPanelId, appMode: currentSession?.appMode || "client" });
      renderCarnizaUnifiedMenu();
      overlay?.classList.add("open");
      overlay?.setAttribute("aria-hidden", "false");
    });
    shell.querySelector("#carnizaFloatingLiquidatorClose")?.addEventListener("click", closeCarnizaUnifiedOverlay);
    overlay?.addEventListener("click", (event) => {
      if (event.target === overlay) closeCarnizaUnifiedOverlay();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCarnizaUnifiedOverlay();
    });
  }
}

function refreshFloatingLiquidatorBody() {
  renderCarnizaUnifiedMenu();
}

async function renderCarnizaCommercialLayer(container) {
  if (!container) return;
  // Pre-dev: no llamamos a /daily-recommendation si no hay backend real de Carniza.
  // El hito Carniza vive en Inicio y el Liquidador sigue disponible sin depender de Python.
}

function renderCurrentDashboard() {
  if (!currentPayload || !dashboardPanel) return;
  renderDashboard(
    dashboardPanel,
    currentPayload.businessId,
    currentPayload.meta,
    currentPayload.state,
    {
      onBusinessDataSave: async (formData) => {
        const result = await updateBusinessBasicData(
          currentPayload.businessId,
          formData,
          currentPayload.meta,
          currentPayload.state
        );
        currentPayload = {
          ...currentPayload,
          meta: result.meta,
          state: result.state
        };
        renderCurrentDashboard();
        renderWhatsApp(whatsappPanel, currentPayload.state?.savedCombos || [], currentPayload.meta || {}, getShareOptions("whatsapp_panel"));
        markLazyPanelsDirty();
        alert("Datos del negocio guardados correctamente.");
      }
    }
  );
  trackCarnizaSignal("carniza_home_seen", { businessId: currentPayload?.businessId || currentBusinessId || null, appMode: currentSession?.appMode || "client" });
  void renderCarnizaCommercialLayer(dashboardPanel);
  ensureCarnizaFloatingLiquidator();
}

function setMoreLinksVisible(visible) {
  if (!moreLinks) return;
  moreLinks.classList.toggle("open", Boolean(visible));
}

function activatePanel(panelId) {
  currentPanelId = panelId;

  // Modo foco: cuando el usuario entra a Competencia, el módulo queda como protagonista.
  // Al volver a cualquier otro panel, la navegación superior reaparece.
  document.body.classList.toggle("module-focus-market", panelId === "marketPanel");
  document.body.classList.toggle("module-focus-admin", panelId === "usersPanel");
  window.dispatchEvent(new CustomEvent("apppromos:panel-changed", { detail: { panelId } }));
  updateCarnizaContext({
    panelId,
    businessControl: currentBusinessControl,
    payload: currentPayload,
    appMode: currentSession?.appMode || "client"
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });

  document.querySelectorAll("button[data-panel]").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === panelId);
  });
}

function resetBuilderPanelForNewSale() {
  if (!builderPanel || !currentBusinessId || !currentPayload?.state) return;

  const products = getActiveProductCatalog();

  renderBuilder(builderPanel, products, async (...args) => {
    await trackBusinessActivityThrottled(currentBusinessId, 60);
    return refreshSavedModule(...args);
  }, getBuilderOptions());
}

function goToPanel(panelId, options = {}) {
  // Crear oferta debe abrir siempre como una acción nueva.
  // Evita que quede cacheada una oferta anterior y el carnicero se trabe en celular.
  if (panelId === "builderPanel") {
    resetBuilderPanelForNewSale();
  }

  activatePanel(panelId);
  setMoreLinksVisible(Boolean(options.keepMoreOpen));
  window.scrollTo({ top: 0, behavior: "smooth" });
  void renderLazyPanel(panelId);
}


function setupTopbarAutoHide() {
  let lastScrollY = window.scrollY || 0;
  let ticking = false;

  const NORMAL_HIDE_AFTER = 90;
  const NORMAL_DELTA = 12;

  const setTopbarHidden = (hidden) => {
    document.body.classList.toggle("ui-top-hidden", Boolean(hidden));

    // Limpieza defensiva: evita que quede una clase vieja de parches anteriores.
    document.querySelector(".topbar")?.classList.remove("app-header-hidden");
    document.querySelector(".topbar-frame")?.classList.remove("app-header-hidden");
  };

  const isAdminPanelActive = () => currentPanelId === "usersPanel";

  const applyTopbarState = () => {
    const current = window.scrollY || 0;
    const delta = current - lastScrollY;
    const moreIsOpen = moreLinks?.classList.contains("open");

    // Regla especial Admin:
    // En Panel Admin el header grande queda siempre oculto.
    // Evita que reaparezca al subir y libera pantalla de trabajo.
    if (isAdminPanelActive()) {
      setTopbarHidden(true);
      lastScrollY = current;
      return;
    }

    if (moreIsOpen || current <= 20) {
      setTopbarHidden(false);
      lastScrollY = current;
      return;
    }

    if (Math.abs(delta) < NORMAL_DELTA) return;

    if (delta > 0 && current > NORMAL_HIDE_AFTER) {
      setTopbarHidden(true);
    } else if (delta < 0) {
      setTopbarHidden(false);
    }

    lastScrollY = current;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      applyTopbarState();
      ticking = false;
    });
  }, { passive: true });

  window.addEventListener("resize", applyTopbarState);
  window.addEventListener("apppromos:panel-changed", (event) => {
    lastScrollY = window.scrollY || 0;
    if (event?.detail?.panelId === "usersPanel") {
      setTopbarHidden(true);
      return;
    }
    window.requestAnimationFrame(applyTopbarState);
  });
}

function bindNav() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-panel]");
    if (!button) return;

    const panelId = button.dataset.panel;
    if (!panelId) return;

    const insideMore = button.closest("#moreLinks");
    goToPanel(panelId, { keepMoreOpen: Boolean(insideMore) });
  });

  document.addEventListener("click", (event) => {
    const urgent = event.target.closest("[data-carniza-open-liquidator]");
    if (!urgent) return;
    trackCarnizaSignal(urgent.dataset.carnizaSignal || "carniza_urgent_clicked", { businessId: currentPayload?.businessId || currentBusinessId || null, panelId: currentPanelId, appMode: currentSession?.appMode || "client" });
    ensureCarnizaFloatingLiquidator();
    document.getElementById("carnizaFloatingLiquidatorFab")?.click();
  });

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action-panel]");
    if (!action) return;
    if (action.dataset.carnizaSignal) {
      trackCarnizaSignal(action.dataset.carnizaSignal, { businessId: currentPayload?.businessId || currentBusinessId || null, fromPanel: currentPanelId, toPanel: action.dataset.actionPanel, appMode: currentSession?.appMode || "client" });
    }
    goToPanel(action.dataset.actionPanel);
  });

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-more]");
    if (!toggle) return;
    setMoreLinksVisible(!moreLinks?.classList.contains("open"));
  });
}

function syncNavForRole(session) {
  const usersBtn = document.querySelector('[data-panel="usersPanel"]');
  const marketBtn = document.querySelector('[data-panel="marketPanel"]');
  const webBtn = document.querySelector('[data-panel="webPanel"]');
  const isSuperadmin = session?.appMode === "superadmin";

  if (usersBtn && usersPanel) {
    usersBtn.style.display = isSuperadmin ? "" : "none";
    usersPanel.style.display = isSuperadmin ? "" : "none";
  }

  if (marketBtn && marketPanel) {
    marketBtn.style.display = "";
    marketPanel.style.display = "";
  }

  if (webBtn && webPanel) {
    webBtn.style.display = "";
    webPanel.style.display = "";
  }
}

async function refreshSavedModule() {
  if (!currentBusinessId) return;
  const data = await loadActiveBusinessData(currentBusinessId);
  currentPayload = {
    businessId: data.businessId,
    meta: data.meta,
    state: data.state
  };
  renderSaved(savedPanel, data.state, getShareOptions("saved"));
  renderWhatsApp(whatsappPanel, data.state?.savedCombos || [], data.meta || {}, getShareOptions("whatsapp_panel"));
  renderCurrentDashboard();
  markLazyPanelsDirty();
}

async function refreshUsersModule() {
  if (!usersPanel) return;
  if (!currentSession || currentSession.appMode !== "superadmin") {
    usersPanel.innerHTML = `<div style="color:#6e6e6e;">Solo disponible para superadmin.</div>`;
    usersPanel.dataset.rendered = "true";
    return;
  }

  await renderAdminUsers(usersPanel, {
    onEnterAsBusiness: async (businessId) => {
      await changeActiveBusiness(businessId);
      goToPanel("dashboardPanel");
    }
  });
  usersPanel.dataset.rendered = "true";
}

async function refreshMarketModule() {
  if (!marketPanel) return;
  if (setPanelLocked(marketPanel, "competition")) return;

  marketPanel.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Actualizando competencia...</div>`;

  const activeName =
    currentPayload?.meta?.name ||
    currentPayload?.businessId ||
    currentBusinessId;

  await renderMarket(marketPanel, {
    activeBusinessId: currentBusinessId,
    activeBusinessName: activeName,
    products: currentPayload?.state?.products || [],
    onRefreshMarket: async () => {
      await loadMarketCacheOnce({ force: true });
      marketPanel.dataset.rendered = "";
      await refreshMarketModule();
    },
    onRebuildMarket: currentSession?.appMode === "superadmin"
      ? async () => {
          const ok = window.confirm("Se va a actualizar la base de comparación con las carnicerías cargadas. Usalo solo como administrador. ¿Continuar?");
          if (!ok) {
            await refreshMarketModule();
            return;
          }
          marketPanel.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Actualizando base de comparación...</div>`;
          const result = await rebuildMarketSnapshotsFromBusinesses();
          await loadMarketCacheOnce({ force: true });
          await refreshMarketModule();
          alert(`Snapshots generados: ${result.rebuilt.length}. Errores: ${result.errors.length}.`);
        }
      : null
  });
  if (isPaymentOverdue()) injectAccessWarning(marketPanel);
  marketPanel.dataset.rendered = "true";
}

async function refreshWebModule() {
  if (!webPanel) return;
  if (setPanelLocked(webPanel, "webPremium")) return;
  await renderWebPremium(webPanel, currentBusinessId);
  if (isPaymentOverdue()) injectAccessWarning(webPanel);
  webPanel.dataset.rendered = "true";
}

async function renderLazyPanel(panelId) {
  if (!currentBusinessId || lazyRenderInProgress === panelId) return;

  try {
    lazyRenderInProgress = panelId;

    if (panelId === "usersPanel" && usersPanel?.dataset.rendered !== "true") {
      await refreshUsersModule();
    }

    if (panelId === "marketPanel" && marketPanel?.dataset.rendered !== "true") {
      await refreshMarketModule();
    }

    if (panelId === "webPanel" && webPanel?.dataset.rendered !== "true") {
      await refreshWebModule();
    }
  } finally {
    lazyRenderInProgress = null;
  }
}

async function syncProductDrivenViews(updatedProducts = null) {
  if (!currentBusinessId || !currentPayload) return;

  if (Array.isArray(updatedProducts) && currentPayload.state) {
    currentPayload.state = {
      ...currentPayload.state,
      products: updatedProducts
    };
    const activeProducts = setActiveProductCatalog(updatedProducts);

    renderCurrentDashboard();
    renderBuilder(builderPanel, activeProducts, refreshSavedModule, getBuilderOptions());
    markLazyPanelsDirty();
    if (currentPanelId === "marketPanel") {
      await refreshMarketModule();
    }
    if (currentPanelId === "webPanel") {
      await refreshWebModule();
    }
    return;
  }

  const data = await loadActiveBusinessData(currentBusinessId);
  currentPayload = {
    businessId: data.businessId,
    meta: data.meta,
    state: data.state
  };
  const activeProducts = setActiveProductCatalog(data.products);

  renderCurrentDashboard();
  renderBuilder(builderPanel, activeProducts, refreshSavedModule, getBuilderOptions());
  markLazyPanelsDirty();
  if (currentPanelId === "marketPanel") {
    await refreshMarketModule();
  }
  if (currentPanelId === "webPanel") {
    await refreshWebModule();
  }
}

async function renderBusinessWorkspace(options = {}) {
  const payload = await openBusiness(currentBusinessId);
  const root = currentSession?.isDemo ? null : await readBusinessRoot(currentBusinessId).catch(() => null);
  currentBusinessControl = currentSession?.isDemo
    ? buildBusinessDefaults({ businessId: currentBusinessId, name: payload?.meta?.name || "Carnicería de Carniza", status: "active", billingStatus: "active", plan: "demo" })
    : buildBusinessDefaults({ ...(root || {}), businessId: currentBusinessId, name: root?.name || payload?.meta?.name || currentBusinessId });
  if (!options.skipTracking && !currentSession?.isDemo) {
    await trackBusinessLogin(currentBusinessId);
    await trackBusinessActivityThrottled(currentBusinessId, 60);
  }
  insertDemoBanner();
  currentPayload = payload;
  updateCarnizaContext({
    businessControl: currentBusinessControl,
    payload: currentPayload,
    panelId: currentPanelId,
    appMode: currentSession?.appMode || "client"
  });
  publishAccessStatus();

  if (!payload.meta || !payload.state) {
    dashboardPanel.innerHTML = `
      <h2 style="margin-top:0;">No hay datos cargados</h2>
      <p style="color:#6e6e6e;">
        Este negocio todavía no existe en Firebase o está incompleto.
        Corré primero el Seeder desde <strong>seeder.html</strong>.
      </p>
    `;
    pricesPanel.innerHTML = `<div>Sin datos.</div>`;
    savedPanel.innerHTML = `<div>Sin datos.</div>`;
    builderPanel.innerHTML = `<div>Sin datos.</div>`;
    whatsappPanel.innerHTML = `<div>Sin datos.</div>`;
    usersPanel.innerHTML = `<div>Sin datos.</div>`;
    marketPanel.innerHTML = `<div>Sin datos.</div>`;
    if (webPanel) webPanel.innerHTML = `<div>Sin datos.</div>`;
    return;
  }

  renderCurrentDashboard();
  // La Nelly queda en la alerta superior. Evitamos duplicar el mensaje dentro de Inicio.

  const data = await loadActiveBusinessData(currentBusinessId);
  const activeProducts = setActiveProductCatalog(data.products);

  if (!setPanelLocked(pricesPanel, "prices")) {
    renderPrices(pricesPanel, activeProducts, currentBusinessId, {
      ...getWriteOptions(),
      onProductsUpdated: async (...args) => {
        await trackBusinessActivityThrottled(currentBusinessId, 60);
        return syncProductDrivenViews(...args);
      }
    });
    if (isPaymentOverdue()) injectAccessWarning(pricesPanel);
  }

  if (!setPanelLocked(savedPanel, "combos")) renderSaved(savedPanel, data.state, getShareOptions("saved"));
  if (!setPanelLocked(builderPanel, "combos")) renderBuilder(builderPanel, activeProducts, async (...args) => {
    await trackBusinessActivityThrottled(currentBusinessId, 60);
    return refreshSavedModule(...args);
  }, getBuilderOptions());
  if (!setPanelLocked(whatsappPanel, "whatsapp")) renderWhatsApp(whatsappPanel, data.state?.savedCombos || [], payload.meta || {}, getShareOptions("whatsapp_panel"));

  if (usersPanel) {
    usersPanel.dataset.rendered = "";
    usersPanel.innerHTML = currentSession?.appMode === "superadmin"
      ? `<div style="padding:18px;color:#6e6e6e;">Usuarios se cargará al abrir este módulo.</div>`
      : `<div style="color:#6e6e6e;">Solo disponible para superadmin.</div>`;
  }

  if (marketPanel) {
    marketPanel.dataset.rendered = "";
    marketPanel.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Competencia se cargará al abrir este módulo.</div>`;
  }

  if (webPanel) {
    webPanel.dataset.rendered = "";
    webPanel.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Mi Web Premium se cargará al abrir este módulo.</div>`;
  }

  console.info("📊 AppPromos Firestore reads:", getReadDebug());
}

export async function changeActiveBusiness(id) {
  const nextId = String(id || "").trim();
  if (!nextId) return;
  if (nextId === currentBusinessId) return;

  try {
    const session = await resolveSession();
    currentSession = session;

    if (session.appMode !== "superadmin") {
      console.warn("Solo superadmin puede cambiar de empresa");
      return;
    }

    currentBusinessId = await setActiveBusinessId(nextId);
    restartBusinessControlListener(currentBusinessId);
    await renderBusinessWorkspace();
    goToPanel("dashboardPanel");
  } catch (error) {
    console.error("Error cambiando negocio:", error);
    alert(error?.message || "No se pudo cambiar de carnicería");
  }
}

async function boot() {
  try {
    bindNav();
    setupTopbarAutoHide();
    // Carniza visual unificado vive en ensureCarnizaFloatingLiquidator(). Evitamos segundo botón flotante legacy.
    // initCarniza({ onNavigate: goToPanel });

    const session = await resolveSession();
    currentSession = session;
    updateCarnizaContext({ appMode: currentSession?.appMode || "client" });

    if (session.appMode === "guest") {
      renderPublicAuth();
      return;
    }

    syncNavForRole(session);

    if (!session?.isDemo) {
      await loadMarketCacheOnce();
    }

    let businessId = null;

    if (session.appMode === "client") {
      businessId = session.businessId;
    } else if (session.appMode === "superadmin") {
      // V11.4.1A: por seguridad operativa, el superadmin arranca siempre en DEMO.
      // Si quiere trabajar sobre una carnicería real, debe seleccionarla explícitamente desde Admin.
      businessId = "demo";
    } else {
      throw new Error("Modo inválido");
    }

    currentBusinessId = businessId;
    restartBusinessControlListener(currentBusinessId);
    await renderBusinessWorkspace();
    goToPanel("dashboardPanel");
  } catch (error) {
    console.error("BOOT ERROR:", error);

    if (String(error?.message || "").toLowerCase().includes("usuario sin perfil")) {
      window.location.replace("./index.html");
      return;
    }

    dashboardPanel.innerHTML = `
      <h2 style="margin-top:0;">Error al iniciar</h2>
      <p style="color:#6e6e6e;">
        ${error?.message || "Revisá tu configuración de Firebase."}
      </p>
    `;

    pricesPanel.innerHTML = `<div>Error cargando precios.</div>`;
    savedPanel.innerHTML = `<div>Error cargando combos.</div>`;
    builderPanel.innerHTML = `<div>Error cargando armador.</div>`;
    whatsappPanel.innerHTML = `<div>Error cargando WhatsApp.</div>`;
    usersPanel.innerHTML = `<div>Error cargando usuarios.</div>`;
    marketPanel.innerHTML = `<div>Error cargando competencia.</div>`;
  }
}

boot();
