(function () {
  "use strict";

  let root = null;
  let currentContext = "hero";

  const CONTEXTS = {
    hero: {
      label: "Ver A La Estaca",
      badge: "Carniza · carnicería online real",
      title: "Mirá una carnicería online",
      subtitle: "Así se vende con AppPromos",
      message: "Te muestro cómo A La Estaca usa AppPromos para mostrar precios, ofertas y recibir pedidos.",
      hint: "Entrá a su vidriera, mirá los productos y probá cómo funciona el carrito.",
      primary: { action: "storefront", text: "Ver A La Estaca" },
      secondary: { action: "signup", text: "Crear mi carnicería" },
      footer: "Primero mirá una real. Después armamos la tuya."
    },
    how: {
      label: "Así funciona",
      badge: "Carniza · cómo funciona",
      title: "Simple para el carnicero",
      subtitle: "Precios, web y WhatsApp",
      message: "Cargás tus precios, tu vidriera se actualiza y el cliente te manda el pedido por WhatsApp.",
      hint: "Sin planillas ni vueltas: tus productos quedan online y el cliente arma su pedido desde el celular.",
      primary: { action: "storefront", text: "Ver A La Estaca" },
      secondary: { action: "signup", text: "Quiero la mía" },
      footer: "Tu carnicería online primero. Después descubrís todo el sistema comercial."
    },
    web: {
      label: "Ver A La Estaca",
      badge: "Carniza · ejemplo real",
      title: "Esta carnicería ya está online",
      subtitle: "Mirá la experiencia del cliente",
      message: "A La Estaca ya muestra productos, precios y ofertas y recibe pedidos desde su vidriera.",
      hint: "Abrila como cliente, recorré la web y probá el carrito antes de crear la tuya.",
      primary: { action: "storefront", text: "Abrir A La Estaca" },
      secondary: { action: "signup", text: "Quiero mi carnicería online" },
      footer: "Una carnicería real vale más que una demo."
    },
    pricing: {
      label: "Probala sin cargo",
      badge: "Carniza · empezá hoy",
      title: "Poné tu carnicería online",
      subtitle: "Probala sin cargo",
      message: "Creá tu carnicería, cargá algunos precios y empezá a compartir tu vidriera.",
      hint: "No necesitás elegir un plan para entender si AppPromos te sirve.",
      primary: { action: "signup", text: "Crear mi carnicería" },
      secondary: { action: "storefront", text: "Ver A La Estaca" },
      footer: "Primero usala. Después definimos juntos el siguiente paso."
    },
    auth: {
      label: "Ahora hacé la tuya",
      badge: "Carniza · registro",
      title: "Tu carnicería online empieza acá",
      subtitle: "Registro corto",
      message: "Creá tu cuenta y empezá cargando algunos precios. AppPromos prepara tu vidriera.",
      hint: "Después vas a poder completar o cambiar los datos de tu negocio.",
      primary: { action: "focusSignup", text: "Completar registro" },
      secondary: { action: "storefront", text: "Ver A La Estaca" },
      footer: "La idea es que llegues rápido a ver tu propia carnicería online."
    }
  };

  function closePanel() {
    root?.classList.remove("is-open");
  }

  function openSignup() {
    closePanel();
    if (typeof window.showSignup === "function") {
      window.showSignup();
      return;
    }
    window.location.hash = "signup";
  }

  function openStorefront() {
    closePanel();
    window.location.href = "/carniceria-a-la-estaca-3462-543210";
  }

  function focusSignup() {
    if (typeof window.showSignup === "function") {
      window.showSignup();
    } else {
      window.location.hash = "signup";
    }

    closePanel();

    window.setTimeout(() => {
      const target =
        document.getElementById("businessName") ||
        document.getElementById("ownerName") ||
        document.querySelector("#signup input, #auth input");

      target?.focus?.();
    }, 160);
  }

  function runAction(action) {
    if (action === "signup") return openSignup();
    if (action === "storefront") return openStorefront();
    if (action === "focusSignup") return focusSignup();
  }

  function getActiveContext() {
    if (
      document.body.classList.contains("auth-mode") ||
      window.location.hash === "#signup" ||
      window.location.hash === "#register"
    ) {
      return "auth";
    }

    const sections = [
      { key: "pricing", el: document.getElementById("precios") },
      { key: "web", el: document.getElementById("web-premium") },
      { key: "how", el: document.getElementById("como-funciona") },
      { key: "hero", el: document.querySelector(".hero") }
    ].filter((item) => item.el);

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 700;
    let best = { key: "hero", score: -1 };

    sections.forEach(({ key, el }) => {
      const rect = el.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
      const score = visible / Math.max(1, Math.min(rect.height, viewportHeight));
      const nearTopBonus = rect.top <= 120 && rect.bottom > 120 ? 0.35 : 0;
      const finalScore = score + nearTopBonus;

      if (finalScore > best.score) {
        best = { key, score: finalScore };
      }
    });

    return best.key || "hero";
  }

  function context() {
    return CONTEXTS[currentContext] || CONTEXTS.hero;
  }

  function renderPanelContent() {
    if (!root) return;

    const data = context();

    const label = root.querySelector(".carniza-landing-fab-label");
    const badge = root.querySelector(".carniza-landing-badge");
    const title = root.querySelector(".carniza-landing-title");
    const subtitle = root.querySelector(".carniza-landing-subtitle");
    const message = root.querySelector(".carniza-landing-message");
    const hint = root.querySelector(".carniza-landing-hint");
    const footer = root.querySelector(".carniza-landing-footer");
    const actions = root.querySelector(".carniza-landing-actions");

    if (label) label.textContent = data.label;
    if (badge) badge.textContent = data.badge;
    if (title) title.textContent = data.title;
    if (subtitle) subtitle.textContent = data.subtitle;
    if (message) message.textContent = data.message;
    if (hint) hint.textContent = data.hint;
    if (footer) footer.textContent = data.footer;

    if (actions) {
      const primary = data.primary;
      const secondary = data.secondary;

      actions.innerHTML = `
        <button type="button" class="carniza-landing-action primary" data-carniza-landing-action="${primary.action}">
          <span>${primary.text}</span><span aria-hidden="true">›</span>
        </button>
        <button type="button" class="carniza-landing-action" data-carniza-landing-action="${secondary.action}">
          <span>${secondary.text}</span><span aria-hidden="true">›</span>
        </button>
      `;
    }
  }

  function updateContext(force) {
    const next = getActiveContext();

    if (!force && next === currentContext) return;

    currentContext = next;
    root?.setAttribute("data-carniza-context", currentContext);
    renderPanelContent();
  }

  function togglePanel() {
    updateContext(true);
    root?.classList.toggle("is-open");
  }

  function render() {
    root = document.createElement("aside");
    root.className = "carniza-landing-root";
    root.setAttribute("aria-label", "Carniza, vendedor de AppPromos");

    root.innerHTML = `
      <button type="button" class="carniza-landing-fab" aria-label="Abrir Carniza">
        <img class="carniza-landing-fab-icon" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
        <span class="carniza-landing-fab-label">Ver A La Estaca</span>
        <span class="carniza-landing-dot" aria-hidden="true"></span>
      </button>

      <div class="carniza-landing-panel" role="dialog" aria-label="Carniza Landing">
        <div class="carniza-landing-head">
          <div class="carniza-landing-brand">
            <img class="carniza-landing-avatar" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
            <div>
              <h3 class="carniza-landing-title">Soy Carniza</h3>
              <p class="carniza-landing-subtitle">Vendedor de AppPromos</p>
            </div>
          </div>
          <button type="button" class="carniza-landing-close" data-carniza-landing-close="true" aria-label="Cerrar Carniza">×</button>
        </div>

        <div class="carniza-landing-body">
          <div class="carniza-landing-badge">Carniza · carnicería online real</div>
          <p class="carniza-landing-message"></p>
          <p class="carniza-landing-hint"></p>
          <div class="carniza-landing-actions"></div>
        </div>

        <div class="carniza-landing-footer"></div>
      </div>
    `;

    document.body.appendChild(root);

    root.querySelector(".carniza-landing-fab")?.addEventListener("click", togglePanel);
    updateContext(true);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-carniza-landing-action]")?.dataset?.carnizaLandingAction;

      if (action) {
        return runAction(action);
      }

      if (event.target.closest("[data-carniza-landing-close]")) {
        return closePanel();
      }

      if (root?.classList.contains("is-open") && !event.target.closest(".carniza-landing-root")) {
        closePanel();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });

    let ticking = false;

    function requestContextUpdate() {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        updateContext(false);
      });
    }

    window.addEventListener("scroll", requestContextUpdate, { passive: true });
    window.addEventListener("resize", requestContextUpdate);
    window.addEventListener("hashchange", () => updateContext(true));
  }

  function initCarnizaLanding() {
    if (document.querySelector(".carniza-landing-root")) return;

    render();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCarnizaLanding);
  } else {
    initCarnizaLanding();
  }

  window.initCarnizaLanding = initCarnizaLanding;
})();