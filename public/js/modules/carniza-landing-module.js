(function () {
  "use strict";

  let root = null;
  let currentContext = "hero";

  const CONTEXTS = {
    hero: {
      label: "Proba la demo",
      badge: "Carniza · demo rapida",
      title: "Soy Carniza",
      subtitle: "Vendedor de AppPromos",
      message: "Te muestro como vender una oferta en 3 toques.",
      hint: "Entras a la Carniceria de Carniza, elegis productos y ves como sale lista para WhatsApp.",
      primary: { action: "demo", text: "Probar demo" },
      secondary: { action: "signup", text: "Crear mi carniceria gratis" },
      footer: "Primero probala. Si te sirve, la hacemos tuya."
    },
    how: {
      label: "Vende en 3 toques",
      badge: "Carniza · como funciona",
      title: "Simple como mostrador",
      subtitle: "Elegis, armas y mandas",
      message: "Elegis productos, armas la promo y la mandas por WhatsApp.",
      hint: "La app esta pensada para vender rapido desde el celular, sin planillas ni vueltas.",
      primary: { action: "demo", text: "Probar demo" },
      secondary: { action: "signup", text: "Crear mi carniceria gratis" },
      footer: "Si lo entendes solo, AppPromos esta haciendo bien su trabajo."
    },
    web: {
      label: "Primero proba la app",
      badge: "Carniza · foco comercial",
      title: "La web suma despues",
      subtitle: "Primero vende por WhatsApp",
      message: "La web suma, pero primero proba como AppPromos te ayuda a vender por WhatsApp.",
      hint: "Entra a la demo y mira el flujo real: oferta lista y salida rapida al cliente.",
      primary: { action: "demo", text: "Probar demo" },
      secondary: { action: "signup", text: "Crear mi carniceria gratis" },
      footer: "La prioridad es que vendas. Lo demas acompaña."
    },
    pricing: {
      label: "Elegi tu plan",
      badge: "Carniza · planes",
      title: "Podes empezar gratis",
      subtitle: "Salvador cuida margen",
      message: "Podes empezar gratis. Si queres cuidar margen y vender antes de picar, mira Salvador.",
      hint: "Arranque te ayuda a vender rapido. Salvador te ayuda a vender antes de perder. Dueño te da mas control.",
      primary: { action: "signup", text: "Crear mi carniceria gratis" },
      secondary: { action: "demo", text: "Probar demo" },
      footer: "Todos los planes tienen web propia. Dueño tiene web personalizada."
    },
    auth: {
      label: "Estoy aca",
      badge: "Carniza · registro",
      title: "La hacemos tuya",
      subtitle: "30 dias sin costo",
      message: "Crea tu carniceria gratis. Despues cargas tus precios y salis vendiendo.",
      hint: "Completa tus datos tranquilo. No te tapo el formulario; solo te acompaño.",
      primary: { action: "focusSignup", text: "Completar registro" },
      secondary: { action: "demo", text: "Seguir probando demo" },
      footer: "Sin tarjeta. Si no te sirve, no seguis."
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

  function openDemo() {
    closePanel();
    window.location.href = "/app.html?demo=1";
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
    if (action === "demo") return openDemo();
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
        <span class="carniza-landing-fab-label">Proba la demo</span>
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
          <div class="carniza-landing-badge">Carniza · demo rapida</div>
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