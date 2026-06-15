import { buildCustomerWhatsappMessage, openCustomerWhatsappMessage } from "../services/whatsapp-message-service.js";
import {
  formatCurrency,
  normalizeSavedCombosFromState
} from "../services/business-service.js";

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toWhatsappSafeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

function formatQty(value) {
  const number = Number(value || 1);
  if (!Number.isFinite(number)) return "1";
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function buildWhatsappText(combo, businessMeta = {}) {
  return buildCustomerWhatsappMessage(combo, businessMeta);
}

function openWhatsapp(combo, businessMeta = {}) {
  return openCustomerWhatsappMessage(combo, businessMeta);
}

function canRunOptionHook(hook, payload) {
  if (typeof hook !== "function") return true;
  try {
    return hook(payload) !== false;
  } catch (error) {
    console.warn("AppPromos: no se pudo validar el envío de demo", error);
    return true;
  }
}

export function renderSaved(container, state, options = {}) {
  const savedCombos = normalizeSavedCombosFromState(state)
    .slice()
    .sort((a, b) => {
      const preA = a?.isDemoPreloaded ? 1 : 0;
      const preB = b?.isDemoPreloaded ? 1 : 0;
      if (preA !== preB) return preB - preA;
      return (Date.parse(b?.updatedAt || b?.createdAt || 0) || 0) - (Date.parse(a?.updatedAt || a?.createdAt || 0) || 0);
    });

  container.innerHTML = `
    <style>
      .saved-shell { display:flex; flex-direction:column; gap:14px; }
      .saved-head { border:1px solid #ece7df; border-radius:18px; padding:18px; background:#fff; }
      .saved-head h2 { margin:0 0 6px; color:#8b1f1f; }
      .saved-head p { margin:0; color:#6b7280; }
      .saved-list { display:flex; flex-direction:column; gap:8px; }
      .saved-card { border:1px solid #dbeafe; border-radius:14px; padding:10px 12px; background:#fff; display:grid; grid-template-columns:minmax(220px,1fr) minmax(120px,auto) auto; gap:8px 12px; align-items:center; }
      .saved-card.demo-preloaded { border-color:#f0c36d; background:#fffaf0; }
      .saved-top { display:block; min-width:0; }
      .saved-title { font-size:16px; font-weight:1000; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .saved-sub { color:#64748b; margin-top:2px; font-size:12px; font-weight:800; }
      .saved-badge { display:inline-flex; margin-top:4px; padding:3px 7px; border-radius:999px; background:#fde68a; color:#78350f; font-size:11px; font-weight:900; }
      .saved-price { color:#8b1f1f; font-size:18px; font-weight:1000; white-space:nowrap; text-align:right; }
      .saved-items { grid-column:1 / -1; color:#374151; font-size:12px; line-height:1.28; font-weight:850; background:#f8fafc; border:1px solid #e5e7eb; border-radius:11px; padding:7px 9px; }
      .saved-items strong { color:#111827; }
      .saved-actions { display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
      .saved-whatsapp { border:0; border-radius:999px; padding:9px 13px; background:#16a34a; color:#fff; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-empty { border:1px dashed #d1d5db; border-radius:18px; padding:22px; background:#fff; color:#6b7280; text-align:center; }
      @media (max-width: 760px) { .saved-card { grid-template-columns:1fr auto; align-items:start; } .saved-items { grid-column:1 / -1; } .saved-price { text-align:right; font-size:18px; } .saved-actions { grid-column:1 / -1; justify-content:stretch; } .saved-whatsapp { width:100%; } }
    </style>

    <div class="saved-shell">
      <div class="saved-head">
        <h2>🥩 Promos para repetir</h2>
        <p>Elegí una promo guardada o combo demo y mandalo por WhatsApp.</p>
      </div>
      <div id="savedList" class="saved-list"></div>
    </div>
  `;

  const savedListEl = container.querySelector("#savedList");

  if (!savedCombos.length) {
    savedListEl.innerHTML = `<div class="saved-empty">Todavía no hay combos u ofertas guardadas. Corré el seeder y volvé a entrar a la demo.</div>`;
    return;
  }

  savedListEl.innerHTML = savedCombos
    .map((combo, index) => {
      const items = Array.isArray(combo.items) ? combo.items : [];
      const visibleItems = items.slice(0, 4);
      const extraCount = Math.max(0, items.length - visibleItems.length);
      const itemsText = items.length
        ? visibleItems.map((item) => `• ${escapeHtml(item.nombre || "Producto")} · ${escapeHtml(item.cantidad || item.qty || 0)} ${escapeHtml(item.unidad || item.unit || "kg")}${item.rubro ? ` · ${escapeHtml(item.rubro)}` : ""}`).join("<br>") + (extraCount ? `<br><strong>+${extraCount} producto${extraCount === 1 ? "" : "s"} más</strong>` : "")
        : "Sin detalle";
      const total = combo.total || combo?.snapshot?.totals?.total_redondeado || 0;
      const isPreloaded = combo.isDemoPreloaded;

      return `
        <article class="saved-card ${isPreloaded ? "demo-preloaded" : ""}">
          <div class="saved-top">
            <div class="saved-title">${escapeHtml(combo.name || "Promo sin nombre")}</div>
            ${combo.description ? `<div class="saved-sub">${escapeHtml(combo.description)}</div>` : `<div class="saved-sub">Guardada: ${escapeHtml(formatDate(combo.createdAt))}</div>`}
            ${isPreloaded ? `<span class="saved-badge">Combo demo listo</span>` : ""}
          </div>
          <div class="saved-items">${itemsText}</div>
          <div class="saved-price">${formatCurrency(total)}</div>
          <div class="saved-actions">
            <button type="button" class="saved-whatsapp" data-whatsapp-index="${index}">Enviar</button>
          </div>
        </article>
      `;
    })
    .join("");

  savedListEl.querySelectorAll("[data-whatsapp-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.whatsappIndex);
      const combo = savedCombos[index];
      if (!combo) return;
      if (!canRunOptionHook(options?.onBeforeWhatsapp, { source: "saved", combo })) return;
      openWhatsapp(combo, options?.businessMeta || {});
    });
  });
}
