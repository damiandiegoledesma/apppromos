import {
  updateProduct,
  disableProduct,
  updateProductPricesBatch
} from "../services/data-service.js";
import { activateStarterWebFromProducts } from "../services/web-premium-service.js";
import { trackFirstPriceSaved } from "../services/tracking-service.js";
import { getProductThumbnailPath } from "../services/product-image-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";

function parsePriceInputValue(value) {
  const cleaned = String(value ?? "")
    .replace(/[^0-9]/g, "");
  const numeric = Number(cleaned || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatPriceInputValue(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return "$ " + Math.round(numeric).toLocaleString("es-AR");
}

function roundUpTo100(value) {
  const numeric = Number(value || 0);
  if (numeric <= 0) return 0;
  return Math.ceil(numeric / 100) * 100;
}

function roundPriceForMassAdjustment(value, percent = 0) {
  const numeric = Number(value || 0);
  const adjustment = Number(percent || 0);

  if (numeric <= 0) return 0;

  if (adjustment < 0) {
    return Math.max(100, Math.floor(numeric / 100) * 100);
  }

  return roundUpTo100(numeric);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function renderPrices(container, products = [], businessId = null, options = {}) {
  const safeProducts = Array.isArray(products) ? [...products] : [];
  const pendingChanges = {};
  const onProductsUpdated = typeof options.onProductsUpdated === "function"
    ? options.onProductsUpdated
    : null;
  const onPricesSaved = typeof options.onPricesSaved === "function"
    ? options.onPricesSaved
    : null;
  const canWrite = options.canWrite !== false;
  const isDemoPriceSession =
    businessId === "demo" ||
    options.isDemoMode === true ||
    new URLSearchParams(window.location.search || "").get("demo") === "1" ||
    new URLSearchParams(window.location.search || "").get("mode") === "demo";
  const canPersistPrices = canWrite || isDemoPriceSession;
  const writeBlockMessage = isDemoPriceSession
    ? "Estás probando Carnis. Estos cambios quedan solo en esta demo."
    : (options.writeBlockMessage || "Tu cuenta está en modo consulta. Para volver a guardar cambios, regularizá tu plan.");

  let searchTerm = "";
  let rubroFilter = "";
  let sortField = "nombre";
  let sortDirection = "asc";
  let isSaving = false;
  let statusMode = "idle";
  let statusMessage = "Sin cambios";
  let lastSavedAt = "";
  let lastMassAdjustment = null;
  let usageFilter = "active";

  const initialSelectedRubros = [...new Set(
    (Array.isArray(options.selectedRubros) ? options.selectedRubros : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];

  const rubrosWithRealPrice = [...new Set(
    safeProducts
      .filter((product = {}) => {
        const price = Number(product.precio ?? product.price ?? 0);
        return product.active !== false &&
          product.activo !== false &&
          Number.isFinite(price) &&
          price > 0;
      })
      .map((product = {}) => String(product.rubro || "").trim())
      .filter(Boolean)
  )];

  const preferredRubros = new Set([...initialSelectedRubros, ...rubrosWithRealPrice]);
  let showAllRubros = preferredRubros.size === 0;

  async function updateLocalProducts(updatedProducts = [], updateResult = null) {
    safeProducts.splice(0, safeProducts.length, ...updatedProducts);
    await onProductsUpdated?.(updatedProducts, updateResult);
  }

  function showToast(message, tone = "ok") {
    const toast = container.querySelector("#pricesToast");
    if (!toast) return;

    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
    }, 2200);
  }

  function getPendingCount() {
    return Object.keys(pendingChanges).length;
  }

  function isProductVisibleByUsage(product = {}) {
    const isActive = product.active !== false;
    if (usageFilter === "inactive") return !isActive;
    if (usageFilter === "all") return true;
    return isActive;
  }

  function getRubros() {
    const set = new Set();
    safeProducts.forEach((p) => {
      if (!isProductVisibleByUsage(p)) return;

      const rubro = String(p.rubro || "").trim();
      if (!rubro) return;

      const allowedByPreference =
        showAllRubros ||
        preferredRubros.size === 0 ||
        preferredRubros.has(rubro);

      if (allowedByPreference) set.add(rubro);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }

  function updateUsageFilterButtons() {
    container.querySelectorAll("[data-use-filter]").forEach((btn) => {
      const active = btn.dataset.useFilter === usageFilter;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function getVisibleItems() {
    const items = safeProducts.filter((p) => {
      if (!isProductVisibleByUsage(p)) return false;

      const nombre = String(p.nombre || "").toLowerCase();
      const rubro = String(p.rubro || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchSearch = !term || nombre.includes(term) || rubro.includes(term);
      const matchRubro = !rubroFilter || rubro === rubroFilter.toLowerCase();
      const matchPreferredRubro =
        showAllRubros ||
        preferredRubros.size === 0 ||
        preferredRubros.has(String(p.rubro || "").trim());

      return matchSearch && matchRubro && matchPreferredRubro;
    });

    items.sort((a, b) => {
      const valA = sortField === "precio"
        ? Number(a.precio || 0)
        : String(a.nombre || "").toLowerCase();
      const valB = sortField === "precio"
        ? Number(b.precio || 0)
        : String(b.nombre || "").toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }

  function getRubroIcon(rubro = "") {
    const r = String(rubro || "").toLowerCase();
    if (r.includes("novillo") || r.includes("vaca") || r.includes("vacuno")) return "🐄";
    if (r.includes("cerdo") || r.includes("chancho") || r.includes("porcino")) return "🐖";
    if (r.includes("pollo") || r.includes("ave")) return "🐔";
    if (r.includes("embut")) return "🥓";
    if (r.includes("achura")) return "🍖";
    return "🏷️";
  }

  function getProductUnitLabel(product = {}) {
    const raw = String(
      product.unidad ||
      product.unit ||
      product.medida ||
      product.priceUnit ||
      product.tipoVenta ||
      ""
    ).toLowerCase();

    if (raw.includes("un") || raw.includes("unidad") || raw.includes("pieza")) return "/un";
    return "/kg";
  }

  function setStatus(mode = "idle", message = "") {
    statusMode = mode;
    statusMessage = message || statusMessage;

    const badge = container.querySelector("#pricePendingStatus");
    const saveAllBtn = container.querySelector("#saveAllBtn");
    const summary = container.querySelector("#pricesSummary");
    const desktopFloating = container.querySelector("#pricesDesktopFloatingSummary");
    const desktopFloatingText = container.querySelector("#pricesDesktopFloatingText");
    const desktopFloatingSave = container.querySelector("#pricesDesktopFloatingSave");
    const undoMassBtn = container.querySelector("#undoMassAdjustmentBtn");
    const massNote = container.querySelector("#massAdjustmentNote");
    const massText = container.querySelector("#massAdjustmentText");
    const pendingCount = getPendingCount();

    if (badge) {
      badge.dataset.mode = mode;
      badge.textContent = statusMessage;
    }

    if (saveAllBtn) {
      saveAllBtn.disabled = !canPersistPrices || isSaving || pendingCount === 0;
      saveAllBtn.textContent = !canPersistPrices
        ? (isDemoPriceSession ? "💾 Guardar cambios de prueba" : "🔒 Para guardar, ponete al día")
        : isSaving
          ? "⏳ Guardando..."
          : pendingCount > 0
            ? `💾 Guardar ${pendingCount} cambio${pendingCount === 1 ? "" : "s"}`
            : "Guardar";
    }

    if (summary) {
      const visibleCount = getVisibleItems().length;
      summary.innerHTML = `
        <strong>${visibleCount}</strong> producto${visibleCount === 1 ? "" : "s"} visibles ·
        <strong>${pendingCount}</strong> cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}
        ${lastSavedAt ? ` · Último guardado: ${lastSavedAt}` : ""}
      `;
    }

    if (desktopFloating) {
      desktopFloating.classList.toggle("is-visible", pendingCount > 0 || isSaving);
    }

    if (desktopFloatingText) {
      desktopFloatingText.textContent = isSaving
        ? "Guardando tus precios..."
        : `${pendingCount} precio${pendingCount === 1 ? "" : "s"} modificado${pendingCount === 1 ? "" : "s"} sin guardar`;
    }

    if (desktopFloatingSave) {
      desktopFloatingSave.disabled = !canPersistPrices || isSaving || pendingCount === 0;
      desktopFloatingSave.textContent = isSaving
        ? "Guardando..."
        : `Guardar ${pendingCount || ""}`.trim();
    }
    
    const canUndoMassAdjustment = !!lastMassAdjustment && pendingCount > 0 && !isSaving;
    if (massNote) massNote.hidden = !canUndoMassAdjustment;
    if (undoMassBtn) {
      undoMassBtn.hidden = !canUndoMassAdjustment;
      undoMassBtn.disabled = !canUndoMassAdjustment;
      undoMassBtn.textContent = "Deshacer";
    }
    if (massText) {
      if (lastMassAdjustment) {
        const sign = lastMassAdjustment.percent > 0 ? "+" : "";
        const label = sign + lastMassAdjustment.percent + "%";
        const count = lastMassAdjustment.count || 0;
        massText.textContent = label + " aplicado a " + lastMassAdjustment.rubroLabel + " · " + count + " producto" + (count === 1 ? "" : "s");
      } else {
        massText.textContent = "";
      }
    }
  }

  function refreshIdleStatus() {
    const pendingCount = getPendingCount();
    if (pendingCount > 0) {
      setStatus("pending", `${pendingCount} cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`);
    } else if (!canPersistPrices) {
      setStatus("error", "🔒 Para guardar, ponete al día por estado de cuenta");
    } else if (isDemoPriceSession) {
      setStatus("idle", "Estás probando Carnis. Estos cambios quedan solo en esta demo.");
    } else {
      setStatus("idle", "Sin cambios");
    }
  }

  function blockWriteAttempt() {
    setStatus("error", "🔒 Para guardar, ponete al día por estado de cuenta");
    showToast("Para guardar cambios, ponete al día", "warn");
    return false;
  }

  async function persistChanges(changes) {
    if (!canPersistPrices) {
      blockWriteAttempt();
      throw new Error(writeBlockMessage);
    }
    isSaving = true;
    setStatus("saving", "Guardando cambios...");

    const result = await updateProductPricesBatch(changes, businessId);
    const updatedProducts = result.updatedProducts || safeProducts;
    if (Number(result?.changed || 0) > 0) {
      await onPricesSaved?.(result);
    }
    /* V12.23-A3: esperamos la regeneración pública antes de confirmar el guardado. */
    await updateLocalProducts(updatedProducts, result);

    let webActivation = null;
    if (!isDemoPriceSession && result?.changed > 0) {
      try {
        webActivation = await activateStarterWebFromProducts(businessId, updatedProducts);
        if (webActivation?.activated) {
          trackFirstPriceSaved({
            source: "prices_first_real_save",
            business_id: businessId,
            priced_products: webActivation.pricedCount || 0
          });
          window.dispatchEvent(new CustomEvent("apppromos:web-auto-ready", {
            detail: {
              businessId,
              publicUrl: webActivation.publicUrl || "",
              pricedCount: webActivation.pricedCount || 0
            }
          }));
        }
      } catch (webError) {
        // Guardar precios es lo prioritario. Si la publicación automática falla,
        // no revertimos ni bloqueamos el trabajo del carnicero.
        console.warn("No se pudo actualizar automáticamente la vidriera", webError);
      }
    }

    Object.keys(changes).forEach((id) => {
      delete pendingChanges[id];
    });

    lastMassAdjustment = null;

    lastSavedAt = new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    isSaving = false;
    draw();
    const promosUpdated = Number(result?.promosUpdated || 0);
    const publishedPromosUpdated = Number(result?.publishedPromosUpdated || 0);
    const promoUpdateText = promosUpdated > 0
      ? ` · ${promosUpdated} promo${promosUpdated === 1 ? "" : "s"} actualizada${promosUpdated === 1 ? "" : "s"}`
      : "";
    const savedStatus = webActivation?.activated
      ? `✅ Guardado · Vidriera actualizada${promoUpdateText}`
      : (isDemoPriceSession ? "Guardado en esta demo" : `✅ Guardado${promoUpdateText}`);
    const savedToast = publishedPromosUpdated > 0
      ? `Precios guardados. Actualizamos ${promosUpdated} promo${promosUpdated === 1 ? "" : "s"} y ${publishedPromosUpdated} publicación${publishedPromosUpdated === 1 ? "" : "es"}`
      : promosUpdated > 0
        ? `Precios guardados. También actualizamos ${promosUpdated} promo${promosUpdated === 1 ? "" : "s"}`
      : webActivation?.activated
        ? "¡Listo! Tus precios ya están en tu carnicería online"
        : (isDemoPriceSession ? "Cambio guardado en esta demo" : "Cambios guardados");
    setStatus("saved", savedStatus);
    showToast(savedToast, "ok");
  }

  async function saveAllPendingChanges() {
    const ids = Object.keys(pendingChanges);
    if (!ids.length) {
      showToast("No hay cambios para guardar", "warn");
      return;
    }
    if (!businessId) {
      showToast("No se pudo identificar la carnicería activa", "error");
      return;
    }
    if (!canPersistPrices) {
      blockWriteAttempt();
      return;
    }

    try {
      await persistChanges({ ...pendingChanges });
    } catch (error) {
      console.error("Error guardando cambios masivos:", error);
      isSaving = false;
      setStatus("error", error?.message || "No se pudieron guardar los cambios");
      showToast("Error al guardar cambios", "error");
    }
  }

  function getSortLabel(field) {
    const base = field === "nombre" ? "🔤 Nombre" : "💲 Precio";
    if (sortField !== field) return base;
    return `${base} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  function renderRubroButtons() {
    const wrap = container.querySelector("#rubroButtons");
    if (!wrap) return;

    const rubros = getRubros();
    wrap.innerHTML = `
      <button type="button" class="price-chip ${!rubroFilter ? "active" : ""}" data-rubro="">Todos</button>
      ${rubros.map((rubro) => {
        const active = String(rubroFilter).toLowerCase() === String(rubro).toLowerCase();
        return `<button type="button" class="price-chip ${active ? "active" : ""}" data-rubro="${rubro}">${getRubroIcon(rubro)} ${rubro}</button>`;
      }).join("")}
    `;

    wrap.querySelectorAll("[data-rubro]").forEach((btn) => {
      btn.onclick = () => {
        rubroFilter = String(btn.dataset.rubro || "").trim();
        const rubroSelect = container.querySelector("#rubroFilter");
        if (rubroSelect) rubroSelect.value = rubroFilter;
        draw();
      };
    });
  }

  function applyMassAdjustment(mode = "rubro", presetPercent = null) {
    if (!canPersistPrices) {
      blockWriteAttempt();
      return;
    }
    let percent = presetPercent;
    if (percent === null) {
      const raw = prompt("Ingresá porcentaje. Ejemplo: 10 para subir 10%, -5 para bajar 5%");
      if (raw === null) return;
      percent = Number(raw);
    }

    if (Number.isNaN(percent)) {
      showToast("Porcentaje inválido", "warn");
      return;
    }

    const visibleItems = getVisibleItems();
    const targetItems = mode === "rubro"
      ? visibleItems.filter((p) => rubroFilter ? String(p.rubro || "").toLowerCase() === rubroFilter.toLowerCase() : true)
      : visibleItems;

    if (!targetItems.length) {
      showToast("No hay productos para ajustar", "warn");
      return;
    }

    const previousValues = {};
    const targetKeys = [];

    targetItems.forEach((p) => {
      const key = p.id ?? p.productKey;
      if (!key) return;
      targetKeys.push(String(key));
      previousValues[key] = pendingChanges[key] !== undefined ? Number(pendingChanges[key] || 0) : Number(p.precio || 0);
    });

    targetItems.forEach((p) => {
      const key = p.id ?? p.productKey;
      if (!key) return;
      const basePrice = pendingChanges[key] !== undefined ? Number(pendingChanges[key] || 0) : Number(p.precio || 0);
      pendingChanges[key] = roundPriceForMassAdjustment(basePrice * (1 + percent / 100), percent);
    });

    lastMassAdjustment = {
      percent,
      rubroLabel: rubroFilter || "todos los rubros",
      previousValues,
      targetKeys,
      count: targetKeys.length
    };

    draw();
    showToast(`Ajuste aplicado: ${percent > 0 ? "+" : ""}${percent}%`, "ok");
  }

  function undoMassAdjustment() {
    if (!lastMassAdjustment || !lastMassAdjustment.previousValues) {
      showToast("No hay ajuste para deshacer", "warn");
      return;
    }

    Object.entries(lastMassAdjustment.previousValues).forEach(([key, oldValue]) => {
      const product = safeProducts.find((p) => String(p.id ?? p.productKey) === String(key));
      const original = Number(product?.precio || 0);
      const value = Number(oldValue || 0);

      if (!Number.isFinite(value) || value < 0 || value === original) {
        delete pendingChanges[key];
      } else {
        pendingChanges[key] = value;
      }
    });

    const percent = lastMassAdjustment.percent;
    const sign = percent > 0 ? "+" : "";
    lastMassAdjustment = null;
    draw();
    showToast("Ajuste " + sign + percent + "% deshecho", "ok");
  }

  function syncDirtyInputState(input, isDirty) {
    if (!input) return;
    input.closest(".price-row")?.classList.toggle("dirty", isDirty);
  }

  function draw() {
    const items = getVisibleItems();
    const list = container.querySelector("#list");
    const rubroSelect = container.querySelector("#rubroFilter");
    const sortNombreBtn = container.querySelector("#sortNombre");
    const sortPrecioBtn = container.querySelector("#sortPrecio");

    if (rubroSelect && !rubroSelect.dataset.loaded) {
      const rubros = getRubros();
      rubroSelect.innerHTML = `
        <option value="">Todos los rubros</option>
        ${rubros.map((rubro) => `<option value="${rubro}">${rubro}</option>`).join("")}
      `;
      rubroSelect.dataset.loaded = "true";
    }

    if (rubroSelect) rubroSelect.value = rubroFilter;
    if (sortNombreBtn) sortNombreBtn.textContent = getSortLabel("nombre");
    if (sortPrecioBtn) sortPrecioBtn.textContent = getSortLabel("precio");

    renderRubroButtons();
    updateUsageFilterButtons();

    if (!items.length) {
      list.innerHTML = `<div class="prices-empty">No hay productos para mostrar.</div>`;
      refreshIdleStatus();
      return;
    }

    list.innerHTML = items.map((p) => {
      const key = p.id ?? p.productKey;
      const currentValue = pendingChanges[key] !== undefined ? pendingChanges[key] : p.precio;
      const isDirty = pendingChanges[key] !== undefined;
      const isActive = p.active !== false;
      const usageActionLabel = isActive ? "No uso" : "Usar";
      const usageActionTitle = isActive ? "Marcar como No uso" : "Volver a usar este producto";
      const thumbnailPath = getProductThumbnailPath(p);

      return `
        <div class="price-row ${isDirty ? "dirty" : ""} ${isActive ? "" : "price-row-inactive"}" title="${p.rubro || "Sin rubro"}${isActive ? "" : " · No usado"}">
          <div class="price-row-main">
            ${thumbnailPath ? `<img class="price-product-thumb" src="${thumbnailPath}" alt="" loading="lazy" onerror="this.hidden=true" />` : ""}
            <div class="price-name">${p.nombre}</div>
          </div>

          <label class="price-input-wrap price-input-wrap-compact" aria-label="Precio para ${p.nombre}">
            <input type="text" inputmode="numeric" value="${formatPriceInputValue(currentValue)}" data-id="${key}" class="price-input" ${canPersistPrices ? "" : "readonly"} />
          </label>

          <div class="price-actions price-actions-simple">
            <button data-del="${key}" class="price-no-use-btn price-no-use-check price-use-only-check ${isActive ? "" : "is-inactive"}" title="${usageActionTitle}" aria-label="${usageActionTitle}" ${canPersistPrices ? "" : "disabled"}>
              <span class="price-no-use-box" aria-hidden="true"></span>
              <span class="price-no-use-label">${usageActionLabel}</span>
            </button>
          </div>
        </div>
      `;
    }).join("");

    const inputs = Array.from(container.querySelectorAll('input[data-id]'));
    inputs.forEach((input, index) => {
      input.onfocus = () => input.select?.();
      input.oninput = () => {
        if (!canPersistPrices) {
          blockWriteAttempt();
          return;
        }
        const id = input.dataset.id;
        const value = parsePriceInputValue(input.value);
        const original = Number(safeProducts.find((p) => String(p.id ?? p.productKey) === String(id))?.precio || 0);

        if (!Number.isFinite(value) || value < 0 || value === original) {
          delete pendingChanges[id];
        } else {
          pendingChanges[id] = value;
        }

        syncDirtyInputState(input, pendingChanges[id] !== undefined);
        refreshIdleStatus();
      };

      input.onkeydown = async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const id = input.dataset.id;
          if (pendingChanges[id] !== undefined) {
            try {
              await persistChanges({ [id]: pendingChanges[id] });
            } catch (error) {
              console.error(error);
              isSaving = false;
              refreshIdleStatus();
              showToast("No se pudo guardar ese precio", "error");
            }
          }
          if (inputs[index + 1]) {
            inputs[index + 1].focus();
            inputs[index + 1].select?.();
          }
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          inputs[index + 1]?.focus();
          inputs[index + 1]?.select?.();
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          inputs[index - 1]?.focus();
          inputs[index - 1]?.select?.();
        }
      };
    });

    container.querySelectorAll("[data-save]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.save;
        const input = container.querySelector(`input[data-id="${id}"]`);
        if (!input) return;

        const value = parsePriceInputValue(input.value);
        if (!value) {
          showToast("Ingresá un precio válido", "warn");
          return;
        }

        if (!canPersistPrices) {
          blockWriteAttempt();
          return;
        }

        try {
          await persistChanges({ [id]: value });
        } catch (error) {
          console.error(error);
          isSaving = false;
          refreshIdleStatus();
          showToast("No se pudo guardar ese precio", "error");
        }
      };
    });

    container.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.onclick = async () => {
        if (!canPersistPrices) {
          blockWriteAttempt();
          return;
        }
        const id = btn.dataset.edit;
        const product = safeProducts.find((p) => String(p.id ?? p.productKey) === String(id));
        if (!product) return;

        const nombre = prompt("Nombre", product.nombre);
        if (!nombre) return;
        const rubro = prompt("Rubro", product.rubro || "");
        const precio = Number(prompt("Precio", product.precio) || 0);

        try {
          await updateProduct(id, { nombre, rubro, precio }, businessId);
          const updatedProducts = safeProducts.map((item) =>
            String(item.id ?? item.productKey) === String(id)
              ? { ...item, nombre, rubro, precio }
              : item
          );
          updateLocalProducts(updatedProducts);
          delete pendingChanges[id];
          draw();
          showToast("Producto actualizado", "ok");
        } catch (error) {
          console.error(error);
          showToast("No se pudo actualizar el producto", "error");
        }
      };
    });

    container.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async () => {
        if (!canPersistPrices) {
          blockWriteAttempt();
          return;
        }

        const id = btn.dataset.del;
        const product = safeProducts.find((item) => String(item.id ?? item.productKey) === String(id));
        if (!product) return;

        const isCurrentlyActive = product.active !== false;

        if (isCurrentlyActive) {
          const ok = confirm('¿Marcar este producto como "No uso"?\n\nNo aparecerá en ofertas ni en tu web.\nNo se borra y después podés volver a usarlo.');
          if (!ok) return;

          try {
            await disableProduct(id, businessId);
            const updatedProducts = safeProducts.map((item) =>
              String(item.id ?? item.productKey) === String(id)
                ? { ...item, active: false }
                : item
            );
            updateLocalProducts(updatedProducts);
            delete pendingChanges[id];
            draw();
            showToast("Producto marcado como No uso. Podés verlo en No usados.", "ok");
          } catch (error) {
            console.error(error);
            showToast("No se pudo marcar como No uso", "error");
          }

          return;
        }

        const ok = confirm("¿Volver a usar este producto?\n\nVa a estar disponible en Carnis. Si tiene precio válido, también puede aparecer en tu web.");
        if (!ok) return;

        try {
          await updateProduct(id, { active: true }, businessId);
          const updatedProducts = safeProducts.map((item) =>
            String(item.id ?? item.productKey) === String(id)
              ? { ...item, active: true }
              : item
          );
          updateLocalProducts(updatedProducts);
          usageFilter = "active";
          draw();
          showToast("Producto activado otra vez", "ok");
        } catch (error) {
          console.error(error);
          showToast("No se pudo volver a usar el producto", "error");
        }
      };
    });

    refreshIdleStatus();
  }

  container.innerHTML = `

    <div class="prices-shell">
      ${renderCarnizaSpotlight("pricesPanel", { compact: true })}

      <div class="prices-header">
        <div class="prices-title">
          <h2><svg class="ci ci-lg" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#price"></use></svg>Cambiar precios</h2>
          <p>Buscá, tocá el precio y guardá.</p>
        </div>
      </div>

      ${isDemoPriceSession ? `<div style="padding:14px 16px;border:1px solid #F6C6C6;border-radius:16px;background:#FFF1F0;color:#B3161A;font-weight:900;line-height:1.35;">Estás probando Carnis. Estos cambios quedan solo en esta demo.</div>` : (!canPersistPrices ? `<div style="padding:14px 16px;border:1px solid #f97316;border-radius:16px;background:#fff4e5;color:#9a3412;font-weight:900;line-height:1.35;"><svg class="ci ci-sm ci--red" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#lock"></use></svg>Para guardar cambios, ponete al día. Podés seguir viendo la lista de precios.</div>` : "")}

<div class="prices-toolbar prices-toolbar-lite">
        <div class="prices-toolbar-row prices-search-row">
          <input id="searchInput" class="prices-search" placeholder="Buscar producto..." />
          <select id="rubroFilter" class="prices-select"></select>
        </div>

        <div class="prices-usage-filter" role="group" aria-label="Filtrar productos por uso">
          <button type="button" class="price-use-filter active" data-use-filter="active">Usados</button>
          <button type="button" class="price-use-filter" data-use-filter="inactive">No usados</button>
          <button type="button" class="price-use-filter" data-use-filter="all">Todos</button>
        </div>

        <div class="prices-usage-help">
          Marcado = lo uso en Carnis. <strong>No uso</strong> = no aparece en ofertas ni en mi web. Podés volver a activarlo cuando quieras.
        </div>

        <div id="rubroButtons" class="prices-rubro-scroll" aria-label="Rubros"></div>

        <div class="prices-toolbar-row prices-statusbar">
          <div id="pricePendingStatus" class="prices-status" data-mode="idle">Sin cambios</div>
          <div id="pricesSummary" class="prices-summary"></div>
          <button id="saveAllBtn" class="prices-btn primary">Guardar</button>
        </div>

        <div id="massAdjustmentNote" class="prices-mass-undo" hidden>
          <span id="massAdjustmentText"></span>
          <button id="undoMassAdjustmentBtn" class="prices-undo-btn" type="button" hidden>Deshacer</button>
        </div>

        <details class="prices-advanced">
          <summary>Ajustar rubro seleccionado</summary>
          <div class="prices-toolbar-row prices-quick-adjust">
            <button id="sortNombre" class="prices-btn secondary prices-hidden-control" type="button" tabindex="-1" aria-hidden="true">🔤 Nombre</button>
            <button id="sortPrecio" class="prices-btn secondary prices-hidden-control" type="button" tabindex="-1" aria-hidden="true">💲 Precio</button>
            <button id="adjustRubroBtn" class="prices-btn secondary prices-hidden-control" type="button" tabindex="-1" aria-hidden="true">📊 Rubro seleccionado</button>
            <button data-adjust-rubro="5" class="prices-btn secondary">+5%</button>
            <button data-adjust-rubro="10" class="prices-btn secondary">+10%</button>
            <button data-adjust-rubro="-5" class="prices-btn secondary">-5%</button>
          </div>
        </details>
      </div>

      ${preferredRubros.size ? `
        <div class="prices-preferred-rubros" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid #fed7aa;border-radius:14px;background:#fff7ed;color:#7c2d12;">
          <div style="display:grid;gap:2px;">
            <strong style="font-size:12px;font-weight:1000;">Tus rubros</strong>
            <span style="font-size:12px;font-weight:850;">${[...preferredRubros].join(" \u00b7 ")}</span>
          </div>
          <button type="button" data-toggle-all-rubros style="min-height:36px;padding:0 12px;border:1px solid #fdba74;border-radius:999px;background:#fff;color:#9a3412;font-size:12px;font-weight:1000;cursor:pointer;">
            ${showAllRubros ? "Ver solo mis rubros" : "+ Agregar otros rubros"}
          </button>
        </div>
      ` : ""}

      <div id="list" class="prices-list"></div>
      <div id="pricesToast" class="prices-toast" data-tone="ok"></div>
      <div id="pricesDesktopFloatingSummary" class="prices-desktop-floating-summary" role="status" aria-live="polite">
        <div class="prices-desktop-floating-copy"><span aria-hidden="true"><svg class="ci ci-sm" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#price"></use></svg></span><span id="pricesDesktopFloatingText">0 precios modificados sin guardar</span></div>
        <button id="pricesDesktopFloatingSave" class="prices-desktop-floating-save" type="button">Guardar</button>
      </div>
    </div>
  `;

  container.querySelector("#searchInput").addEventListener("input", (e) => {
    searchTerm = String(e.target.value || "").trim().toLowerCase();
    draw();
  });

  container.querySelector("#rubroFilter").addEventListener("change", (e) => {
    rubroFilter = String(e.target.value || "").trim();
    draw();
  });

  container.querySelectorAll("[data-use-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      usageFilter = btn.dataset.useFilter || "active";
      rubroFilter = "";
      const rubroSelect = container.querySelector("#rubroFilter");
      if (rubroSelect) rubroSelect.dataset.loaded = "";
      draw();
    });
  });

  container.querySelector("[data-toggle-all-rubros]")?.addEventListener("click", () => {
    showAllRubros = !showAllRubros;
    rubroFilter = "";

    const rubroSelect = container.querySelector("#rubroFilter");
    if (rubroSelect) {
      rubroSelect.dataset.loaded = "";
      rubroSelect.value = "";
    }

    draw();

    const toggle = container.querySelector("[data-toggle-all-rubros]");
    if (toggle) {
      toggle.textContent = showAllRubros ? "Ver solo mis rubros" : "+ Agregar otros rubros";
    }
  });

  container.querySelector("#saveAllBtn").onclick = saveAllPendingChanges;
  container.querySelector("#pricesDesktopFloatingSave").onclick = saveAllPendingChanges;

  // APPPROMOS C6 FIX6C - input moneda listeners
  container.querySelectorAll(".price-input").forEach((input) => {
    input.addEventListener("focus", () => {
      const numeric = parsePriceInputValue(input.value);
      input.value = numeric > 0 ? String(numeric) : "";
      setTimeout(() => input.select && input.select(), 0);
    });

    input.addEventListener("blur", () => {
      const numeric = parsePriceInputValue(input.value);
      input.value = formatPriceInputValue(numeric);
    });
  });
  container.querySelector("#undoMassAdjustmentBtn").onclick = undoMassAdjustment;

  container.querySelector("#sortNombre").onclick = () => {
    if (sortField === "nombre") {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = "nombre";
      sortDirection = "asc";
    }
    draw();
  };

  container.querySelector("#sortPrecio").onclick = () => {
    if (sortField === "precio") {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = "precio";
      sortDirection = "asc";
    }
    draw();
  };

  container.querySelector("#adjustRubroBtn").onclick = () => {
    if (!rubroFilter) {
      showToast("Primero elegí un rubro", "warn");
      return;
    }
    applyMassAdjustment("rubro");
  };

  container.querySelectorAll("[data-adjust-rubro]").forEach((btn) => {
    btn.onclick = () => {
      if (!rubroFilter) {
        showToast("Primero elegí un rubro", "warn");
        return;
      }
      applyMassAdjustment("rubro", Number(btn.dataset.adjustRubro));
    };
  });

  draw();

  requestAnimationFrame(() => {
    if (window.matchMedia && window.matchMedia("(min-width: 769px)").matches) {
      container.querySelector("#searchInput")?.focus?.();
    }
  });
}
