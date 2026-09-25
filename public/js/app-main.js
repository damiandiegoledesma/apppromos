import {
  openBusiness,
  setActiveBusinessId,
  getResolvedBusinessId
} from "./services/business-service.js";

import { resolveSession, logoutUser } from "./services/auth-service.js";

import { renderDashboard } from "./modules/dashboard-module.js";
import { renderPrices } from "./modules/prices-module.js";
import { renderSaved } from "./modules/saved-module.js";
import { renderBuilder } from "./modules/builder-module.js";
import { renderAdminUsers } from "./modules/admin-users-module.js";
import { renderMarket } from "./modules/market-module.js";
import { renderWhatsApp } from "./modules/whatsapp-module.js";
import { renderWebPremium } from "./modules/web-module.js";
import { renderPrintCenter } from "./modules/print-center-module.js";
import { initCarniza, updateCarnizaContext } from "./modules/carniza-module.js";
import { renderPublicAuth } from "./modules/public-auth-module.js";
import { trackCarnizaSignal } from "./services/carniza-signals-service.js";
import {
  trackDemoEvent,
  trackDemoStartedOnce,
  trackWebOpened,
  trackWebShared
} from "./services/tracking-service.js";

import { updateBusinessBasicData, getPublicWebUrl, saveWebConfig, syncPublicWebSnapshot, buildPublicWebPayload } from "./services/web-premium-service.js";
import { STOREFRONT_THEMES, getStorefrontTheme, normalizeStorefrontTheme } from "./services/storefront-theme-service.js";
import { finishDailyPromo, getArgentinaDayKey, getDailyPromosForManagement, publishDailyPromo } from "./services/daily-promos-service.js";
import {
  uploadBusinessLogo,
  uploadBusinessFrontPhoto,
  deleteBusinessLogo,
  deleteBusinessFrontPhoto
} from "./services/business-brand-service.js";
import { deleteArchivedSavedCombo, loadActiveBusinessData, saveCombo, setSavedComboArchived } from "./services/data-service.js";
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
  subscribeBusinessControl,
  trackBusinessCommercialEvent,
  ensureBusinessCommercialActivated,
  updateBusinessCommercialAssistant
} from "./services/admin-service.js";

const dashboardPanel = document.getElementById("dashboardPanel");
const pricesPanel = document.getElementById("pricesPanel");
const savedPanel = document.getElementById("savedPanel");
const builderPanel = document.getElementById("builderPanel");
const whatsappPanel = document.getElementById("whatsappPanel");
const usersPanel = document.getElementById("usersPanel");
const marketPanel = document.getElementById("marketPanel");
const webPanel = document.getElementById("webPanel");
const printPanel = document.getElementById("printPanel");
const moreLinks = document.getElementById("moreLinks");

let currentPayload = null;
let currentBusinessId = null;
let currentSession = null;
let currentBusinessControl = null;
let unsubscribeBusinessControl = null;
let lazyRenderInProgress = null;
let currentPanelId = "dashboardPanel";
let currentActiveProducts = [];
let pendingBuilderInitialMode = null;
let pendingBuilderEditCombo = null;
// La elección de la vista previa no se persiste hasta confirmar. Se conserva
// aquí para que un refresh del listener no vuelva la tarjeta a Estándar.
let transientStorefrontThemePreview = null;
let transientStorefrontPreviewView = "products";

const publicSnapshotSyncedBusinesses = new Set();
// Evita que una tarjeta fuerte de Carniza escriba nuevamente al re-renderizarse
// por el listener de la misma empresa.
const strongCommercialPromptsRecorded = new Set();

async function syncCurrentPublicWebSnapshot(reason = "app") {
  if (!currentPayload?.businessId || !currentPayload?.meta || !currentPayload?.state) return null;
  try {
    const payload = await syncPublicWebSnapshot(currentPayload.businessId, {
      meta: currentPayload.meta,
      state: currentPayload.state
    });
    if (payload) publicSnapshotSyncedBusinesses.add(currentPayload.businessId);
    return payload;
  } catch (error) {
    console.warn(`[AppPromos] No se pudo sincronizar snapshot público (${reason})`, error);
    return null;
  }
}


const MOBILE_ACTION_FOCUS_PANELS = new Set(["pricesPanel", "builderPanel", "whatsappPanel"]);

function updateMobileActionFocus(panelId = currentPanelId) {
  const isActionFocus = MOBILE_ACTION_FOCUS_PANELS.has(panelId);
  document.body.classList.toggle("app-mobile-action-focus", isActionFocus);
  document.body.classList.toggle("app-mobile-dashboard-focus", panelId === "dashboardPanel");
}

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
    updateMobileCompactHeader();
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
    trackDemoEvent("demo_register_clicked", { source: "conversion_prompt" });
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
  trackDemoEvent("demo_whatsapp_clicked", {
    source,
    whatsapp_count: usage.whatsappSentCount
  });
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
    onBeforeWhatsapp: ({ source } = {}) => {
      const cleanSource = source || "builder";
      const allowed = registerDemoWhatsappAttempt(cleanSource);
      if (allowed !== false) trackSellerWhatsappCommercial(cleanSource);
      return allowed;
    },
    onBeforePromoSave: ({ payload } = {}) => registerDemoPromoSaveAttempt(payload || {})
  };
}

function getBuilderOptions() {
  return {
businessId: currentBusinessId,
    businessMeta: currentPayload?.meta || {},
    ...getWriteOptions(),
    ...getDemoActionOptions(),
    onAfterComboUpdated: async (_combo, { published } = {}) => {
      if (published) await syncCurrentPublicWebSnapshot("promo_edited");
      if (webPanel) webPanel.dataset.rendered = "";
      goToPanel("savedPanel");
    }
  };
}

function trackSellerWhatsappCommercial(source = "unknown") {
  void trackBusinessCommercialEvent(currentBusinessId, "seller_whatsapp", {
    source: String(source || "unknown")
  });
}

function trackSellerWebCommercial(eventType, source = "unknown") {
  void trackBusinessCommercialEvent(currentBusinessId, eventType, {
    source: String(source || "unknown")
  });
}

document.addEventListener("apppromos:seller-whatsapp", (event) => {
  trackSellerWhatsappCommercial(event?.detail?.source || "unknown");
});
document.addEventListener("apppromos:seller-web-open", (event) => {
  trackSellerWebCommercial("web_open", event?.detail?.source || "unknown");
});

document.addEventListener("apppromos:seller-web-share", (event) => {
  trackSellerWebCommercial("web_share", event?.detail?.source || "unknown");
});

function getShareOptions(source = "saved") {
  return {
    onBeforeWhatsapp: () => {
      const allowed = registerDemoWhatsappAttempt(source);
      if (allowed !== false && source !== "saved") trackSellerWhatsappCommercial(source);
      if (allowed !== false && source === "saved") {
        void trackBusinessCommercialEvent(currentBusinessId, "offer_shared", { source: "saved_promos" });
      }
      return allowed;
    }
  };
}

function trackBusinessIdentityCompletedIfReady(source = "business_data") {
  const meta = currentPayload?.meta || {};
  const brand = meta.brand || {};
  const hasBasicIdentity = Boolean(
    (meta.name || meta.nombre || meta.publicDisplayName) &&
    (meta.telefono || meta.phone || meta.whatsapp) &&
    (meta.ciudad || meta.locality || meta.localidad)
  );
  if (!hasBasicIdentity || !brand.logoUrl || !brand.frontPhotoUrl) return;
  void trackBusinessCommercialEvent(currentBusinessId, "business_identity_completed", {
    source,
    once: true
  });
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
    trackDemoEvent("demo_register_clicked", { source: "demo_banner" });
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
  let showFullProductList = false;

  const card = document.createElement("div");
  card.id = "carnizaUrgentStockCard";
  card.style.cssText = "margin:0 0 14px;padding:15px;border:2px solid #ffd6b0;border-radius:18px;background:#fff8f0;box-shadow:0 10px 24px rgba(0,0,0,.06);";
  card.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">' +
      '<div><div style="font-size:17px;font-weight:1000;color:#8a2600;line-height:1.15;">🔥 Armá la Promo del día con Carniza</div><div style="font-size:13px;color:#6b4b3e;font-weight:800;margin-top:4px;line-height:1.28;">Marcá productos reales de tu lista. Carniza arma la oferta para vender hoy.</div></div>' +
      '<img src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" style="width:46px;height:46px;border-radius:999px;object-fit:cover;border:2px solid #fed7aa;background:#fff;" /></div>' +
    '<div data-daily-promos-management style="margin:0 0 12px;"></div>' +
    '<div style="font-size:13px;font-weight:1000;color:#8a2600;margin:4px 0 7px;">1. Elegí producto</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px;"><input data-carniza-product-search type="text" inputmode="text" placeholder="¿Qué producto necesitás vender hoy?" style="flex:1;min-width:0;min-height:44px;border:1px solid #e7c6a8;border-radius:13px;padding:0 12px;font-weight:900;background:#fff;" /><button type="button" data-carniza-clear-search aria-label="Limpiar búsqueda" title="Limpiar búsqueda" style="min-width:48px;border:1px solid #e7c6a8;border-radius:13px;background:#fff;color:#8a2600;font-size:18px;font-weight:1000;cursor:pointer;">×</button></div>' +
    '<button type="button" data-carniza-toggle-products style="width:100%;min-height:42px;margin:0 0 10px;border:1px solid #e7c6a8;border-radius:13px;background:#fff;color:#8a2600;font-size:13px;font-weight:1000;cursor:pointer;">Ver lista completa</button>' +
    '<div data-carniza-selected style="display:none;margin:2px 0 12px;padding:10px;border-radius:13px;background:#fff;border:2px solid #fdba74;color:#4b2a12;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(251,146,60,.12);"></div>' +
    '<div data-carniza-real-products style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;"></div>' +
    '<div style="font-size:15px;font-weight:1000;color:#8a2600;margin:8px 0;">2. Ajustá descuento</div>' +
    '<div data-carniza-discounts style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:8px;"></div>' +
    '<div data-carniza-discount-help style="font-size:12px;font-weight:900;color:#6b4b3e;margin:0 0 6px;">20% = vender rápido sin regalar todo.</div>' +
    '<div style="font-size:12px;font-weight:1000;color:#8a2600;margin:0 0 12px;padding:9px;border-radius:12px;background:#fff4e5;border:1px solid #f6c391;">🔥 El descuento se aplica SOLO a los productos que marcaste. AppPromos no agrega otros productos automáticamente.</div>' +
    '<button type="button" data-carniza-liquidate style="width:100%;min-height:52px;border:none;border-radius:16px;background:#c41e3a;color:#fff;font-size:16px;font-weight:1000;cursor:pointer;box-shadow:0 10px 20px rgba(196,30,58,.22);">3. Armar Promo del día</button>' +
    '<div data-carniza-error style="display:none;margin-top:10px;padding:10px;border-radius:12px;background:#fff1f0;color:#9f1239;font-size:13px;font-weight:900;"></div>' +
    '<div data-carniza-result style="display:none;margin-top:12px;"></div>';

  const productsEl = card.querySelector("[data-carniza-real-products]");
  const dailyPromosManagementEl = card.querySelector("[data-daily-promos-management]");
  const selectedEl = card.querySelector("[data-carniza-selected]");
  const discountsEl = card.querySelector("[data-carniza-discounts]");
  const searchInput = card.querySelector("[data-carniza-product-search]");
  const toggleProductsBtn = card.querySelector("[data-carniza-toggle-products]");
  const errorEl = card.querySelector("[data-carniza-error]");
  const resultEl = card.querySelector("[data-carniza-result]");
  const helpEl = card.querySelector("[data-carniza-discount-help]");

  function renderDailyPromosManagement(message = "", isError = false) {
    if (!dailyPromosManagementEl) return;
    const isDemo = currentSession?.isDemo === true;
    const todayKey = getArgentinaDayKey();
    const promos = getDailyPromosForManagement({ state: currentPayload?.state || {}, isDemo })
      .filter((promo = {}) => promo.status === "active" && promo.dayKey === todayKey && Date.parse(promo.expiresAt || "") > Date.now());
    const statusHtml = message
      ? '<div role="status" style="margin:0 0 8px;padding:8px;border-radius:10px;background:' + (isError ? '#fff1f0;color:#9f1239' : '#dcfce7;color:#166534') + ';font-size:12px;font-weight:1000;">' + escapeCarnizaHtml(message) + '</div>'
      : '';
    const rowsHtml = promos.length
      ? promos.map((promo = {}) => {
          const published = new Date(promo.publishedAt || promo.createdAt || "");
          const time = Number.isNaN(published.getTime()) ? "Hoy" : published.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
          return '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #fed7aa;">' +
            '<div style="min-width:0;"><strong style="display:block;color:#7c2d12;overflow-wrap:anywhere;">' + escapeCarnizaHtml(promo.name || "Promo del día") + '</strong><span style="display:block;margin-top:3px;color:#9a3412;font-size:11px;font-weight:850;">' + escapeCarnizaHtml(formatCarnizaMoney(promo.total || 0)) + ' · Publicada ' + escapeCarnizaHtml(time) + '</span></div>' +
            '<button type="button" data-finish-daily-promo="' + escapeCarnizaHtml(promo.id || "") + '" style="min-height:44px;padding:0 11px;border:1px solid #fecaca;border-radius:12px;background:#fff1f0;color:#b42318;font-size:12px;font-weight:1000;cursor:pointer;">Finalizar</button>' +
          '</div>';
        }).join("")
      : '<div style="padding-top:7px;color:#7c2d12;font-size:12px;font-weight:850;">No tenés ofertas activas publicadas hoy.</div>';
    dailyPromosManagementEl.innerHTML = '<details ' + (promos.length || message ? 'open' : '') + ' style="border:1px solid #fed7aa;border-radius:14px;background:#fff;padding:10px;">' +
      '<summary style="min-height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#9a3412;font-weight:1000;cursor:pointer;">📣 Publicadas hoy <span style="font-size:12px;">' + promos.length + '</span></summary>' + statusHtml + rowsHtml + '</details>';
  }

  dailyPromosManagementEl?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-finish-daily-promo]");
    if (!button) return;
    const promoId = String(button.dataset.finishDailyPromo || "").trim();
    if (!promoId || !confirm("¿Querés quitar esta oferta de tu web? Esta acción no se puede deshacer.")) return;
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "Finalizando...";
    try {
      const result = await finishDailyPromo({
        businessId: currentPayload?.businessId || currentBusinessId,
        meta: currentPayload?.meta || {},
        state: currentPayload?.state || {},
        promoId,
        isDemo: currentSession?.isDemo === true
      });
      currentPayload = { ...currentPayload, state: result.state };
      renderDailyPromosManagement(result.demo ? "Simulación finalizada. No se modificó una web pública real." : "Oferta finalizada y retirada de tu web.");
      trackCarnizaSignal("daily_promo_finished", { businessId: currentPayload?.businessId || currentBusinessId || null, promoId, demo: result.demo === true });
    } catch (finishError) {
      button.disabled = false;
      button.textContent = previousText;
      renderDailyPromosManagement(finishError?.message || "No se pudo finalizar la oferta.", true);
    }
  });

  function getSelectedProducts() {
    return realProducts
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({ ...item, qty: Math.max(0.5, Number(selectedQty.get(item.id) || 1)) }));
  }

  function getVisibleProducts() {
    const q = normalizeCarnizaProductKey(searchText);
    if (!q && !showFullProductList) return [];
    let source = realProducts;
    if (q) {
      source = realProducts.filter((item) => {
        const nameKey = normalizeCarnizaProductKey(item.name);
        const rubroKey = normalizeCarnizaProductKey(item.rubro);
        return nameKey.includes(q) || rubroKey.includes(q) || q.includes(nameKey);
      });
    }
    return showFullProductList ? source : source.slice(0, 10);
  }

  function updateProductListToggle() {
    if (!toggleProductsBtn) return;
    toggleProductsBtn.textContent = showFullProductList ? "Ocultar lista completa" : "Ver lista completa";
  }

  function calculateUrgentLiveSummary(selected = []) {
    const items = selected.map((item) => {
      const qty = Math.max(0.5, Number(item.qty || 1));
      const unitPrice = Number(item.price || 0);
      const listSubtotal = unitPrice * qty;
      const discountedSubtotal = Math.round(listSubtotal * (1 - selectedDiscount / 100));
      return { ...item, qty, unitPrice, listSubtotal, discountedSubtotal };
    });
    const listTotal = items.reduce((sum, item) => sum + item.listSubtotal, 0);
    const calculatedTotal = items.reduce((sum, item) => sum + item.discountedSubtotal, 0);
    const commercialTotal = calculatedTotal > 0 ? Math.max(100, Math.round(calculatedTotal / 100) * 100) : 0;
    const discountAmount = Math.max(0, listTotal - calculatedTotal);
    return { items, listTotal, calculatedTotal, commercialTotal, discountAmount };
  }

  function buildUrgentLiveSummaryHtml(selected = []) {
    const summary = calculateUrgentLiveSummary(selected);
    const quantityTotal = summary.items.reduce((sum, item) => sum + item.qty, 0);
    const quantityLabel = String(quantityTotal).replace(".", ",");
    const units = new Set(summary.items.map((item) => String(item.unit || "kg").trim() || "kg"));
    const selectionMeta = summary.items.length + ' producto' + (summary.items.length === 1 ? '' : 's') + (units.size === 1 ? ' · ' + quantityLabel + ' ' + [...units][0] : ' · cantidades configuradas');
    const detailRows = summary.items.map((item) =>
      '<div style="display:grid;gap:2px;padding:7px 0;border-top:1px solid #fed7aa;">' +
        '<strong style="color:#7c2d12;">' + escapeCarnizaHtml(formatCarnizaProductDisplay(item)) + '</strong>' +
        '<span>' + escapeCarnizaHtml(String(item.qty).replace(".", ",")) + ' ' + escapeCarnizaHtml(item.unit || "kg") + ' × ' + escapeCarnizaHtml(formatCarnizaMoney(item.unitPrice)) + ' = ' + escapeCarnizaHtml(formatCarnizaMoney(item.listSubtotal)) + '</span>' +
        '<span>Con ' + escapeCarnizaHtml(String(selectedDiscount)) + '%: ' + escapeCarnizaHtml(formatCarnizaMoney(item.discountedSubtotal)) + '</span>' +
      '</div>'
    ).join("");
    return '<div data-urgent-live-summary style="margin-top:10px;padding:11px;border:2px solid #fb923c;border-radius:14px;background:linear-gradient(180deg,#fff7ed,#fff);box-shadow:0 8px 18px rgba(234,88,12,.10);">' +
      '<div style="font-size:12px;font-weight:1000;color:#9a3412;text-transform:uppercase;letter-spacing:.04em;">Resumen de la Promo del día</div>' +
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-top:6px;">' +
        '<div style="color:#7c2d12;font-size:12px;font-weight:900;line-height:1.35;">' + escapeCarnizaHtml(selectionMeta) + '<br>Lista: ' + escapeCarnizaHtml(formatCarnizaMoney(summary.listTotal)) + ' · Ahorrás: ' + escapeCarnizaHtml(formatCarnizaMoney(summary.discountAmount)) + '</div>' +
        '<div style="text-align:right;color:#7c2d12;"><span style="display:block;font-size:11px;font-weight:1000;">TOTAL OFERTA</span><strong style="display:block;font-size:22px;line-height:1.05;">' + escapeCarnizaHtml(formatCarnizaMoney(summary.commercialTotal)) + '</strong></div>' +
      '</div>' +
      '<details style="margin-top:8px;color:#7c2d12;font-size:12px;font-weight:850;">' +
        '<summary style="min-height:36px;display:flex;align-items:center;cursor:pointer;font-weight:1000;">Ver detalle del cálculo</summary>' +
        detailRows +
        '<div style="display:flex;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #fb923c;"><span>Antes de redondear</span><strong>' + escapeCarnizaHtml(formatCarnizaMoney(summary.calculatedTotal)) + '</strong></div>' +
        '<div style="font-size:11px;margin-top:5px;">Total comercial redondeado a la centena.</div>' +
      '</details>' +
    '</div>';
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
        '<div style="display:grid;gap:7px;padding:9px 0;border-top:1px solid #f3dcc7;">' +
          '<div style="min-width:0;overflow-wrap:anywhere;line-height:1.25;color:#4b2a12;font-weight:1000;">🔥 ' + escapeCarnizaHtml(formatCarnizaProductDisplay(item)) + '</div>' +
          '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">' +
            '<button type="button" data-urgent-qty-minus="' + escapeCarnizaHtml(item.id) + '" aria-label="Restar cantidad de ' + escapeCarnizaHtml(item.name) + '" style="min-width:44px;min-height:44px;border-radius:11px;border:1px solid #e7c6a8;background:#fff;font-size:17px;font-weight:1000;cursor:pointer;">−</button>' +
            '<strong style="min-width:56px;text-align:center;white-space:nowrap;">' + escapeCarnizaHtml(String(item.qty).replace(".", ",")) + ' ' + escapeCarnizaHtml(item.unit || "kg") + '</strong>' +
            '<button type="button" data-urgent-qty-plus="' + escapeCarnizaHtml(item.id) + '" aria-label="Sumar cantidad de ' + escapeCarnizaHtml(item.name) + '" style="min-width:44px;min-height:44px;border-radius:11px;border:1px solid #e7c6a8;background:#fff;font-size:17px;font-weight:1000;cursor:pointer;">+</button>' +
            '<button type="button" data-urgent-remove="' + escapeCarnizaHtml(item.id) + '" aria-label="Quitar ' + escapeCarnizaHtml(item.name) + '" title="Quitar producto" style="min-width:44px;min-height:44px;border-radius:11px;border:1px solid #fecaca;background:#fff1f0;color:#b42318;font-size:17px;font-weight:1000;cursor:pointer;">×</button>' +
          '</div>' +
        '</div>'
      ).join("") + buildUrgentLiveSummaryHtml(selected);
  }

  function renderProductButtons() {
    const q = normalizeCarnizaProductKey(searchText);
    if (!realProducts.length) {
      productsEl.style.display = "grid";
      productsEl.innerHTML = '<div style="grid-column:1/-1;padding:12px;border-radius:12px;background:#fff1f0;color:#9f1239;font-weight:900;font-size:13px;">No encontré productos con precio cargado. Primero cargá precios reales.</div>';
      updateProductListToggle();
      renderSelectedSummary();
      return;
    }
    if (!q && !showFullProductList) {
      productsEl.style.display = "none";
      productsEl.innerHTML = "";
      updateProductListToggle();
      renderSelectedSummary();
      return;
    }
    const visible = getVisibleProducts();
    if (!visible.length) {
      productsEl.style.display = "grid";
      productsEl.innerHTML = '<div style="grid-column:1/-1;padding:12px;border-radius:12px;background:#fff8e1;color:#7a4b00;font-weight:900;font-size:13px;">No encontré ese producto en tu lista de precios. Para liquidarlo, primero tiene que existir con precio real.</div>';
      updateProductListToggle();
      renderSelectedSummary();
      return;
    }
    productsEl.style.display = "grid";
    productsEl.innerHTML = visible.map((item) => {
      const active = selectedIds.has(item.id);
      const subtitle = item.rubro ? item.rubro + " · " + formatCarnizaMoney(item.price) : formatCarnizaMoney(item.price);
      return '<button type="button" data-product-id="' + escapeCarnizaHtml(item.id) + '" style="min-height:52px;text-align:left;border-radius:14px;border:1px solid ' + (active ? "#c41e3a" : "#ead5bf") + ';background:' + (active ? "#c41e3a" : "#fff") + ';color:' + (active ? "#fff" : "#4b2a12") + ';font-weight:1000;cursor:pointer;padding:8px 10px;line-height:1.15;">' +
        '<div>' + escapeCarnizaHtml(formatCarnizaProductDisplay(item)) + (active ? " ✔" : "") + '</div>' +
        '<div style="font-size:11px;font-weight:900;opacity:.82;margin-top:3px;">' + escapeCarnizaHtml(subtitle) + '</div>' +
      '</button>';
    }).join("");
    updateProductListToggle();
    renderSelectedSummary();
  }

  function renderDiscountButtons() {
    const helpMap = { 10: "10% = suave, para empujar sin tocar mucho margen.", 15: "15% = buen empujón sin regalar la mercadería.", 20: "20% = vender rápido sin regalar todo.", 25: "25% = para sacarlo hoy sí o sí." };
    helpEl.textContent = helpMap[selectedDiscount] || (selectedDiscount + "% aplicado solo a los productos marcados.");
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
    const remove = event.target.closest("[data-urgent-remove]");
    if (remove) {
      const id = String(remove.dataset.urgentRemove || "").trim();
      if (!id) return;
      selectedIds.delete(id);
      selectedQty.delete(id);
      renderProductButtons();
      hideError();
      return;
    }
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
    showFullProductList = false;
    renderProductButtons();
    hideError();
  });

  toggleProductsBtn?.addEventListener("click", () => {
    showFullProductList = !showFullProductList;
    if (showFullProductList) {
      searchText = "";
      if (searchInput) searchInput.value = "";
    }
    renderProductButtons();
    hideError();
  });

  card.querySelector("[data-carniza-clear-search]")?.addEventListener("click", () => {
    searchText = "";
    showFullProductList = false;
    if (searchInput) searchInput.value = "";
    renderProductButtons();
    hideError();
  });

  discountsEl.addEventListener("click", (event) => { const btn = event.target.closest("[data-discount]"); if (!btn) return; selectedDiscount = Number(btn.dataset.discount || 20); renderDiscountButtons(); renderSelectedSummary(); });

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
        '<div><div style="font-size:18px;font-weight:1000;color:#1d4ed8;line-height:1.15;">🔥 Oferta lista</div><div style="font-size:13px;color:#1e3a8a;font-weight:850;margin-top:4px;line-height:1.28;">Oferta puntual para sacar esta mercadería hoy. No se guarda como combo permanente.</div></div>' +
        '<div style="font-size:26px;line-height:1;">📲</div>' +
      '</div>' +
      '<button type="button" data-urgent-back style="width:100%;min-height:44px;margin:0 0 10px;border:1px solid #bfdbfe;border-radius:13px;background:#fff;color:#1d4ed8;font-weight:1000;cursor:pointer;">← Volver y ajustar productos</button>' +
      '<label style="display:block;font-size:13px;font-weight:1000;color:#1e3a8a;margin:8px 0 6px;">Nombre comercial de la oferta</label>' +
      '<input data-urgent-offer-name type="text" value="' + escapeCarnizaHtml(suggestedName) + '" placeholder="Ej: Promo parrillera de hoy" style="width:100%;box-sizing:border-box;min-height:48px;border:2px solid #93c5fd;border-radius:14px;padding:0 12px;background:#fff;color:#172554;font-weight:1000;font-size:15px;" />' +
      '<div style="font-size:12px;font-weight:900;color:#1e3a8a;margin:7px 0 10px;">Vos armás una Promo del día. Al cliente le llega una oportunidad atractiva.</div>' +
      (missing.length ? '<div style="margin:8px 0;padding:8px;border-radius:10px;background:#fff8e1;color:#7a4b00;font-size:12px;font-weight:900;">⚠️ Revisá precio de: ' + escapeCarnizaHtml(missing.join(", ")) + '. No se encontró precio real.</div>' : '') +
      '<pre data-urgent-message-preview style="white-space:pre-wrap;font-family:inherit;margin:10px 0;padding:12px;border-radius:12px;background:#fff;color:#1f1f1f;font-weight:900;line-height:1.38;max-height:245px;overflow:auto;"></pre>' +
      '<div data-urgent-name-error style="display:none;margin:8px 0;padding:9px;border-radius:11px;background:#fff1f0;color:#9f1239;font-size:13px;font-weight:1000;">Poné un nombre claro para esta oferta antes de enviarla.</div>' +
      '<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:8px;">' +
        '<a data-urgent-whatsapp href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:14px;background:#1fa855;color:#fff;text-decoration:none;font-weight:1000;">📲 Enviar oferta por WhatsApp</a>' +
        '<button type="button" data-copy-message style="min-height:50px;border:none;border-radius:14px;background:#2563eb;color:white;font-weight:1000;cursor:pointer;">Copiar texto</button>' +
      '</div>' +
      '<button type="button" data-publish-daily style="width:100%;min-height:52px;margin-top:9px;border:none;border-radius:14px;background:#ea580c;color:#fff;font-size:14px;font-weight:1000;cursor:pointer;box-shadow:0 9px 18px rgba(234,88,12,.20);">🔥 Publicar por hoy en mi carnicería</button>' +
      '<div data-publish-daily-status role="status" aria-live="polite" style="display:none;margin-top:8px;padding:9px;border-radius:11px;font-size:12px;font-weight:1000;line-height:1.35;"></div>' +
      '</div>';

    const nameInput = resultEl.querySelector("[data-urgent-offer-name]");
    const preview = resultEl.querySelector("[data-urgent-message-preview]");
    const whatsapp = resultEl.querySelector("[data-urgent-whatsapp]");
    const error = resultEl.querySelector("[data-urgent-name-error]");
    const publishButton = resultEl.querySelector("[data-publish-daily]");
    const publishStatus = resultEl.querySelector("[data-publish-daily-status]");

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
      trackSellerWhatsappCommercial("promo_del_dia");
      trackCarnizaSignal("whatsapp_abierto", { source: "liquidador", offerName: cleanName, businessId: currentPayload?.businessId || currentBusinessId || null });
    });
    resultEl.querySelectorAll("[data-copy-message]").forEach((node) => node.addEventListener("click", async () => {
      const cleanName = cleanExternalOfferTitle(nameInput?.value || "");
      if (!cleanName) { if (error) error.style.display = "block"; nameInput?.focus(); return; }
      const finalMessage = getFinalMessage();
      try { await navigator.clipboard.writeText(finalMessage); alert("Mensaje copiado para WhatsApp."); } catch (_) { alert(finalMessage); }
    }));
    publishButton?.addEventListener("click", async () => {
      const cleanName = cleanExternalOfferTitle(nameInput?.value || "");
      if (!cleanName) { if (error) error.style.display = "block"; nameInput?.focus(); return; }
      if (!currentPayload?.state) return;
      const previousText = publishButton.textContent;
      publishButton.disabled = true;
      publishButton.textContent = "Publicando Promo del día...";
      if (publishStatus) publishStatus.style.display = "none";
      try {
        const result = await publishDailyPromo({
          businessId: currentPayload.businessId || currentBusinessId,
          meta: currentPayload.meta || {},
          state: currentPayload.state || {},
          isDemo: currentSession?.isDemo === true,
          offer: {
            name: cleanName,
            items,
            discountPct: data.discount,
            total: data.total
          }
        });
        currentPayload = { ...currentPayload, state: result.state };
        renderDailyPromosManagement();
        publishButton.textContent = result.demo ? "✅ Publicación de prueba lista" : "✅ Publicada por hoy";
        publishButton.style.background = "#15803d";
        if (publishStatus) {
          publishStatus.style.display = "block";
          publishStatus.style.background = "#dcfce7";
          publishStatus.style.color = "#166534";
          publishStatus.textContent = result.demo
            ? "Demo: simulación local. No se escribió en Firebase ni en una web pública real."
            : "Visible en el snapshot de tu carnicería hasta las 23:59 de Argentina. No se guardó en Promos.";
        }
        trackCarnizaSignal("daily_promo_published", { businessId: currentPayload.businessId || currentBusinessId || null, promoId: result.promo?.id || null, demo: result.demo === true });
        if (!result.demo) {
          void (async () => {
            await trackBusinessCommercialEvent(currentBusinessId, "daily_promo_created");
            await trackBusinessCommercialEvent(currentBusinessId, "daily_promo_published");
            await refreshCommercialBusinessControl();
            renderCurrentDashboard();
          })();
        }
      } catch (publishError) {
        publishButton.disabled = false;
        publishButton.textContent = previousText;
        if (publishStatus) {
          publishStatus.style.display = "block";
          publishStatus.style.background = "#fff1f0";
          publishStatus.style.color = "#9f1239";
          publishStatus.textContent = publishError?.message || "No se pudo publicar. Probá nuevamente.";
        }
      }
    });
    resultEl.querySelector("[data-urgent-back]")?.addEventListener("click", () => {
      resultEl.style.display = "none";
      resultEl.innerHTML = "";
      setupNodes.forEach((node) => { node.style.display = ""; });
      const modal = document.getElementById("carnizaFloatingLiquidatorModal");
      if (modal) modal.scrollTop = 0;
    });
    refresh();
    resultEl.style.display = "block";
    requestAnimationFrame(() => {
      const modal = document.getElementById("carnizaFloatingLiquidatorModal");
      if (modal) modal.scrollTop = 0;
      try { resultEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (_) {}
      nameInput?.focus?.({ preventScroll: true });
    });
  }
  renderProductButtons(); renderDiscountButtons(); renderDailyPromosManagement(); container.prepend(card);
}

function getCarnizaUnifiedContext() {
  const panel = currentPanelId || "dashboardPanel";
  if (panel === "builderPanel") {
    return {
      title: "Ya estás armando una oferta",
      hint: "Seguí con la promo normal o armá una Promo del día.",
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
    hint: "Elegí una promo normal o una Promo del día para mover stock rápido.",
    primary: "offer"
  };
}

function closeCarnizaUnifiedOverlay() {
  const overlay = document.getElementById("carnizaFloatingLiquidatorOverlay");
  overlay?.classList.remove("open");
  overlay?.setAttribute("aria-hidden", "true");
  document.body?.classList.remove("apppromos-carniza-overlay-open");
}

function getCarnizaExitLabel() {
  return currentSession?.isDemo ? "🚪 Salir de la demo" : "🚪 Cerrar sesión";
}

async function handleCarnizaExitApp() {
  closeCarnizaUnifiedOverlay();
  trackCarnizaSignal("carniza_exit_app", {
    businessId: currentPayload?.businessId || currentBusinessId || null,
    panelId: currentPanelId,
    appMode: currentSession?.appMode || "client",
    isDemo: currentSession?.isDemo === true
  });

  if (currentSession?.isDemo) {
    window.location.href = "./index.html";
    return;
  }

  try {
    await logoutUser();
  } catch (error) {
    console.warn("No se pudo cerrar sesión desde Carniza", error);
  }
  window.location.replace("./index.html");
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
          <strong>🔥 Vender o crear promo</strong>
          <span>Respondé una consulta o armá un combo para vender varias veces.</span>
        </button>
        <button type="button" class="carniza-unified-action urgent" data-carniza-unified-action="urgent">
          <strong>⚡ Promo del día</strong>
          <span>Sacá hoy la mercadería antes de perderla o mandarla a picar.</span>
        </button>
        <button type="button" class="carniza-unified-action" data-carniza-unified-action="whatsapp">
          <strong>📲 Ir a WhatsApp</strong>
          <span>Mandá una promo guardada o una respuesta lista.</span>
        </button>
        <button type="button" class="carniza-unified-action nav" data-carniza-unified-action="home">
          <strong>🏠 Volver a Inicio</strong>
          <span>Volvé al panel principal sin perderte.</span>
        </button>
        <button type="button" class="carniza-unified-action exit" data-carniza-unified-action="exit">
          <strong>${escapeCarnizaHtml(getCarnizaExitLabel())}</strong>
          <span>${currentSession?.isDemo ? "Volvé a la landing cuando termines de probar." : "Salí de la app de forma segura."}</span>
        </button>
      </div>
      <div class="carniza-unified-foot">Carniza ayuda a vender y también te deja volver o salir rápido.</div>
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
      if (action === "home") {
        closeCarnizaUnifiedOverlay();
        goToPanel("dashboardPanel");
        return;
      }
      if (action === "exit") {
        void handleCarnizaExitApp();
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

function openCarnizaUrgentFlowDirect() {
  ensureCarnizaFloatingLiquidator();
  const overlay = document.getElementById("carnizaFloatingLiquidatorOverlay");
  renderCarnizaUnifiedUrgentFlow();
  document.body?.classList.add("apppromos-carniza-overlay-open");
  overlay?.classList.add("open");
  overlay?.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    const modal = document.getElementById("carnizaFloatingLiquidatorModal");
    if (modal) modal.scrollTop = 0;
  });
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
        z-index: 2147482498;
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
      body.apppromos-nelly-mode .dash-carniza-card,
      body.module-focus-admin #carnizaFloatingLiquidatorShell,
      body.module-focus-admin .carniza-root,
      body.module-focus-admin .dash-carniza-card {
        display: none !important;
      }
      body.module-focus-admin #carnizaFloatingLiquidatorOverlay {
        display: none !important;
      }
      #carnizaFloatingLiquidatorFab:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 22px 46px rgba(15, 76, 129, .34);
        filter: brightness(1.04);
      }
      @media (max-width: 760px) {
        body.app-mobile-nav-ready #carnizaFloatingLiquidatorShell {
          max-width: 100vw;
          overflow: visible;
        }
        body.app-mobile-nav-ready #carnizaFloatingLiquidatorFab {
          right: max(12px, env(safe-area-inset-right, 0px));
          bottom: var(--apppromos-mobile-floating-bottom, 104px);
          max-width: calc(100vw - 24px);
        }
        body.app-mobile-nav-ready #carnizaFloatingLiquidatorOverlay {
          padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px));
        }
        body.app-mobile-nav-ready #carnizaFloatingLiquidatorModal {
          max-height: calc(100vh - 126px - env(safe-area-inset-bottom, 0px));
        }
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
          bottom: var(--apppromos-mobile-floating-bottom, 104px);
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
        z-index: 2147483200;
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
      .carniza-unified-action.nav { border-color:#bbf7d0; background:linear-gradient(135deg,#f0fdf4,#ffffff); }
      .carniza-unified-action.exit { border-color:#fecaca; background:linear-gradient(135deg,#fff1f2,#ffffff); }
      .carniza-unified-foot { margin-top:12px; color:#64748b; font-size:12px; font-weight:900; }
      .carniza-unified-back { width:100%; min-height:44px; border:1px solid #cbd5e1; border-radius:14px; background:#fff; color:#0f172a; font-weight:1000; cursor:pointer; margin-bottom:12px; }
      #carnizaFloatingLiquidatorBody #carnizaUrgentStockCard { margin:0 !important; border:1px solid #e2e8f0 !important; border-radius:20px !important; background:#ffffff !important; box-shadow:0 16px 42px rgba(15, 23, 42, .08) !important; }
      #carnizaFloatingLiquidatorBody input { border-color:#cbd5e1 !important; background:#fff !important; }
      #carnizaFloatingLiquidatorBody [data-carniza-liquidate] { background:linear-gradient(135deg,#16a34a,#15803d) !important; box-shadow:0 12px 24px rgba(22,163,74,.22) !important; }
      body.apppromos-carniza-overlay-open .app-mobile-bottom-menu,
      body.apppromos-carniza-overlay-open .app-mobile-bottom-nav { pointer-events:none; }
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
      document.body?.classList.add("apppromos-carniza-overlay-open");
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



/* V12.13-C6 - Header mobile compacto: Inicio vende, Mi cuenta administra */
function compactHeaderNormalizeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function compactHeaderClamp(value = "", max = 30) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? clean.slice(0, Math.max(0, max - 1)).trim() + "…" : clean;
}

function getCompactHeaderBusinessName() {
  const meta = currentPayload?.meta || {};
  const raw =
    meta?.publicDisplayName ||
    meta?.publicName ||
    meta?.name ||
    meta?.nombre ||
    currentBusinessControl?.name ||
    currentPayload?.businessId ||
    "Mi carnicería";

  const clean = String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/^(carnicer[ií]a\s*){2,}/i, "Carnicería ")
    .trim();

  return compactHeaderClamp(clean || "Mi carnicería", 28);
}

function getCompactHeaderStatusLabel() {
  const access = getAccessState(currentBusinessControl || {});
  const accessLabel = String(access?.label || access?.title || "").trim();
  const plan =
    currentBusinessControl?.plan ||
    currentBusinessControl?.billing?.plan ||
    currentPayload?.state?.plan ||
    currentPayload?.meta?.plan ||
    "";

  const planKey = compactHeaderNormalizeKey(plan);
  const accessKey = compactHeaderNormalizeKey(accessLabel);

  /* V12.22-A2-FIX4C: en mobile mostramos el tiempo real de prueba. */
  const trialDaysLeft = Number.isFinite(Number(access?.trialDaysLeft))
    ? Math.max(0, Math.ceil(Number(access.trialDaysLeft)))
    : null;
  const trialLabel = trialDaysLeft === null
    ? "Prueba activa"
    : `Gratis · ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"}`;

  if (currentSession?.isDemo || planKey === "demo") return trialLabel;
  if (["trial", "free", "gratis", "gratuito", "prueba", "prueba_gratis"].includes(planKey)) return trialLabel;

  if (accessKey && /(prueba|pendiente|vencid|suspend|pausad|bloquead|regulariz)/.test(accessKey)) {
    return compactHeaderClamp(accessLabel, 20);
  }

  const planLabel = typeof formatAccountPlanLabel === "function"
    ? formatAccountPlanLabel(plan)
    : String(plan || "").toUpperCase();

  if (planLabel && planLabel !== "Sin plan asignado") return compactHeaderClamp(planLabel, 20);
  if (accessLabel) return compactHeaderClamp(accessLabel, 20);
  return "Activa";
}

function updateMobileCompactHeader() {
  const copy = document.querySelector(".brand-copy");
  if (!copy) return;

  const title = getCompactHeaderBusinessName();
  const subtitle = getCompactHeaderStatusLabel();

  copy.dataset.mobileTitle = title;
  copy.dataset.mobileSubtitle = subtitle;
  copy.dataset.mobileTrial = getAccessState(currentBusinessControl || {})?.level === "trial" ? "true" : "false";

  /* V12.22-A2-FIX4C: el estado compacto abre el mismo detalle que el chip desktop. */
  if (copy.dataset.mobileTrialStatusBound !== "true") {
    copy.dataset.mobileTrialStatusBound = "true";
    copy.setAttribute("role", "button");
    copy.setAttribute("tabindex", "0");
    copy.setAttribute("aria-label", "Ver estado y días restantes de la prueba");

    const openAccessStatus = () => {
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      document.getElementById("status-chip")?.click();
    };

    copy.addEventListener("click", openAccessStatus);
    copy.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openAccessStatus();
    });
  }

  document.body?.classList.add("app-compact-brand-ready");
}

function renderSuperadminBusinessContextBanner() {
  if (!dashboardPanel || currentSession?.appMode !== "superadmin") return;

  const businessName =
    currentPayload?.meta?.name ||
    currentPayload?.meta?.nombre ||
    currentPayload?.businessId ||
    currentBusinessId ||
    "esta carnicería";

  const banner = document.createElement("div");
  banner.id = "adminBusinessContextBanner";
  banner.style.cssText = "margin:0 0 14px;padding:12px 14px;border:1px solid #d8cfc2;border-left:6px solid #1d3b7a;border-radius:16px;background:#f8fbff;color:#1f2f4f;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 8px 20px rgba(0,0,0,.04);";
  banner.innerHTML = `
    <div style="display:grid;gap:3px;min-width:220px;">
      <strong style="font-size:14px;">Modo administrador</strong>
      <span style="font-size:13px;line-height:1.3;font-weight:800;">Estás viendo <b>${escapeCarnizaHtml(businessName)}</b> como administrador.</span>
      <span style="font-size:12px;color:#5f6f8f;line-height:1.3;">Esto sirve para revisar soporte sin perder el control del Panel Admin.</span>
    </div>
    <button type="button" data-admin-return-panel style="min-height:38px;padding:0 13px;border:none;border-radius:10px;background:#1d3b7a;color:#fff;font-weight:1000;cursor:pointer;">Volver al Panel Admin</button>
  `;
  banner.querySelector("[data-admin-return-panel]")?.addEventListener("click", () => goToPanel("usersPanel"));
  dashboardPanel.prepend(banner);
}

const CARNIZA_ACTIVATION_MIN_PRICES = 10;
const CARNIZA_RECOMMENDED_PRICES = 15;
const CARNIZA_REACTIVATION_DAYS = 7;

function getCommercialQaForce() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("commercialQa") === "1" || params.get("onboarding") === "1";
  } catch (_) {
    return false;
  }
}

function getCommercialMetrics() {
  return currentBusinessControl?.metrics && typeof currentBusinessControl.metrics === "object"
    ? currentBusinessControl.metrics
    : {};
}

function getCommercialAssistantMemory() {
  return currentBusinessControl?.commercialAssistant &&
    typeof currentBusinessControl.commercialAssistant === "object"
    ? currentBusinessControl.commercialAssistant
    : {};
}

function patchCommercialAssistantLocal(patch = {}) {
  if (!currentBusinessControl || !patch || typeof patch !== "object") return;
  currentBusinessControl = {
    ...currentBusinessControl,
    commercialAssistant: {
      ...(currentBusinessControl.commercialAssistant || {}),
      ...patch
    }
  };
}

async function refreshCommercialBusinessControl() {
  if (!currentBusinessId || currentSession?.isDemo) return currentBusinessControl;
  const root = await readBusinessRoot(currentBusinessId).catch(() => null);
  if (!root) return currentBusinessControl;

  currentBusinessControl = buildBusinessDefaults({
    ...root,
    businessId: currentBusinessId,
    name: root?.name || currentPayload?.meta?.name || currentBusinessId
  });

  updateCarnizaContext({
    businessControl: currentBusinessControl,
    payload: currentPayload,
    panelId: currentPanelId,
    appMode: currentSession?.appMode || "client"
  });

  return currentBusinessControl;
}

function getCommercialQaDismissKey(objective = "") {
  return `apppromos_commercial_qa_dismissed_${currentBusinessId || "business"}_${String(objective || "objective")}`;
}

function isCommercialQaDismissed(state = {}) {
  try {
    return sessionStorage.getItem(getCommercialQaDismissKey(state.objective)) === "1";
  } catch (_) {
    return false;
  }
}

function markCommercialQaDismissed(state = {}) {
  try {
    sessionStorage.setItem(getCommercialQaDismissKey(state.objective), "1");
  } catch (_) {}
}

function getActivationPublicUrl() {
  const web = currentPayload?.state?.web || {};
  const slug = web?.slug || "";
  return (currentBusinessId && slug) ? getPublicWebUrl(currentBusinessId, slug) : "";
}

function getStorefrontThemePreviewUrl(themeId = "standard", previewView = "products") {
  const publicUrl = getActivationPublicUrl();
  if (!publicUrl) return "";
  try {
    const url = new URL(publicUrl, window.location.origin);
    url.searchParams.set("themePreview", normalizeStorefrontTheme(themeId));
    url.searchParams.set("previewView", previewView === "promos" ? "promos" : (previewView === "home" ? "home" : "products"));
    return url.toString();
  } catch (_) {
    return "";
  }
}

function getCurrentStorefrontThemeConfig() {
  return currentPayload?.state?.web || {};
}

function patchCurrentStorefrontThemeConfig(nextWeb = {}) {
  if (!currentPayload?.state) return;
  currentPayload.state.web = { ...(currentPayload.state.web || {}), ...(nextWeb || {}) };
}

async function saveStorefrontThemeConfig(patch = {}) {
  if (!currentBusinessId) throw new Error("No encontramos tu carnicería.");
  const nextWeb = await saveWebConfig(currentBusinessId, patch);
  patchCurrentStorefrontThemeConfig(nextWeb);
  return nextWeb;
}

function getActivationPricedCount() {
  const products = Array.isArray(currentPayload?.state?.products) ? currentPayload.state.products : [];
  return products.filter((product = {}) => {
    const price = Number(product.precio ?? product.price ?? 0);
    return product.active !== false &&
      product.activo !== false &&
      Number.isFinite(price) &&
      price > 0;
  }).length;
}

function getLocalActivationSharedKey() {
  return `apppromos_onboarding_web_shared_${currentBusinessId || "business"}`;
}

function wasActivationWebSharedLocally() {
  try {
    return localStorage.getItem(getLocalActivationSharedKey()) === "1";
  } catch (_) {
    return false;
  }
}

function getCommercialWebShareCount() {
  const metrics = getCommercialMetrics();
  const persistent = Number(metrics.webShareCount || 0);
  return Math.max(Number.isFinite(persistent) ? persistent : 0, wasActivationWebSharedLocally() ? 1 : 0);
}

function markActivationWebShared(source = "commercial_activation") {
  try {
    localStorage.setItem(getLocalActivationSharedKey(), "1");
  } catch (_) {}

  trackWebShared({ source, business_id: currentBusinessId || null });
  trackSellerWebCommercial("web_share", source);

  void ensureBusinessCommercialActivated(currentBusinessId, {
    pricedCount: getActivationPricedCount(),
    webShareCount: 1
  });
}

function daysSinceCommercialDate(raw = "") {
  const time = Date.parse(String(raw || ""));
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / (24 * 60 * 60 * 1000));
}

function getCarnizaCommercialState() {
  const metrics = getCommercialMetrics();
  const web = getCurrentStorefrontThemeConfig();
  const pricedCount = getActivationPricedCount();
  const webShareCount = getCommercialWebShareCount();
  const offerCreatedCount = Number(metrics.offerCreatedCount || 0);
  const offerPublishedCount = Number(metrics.offerPublishedCount || 0);
  const dailyPromoPublishedCount = Number(metrics.dailyPromoPublishedCount || 0);
  const activated = pricedCount >= CARNIZA_ACTIVATION_MIN_PRICES && webShareCount >= 1;
  const lastCommercialActionAt = String(metrics.lastCommercialActionAt || "");
  const inactiveDays = daysSinceCommercialDate(lastCommercialActionAt);

  if (pricedCount < CARNIZA_ACTIVATION_MIN_PRICES) {
    return {
      phase: "activation",
      objective: "complete_storefront",
      priority: 1,
      intensity: "strong",
      pricedCount,
      webShareCount,
      activated: false,
      title: "Antes de compartirla, dejemos tu vidriera bien completa.",
      message: `Tenés ${pricedCount} precio${pricedCount === 1 ? "" : "s"} cargado${pricedCount === 1 ? "" : "s"}. Con ${CARNIZA_ACTIVATION_MIN_PRICES} ya tenés una vidriera lista para mostrar.`,
      status: `Te faltan ${Math.max(0, CARNIZA_ACTIVATION_MIN_PRICES - pricedCount)} precio${Math.max(0, CARNIZA_ACTIVATION_MIN_PRICES - pricedCount) === 1 ? "" : "s"} para poder compartirla.`,
      primaryAction: "prices",
      primaryLabel: pricedCount ? "Seguir cargando precios" : "Cargar precios",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-precios.webp"
    };
  }

  // La personalización se habilita cuando ya publicó su primera promo O cuando
  // difundió el link. Una promo publicada ya es una señal comercial suficiente.
  if (webShareCount < 1 && offerPublishedCount < 1) {
    return {
      phase: "activation",
      objective: "share_storefront",
      priority: 2,
      intensity: "strong",
      pricedCount,
      webShareCount,
      activated: false,
      title: "Tu carnicería ya está lista para hacerse conocer.",
      message: `Tenés ${pricedCount} productos con precio. Revisala y compartila para que tus clientes puedan verla, armar el carrito y pedirte por WhatsApp.`,
      status: "La activación se completa cuando pongas tu vidriera frente a tus clientes.",
      primaryAction: "share",
      primaryLabel: "Compartir mi carnicería",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-compartir.webp"
    };
  }

  if (!metrics.commercialActivatedAt) {
    void ensureBusinessCommercialActivated(currentBusinessId, {
      pricedCount,
      webShareCount
    });
  }

  if (inactiveDays !== null && inactiveDays >= CARNIZA_REACTIVATION_DAYS) {
    return {
      phase: "reactivation",
      objective: "reactivate_share",
      priority: 3,
      intensity: "medium",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Hace unos días que no movemos tu carnicería.",
      message: "Ya tenés la vidriera armada. Volvamos a ponerla frente a tus clientes con una difusión rápida.",
      status: `${Math.floor(inactiveDays)} días sin una acción comercial registrada.`,
      primaryAction: "share",
      primaryLabel: "Volver a compartir",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-retomar.webp"
    };
  }

  if (pricedCount < CARNIZA_RECOMMENDED_PRICES) {
    return {
      phase: "growth",
      objective: "complete_catalog",
      priority: 4,
      intensity: "medium",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Tu carnicería ya está activada. Ahora podemos mejorar la vidriera.",
      message: `Ya tenés ${pricedCount} precios y la vidriera circulando. Si llegás a ${CARNIZA_RECOMMENDED_PRICES} productos va a quedar todavía más completa.`,
      status: "Esto ya no bloquea nada: es una mejora comercial.",
      primaryAction: "prices",
      primaryLabel: "Completar un poco más",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-progreso.webp"
    };
  }

  if (offerCreatedCount < 1) {
    return {
      phase: "growth",
      objective: "first_promo",
      priority: 5,
      intensity: "medium",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Tu vidriera ya funciona. ¿Le damos un motivo para comprar?",
      message: "Probá armar tu primera promo con los precios que ya cargaste. Es opcional: tu carnicería ya está activada.",
      status: "Siguiente oportunidad de crecimiento: primera promo.",
      primaryAction: "first_promo",
      primaryLabel: "Crear mi primera promo",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-online.webp"
    };
  }

  if (offerPublishedCount < 1) {
    return {
      phase: "growth",
      objective: "publish_promo",
      priority: 6,
      intensity: "medium",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Ya creaste una promo. Falta ponerla frente a tus clientes.",
      message: "Entrá al Centro de Promos, revisala y publicala cuando quieras.",
      status: "Tenés una oportunidad comercial lista para publicar.",
      primaryAction: "saved_promos",
      primaryLabel: "Ver mis promos",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-publicar.webp"
    };
  }

  const storefrontThemePromptSeen = Boolean(web?.storefrontThemePromptSeenAt || web?.storefrontThemeSelectedAt);
  if (!storefrontThemePromptSeen) {
    return {
      phase: "growth",
      objective: "personalize_storefront",
      priority: 7,
      intensity: "strong",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Tu carnicería ya está lista para vender. Ahora hacela tuya.",
      message: "Elegí el estilo que mejor representa a tu negocio. Tus productos, promos, carrito y enlace siguen igual.",
      status: "Último paso opcional: personalizá el diseño de tu vidriera.",
      primaryAction: "storefront_theme",
      primaryLabel: "Elegir estilo",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-online.webp"
    };
  }

  if (dailyPromoPublishedCount < 1) {
    return {
      phase: "growth",
      objective: "first_daily_promo",
      priority: 7,
      intensity: "medium",
      pricedCount,
      webShareCount,
      activated: true,
      title: "Ya sabés publicar promos. Te queda otra herramienta para vender hoy.",
      message: "Si alguna vez necesitás mover mercadería rápido, Carniza puede armar una Promo del día y publicarla hasta las 23:59.",
      status: "Probala cuando tengas una oportunidad real; no es obligatoria.",
      primaryAction: "daily_promo",
      primaryLabel: "Ver Promo del día",
      asset: "/assets/characters/carniza/onboarding/carniza-onboarding-whatsapp.webp"
    };
  }

  return {
    phase: "active",
    objective: "active",
    priority: 99,
    intensity: "light",
    pricedCount,
    webShareCount,
    activated: true,
    title: "",
    message: "",
    status: "",
    primaryAction: "",
    primaryLabel: "",
    asset: ""
  };
}

function renderStorefrontThemeChoices(selectedTheme = "standard") {
  const currentTheme = normalizeStorefrontTheme(selectedTheme);
  return STOREFRONT_THEMES.map((theme) => {
    const selected = theme.id === currentTheme;
    return `<button type="button" data-storefront-theme-choice="${theme.id}" aria-pressed="${selected}" style="display:grid;gap:7px;padding:10px;border:2px solid ${selected ? "#c2410c" : "#eaded7"};border-radius:16px;background:#fff;text-align:left;cursor:pointer;font:inherit;box-shadow:${selected ? "0 8px 18px rgba(124,45,18,.10)" : "none"};"><span style="height:38px;border-radius:10px;display:flex;overflow:hidden;">${theme.colors.map((color) => `<i style="flex:1;background:${color};"></i>`).join("")}</span><strong style="color:#2b2724;font-size:12px;line-height:1.15;">${escapeCarnizaHtml(theme.label)}</strong><small style="color:#8a5c51;font-size:10px;font-weight:850;">${escapeCarnizaHtml(theme.caption)}</small></button>`;
  }).join("");
}

function renderStorefrontThemePrompt(state = {}) {
  setCommercialActivationUi(true);
  if (!dashboardPanel) return;

  dashboardPanel.querySelector(".dash-main-card")?.style.setProperty("display", "none", "important");
  dashboardPanel.querySelector(".dash-two")?.style.setProperty("display", "none", "important");

  const web = getCurrentStorefrontThemeConfig();
  const selectedTheme = normalizeStorefrontTheme(transientStorefrontThemePreview || web?.storefrontTheme || "standard");
  const card = document.createElement("section");
  card.dataset.carnizaCommercialMotor = "storefront-theme";
  card.style.cssText = "margin:0 0 16px;padding:18px;border:1px solid #fed7aa;border-radius:22px;background:linear-gradient(180deg,#fffaf0,#fff);box-shadow:0 12px 30px rgba(124,45,18,.10);";
  card.innerHTML = `
    <style>
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-layout{display:grid;grid-template-columns:minmax(120px,.34fr) minmax(0,.88fr) minmax(280px,.78fr);gap:18px;align-items:center}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-frame{position:relative;min-height:430px;overflow:hidden;border:8px solid #2c211d;border-radius:24px;background:#fff;box-shadow:0 14px 28px rgba(74,24,17,.18)}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-frame iframe{display:block;width:100%;height:430px;border:0;background:#fff;pointer-events:none}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-badge{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1;padding:5px 9px;border-radius:999px;background:rgba(74,24,17,.9);color:#fff;font-size:13px;font-weight:900;white-space:nowrap}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-actions{display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:10px}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-tab{min-height:32px;border:1px solid #eaded7;border-radius:999px;background:#fff;padding:0 10px;color:#7c2d12;font-weight:900;cursor:pointer}
      [data-carniza-commercial-motor="storefront-theme"] .theme-preview-tab[aria-pressed="true"]{border-color:#c2410c;background:#fff0e7;color:#9a3412}
      @media(max-width:980px){[data-carniza-commercial-motor="storefront-theme"] .theme-preview-layout{grid-template-columns:minmax(110px,.3fr) minmax(0,1fr)}[data-carniza-commercial-motor="storefront-theme"] .theme-preview-frame{grid-column:1/-1;max-width:480px;width:100%;justify-self:center}}
      @media(max-width:620px){[data-carniza-commercial-motor="storefront-theme"] .theme-preview-layout{grid-template-columns:1fr}[data-carniza-commercial-motor="storefront-theme"] .theme-preview-layout>img{display:none}[data-carniza-commercial-motor="storefront-theme"] .theme-preview-frame{min-height:390px}[data-carniza-commercial-motor="storefront-theme"] .theme-preview-frame iframe{height:390px}}
    </style>
    <div class="theme-preview-layout">
      <img src="${state.asset}" alt="Carniza" style="width:min(100%,190px);max-height:205px;object-fit:contain;justify-self:center;">
      <div>
        <span style="display:inline-flex;padding:5px 9px;border-radius:999px;background:#ffedd5;color:#9a3412;font-size:13px;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;">Diseño de tu vidriera</span>
        <h2 style="margin:9px 0 6px;color:#4a1811;font-size:clamp(24px,4vw,34px);line-height:1.03;letter-spacing:-.04em;">${escapeCarnizaHtml(state.title)}</h2>
        <p style="margin:0;color:#6b4b3e;font-weight:800;line-height:1.42;">Probá cada alternativa en una vista previa de tu propia vidriera. Nada cambia hasta que confirmes.</p>
        <div data-storefront-theme-choices style="display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:9px;margin-top:15px;"></div>
        <div class="theme-preview-tabs" aria-label="Contenido de la vista previa">
          <button type="button" class="theme-preview-tab" data-storefront-preview-view="products" aria-pressed="true">Ver productos</button>
          <button type="button" class="theme-preview-tab" data-storefront-preview-view="promos" aria-pressed="false">Ver promos</button>
          <button type="button" class="theme-preview-tab" data-storefront-preview-view="home" aria-pressed="false">Ver inicio</button>
        </div>
        <p data-storefront-theme-status style="min-height:20px;margin:10px 0 0;color:#7c2d12;font-weight:900;font-size:13px;">Vista previa: ${escapeCarnizaHtml(getStorefrontTheme(selectedTheme).label)}</p>
        <div class="theme-preview-actions">
          <button type="button" data-storefront-theme-defer style="min-height:42px;border:0;background:transparent;color:#9a3412;font-weight:900;cursor:pointer;padding:0 10px;">Ver después</button>
          <button type="button" data-storefront-theme-apply style="min-height:42px;border:0;border-radius:13px;background:#c2410c;color:#fff;font-weight:950;cursor:pointer;padding:0 16px;">Aplicar este estilo</button>
        </div>
      </div>
      <div class="theme-preview-frame" aria-label="Vista previa de tu vidriera">
        <span class="theme-preview-badge">Vista previa · no se guarda todavía</span>
        <iframe data-storefront-theme-preview title="Vista previa de tu vidriera" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
    </div>`;

  const choices = card.querySelector("[data-storefront-theme-choices]");
  if (choices) choices.innerHTML = renderStorefrontThemeChoices(selectedTheme);
  const status = card.querySelector("[data-storefront-theme-status]");
  const preview = card.querySelector("[data-storefront-theme-preview]");
  const applyButton = card.querySelector("[data-storefront-theme-apply]");
  let previewTheme = selectedTheme;
  let previewView = transientStorefrontPreviewView || "products";

  const enforcePreviewTheme = () => {
    try {
      const previewDocument = preview?.contentDocument;
      if (previewDocument?.documentElement) previewDocument.documentElement.dataset.storefrontTheme = previewTheme;
    } catch (_) {}
  };

  const showPreview = (nextTheme, nextView = previewView) => {
    previewTheme = normalizeStorefrontTheme(nextTheme);
    previewView = ["home", "products", "promos"].includes(nextView) ? nextView : "products";
    transientStorefrontThemePreview = previewTheme;
    transientStorefrontPreviewView = previewView;
    const theme = getStorefrontTheme(previewTheme);
    const previewUrl = getStorefrontThemePreviewUrl(previewTheme, previewView);
    if (preview) preview.src = previewUrl || "about:blank";
    card.querySelectorAll("[data-storefront-theme-choice]").forEach((choice) => {
      const active = choice.getAttribute("data-storefront-theme-choice") === previewTheme;
      choice.setAttribute("aria-pressed", String(active));
      choice.style.borderColor = active ? "#c2410c" : "#eaded7";
      choice.style.boxShadow = active ? "0 8px 18px rgba(124,45,18,.10)" : "none";
    });
    card.querySelectorAll("[data-storefront-preview-view]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-storefront-preview-view") === previewView));
    });
    if (status) status.textContent = previewUrl
      ? `Vista previa: ${theme.label}. Confirmá sólo si te gusta cómo queda.`
      : "No pudimos preparar la vista previa. Probá recargar la página.";
    if (applyButton) applyButton.disabled = !previewUrl;
  };

  preview?.addEventListener("load", enforcePreviewTheme);

  if (!web?.storefrontThemePromptShownAt) {
    const shownAt = new Date().toISOString();
    patchCurrentStorefrontThemeConfig({ storefrontThemePromptShownAt: shownAt });
    void saveStorefrontThemeConfig({ storefrontThemePromptShownAt: shownAt, updatedFrom: "commercial_theme_offer" });
    void trackBusinessCommercialEvent(currentBusinessId, "storefront_theme_offered", { source: "commercial_activation" });
  }

  card.querySelectorAll("[data-storefront-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const themeId = normalizeStorefrontTheme(button.getAttribute("data-storefront-theme-choice"));
      showPreview(themeId);
      void trackBusinessCommercialEvent(currentBusinessId, "storefront_theme_previewed", { theme: themeId, source: "commercial_activation" });
    });
  });

  card.querySelectorAll("[data-storefront-preview-view]").forEach((button) => {
    button.addEventListener("click", () => showPreview(previewTheme, button.getAttribute("data-storefront-preview-view")));
  });

  showPreview(selectedTheme);

  applyButton?.addEventListener("click", async () => {
      const theme = getStorefrontTheme(previewTheme);
      if (status) status.textContent = "Guardando el estilo elegido...";
      try {
        await saveStorefrontThemeConfig({
          storefrontTheme: previewTheme,
          storefrontThemeSelectedAt: new Date().toISOString(),
          storefrontThemePromptSeenAt: web?.storefrontThemePromptSeenAt || new Date().toISOString(),
          updatedFrom: "commercial_theme_selection"
        });
        transientStorefrontThemePreview = null;
        transientStorefrontPreviewView = "products";
        void trackBusinessCommercialEvent(currentBusinessId, "storefront_theme_selected", { theme: previewTheme, source: "commercial_activation" });
        if (status) status.textContent = `✅ Listo: tu vidriera usa el estilo ${theme.label}.`;
        await dismissCommercialPrompt(state);
      } catch (error) {
        console.error(error);
        if (status) status.textContent = "No se pudo aplicar el estilo. Probá de nuevo.";
      }
  });

  card.querySelector("[data-storefront-theme-defer]")?.addEventListener("click", async () => {
    try {
      await saveStorefrontThemeConfig({
        storefrontThemePromptSeenAt: new Date().toISOString(),
        storefrontThemeDeferredAt: new Date().toISOString(),
        updatedFrom: "commercial_theme_defer"
      });
      void trackBusinessCommercialEvent(currentBusinessId, "storefront_theme_deferred", { source: "commercial_activation" });
    } catch (error) {
      console.warn("No se pudo recordar la postergación del tema", error);
    }
    transientStorefrontThemePreview = null;
    transientStorefrontPreviewView = "products";
    await dismissCommercialPrompt(state);
  });

  dashboardPanel.prepend(card);
}

function getCommercialPromptCooldownMs(state = {}) {
  if (state.phase === "activation") return 24 * 60 * 60 * 1000;
  if (state.phase === "reactivation") return 48 * 60 * 60 * 1000;
  return 72 * 60 * 60 * 1000;
}

function shouldShowCommercialPrompt(state = {}) {
  if (!state || state.phase === "active") return false;
  if (isCommercialQaDismissed(state)) return false;
  if (getCommercialQaForce()) return true;

  const memory = getCommercialAssistantMemory();
  if (String(memory.currentObjective || "") !== String(state.objective || "")) return true;

  const dismissedAt = Date.parse(String(memory.lastDismissedAt || ""));
  if (!Number.isFinite(dismissedAt)) return true;

  return Date.now() - dismissedAt >= getCommercialPromptCooldownMs(state);
}

function setCommercialActivationUi(active = false) {
  const enabled = Boolean(active);
  document.body?.classList.toggle("app-commercial-activation-active", enabled);

  let style = document.getElementById("commercialActivationUiStyle");
  if (!style) {
    style = document.createElement("style");
    style.id = "commercialActivationUiStyle";
    style.textContent = `
      /* La activaciÃ³n comercial acompaÃ±a, pero nunca bloquea la navegaciÃ³n.
         El carnicero siempre conserva un camino visible para salir de Precios. */
      body.app-commercial-activation-active #carnizaFloatingLiquidatorFab {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (enabled) {
    document.querySelector(".app-mobile-bottom-menu")?.classList.remove("is-open");
  }
}

async function rememberCommercialPrompt(state = {}, patch = {}) {
  if (!currentBusinessId || currentSession?.isDemo) return;
  const memory = getCommercialAssistantMemory();
  const next = {
    currentObjective: state.objective || "",
    strongPromptCount: Number(memory.strongPromptCount || 0) + (patch.incrementPrompt ? 1 : 0),
    ...patch
  };

  patchCommercialAssistantLocal(next);
  await updateBusinessCommercialAssistant(currentBusinessId, next);
}


function rememberStrongCommercialPromptOnce(state = {}) {
  const objective = String(state?.objective || "").trim() || "objective";
  const key = `${currentBusinessId || "business"}:${objective}`;

  if (strongCommercialPromptsRecorded.has(key)) return;
  strongCommercialPromptsRecorded.add(key);

  void rememberCommercialPrompt(state, {
    lastStrongPromptAt: new Date().toISOString(),
    incrementPrompt: true
  });
}
async function dismissCommercialPrompt(state = {}) {
  const now = new Date().toISOString();
  markCommercialQaDismissed(state);
  patchCommercialAssistantLocal({
    currentObjective: state.objective || "",
    lastDismissedAt: now,
    lastStrongPromptAt: state.intensity === "strong" ? now : getCommercialAssistantMemory().lastStrongPromptAt
  });

  setCommercialActivationUi(false);
  dashboardPanel?.querySelectorAll("[data-carniza-commercial-motor]").forEach((node) => node.remove());
  renderCurrentDashboard();

  await rememberCommercialPrompt(state, {
    lastDismissedAt: now,
    lastStrongPromptAt: state.intensity === "strong" ? now : undefined
  });
}

function openCommercialShareWhatsapp(publicUrl = "", source = "carniza_motor") {
  const cleanUrl = String(publicUrl || "").trim();
  if (!cleanUrl) return;

  const text = `¡Hola! 👋 Mirá nuestra carnicería online. Podés ver precios y ofertas, armar tu pedido y mandárnoslo por WhatsApp: ${cleanUrl}`;
  markActivationWebShared(source);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

async function copyCommercialPublicUrl(publicUrl = "", source = "carniza_motor_copy") {
  const cleanUrl = String(publicUrl || "").trim();
  if (!cleanUrl) return false;

  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
    await navigator.clipboard.writeText(cleanUrl);
  } catch (_) {
    window.prompt("Copiá el enlace de tu carnicería:", cleanUrl);
  }

  markActivationWebShared(source);
  return true;
}

function executeCommercialAction(state = {}, action = "") {
  const publicUrl = getActivationPublicUrl();
  setCommercialActivationUi(false);

  const pauseCurrentObjective = () => {
    const now = new Date().toISOString();
    markCommercialQaDismissed(state);
    dashboardPanel?.querySelectorAll("[data-carniza-commercial-motor]").forEach((node) => node.remove());
    dashboardPanel?.querySelector(".dash-main-card")?.style.removeProperty("display");
    dashboardPanel?.querySelector(".dash-two")?.style.removeProperty("display");
    void rememberCommercialPrompt(state, {
      lastActionAt: now,
      lastDismissedAt: now,
      lastStrongPromptAt: state.intensity === "strong" ? now : undefined
    });
  };

  if (action === "prices") {
    pauseCurrentObjective();
    goToPanel("pricesPanel");
    return;
  }

  if (action === "first_promo") {
    pauseCurrentObjective();
    pendingBuilderInitialMode = "discount";
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    goToPanel("builderPanel");
    return;
  }

  if (action === "saved_promos") {
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    goToPanel("savedPanel");
    return;
  }

  if (action === "daily_promo") {
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    openCarnizaUrgentFlowDirect();
    return;
  }

  if (action === "view_web") {
    if (!publicUrl) return;
    trackWebOpened({ source: "carniza_motor", business_id: currentBusinessId || null });
    trackSellerWebCommercial("web_open", "carniza_motor");
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }
}

function renderCommercialShareActions(container, state = {}) {
  const publicUrl = getActivationPublicUrl();
  if (!container || !publicUrl) return;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px;">
      <button type="button" data-commercial-share-wa style="min-height:48px;border:0;border-radius:14px;background:#16a34a;color:#fff;font-weight:1000;cursor:pointer;">💬 WhatsApp</button>
      <button type="button" data-commercial-copy-link style="min-height:48px;border:1px solid #fecaca;border-radius:14px;background:#fff;color:#991b1b;font-weight:1000;cursor:pointer;">🔗 Copiar enlace</button>
      <button type="button" data-commercial-show-qr style="min-height:48px;border:1px solid #ddd6fe;border-radius:14px;background:#f5f3ff;color:#5b21b6;font-weight:1000;cursor:pointer;">📱 Mostrar QR</button>
    </div>
  `;

  container.querySelector("[data-commercial-share-wa]")?.addEventListener("click", () => {
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    openCommercialShareWhatsapp(publicUrl, "carniza_motor_whatsapp");
    renderCurrentDashboard();
  });

  container.querySelector("[data-commercial-copy-link]")?.addEventListener("click", async () => {
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    await copyCommercialPublicUrl(publicUrl);
    renderCurrentDashboard();
  });

  container.querySelector("[data-commercial-show-qr]")?.addEventListener("click", () => {
    markActivationWebShared("carniza_motor_qr");
    void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
    globalThis.__APPPROMOS_PRINT_CENTER_OPEN_QR__ = true;
    setCommercialActivationUi(false);
    goToPanel("printPanel");
  });
}

function renderStrongCommercialPrompt(state = {}) {
  setCommercialActivationUi(true);

  const oldMain = dashboardPanel.querySelector(".dash-main-card");
  const oldRoute = dashboardPanel.querySelector(".dash-two");
  if (oldMain) oldMain.style.display = "none";
  if (oldRoute) oldRoute.style.display = "none";

  const card = document.createElement("section");
  card.dataset.carnizaCommercialMotor = "strong";
  card.style.cssText = "margin:0 0 16px;padding:18px;border:1px solid #fecaca;border-radius:24px;background:linear-gradient(180deg,#fff7f5,#ffffff);box-shadow:0 14px 34px rgba(127,29,29,.10);";

  const progress = Math.min(100, Math.round((Number(state.pricedCount || 0) / CARNIZA_RECOMMENDED_PRICES) * 100));

  card.innerHTML = `
    <style>
      [data-carniza-commercial-motor="strong"] .commercial-activation-layout{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:18px;align-items:center}
      [data-carniza-commercial-motor="strong"] .commercial-activation-visual{min-height:260px;border-radius:20px;background:#fff1ed;display:grid;place-items:center;overflow:hidden}
      [data-carniza-commercial-motor="strong"] .commercial-activation-visual img{display:block;width:100%;height:100%;max-height:390px;object-fit:contain}
      [data-carniza-commercial-motor="strong"] .commercial-activation-content{display:grid;gap:14px}
      [data-carniza-commercial-motor="strong"] .commercial-activation-badge{width:max-content;padding:6px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:13px;font-weight:1000;text-transform:uppercase}
      [data-carniza-commercial-motor="strong"] .commercial-activation-title{margin:0;color:#451a03;font-size:clamp(27px,5vw,40px);line-height:1.02;letter-spacing:-.04em}
      [data-carniza-commercial-motor="strong"] .commercial-activation-message{margin:0;color:#6b3f32;font-size:14px;font-weight:850;line-height:1.4}
      @media(max-width:760px){
        [data-carniza-commercial-motor="strong"]{padding:12px !important;border-radius:18px !important}
        [data-carniza-commercial-motor="strong"] .commercial-activation-layout{grid-template-columns:1fr;gap:6px}
        [data-carniza-commercial-motor="strong"] .commercial-activation-visual{min-height:0;height:110px;border-radius:16px}
        [data-carniza-commercial-motor="strong"] .commercial-activation-visual img{max-height:110px}
        [data-carniza-commercial-motor="strong"] .commercial-activation-content{gap:8px}
        [data-carniza-commercial-motor="strong"] .commercial-activation-badge{padding:4px 8px;font-size:13px}
        [data-carniza-commercial-motor="strong"] .commercial-activation-title{font-size:22px;line-height:1.08;letter-spacing:-.02em}
        [data-carniza-commercial-motor="strong"] .commercial-activation-message{font-size:13px;line-height:1.3}
        [data-carniza-commercial-motor="strong"] [data-commercial-main-actions]{order:1}
        [data-carniza-commercial-motor="strong"] .commercial-activation-secondary{order:2}
        [data-carniza-commercial-motor="strong"] [data-commercial-share-actions]{order:3}
        [data-carniza-commercial-motor="strong"] [data-commercial-dismiss]{order:4;min-height:36px !important}
      }
      @media(max-height:620px) and (max-width:760px){
        [data-carniza-commercial-motor="strong"] .commercial-activation-visual{display:none !important}
        [data-carniza-commercial-motor="strong"] .commercial-activation-title{font-size:20px !important}
      }
    </style>
    <div class="commercial-activation-layout">
      <div class="commercial-activation-visual">
        <img src="${state.asset}" alt="Carniza">
      </div>
      <div class="commercial-activation-content">
        <span class="commercial-activation-badge">Activación comercial</span>
        <h2 class="commercial-activation-title">${escapeCarnizaHtml(state.title)}</h2>
        <p class="commercial-activation-message">${escapeCarnizaHtml(state.message)}</p>
        <div data-commercial-main-actions style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;"></div>
        <div class="commercial-activation-secondary" style="display:grid;gap:8px;">
          <div style="padding:9px 11px;border-radius:14px;background:#fff7ed;color:#9a3412;font-size:13px;font-weight:900;">${escapeCarnizaHtml(state.status)}</div>
          <div style="display:grid;gap:6px;">
            <div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;font-weight:1000;color:#7c2d12;">
              <span>${state.pricedCount} precios cargados</span>
              <span>${state.pricedCount < CARNIZA_ACTIVATION_MIN_PRICES ? `mínimo ${CARNIZA_ACTIVATION_MIN_PRICES}` : `objetivo ${CARNIZA_RECOMMENDED_PRICES}`}</span>
            </div>
            <div style="height:9px;border-radius:999px;background:#fee2e2;overflow:hidden;">
              <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#b91c1c,#ef4444);border-radius:999px;"></div>
            </div>
          </div>
        </div>
        <div data-commercial-share-actions></div>
        <button type="button" data-commercial-dismiss style="min-height:42px;border:0;background:transparent;color:#7c2d12;font-size:13px;font-weight:900;cursor:pointer;">Ahora no</button>
      </div>
    </div>
  `;

  const main = card.querySelector("[data-commercial-main-actions]");
  if (state.primaryAction !== "share") {
    main.innerHTML = `
      <button type="button" data-commercial-primary style="min-height:50px;border:0;border-radius:14px;background:#b91c1c;color:#fff;font-weight:1000;cursor:pointer;">${escapeCarnizaHtml(state.primaryLabel)}</button>
      <button type="button" data-commercial-view-web style="min-height:50px;border:1px solid #fecaca;border-radius:14px;background:#fff;color:#991b1b;font-weight:1000;cursor:pointer;">🌐 Ver mi carnicería</button>
    `;
    main.querySelector("[data-commercial-primary]")?.addEventListener("click", () => executeCommercialAction(state, state.primaryAction));
    main.querySelector("[data-commercial-view-web]")?.addEventListener("click", () => executeCommercialAction(state, "view_web"));
  } else {
    main.innerHTML = `
      <button type="button" data-commercial-view-web style="min-height:50px;border:1px solid #fecaca;border-radius:14px;background:#fff;color:#991b1b;font-weight:1000;cursor:pointer;">🌐 Revisar mi carnicería</button>
    `;
    main.querySelector("[data-commercial-view-web]")?.addEventListener("click", () => executeCommercialAction(state, "view_web"));
    renderCommercialShareActions(card.querySelector("[data-commercial-share-actions]"), state);
  }

  card.querySelector("[data-commercial-dismiss]")?.addEventListener("click", () => {
    void dismissCommercialPrompt(state);
  });

  dashboardPanel.prepend(card);
  rememberStrongCommercialPromptOnce(state);
}

function renderCompactCommercialPrompt(state = {}) {
  setCommercialActivationUi(false);

  const card = document.createElement("section");
  card.dataset.carnizaCommercialMotor = "compact";
  card.style.cssText = "margin:0 0 14px;padding:14px 16px;border:1px solid #fed7aa;border-radius:18px;background:linear-gradient(180deg,#fffaf0,#fff);box-shadow:0 8px 22px rgba(124,45,18,.08);display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;";

  card.innerHTML = `
    <style>
      @media(max-width:760px){
        [data-carniza-commercial-motor="compact"]{grid-template-columns:56px minmax(0,1fr) !important;gap:10px !important;padding:12px !important;align-items:start !important}
        [data-carniza-commercial-motor="compact"] .commercial-compact-visual{width:56px !important;height:56px !important}
        [data-carniza-commercial-motor="compact"] .commercial-compact-copy{min-width:0}
        [data-carniza-commercial-motor="compact"] .commercial-compact-title{font-size:15px !important;line-height:1.25 !important}
        [data-carniza-commercial-motor="compact"] .commercial-compact-message{font-size:13px !important;line-height:1.35 !important}
        [data-carniza-commercial-motor="compact"] .commercial-compact-actions{grid-column:1 / -1;min-width:0 !important;width:100%;gap:6px !important}
        [data-carniza-commercial-motor="compact"] [data-commercial-compact-primary]{width:100%;min-height:46px !important}
        [data-carniza-commercial-motor="compact"] [data-commercial-compact-dismiss]{min-height:40px !important;font-size:13px !important}
      }
    </style>
    <img class="commercial-compact-visual" src="${state.asset}" alt="Carniza" style="width:74px;height:74px;object-fit:contain;border-radius:14px;background:#fff7ed;">
    <div class="commercial-compact-copy" style="min-width:0;">
      <strong class="commercial-compact-title" style="display:block;color:#7c2d12;font-size:15px;line-height:1.25;">${escapeCarnizaHtml(state.title)}</strong>
      <span class="commercial-compact-message" style="display:block;margin-top:4px;color:#6b4b3e;font-size:13px;font-weight:800;line-height:1.35;">${escapeCarnizaHtml(state.message)}</span>
    </div>
    <div class="commercial-compact-actions" style="display:grid;gap:7px;min-width:150px;">
      <button type="button" data-commercial-compact-primary style="min-height:42px;border:0;border-radius:12px;background:#c2410c;color:#fff;font-weight:1000;cursor:pointer;">${escapeCarnizaHtml(state.primaryLabel)}</button>
      <button type="button" data-commercial-compact-dismiss style="min-height:34px;border:0;background:transparent;color:#9a3412;font-size:12px;font-weight:900;cursor:pointer;">Ahora no</button>
    </div>
  `;

  card.querySelector("[data-commercial-compact-primary]")?.addEventListener("click", () => {
    if (state.primaryAction === "share") {
      openCommercialShareWhatsapp(getActivationPublicUrl(), "carniza_growth_share");
      void rememberCommercialPrompt(state, { lastActionAt: new Date().toISOString() });
      renderCurrentDashboard();
      return;
    }
    executeCommercialAction(state, state.primaryAction);
  });

  card.querySelector("[data-commercial-compact-dismiss]")?.addEventListener("click", () => {
    void dismissCommercialPrompt(state);
  });

  dashboardPanel.prepend(card);
}

function renderCarnizaCommercialMotor() {
  if (!dashboardPanel || !currentPayload || currentSession?.isDemo || currentSession?.appMode === "superadmin") {
    setCommercialActivationUi(false);
    return;
  }

  dashboardPanel.querySelectorAll("[data-carniza-commercial-motor]").forEach((node) => node.remove());

  const state = getCarnizaCommercialState();
  if (!state || state.phase === "active") {
    setCommercialActivationUi(false);
    return;
  }

  if (!shouldShowCommercialPrompt(state)) {
    setCommercialActivationUi(false);
    return;
  }

  if (state.objective === "personalize_storefront") {
    renderStorefrontThemePrompt(state);
    return;
  }

  if (state.intensity === "strong") {
    renderStrongCommercialPrompt(state);
    return;
  }

  renderCompactCommercialPrompt(state);
}

function renderCurrentDashboard() {
  if (!currentPayload || !dashboardPanel) return;
  renderDashboard(
    dashboardPanel,
    currentPayload.businessId,
    currentPayload.meta,
    currentPayload.state,
    {
      showBrandReminder: currentSession?.appMode !== "superadmin" && currentSession?.isDemo !== true,
      onEditBusinessData: () => openAccountSheet("edit"),
      onOpenQr: () => {
        // Entrada directa al submódulo QR: el Centro consume esta señal al renderizarse.
        globalThis.__APPPROMOS_PRINT_CENTER_OPEN_QR__ = true;
        goToPanel("printPanel");
      },
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
        trackBusinessIdentityCompletedIfReady("dashboard_business_data");
        await syncCurrentPublicWebSnapshot("business_data_save");
        renderCurrentDashboard();
        renderWhatsApp(whatsappPanel, currentPayload.state?.savedCombos || [], currentPayload.meta || {}, getShareOptions("whatsapp_panel"));
        markLazyPanelsDirty();
        alert("Datos del negocio guardados correctamente.");
      }
    }
  );
  renderCarnizaCommercialMotor();
  renderSuperadminBusinessContextBanner();
  trackCarnizaSignal("carniza_home_seen", { businessId: currentPayload?.businessId || currentBusinessId || null, appMode: currentSession?.appMode || "client" });
  void renderCarnizaCommercialLayer(dashboardPanel);
  ensureCarnizaFloatingLiquidator();
}

function getBusinessAccountFields() {
  const meta = currentPayload?.meta || {};
  const state = currentPayload?.state || {};
  const web = state?.web || meta?.web || {};
  const access = getAccessState(currentBusinessControl || {});
  const city = meta?.ciudad || meta?.city || meta?.localidad || meta?.locality || "";
  const province = meta?.provincia || meta?.province || "";
  const slug = web?.slug || state?.webSlug || meta?.webSlug || "";
  const publicUrl = slug ? getPublicWebUrl(currentBusinessId || currentPayload?.businessId || "", slug) : "";

  return {
    name: meta?.name || meta?.nombre || "Sin nombre cargado",
    responsible: meta?.responsable || meta?.ownerName || meta?.contactName || meta?.titular || "",
    email: meta?.email || currentSession?.email || currentSession?.user?.email || "",
    phone: meta?.telefono || meta?.phone || meta?.whatsapp || "",
    address: meta?.direccion || meta?.address || "",
    city,
    province,
    location: [city, province].filter(Boolean).join(", "),
    slug,
    publicUrl,
    plan: currentBusinessControl?.plan || currentBusinessControl?.billing?.plan || state?.plan || "",
    paymentStatus: currentBusinessControl?.paymentStatus || currentBusinessControl?.billing?.status || "",
    accessLabel: access?.label || access?.title || "",
    updatedAt: state?.updatedAt || meta?.updatedAt || "",
    logoUrl: meta?.brand?.logoUrl || "",
    frontPhotoUrl: meta?.brand?.frontPhotoUrl || ""
  };
}

function renderAccountRow(label, value, fallback = "Sin cargar") {
  const safeValue = value ? escapeCarnizaHtml(value) : `<span style="color:#94a3b8;">${escapeCarnizaHtml(fallback)}</span>`;
  return `<div class="app-account-row"><span>${escapeCarnizaHtml(label)}</span><strong>${safeValue}</strong></div>`;
}

function formatAccountPlanLabel(plan = "") {
  const raw = String(plan || "").trim();
  if (!raw) return "Sin plan asignado";
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const labels = {
    trial: "Prueba gratis",
    free: "Prueba gratis",
    gratis: "Prueba gratis",
    gratuito: "Prueba gratis",
    prueba: "Prueba gratis",
    prueba_gratis: "Prueba gratis",
    basic: "ARRANQUE",
    arranque: "ARRANQUE",
    impulso: "ARRANQUE",
    salvador: "SALVADOR",
    pro: "SALVADOR",
    dueno: "DUEÑO",
    duenio: "DUEÑO",
    owner: "DUEÑO",
    premium: "DUEÑO"
  };

  return labels[key] || raw.toUpperCase();
}
function renderAccountViewHtml() {
  const fields = getBusinessAccountFields();
  const webStatus = fields.publicUrl
    ? `<span class="app-account-web-status active">Vidriera activa</span>`
    : `<span class="app-account-web-status pending">Todavía sin vidriera activa</span>`;

  return `
    <div class="app-account-card">
      <div class="app-account-kicker">Mi cuenta</div>
      <h3>Datos de tu carnicería</h3>

      <div class="app-account-list">
        ${renderAccountRow("Carnicería", fields.name)}
        ${renderAccountRow("Responsable", fields.responsible)}
        ${renderAccountRow("Email de acceso", fields.email)}
        ${renderAccountRow("WhatsApp", fields.phone)}
        ${renderAccountRow("Dirección", fields.address)}
        ${renderAccountRow("Localidad", fields.location)}
        ${renderAccountRow("Plan", formatAccountPlanLabel(fields.plan))}
        ${renderAccountRow("Estado", fields.accessLabel || fields.paymentStatus)}
        <div class="app-account-row app-account-web-row"><span>Mi web</span><strong>${webStatus}</strong></div>
      </div>
      <div class="app-account-actions">
        <button type="button" class="primary" data-account-edit>Editar datos</button>
        ${fields.publicUrl ? '<button type="button" data-account-web>Ver mi web</button><button type="button" data-account-copy-web>Copiar enlace</button>' : ''}
      </div>
      <small class="app-account-footnote">Para vender rápido, usá la botonera inferior. Para datos y cuenta, entrá por Más.</small>
    </div>
  `;
}

function renderAccountBrandPreview(url, alt, kind = "logo") {
  if (!url) {
    return `<div class="app-account-brand-empty">Todavía no cargaste ${escapeCarnizaHtml(alt.toLowerCase())}.</div>`;
  }
  const className = kind === "front" ? "app-account-brand-preview front" : "app-account-brand-preview logo";
  return `<img class="${className}" src="${escapeCarnizaHtml(url)}" alt="${escapeCarnizaHtml(alt)}" loading="lazy" />`;
}

function renderAccountEditHtml() {
  const fields = getBusinessAccountFields();
  return `
    <form class="app-account-card app-account-form" data-account-form>
      <div class="app-account-kicker">Mi cuenta</div>
      <h3>Editar datos del negocio</h3>
      <p>Usamos estos datos para tu app, tu WhatsApp y tu web de arranque.</p>
      <label><span>Nombre comercial *</span><input name="name" required value="${escapeCarnizaHtml(fields.name === "Sin nombre cargado" ? "" : fields.name)}" placeholder="Carnicería Sur" /></label>
      <label><span>Responsable</span><input name="responsable" value="${escapeCarnizaHtml(fields.responsible)}" placeholder="Juan Pérez" /></label>
      <label><span>Teléfono / WhatsApp *</span><input name="telefono" required value="${escapeCarnizaHtml(fields.phone)}" placeholder="3462 555555" /></label>
      <label><span>Dirección *</span><input name="direccion" required value="${escapeCarnizaHtml(fields.address)}" placeholder="Patagonia 28" /></label>
      <label><span>Ciudad *</span><input name="ciudad" required value="${escapeCarnizaHtml(fields.city)}" placeholder="Venado Tuerto" /></label>

      <div class="app-account-brand-section">
        <div>
          <strong>Identidad de tu carnicería</strong>
          <p>Guardá tu logo y una foto real del local para identificar claramente tu carnicería.</p>
        </div>

        <div class="app-account-brand-item">
          <span class="app-account-brand-label">Logo oficial</span>
          <div data-brand-logo-preview>${renderAccountBrandPreview(fields.logoUrl, "Logo oficial", "logo")}</div>
          <label class="app-account-file-button">
            <span>${fields.logoUrl ? "Cambiar logo" : "Elegir logo"}</span>
            <input type="file" name="logoFile" accept="image/jpeg,image/png,image/webp" data-brand-logo-input />
          </label>
          ${fields.logoUrl ? '<button type="button" class="app-account-remove-image" data-brand-remove-logo>Quitar logo</button>' : ''}
          <small>JPG, PNG o WEBP. AppPromos lo optimiza antes de guardarlo.</small>
        </div>

        <div class="app-account-brand-item">
          <span class="app-account-brand-label">Foto del frente de tu local</span>
          <div data-brand-front-preview>${renderAccountBrandPreview(fields.frontPhotoUrl, "Foto del frente", "front")}</div>
          <label class="app-account-file-button">
            <span>${fields.frontPhotoUrl ? "Cambiar foto" : "Elegir foto"}</span>
            <input type="file" name="frontPhotoFile" accept="image/jpeg,image/png,image/webp" data-brand-front-input />
          </label>
          ${fields.frontPhotoUrl ? '<button type="button" class="app-account-remove-image" data-brand-remove-front>Quitar foto</button>' : ''}
          <small>Elegí una foto clara del frente. Máximo 8 MB antes de optimizar.</small>
        </div>
      </div>

      <div class="app-account-error" data-account-error></div>
      <div class="app-account-actions">
        <button type="submit" class="primary" data-account-save>Guardar cambios</button>
        <button type="button" data-account-view>Cancelar</button>
      </div>
    </form>
  `;
}

function openAccountSheet(mode = "view") {
  if (!currentPayload) return;
  document.getElementById("appAccountSheet")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "appAccountSheet";
  overlay.className = "app-account-sheet";
  overlay.innerHTML = `
    <style>
      .app-account-sheet { position:fixed; inset:0; z-index:12000; display:flex; align-items:flex-end; justify-content:center; padding:16px; background:rgba(15,23,42,.42); box-sizing:border-box; }
      .app-account-panel { width:min(560px,100%); max-height:calc(92vh - env(safe-area-inset-bottom,0px)); overflow:auto; border-radius:24px; background:#fff; box-shadow:0 28px 80px rgba(15,23,42,.28); border:1px solid #e2e8f0; padding:18px; box-sizing:border-box; }
      .app-account-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
      .app-account-head strong { font-size:15px; color:#0f172a; }
      .app-account-close { width:42px; height:42px; border-radius:14px; border:1px solid #e2e8f0; background:#fff; color:#0f172a; font-size:20px; font-weight:1000; cursor:pointer; }
      .app-account-card { display:grid; gap:12px; }
      .app-account-kicker { color:#b91c1c; text-transform:uppercase; letter-spacing:.05em; font-size:12px; font-weight:1000; }
      .app-account-card h3 { margin:0; font-size:24px; line-height:1.05; color:#7f1d1d; }
      .app-account-card p { margin:0; color:#64748b; font-weight:800; line-height:1.35; }
      .app-account-list { display:grid; gap:8px; }
      .app-account-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:11px 0; border-bottom:1px solid #f1f5f9; }
      .app-account-row span { color:#64748b; font-size:13px; font-weight:900; }
      .app-account-row strong { text-align:right; color:#0f172a; font-size:14px; overflow-wrap:anywhere; }
      .app-account-row a { color:#b91c1c; text-decoration:none; overflow-wrap:anywhere; }
      .app-account-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:4px; }
      .app-account-actions button { min-height:46px; border-radius:15px; border:1px solid #e2e8f0; background:#fff; color:#0f172a; font-weight:1000; cursor:pointer; }
      .app-account-actions button.primary { background:#b91c1c; border-color:#b91c1c; color:#fff; }
      .app-account-footnote { color:#64748b; font-weight:800; line-height:1.35; }
      .app-account-form label { display:grid; gap:6px; color:#475569; font-size:13px; font-weight:900; }
      .app-account-form input { width:100%; min-height:46px; border:1px solid #cbd5e1; border-radius:14px; padding:0 12px; font-size:15px; font-weight:800; box-sizing:border-box; }
      .app-account-form input:focus { outline:3px solid rgba(185,28,28,.12); border-color:#b91c1c; }
      .app-account-brand-section { display:grid; gap:14px; margin-top:4px; padding-top:14px; border-top:1px solid #e2e8f0; }
      .app-account-brand-section > div:first-child { display:grid; gap:4px; }
      .app-account-brand-section > div:first-child strong { color:#0f172a; font-size:16px; }
      .app-account-brand-section > div:first-child p { font-size:13px; }
      .app-account-brand-item { display:grid; gap:8px; padding:12px; border:1px solid #e2e8f0; border-radius:16px; background:#f8fafc; }
      .app-account-brand-label { color:#334155; font-size:13px; font-weight:1000; }
      .app-account-brand-preview { display:block; max-width:100%; object-fit:cover; border-radius:14px; border:1px solid #e2e8f0; background:#fff; }
      .app-account-brand-preview.logo { width:112px; height:112px; object-fit:contain; padding:8px; box-sizing:border-box; }
      .app-account-brand-preview.front { width:100%; aspect-ratio:16/9; }
      .app-account-brand-empty { min-height:72px; display:grid; place-items:center; padding:12px; border:1px dashed #cbd5e1; border-radius:14px; color:#64748b; background:#fff; font-size:13px; font-weight:800; text-align:center; }
      .app-account-file-button { position:relative; display:inline-flex !important; align-items:center; justify-content:center; min-height:44px; border-radius:14px; background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8 !important; cursor:pointer; font-weight:1000 !important; }
      .app-account-file-button input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
      .app-account-remove-image { min-height:40px; border-radius:12px; border:1px solid #fecaca; background:#fff; color:#b91c1c; font-weight:900; cursor:pointer; }
      .app-account-brand-item small { color:#64748b; font-weight:700; line-height:1.3; }
      .app-account-error { min-height:18px; color:#b42318; font-size:13px; font-weight:900; }
      .app-account-web-status { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:7px 10px; font-size:13px; font-weight:950; }
      .app-account-web-status.active { color:#166534; background:#dcfce7; border:1px solid #86efac; }
      .app-account-web-status.pending { color:#92400e; background:#fef3c7; border:1px solid #fcd34d; }
      .app-account-web-row strong { word-break:normal; }
      @media (max-width:640px) { .app-account-sheet { padding:10px 10px calc(92px + env(safe-area-inset-bottom,0px)); } .app-account-panel { border-radius:22px; max-height:calc(86vh - env(safe-area-inset-bottom,0px)); } .app-account-actions { grid-template-columns:1fr; } .app-account-row { flex-direction:column; gap:4px; } .app-account-row strong { text-align:left; } }
    </style>
    <div class="app-account-panel" role="dialog" aria-modal="true" aria-label="Mi cuenta AppPromos">
      <div class="app-account-head">
        <strong>Más / Mi cuenta</strong>
        <button type="button" class="app-account-close" data-account-close aria-label="Cerrar">×</button>
      </div>
      <div data-account-content>${mode === "edit" ? renderAccountEditHtml() : renderAccountViewHtml()}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("[data-account-close]")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  const renderMode = (nextMode) => {
    const content = overlay.querySelector("[data-account-content]");
    if (!content) return;
    content.innerHTML = nextMode === "edit" ? renderAccountEditHtml() : renderAccountViewHtml();
  };


  const showSelectedImagePreview = (input, targetSelector, kind) => {
    const file = input?.files?.[0];
    const target = overlay.querySelector(targetSelector);
    if (!file || !target) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(String(file.type || ""))) {
      const errorEl = overlay.querySelector("[data-account-error]");
      if (errorEl) errorEl.textContent = "Usá una imagen JPG, PNG o WEBP.";
      input.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    target.innerHTML = `<img class="app-account-brand-preview ${kind}" src="${objectUrl}" alt="Vista previa" />`;
    target.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
  };

  overlay.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-account-edit]");
    if (edit) {
      renderMode("edit");
      return;
    }
    const view = event.target.closest("[data-account-view]");
    if (view) {
      renderMode("view");
      return;
    }
    const removeLogo = event.target.closest("[data-brand-remove-logo]");
    if (removeLogo) {
      if (!window.confirm("¿Querés quitar el logo de esta carnicería?")) return;
      const errorEl = overlay.querySelector("[data-account-error]");
      try {
        removeLogo.disabled = true;
        const result = await deleteBusinessLogo(currentPayload.businessId);
        currentPayload = { ...currentPayload, meta: result.meta };
        await syncCurrentPublicWebSnapshot("brand_logo_delete");
        renderMode("edit");
      } catch (error) {
        if (errorEl) errorEl.textContent = error?.message || "No pudimos quitar el logo.";
        removeLogo.disabled = false;
      }
      return;
    }
    const removeFront = event.target.closest("[data-brand-remove-front]");
    if (removeFront) {
      if (!window.confirm("¿Querés quitar la foto del frente de esta carnicería?")) return;
      const errorEl = overlay.querySelector("[data-account-error]");
      try {
        removeFront.disabled = true;
        const result = await deleteBusinessFrontPhoto(currentPayload.businessId);
        currentPayload = { ...currentPayload, meta: result.meta };
        await syncCurrentPublicWebSnapshot("brand_front_delete");
        renderMode("edit");
      } catch (error) {
        if (errorEl) errorEl.textContent = error?.message || "No pudimos quitar la foto.";
        removeFront.disabled = false;
      }
      return;
    }
    const web = event.target.closest("[data-account-web]");
    if (web) {
      const url = getBusinessAccountFields().publicUrl;
      if (url) {
        trackSellerWebCommercial("web_open", "account");
        window.open(url, "_blank", "noopener");
      }
    }
  });

  overlay.addEventListener("change", (event) => {
    if (event.target.matches("[data-brand-logo-input]")) {
      showSelectedImagePreview(event.target, "[data-brand-logo-preview]", "logo");
    }
    if (event.target.matches("[data-brand-front-input]")) {
      showSelectedImagePreview(event.target, "[data-brand-front-preview]", "front");
    }
  });

  overlay.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-account-form]");
    if (!form) return;
    event.preventDefault();
    const errorEl = form.querySelector("[data-account-error]");
    const fd = new FormData(form);
    const formData = {
      name: String(fd.get("name") || "").trim(),
      responsable: String(fd.get("responsable") || "").trim(),
      telefono: String(fd.get("telefono") || "").trim(),
      direccion: String(fd.get("direccion") || "").trim(),
      ciudad: String(fd.get("ciudad") || "").trim()
    };
    if (!formData.name || !formData.telefono || !formData.direccion || !formData.ciudad) {
      if (errorEl) errorEl.textContent = "Completá nombre, WhatsApp, dirección y ciudad para guardar.";
      return;
    }
    const saveButton = form.querySelector("[data-account-save]");
    const originalSaveText = saveButton?.textContent || "Guardar cambios";
    try {
      if (errorEl) errorEl.textContent = "";
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Guardando...";
      }

      const result = await updateBusinessBasicData(
        currentPayload.businessId,
        formData,
        currentPayload.meta,
        currentPayload.state
      );
      currentPayload = { ...currentPayload, meta: result.meta, state: result.state };

      const logoFile = form.querySelector("[data-brand-logo-input]")?.files?.[0] || null;
      const frontFile = form.querySelector("[data-brand-front-input]")?.files?.[0] || null;

      if (logoFile) {
        if (saveButton) saveButton.textContent = "Guardando logo...";
        const logoResult = await uploadBusinessLogo(currentPayload.businessId, logoFile, {
          onProgress: (percent) => {
            if (saveButton) saveButton.textContent = `Guardando logo... ${percent}%`;
          }
        });
        currentPayload = { ...currentPayload, meta: logoResult.meta };
      }

      if (frontFile) {
        if (saveButton) saveButton.textContent = "Guardando foto...";
        const frontResult = await uploadBusinessFrontPhoto(currentPayload.businessId, frontFile, {
          onProgress: (percent) => {
            if (saveButton) saveButton.textContent = `Guardando foto... ${percent}%`;
          }
        });
        currentPayload = { ...currentPayload, meta: frontResult.meta };
      }

      if (logoFile || frontFile) {
        await syncCurrentPublicWebSnapshot("brand_upload");
      }

      trackBusinessIdentityCompletedIfReady("account_identity");

      renderCurrentDashboard();
      renderWhatsApp(whatsappPanel, currentPayload.state?.savedCombos || [], currentPayload.meta || {}, getShareOptions("whatsapp_panel"));
      markLazyPanelsDirty();
      renderMode("view");
      trackCarnizaSignal("account_data_saved", { businessId: currentPayload?.businessId || currentBusinessId || null, appMode: currentSession?.appMode || "client" });
    } catch (error) {
      console.error("[AppPromos][D1] No pudimos guardar identidad", error);
      if (errorEl) errorEl.textContent = error?.message || "No pudimos guardar. Revisá los datos y volvé a intentar.";
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Reintentar";
      }
    } finally {
      if (saveButton && !saveButton.disabled && saveButton.textContent === "Reintentar") {
        // Se deja habilitado para que el usuario pueda intentar otra vez sin cerrar el modal.
      }
    }
  });
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
  updateMobileActionFocus(panelId);
  if (panelId === "usersPanel") {
    // En Administración el foco es gestionar clientes, usuarios y estados.
    // Carniza se oculta para no tapar información operativa; volverá en módulos comerciales.
    closeCarnizaUnifiedOverlay();
  }
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

  updateMobileBottomNavActive();
}

function resetBuilderPanelForNewSale() {
  if (!builderPanel || !currentBusinessId || !currentPayload?.state) return;

  const products = getActiveProductCatalog();
  const initialMode = pendingBuilderInitialMode === "quick" || pendingBuilderInitialMode === "discount"
    ? pendingBuilderInitialMode
    : null;
  pendingBuilderInitialMode = null;
  const initialCombo = pendingBuilderEditCombo;
  pendingBuilderEditCombo = null;
  const selectedOffers = Array.isArray(currentPayload?.state?.web?.selectedOffers)
    ? currentPayload.state.web.selectedOffers.map(String)
    : [];

  renderBuilder(builderPanel, products, async (...args) => {
    await trackBusinessActivityThrottled(currentBusinessId, 60);
    return refreshSavedModule(...args);
  }, {
    ...getBuilderOptions(),
    initialMode,
    initialCombo,
    initialComboPublished: Boolean(initialCombo && selectedOffers.includes(String(initialCombo.id || initialCombo.comboId || "")))
  });
}

const APP_PANEL_HISTORY_KEY = "apppromosPanel";
let appPanelHistoryReady = false;

function writeAppPanelHistory(panelId, mode = "push") {
  if (!appPanelHistoryReady || !panelId || mode === "none") return;
  const currentState = window.history.state || {};
  if (currentState?.[APP_PANEL_HISTORY_KEY] === panelId && mode === "push") return;

  const nextState = {
    ...currentState,
    [APP_PANEL_HISTORY_KEY]: panelId,
    apppromosAppEntry: true
  };

  if (mode === "replace") {
    window.history.replaceState(nextState, "", window.location.href);
    return;
  }
  window.history.pushState(nextState, "", window.location.href);
}

function initializeAppPanelHistory(initialPanelId = "dashboardPanel") {
  if (appPanelHistoryReady) return;
  appPanelHistoryReady = true;

  /* V12.22-A2-FIX4A: el primer estado funciona como raíz protegida.
     El segundo permite que Back vuelva a Inicio sin abandonar app.html. */
  window.history.replaceState({
    ...(window.history.state || {}),
    [APP_PANEL_HISTORY_KEY]: initialPanelId,
    apppromosAppEntry: true,
    apppromosHistoryRoot: true
  }, "", window.location.href);
  window.history.pushState({
    [APP_PANEL_HISTORY_KEY]: initialPanelId,
    apppromosAppEntry: true
  }, "", window.location.href);

  window.addEventListener("popstate", (event) => {
    if (!currentSession || currentSession.appMode === "guest") return;

    const requestedPanel = event?.state?.[APP_PANEL_HISTORY_KEY];
    const panelExists = requestedPanel && document.getElementById(requestedPanel)?.classList.contains("panel");
    const nextPanel = panelExists ? requestedPanel : "dashboardPanel";

    goToPanel(nextPanel, {
      historyMode: "none",
      keepMoreOpen: false
    });

    if (event?.state?.apppromosHistoryRoot) {
      /* V12.22-A2-FIX4A1: al alcanzar la raíz no generamos otra entrada.
         Volvemos al guard ya existente para impedir que el siguiente Back
         abandone app.html y regrese a la landing. */
      window.setTimeout(() => {
        window.history.forward();
      }, 0);
    }
  });
}

function goToPanel(panelId, options = {}) {
  // Crear oferta debe abrir siempre como una acción nueva.
  // Evita que quede cacheada una oferta anterior y el carnicero se trabe en celular.
  if (panelId === "builderPanel") {
    resetBuilderPanelForNewSale();
  }

  activatePanel(panelId);
  writeAppPanelHistory(panelId, options.historyMode || "push");
  setMoreLinksVisible(Boolean(options.keepMoreOpen));
  window.scrollTo({ top: 0, behavior: "smooth" });
  void renderLazyPanel(panelId);
}


const MOBILE_NAV_ID = "appMobileBottomNav";
const MOBILE_MENU_ID = "appMobileBottomMenu";
const MOBILE_STYLE_ID = "appMobileBottomNavStyle";

function injectMobileBottomNavStyles() {
  if (document.getElementById(MOBILE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = MOBILE_STYLE_ID;
  style.textContent = `
    .app-mobile-bottom-nav,
    .app-mobile-bottom-menu { display: none; }

    body.module-focus-admin .app-mobile-bottom-nav,
    body.module-focus-admin .app-mobile-bottom-menu {
      display: none !important;
    }

    /* V12.22-A2-FIX3B: en desktop reutilizamos la navegación inferior
       probada en mobile, con una presentación más compacta. */
    @media (min-width: 761px) {
      body.app-mobile-nav-ready .app {
        padding-bottom: 108px;
      }

      .app-mobile-bottom-nav {
        position: fixed;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        z-index: 2147482500;
        width: min(760px, calc(100vw - 32px));
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        padding: 7px;
        border: 1px solid rgba(15, 23, 42, .12);
        border-radius: 20px;
        background: rgba(255, 255, 255, .96);
        box-shadow: 0 16px 40px rgba(15, 23, 42, .20);
        backdrop-filter: blur(14px);
        box-sizing: border-box;
      }

      .app-mobile-bottom-nav button {
        min-width: 0;
        min-height: 48px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: #334155;
        font-weight: 1000;
        font-size: 12px;
        line-height: 1.1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
      }

      .app-mobile-bottom-nav button .app-mobile-nav-icon {
        font-size: 19px;
        line-height: 1;
      }

      .app-mobile-bottom-nav button.is-active {
        background: linear-gradient(135deg, #fff7ed, #fee2e2);
        color: #9f1239;
        box-shadow: inset 0 0 0 1px rgba(196, 30, 58, .18);
      }

      .app-mobile-bottom-nav button.is-primary {
        background: linear-gradient(135deg, #c41e3a, #9f1239);
        color: #fff;
        box-shadow: 0 8px 18px rgba(196, 30, 58, .20);
      }

      .app-mobile-bottom-menu {
        position: fixed;
        left: 50%;
        bottom: 82px;
        transform: translateX(-50%);
        z-index: 2147482499;
        width: min(620px, calc(100vw - 32px));
        display: none;
        border-radius: 22px;
        background: #fff;
        border: 1px solid rgba(15, 23, 42, .12);
        box-shadow: 0 22px 60px rgba(15, 23, 42, .24);
        padding: 14px;
        box-sizing: border-box;
      }

      .app-mobile-bottom-menu.is-open { display: block; }
      .app-mobile-bottom-menu__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .app-mobile-bottom-menu__title { margin: 0; color: #7f1d1d; font-size: 16px; font-weight: 1000; }
      .app-mobile-bottom-menu__hint { margin: 2px 0 0; color: #64748b; font-size: 12px; font-weight: 800; }
      .app-mobile-bottom-menu__close {
        min-width: 40px;
        min-height: 40px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        color: #334155;
        font-size: 20px;
        font-weight: 1000;
        cursor: pointer;
      }
      .app-mobile-bottom-menu__grid { display: grid; gap: 8px; }
      .app-mobile-bottom-menu__grid.two { grid-template-columns: 1fr 1fr; }
      .app-mobile-bottom-menu__grid button {
        min-height: 52px;
        border: 1px solid #e5e7eb;
        border-radius: 15px;
        background: #fff;
        color: #1f2937;
        font-weight: 1000;
        text-align: left;
        padding: 10px 12px;
        cursor: pointer;
      }
      .app-mobile-bottom-menu__grid button strong { display: block; font-size: 13px; }
      .app-mobile-bottom-menu__grid button span { display: block; margin-top: 3px; color: #64748b; font-size: 11px; font-weight: 800; }
      .app-mobile-bottom-menu__grid button.primary { border-color: #fecaca; background: #fff1f2; color: #9f1239; }
      .app-mobile-bottom-menu__grid button.green { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
      .app-mobile-bottom-menu__grid button.orange { border-color: #fed7aa; background: #fff7ed; color: #9a3412; }
    }

    @media (max-width: 760px) {
      html, body {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
      }

      body.app-mobile-nav-ready {
        --apppromos-mobile-nav-height: 86px;
        --apppromos-mobile-nav-gap: 12px;
        --apppromos-mobile-floating-bottom: calc(104px + env(safe-area-inset-bottom, 0px));
        --apppromos-mobile-quick-summary-bottom: calc(184px + env(safe-area-inset-bottom, 0px));
        --apppromos-mobile-sticky-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
      }

      body.app-mobile-nav-ready *,
      body.app-mobile-nav-ready *::before,
      body.app-mobile-nav-ready *::after {
        min-width: 0;
      }

      body.app-mobile-nav-ready .app {
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden;
        padding-left: 10px;
        padding-right: 10px;
        padding-bottom: calc(142px + env(safe-area-inset-bottom, 0px));
        box-sizing: border-box;
      }

      body.app-mobile-nav-ready .panel {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        padding: 12px;
        box-sizing: border-box;
      }
      body.app-mobile-nav-ready .topbar .nav-shell { display: none; }

      body.app-mobile-nav-ready .topbar-frame {
        padding: 2px 0;
        box-shadow: 0 3px 8px rgba(15, 23, 42, .10);
      }

      body.app-mobile-nav-ready .topbar {
        top: 2px;
        padding: 7px 0;
        margin-bottom: 10px;
        border-bottom: 0;
      }

      body.app-mobile-nav-ready .topbar-inner {
        padding: 0 10px;
        gap: 7px;
      }

      body.app-mobile-nav-ready .brand {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 16px;
      }

      body.app-mobile-nav-ready .brand-left {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      body.app-mobile-nav-ready .app-brand-logo-box {
        width: 42px;
        height: 42px;
        min-width: 42px;
      }

      body.app-mobile-nav-ready .brand-copy { min-width: 0; }
      body.app-mobile-nav-ready .brand h1 { font-size: 1.02rem; margin: 0; line-height: 1.05; }
      body.app-mobile-nav-ready .brand p {
        font-size: .66rem;
        line-height: 1.12;
        max-height: 1.45rem;
        overflow: hidden;
      }

      body.app-mobile-nav-ready .brand-right {
        min-width: 124px;
        max-width: 146px;
        flex: 0 0 146px;
        gap: 4px;
        align-items: stretch;
      }

      body.app-mobile-nav-ready #accessGate,
      body.app-mobile-nav-ready #businessSwitcher {
        justify-content: stretch;
      }

      /* V12.13-C6 - Header mobile compacto: [logo] Carnicería · estado */
      body.app-mobile-nav-ready.app-compact-brand-ready .brand {
        min-height: 52px;
        padding: 7px 10px;
        border-radius: 16px;
        gap: 8px;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-right {
        display: none !important;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-left {
        width: 100%;
        flex: 1 1 auto;
        min-width: 0;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .app-brand-logo-box {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 12px;
        padding: 2px;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy {
        min-width: 0;
        flex: 1 1 auto;
        cursor: pointer;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy h1,
      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy p {
        display: none !important;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy::before {
        content: attr(data-mobile-title);
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #061a35;
        font-size: .9rem;
        line-height: 1.15;
        font-weight: 1000;
        letter-spacing: -0.02em;
      }

      /* V12.22-A2-FIX4C: días de prueba visibles y tocables en mobile. */
      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy::after {
        content: attr(data-mobile-subtitle);
        display: block;
        max-width: 100%;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #9a3412;
        font-size: .72rem;
        line-height: 1.1;
        font-weight: 950;
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy[data-mobile-trial="true"]::after {
        content: "🎁 " attr(data-mobile-subtitle) " · Ver detalle";
      }

      body.app-mobile-nav-ready.app-compact-brand-ready .brand-copy:focus-visible {
        outline: 2px solid #0477f2;
        outline-offset: 3px;
        border-radius: 8px;
      }

      body.app-mobile-nav-ready.app-mobile-action-focus .topbar-frame,
      body.app-mobile-nav-ready.app-mobile-action-focus .topbar {
        display: none !important;
      }

      body.app-mobile-nav-ready.app-mobile-action-focus .app {
        padding-top: 8px;
      }

      body.app-mobile-nav-ready.app-mobile-action-focus .panel.active {
        margin-top: 0;
      }

      .app-mobile-bottom-nav {
        position: fixed;
        left: max(8px, env(safe-area-inset-left, 0px));
        right: max(8px, env(safe-area-inset-right, 0px));
        width: auto;
        max-width: calc(100vw - 16px);
        bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        z-index: 2147482500;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        padding: 7px;
        border: 1px solid rgba(15, 23, 42, .10);
        border-radius: 22px;
        background: rgba(255, 255, 255, .96);
        box-shadow: 0 18px 45px rgba(15, 23, 42, .22);
        backdrop-filter: blur(14px);
        box-sizing: border-box;
      }

      .app-mobile-bottom-nav button {
        min-width: 0;
        min-height: 54px;
        border: 0;
        border-radius: 17px;
        background: transparent;
        color: #334155;
        font-weight: 1000;
        font-size: 11px;
        line-height: 1.1;
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 3px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .app-mobile-bottom-nav button .app-mobile-nav-icon { font-size: 20px; line-height: 1; }
      .app-mobile-bottom-nav button .app-mobile-whatsapp-icon {
        display: grid;
        place-items: center;
        font-size: 0;
      }
      .app-mobile-bottom-nav button .app-mobile-whatsapp-icon svg {
        width: 22px;
        height: 22px;
        display: block;
        filter: drop-shadow(0 1px 1px rgba(15, 23, 42, .16));
      }
      .app-mobile-bottom-nav button.is-active {
        background: linear-gradient(135deg, #fff7ed, #fee2e2);
        color: #9f1239;
        box-shadow: inset 0 0 0 1px rgba(196, 30, 58, .18);
      }
      .app-mobile-bottom-nav button.is-primary {
        background: linear-gradient(135deg, #c41e3a, #9f1239);
        color: #fff;
        box-shadow: 0 10px 22px rgba(196, 30, 58, .22);
      }

      .app-mobile-bottom-menu {
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: calc(86px + env(safe-area-inset-bottom, 0px));
        z-index: 2147482499;
        display: none;
        border-radius: 24px;
        background: #fff;
        border: 1px solid rgba(15, 23, 42, .10);
        box-shadow: 0 24px 70px rgba(15, 23, 42, .26);
        padding: 12px;
      }
      .app-mobile-bottom-menu.is-open { display: block; }
      .app-mobile-bottom-menu__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .app-mobile-bottom-menu__title {
        margin: 0;
        color: #7f1d1d;
        font-size: 15px;
        font-weight: 1000;
      }
      .app-mobile-bottom-menu__hint {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.25;
      }
      .app-mobile-bottom-menu__close {
        min-width: 40px;
        min-height: 40px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        color: #334155;
        font-size: 20px;
        font-weight: 1000;
        cursor: pointer;
      }
      .app-mobile-bottom-menu__grid {
        display: grid;
        gap: 8px;
      }
      .app-mobile-bottom-menu__grid.two { grid-template-columns: 1fr 1fr; }
      .app-mobile-bottom-menu__grid button {
        min-height: 52px;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        background: #fff;
        color: #1f2937;
        font-weight: 1000;
        text-align: left;
        padding: 10px 12px;
        cursor: pointer;
        line-height: 1.15;
      }
      .app-mobile-bottom-menu__grid button strong { display: block; font-size: 13px; }
      .app-mobile-bottom-menu__grid button span { display: block; margin-top: 3px; color: #64748b; font-size: 11px; font-weight: 800; }
      .app-mobile-bottom-menu__grid button.primary { border-color: #fecaca; background: #fff1f2; color: #9f1239; }
      .app-mobile-bottom-menu__grid button.green { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
      .app-mobile-bottom-menu__grid button.orange { border-color: #fed7aa; background: #fff7ed; color: #9a3412; }
    }
  `;
  document.head.appendChild(style);
}

function closeMobileBottomMenu() {
  document.getElementById(MOBILE_MENU_ID)?.classList.remove("is-open");
}

function updateMobileBottomNavActive() {
  const nav = document.getElementById(MOBILE_NAV_ID);
  if (!nav) return;
  const map = {
    dashboardPanel: "home",
    pricesPanel: "prices",
    builderPanel: "sell",
    whatsappPanel: "whatsapp",
    savedPanel: "saved",
    marketPanel: "more",
    webPanel: "more",
    printPanel: "more",
    usersPanel: "more"
  };
  const activeKey = map[currentPanelId] || "home";
  nav.querySelectorAll("[data-mobile-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mobileNav === activeKey);
  });
}

function openMobileBottomMenu(kind) {
  const menu = document.getElementById(MOBILE_MENU_ID);
  if (!menu) return;

  const isSuperadmin = currentSession?.appMode === "superadmin";
  const title = kind === "sell" ? "Vender" : "Más";
  const hint = kind === "sell"
    ? "Elegí cómo querés vender ahora."
    : "Cuenta, web, módulos y salida de la app.";

  const sellButtons = `
    <div class="app-mobile-bottom-menu__grid">
      <button type="button" class="green" data-mobile-action="quick-offer"><strong>⚡ Responder consulta</strong><span>Calculá y respondé por WhatsApp.</span></button>
      <button type="button" class="orange" data-mobile-action="discount-offer"><strong>🏷️ Crear promo o combo</strong><span>Guardá una estrategia para repetir.</span></button>
      <button type="button" class="primary" data-mobile-action="urgent-sale"><strong>🔥 Promo del día</strong><span>Elegí qué vender hoy, publicalo por el día y finalizalo cuando quieras.</span></button>
    </div>
  `;

  const moreButtons = `
    <div class="app-mobile-bottom-menu__grid two">
      <button type="button" data-mobile-action="account"><strong>👤 Mi cuenta</strong><span>Datos y estado.</span></button>
      <button type="button" data-mobile-action="web"><strong>🌐 Mi carnicería online</strong><span>Ver, compartir y gestionar.</span></button>
      <button type="button" data-mobile-action="whatsapp"><strong>📲 WhatsApp</strong><span>Enviar una promo guardada.</span></button>
      <button type="button" data-mobile-action="how-to-sell"><strong>🧭 Cómo vender</strong><span>Conocé las tres maneras de vender.</span></button>
      <button type="button" data-mobile-action="print-center"><strong>🖨️ Centro de Impresiones</strong><span>Pedidos, listas, carteles y folletos.</span></button>
      <button type="button" data-mobile-action="install-app"><strong>📲 <span data-pwa-install-label>INSTALAR</span></strong><span>Entrá desde el icono de tu pantalla.</span></button>
      <button type="button" data-mobile-action="help"><strong>🧭 Ayuda</strong><span>Volver al camino.</span></button>
      ${isSuperadmin ? '<button type="button" data-mobile-action="admin"><strong>🛠️ Admin</strong><span>Panel AppPromos.</span></button>' : ''}
      <button type="button" class="primary" data-mobile-action="logout"><strong>🚪 ${currentSession?.isDemo ? 'Salir demo' : 'Cerrar sesión'}</strong><span>Volver a la landing.</span></button>
    </div>
  `;

  menu.innerHTML = `
    <div class="app-mobile-bottom-menu__head">
      <div>
        <h3 class="app-mobile-bottom-menu__title">${title}</h3>
        <p class="app-mobile-bottom-menu__hint">${hint}</p>
      </div>
      <button type="button" class="app-mobile-bottom-menu__close" data-mobile-menu-close aria-label="Cerrar">×</button>
    </div>
    ${kind === "sell" ? sellButtons : moreButtons}
  `;
  menu.classList.add("is-open");
}

async function handleMobileBottomAction(action) {
  if (!action) return;
  closeMobileBottomMenu();

  if (action === "home") return goToPanel("dashboardPanel");
  if (action === "account") return openAccountSheet("view");
  if (action === "prices") return goToPanel("pricesPanel");
  if (action === "whatsapp") return goToPanel("whatsappPanel");
  if (action === "saved") return goToPanel("savedPanel");
  if (action === "market") return goToPanel("marketPanel");
  if (action === "web") return goToPanel("webPanel");
  if (action === "print-center") return goToPanel("printPanel");
  if (action === "admin") return goToPanel("usersPanel");
  if (action === "how-to-sell") {
    window.open("/como-vender.html", "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "install-app") {
    const installButton = document.querySelector("[data-install-apppromos]");
    if (installButton) installButton.click();
    return;
  }

  if (action === "quick-offer") {
    pendingBuilderInitialMode = "quick";
    trackCarnizaSignal("mobile_nav_quick_offer", { businessId: currentPayload?.businessId || currentBusinessId || null, appMode: currentSession?.appMode || "client" });
    return goToPanel("builderPanel");
  }

  if (action === "discount-offer") {
    pendingBuilderInitialMode = "discount";
    trackCarnizaSignal("mobile_nav_discount_offer", { businessId: currentPayload?.businessId || currentBusinessId || null, appMode: currentSession?.appMode || "client" });
    return goToPanel("builderPanel");
  }

  if (action === "urgent-sale") {
    trackCarnizaSignal("mobile_nav_urgent_sale", { businessId: currentPayload?.businessId || currentBusinessId || null, panelId: currentPanelId, appMode: currentSession?.appMode || "client" });
    openCarnizaUrgentFlowDirect();
    return;
  }

  if (action === "help") {
    const message = currentPanelId === "builderPanel"
      ? "Elegí si vas a responder una consulta o crear una promo para guardar y repetir."
      : "Usá Vender para armar una oferta, Precios para actualizar valores o WhatsApp para enviar una promo lista.";
    window.alert(message);
    return;
  }

  if (action === "logout") {
    if (currentSession?.isDemo) {
      window.location.href = "./index.html";
      return;
    }
    try { await logoutUser(); } catch (_) {}
    window.location.href = "./index.html";
  }
}

function ensureMobileBottomNavigation() {
  injectMobileBottomNavStyles();
  document.body.classList.add("app-mobile-nav-ready");

  if (!document.getElementById(MOBILE_NAV_ID)) {
    const nav = document.createElement("nav");
    nav.id = MOBILE_NAV_ID;
    nav.className = "app-mobile-bottom-nav";
    nav.setAttribute("aria-label", "Navegación principal mobile");
    nav.innerHTML = `
      <button type="button" data-mobile-nav="home" data-mobile-action="home"><span class="app-mobile-nav-icon">🏠</span><span>Inicio</span></button>
      <button type="button" data-mobile-nav="prices" data-mobile-action="prices"><span class="app-mobile-nav-icon">💲</span><span>Precios</span></button>
      <button type="button" class="is-primary" data-mobile-nav="sell" data-mobile-menu="sell"><span class="app-mobile-nav-icon">🥩</span><span>Vender</span></button>
      <button type="button" data-mobile-nav="saved" data-mobile-action="saved"><span class="app-mobile-nav-icon">⭐</span><span>Promos</span></button>
      <button type="button" data-mobile-nav="more" data-mobile-menu="more"><span class="app-mobile-nav-icon">☰</span><span>Más</span></button>
    `;
    document.body.appendChild(nav);
  }

  if (!document.getElementById(MOBILE_MENU_ID)) {
    const menu = document.createElement("div");
    menu.id = MOBILE_MENU_ID;
    menu.className = "app-mobile-bottom-menu";
    document.body.appendChild(menu);
  }

  updateMobileBottomNavActive();
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

    // Regla mobile-first:
    // En acciones concretas el centro manda y el header no debe robar pantalla.
    if (document.body.classList.contains("app-mobile-action-focus")) {
      setTopbarHidden(true);
      lastScrollY = current;
      return;
    }

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
    openCarnizaUrgentFlowDirect();
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
    const howToSell = event.target.closest("[data-open-how-to-sell]");
    if (!howToSell) return;
    window.open("/como-vender.html", "_blank", "noopener,noreferrer");
  });

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-more]");
    if (!toggle) return;
    setMoreLinksVisible(!moreLinks?.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest("[data-mobile-menu-close]");
    if (close) {
      closeMobileBottomMenu();
      return;
    }

    const menuButton = event.target.closest("[data-mobile-menu]");
    if (menuButton) {
      openMobileBottomMenu(menuButton.dataset.mobileMenu);
      return;
    }

    const action = event.target.closest("[data-mobile-action]");
    if (!action) return;
    void handleMobileBottomAction(action.dataset.mobileAction);
  });
}

window.addEventListener("apppromos:web-auto-ready", async (event) => {
  if (!currentBusinessId || event?.detail?.businessId !== currentBusinessId) return;
  try {
    const data = await loadActiveBusinessData(currentBusinessId);
    currentPayload = { businessId: data.businessId, meta: data.meta, state: data.state };
    markLazyPanelsDirty();
    if (isActivationOnboarding()) {
      goToPanel("dashboardPanel");
      renderCurrentDashboard();
    }
  } catch (error) {
    console.warn("No se pudo refrescar el onboarding después de actualizar la web", error);
  }
});

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

async function refreshSavedModule(savedCombo = null, saveContext = {}) {
  if (!currentBusinessId) return;

  const savedComboId = String(savedCombo?.id || savedCombo?.comboId || "").trim();
  const previousSavedCombos = Array.isArray(currentPayload?.state?.savedCombos)
    ? currentPayload.state.savedCombos
    : [];
  const existedBeforeSave = savedComboId
    ? previousSavedCombos.some((item = {}) =>
        String(item?.id || item?.comboId || "").trim() === savedComboId
      )
    : false;

  const createdNow = saveContext?.created === true || Boolean(savedComboId && !existedBeforeSave);

  if (createdNow) {
    await trackBusinessCommercialEvent(currentBusinessId, "offer_created");
    await refreshCommercialBusinessControl();
  }
  const data = await loadActiveBusinessData(currentBusinessId);
  currentPayload = {
    businessId: data.businessId,
    meta: data.meta,
    state: data.state
  };
  renderSavedModule(data.state, data.meta || currentPayload?.meta || {});
  renderWhatsApp(whatsappPanel, data.state?.savedCombos || [], data.meta || {}, getShareOptions("whatsapp_panel"));
  renderCurrentDashboard();
  markLazyPanelsDirty();
}

function getSavedModuleOptions(businessMeta = {}) {
  return {
    ...getShareOptions("saved"),
    businessMeta,
    onEdit: async ({ combo }) => {
      if (!combo) return;
      const latest = await loadActiveBusinessData(currentBusinessId);
      currentPayload = { businessId: latest.businessId, meta: latest.meta, state: latest.state };
      const currentCombo = (Array.isArray(latest?.state?.savedCombos) ? latest.state.savedCombos : [])
        .find((item = {}) => String(item.id || item.comboId || "") === String(combo.id || combo.comboId || ""));
      pendingBuilderEditCombo = currentCombo || combo;
      pendingBuilderInitialMode = "discount";
      goToPanel("builderPanel");
    },
    onDuplicate: async ({ combo }) => {
      if (!currentBusinessId || !combo) return;
      const originalName = String(combo.name || "Promo guardada").trim() || "Promo guardada";
      const proposedName = `${originalName} - copia`;
      const requestedName = window.prompt("Nombre para la nueva promo", proposedName);
      if (requestedName === null) return { cancelled: true };
      const name = String(requestedName || "").trim();
      if (!name) {
        window.alert("Ingresá un nombre para duplicar la promo.");
        return { cancelled: true };
      }

      const now = new Date().toISOString();
      const duplicated = await saveCombo({
        ...combo,
        id: undefined,
        comboId: undefined,
        name,
        description: String(combo.description || "").trim(),
        status: "active",
        isDemoPreloaded: false,
        isDemoLocal: false,
        duplicatedFrom: String(combo.id || combo.comboId || ""),
        createdAt: now,
        updatedAt: now
      }, currentBusinessId);

      await refreshSavedModule();
      return { combo: duplicated };
    },
    onToggleArchive: async ({ combo, archived }) => {
      if (!currentBusinessId || !combo?.id) return;
      const action = archived ? "archivar" : "restaurar";
      const extra = archived
        ? " Si está publicada, también desaparecerá de tu carnicería online."
        : " Volverá a Promos sin publicarse automáticamente.";
      if (!window.confirm(`¿Querés ${action} “${String(combo.name || "esta promo").trim()}”?${extra}`)) {
        return { cancelled: true };
      }

      const latest = await loadActiveBusinessData(currentBusinessId);
      const comboId = String(combo.id);
      const selectedOffers = Array.isArray(latest?.state?.web?.selectedOffers)
        ? latest.state.web.selectedOffers.map(String)
        : [];

      if (archived && selectedOffers.includes(comboId)) {
        await saveWebConfig(currentBusinessId, {
          enabled: true,
          published: true,
          active: true,
          selectedOffers: selectedOffers.filter((id) => id !== comboId),
          updatedFrom: "promos_archivadas"
        });
      }

      await setSavedComboArchived(comboId, archived, currentBusinessId);
      await refreshSavedModule();
      if (webPanel) webPanel.dataset.rendered = "";
      return { archived };
    },
    onDeleteArchived: async ({ combo }) => {
      if (!currentBusinessId || !combo?.id) return;
      const comboName = String(combo.name || "Promo archivada").trim() || "Promo archivada";
      const confirmation = window.prompt(
        `Vas a eliminar definitivamente “${comboName}”. Esta acción no se puede deshacer.\n\nEscribí ELIMINAR para continuar.`
      );
      if (confirmation === null) return { cancelled: true };
      if (String(confirmation).trim().toUpperCase() !== "ELIMINAR") {
        window.alert("No se eliminó la promo. Tenés que escribir ELIMINAR para confirmar.");
        return { cancelled: true };
      }

      const latest = await loadActiveBusinessData(currentBusinessId);
      const comboId = String(combo.id);
      const currentCombo = (Array.isArray(latest?.state?.savedCombos) ? latest.state.savedCombos : [])
        .find((item = {}) => String(item.id || item.comboId || "") === comboId);
      if (!currentCombo || (currentCombo.status !== "archived" && currentCombo.archived !== true)) {
        throw new Error("La promo cambió de estado. Actualizá Promos y volvé a intentar.");
      }

      const selectedOffers = Array.isArray(latest?.state?.web?.selectedOffers)
        ? latest.state.web.selectedOffers.map(String)
        : [];
      if (selectedOffers.includes(comboId)) {
        await saveWebConfig(currentBusinessId, {
          enabled: true,
          published: true,
          active: true,
          selectedOffers: selectedOffers.filter((id) => id !== comboId),
          updatedFrom: "promo_eliminada"
        });
      }

      await deleteArchivedSavedCombo(comboId, currentBusinessId);
      await refreshSavedModule();
      if (webPanel) webPanel.dataset.rendered = "";
      return { deleted: true };
    },
    onTogglePublication: async ({ combo, publish }) => {
      if (!currentBusinessId || !combo?.id) return;
      /* La selección se relee antes de guardar para no pisar cambios hechos
         desde Mi carnicería online u otra sesión abierta. */
      const latest = await loadActiveBusinessData(currentBusinessId);
      const selectedOffers = Array.isArray(latest?.state?.web?.selectedOffers)
        ? latest.state.web.selectedOffers.map(String)
        : [];
      const comboId = String(combo.id);
      const nextSelectedOffers = publish
        ? [...new Set([...selectedOffers, comboId])]
        : selectedOffers.filter((id) => id !== comboId);

      const nextWeb = await saveWebConfig(currentBusinessId, {
        enabled: true,
        published: true,
        active: true,
        selectedOffers: nextSelectedOffers,
        updatedFrom: "promos_guardadas"
      });

      currentPayload.state = {
        ...(latest.state || currentPayload.state || {}),
        web: nextWeb
      };
      if (publish) {
        await trackBusinessCommercialEvent(currentBusinessId, "offer_published");
        await refreshCommercialBusinessControl();
      }
      renderSavedModule(currentPayload.state, latest.meta || businessMeta);
      renderCurrentDashboard();
      if (webPanel) webPanel.dataset.rendered = "";
    }
  };
}

function renderSavedModule(state = {}, businessMeta = {}) {
  renderSaved(savedPanel, state, getSavedModuleOptions(businessMeta));
}

async function refreshUsersModule() {
  if (!usersPanel) return;
  if (!currentSession || currentSession.appMode !== "superadmin") {
    usersPanel.innerHTML = `<div style="color:#6e6e6e;">Solo disponible para superadmin.</div>`;
    usersPanel.dataset.rendered = "true";
    return;
  }

  await renderAdminUsers(usersPanel, {
    showBackToApp: Boolean(currentBusinessId),
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
  await renderWebPremium(webPanel, currentBusinessId, {
    onEditBusinessData: () => openAccountSheet("edit")
  });
  if (isPaymentOverdue()) injectAccessWarning(webPanel);
  webPanel.dataset.rendered = "true";
}

async function renderLazyPanel(panelId) {
  if ((!currentBusinessId && panelId !== "usersPanel") || lazyRenderInProgress === panelId) return;

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

async function syncProductDrivenViews(updatedProducts = null, updateResult = null) {
  if (!currentBusinessId || !currentPayload) return;

  if (Array.isArray(updatedProducts) && currentPayload.state) {
    currentPayload.state = {
      ...currentPayload.state,
      products: updatedProducts,
      /* V12.23-A3: la publicación debe usar las Promos recién recalculadas,
         no la copia anterior que permanecía en memoria. */
      ...(Array.isArray(updateResult?.updatedSavedCombos)
        ? { savedCombos: updateResult.updatedSavedCombos }
        : {})
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
    await syncCurrentPublicWebSnapshot("products_updated");
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
  await syncCurrentPublicWebSnapshot("products_reloaded");
}

function buildPrintCenterPayload(meta = {}, state = {}, products = []) {
  const printableState = {
    ...(state || {}),
    dailyPromos: getDailyPromosForManagement({
      state: state || {},
      isDemo: currentSession?.isDemo === true
    })
  };

  const web = printableState?.web || {};
  const publicPayload = buildPublicWebPayload({
    businessId: currentPayload?.businessId || currentBusinessId || "",
    slug: web?.slug || "",
    meta: meta || {},
    state: printableState,
    web,
    phoneKey: meta?.phoneKey || meta?.telefono || meta?.phone || "",
    plan: "web_premium",
    createdFrom: "print_center"
  });

  const cleanSlug = String(web?.slug || publicPayload?.slug || "").trim();
  const publicWebUrl = cleanSlug
    ? getPublicWebUrl(currentPayload?.businessId || currentBusinessId || "", cleanSlug)
    : "";

  return {
    businessMeta: meta || {},
    products: Array.isArray(products) ? products : [],
    publicOffers: Array.isArray(publicPayload?.publicOffers) ? publicPayload.publicOffers : [],
    dailyOffers: Array.isArray(publicPayload?.dailyOffers) ? publicPayload.dailyOffers : [],
    publicWebUrl
  };
}

async function renderBusinessWorkspace(options = {}) {
  const payload = await openBusiness(currentBusinessId);
  const root = currentSession?.isDemo ? null : await readBusinessRoot(currentBusinessId).catch(() => null);
  currentBusinessControl = currentSession?.isDemo
    ? buildBusinessDefaults({ businessId: currentBusinessId, name: payload?.meta?.name || "Carnicería de Carniza", status: "active", billingStatus: "active", plan: "demo" })
    : buildBusinessDefaults({ ...(root || {}), businessId: currentBusinessId, name: root?.name || payload?.meta?.name || currentBusinessId });
  if (!options.skipTracking && currentSession?.isDemo) {
    trackDemoStartedOnce({
      source: "app_demo",
      business_id: currentBusinessId || "demo-carniza"
    });
  }
  if (!options.skipTracking && !currentSession?.isDemo) {
    await trackBusinessLogin(currentBusinessId);
    await trackBusinessActivityThrottled(currentBusinessId, 60);
  }
  insertDemoBanner();
  currentPayload = payload;
  if (!currentSession?.isDemo && !publicSnapshotSyncedBusinesses.has(payload.businessId)) {
    await syncCurrentPublicWebSnapshot("workspace_open");
  }
  updateCarnizaContext({
    businessControl: currentBusinessControl,
    payload: currentPayload,
    panelId: currentPanelId,
    appMode: currentSession?.appMode || "client"
  });
  publishAccessStatus();
  updateMobileCompactHeader();

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
    if (printPanel) renderPrintCenter(printPanel, buildPrintCenterPayload(currentPayload?.meta || {}, currentPayload?.state || {}, []));
    return;
  }

  renderCurrentDashboard();
  // La Nelly queda en la alerta superior. Evitamos duplicar el mensaje dentro de Inicio.

  const data = await loadActiveBusinessData(currentBusinessId);
  const catalogProducts = Array.isArray(data.products) ? data.products : [];
  const activeProducts = setActiveProductCatalog(catalogProducts);

  if (!setPanelLocked(pricesPanel, "prices")) {
    // Precios debe mostrar el catálogo completo, incluso productos todavía en $0.
    // Builder/ofertas sigue recibiendo solo productos activos con precio real.
    renderPrices(pricesPanel, catalogProducts, currentBusinessId, {
      ...getWriteOptions(),
      selectedRubros: Array.isArray(data.state?.businessPreferences?.selectedRubros)
        ? data.state.businessPreferences.selectedRubros
        : [],
      onPricesSaved: async (result = {}) => {
        const pricedProductCount = Array.isArray(result.updatedProducts)
          ? result.updatedProducts.filter((product) => Number(product?.precio ?? product?.price ?? 0) > 0).length
          : 0;
        await trackBusinessCommercialEvent(currentBusinessId, "price_save", {
          source: "prices_panel",
          metadata: {
            pricedProductCount,
            changedProductCount: Number(result.changed || 0)
          }
        });
      },
      onProductsUpdated: async (...args) => {
        await trackBusinessActivityThrottled(currentBusinessId, 60);
        return syncProductDrivenViews(...args);
      }
    });
    if (isPaymentOverdue()) injectAccessWarning(pricesPanel);
  }

  if (!setPanelLocked(savedPanel, "combos")) renderSavedModule(data.state, data.meta || currentPayload?.meta || {});
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
    webPanel.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Tu carnicería online se cargará al abrir este módulo.</div>`;
  }

  if (printPanel) renderPrintCenter(printPanel, buildPrintCenterPayload(currentPayload?.meta || {}, data.state || currentPayload?.state || {}, catalogProducts));

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

    ensureMobileBottomNavigation();

    window.__APPPROMOS_AUTHENTICATED_SESSION__ = true;
    window.dispatchEvent(new CustomEvent("apppromos:authenticated-session", {
      detail: {
        appMode: session.appMode,
        isDemo: session?.isDemo === true
      }
    }));

    syncNavForRole(session);

    if (!session?.isDemo) {
      await loadMarketCacheOnce();
    }

    if (session.appMode === "client") {
      currentBusinessId = session.businessId;
      restartBusinessControlListener(currentBusinessId);
      await renderBusinessWorkspace();
      await trackBusinessCommercialEvent(currentBusinessId, "app_open");
      initializeAppPanelHistory("dashboardPanel");
      goToPanel("dashboardPanel", { historyMode: "none" });
      return;
    }

    if (session.appMode === "superadmin") {
      currentBusinessId = null;
      currentPayload = null;
      currentBusinessControl = null;
      restartBusinessControlListener(null);

      try {
        localStorage.removeItem("activeBusinessId");
        localStorage.removeItem("apppromos_active_business_id");
      } catch (error) {
        console.warn("No se pudo limpiar la empresa activa anterior del SuperAdmin", error);
      }

      initializeAppPanelHistory("usersPanel");
      goToPanel("usersPanel", { historyMode: "none" });
      return;
    }

    throw new Error("Modo inválido");
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


// APPPROMOS C6 FIX5 - inicio y mas mas limpios
(function installC6Fix5InicioMasLimpio() {
  if (window.__APPPROMOS_C6_FIX5_INICIO_MAS_LIMPIO__) return;
  window.__APPPROMOS_C6_FIX5_INICIO_MAS_LIMPIO__ = true;

  const SHOW_ROUTE_FLAG = "apppromos_show_recorrido_sugerido_v1";

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isDemoContext() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      if (params.get("demo") === "1" || params.get("mode") === "demo") return true;

      const bodyText = document.body ? document.body.innerText || "" : "";
      if (/@demo\.com\b/i.test(bodyText)) return true;
      if (normalizeText(bodyText).includes("estas probando apppromos")) return true;

      return Object.keys(localStorage || {}).some((key) => {
        const raw = String(localStorage.getItem(key) || "");
        return /demo/i.test(key) && /demo/i.test(raw);
      });
    } catch (_) {
      return false;
    }
  }

  function shouldShowSuggestedRoute() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return (
        params.get("recorrido") === "1" ||
        params.get("onboarding") === "1" ||
        localStorage.getItem(SHOW_ROUTE_FLAG) === "1"
      );
    } catch (_) {
      return false;
    }
  }

  function removeSmallestBlockContaining(phrases, options = {}) {
    const normalizedPhrases = phrases.map(normalizeText);
    const exclude = (options.exclude || []).map(normalizeText);
    const maxLength = options.maxLength || 900;

    const candidates = Array.from(document.querySelectorAll("div, section, article, aside, button"))
      .filter((el) => {
        if (!el || !el.textContent) return false;
        const text = normalizeText(el.textContent);
        if (!normalizedPhrases.every((phrase) => text.includes(phrase))) return false;
        if (exclude.some((phrase) => text.includes(phrase))) return false;
        if (text.length > maxLength) return false;
        return true;
      })
      .sort((a, b) => String(a.textContent || "").length - String(b.textContent || "").length);

    const target = candidates[0];
    if (target && target.parentElement) {
      target.remove();
      return true;
    }

    return false;
  }

  function cleanInicioAndMas() {
    // Inicio: sacar "Recorrido sugerido" del uso diario.
    // Queda disponible solo para onboarding explícito / primer uso real.
    if (!shouldShowSuggestedRoute()) {
      removeSmallestBlockContaining(["Recorrido sugerido"], {
        maxLength: 900
      });
    }

    // Más: sacar Ayuda si solo dice "Volver al camino".
    // La guía vive desde Carniza.
    removeSmallestBlockContaining(["Ayuda", "Volver al camino"], {
      maxLength: 260,
      exclude: ["Mi cuenta", "Mi web", "Cerrar sesión", "Competencia"]
    });
  }

  let rafId = 0;
  function scheduleClean() {
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(cleanInicioAndMas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleClean, { once: true });
  } else {
    scheduleClean();
  }

  const observerTarget = document.body || document.documentElement;
  if (observerTarget) {
    const observer = new MutationObserver(scheduleClean);
    observer.observe(observerTarget, { childList: true, subtree: true });
  }

  window.addEventListener("hashchange", scheduleClean);
  window.addEventListener("popstate", scheduleClean);
})();
