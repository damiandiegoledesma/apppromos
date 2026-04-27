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

function getWriteOptions() {
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
    const next = JSON.stringify(control || {});
    if (previous !== next && currentPayload) {
      markLazyPanelsDirty();
      await renderBusinessWorkspace({ skipTracking: true });
      goToPanel(currentPanelId || "dashboardPanel", { keepMoreOpen: true });
    }
  });
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
        renderWhatsApp(whatsappPanel, currentPayload.state?.savedCombos || [], currentPayload.meta || {});
        markLazyPanelsDirty();
        alert("Datos del negocio guardados correctamente.");
      }
    }
  );
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

function goToPanel(panelId, options = {}) {
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
    const action = event.target.closest("[data-action-panel]");
    if (!action) return;
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
  renderSaved(savedPanel, data.state);
  renderWhatsApp(whatsappPanel, data.state?.savedCombos || [], data.meta || {});
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

    renderCurrentDashboard();
    renderBuilder(builderPanel, updatedProducts, refreshSavedModule, { businessId: currentBusinessId, ...getWriteOptions() });
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

  renderCurrentDashboard();
  renderBuilder(builderPanel, data.products, refreshSavedModule, { businessId: currentBusinessId, ...getWriteOptions() });
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
  const root = await readBusinessRoot(currentBusinessId).catch(() => null);
  currentBusinessControl = buildBusinessDefaults({ ...(root || {}), businessId: currentBusinessId, name: root?.name || payload?.meta?.name || currentBusinessId });
  if (!options.skipTracking) {
    await trackBusinessLogin(currentBusinessId);
    await trackBusinessActivityThrottled(currentBusinessId, 60);
  }
  currentPayload = payload;
  updateCarnizaContext({
    businessControl: currentBusinessControl,
    payload: currentPayload,
    panelId: currentPanelId,
    appMode: currentSession?.appMode || "client"
  });

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
  injectAccessWarning(dashboardPanel);

  const data = await loadActiveBusinessData(currentBusinessId);

  if (!setPanelLocked(pricesPanel, "prices")) {
    renderPrices(pricesPanel, data.products, currentBusinessId, {
      ...getWriteOptions(),
      onProductsUpdated: async (...args) => {
        await trackBusinessActivityThrottled(currentBusinessId, 60);
        return syncProductDrivenViews(...args);
      }
    });
    if (isPaymentOverdue()) injectAccessWarning(pricesPanel);
  }

  if (!setPanelLocked(savedPanel, "combos")) renderSaved(savedPanel, data.state);
  if (!setPanelLocked(builderPanel, "combos")) renderBuilder(builderPanel, data.products, async (...args) => {
    await trackBusinessActivityThrottled(currentBusinessId, 60);
    return refreshSavedModule(...args);
  }, { businessId: currentBusinessId, ...getWriteOptions() });
  if (!setPanelLocked(whatsappPanel, "whatsapp")) renderWhatsApp(whatsappPanel, data.state?.savedCombos || [], payload.meta || {});

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
    initCarniza({ onNavigate: goToPanel });

    const session = await resolveSession();
    currentSession = session;
    updateCarnizaContext({ appMode: currentSession?.appMode || "client" });

    if (session.appMode === "guest") {
      window.location.replace("./index.html");
      return;
    }

    syncNavForRole(session);

    await loadMarketCacheOnce();

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
