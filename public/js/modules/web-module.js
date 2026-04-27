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

function uniqueRubros(products = []) {
  return [...new Set(products.map(p => String(p.rubro || "Sin rubro").trim() || "Sin rubro"))]
    .sort((a,b) => a.localeCompare(b, "es"));
}

export async function renderWebPremium(container, businessId) {
  if (!container) return;
  container.innerHTML = `<div style="padding:18px;color:#6b7280;">Cargando Mi Web...</div>`;

  try {
    const data = await loadActiveBusinessData(businessId);
    const { meta, state, config, webPremiumEnabled } = await loadWebConfig(businessId, data);

    const products = Array.isArray(data.products) ? data.products.filter(p => p.active !== false) : [];
    const savedCombos = Array.isArray(data.state?.savedCombos) ? data.state.savedCombos : [];
    const rubros = uniqueRubros(products);
    const selectedOffers = Array.isArray(config.selectedOffers) ? config.selectedOffers : [];
    const visibleRubros = Array.isArray(config.visibleRubros) ? config.visibleRubros : [];
    let generatedSlug = config.slug;
    let slugWarning = "";

    try {
      generatedSlug = buildBusinessSlug(meta || {}, businessId);
      if (config.slug && config.slug !== generatedSlug) {
        slugWarning = `Al guardar, el link cambiará de ${config.slug} a ${generatedSlug}.`;
      }
    } catch (error) {
      slugWarning = error?.message || "No se pudo generar el link automático.";
    }

    const publicUrl = getPublicWebUrl(businessId, generatedSlug);

    if (!webPremiumEnabled) {
      container.innerHTML = `
        <style>.wp-card{border:1px solid #eadbd4;border-radius:20px;background:#fff;padding:22px}.wp-btn{min-height:44px;border:none;border-radius:12px;padding:0 16px;font-weight:900;cursor:pointer}.wp-muted{color:#6b7280}</style>
        <div class="wp-card" style="background:linear-gradient(180deg,#fff,#fff7f4);">
          <h2 style="margin:0 0 8px;color:#8b1f1f;">🌐 Mi Web Premium</h2>
          <p class="wp-muted" style="margin:0 0 16px;">Este módulo todavía no está habilitado para esta carnicería.</p>
          <div style="padding:16px;border:1px dashed #d8b4a8;border-radius:16px;background:#fff;">
            🔒 Disponible como upgrade. El administrador debe activar <strong>Web Premium</strong> para esta cuenta.
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <style>
        .wp-shell{display:flex;flex-direction:column;gap:16px}.wp-card{border:1px solid #ece7df;border-radius:20px;background:#fff;padding:18px;box-shadow:0 4px 14px rgba(17,24,39,.04)}.wp-head{background:linear-gradient(180deg,#fff,#fff7f4)}.wp-head h2{margin:0 0 6px;color:#8b1f1f;font-size:28px}.wp-muted{color:#6b7280}.wp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.wp-field label{display:block;font-weight:900;margin-bottom:8px}.wp-input{width:100%;min-height:48px;border:1px solid #d7d7d7;border-radius:14px;padding:0 12px;font-size:16px;box-sizing:border-box}.wp-input[readonly]{background:#f9fafb;color:#374151}.wp-btn{min-height:46px;border:none;border-radius:14px;padding:0 16px;font-weight:950;cursor:pointer}.wp-primary{background:#b63b2b;color:#fff}.wp-secondary{background:#fff;border:1px solid #d1d5db;color:#111827}.wp-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wp-check{border:1px solid #eee;border-radius:14px;padding:10px;background:#fffaf7}.wp-offer{display:flex;justify-content:space-between;gap:10px;align-items:center}.wp-price{font-weight:950;color:#b63b2b}.wp-actions{display:flex;gap:10px;flex-wrap:wrap}.wp-url{background:#f8f5f0;border:1px solid #e7e1d8;border-radius:14px;padding:12px;word-break:break-all;font-weight:800}.wp-warning{margin-top:10px;padding:10px;border-radius:12px;background:#fff7ed;color:#9a3412;font-weight:800}@media(max-width:760px){.wp-grid,.wp-checks{grid-template-columns:1fr}.wp-head h2{font-size:24px}.wp-actions{flex-direction:column}.wp-btn{width:100%}}
      </style>
      <div class="wp-shell">
        <div class="wp-card wp-head">
          <h2>🌐 Mi Web Premium</h2>
          <p class="wp-muted" style="margin:0;">Publicá una web simple con ofertas activas y, si querés, tu lista de precios por rubro.</p>
        </div>

        <div class="wp-card">
          <div class="wp-grid">
            <div class="wp-field">
              <label>Estado de la web</label>
              <select id="wpEnabled" class="wp-input">
                <option value="true" ${config.enabled ? "selected" : ""}>Activada</option>
                <option value="false" ${!config.enabled ? "selected" : ""}>Desactivada</option>
              </select>
            </div>
            <div class="wp-field">
              <label>Link automático</label>
              <input id="wpSlug" class="wp-input" value="${escapeHtml(generatedSlug)}" readonly />
              <div class="wp-muted" style="margin-top:6px;font-size:13px;">Se genera con nombre comercial + teléfono. No se edita manualmente.</div>
            </div>
          </div>
          <div style="margin-top:12px;" class="wp-url" id="wpUrl">${escapeHtml(publicUrl)}</div>
          ${slugWarning ? `<div class="wp-warning">⚠️ ${escapeHtml(slugWarning)}</div>` : ""}
          <div class="wp-actions" style="margin-top:12px;">
            <button id="wpCopy" class="wp-btn wp-secondary">📋 Copiar link</button>
            <button id="wpOpen" class="wp-btn wp-secondary">👁️ Ver web</button>
          </div>
        </div>

        <div class="wp-card">
          <h3 style="margin:0 0 10px;">🔥 Ofertas que aparecen en la web</h3>
          ${savedCombos.length ? `<div class="wp-checks">
            ${savedCombos.map(combo => `
              <label class="wp-check">
                <div class="wp-offer">
                  <span><input type="checkbox" data-wp-offer="${escapeHtml(combo.id)}" ${selectedOffers.includes(combo.id) ? "checked" : ""}> ${escapeHtml(combo.name || "Oferta")}</span>
                  <span class="wp-price">${money(getComboTotal(combo))}</span>
                </div>
              </label>`).join("")}
          </div>` : `<div class="wp-muted">Todavía no hay ofertas guardadas. Primero creá ofertas desde “Crear oferta”.</div>`}
        </div>

        <div class="wp-card">
          <h3 style="margin:0 0 10px;">🧾 Lista de precios pública</h3>
          <label class="wp-check" style="display:block;margin-bottom:12px;"><input type="checkbox" id="wpShowPrices" ${config.showPriceList ? "checked" : ""}> Mostrar lista de precios en la web</label>
          <div class="wp-checks">
            ${rubros.map(rubro => `<label class="wp-check"><input type="checkbox" data-wp-rubro="${escapeHtml(rubro)}" ${visibleRubros.includes(rubro) ? "checked" : ""}> ${escapeHtml(rubro)}</label>`).join("")}
          </div>
          <div class="wp-muted" style="margin-top:10px;">Los productos se muestran ordenados por rubro y alfabéticamente.</div>
        </div>

        <div class="wp-card">
          <button id="wpSave" class="wp-btn wp-primary">💾 Guardar configuración web</button>
          <span id="wpStatus" class="wp-muted" style="margin-left:10px;"></span>
        </div>
      </div>`;

    const slugInput = container.querySelector("#wpSlug");
    const urlEl = container.querySelector("#wpUrl");
    function refreshUrl() {
      urlEl.textContent = getPublicWebUrl(businessId, slugInput.value);
    }

    container.querySelector("#wpCopy")?.addEventListener("click", async () => {
      refreshUrl();
      try { await navigator.clipboard.writeText(urlEl.textContent); alert("Link copiado"); } catch { alert(urlEl.textContent); }
    });
    container.querySelector("#wpOpen")?.addEventListener("click", () => { refreshUrl(); window.open(urlEl.textContent, "_blank"); });
    container.querySelector("#wpSave")?.addEventListener("click", async () => {
      const btn = container.querySelector("#wpSave");
      const status = container.querySelector("#wpStatus");
      btn.disabled = true; status.textContent = "Guardando...";
      try {
        if (config.slug && slugInput.value && config.slug !== slugInput.value) {
          const ok = confirm(
            `Atención: al guardar cambiará el link público.\n\n` +
            `Link anterior: ${config.slug}\n` +
            `Link nuevo: ${slugInput.value}\n\n` +
            `Los links anteriores dejarán de funcionar. ¿Guardar igual?`
          );
          if (!ok) {
            status.textContent = "Guardado cancelado";
            btn.disabled = false;
            return;
          }
        }

        const offerIds = [...container.querySelectorAll("[data-wp-offer]:checked")].map(el => el.getAttribute("data-wp-offer"));
        const rubroNames = [...container.querySelectorAll("[data-wp-rubro]:checked")].map(el => el.getAttribute("data-wp-rubro"));
        const next = await saveWebConfig(businessId, {
          enabled: container.querySelector("#wpEnabled")?.value === "true",
          selectedOffers: offerIds,
          showPriceList: Boolean(container.querySelector("#wpShowPrices")?.checked),
          visibleRubros: rubroNames
        });
        status.textContent = "✅ Guardado";
        slugInput.value = next.slug;
        urlEl.textContent = getPublicWebUrl(businessId, next.slug);
      } catch (error) {
        console.error(error);
        status.textContent = "Error: " + (error?.message || "no se pudo guardar");
      } finally { btn.disabled = false; }
    });
  } catch (error) {
    console.error("Error renderWebPremium", error);
    container.innerHTML = `<div style="padding:18px;color:#b42318;">Error cargando Mi Web: ${escapeHtml(error?.message || "desconocido")}</div>`;
  }
}
