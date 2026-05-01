(function () {
  "use strict";

  const WHATSAPP_APPPROMOS = "5493462662053";
  let root = null;

  function buildWhatsAppUrl(message) {
    return `https://wa.me/${WHATSAPP_APPPROMOS}?text=${encodeURIComponent(message)}`;
  }

  function openSignup() {
    closePanel();
    if (typeof window.showSignup === "function") {
      window.showSignup();
      return;
    }
    window.location.hash = "signup";
  }

  function scrollToHowItWorks() {
    closePanel();
    const target = document.getElementById("como-funciona") || document.getElementById("que-incluye") || document.body;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function openDemo() {
    closePanel();
    window.location.href = "/app.html?demo=1";
  }

  function closePanel() {
    root?.classList.remove("is-open");
  }

  function togglePanel() {
    root?.classList.toggle("is-open");
  }

  function render() {
    root = document.createElement("aside");
    root.className = "carniza-landing-root";
    root.setAttribute("aria-label", "Carniza, vendedor de AppPromos");
    root.innerHTML = `
      <button type="button" class="carniza-landing-fab" aria-label="Abrir Carniza">
        <img class="carniza-landing-fab-icon" src="assets/characters/carniza/carniza-avatar.webp" alt="Carniza" loading="lazy" />
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
          <div class="carniza-landing-badge">Hecho para carnicerías argentinas</div>
          <p class="carniza-landing-message">¿Seguís armando ofertas a mano?</p>
          <p class="carniza-landing-hint">Con AppPromos cambiás precios, armás promos y las mandás por WhatsApp desde el celular.</p>
          <div class="carniza-landing-actions">
            <button type="button" class="carniza-landing-action primary" data-carniza-landing-action="signup">
              <span>🔥 Probar gratis 30 días</span><span aria-hidden="true">›</span>
            </button>
            <button type="button" class="carniza-landing-action" data-carniza-landing-action="how">
              <span>👀 Ver cómo funciona</span><span aria-hidden="true">›</span>
            </button>
            <button type="button" class="carniza-landing-action" data-carniza-landing-action="demo">
              <span>📲 Probar demo</span><span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
        <div class="carniza-landing-footer">Carniza te muestra rápido si AppPromos sirve para tu carnicería.</div>
      </div>
    `;

    document.body.appendChild(root);
    root.querySelector(".carniza-landing-fab")?.addEventListener("click", togglePanel);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-carniza-landing-action]")?.dataset?.carnizaLandingAction;
      if (action === "signup") return openSignup();
      if (action === "how") return scrollToHowItWorks();
      if (action === "demo") return openDemo();

      if (event.target.closest("[data-carniza-landing-close]")) return closePanel();

      if (root?.classList.contains("is-open") && !event.target.closest(".carniza-landing-root")) {
        closePanel();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });
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
