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
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function normalizeComparableText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getSavedTitle(combo = {}, items = []) {
  const name = String(combo.name || "").trim();
  if (name && normalizeComparableText(name) !== "oferta del dia") return name;
  const firstItemName = String(items[0]?.nombre || "").trim();
  if (!firstItemName) return "Promo guardada";
  return items.length > 1 ? `${firstItemName} + ${items.length - 1} más` : firstItemName;
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
      .saved-archive-box { border:1px solid #e5e7eb; border-radius:16px; background:#f8fafc; overflow:hidden; }
      .saved-archive-box summary { padding:13px 15px; cursor:pointer; font-weight:950; color:#475569; list-style:none; }
      .saved-archive-box summary::-webkit-details-marker { display:none; }
      .saved-archive-box summary::before { content:"▸"; display:inline-block; margin-right:7px; }
      .saved-archive-box[open] summary::before { content:"▾"; }
      .saved-archive-list { display:flex; flex-direction:column; gap:8px; padding:0 8px 8px; }
      .saved-card.is-archived { border-color:#cbd5e1; background:#fff; }
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
      .saved-publication { border:1px solid #fdba74; border-radius:999px; padding:9px 13px; background:#fff7ed; color:#9a3412; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-publication.is-published { border-color:#86efac; background:#f0fdf4; color:#166534; }
      .saved-duplicate { border:1px solid #bfdbfe; border-radius:999px; padding:9px 13px; background:#eff6ff; color:#1d4ed8; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-edit { border:1px solid #c4b5fd; border-radius:999px; padding:9px 13px; background:#f5f3ff; color:#6d28d9; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-archive { border:1px solid #cbd5e1; border-radius:999px; padding:9px 13px; background:#f8fafc; color:#475569; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-restore { border:1px solid #86efac; border-radius:999px; padding:9px 13px; background:#f0fdf4; color:#166534; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-delete { border:1px solid #fecaca; border-radius:999px; padding:9px 13px; background:#fef2f2; color:#b91c1c; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-publication:disabled, .saved-duplicate:disabled, .saved-edit:disabled, .saved-archive:disabled, .saved-restore:disabled, .saved-delete:disabled, .saved-whatsapp:disabled { opacity:.65; cursor:wait; }
      .saved-whatsapp { border:0; border-radius:999px; padding:9px 13px; background:#16a34a; color:#fff; font-weight:950; cursor:pointer; white-space:nowrap; }
      .saved-status { grid-column:1 / -1; min-height:0; color:#166534; font-size:12px; font-weight:900; text-align:right; }
      .saved-empty { border:1px dashed #d1d5db; border-radius:18px; padding:22px; background:#fff; color:#6b7280; text-align:center; }
      @media (max-width: 760px) { .saved-card { grid-template-columns:1fr auto; align-items:start; } .saved-items { grid-column:1 / -1; } .saved-price { text-align:right; font-size:18px; } .saved-actions { grid-column:1 / -1; display:grid; grid-template-columns:1fr 1fr; } .saved-publication,.saved-duplicate,.saved-edit,.saved-archive,.saved-restore,.saved-delete,.saved-whatsapp { width:100%; } .saved-status{text-align:left;} }
    </style>

    <div class="saved-shell">
      <div class="saved-head">
        <h2>🥩 Promos para repetir</h2>
        <p>Elegí una promo guardada o combo demo y mandalo por WhatsApp.</p>
      </div>
      <div id="savedList" class="saved-list"></div>
      <details id="savedArchiveBox" class="saved-archive-box" hidden>
        <summary id="savedArchiveSummary">Archivadas</summary>
        <div id="savedArchiveList" class="saved-archive-list"></div>
      </details>
    </div>
  `;

  const savedListEl = container.querySelector("#savedList");
  const savedArchiveBox = container.querySelector("#savedArchiveBox");
  const savedArchiveSummary = container.querySelector("#savedArchiveSummary");
  const savedArchiveList = container.querySelector("#savedArchiveList");

  if (!savedCombos.length) {
    savedListEl.innerHTML = `<div class="saved-empty">Todavía no hay combos u ofertas guardadas. Corré el seeder y volvé a entrar a la demo.</div>`;
    return;
  }

  const renderComboCard = (combo, index, archived = false) => {
      if (!combo) return "";
      const items = Array.isArray(combo.items) ? combo.items : [];
      const visibleItems = items.slice(0, 4);
      const extraCount = Math.max(0, items.length - visibleItems.length);
      const itemsText = items.length
        ? visibleItems.map((item) => `• ${escapeHtml(item.nombre || "Producto")} · ${escapeHtml(item.cantidad || item.qty || 0)} ${escapeHtml(item.unidad || item.unit || "kg")}${item.rubro ? ` · ${escapeHtml(item.rubro)}` : ""}`).join("<br>") + (extraCount ? `<br><strong>+${extraCount} producto${extraCount === 1 ? "" : "s"} más</strong>` : "")
        : "Sin detalle";
      const total = combo.total || combo?.snapshot?.totals?.total_redondeado || 0;
      const isPreloaded = combo.isDemoPreloaded;
      const description = String(combo.description || "").trim();
      const normalizedDescription = normalizeComparableText(description);
      const isInternalDescription = [
        "promo o combo creado para guardar publicar y compartir",
        "oferta creada en modo prueba"
      ].includes(normalizedDescription);
      const savedDate = formatDate(combo.createdAt);
      const selectedOffers = Array.isArray(state?.web?.selectedOffers) ? state.web.selectedOffers.map(String) : [];
      const isPublished = !archived && selectedOffers.includes(String(combo.id || combo.comboId || ""));
      const subtitle = isInternalDescription
        ? ""
        : description
          ? `<div class="saved-sub">${escapeHtml(description)}</div>`
          : savedDate
            ? `<div class="saved-sub">Guardada: ${escapeHtml(savedDate)}</div>`
            : "";

      return `
        <article class="saved-card ${isPreloaded ? "demo-preloaded" : ""} ${archived ? "is-archived" : ""}">
          <div class="saved-top">
            <div class="saved-title">${escapeHtml(getSavedTitle(combo, items))}</div>
            ${subtitle}
            ${isPreloaded ? `<span class="saved-badge">Combo demo listo</span>` : ""}
          </div>
          <div class="saved-items">${itemsText}</div>
          <div class="saved-price">${formatCurrency(total)}</div>
          <div class="saved-actions">
            ${archived ? `
            <button type="button" class="saved-restore" data-archive-index="${index}" data-archive-value="false">Restaurar</button>
            <button type="button" class="saved-delete" data-delete-index="${index}">Eliminar definitivamente</button>
            ` : `
            <button type="button" class="saved-publication ${isPublished ? "is-published" : ""}" data-publication-index="${index}" aria-pressed="${isPublished ? "true" : "false"}">${isPublished ? "Despublicar" : "Publicar"}</button>
            <button type="button" class="saved-edit" data-edit-index="${index}">Editar</button>
            <button type="button" class="saved-duplicate" data-duplicate-index="${index}">Duplicar</button>
            <button type="button" class="saved-whatsapp" data-whatsapp-index="${index}">Enviar</button>
            ${isPreloaded ? "" : `<button type="button" class="saved-archive" data-archive-index="${index}" data-archive-value="true">Archivar</button>`}
            `}
          </div>
          <div class="saved-status" data-status-index="${index}">${archived ? "Archivada · no visible en la carnicería online" : isPublished ? "✅ Publicada en tu carnicería online" : ""}</div>
        </article>
      `;
    };

  const activeEntries = savedCombos.map((combo, index) => ({ combo, index })).filter(({ combo }) => combo?.status !== "archived" && combo?.archived !== true);
  const archivedEntries = savedCombos.map((combo, index) => ({ combo, index })).filter(({ combo }) => combo?.status === "archived" || combo?.archived === true);
  savedListEl.innerHTML = activeEntries.length
    ? activeEntries.map(({ combo, index }) => renderComboCard(combo, index, false)).join("")
    : `<div class="saved-empty">No hay promos activas. Podés restaurar una desde Archivadas.</div>`;

  if (archivedEntries.length) {
    savedArchiveBox.hidden = false;
    savedArchiveSummary.textContent = `Archivadas (${archivedEntries.length})`;
    savedArchiveList.innerHTML = archivedEntries.map(({ combo, index }) => renderComboCard(combo, index, true)).join("");
  }

  const interactiveRoot = container;

  interactiveRoot.querySelectorAll("[data-whatsapp-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.whatsappIndex);
      const combo = savedCombos[index];
      if (!combo) return;
      if (!canRunOptionHook(options?.onBeforeWhatsapp, { source: "saved", combo })) return;
      openWhatsapp(combo, options?.businessMeta || {});
    });
  });

  interactiveRoot.querySelectorAll("[data-publication-index]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const currentButton = event.currentTarget;
      const index = Number(currentButton.dataset.publicationIndex);
      const combo = savedCombos[index];
      if (!combo || typeof options?.onTogglePublication !== "function") return;

      const isPublished = currentButton.getAttribute("aria-pressed") === "true";
      const status = savedListEl.querySelector(`[data-status-index="${index}"]`);
      currentButton.disabled = true;
      if (status) status.textContent = isPublished ? "Despublicando..." : "Publicando...";

      try {
        await options.onTogglePublication({ combo, publish: !isPublished });
      } catch (error) {
        console.error("AppPromos: no se pudo actualizar la publicación", error);
        currentButton.disabled = false;
        if (status) status.textContent = "No se pudo actualizar. Probá de nuevo.";
      }
    });
  });

  interactiveRoot.querySelectorAll("[data-duplicate-index]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const currentButton = event.currentTarget;
      const index = Number(currentButton.dataset.duplicateIndex);
      const combo = savedCombos[index];
      if (!combo || typeof options?.onDuplicate !== "function") return;

      const originalText = currentButton.textContent;
      currentButton.disabled = true;
      currentButton.textContent = "Duplicando...";
      try {
        const result = await options.onDuplicate({ combo });
        if (result?.cancelled) {
          currentButton.disabled = false;
          currentButton.textContent = originalText;
        }
      } catch (error) {
        console.error("AppPromos: no se pudo duplicar la promo", error);
        currentButton.disabled = false;
        currentButton.textContent = originalText;
        const status = savedListEl.querySelector(`[data-status-index="${index}"]`);
        if (status) status.textContent = "No se pudo duplicar. Probá de nuevo.";
      }
    });
  });

  interactiveRoot.querySelectorAll("[data-edit-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.editIndex);
      const combo = savedCombos[index];
      if (!combo || typeof options?.onEdit !== "function") return;
      options.onEdit({ combo });
    });
  });

  interactiveRoot.querySelectorAll("[data-archive-index]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const currentButton = event.currentTarget;
      const index = Number(currentButton.dataset.archiveIndex);
      const combo = savedCombos[index];
      const archived = currentButton.dataset.archiveValue === "true";
      if (!combo || typeof options?.onToggleArchive !== "function") return;

      const originalText = currentButton.textContent;
      currentButton.disabled = true;
      currentButton.textContent = archived ? "Archivando..." : "Restaurando...";
      try {
        const result = await options.onToggleArchive({ combo, archived });
        if (result?.cancelled) {
          currentButton.disabled = false;
          currentButton.textContent = originalText;
        }
      } catch (error) {
        console.error("AppPromos: no se pudo actualizar el archivo de promos", error);
        currentButton.disabled = false;
        currentButton.textContent = originalText;
        const status = interactiveRoot.querySelector(`[data-status-index="${index}"]`);
        if (status) status.textContent = "No se pudo actualizar. Probá de nuevo.";
      }
    });
  });

  interactiveRoot.querySelectorAll("[data-delete-index]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const currentButton = event.currentTarget;
      const index = Number(currentButton.dataset.deleteIndex);
      const combo = savedCombos[index];
      if (!combo || typeof options?.onDeleteArchived !== "function") return;

      const originalText = currentButton.textContent;
      currentButton.disabled = true;
      currentButton.textContent = "Eliminando...";
      try {
        const result = await options.onDeleteArchived({ combo });
        if (result?.cancelled) {
          currentButton.disabled = false;
          currentButton.textContent = originalText;
        }
      } catch (error) {
        console.error("AppPromos: no se pudo eliminar la promo", error);
        currentButton.disabled = false;
        currentButton.textContent = originalText;
        const status = interactiveRoot.querySelector(`[data-status-index="${index}"]`);
        if (status) status.textContent = error?.message || "No se pudo eliminar. Probá de nuevo.";
      }
    });
  });
}
