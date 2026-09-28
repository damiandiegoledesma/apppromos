import { buildCustomerWhatsappMessage, buildWhatsappShareUrl } from "../services/whatsapp-message-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";
function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePhone(value = "") {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("54")) return digits;
  if (digits.length >= 10) return `54${digits}`;
  return digits;
}

function getStorageKey(meta = {}) {
  const businessId = meta?.id || meta?.businessId || meta?.slug || meta?.name || "default";
  return `apppromos:lastWhatsappCustomer:${businessId}`;
}

function loadLastCustomer(meta = {}) {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(meta)) || "{}");
  } catch (_) {
    return {};
  }
}

function saveLastCustomer(meta = {}, customer = {}) {
  try {
    localStorage.setItem(getStorageKey(meta), JSON.stringify({
      name: String(customer?.name || "").trim(),
      phone: String(customer?.phone || "").trim()
    }));
  } catch (_) {}
}

function getItemIcon(rubro = "", name = "") {
  const text = `${rubro} ${name}`.toLowerCase();
  if (text.includes("pollo") || text.includes("pata") || text.includes("muslo")) return "🐔";
  if (text.includes("cerdo") || text.includes("costeleta") || text.includes("pulp")) return "🐖";
  if (text.includes("novillo") || text.includes("vaca") || text.includes("asado") || text.includes("aguja")) return "🐄";
  return "🥩";
}

function buildMessage(combo, meta = {}, customer = {}) {
  return buildCustomerWhatsappMessage(combo, meta, {
    customerName: customer?.name || ""
  });
}

export function renderWhatsApp(container, savedCombos = [], meta = {}, options = {}) {
  const combos = Array.isArray(savedCombos) ? [...savedCombos] : [];
  const latestCombos = combos.sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0;
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0;
    return bTime - aTime;
  }).slice(0, 50);

  const lastCustomer = loadLastCustomer(meta);
  let selectedId = latestCombos[0]?.id || "";
  let customerName = String(lastCustomer?.name || "");
  let customerPhone = String(lastCustomer?.phone || "");
  let manualMessage = "";

  function getSelectedCombo() {
    return latestCombos.find((combo) => combo.id === selectedId) || latestCombos[0] || null;
  }

  function draw() {
    const combo = getSelectedCombo();
    const baseMessage = combo ? buildMessage(combo, meta, { name: customerName }) : "";
    const message = manualMessage || baseMessage;
    const normalizedPhone = normalizePhone(customerPhone);
    const waUrl = buildWhatsappShareUrl(message, normalizedPhone);

    container.innerHTML = `

      <div class="wa-shell">
        ${renderCarnizaSpotlight("whatsappPanel", { compact: true })}

        <div class="wa-card wa-header">
          <h2><svg class="ci ci-lg ci--wa" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg>Enviar WhatsApp</h2>
          <p>Elegí una oferta guardada, personalizá el cliente y mandá un mensaje vendedor en segundos.</p>
        </div>

        <div class="wa-mini-grid">
          <div class="wa-mini">1. Elegí oferta</div>
          <div class="wa-mini">2. Cargá cliente</div>
          <div class="wa-mini">3. Enviá</div>
        </div>

        <div class="wa-card">
          ${latestCombos.length ? `
            <div class="wa-row">
              <div class="wa-field">
                <label for="waComboSelect">Oferta a compartir</label>
                <select id="waComboSelect" class="wa-select">
                  ${latestCombos.map((combo) => `<option value="${escapeHtml(combo.id)}" ${combo.id === selectedId ? "selected" : ""}>${escapeHtml(combo.name || "Oferta sin nombre")}</option>`).join("")}
                </select>
              </div>
              <div class="wa-field">
                <label>&nbsp;</label>
                <button class="wa-btn wa-btn--secondary" data-action-panel="builderPanel"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#sell"></use></svg>Crear otra oferta</button>
              </div>
            </div>
          ` : `<div class="wa-empty">Todavía no hay promos o combos guardados. Primero creá uno desde <strong>Vender / Crear promo</strong>.</div>`}
        </div>

        <div class="wa-card">
          <div class="wa-row">
            <div class="wa-field">
              <label for="waCustomerName">Nombre del cliente</label>
              <input id="waCustomerName" class="wa-input" type="text" placeholder="Ej: Juan" value="${escapeHtml(customerName)}" />
            </div>
            <div class="wa-field">
              <label for="waCustomerPhone">Teléfono del cliente</label>
              <input id="waCustomerPhone" class="wa-input" type="tel" inputmode="tel" placeholder="Ej: 3462543210" value="${escapeHtml(customerPhone)}" />
            </div>
          </div>
          <div class="wa-note wa-note--mt8">El último cliente queda recordado en este dispositivo. Si cargás teléfono, WhatsApp se abre directo a ese número.</div>
        </div>

        <div class="wa-card">
          <div class="wa-field">
            <label for="waMessageText">Mensaje editable</label>
            <textarea id="waMessageText" class="wa-textarea">${escapeHtml(message || "")}</textarea>
          </div>
          <div class="wa-actions wa-actions--mt12">
            <button class="wa-btn wa-btn--secondary" id="waResetBtn" ${combo ? "" : "disabled"}><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#refresh"></use></svg>Regenerar mensaje</button>
          </div>
        </div>

        <div class="wa-card">
          <div class="wa-preview-title">Vista previa tipo WhatsApp</div>
          <div class="wa-preview-wrap">
            <div class="wa-bubble">${escapeHtml(message || "Sin mensaje para mostrar")}</div>
          </div>
          <div class="wa-actions wa-actions--mt14">
            <button class="wa-btn wa-btn--primary" id="waOpenBtn" ${combo ? "" : "disabled"}><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#whatsapp"></use></svg>Abrir WhatsApp</button>
            <button class="wa-btn wa-btn--secondary" id="waCopyBtn" ${combo ? "" : "disabled"}><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#copy"></use></svg>Copiar texto</button>
          </div>
          <div class="wa-note wa-note--mt10" id="waFeedback"></div>
        </div>
      </div>
    `;

    const select = container.querySelector("#waComboSelect");
    const nameInput = container.querySelector("#waCustomerName");
    const phoneInput = container.querySelector("#waCustomerPhone");
    const messageInput = container.querySelector("#waMessageText");
    const feedback = container.querySelector("#waFeedback");
    const openBtn = container.querySelector("#waOpenBtn");
    const copyBtn = container.querySelector("#waCopyBtn");
    const resetBtn = container.querySelector("#waResetBtn");

    function setFeedback(text = "") {
      if (feedback) feedback.textContent = text;
    }

    function getLiveMessage() {
      return String(messageInput?.value || "");
    }

    function updatePreview() {
      customerName = nameInput?.value || "";
      customerPhone = phoneInput?.value || "";
      manualMessage = getLiveMessage();
      saveLastCustomer(meta, { name: customerName, phone: customerPhone });

      const bubble = container.querySelector(".wa-bubble");
      if (bubble) bubble.textContent = manualMessage || "Sin mensaje para mostrar";

      const livePhone = normalizePhone(customerPhone);
      const liveUrl = buildWhatsappShareUrl(manualMessage, livePhone);

      if (openBtn) {
        openBtn.onclick = () => {
          saveLastCustomer(meta, { name: customerName, phone: customerPhone });
          if (typeof options?.onBeforeWhatsapp === "function" && options.onBeforeWhatsapp({ source: "whatsapp_panel" }) === false) return;
          window.open(liveUrl, "_blank", "noopener,noreferrer");
        };
      }

      if (copyBtn) {
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(manualMessage);
            setFeedback("✅ Texto copiado. Ahora podés pegarlo donde quieras.");
          } catch (error) {
            setFeedback("No se pudo copiar automáticamente. Seleccioná el texto y copialo manualmente.");
          }
        };
      }
    }

    if (select) {
      select.onchange = () => {
        selectedId = select.value;
        manualMessage = "";
        draw();
      };
    }

    if (nameInput) {
      nameInput.oninput = () => {
        const combo = getSelectedCombo();
        customerName = nameInput.value || "";
        if (combo) {
          manualMessage = buildMessage(combo, meta, { name: customerName });
          if (messageInput) messageInput.value = manualMessage;
        }
        updatePreview();
      };
    }

    if (phoneInput) phoneInput.oninput = updatePreview;
    if (messageInput) messageInput.oninput = updatePreview;

    if (resetBtn) {
      resetBtn.onclick = () => {
        const combo = getSelectedCombo();
        manualMessage = combo ? buildMessage(combo, meta, { name: nameInput?.value || "" }) : "";
        if (messageInput) messageInput.value = manualMessage;
        updatePreview();
        setFeedback("Mensaje regenerado con los datos actuales.");
      };
    }

    updatePreview();
  }

  draw();
}
