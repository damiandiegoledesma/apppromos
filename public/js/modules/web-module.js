import { loadActiveBusinessData } from "../services/data-service.js";
import { trackBusinessCommercialEvent } from "../services/admin-service.js";
import { loadWebConfig, saveWebConfig, getPublicWebUrl, buildBusinessSlug } from "../services/web-premium-service.js";
import { STOREFRONT_THEMES, getStorefrontTheme, normalizeStorefrontTheme, renderThemeSchematicHtml } from "../services/storefront-theme-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getComboTotal(combo = {}) {
  return Number(combo.total || combo.finalTotal || combo?.snapshot?.totals?.total_redondeado || combo?.snapshot?.totals?.total || 0);
}

function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function getRealPricedProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter((product = {}) => {
    const price = Number(product.precio ?? product.price ?? 0);
    return product.active !== false && product.activo !== false && Number.isFinite(price) && price > 0;
  });
}

function getBusinessPublicFields(meta = {}, config = {}, businessId = "") {
  let slug = config?.slug || "";
  if (!slug) {
    try { slug = buildBusinessSlug(meta || {}, businessId); } catch (_) {}
  }
  const publicUrl = slug ? getPublicWebUrl(businessId, slug) : "";
  return {
    name: meta?.name || meta?.nombre || "Tu carnicería",
    address: meta?.direccion || meta?.address || "",
    phone: meta?.telefono || meta?.phone || meta?.whatsapp || "",
    city: meta?.localidad || meta?.ciudad || meta?.city || meta?.locality || "",
    publicUrl
  };
}

function buildStorefrontThemePreviewUrl(publicUrl = "", themeId = "standard", previewView = "products") {
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

export async function renderWebPremium(container, businessId, options = {}) {
  if (!container) return;
  container.innerHTML = `<div style="padding:18px;color:#6b7280;">Cargando tu carnicería online...</div>`;

  try {
    const data = await loadActiveBusinessData(businessId);
    const { meta, config, webPremiumEnabled } = await loadWebConfig(businessId, data);
    const products = Array.isArray(data.products) ? data.products : [];
    const pricedProducts = getRealPricedProducts(products);
    const savedCombos = Array.isArray(data.state?.savedCombos) ? data.state.savedCombos : [];
    const selectedOffers = Array.isArray(config.selectedOffers) ? config.selectedOffers : [];
    const fields = getBusinessPublicFields(meta || {}, config || {}, businessId);
    const storefrontTheme = normalizeStorefrontTheme(config?.storefrontTheme || "standard");
    const configuredNovilloName = String(config?.publicRubroNames?.Novillo || "Novillo").trim() || "Novillo";
    const novilloPreset = ["Novillo", "Ternera", "Vaca"].includes(configuredNovilloName) ? configuredNovilloName : "Personalizado";

    if (!webPremiumEnabled) {
      container.innerHTML = `
        <style>.wp-card{border:1px solid #eadbd4;border-radius:20px;background:#fff;padding:22px}.wp-muted{color:#6b7280}</style>
        <div class="wp-card" style="background:linear-gradient(180deg,#fff,#fff7f4);">
          <h2 style="margin:0 0 8px;color:#B3161A;"><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#globe"></use></svg>Mi carnicería online</h2>
          <p class="wp-muted" style="margin:0;">Esta carnicería todavía no tiene habilitada su vidriera online.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <style>
        .wp-shell{display:flex;flex-direction:column;gap:14px}.wp-card{border:1px solid #ece7df;border-radius:22px;background:#fff;padding:18px;box-shadow:0 4px 14px rgba(17,24,39,.04)}.wp-head{background:linear-gradient(180deg,#f0fdf4,#fff)}.wp-head h2{margin:0 0 6px;color:#14532d;font-size:28px}.wp-muted{color:#6b7280;font-weight:750;line-height:1.4}.wp-ready{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 14px;border-radius:16px;background:#dcfce7;border:1px solid #bbf7d0;color:#166534}.wp-ready strong{font-size:1.05rem}.wp-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wp-btn{min-height:48px;border-radius:14px;padding:0 14px;font-weight:950;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#111827}.wp-btn.primary{background:#16a34a;border-color:#16a34a;color:#fff}.wp-btn.orange{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.wp-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-data-item{padding:12px;border:1px solid #f1ece7;border-radius:14px;background:#fffaf7}.wp-data-item span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9a6a59;font-weight:950;margin-bottom:4px}.wp-data-item strong{display:block;color:#2b2724;overflow-wrap:anywhere}.wp-rubro-form{display:grid;grid-template-columns:minmax(180px,240px) minmax(180px,1fr) auto;gap:10px;align-items:end}.wp-rubro-field{display:grid;gap:6px;color:#7c2d12;font-size:.78rem;font-weight:950}.wp-rubro-field select,.wp-rubro-field input{width:100%;min-height:46px;padding:0 12px;border:1px solid #d8c7bd;border-radius:13px;background:#fff;color:#2b2724;font:inherit;font-size:16px}.wp-offers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-offer{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #eee;border-radius:14px;padding:11px;background:#fffaf7}.wp-offer label{display:flex;gap:8px;align-items:center;font-weight:900;color:#7c2d12}.wp-offer small{display:block;margin-top:3px;color:#6b7280;font-weight:750}.wp-price{font-weight:950;color:#E52223;white-space:nowrap}.wp-auto-note{padding:13px 14px;border-radius:16px;background:#FFF1F0;border:1px solid #F6C6C6;color:#8E1014;font-weight:850;line-height:1.4}.wp-status{min-height:20px;color:#166534;font-weight:900;margin-top:8px}.wp-theme-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.wp-theme-choice{display:grid;gap:7px;min-height:150px;padding:10px;border:2px solid #eaded7;border-radius:16px;background:#fff;text-align:left;cursor:pointer;font:inherit}.wp-theme-choice:hover,.wp-theme-choice.is-active{border-color:#c2410c;box-shadow:0 8px 18px rgba(124,45,18,.10)}.wp-theme-swatch{height:58px;border-radius:10px;display:block;overflow:hidden;background:#fbf7f4;border:1px solid #f1ece7}.wp-theme-swatch i{flex:1}.wp-theme-choice strong{font-size:12px;color:#2b2724;line-height:1.15}.wp-theme-choice small{font-size:10px;color:#8a5c51;font-weight:850;line-height:1.15}.wp-theme-modal{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(31,24,20,.64)}.wp-theme-modal-card{width:min(980px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:18px;border-radius:24px;background:#fffaf5;box-shadow:0 28px 70px rgba(0,0,0,.35)}.wp-theme-modal-head{display:flex;align-items:start;justify-content:space-between;gap:12px}.wp-theme-modal-head h3{margin:0;color:#4a1811;font-size:24px}.wp-theme-modal-close{border:0;background:transparent;color:#7c2d12;font-size:28px;line-height:1;cursor:pointer}.wp-theme-preview{position:relative;max-width:540px;margin:14px auto 0;overflow:hidden;border:8px solid #2c211d;border-radius:24px;background:#fff;box-shadow:0 14px 28px rgba(74,24,17,.18)}.wp-theme-preview iframe{display:block;width:100%;height:min(54vh,500px);border:0;pointer-events:none}.wp-theme-preview-badge{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1;padding:5px 9px;border-radius:999px;background:rgba(74,24,17,.9);color:#fff;font-size:11px;font-weight:900;white-space:nowrap}.wp-theme-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap}@media(max-width:760px){.wp-actions,.wp-data,.wp-offers,.wp-rubro-form{grid-template-columns:1fr}.wp-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wp-head h2{font-size:24px}.wp-btn{width:100%}.wp-theme-modal-card{padding:14px}.wp-theme-preview iframe{height:48vh}.wp-theme-modal-head h3{font-size:21px}}
      </style>
      <div class="wp-shell">
        ${renderCarnizaSpotlight("webPanel", { compact: true })}

        <div class="wp-card wp-head">
          <h2><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#globe"></use></svg>Mi carnicería online</h2>
          <p class="wp-muted wp-muted--m0">Tu vidriera se mantiene actualizada con tus precios reales. No hace falta configurar ni guardar la web por separado.</p>
          <div class="wp-ready wp-ready--mt14">
            <strong>${config.enabled !== false ? "✅ Vidriera activa" : "⏸️ Vidriera pausada"}</strong>
            <span>${pricedProducts.length} producto${pricedProducts.length === 1 ? "" : "s"} con precio publicado</span>
          </div>
        </div>

        <div class="wp-card">
          <div class="wp-actions">
            <button id="wpOpen" class="wp-btn primary" ${fields.publicUrl ? "" : "disabled"}><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#globe"></use></svg>Ver mi carnicería</button>
            <button id="wpShare" class="wp-btn" ${fields.publicUrl ? "" : "disabled"}><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#share"></use></svg>Compartir</button>
            <button type="button" class="wp-btn orange" data-action-panel="pricesPanel"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#price"></use></svg>Actualizar precios</button>
            <button type="button" class="wp-btn" data-action-panel="savedPanel"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#sell"></use></svg>Gestionar ofertas</button>
            <button type="button" class="wp-btn" data-wp-business-data><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#settings"></use></svg>Datos de mi carnicería</button>
          </div>
          <div class="wp-status" id="wpStatus"></div>
        </div>

        <div class="wp-card">
          <h3 class="wp-h3-mb6"><svg class="ci ci-md ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#edit"></use></svg>Diseño de tu vidriera</h3>
          <p class="wp-muted wp-muted--mb12">Elegí el estilo que mejor representa a tu negocio. Tus productos, promos, carrito y enlace no cambian.</p>
          <div class="wp-theme-grid">
            ${STOREFRONT_THEMES.map((theme) => `<button type="button" class="wp-theme-choice ${theme.id === storefrontTheme ? "is-active" : ""}" data-wp-theme="${theme.id}" aria-pressed="${theme.id === storefrontTheme}"><span class="wp-theme-swatch">${renderThemeSchematicHtml(theme.id)}</span><strong>${escapeHtml(theme.label)}</strong><small>${escapeHtml(theme.caption)} · ${escapeHtml(theme.description)}</small></button>`).join("")}
          </div>
          <div class="wp-status" id="wpThemeStatus">Estilo actual: ${escapeHtml(getStorefrontTheme(storefrontTheme).label)}</div>
        </div>

        <div class="wp-card">
          <h3 class="wp-h3-mb12">Datos de tu carnicería online</h3>
          <div class="wp-data">
            <div class="wp-data-item"><span>Nombre</span><strong>${escapeHtml(fields.name)}</strong></div>
            <div class="wp-data-item"><span>WhatsApp</span><strong>${escapeHtml(fields.phone || "Sin cargar")}</strong></div>
            <div class="wp-data-item"><span>Dirección</span><strong>${escapeHtml(fields.address || "Podés completarla después")}</strong></div>
            <div class="wp-data-item"><span>Localidad</span><strong>${escapeHtml(fields.city || "Sin cargar")}</strong></div>
            <div class="wp-data-item wp-data-item--full"><span>Link público</span><strong>${escapeHtml(fields.publicUrl || "Se genera automáticamente")}</strong></div>
          </div>
        </div>

        <div class="wp-card">
          <h3 class="wp-h3-mb6">Nombre público del rubro</h3>
          <p class="wp-muted wp-muted--mb12">¿Cómo querés mostrar el rubro Novillo en tu web?</p>
          <div class="wp-rubro-form">
            <label class="wp-rubro-field">Nombre para mostrar
              <select id="wpNovilloName">
                ${["Novillo", "Ternera", "Vaca", "Personalizado"].map(option => `<option value="${option}" ${novilloPreset === option ? "selected" : ""}>${option}</option>`).join("")}
              </select>
            </label>
            <label class="wp-rubro-field" id="wpNovilloCustomWrap" ${novilloPreset === "Personalizado" ? "" : "hidden"}>Nombre personalizado
              <input id="wpNovilloCustom" type="text" maxlength="24" value="${novilloPreset === "Personalizado" ? escapeHtml(configuredNovilloName) : ""}" placeholder="Ej: Carne vacuna" autocomplete="off">
            </label>
            <button type="button" class="wp-btn primary" id="wpSaveNovilloName">Guardar nombre</button>
          </div>
          <div class="wp-status" id="wpRubroStatus"></div>
        </div>

        <div class="wp-card">
          <h3 class="wp-h3-mb6"><svg class="ci ci-md ci--red" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#sell"></use></svg>Ofertas publicadas</h3>
          <p class="wp-muted wp-muted--mb12">Marcá o desmarcá una oferta. Carnis actualiza la vidriera automáticamente.</p>
          ${savedCombos.length ? `<div class="wp-offers">
            ${savedCombos.map(combo => `
              <div class="wp-offer">
                <label>
                  <input type="checkbox" data-wp-offer="${escapeHtml(combo.id)}" ${selectedOffers.includes(combo.id) ? "checked" : ""}>
                  <span>${escapeHtml(combo.name || "Oferta")}<small>${selectedOffers.includes(combo.id) ? "Publicada" : "No publicada"}</small></span>
                </label>
                <span class="wp-price">${money(getComboTotal(combo))}</span>
              </div>`).join("")}
          </div>` : `<div class="wp-muted">Todavía no hay promos o combos guardados. Podés crearlos desde “Vender / Crear promo”.</div>`}
        </div>

        <div class="wp-auto-note"><svg class="ci ci-sm ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#info"></use></svg><strong>Automático:</strong> cuando guardás precios, los productos activos con precio mayor a $0 aparecen en tu carnicería online. Los que quedan en $0 no se publican.</div>
      </div>`;

    const status = container.querySelector("#wpStatus");
    const novilloSelect = container.querySelector("#wpNovilloName");
    const novilloCustomWrap = container.querySelector("#wpNovilloCustomWrap");
    const novilloCustom = container.querySelector("#wpNovilloCustom");
    const rubroStatus = container.querySelector("#wpRubroStatus");
    const themeStatus = container.querySelector("#wpThemeStatus");

    novilloSelect?.addEventListener("change", () => {
      const isCustom = novilloSelect.value === "Personalizado";
      if (novilloCustomWrap) novilloCustomWrap.hidden = !isCustom;
      if (isCustom) novilloCustom?.focus();
    });

    container.querySelector("#wpSaveNovilloName")?.addEventListener("click", async () => {
      const selected = novilloSelect?.value || "Novillo";
      const custom = String(novilloCustom?.value || "").trim().replace(/\s+/g, " ").slice(0, 24);
      const publicName = selected === "Personalizado" ? (custom || "Novillo") : selected;
      if (rubroStatus) rubroStatus.textContent = "Actualizando vidriera...";
      try {
        await saveWebConfig(businessId, {
          publicRubroNames: { ...(config?.publicRubroNames || {}), Novillo: publicName },
          updatedFrom: "mi_carniceria_online_rubro"
        });
        if (rubroStatus) rubroStatus.textContent = `✅ En tu web se mostrará “${publicName}”`;
      } catch (error) {
        console.error(error);
        if (rubroStatus) rubroStatus.textContent = "No se pudo guardar. Probá de nuevo.";
      }
    });

    const openThemePreview = (initialTheme) => {
      const existing = document.querySelector("[data-wp-theme-preview-modal]");
      existing?.remove();

      let previewTheme = normalizeStorefrontTheme(initialTheme);
      const modal = document.createElement("div");
      modal.className = "wp-theme-modal";
      modal.dataset.wpThemePreviewModal = "true";
      modal.innerHTML = `
        <div class="wp-theme-modal-card" role="dialog" aria-modal="true" aria-label="Vista previa del diseño de tu vidriera">
          <div class="wp-theme-modal-head">
            <div><h3>Así se verá tu propia vidriera</h3><p class="wp-muted wp-muted--mt5">Compará los estilos. No cambia nada hasta que elijas “Aplicar este estilo”.</p></div>
            <button type="button" class="wp-theme-modal-close" data-wp-preview-cancel aria-label="Cerrar vista previa">×</button>
          </div>
          <div class="wp-theme-grid wp-theme-grid--preview" data-wp-preview-choices></div>
          <div class="wp-preview-tabs" data-wp-preview-tabs><button type="button" class="wp-btn wp-btn--tab" data-wp-preview-view="products">Ver productos</button><button type="button" class="wp-btn wp-btn--tab" data-wp-preview-view="promos">Ver promos</button><button type="button" class="wp-btn wp-btn--tab" data-wp-preview-view="home">Ver inicio</button></div>
          <p class="wp-status wp-status--mb0" data-wp-preview-status></p>
          <div class="wp-theme-preview"><span class="wp-theme-preview-badge">Vista previa · no se guarda todavía</span><iframe data-wp-preview-frame title="Vista previa de tu vidriera" sandbox="allow-scripts allow-same-origin"></iframe></div>
          <div class="wp-theme-modal-actions"><button type="button" class="wp-btn" data-wp-preview-cancel>Cancelar</button><button type="button" class="wp-btn primary" data-wp-preview-apply>Aplicar este estilo</button></div>
        </div>`;
      document.body.append(modal);

      const frame = modal.querySelector("[data-wp-preview-frame]");
      const previewStatus = modal.querySelector("[data-wp-preview-status]");
      const previewChoices = modal.querySelector("[data-wp-preview-choices]");
      const applyPreview = modal.querySelector("[data-wp-preview-apply]");
      let previewView = "products";
      if (previewChoices) {
        previewChoices.innerHTML = STOREFRONT_THEMES.map((theme) => `<button type="button" class="wp-theme-choice" data-wp-preview-theme="${theme.id}"><span class="wp-theme-swatch">${renderThemeSchematicHtml(theme.id)}</span><strong>${escapeHtml(theme.label)}</strong><small>${escapeHtml(theme.caption)} · ${escapeHtml(theme.description)}</small></button>`).join("");
      }

      const enforcePreviewTheme = () => {
        try {
          const previewDocument = frame?.contentDocument;
          if (previewDocument?.documentElement) previewDocument.documentElement.dataset.storefrontTheme = previewTheme;
        } catch (_) {}
      };
      const showPreview = (themeId, nextView = previewView) => {
        previewTheme = normalizeStorefrontTheme(themeId);
        previewView = ["home", "products", "promos"].includes(nextView) ? nextView : "products";
        const theme = getStorefrontTheme(previewTheme);
        const previewUrl = buildStorefrontThemePreviewUrl(fields.publicUrl, previewTheme, previewView);
        if (frame) frame.src = previewUrl || "about:blank";
        previewChoices?.querySelectorAll("[data-wp-preview-theme]").forEach((choice) => {
          const active = choice.getAttribute("data-wp-preview-theme") === previewTheme;
          choice.classList.toggle("is-active", active);
          choice.setAttribute("aria-pressed", String(active));
        });
        modal.querySelectorAll("[data-wp-preview-view]").forEach((button) => {
          const active = button.getAttribute("data-wp-preview-view") === previewView;
          button.classList.toggle("primary", active);
          button.setAttribute("aria-pressed", String(active));
        });
        if (previewStatus) previewStatus.textContent = previewUrl
          ? `Vista previa: ${theme.label}`
          : "No pudimos abrir la vista previa. Probá recargar la página.";
        if (applyPreview) applyPreview.disabled = !previewUrl;
      };

      frame?.addEventListener("load", enforcePreviewTheme);

      previewChoices?.querySelectorAll("[data-wp-preview-theme]").forEach((choice) => {
        choice.addEventListener("click", () => {
          const themeId = normalizeStorefrontTheme(choice.getAttribute("data-wp-preview-theme"));
          showPreview(themeId);
          void trackBusinessCommercialEvent(businessId, "storefront_theme_previewed", { theme: themeId, source: "web_panel" });
        });
      });
      modal.querySelectorAll("[data-wp-preview-view]").forEach((button) => {
        button.addEventListener("click", () => showPreview(previewTheme, button.getAttribute("data-wp-preview-view")));
      });
      modal.querySelectorAll("[data-wp-preview-cancel]").forEach((button) => button.addEventListener("click", () => modal.remove()));
      modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove(); });
      applyPreview?.addEventListener("click", async () => {
        const theme = getStorefrontTheme(previewTheme);
        if (previewStatus) previewStatus.textContent = "Guardando estilo...";
        if (applyPreview) applyPreview.disabled = true;
        try {
          await saveWebConfig(businessId, {
            storefrontTheme: previewTheme,
            storefrontThemeSelectedAt: new Date().toISOString(),
            storefrontThemePromptSeenAt: config?.storefrontThemePromptSeenAt || new Date().toISOString(),
            updatedFrom: "mi_carniceria_online_theme"
          });
          void trackBusinessCommercialEvent(businessId, "storefront_theme_selected", { theme: previewTheme, source: "web_panel" });
          container.querySelectorAll("[data-wp-theme]").forEach((choice) => {
            const active = choice.getAttribute("data-wp-theme") === previewTheme;
            choice.classList.toggle("is-active", active);
            choice.setAttribute("aria-pressed", String(active));
          });
          if (themeStatus) themeStatus.textContent = `✅ Estilo aplicado: ${theme.label}`;
          modal.remove();
        } catch (error) {
          console.error(error);
          if (previewStatus) previewStatus.textContent = "No se pudo aplicar. Probá de nuevo.";
          if (applyPreview) applyPreview.disabled = false;
        }
      });
      showPreview(previewTheme);
    };

    container.querySelectorAll("[data-wp-theme]").forEach((button) => {
      button.addEventListener("click", () => openThemePreview(button.getAttribute("data-wp-theme")));
    });

    container.querySelector("#wpOpen")?.addEventListener("click", () => {
      if (!fields.publicUrl) return;
      void trackBusinessCommercialEvent(businessId, "web_open");
      window.open(fields.publicUrl, "_blank", "noopener,noreferrer");
    });

    container.querySelector("#wpShare")?.addEventListener("click", () => {
      if (!fields.publicUrl) return;
      document.dispatchEvent(new CustomEvent("apppromos:seller-web-share", {
        detail: { source: "web_panel" }
      }));
      const text = `¡Hola! 👋 Mirá nuestra carnicería online. Podés ver precios y ofertas, armar tu pedido y mandárnoslo por WhatsApp: ${fields.publicUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    });

    container.querySelector("[data-wp-business-data]")?.addEventListener("click", () => {
      if (typeof options?.onEditBusinessData === "function") {
        options.onEditBusinessData();
      }
    });

    container.querySelectorAll("[data-wp-offer]").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const offerIds = [...container.querySelectorAll("[data-wp-offer]:checked")].map((el) => el.getAttribute("data-wp-offer"));
        if (status) status.textContent = "Actualizando vidriera...";
        try {
          await saveWebConfig(businessId, {
            enabled: true,
            published: true,
            active: true,
            showPriceList: true,
            visibleRubros: [],
            selectedOffers: offerIds,
            updatedFrom: "mi_carniceria_online"
          });
          if (status) status.textContent = "✅ Vidriera actualizada";
          const small = checkbox.closest(".wp-offer")?.querySelector("small");
          if (small) small.textContent = checkbox.checked ? "Publicada" : "No publicada";
        } catch (error) {
          console.error(error);
          checkbox.checked = !checkbox.checked;
          if (status) status.textContent = "No se pudo actualizar. Probá de nuevo.";
        }
      });
    });
  } catch (error) {
    console.error("Error renderWebPremium", error);
    container.innerHTML = `<div style="padding:18px;color:#ef233c;">No pudimos cargar tu carnicería online: ${escapeHtml(error?.message || "desconocido")}</div>`;
  }
}
