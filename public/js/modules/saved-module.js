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

function buildWhatsappText(combo) {
  const items = Array.isArray(combo?.items) ? combo.items : [];
  const title = toWhatsappSafeText(String(combo?.name || "OFERTA DEL DIA").toUpperCase());
  const lines = [title, ""];

  for (const item of items) {
    const cantidad = formatQty(item.cantidad || 1);
    const unidad = toWhatsappSafeText(item.unidad || "kg");
    const nombre = toWhatsappSafeText(item.nombre || "Producto");
    lines.push(`- ${cantidad} ${unidad} ${nombre}`);
  }

  const total = combo.total || combo?.snapshot?.totals?.total_redondeado || 0;
  lines.push(
    "",
    `Total: ${formatCurrency(total)}`,
    "",
    "Oferta por tiempo limitado / hasta agotar stock.",
    "Carniceria de Carniza"
  );
  return lines.join("\n");
}

function openWhatsapp(combo) {
  const text = buildWhatsappText(combo);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function renderSaved(container, state) {
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
      .saved-list { display:flex; flex-direction:column; gap:10px; }
      .saved-card { border:1px solid #ece7df; border-radius:18px; padding:16px; background:#fff; }
      .saved-card.demo-preloaded { border-color:#f0c36d; background:#fffaf0; }
      .saved-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .saved-title { font-size:17px; font-weight:900; color:#111827; }
      .saved-sub { color:#6b7280; margin-top:4px; font-size:13px; }
      .saved-badge { display:inline-flex; margin-top:8px; padding:4px 8px; border-radius:999px; background:#fde68a; color:#78350f; font-size:12px; font-weight:800; }
      .saved-price { color:#8b1f1f; font-size:22px; font-weight:900; white-space:nowrap; }
      .saved-items { margin:10px 0 0; color:#374151; font-size:14px; line-height:1.45; }
      .saved-actions { margin-top:12px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
      .saved-whatsapp { border:0; border-radius:999px; padding:10px 14px; background:#16a34a; color:#fff; font-weight:900; cursor:pointer; }
      .saved-empty { border:1px dashed #d1d5db; border-radius:18px; padding:22px; background:#fff; color:#6b7280; text-align:center; }
      @media (max-width: 640px) { .saved-top { flex-direction:column; } .saved-price { font-size:24px; } .saved-actions { justify-content:stretch; } .saved-whatsapp { width:100%; } }
    </style>

    <div class="saved-shell">
      <div class="saved-head">
        <h2>🥩 Combos y ofertas listas</h2>
        <p>Elegí un combo de la demo o una oferta guardada y mandala por WhatsApp.</p>
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
      const itemsText = items.length
        ? items.map((item) => `• ${escapeHtml(item.nombre || "Producto")} · ${escapeHtml(item.cantidad || 0)} ${escapeHtml(item.unidad || "kg")}${item.rubro ? ` · ${escapeHtml(item.rubro)}` : ""}`).join("<br>")
        : "Sin detalle";
      const total = combo.total || combo?.snapshot?.totals?.total_redondeado || 0;
      const isPreloaded = combo.isDemoPreloaded;

      return `
        <article class="saved-card ${isPreloaded ? "demo-preloaded" : ""}">
          <div class="saved-top">
            <div>
              <div class="saved-title">${escapeHtml(combo.name || "Oferta sin nombre")}</div>
              ${combo.description ? `<div class="saved-sub">${escapeHtml(combo.description)}</div>` : `<div class="saved-sub">Guardada: ${escapeHtml(formatDate(combo.createdAt))}</div>`}
              ${isPreloaded ? `<span class="saved-badge">Combo demo listo</span>` : ""}
            </div>
            <div class="saved-price">${formatCurrency(total)}</div>
          </div>
          <div class="saved-items">${itemsText}</div>
          <div class="saved-actions">
            <button type="button" class="saved-whatsapp" data-whatsapp-index="${index}">Enviar por WhatsApp</button>
          </div>
        </article>
      `;
    })
    .join("");

  savedListEl.querySelectorAll("[data-whatsapp-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.whatsappIndex);
      const combo = savedCombos[index];
      if (combo) openWhatsapp(combo);
    });
  });
}
