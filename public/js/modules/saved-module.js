import { buildCustomerWhatsappMessage, openCustomerWhatsappMessage } from "../services/whatsapp-message-service.js";
import {
  formatCurrency,
  normalizeSavedCombosFromState
} from "../services/business-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";

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

    <div class="saved-shell">
      ${renderCarnizaSpotlight("savedPanel", { compact: true })}

      <div class="saved-head">
        <h2><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#star"></use></svg>Promos para repetir</h2>
        <p>Elegí una promo guardada o combo demo y mandalo por WhatsApp.</p>
      </div>
      <div class="saved-filters" aria-label="Filtros de promos guardadas">
        <label class="saved-filter-field saved-filter-search">Buscar
          <input id="savedFilterSearch" type="search" placeholder="Nombre o producto" autocomplete="off" />
        </label>
        <label class="saved-filter-field">Tipo
          <select id="savedFilterCategory"><option value="all">Todos los tipos</option></select>
        </label>
        <label class="saved-filter-field">Cantidad
          <select id="savedFilterWeight"><option value="all">Todos los kilos</option></select>
        </label>
        <div id="savedFilterResult" class="saved-filter-result"></div>
      </div>
      <div id="savedList" class="saved-list"></div>
      <details id="savedArchiveBox" class="saved-archive-box" hidden>
        <summary id="savedArchiveSummary">Archivadas</summary>
        <div id="savedArchiveList" class="saved-archive-list"></div>
      </details>
    </div>
  `;

  const savedListEl = container.querySelector("#savedList");
  const savedFilterSearch = container.querySelector("#savedFilterSearch");
  const savedFilterCategory = container.querySelector("#savedFilterCategory");
  const savedFilterWeight = container.querySelector("#savedFilterWeight");
  const savedFilterResult = container.querySelector("#savedFilterResult");
  const savedArchiveBox = container.querySelector("#savedArchiveBox");
  const savedArchiveSummary = container.querySelector("#savedArchiveSummary");
  const savedArchiveList = container.querySelector("#savedArchiveList");

  if (!savedCombos.length) {
    savedListEl.innerHTML = `<div class="saved-empty">Todavía no guardaste promos. Armá tu primera promo desde Vender → Crear promo o combo y va a quedar acá para repetirla cuando quieras.</div>`;
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
        <article class="saved-card ${isPreloaded ? "demo-preloaded" : ""} ${archived ? "is-archived" : ""}" data-saved-card-index="${index}">
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
  const categories = [...new Set(activeEntries.map(({ combo }) => getComboCategory(combo)))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "es"));
  const weights = [...new Set(activeEntries.map(({ combo }) => getComboWeightKg(combo)).filter((value) => value > 0))].sort((a, b) => a - b);
  savedFilterCategory?.insertAdjacentHTML("beforeend", categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(categoryLabel(value))}</option>`).join(""));
  savedFilterWeight?.insertAdjacentHTML("beforeend", weights.map((value) => `<option value="${value}">${escapeHtml(formatWeight(value))} kg</option>`).join(""));
  savedListEl.innerHTML = activeEntries.length
    ? `${activeEntries.map(({ combo, index }) => renderComboCard(combo, index, false)).join("")}<div id="savedFilterEmpty" class="saved-empty" hidden>No encontramos promos con esos filtros.</div>`
    : `<div class="saved-empty">No hay promos activas. Podés restaurar una desde Archivadas.</div>`;
  const savedFilterEmpty = savedListEl.querySelector("#savedFilterEmpty");

  const renderFilteredEntries = () => {
    const query = normalizeComparableText(savedFilterSearch?.value || "");
    const category = savedFilterCategory?.value || "all";
    const weight = savedFilterWeight?.value || "all";
    const filtered = activeEntries.filter(({ combo }) => {
      const items = Array.isArray(combo?.items) ? combo.items : [];
      const haystack = normalizeComparableText(`${getSavedTitle(combo, items)} ${items.map((item) => item?.nombre || "").join(" ")}`);
      if (query && !haystack.includes(query)) return false;
      if (category !== "all" && getComboCategory(combo) !== category) return false;
      if (weight !== "all" && Math.abs(getComboWeightKg(combo) - Number(weight)) > 0.001) return false;
      return true;
    });
    const visibleIndexes = new Set(filtered.map(({ index }) => String(index)));
    savedListEl.querySelectorAll("[data-saved-card-index]").forEach((card) => {
      card.hidden = !visibleIndexes.has(String(card.dataset.savedCardIndex));
    });
    if (savedFilterEmpty) savedFilterEmpty.hidden = filtered.length > 0;
    if (savedFilterResult) savedFilterResult.textContent = `${filtered.length} de ${activeEntries.length} promos`;
  };

  renderFilteredEntries();
  savedFilterSearch?.addEventListener("input", renderFilteredEntries);
  savedFilterCategory?.addEventListener("change", renderFilteredEntries);
  savedFilterWeight?.addEventListener("change", renderFilteredEntries);

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
      document.dispatchEvent(new CustomEvent("apppromos:seller-whatsapp", {
        detail: { source: "saved" }
      }));
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

function getComboWeightKg(combo = {}) {
  return (Array.isArray(combo.items) ? combo.items : []).reduce((total, item = {}) => {
    const unit = normalizeComparableText(item.unidad || item.unit || "kg");
    if (unit && !["kg", "kgs", "kilo", "kilos", "kilogramo", "kilogramos"].includes(unit)) return total;
    const quantity = Number(item.cantidad ?? item.qty ?? item.quantity ?? 0);
    return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

function getComboCategory(combo = {}) {
  const categories = [...new Set((Array.isArray(combo.items) ? combo.items : [])
    .map((item = {}) => normalizeComparableText(item.rubro || item.category || item.categoria || ""))
    .filter(Boolean))];
  if (categories.length > 1) return "mixed";
  return categories[0] ? `single:${categories[0]}` : "uncategorized";
}

function categoryLabel(value = "") {
  if (value === "mixed") return "Mixtas";
  if (value === "uncategorized") return "Sin rubro";
  const name = String(value).replace(/^single:/, "");
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Sin rubro";
}

function formatWeight(value = 0) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2))).replace(".", ",");
}
