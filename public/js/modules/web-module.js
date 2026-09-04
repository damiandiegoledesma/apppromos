import { loadActiveBusinessData } from "../services/data-service.js";
import { loadWebConfig, saveWebConfig, getPublicWebUrl, buildBusinessSlug } from "../services/web-premium-service.js";

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
    const configuredNovilloName = String(config?.publicRubroNames?.Novillo || "Novillo").trim() || "Novillo";
    const novilloPreset = ["Novillo", "Ternera", "Vaca"].includes(configuredNovilloName) ? configuredNovilloName : "Personalizado";

    if (!webPremiumEnabled) {
      container.innerHTML = `
        <style>.wp-card{border:1px solid #eadbd4;border-radius:20px;background:#fff;padding:22px}.wp-muted{color:#6b7280}</style>
        <div class="wp-card" style="background:linear-gradient(180deg,#fff,#fff7f4);">
          <h2 style="margin:0 0 8px;color:#8b1f1f;">🌐 Mi carnicería online</h2>
          <p class="wp-muted" style="margin:0;">Esta carnicería todavía no tiene habilitada su vidriera online.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <style>
        .wp-shell{display:flex;flex-direction:column;gap:14px}.wp-card{border:1px solid #ece7df;border-radius:22px;background:#fff;padding:18px;box-shadow:0 4px 14px rgba(17,24,39,.04)}.wp-head{background:linear-gradient(180deg,#f0fdf4,#fff)}.wp-head h2{margin:0 0 6px;color:#14532d;font-size:28px}.wp-muted{color:#6b7280;font-weight:750;line-height:1.4}.wp-ready{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 14px;border-radius:16px;background:#dcfce7;border:1px solid #bbf7d0;color:#166534}.wp-ready strong{font-size:1.05rem}.wp-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wp-btn{min-height:48px;border-radius:14px;padding:0 14px;font-weight:950;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#111827}.wp-btn.primary{background:#16a34a;border-color:#16a34a;color:#fff}.wp-btn.orange{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.wp-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-data-item{padding:12px;border:1px solid #f1ece7;border-radius:14px;background:#fffaf7}.wp-data-item span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9a6a59;font-weight:950;margin-bottom:4px}.wp-data-item strong{display:block;color:#2b2724;overflow-wrap:anywhere}.wp-rubro-form{display:grid;grid-template-columns:minmax(180px,240px) minmax(180px,1fr) auto;gap:10px;align-items:end}.wp-rubro-field{display:grid;gap:6px;color:#7c2d12;font-size:.78rem;font-weight:950}.wp-rubro-field select,.wp-rubro-field input{width:100%;min-height:46px;padding:0 12px;border:1px solid #d8c7bd;border-radius:13px;background:#fff;color:#2b2724;font:inherit;font-size:16px}.wp-offers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-offer{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #eee;border-radius:14px;padding:11px;background:#fffaf7}.wp-offer label{display:flex;gap:8px;align-items:center;font-weight:900;color:#7c2d12}.wp-offer small{display:block;margin-top:3px;color:#6b7280;font-weight:750}.wp-price{font-weight:950;color:#b63b2b;white-space:nowrap}.wp-auto-note{padding:13px 14px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-weight:850;line-height:1.4}.wp-status{min-height:20px;color:#166534;font-weight:900;margin-top:8px}@media(max-width:760px){.wp-actions,.wp-data,.wp-offers,.wp-rubro-form{grid-template-columns:1fr}.wp-head h2{font-size:24px}.wp-btn{width:100%}}
      </style>
      <div class="wp-shell">
        <div class="wp-card wp-head">
          <h2>🌐 Mi carnicería online</h2>
          <p class="wp-muted" style="margin:0;">Tu vidriera se mantiene actualizada con tus precios reales. No hace falta configurar ni guardar la web por separado.</p>
          <div class="wp-ready" style="margin-top:14px;">
            <strong>${config.enabled !== false ? "✅ Vidriera activa" : "⏸️ Vidriera pausada"}</strong>
            <span>${pricedProducts.length} producto${pricedProducts.length === 1 ? "" : "s"} con precio publicado</span>
          </div>
        </div>

        <div class="wp-card">
          <div class="wp-actions">
            <button id="wpOpen" class="wp-btn primary" ${fields.publicUrl ? "" : "disabled"}>🌐 Ver mi carnicería</button>
            <button id="wpShare" class="wp-btn" ${fields.publicUrl ? "" : "disabled"}>📲 Compartir</button>
            <button type="button" class="wp-btn orange" data-action-panel="pricesPanel">💲 Actualizar precios</button>
            <button type="button" class="wp-btn" data-action-panel="savedPanel">🔥 Gestionar ofertas</button>
            <button type="button" class="wp-btn" data-wp-business-data>⚙️ Datos de mi carnicería</button>
          </div>
          <div class="wp-status" id="wpStatus"></div>
        </div>

        <div class="wp-card">
          <h3 style="margin:0 0 12px;color:#7c2d12;">Datos de tu carnicería online</h3>
          <div class="wp-data">
            <div class="wp-data-item"><span>Nombre</span><strong>${escapeHtml(fields.name)}</strong></div>
            <div class="wp-data-item"><span>WhatsApp</span><strong>${escapeHtml(fields.phone || "Sin cargar")}</strong></div>
            <div class="wp-data-item"><span>Dirección</span><strong>${escapeHtml(fields.address || "Podés completarla después")}</strong></div>
            <div class="wp-data-item"><span>Localidad</span><strong>${escapeHtml(fields.city || "Sin cargar")}</strong></div>
            <div class="wp-data-item" style="grid-column:1/-1;"><span>Link público</span><strong>${escapeHtml(fields.publicUrl || "Se genera automáticamente")}</strong></div>
          </div>
        </div>

        <div class="wp-card">
          <h3 style="margin:0 0 6px;color:#7c2d12;">Nombre público del rubro</h3>
          <p class="wp-muted" style="margin:0 0 12px;">¿Cómo querés mostrar el rubro Novillo en tu web?</p>
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
          <h3 style="margin:0 0 6px;color:#7c2d12;">🔥 Ofertas publicadas</h3>
          <p class="wp-muted" style="margin:0 0 12px;">Marcá o desmarcá una oferta. AppPromos actualiza la vidriera automáticamente.</p>
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

        <div class="wp-auto-note">💡 <strong>Automático:</strong> cuando guardás precios, los productos activos con precio mayor a $0 aparecen en tu carnicería online. Los que quedan en $0 no se publican.</div>
      </div>`;

    const status = container.querySelector("#wpStatus");
    const novilloSelect = container.querySelector("#wpNovilloName");
    const novilloCustomWrap = container.querySelector("#wpNovilloCustomWrap");
    const novilloCustom = container.querySelector("#wpNovilloCustom");
    const rubroStatus = container.querySelector("#wpRubroStatus");

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

    container.querySelector("#wpOpen")?.addEventListener("click", () => {
      if (!fields.publicUrl) return;
      window.open(fields.publicUrl, "_blank", "noopener,noreferrer");
    });

    container.querySelector("#wpShare")?.addEventListener("click", () => {
      if (!fields.publicUrl) return;
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
    container.innerHTML = `<div style="padding:18px;color:#b42318;">No pudimos cargar tu carnicería online: ${escapeHtml(error?.message || "desconocido")}</div>`;
  }
}
