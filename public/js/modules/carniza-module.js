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
    label: "⚡ Ir a Precios",
    kind: "primary",
    run: () => navigateTo("pricesPanel")
  },
  offers: {
    label: "Armar oferta",
    kind: "primary",
    run: () => navigateTo("builderPanel")
  },
  whatsapp: {
    label: "📲 Ir a WhatsApp",
    kind: "whatsapp",
    run: () => navigateTo("whatsappPanel")
  },
  whatsappAfterSave: {
    label: "✅ Ya la guardé: WhatsApp",
    kind: "whatsapp",
    run: () => navigateTo("whatsappPanel")
  },
  home: {
    label: "🏠 Volver a Inicio",
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
      message: "Estás en Precios. Ajustá lo necesario y después armá una oferta.",
      hint: "Primero dejá claro el precio. Después pasás a Ofertas y salís a vender.",
      actions: ["offers"]
    };
  }

  if (panelId === "builderPanel") {
    return {
      message: "Estás en Ofertas. Primero guardá la oferta y después mandala por WhatsApp.",
      hint: "Si todavía no la guardaste, no te apures. Guardala y recién después compartila.",
      actions: ["whatsappAfterSave", "prices"]
    };
  }

  if (panelId === "whatsappPanel") {
    return {
      message: "Estás en WhatsApp. Elegí una oferta guardada y compartila con tus clientes.",
      hint: "Acá se manda lo que ya está listo. Si falta algo, volvé a Ofertas.",
      actions: ["offers", "prices"]
    };
  }

  return null;
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
      message: panelCopy?.message || "Estás probando AppPromos. Arrancá por Precios u Ofertas.",
      hint: panelCopy?.hint || "Primero armás o elegís la oferta. Después la mandás por WhatsApp.",
      actions: panelCopy?.actions || ["prices", "offers"]
    };
  }

  const panelCopy = getPanelCopy(currentContext.panelId);
  return {
    badge: "✅ Al día",
    tone: "active",
    message: panelCopy?.message || "¿Qué querés vender hoy?",
    hint: panelCopy?.hint || "Arrancá por Precios o armá una oferta. WhatsApp viene cuando la oferta ya está lista.",
    actions: panelCopy?.actions || ["prices", "offers"]
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
          <p class="carniza-subtitle">Vendamos algo</p>
        </div>
      </div>
      <button type="button" class="carniza-close" data-carniza-close="true" aria-label="Cerrar Carniza">×</button>
    </div>
    <div class="carniza-body">
      <div class="carniza-badge ${escapeHtml(copy.tone)}">${escapeHtml(copy.badge)}</div>
      <p class="carniza-message">${escapeHtml(copy.message)}</p>
      <p class="carniza-hint">${escapeHtml(copy.hint)}</p>
      <div class="carniza-actions">${actions}</div>
    </div>
    <div class="carniza-footer">Carniza no viene a charlar. Viene a vender.</div>
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
