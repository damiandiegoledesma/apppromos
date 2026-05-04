import {
  normalizeProductsFromState,
  normalizeSavedCombosFromState
} from "../services/business-service.js";

import { buildBusinessSlug, getPublicWebUrl } from "../services/web-premium-service.js";

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBusinessFields(meta = {}) {
  return {
    name: meta?.name || meta?.nombre || "",
    direccion: meta?.direccion || meta?.address || "",
    telefono: meta?.telefono || meta?.phone || "",
    ciudad: meta?.ciudad || meta?.city || ""
  };
}

function renderBusinessView(meta, state, updatedAt) {
  const fields = getBusinessFields(meta);
  const businessName = fields.name || "Carnicería";
  const address = fields.direccion || "Sin dirección";
  const phone = fields.telefono || "Sin teléfono";
  const city = fields.ciudad || "Sin ciudad";
  const currentSlug = state?.web?.slug || "Sin link activo";

  return `
    <div class="dash-business-head">
      <h3>Datos del negocio activo</h3>
      <button type="button" class="dash-mini-btn" data-business-edit>✏️ Editar datos</button>
    </div>
    <div class="dash-list">
      <div class="dash-list-item"><span class="dash-muted">Carnicería</span><strong>${escapeHtml(businessName)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Dirección</span><strong>${escapeHtml(address)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Teléfono</span><strong>${escapeHtml(phone)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Ciudad</span><strong>${escapeHtml(city)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Link público</span><strong>${escapeHtml(currentSlug)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Última actualización</span><strong>${escapeHtml(updatedAt)}</strong></div>
    </div>
  `;
}

function getSlugPreview(businessId, draft = {}) {
  try {
    const slug = buildBusinessSlug(draft, businessId);
    return { slug, url: getPublicWebUrl(businessId, slug), error: "" };
  } catch (error) {
    return { slug: "", url: "Completá nombre y teléfono válido para generar el link", error: error?.message || "" };
  }
}

function renderBusinessEditForm(businessId, meta = {}, state = {}) {
  const fields = getBusinessFields(meta);
  const preview = getSlugPreview(businessId, fields);

  return `
    <div class="dash-business-head">
      <h3>Editar datos del negocio</h3>
      <span class="dash-form-hint">El link se genera solo con nombre + teléfono.</span>
    </div>
    <form class="dash-business-form" data-business-form>
      <label>
        <span>Nombre comercial *</span>
        <input name="name" required value="${escapeHtml(fields.name)}" placeholder="Carnicería Sur" />
      </label>
      <label>
        <span>Teléfono / WhatsApp *</span>
        <input name="telefono" required value="${escapeHtml(fields.telefono)}" placeholder="3462 555555" />
      </label>
      <label>
        <span>Dirección *</span>
        <input name="direccion" required value="${escapeHtml(fields.direccion)}" placeholder="Patagonia 28" />
      </label>
      <label>
        <span>Ciudad *</span>
        <input name="ciudad" required value="${escapeHtml(fields.ciudad)}" placeholder="Viedma" />
      </label>
      <div class="dash-link-preview">
        <span>Link público generado</span>
        <strong data-slug-preview>${escapeHtml(preview.url)}</strong>
        <small>Si cambia nombre o teléfono, este link cambia y el anterior deja de funcionar.</small>
      </div>
      <div class="dash-form-error" data-business-error></div>
      <div class="dash-form-actions">
        <button type="button" class="dash-mini-btn" data-business-cancel>Cancelar</button>
        <button type="submit" class="dash-save-btn" data-business-save>Guardar cambios</button>
      </div>
    </form>
  `;
}


function getStarterWebDismissKey(businessId = "") {
  return `apppromos:web-starter-card-hidden:${businessId || "default"}`;
}

function wasStarterWebCardHidden(businessId = "") {
  try {
    return window.sessionStorage?.getItem(getStarterWebDismissKey(businessId)) === "1";
  } catch (error) {
    return false;
  }
}

function hideStarterWebCardForSession(businessId = "") {
  try {
    window.sessionStorage?.setItem(getStarterWebDismissKey(businessId), "1");
  } catch (error) {
    // Si el navegador bloquea sessionStorage, la card simplemente vuelve a aparecer.
  }
}

function shouldShowStarterWebCard(state = {}, businessId = "") {
  if (wasStarterWebCardHidden(businessId)) return false;
  const web = state?.web || {};
  return Boolean(
    web.enabled !== false &&
    web.active !== false &&
    (
      web.mode === "starter" ||
      web.priceListStatus === "pending_real_prices" ||
      web.createdFrom === "registration_auto"
    ) &&
    web.priceListStatus !== "confirmed" &&
    web.priceListStatus !== "ready"
  );
}

function getStarterWebUrl(businessId = "", state = {}) {
  const web = state?.web || {};
  if (web.publicUrl) return web.publicUrl;
  if (web.slug) return getPublicWebUrl(businessId, web.slug);
  return "";
}

function renderStarterWebCard(businessId, meta = {}, state = {}) {
  if (!shouldShowStarterWebCard(state, businessId)) return "";
  const url = getStarterWebUrl(businessId, state);
  const fields = getBusinessFields(meta);
  const businessName = fields.name || "tu carnicería";
  const hasWebUrl = Boolean(url);

  return `
    <div class="dash-starter-web-card" data-starter-web-card>
      <div class="dash-starter-web-text">
        <div class="dash-starter-web-kicker">Carniza te dejó algo listo</div>
        <h3>🎉 Ya tenés tu web propia</h3>
        <p>La dejamos preparada para <strong>${escapeHtml(businessName)}</strong> con tu nombre y tu WhatsApp.</p>
        <p>Ahora actualizá tus precios reales y salís vendiendo con datos tuyos.</p>
        <small>Solo se publican productos con precio válido. Lo que no cargues, no aparece.</small>
      </div>
      <div class="dash-starter-web-actions">
        <button type="button" class="dash-starter-web-btn primary" data-action-panel="pricesPanel">Actualizar mis precios</button>
        <button type="button" class="dash-starter-web-btn" data-open-starter-web ${hasWebUrl ? "" : "disabled"}>Ver mi web</button>
        <button type="button" class="dash-starter-web-btn light" data-hide-starter-web-card>Ocultar por ahora</button>
      </div>
    </div>
  `;
}

export function renderDashboard(container, businessId, meta, state, options = {}) {
  const products = normalizeProductsFromState(state);
  const savedCombos = normalizeSavedCombosFromState(state);
  const activeProducts = products.filter((item) => item.active !== false);

  const updatedAt = state?.updatedAt
    ? new Date(state.updatedAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Sin registro";

  container.innerHTML = `
    <style>
      .dash-shell { display:flex; flex-direction:column; gap:18px; }
      .dash-main-card { border:1px solid #ece7df; border-radius:24px; padding:26px; background:linear-gradient(180deg,#fff,#fff7f4); box-shadow:0 10px 26px rgba(139,31,31,.08); }
      .dash-kicker { font-size:12px; font-weight:950; color:#9f1d20; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
      .dash-main-title { margin:0 0 8px; font-size:38px; line-height:1.05; color:#8b1f1f; }
      .dash-main-subtitle { margin:0 0 18px; color:#6b7280; font-size:15px; }
      .dash-actions { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:14px; }
      .dash-action-btn { border:1px solid #eadfd6; border-radius:22px; padding:22px; background:#fff; box-shadow:0 3px 10px rgba(0,0,0,.04); text-align:left; cursor:pointer; transition:all .2s ease; min-height:118px; }
      .dash-action-btn:hover { transform:translateY(-1px); border-color:#c23b28; box-shadow:0 8px 18px rgba(139,31,31,.08); }
      .dash-action-btn strong { display:block; font-size:21px; color:#8b1f1f; margin-bottom:7px; }
      .dash-action-btn span { color:#6b7280; font-size:14px; line-height:1.45; }
      .dash-carniza-card { border:1px solid #fed7aa; border-radius:24px; padding:18px; background:linear-gradient(135deg,#fff7ed,#ffffff 58%,#eff6ff); box-shadow:0 12px 28px rgba(234,88,12,.10); display:grid; grid-template-columns:1fr auto; gap:14px; align-items:center; }
      .dash-carniza-kicker { font-size:12px; font-weight:1000; color:#c2410c; text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
      .dash-carniza-title { margin:0; font-size:27px; line-height:1.05; color:#7c2d12; font-weight:1000; }
      .dash-carniza-copy { margin:6px 0 0; color:#6b4b3e; font-size:14px; font-weight:800; line-height:1.35; }
      .dash-carniza-head { display:flex; align-items:center; gap:12px; }
      .dash-carniza-avatar { width:58px; height:58px; border-radius:999px; object-fit:cover; border:2px solid #fed7aa; background:#fff7ed; box-shadow:0 8px 18px rgba(124,45,18,.10); flex:0 0 auto; }
      .dash-carniza-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
      .dash-carniza-btn { min-height:46px; border-radius:999px; padding:0 16px; border:1px solid #fed7aa; background:#fff; color:#7c2d12; font-weight:1000; cursor:pointer; box-shadow:0 5px 14px rgba(124,45,18,.07); }
      .dash-carniza-btn.primary { background:#c2410c; color:#fff; border-color:#c2410c; }
      .dash-carniza-btn.fire { background:#c41e3a; color:#fff; border-color:#c41e3a; box-shadow:0 8px 18px rgba(196,30,58,.18); }
      .dash-starter-web-card { border:1px solid #fed7aa; border-radius:24px; padding:18px; background:linear-gradient(135deg,#fff7ed,#ffffff 56%,#eff6ff); box-shadow:0 14px 30px rgba(194,65,12,.10); display:grid; grid-template-columns:minmax(0,1fr) auto; gap:16px; align-items:center; }
      .dash-starter-web-kicker { font-size:12px; font-weight:1000; color:#c2410c; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
      .dash-starter-web-text h3 { margin:0 0 8px; color:#7c2d12; font-size:28px; line-height:1.05; font-weight:1000; }
      .dash-starter-web-text p { margin:0 0 6px; color:#6b4b3e; font-size:14px; line-height:1.4; font-weight:800; }
      .dash-starter-web-text small { display:block; color:#9a3412; font-size:12px; line-height:1.35; font-weight:900; margin-top:4px; }
      .dash-starter-web-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; align-items:center; }
      .dash-starter-web-btn { min-height:44px; border-radius:999px; padding:0 15px; border:1px solid #fed7aa; background:#fff; color:#7c2d12; font-weight:1000; cursor:pointer; box-shadow:0 5px 14px rgba(124,45,18,.07); }
      .dash-starter-web-btn.primary { background:#c2410c; border-color:#c2410c; color:#fff; }
      .dash-starter-web-btn.light { background:#fffaf7; color:#9a3412; }
      .dash-starter-web-btn:disabled { opacity:.55; cursor:not-allowed; }
      .dash-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; }
      .dash-card { border:1px solid #ece7df; border-radius:16px; padding:16px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.04); }
      .dash-card h3 { margin:0; font-size:14px; color:#6b7280; }
      .dash-value { font-size:30px; font-weight:900; color:#111827; line-height:1.1; }
      .dash-note { margin-top:6px; color:#6b7280; font-size:13px; }
      .dash-two { display:grid; grid-template-columns:1.15fr .85fr; gap:14px; }
      .dash-list { display:flex; flex-direction:column; gap:10px; }
      .dash-list-item { display:flex; justify-content:space-between; gap:10px; padding:12px 0; border-bottom:1px solid #f3f4f6; }
      .dash-list-item:last-child { border-bottom:none; padding-bottom:0; }
      .dash-list-item strong { color:#111827; text-align:right; overflow-wrap:anywhere; }
      .dash-muted { color:#6b7280; }
      .dash-step-btn { width:100%; display:flex; justify-content:space-between; align-items:center; gap:12px; border:1px solid #f3e4db; border-radius:15px; background:#fffaf7; padding:14px; cursor:pointer; text-align:left; }
      .dash-step-btn strong { color:#8b1f1f; }
      .dash-step-btn span { color:#6b7280; font-size:13px; }
      .dash-secondary-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
      .dash-secondary-actions button { flex:1; min-width:150px; min-height:46px; border-radius:14px; border:1px solid #ddd; background:#fff; font-weight:800; cursor:pointer; }
      .dash-business-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
      .dash-mini-btn, .dash-save-btn { min-height:42px; border-radius:13px; border:1px solid #ddd; background:#fff; padding:0 14px; font-weight:900; cursor:pointer; }
      .dash-save-btn { background:#c23b28; border-color:#c23b28; color:#fff; }
      .dash-business-form { display:grid; gap:12px; }
      .dash-business-form label { display:grid; gap:6px; color:#4b5563; font-size:13px; font-weight:800; }
      .dash-business-form input { width:100%; min-height:46px; border:1px solid #e5e7eb; border-radius:13px; padding:0 12px; font-size:15px; box-sizing:border-box; }
      .dash-business-form input:focus { outline:2px solid rgba(194,59,40,.15); border-color:#c23b28; }
      .dash-form-hint { color:#6b7280; font-size:13px; }
      .dash-link-preview { background:#fff7ed; border:1px solid #fed7aa; border-radius:14px; padding:12px; display:grid; gap:5px; }
      .dash-link-preview span { color:#9a3412; font-weight:900; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
      .dash-link-preview strong { color:#7c2d12; overflow-wrap:anywhere; }
      .dash-link-preview small { color:#9a3412; }
      .dash-form-error { min-height:18px; color:#b42318; font-weight:800; font-size:13px; }
      .dash-form-actions { display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap; }
      @media (max-width: 900px) { .dash-actions, .dash-grid, .dash-two { grid-template-columns:1fr; } .dash-carniza-card, .dash-starter-web-card { grid-template-columns:1fr; } .dash-carniza-actions, .dash-starter-web-actions { justify-content:stretch; } .dash-carniza-btn, .dash-starter-web-btn { flex:1; min-width:150px; } }
      @media (max-width: 640px) { .dash-main-card { padding:18px; } .dash-main-title { font-size:30px; } .dash-value { font-size:26px; } .dash-action-btn { min-height:auto; padding:16px; } .dash-carniza-title, .dash-starter-web-text h3 { font-size:24px; } .dash-carniza-actions, .dash-starter-web-actions { flex-direction:column; } .dash-carniza-btn, .dash-starter-web-btn { width:100%; } .dash-business-head { align-items:flex-start; flex-direction:column; } .dash-list-item { flex-direction:column; gap:4px; } .dash-list-item strong { text-align:left; } .dash-form-actions { flex-direction:column-reverse; } .dash-mini-btn, .dash-save-btn { width:100%; } }
    </style>

    <div class="dash-shell">
      <div class="dash-main-card">
        <div class="dash-kicker">Inicio rápido</div>
        <h2 class="dash-main-title">¿Qué querés hacer ahora?</h2>
        <p class="dash-main-subtitle">Elegí una acción. La app tiene que trabajar para vos, no al revés.</p>
        <div class="dash-actions">
          <button class="dash-action-btn" data-action-panel="pricesPanel"><strong>⚡ Cambiar precios</strong><span>Actualizá valores rápido. Ideal para arrancar el día.</span></button>
          <button class="dash-action-btn" data-action-panel="builderPanel"><strong>🔥 Crear oferta</strong><span>Armá un combo con precios actuales y guardalo para vender.</span></button>
          <button class="dash-action-btn" data-action-panel="whatsappPanel"><strong>📤 Enviar WhatsApp</strong><span>Elegí una oferta guardada, personalizá cliente y enviá.</span></button>
        </div>
      </div>

      ${renderStarterWebCard(businessId, meta, state)}

      <div class="dash-two">
        <div class="dash-card">
          <h3>Recorrido sugerido</h3>
          <div class="dash-list">
            <button class="dash-step-btn" data-action-panel="pricesPanel"><strong>1. Actualizá precios</strong><span>Dejá la lista lista para vender →</span></button>
            <button class="dash-step-btn" data-action-panel="builderPanel"><strong>2. Creá una oferta</strong><span>Armá el combo y guardalo →</span></button>
            <button class="dash-step-btn" data-action-panel="whatsappPanel"><strong>3. Mandá por WhatsApp</strong><span>Nombre, teléfono y mensaje listo →</span></button>
          </div>
        </div>

        <div class="dash-card">
          <h3>Resumen operativo</h3>
          <div class="dash-grid" style="grid-template-columns:1fr 1fr;">
            <div><div class="dash-value">${activeProducts.length}</div><div class="dash-note">productos activos</div></div>
            <div><div class="dash-value">${savedCombos.length}</div><div class="dash-note">ofertas guardadas</div></div>
          </div>
          <div class="dash-secondary-actions">
            <button data-action-panel="savedPanel">💾 Ver guardados</button>
            <button data-action-panel="marketPanel">📊 Ver competencia</button>
          </div>
        </div>
      </div>

      <div class="dash-card" data-business-card>
        ${renderBusinessView(meta, state, updatedAt)}
      </div>
    </div>
  `;

  const businessCard = container.querySelector("[data-business-card]");
  const toEditMode = () => {
    if (!businessCard) return;
    businessCard.innerHTML = renderBusinessEditForm(businessId, meta, state);
    bindBusinessForm(businessCard, businessId, meta, state, options);
  };

  container.querySelector("[data-business-edit]")?.addEventListener("click", toEditMode);

  container.querySelector("[data-open-starter-web]")?.addEventListener("click", () => {
    const url = getStarterWebUrl(businessId, state);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  container.querySelector("[data-hide-starter-web-card]")?.addEventListener("click", () => {
    hideStarterWebCardForSession(businessId);
    container.querySelector("[data-starter-web-card]")?.remove();
  });
}

function bindBusinessForm(card, businessId, meta, state, options) {
  const form = card.querySelector("[data-business-form]");
  const errorEl = card.querySelector("[data-business-error]");
  const previewEl = card.querySelector("[data-slug-preview]");
  const saveBtn = card.querySelector("[data-business-save]");

  const getDraft = () => {
    const fd = new FormData(form);
    return {
      name: String(fd.get("name") || "").trim(),
      telefono: String(fd.get("telefono") || "").trim(),
      direccion: String(fd.get("direccion") || "").trim(),
      ciudad: String(fd.get("ciudad") || "").trim()
    };
  };

  const refreshPreview = () => {
    const draft = getDraft();
    const preview = getSlugPreview(businessId, draft);
    if (previewEl) previewEl.textContent = preview.url;
    const valid = draft.name && draft.telefono && draft.direccion && draft.ciudad && !preview.error;
    if (saveBtn) saveBtn.disabled = !valid;
  };

  form?.addEventListener("input", refreshPreview);
  refreshPreview();

  card.querySelector("[data-business-cancel]")?.addEventListener("click", () => {
    const updatedAt = state?.updatedAt
      ? new Date(state.updatedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "Sin registro";
    card.innerHTML = renderBusinessView(meta, state, updatedAt);
    card.querySelector("[data-business-edit]")?.addEventListener("click", () => {
      card.innerHTML = renderBusinessEditForm(businessId, meta, state);
      bindBusinessForm(card, businessId, meta, state, options);
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!options?.onBusinessDataSave) return;

    const draft = getDraft();
    const nextPreview = getSlugPreview(businessId, draft);
    const previousSlug = state?.web?.slug || "";
    const slugWillChange = nextPreview.slug && previousSlug && nextPreview.slug !== previousSlug;

    if (slugWillChange) {
      const ok = window.confirm(
        "⚠️ Cambiar el nombre o teléfono cambiará el link público de tu Web Premium.\n\n" +
        "El link anterior dejará de funcionar.\n\n" +
        "¿Querés continuar?"
      );
      if (!ok) return;
    }

    try {
      if (errorEl) errorEl.textContent = "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
      }
      await options.onBusinessDataSave(draft);
    } catch (error) {
      if (errorEl) errorEl.textContent = error?.message || "No se pudieron guardar los datos";
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar cambios";
      }
    }
  });
}
