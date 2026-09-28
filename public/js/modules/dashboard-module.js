import {
  normalizeProductsFromState,
  normalizeSavedCombosFromState
} from "../services/business-service.js";

import { buildBusinessSlug, getPublicWebUrl } from "../services/web-premium-service.js";
import { trackBusinessCommercialEvent } from "../services/admin-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";

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
  const currentWebStatus = state?.web?.slug ? "Vidriera activa" : "Todavía sin vidriera activa";

  return `
    <div class="dash-business-head">
      <h3>Datos del negocio activo</h3>
      <button type="button" class="dash-mini-btn" data-business-edit><svg class="ci ci-sm ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#edit"></use></svg>Editar datos</button>
    </div>
    <div class="dash-list">
      <div class="dash-list-item"><span class="dash-muted">Carnicería</span><strong>${escapeHtml(businessName)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Dirección</span><strong>${escapeHtml(address)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Teléfono</span><strong>${escapeHtml(phone)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Ciudad</span><strong>${escapeHtml(city)}</strong></div>
      <div class="dash-list-item"><span class="dash-muted">Mi web</span><strong>${escapeHtml(currentWebStatus)}</strong></div>
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
        <span>Enlace de tu vidriera</span>
        <strong data-slug-preview>${escapeHtml(preview.url)}</strong>
        <small>Si cambiás nombre o WhatsApp, cambia el enlace de tu vidriera y el anterior deja de funcionar.</small>
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

    <div class="dash-shell">
      ${showBrandReminder ? `
        <section class="dash-brand-reminder" data-brand-reminder>
          <div class="dash-brand-reminder-copy">
            <strong><svg class="ci ci-sm ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#edit"></use></svg>Personalizá tu carnicería online</strong>
            <span>Subí tu logo y una foto real del frente para que tus clientes reconozcan tu negocio.</span>
            <small>Te falta: ${missingBrandParts.join(" y ")}.</small>
          </div>
          <button type="button" class="dash-brand-reminder-btn" data-brand-reminder-open>Completar ahora</button>
        </section>
      ` : ""}
      <div class="dash-main-card">
        <div class="dash-kicker">Hoy</div>
        <h2 class="dash-main-title">¿Qué querés hacer?</h2>
        <p class="dash-main-subtitle">Todo lo importante, a un toque.</p>
        <div class="dash-actions">
          <button class="dash-action-btn" data-dashboard-open-web ${publicWebUrl ? "" : "disabled"}><span class="dash-action-icon"><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#globe"></use></svg></span><strong>Mi carnicería</strong><span>Ver como cliente</span></button>
          <button class="dash-action-btn" data-action-panel="pricesPanel"><span class="dash-action-icon"><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#price"></use></svg></span><strong>Precios</strong><span>Actualizar precios</span></button>
          <button class="dash-action-btn" data-action-panel="builderPanel"><span class="dash-action-icon"><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#sell"></use></svg></span><strong>Vender o crear promo</strong><span>Consulta puntual o combo</span></button>
          <button class="dash-action-btn" data-action-panel="webPanel"><span class="dash-action-icon"><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#settings"></use></svg></span><strong>Gestionar mi web</strong><span>Datos e identidad de tu vidriera</span></button>
        </div>

        <div class="dash-whatsapp-sales">
          <button type="button" data-action-panel="whatsappPanel">
            <span><svg class="ci ci-md" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg></span>
            <strong>Enviar promos por WhatsApp</strong>
            <small>Usá tus promociones guardadas para vender por mensaje.</small>
          </button>
        </div>

        <div class="dash-share-block">
          ${renderCarnizaSpotlight("dashboardPanel", {
            actionsHtml: `
              <button type="button" class="cz-spotlight-cta" data-dashboard-share-web ${publicWebUrl ? "" : "disabled"}><svg class="ci ci-sm ci--wa" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg>Compartir por WhatsApp</button>
              <button type="button" class="cz-spotlight-link" data-dashboard-open-qr ${publicWebUrl ? "" : "disabled"}><svg class="ci ci-sm ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#qr"></use></svg>Ver mi QR</button>
            `
          })}

          ${publicWebUrl ? `
            <div class="dash-qr-panel" data-dashboard-qr-panel hidden>
              <div class="dash-qr-frame">
                <img
                  data-dashboard-qr-image
                  src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(publicWebUrl)}"
                  alt="QR de mi carnicería"
                  width="240"
                  height="240"
                  class="dash-qr-img"
                />
              </div>
              <div class="dash-qr-caption">
                Escaneá para abrir tu carnicería online
              </div>
              <div class="dash-qr-url">
                ${escapeHtml(publicWebUrl)}
              </div>
            </div>
          ` : ""}
        </div>
      </div>

    </div>
  `;

  container.querySelector("[data-dashboard-open-web]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    void trackBusinessCommercialEvent(businessId, "web_open");
    window.open(publicWebUrl, "_blank", "noopener,noreferrer");
  });

  container.querySelector("[data-dashboard-share-web]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    document.dispatchEvent(new CustomEvent("apppromos:seller-web-share", {
      detail: { source: "dashboard" }
    }));
    const text = `¡Hola! 👋 Mirá nuestra carnicería online. Podés ver precios y ofertas, armar tu pedido y mandárnoslo por WhatsApp: ${publicWebUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  });

  container.querySelector("[data-dashboard-open-qr]")?.addEventListener("click", () => {
    if (!publicWebUrl) return;
    const qrPanel = container.querySelector("[data-dashboard-qr-panel]");
    if (!qrPanel) return;
    qrPanel.hidden = !qrPanel.hidden;
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
        "⚠️ Cambiar el nombre o WhatsApp cambiará el enlace de tu vidriera.\n\n" +
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
