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

  function defaultWhatsApp(message = "Hola AppPromos, quiero resolver el estado de mi cuenta con La Nelly.") {
    return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
  }

  function ensureStatusCompactStyle() {
    if (document.getElementById("statusCompactFloatingStyle")) return;
    const style = document.createElement("style");
    style.id = "statusCompactFloatingStyle";
    style.textContent = `
      body.apppromos-nelly-mode #carnizaFloatingLiquidatorShell,
      body.apppromos-nelly-mode .carniza-root,
      body.apppromos-nelly-mode .dash-carniza-card {
        display: none !important;
      }
      #statusSmartAlert.status-smart-alert {
        position: fixed !important;
        left: 16px !important;
        bottom: 16px !important;
        right: auto !important;
        top: auto !important;
        z-index: 9997 !important;
        width: min(500px, calc(100vw - 32px)) !important;
        max-width: calc(100vw - 32px) !important;
        box-sizing: border-box !important;
        border: 1px solid #fed7aa !important;
        border-radius: 999px !important;
        padding: 10px 12px !important;
        background: linear-gradient(135deg, #fff7ed, #ffffff) !important;
        box-shadow: 0 18px 42px rgba(124, 45, 18, .16) !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        color: #7c2d12 !important;
        font-weight: 900 !important;
      }
      #statusSmartAlert.hidden { display: none !important; }
      #statusSmartAlert .status-nelly-chip-copy {
        min-width: 0;
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 0;
        padding: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      #statusSmartAlert .status-nelly-chip-avatar {
        width: 46px;
        height: 46px;
        min-width: 46px;
        border-radius: 999px;
        object-fit: cover;
        border: 2px solid rgba(239,68,68,.24);
        background: #fff;
        display: block;
      }
      #statusSmartAlert .status-nelly-chip-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        line-height: 1.15;
      }
      #statusSmartAlert .status-nelly-chip-cta {
        flex: 0 0 auto;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #22c55e;
        color: #052e16 !important;
        text-decoration: none !important;
        font-size: 14px;
        font-weight: 1000;
      }

      /* V12.0.NNN.7.1 — Pulido visual seguro: solo CSS, sin tocar lógica de ofertas ni WhatsApp. */
      #carnizaFloatingLiquidatorFab {
        min-width: 142px !important;
        height: 74px !important;
        padding: 0 20px 0 11px !important;
        gap: 11px !important;
        font-size: 16px !important;
      }
      #carnizaFloatingLiquidatorFab .fab-avatar {
        width: 54px !important;
        height: 54px !important;
        max-width: 54px !important;
        max-height: 54px !important;
      }
      .carniza-floating-avatar {
        width: 54px !important;
        height: 54px !important;
        max-width: 54px !important;
        max-height: 54px !important;
      }
      input[type="number"][max="100"],
      input[type="number"][aria-label*="desc" i],
      input[type="number"][placeholder*="desc" i] {
        background: linear-gradient(135deg, #eff6ff, #ffffff) !important;
        border: 1px solid #93c5fd !important;
        box-shadow: 0 8px 18px rgba(37, 99, 235, .10) !important;
        color: #0f172a !important;
        font-weight: 1000 !important;
        text-align: center !important;
      }
      input[type="number"][max="100"]:focus,
      input[type="number"][aria-label*="desc" i]:focus,
      input[type="number"][placeholder*="desc" i]:focus {
        outline: 3px solid rgba(37, 99, 235, .18) !important;
        border-color: #2563eb !important;
      }
      .dash-card .dash-value {
        color: #1e3a8a !important;
        font-size: 26px !important;
        line-height: 1.05 !important;
        background: #eff6ff !important;
        border: 1px solid #dbeafe !important;
        border-radius: 14px !important;
        padding: 6px 10px !important;
        display: inline-flex !important;
        min-width: 58px !important;
        justify-content: center !important;
      }
      .dash-card .dash-note {
        color: #64748b !important;
        font-size: 12px !important;
      }
      @media (max-width: 520px) {
        #carnizaFloatingLiquidatorFab {
          width: 78px !important;
          min-width: 78px !important;
          height: 78px !important;
          padding: 0 !important;
        }
        #carnizaFloatingLiquidatorFab .fab-avatar {
          width: 58px !important;
          height: 58px !important;
          max-width: 58px !important;
          max-height: 58px !important;
        }
      }
      @media (max-width: 560px) {
        #statusSmartAlert.status-smart-alert {
          left: 10px !important;
          bottom: 10px !important;
          width: calc(100vw - 20px) !important;
          border-radius: 18px !important;
        }
        #statusSmartAlert .status-nelly-chip-text {
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        #statusSmartAlert .status-nelly-chip-cta { padding: 0 12px; min-height: 42px; }
      }
    `;
    document.head.appendChild(style);
  }

  function getTone(level = "active", commercialKey = "active") {
    if (level === "blocked" || commercialKey === "payment_suspended" || commercialKey === "access_suspended") {
      return { icon: "🔴", label: "Acceso pausado", className: "status-chip--danger" };
    }
    if (level === "warning" || commercialKey === "payment_overdue" || commercialKey === "trial_expired") {
      return { icon: "🔴", label: commercialKey === "trial_expired" ? "Prueba vencida" : "Pago pendiente", className: "status-chip--warn" };
    }
    if (level === "trial" || String(commercialKey || "").startsWith("trial")) {
      return { icon: "🟡", label: "Prueba activa", className: "status-chip--trial" };
    }
    return { icon: "🟢", label: "Al día", className: "status-chip--ok" };
  }

  function ensureSmartAlert() {
    ensureStatusCompactStyle();
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
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <img src="assets/characters/la-nelly/la-nelly-avatar.webp" alt="La Nelly" loading="lazy" style="width:54px;height:54px;border-radius:999px;object-fit:cover;border:2px solid #fecaca;background:#fff;" />
          <div>
            <div class="status-modal-kicker">La Nelly te cuida</div>
            <h3>${escapeHtml(tone.icon)} ${escapeHtml(title)}</h3>
          </div>
        </div>
        <p>${escapeHtml(message)}</p>
        ${showCta ? `<a class="status-modal-cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener">📲 ${escapeHtml(ctaLabel)}</a>` : ""}
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
      const ctaUrl = access.ctaUrl || defaultWhatsApp("Hola AppPromos, quiero regularizar mi cuenta.");
      alert.classList.remove("hidden");
      alert.innerHTML = `
        <button type="button" class="status-nelly-chip-copy" aria-label="Ver mensaje de La Nelly">
          <img class="status-nelly-chip-avatar" src="assets/characters/la-nelly/la-nelly-avatar.webp" alt="La Nelly" loading="lazy" />
          <span class="status-nelly-chip-text">La Nelly te cuida — lo resolvemos por WhatsApp.</span>
        </button>
        <a class="status-nelly-chip-cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener">📲 Resolver</a>
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
