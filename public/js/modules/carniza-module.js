import { buildAppPromosWhatsAppUrl, getAccessState } from "../services/access-control-service.js";
import { trackCarnizaSignal } from "../services/carniza-signals-service.js";

let carnizaRoot = null;
let carnizaPanel = null;
let currentContext = {
  businessControl: {},
  payload: null,
  panelId: "dashboardPanel",
  appMode: "client"
};

let navigationHandler = null;
let initialized = false;

const ACTIONS = {
  prices: {
    label: "💲 Precios",
    kind: "primary",
    run: () => navigateTo("pricesPanel")
  },
  web: {
    label: "🌐 Mi web",
    kind: "secondary",
    run: () => navigateTo("webPanel")
  },
  offers: {
    label: "🔥 Crear oferta",
    kind: "primary",
    run: () => navigateTo("builderPanel")
  },
  whatsapp: {
    label: "💬 WhatsApp",
    kind: "whatsapp",
    run: () => navigateTo("whatsappPanel")
  },
  whatsappAfterSave: {
    label: "💬 Enviar oferta",
    kind: "whatsapp",
    run: () => navigateTo("whatsappPanel")
  },
  home: {
    label: "🏠 Inicio",
    kind: "secondary",
    run: () => navigateTo("dashboardPanel")
  },
  supportPlans: {
    label: "📲 Consultar por WhatsApp",
    kind: "whatsapp",
    run: () => openSupportWhatsApp("Hola AppPromos, quiero consultar los planes para mi carnicería.")
  },
  supportPayment: {
    label: "📲 Regularizar por WhatsApp",
    kind: "whatsapp",
    run: () => openSupportWhatsApp("Hola AppPromos, quiero regularizar mi pago y reactivar los guardados.")
  },
  supportReactivate: {
    label: "📲 Reactivar por WhatsApp",
    kind: "whatsapp",
    run: () => openSupportWhatsApp("Hola AppPromos, quiero reactivar mi cuenta de AppPromos.")
  }
};

function navigateTo(panelId) {
  if (typeof navigationHandler === "function") {
    navigationHandler(panelId);
    closeCarniza();
    return;
  }

  const button = document.querySelector(`button[data-panel="${panelId}"]`);
  if (button) {
    button.click();
    closeCarniza();
  }
}

function openSupportWhatsApp(message) {
  window.open(buildAppPromosWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  closeCarniza();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBusinessName() {
  const payload = currentContext.payload || {};
  const meta = payload.meta || {};
  const control = currentContext.businessControl || {};
  return String(meta.businessName || meta.displayName || meta.name || control.name || "tu carnicería").trim();
}

function getPanelCopy(panelId) {
  if (panelId === "pricesPanel") {
    return {
      message: "Poné tus precios.",
      hint: "Tu web se actualiza sola.",
      actions: ["offers", "web"]
    };
  }

  if (panelId === "builderPanel") {
    return {
      message: "Armá la promo.",
      hint: "Cuando esté lista, mandala.",
      actions: ["whatsappAfterSave", "prices"]
    };
  }

  if (panelId === "whatsappPanel") {
    return {
      message: "Elegí y enviá.",
      hint: "",
      actions: ["offers", "home"]
    };
  }

  if (panelId === "webPanel") {
    return {
      message: "Esta es tu carnicería online.",
      hint: "Completala y compartila.",
      actions: ["prices", "offers"]
    };
  }

  return null;
}

function getActivationState() {
  const payload = currentContext.payload || {};
  const meta = payload.meta || {};
  const state = payload.state || {};
  const web = state.web || {};
  const products = Array.isArray(state.products) ? state.products : [];

  const pricedCount = products.filter((product = {}) => {
    const price = Number(product.precio ?? product.price ?? 0);
    return product.active !== false
      && product.activo !== false
      && Number.isFinite(price)
      && price > 0;
  }).length;

  const hasWeb = Boolean(web.slug || web.publicUrl || web.enabled);
  const webReady = Boolean(
    hasWeb
    && web.showPriceList === true
    && (web.priceListStatus === "ready" || web.priceListStatus === "confirmed")
  );

  const logoReady = Boolean(meta?.brand?.logoUrl);
  const frontReady = Boolean(meta?.brand?.frontPhotoUrl);

  return {
    pricedCount,
    hasWeb,
    webReady,
    identityReady: logoReady && frontReady,
    logoReady,
    frontReady
  };
}

function getCarnizaCopy() {
  const businessControl = currentContext.businessControl || {};
  const access = getAccessState(businessControl);
  const commercialKey = access.commercialKey || "active";
  const businessName = getBusinessName();

  if (access.level === "blocked") {
    return {
      badge: "🔒 Pausado",
      tone: "blocked",
      message: "La Nelly te cuida y nos cuida.",
      hint: "Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.",
      actions: ["supportReactivate", "home"]
    };
  }

  if (access.level === "warning") {
    const isTrialExpired = commercialKey === "trial_expired";
    return {
      badge: "⚠️ Pendiente",
      tone: "warning",
      message: isTrialExpired
        ? "La Nelly te cuida y nos cuida. Tu prueba terminó, pero lo resolvemos sin vueltas."
        : "La Nelly te cuida y nos cuida. Hay un pago pendiente, pero se arregla rápido.",
      hint: "Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.",
      actions: [isTrialExpired ? "supportPlans" : "supportPayment", "home"]
    };
  }

  const activation = getActivationState();

  if (!activation.hasWeb || activation.pricedCount === 0) {
    return {
      badge: "🌐 Activar",
      tone: access.level === "trial" ? "trial" : "active",
      subtitle: "Primero tu web",
      message: activation.pricedCount === 0 ? "Cargá tus primeros precios." : "Activemos tu web.",
      hint: "Después salimos a vender.",
      actions: ["prices", "web"]
    };
  }

  if (!activation.webReady) {
    return {
      badge: "🌐 Casi lista",
      tone: access.level === "trial" ? "trial" : "active",
      subtitle: "Primero tu web",
      message: "Terminemos tu vidriera.",
      hint: "",
      actions: ["prices", "web"]
    };
  }

  if (!activation.identityReady) {
    return {
      badge: "📸 Identidad",
      tone: access.level === "trial" ? "trial" : "active",
      subtitle: "Tu negocio primero",
      message: "Dale tu identidad.",
      hint: "Logo + foto del local.",
      actions: ["web", "offers"]
    };
  }

  if (commercialKey === "trial_ending_soon") {
    return {
      badge: "⏳ Por vencer",
      tone: "ending",
      message: access.message || "Tu prueba termina pronto.",
      hint: "Aprovechá estos días: armá una oferta y seguí vendiendo.",
      actions: ["offers", "supportPlans"]
    };
  }

  if (access.level === "trial") {
    const panelCopy = getPanelCopy(currentContext.panelId);
    return {
      badge: "🎁 Prueba",
      tone: "trial",
      subtitle: "Vendamos algo",
      message: panelCopy?.message || "Tu web está lista.",
      hint: panelCopy?.hint || "Ahora vendamos.",
      actions: panelCopy?.actions || ["offers", "web"]
    };
  }

  const panelCopy = getPanelCopy(currentContext.panelId);
  return {
    badge: "✅ Al día",
    tone: "active",
    subtitle: "Vendamos algo",
    message: panelCopy?.message || "¿Qué vendemos hoy?",
    hint: panelCopy?.hint || "",
    actions: panelCopy?.actions || ["offers", "web"]
  };
}

function renderCarniza() {
  if (!carnizaRoot || !carnizaPanel) return;

  const shouldHide = currentContext.appMode === "guest" || currentContext.panelId === "usersPanel";
  carnizaRoot.classList.toggle("is-hidden", Boolean(shouldHide));
  if (shouldHide) return;

  const copy = getCarnizaCopy();
  const actions = copy.actions
    .map((actionKey) => {
      const action = ACTIONS[actionKey];
      if (!action) return "";
      const kind = action.kind === "whatsapp" ? "whatsapp" : action.kind === "primary" ? "primary" : "secondary";
      return `
        <button type="button" class="carniza-action ${kind}" data-carniza-action="${escapeHtml(actionKey)}">
          <span>${escapeHtml(action.label)}</span>
          <span aria-hidden="true">›</span>
        </button>
      `;
    })
    .join("");

  carnizaPanel.innerHTML = `
    <div class="carniza-card-head">
      <div class="carniza-title-wrap">
        <img class="carniza-avatar" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
        <div>
          <h3 class="carniza-title">Carniza</h3>
          <p class="carniza-subtitle">${escapeHtml(copy.subtitle || "Vendamos algo")}</p>
        </div>
      </div>
      <button type="button" class="carniza-close" data-carniza-close="true" aria-label="Cerrar Carniza">×</button>
    </div>
    <div class="carniza-body">
      <div class="carniza-badge ${escapeHtml(copy.tone)}">${escapeHtml(copy.badge)}</div>
      <p class="carniza-message">${escapeHtml(copy.message)}</p>
      ${copy.hint ? `<p class="carniza-hint">${escapeHtml(copy.hint)}</p>` : ""}
      <div class="carniza-actions">${actions}</div>
    </div>
    <div class="carniza-footer">Carniza · siguiente paso</div>
  `;
}

function openCarniza() {
  if (!carnizaRoot) return;
  trackCarnizaSignal("carniza_panel_opened", { panelId: currentContext.panelId, appMode: currentContext.appMode });
  carnizaRoot.classList.add("is-open");
  renderCarniza();
}

function closeCarniza() {
  if (!carnizaRoot) return;
  carnizaRoot.classList.remove("is-open");
}

function toggleCarniza() {
  if (!carnizaRoot) return;
  if (carnizaRoot.classList.contains("is-open")) closeCarniza();
  else openCarniza();
}

function bindCarnizaEvents() {
  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-carniza-action]");
    if (actionButton) {
      const actionKey = actionButton.dataset.carnizaAction;
      const action = ACTIONS[actionKey];
      trackCarnizaSignal("accion_carniza_tocada", { actionKey, panelId: currentContext.panelId, appMode: currentContext.appMode });
      if (action) action.run();
      return;
    }

    if (event.target.closest("[data-carniza-close]")) {
      closeCarniza();
      return;
    }

    if (!carnizaRoot?.classList.contains("is-open")) return;
    const insideCarniza = event.target.closest(".carniza-root");
    if (!insideCarniza) closeCarniza();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCarniza();
  });
}

export function initCarniza(options = {}) {
  if (initialized) return;
  initialized = true;
  navigationHandler = typeof options.onNavigate === "function" ? options.onNavigate : null;

  carnizaRoot = document.createElement("aside");
  carnizaRoot.className = "carniza-root carniza-root--legacy";
  carnizaRoot.setAttribute("aria-label", "Carniza, vendedor de AppPromos");
  carnizaRoot.innerHTML = `
    <button type="button" class="carniza-fab" aria-label="Abrir Carniza">
      <img class="carniza-fab-icon" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
      <span class="carniza-fab-pulse" aria-hidden="true"></span>
    </button>
    <div class="carniza-panel" role="dialog" aria-label="Carniza ayuda"></div>
  `;

  document.body.appendChild(carnizaRoot);
  carnizaPanel = carnizaRoot.querySelector(".carniza-panel");
  carnizaRoot.querySelector(".carniza-fab")?.addEventListener("click", toggleCarniza);
  bindCarnizaEvents();
  renderCarniza();
}

export function updateCarnizaContext(nextContext = {}) {
  currentContext = {
    ...currentContext,
    ...(nextContext || {})
  };
  renderCarniza();
}
