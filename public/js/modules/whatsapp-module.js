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
  const name = String(combo?.name || "Oferta").trim();
  const items = Array.isArray(combo?.items) ? combo.items : [];
  const businessName = meta?.name || meta?.nombre || "Tu carnicería";
  const businessPhone = meta?.telefono || meta?.phone || "";
  const address = meta?.direccion || meta?.address || meta?.city || meta?.ciudad || "";
  const price = Number(combo?.total || combo?.snapshot?.totals?.total_redondeado || 0);
  const customerName = String(customer?.name || "").trim();

  const lines = [];
  if (customerName) lines.push(`Hola ${customerName}! 👋`);
  lines.push(`🔥 ${name.toUpperCase()}`);
  lines.push("");

  items.forEach((item) => {
    const qty = Number(item?.cantidad || 0);
    const unit = item?.unidad || "kg";
    const product = item?.nombre || "Producto";
    const icon = getItemIcon(item?.rubro, product);
    lines.push(`${icon} ${product} — ${qty} ${unit}`);
  });

  lines.push("");
  lines.push(`💰 TOTAL: ${formatCurrency(price)}`);
  lines.push("⏰ Oferta por tiempo limitado / hasta agotar stock");
  lines.push("");
  lines.push(`📍 ${businessName}`);
  if (address) lines.push(`📌 ${address}`);
  if (businessPhone) lines.push(`📲 Consultas: ${businessPhone}`);
  return lines.join("\n");
}

export function renderWhatsApp(container, savedCombos = [], meta = {}) {
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
    const encoded = encodeURIComponent(message);
    const waUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    container.innerHTML = `
      <style>
        .wa-shell { display:flex; flex-direction:column; gap:16px; }
        .wa-card { border:1px solid #ece7df; border-radius:20px; background:#fff; padding:18px; box-shadow:0 4px 14px rgba(17,24,39,.04); }
        .wa-header { background:linear-gradient(180deg,#fff,#fff7f4); }
        .wa-header h2 { margin:0 0 6px; color:#8b1f1f; font-size:28px; line-height:1.1; }
        .wa-header p { margin:0; color:#6b7280; }
        .wa-row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; align-items:end; }
        .wa-select, .wa-input, .wa-textarea { width:100%; min-height:52px; border-radius:15px; border:1px solid #d7d7d7; padding:0 14px; font-size:17px; box-sizing:border-box; background:#fff; }
        .wa-textarea { min-height:180px; padding:14px; line-height:1.45; resize:vertical; }
        .wa-field label { display:block; font-weight:900; margin-bottom:8px; color:#374151; }
        .wa-preview-wrap { background:#efeae2; border-radius:20px; padding:18px; }
        .wa-bubble { max-width:680px; margin-left:auto; background:#dcf8c6; border-radius:18px 18px 6px 18px; padding:15px 17px; box-shadow:0 2px 8px rgba(0,0,0,.10); white-space:pre-wrap; line-height:1.48; font-size:16px; color:#0f172a; }
        .wa-actions { display:flex; gap:12px; flex-wrap:wrap; }
        .wa-btn { min-height:52px; padding:0 18px; border:none; border-radius:15px; cursor:pointer; font-weight:950; font-size:16px; }
        .wa-btn--primary { background:#128c7e; color:#fff; }
        .wa-btn--secondary { background:#fff; color:#374151; border:1px solid #d1d5db; }
        .wa-btn:disabled { opacity:.5; cursor:not-allowed; }
        .wa-note { color:#6b7280; font-size:13px; }
        .wa-empty { color:#6b7280; line-height:1.45; }
        .wa-mini-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .wa-mini { border:1px solid #f0d7d1; border-radius:16px; padding:12px; background:#fffaf7; color:#8b1f1f; font-weight:900; text-align:center; }
        @media (max-width: 760px) {
          .wa-row, .wa-mini-grid { grid-template-columns:1fr; }
          .wa-actions { flex-direction:column; }
          .wa-btn { width:100%; }
          .wa-header h2 { font-size:24px; }
        }
      </style>

      <div class="wa-shell">
        <div class="wa-card wa-header">
          <h2>📤 Enviar WhatsApp</h2>
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
                <button class="wa-btn wa-btn--secondary" data-action-panel="builderPanel">🔥 Crear otra oferta</button>
              </div>
            </div>
          ` : `<div class="wa-empty">Todavía no hay ofertas guardadas. Primero creá una desde <strong>Crear oferta</strong>.</div>`}
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
          <div class="wa-note" style="margin-top:8px;">El último cliente queda recordado en este dispositivo. Si cargás teléfono, WhatsApp se abre directo a ese número.</div>
        </div>

        <div class="wa-card">
          <div class="wa-field">
            <label for="waMessageText">Mensaje editable</label>
            <textarea id="waMessageText" class="wa-textarea">${escapeHtml(message || "")}</textarea>
          </div>
          <div class="wa-actions" style="margin-top:12px;">
            <button class="wa-btn wa-btn--secondary" id="waResetBtn" ${combo ? "" : "disabled"}>↩️ Regenerar mensaje</button>
          </div>
        </div>

        <div class="wa-card">
          <div style="font-weight:900; margin-bottom:10px;">Vista previa tipo WhatsApp</div>
          <div class="wa-preview-wrap">
            <div class="wa-bubble">${escapeHtml(message || "Sin mensaje para mostrar")}</div>
          </div>
          <div class="wa-actions" style="margin-top:14px;">
            <button class="wa-btn wa-btn--primary" id="waOpenBtn" ${combo ? "" : "disabled"}>📤 Abrir WhatsApp</button>
            <button class="wa-btn wa-btn--secondary" id="waCopyBtn" ${combo ? "" : "disabled"}>📋 Copiar texto</button>
          </div>
          <div class="wa-note" id="waFeedback" style="margin-top:10px;"></div>
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
      const liveUrl = livePhone
        ? `https://wa.me/${livePhone}?text=${encodeURIComponent(manualMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(manualMessage)}`;

      if (openBtn) {
        openBtn.onclick = () => {
          saveLastCustomer(meta, { name: customerName, phone: customerPhone });
          window.open(liveUrl, "_blank");
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
