(() => {
  const SUPPORT_PHONE = "5493462662053";

  function escapeHtml(value = "") {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultWhatsApp(message = "Hola, quiero resolver el estado de mi cuenta de Carnis con La Nelly.") {
    return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
  }

  function getTone(level = "active", commercialKey = "active") {
    if (level === "blocked" || commercialKey === "payment_suspended" || commercialKey === "access_suspended") {
      return { icon: "🔴", label: "Acceso pausado", className: "status-chip--danger" };
    }
    if (level === "warning" || commercialKey === "payment_overdue" || commercialKey === "trial_expired") {
      return { icon: "🔴", label: commercialKey === "trial_expired" ? "Prueba vencida" : "Pago pendiente", className: "status-chip--warn" };
    }
    if (level === "grace" || commercialKey === "payment_grace") {
      return { icon: "🟠", label: "Pago en gracia", className: "status-chip--warn" };
    }
    if (level === "trial" || String(commercialKey || "").startsWith("trial")) {
      return { icon: "🟡", label: "Prueba activa", className: "status-chip--trial" };
    }
    return { icon: "🟢", label: "Al día", className: "status-chip--ok" };
  }

  function ensureSmartAlert() {
    let alert = document.getElementById("statusSmartAlert");
    if (alert) return alert;

    if (!document.body) return null;
    alert = document.createElement("div");
    alert.id = "statusSmartAlert";
    alert.className = "status-smart-alert hidden";
    document.body.appendChild(alert);
    return alert;
  }

  function renderModal(access = {}) {
    const old = document.getElementById("statusCompactModal");
    old?.remove();

    const tone = getTone(access.level, access.commercialKey);
    const ctaUrl = access.ctaUrl || defaultWhatsApp();
    const ctaLabel = access.ctaLabel || "Consultar por WhatsApp";
    const message = access.message || "Tu cuenta está lista para vender.";
    const title = access.title || tone.label;
    const showCta = access.level === "warning" || access.level === "blocked" || Boolean(access.ctaUrl);

    const overlay = document.createElement("div");
    overlay.id = "statusCompactModal";
    overlay.className = "status-modal-overlay";
    overlay.innerHTML = `
      <div class="status-modal-card" role="dialog" aria-modal="true" aria-label="Estado de la cuenta">
        <button type="button" class="status-modal-close" aria-label="Cerrar">×</button>
        <div class="status-modal-head">
          <img src="assets/characters/la-nelly/la-nelly-avatar.webp" alt="La Nelly" loading="lazy" class="status-modal-avatar" />
          <div>
            <div class="status-modal-kicker">La Nelly te cuida</div>
            <h3>${escapeHtml(tone.icon)} ${escapeHtml(title)}</h3>
          </div>
        </div>
        <p>${escapeHtml(message)}</p>
        ${showCta ? `<a class="status-modal-cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg>${escapeHtml(ctaLabel)}</a>` : ""}
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".status-modal-close")?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        close();
      }
    });
  }

  function renderStatus(access = {}) {
    const chip = document.getElementById("status-chip");
    const isNellyMode = access.level === "warning" || access.level === "blocked";
    document.body.classList.toggle("apppromos-nelly-mode", Boolean(isNellyMode));
    if (!chip) return;

    const tone = getTone(access.level, access.commercialKey);
    chip.textContent = `${tone.icon} ${tone.label}`;
    chip.className = `status-chip ${tone.className}`;
    chip.onclick = () => renderModal(access);

    const alert = ensureSmartAlert();
    if (!alert) return;

    if (access.level === "warning" || access.level === "blocked") {
      const ctaUrl = access.ctaUrl || defaultWhatsApp("Hola, quiero regularizar mi cuenta de Carnis.");
      alert.classList.remove("hidden");
      alert.innerHTML = `
        <button type="button" class="status-nelly-chip-copy" aria-label="Ver mensaje de La Nelly">
          <img class="status-nelly-chip-avatar" src="assets/characters/la-nelly/la-nelly-avatar.webp" alt="La Nelly" loading="lazy" />
          <span class="status-nelly-chip-text">La Nelly te cuida — lo resolvemos por WhatsApp.</span>
        </button>
        <a class="status-nelly-chip-cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg>Resolver</a>
      `;
      alert.querySelector(".status-nelly-chip-copy")?.addEventListener("click", () => renderModal(access));
    } else {
      alert.classList.add("hidden");
      alert.innerHTML = "";
    }
  }

  window.addEventListener("apppromos:access-state", (event) => {
    renderStatus(event.detail?.access || {});
  });

  window.AppPromosStatusCompact = { renderStatus };
})();
