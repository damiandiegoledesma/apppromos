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

export function renderSaved(container, state) {
  const savedCombos = normalizeSavedCombosFromState(state)
    .slice()
    .sort((a, b) => (Date.parse(b?.updatedAt || b?.createdAt || 0) || 0) - (Date.parse(a?.updatedAt || a?.createdAt || 0) || 0));

  container.innerHTML = `
    <style>
      .saved-shell { display:flex; flex-direction:column; gap:14px; }
      .saved-head { border:1px solid #ece7df; border-radius:18px; padding:18px; background:#fff; }
      .saved-head h2 { margin:0 0 6px; color:#8b1f1f; }
      .saved-head p { margin:0; color:#6b7280; }
      .saved-list { display:flex; flex-direction:column; gap:10px; }
      .saved-card { border:1px solid #ece7df; border-radius:18px; padding:16px; background:#fff; }
      .saved-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
      .saved-title { font-size:17px; font-weight:900; color:#111827; }
      .saved-sub { color:#6b7280; margin-top:4px; font-size:13px; }
      .saved-price { color:#8b1f1f; font-size:22px; font-weight:900; white-space:nowrap; }
      .saved-items { margin:10px 0 0; color:#374151; font-size:14px; line-height:1.45; }
      .saved-empty { border:1px dashed #d1d5db; border-radius:18px; padding:22px; background:#fff; color:#6b7280; text-align:center; }
      @media (max-width: 640px) { .saved-top { flex-direction:column; } .saved-price { font-size:24px; } }
    </style>

    <div class="saved-shell">
      <div class="saved-head">
        <h2>💾 Ofertas guardadas</h2>
        <p>Acá aparecen las ofertas que guardás desde Crear oferta. Después se usan para WhatsApp.</p>
      </div>
      <div id="savedList" class="saved-list"></div>
    </div>
  `;

  const savedListEl = container.querySelector("#savedList");

  if (!savedCombos.length) {
    savedListEl.innerHTML = `<div class="saved-empty">Todavía no hay ofertas guardadas. Primero creá una oferta y tocá <strong>Guardar oferta</strong>.</div>`;
    return;
  }

  savedListEl.innerHTML = savedCombos
    .map((combo) => {
      const items = Array.isArray(combo.items) ? combo.items : [];
      const itemsText = items.length
        ? items.map((item) => `• ${escapeHtml(item.nombre || "Producto")} · ${escapeHtml(item.cantidad || 0)} ${escapeHtml(item.unidad || "kg")}`).join("<br>")
        : "Sin detalle";
      const total = combo.total || combo?.snapshot?.totals?.total_redondeado || 0;

      return `
        <article class="saved-card">
          <div class="saved-top">
            <div>
              <div class="saved-title">${escapeHtml(combo.name || "Oferta sin nombre")}</div>
              <div class="saved-sub">Guardada: ${escapeHtml(formatDate(combo.createdAt))}</div>
            </div>
            <div class="saved-price">${formatCurrency(total)}</div>
          </div>
          <div class="saved-items">${itemsText}</div>
        </article>
      `;
    })
    .join("");
}
