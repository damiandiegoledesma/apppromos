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
  const businessName = fields.name || "CarnicerÃ­a";
  const address = fields.direccion || "Sin direcciÃ³n";
  const phone = fields.telefono || "Sin telÃ©fono";
  const city = fields.ciudad || "Sin ciudad";
  const currentWebStatus = state?.web?.slug ? "Vidriera activa" : "TodavÃ­a sin vidriera activa";

  return `
    <div class="dash-business-head">
      <h3>Datos del negocio activo</h3>
      <button type="button" class="dash-mini-btn" data-business-edit>âœï¸ Editar datos</button>
    </div>
    <div class="dash-list">
      <div class="dash-list-item"><span class="dash-muted">CarnicerÃ­a</span><strong>${escapeHtml(businessName)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">DirecciÃ³n</span><strong>${escapeHtml(address)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">TelÃ©fono</span><strong>${escapeHtml(phone)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Ciudad</span><strong>${escapeHtml(city)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Mi web</span><strong>${escapeHtml(currentWebStatus)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Ãšltima actualizaciÃ³n</span><strong>${escapeHtml(updatedAt)}</strong></div>
    </div>
  `;
}

function getSlugPreview(businessId, draft = {}) {
  try {
    const slug = buildBusinessSlug(draft, businessId);
    return { slug, url: getPublicWebUrl(businessId, slug), error: "" };
  } catch (error) {
    return { slug: "", url: "CompletÃ¡ nombre y telÃ©fono vÃ¡lido para generar el link", error: error?.message || "" };
  }
}

function renderBusinessEditForm(businessId, meta = {}, state = {}) {
  const fields = getBusinessFields(meta);
  const preview = getSlugPreview(businessId, fields);

  return `
    <div class="dash-business-head">
      <h3>Editar datos del negocio</h3>
      <span class="dash-form-hint">El link se genera solo con nombre + telÃ©fono.</span>
    </div>
    <form class="dash-business-form" data-business-form>
      <label>
        <span>Nombre comercial *</span>
        <input name="name" required value="${escapeHtml(fields.name)}" placeholder="CarnicerÃ­a Sur" />
      </label>
      <label>
        <span>TelÃ©fono / WhatsApp *</span>
        <input name="telefono" required value="${escapeHtml(fields.telefono)}" placeholder="3462 555555" />
      </label>
      <label>
        <span>DirecciÃ³n *</span>
        <input name="direccion" required value="${escapeHtml(fields.direccion)}" placeholder="Patagonia 28" />
      </label>
      <label>
        <span>Ciudad *</span>
        <input name="ciudad" required value="${escapeHtml(fields.ciudad)}" placeholder="Viedma" />
      </label>
      <div class="dash-link-preview">
        <span>Enlace de tu vidriera</span>
        <strong data-slug-preview>${escapeHtml(preview.url)}</strong>
        <small>Si cambiÃ¡s nombre o WhatsApp, cambia el enlace de tu vidriera y el anterior deja de funcionar.</small>
      </div>
      <div class="dash-form-error" data-business-error></div>
      <div class="dash-form-actions">
        <button type="button" class="dash-mini-btn" data-business-cancel>Cancelar</button>
        <button type="submit" class="dash-save-btn" data-business-save>Guardar cambios</button>
      </div>
    </form>
  `;
}

export function renderDashboard(container, businessId, meta, state, options = {}) {
  const products = normalizeProductsFromState(state);
  const savedCombos = normalizeSavedCombosFromState(state);
  const activeProducts = products.filter((item) => item.active !== false);
  const logoReady = Boolean(String(meta?.brand?.logoUrl || "").trim());
  const frontPhotoReady = Boolean(String(meta?.brand?.frontPhotoUrl || "").trim());
  const showBrandReminder = options?.showBrandReminder !== false && (!logoReady || !frontPhotoReady);
  const missingBrandParts = [
    !logoReady ? "tu logo" : "",
    !frontPhotoReady ? "una foto del frente" : ""
  ].filter(Boolean);
  let publicWebUrl = "";
  try {
    const slug = state?.web?.slug || buildBusinessSlug(meta || {}, businessId);
    publicWebUrl = getPublicWebUrl(businessId, slug);
  } catch (_) {}

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
      .dash-shell { display:flex; flex-direction:column; gap:18px; width:100%; max-width:100%; overflow-x:hidden; box-sizing:border-box; }
      .dash-shell *, .dash-shell *::before, .dash-shell *::after { box-sizing:border-box; min-width:0; }
      .dash-main-card { width:100%; max-width:100%; border:1px solid #ece7df; border-radius:24px; padding:26px; background:linear-gradient(180deg,#fff,#fff7f4); box-shadow:0 10px 26px rgba(139,31,31,.08); }
      .dash-brand-reminder { width:100%; border:1px solid #bfdbfe; border-radius:22px; padding:17px 18px; background:linear-gradient(135deg,#eff6ff,#fff 65%); box-shadow:0 10px 24px rgba(4,119,242,.08); display:flex; align-items:center; justify-content:space-between; gap:16px; }
      .dash-brand-reminder-copy { display:grid; gap:5px; color:#1e3a8a; }
      .dash-brand-reminder-copy strong { font-size:18px; line-height:1.15; }
      .dash-brand-reminder-copy span { color:#475569; font-size:14px; font-weight:750; line-height:1.4; }
      .dash-brand-reminder-copy small { color:#1d4ed8; font-size:12px; font-weight:900; }
      .dash-brand-reminder-btn { min-height:46px; flex:0 0 auto; padding:0 17px; border:0; border-radius:14px; background:#0477f2; color:#fff; font-weight:1000; cursor:pointer; box-shadow:0 8px 18px rgba(4,119,242,.18); }
      .dash-kicker { font-size:12px; font-weight:950; color:#9f1d20; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
      .dash-main-title { margin:0 0 8px; font-size:38px; line-height:1.05; color:#8b1f1f; }
      .dash-main-subtitle { margin:0 0 18px; color:#6b7280; font-size:15px; }
      .dash-actions { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; }
      .dash-action-btn { width:100%; max-width:100%; border:1px solid #eadfd6; border-radius:22px; padding:18px; background:#fff; box-shadow:0 3px 10px rgba(0,0,0,.04); text-align:left; cursor:pointer; transition:all .2s ease; min-height:88px; display:flex; align-items:center; gap:12px; }
      .dash-action-btn:hover { transform:translateY(-1px); border-color:#c23b28; box-shadow:0 8px 18px rgba(139,31,31,.08); }
      .dash-action-btn strong { display:block; font-size:18px; color:#8b1f1f; margin:0; line-height:1.15; }
      .dash-action-icon { width:42px; height:42px; flex:0 0 42px; border-radius:14px; display:grid; place-items:center; font-size:22px; background:#f8fbff; border:1px solid rgba(4,119,242,.12); }
      .dash-action-btn span { display:none; }
      .dash-action-btn .dash-action-icon { display:grid; }
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
      .dash-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; }
      .dash-card { width:100%; max-width:100%; border:1px solid #ece7df; border-radius:16px; padding:16px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.04); }
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
      .dash-whatsapp-sales { margin-top:14px; }
      .dash-whatsapp-sales button { width:100%; min-height:58px; border:1px solid #d1fae5; border-radius:16px; background:linear-gradient(135deg,#f0fdf4,#ffffff); color:#166534; display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; column-gap:10px; align-items:center; text-align:left; padding:10px 14px; cursor:pointer; }
      .dash-whatsapp-sales button>span { grid-row:1 / 3; font-size:24px; }
      .dash-whatsapp-sales strong { font-size:14px; line-height:1.1; }
      .dash-whatsapp-sales small { color:#4b5563; font-size:11px; font-weight:700; }
      .dash-share-block { margin-top:16px; padding-top:14px; border-top:1px solid #f0e6e1; }
      .dash-share-head { display:grid; gap:3px; margin-bottom:10px; }
      .dash-share-head strong { color:#7f1d1d; font-size:15px; }
      .dash-share-head span { color:#6b7280; font-size:12px; font-weight:700; }
      .dash-secondary-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:0; }
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
      @media (max-width: 900px) { .dash-grid, .dash-two { grid-template-columns:1fr; } .dash-carniza-card { grid-template-columns:1fr; } .dash-carniza-actions { justify-content:stretch; } .dash-carniza-btn { flex:1; min-width:150px; } }
      @media (max-width: 640px) {
        .dash-shell { gap:12px; }
        .dash-brand-reminder { align-items:stretch; flex-direction:column; padding:15px; }
        .dash-brand-reminder-btn { width:100%; }
        .dash-main-card { padding:12px; border-radius:20px; }
        .dash-main-title { font-size:22px; line-height:1.08; margin-bottom:12px; }
        .dash-main-subtitle, .dash-kicker { display:none; }
        .dash-value { font-size:24px; }
        .dash-actions { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:8px; }
        .dash-action-btn { min-width:0; min-height:88px; padding:10px; border-radius:17px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:7px; text-align:center; }
        .dash-action-icon { display:grid !important; width:36px; height:36px; flex:0 0 36px; place-items:center; border-radius:11px; font-size:19px; line-height:1; }
        .dash-action-btn strong { display:block; width:100%; font-size:14px; margin:0; line-height:1.12; text-align:center; }
        .dash-action-btn span { display:none; }

        .dash-secondary-actions button { min-width:0; min-height:42px; font-size:11px; line-height:1.15; padding:0 6px; }
        .dash-card { padding:14px; border-radius:16px; }
        .dash-two { gap:12px; }
        .dash-step-btn { padding:12px; }
        .dash-secondary-actions { display:grid; grid-template-columns:1fr; gap:8px; }
        .dash-secondary-actions button { width:100%; min-width:0; }
        .dash-carniza-title { font-size:24px; }
        .dash-carniza-actions { flex-direction:column; }
        .dash-carniza-btn { width:100%; }
        .dash-business-head { align-items:flex-start; flex-direction:column; }
        .dash-list-item { flex-direction:column; gap:4px; }
        .dash-list-item strong { text-align:left; }
        .dash-form-actions { flex-direction:column-reverse; }
        .dash-mini-btn, .dash-save-btn { width:100%; }
      }
          @media (max-width: 640px) { .dash-secondary-actions { grid-template-columns:1fr; } }
</style>

    <div class="dash-shell">
      ${showBrandReminder ? `
        <section class="dash-brand-reminder" data-brand-reminder>
          <div class="dash-brand-reminder-copy">
            <strong>ðŸ“¸ PersonalizÃ¡ tu carnicerÃ­a online</strong>
            <span>SubÃ­ tu logo y una foto real del frente para que tus clientes reconozcan tu negocio.</span>
            <small>Te falta: ${missingBrandParts.join(" y ")}.</small>
          </div>
          <button type="button" class="dash-brand-reminder-btn" data-brand-reminder-open>Completar ahora</button>
        </section>
      ` : ""}
      <div class="dash-main-card">
        <div class="dash-kicker">Hoy</div>
        <h2 class="dash-main-title">Â¿QuÃ© querÃ©s hacer?</h2>
        <p class="dash-main-subtitle">Todo lo importante, a un toque.</p>
        <div class="dash-actions">
          <button class="dash-action-btn" data-dashboard-open-web ${publicWebUrl ? "" : "disabled"}><span class="dash-action-icon">ðŸŒ</span><strong>Mi carnicerÃ­a</strong><span>Ver como cliente</span></button>
          <button class="dash-action-btn" data-action-panel="pricesPanel"><span class="dash-action-icon">ðŸ’²</span><strong>Precios</strong><span>Actualizar precios</span></button>
          <button class="dash-action-btn" data-action-panel="builderPanel"><span class="dash-action-icon">ðŸ”¥</span><strong>Vender o crear promo</strong><span>Consulta puntual o combo</span></button>
          <button class="dash-action-btn" data-action-panel="webPanel"><span class="dash-action-icon">âš™ï¸</span><strong>Gestionar mi web</strong><span>Datos e identidad de tu vidriera</span></button>
        </div>

        <div class="dash-whatsapp-sales">
          <button type="button" data-action-panel="whatsappPanel">
            <span>ðŸ’¬</span>
            <strong>Enviar promos por WhatsApp</strong>
            <small>UsÃ¡ tus promociones guardadas para vender por mensaje.</small>
          </button>
        </div>

        <div class="dash-share-block">
          <div class="dash-share-head"><strong>Compartir mi web</strong><span>ElegÃ­ cÃ³mo querÃ©s acercar tu vidriera a tus clientes.</span></div>
          <div class="dash-secondary-actions">
            <button type="button" data-dashboard-share-web ${publicWebUrl ? "" : "disabled"}>ðŸ’¬ Compartir link por WhatsApp</button>
            <button type="button" data-dashboard-open-qr ${publicWebUrl ? "" : "disabled"}>ðŸ“± Compartir con QR</button>
          </div>
        </div>
      </div>

    </div>
  `;

  container.querySelector("[data-dashboard-open-web]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    window.open(publicWebUrl, "_blank", "noopener,noreferrer");
  });

  container.querySelector("[data-dashboard-share-web]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    const text = `Â¡Hola! ðŸ‘‹ MirÃ¡ nuestra carnicerÃ­a online. PodÃ©s ver precios y ofertas, armar tu pedido y mandÃ¡rnoslo por WhatsApp: ${publicWebUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  });

  container.querySelector("[data-dashboard-open-qr]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    if (typeof options?.onOpenQr === "function") options.onOpenQr();
  });

  container.querySelector("[data-brand-reminder-open]")?.addEventListener("click", () => {
    if (typeof options?.onEditBusinessData === "function") options.onEditBusinessData();
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
        "âš ï¸ Cambiar el nombre o WhatsApp cambiarÃ¡ el enlace de tu vidriera.\n\n" +
        "El link anterior dejarÃ¡ de funcionar.\n\n" +
        "Â¿QuerÃ©s continuar?"
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
