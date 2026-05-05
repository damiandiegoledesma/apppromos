import {
  updateProduct,
  disableProduct,
  updateProductPricesBatch
} from "../services/data-service.js";

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
  const canWrite = options.canWrite !== false;
  const isDemoPriceSession =
    businessId === "demo" ||
    options.isDemoMode === true ||
    new URLSearchParams(window.location.search || "").get("demo") === "1" ||
    new URLSearchParams(window.location.search || "").get("mode") === "demo";
  const canPersistPrices = canWrite || isDemoPriceSession;
  const writeBlockMessage = isDemoPriceSession
    ? "Estás probando AppPromos. Estos cambios quedan solo en esta demo."
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

  function updateLocalProducts(updatedProducts = []) {
    safeProducts.splice(0, safeProducts.length, ...updatedProducts);
    onProductsUpdated?.(updatedProducts);
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

  function getRubros() {
    const set = new Set();
    safeProducts.forEach((p) => {
      if (p.active === false) return;
      const rubro = String(p.rubro || "").trim();
      if (rubro) set.add(rubro);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }

  function getVisibleItems() {
    const items = safeProducts.filter((p) => {
      if (p.active === false) return false;

      const nombre = String(p.nombre || "").toLowerCase();
      const rubro = String(p.rubro || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchSearch = !term || nombre.includes(term) || rubro.includes(term);
      const matchRubro = !rubroFilter || rubro === rubroFilter.toLowerCase();
      return matchSearch && matchRubro;
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
    const saveAllBtn = container.querySelector("#saveAllBtn");    const summary = container.querySelector("#pricesSummary");
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
      setStatus("idle", "Estás probando AppPromos. Estos cambios quedan solo en esta demo.");
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
    updateLocalProducts(result.updatedProducts || safeProducts);

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
    setStatus("saved", isDemoPriceSession ? "Guardado en esta demo" : "✅ Guardado");
    showToast(isDemoPriceSession ? "Cambio guardado en esta demo" : "Cambios guardados", "ok");
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

    if (!items.length) {
      list.innerHTML = `<div class="prices-empty">No hay productos para mostrar.</div>`;
      refreshIdleStatus();
      return;
    }

    list.innerHTML = items.map((p) => {
      const key = p.id ?? p.productKey;
      const currentValue = pendingChanges[key] !== undefined ? pendingChanges[key] : p.precio;
      const isDirty = pendingChanges[key] !== undefined;

      return `
        <div class="price-row ${isDirty ? "dirty" : ""}" title="${p.rubro || "Sin rubro"}">
          <div class="price-row-main">
            <div class="price-name">${p.nombre}</div>
          </div>

          <label class="price-input-wrap price-input-wrap-compact" aria-label="Precio para ${p.nombre}">
            <input type="text" inputmode="numeric" value="${formatPriceInputValue(currentValue)}" data-id="${key}" class="price-input" ${canPersistPrices ? "" : "readonly"} />
          </label>

          <div class="price-actions price-actions-simple">
            <button data-del="${key}" class="price-no-use-btn price-no-use-check price-use-only-check" title="Marcar como No uso" aria-label="Marcar como No uso" ${canPersistPrices ? "" : "disabled"}>
              <span class="price-no-use-box" aria-hidden="true"></span>
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
        const ok = confirm('¿Marcar este producto como "No uso"?\n\nNo aparecerá en ofertas ni en tu web.\nNo borra el producto.');
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
          showToast("Producto marcado como No uso", "ok");
        } catch (error) {
          console.error(error);
          showToast("No se pudo marcar como No uso", "error");
        }
      };
    });

    refreshIdleStatus();
  }

  container.innerHTML = `
    <style>
      .prices-shell { display:flex; flex-direction:column; gap:16px; }
      .prices-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap; }
      .prices-title h2 { margin:0 0 6px; font-size:30px; color:#8b1f1f; line-height:1.1; }
      .prices-title p { margin:0; color:#6b7280; font-size:15px; }
      .prices-web-tip { display:flex; gap:12px; align-items:flex-start; padding:14px 16px; border:1px solid #fed7aa; border-radius:18px; background:linear-gradient(135deg,#fff7ed,#ffffff); color:#7c2d12; box-shadow:0 8px 20px rgba(194,65,12,.08); }
      .prices-web-tip-icon { width:38px; height:38px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:#ffedd5; color:#c2410c; font-weight:1000; flex:0 0 auto; }
      .prices-web-tip strong { display:block; margin-bottom:4px; font-size:14px; font-weight:1000; }
      .prices-web-tip p { margin:0; color:#7c2d12; line-height:1.38; font-size:13px; font-weight:850; }
      .prices-toolbar {
        position: sticky; top: 72px; z-index: 8; background:#fff9f7; border:1px solid #f0d7d1;
        border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:12px;
      }
      .prices-toolbar-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .prices-status {
        display:inline-flex; align-items:center; gap:8px; padding:10px 12px; border-radius:999px;
        font-weight:900; font-size:14px; background:#f3f4f6; color:#374151;
      }
      .prices-status[data-mode="pending"] { background:#fff3d6; color:#8a5200; }
      .prices-status[data-mode="saving"] { background:#e0f2fe; color:#075985; }
      .prices-status[data-mode="saved"] { background:#dcfce7; color:#166534; }
      .prices-status[data-mode="error"] { background:#fee2e2; color:#991b1b; }
      .prices-summary { color:#6b7280; font-size:14px; }
      .prices-search, .prices-select { min-height:48px; border:1px solid #d1d5db; border-radius:10px; padding:0 12px; background:#fff; }
      .prices-search { min-width:240px; flex:1; }
      .prices-btn, .price-chip, .mini-action {
        min-height:46px; border:1px solid #d1d5db; border-radius:10px; background:#fff; cursor:pointer; font-weight:700;
      }
      .prices-btn.primary { background:#b63b2b; color:#fff; border-color:#b63b2b; }
      .prices-btn.secondary { background:#fff; color:#333; }
      .price-chip { border-radius:999px; padding:0 14px; }
      .price-chip.active { background:#b63b2b; color:#fff; border-color:#b63b2b; }
      .prices-list { display:grid; grid-template-columns:1fr; gap:5px; }
      @media (min-width: 1100px) {
        .prices-list { grid-template-columns:1fr 1fr; }
      }
      .price-row {
        display:grid; grid-template-columns:minmax(0,1fr) minmax(100px,124px) 104px; gap:7px; align-items:center;
        padding:6px 8px; background:#fff; border:1px solid #dbeafe; border-radius:13px;
        transition:all .2s ease; min-height:42px;
      }
      .price-row.dirty { border-color:#f59e0b; background:#fffbeb; }
      .price-row-main { min-width:0; display:flex; align-items:center; gap:7px; }
      .price-name { font-size:15px; font-weight:1000; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .price-actions-wrap { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      .price-input-wrap { display:block; color:#64748b; font-size:0; font-weight:900; }
      .price-input-wrap span { display:none; }
      .price-input { width:100%; min-height:34px; border-radius:11px; border:1px solid #bfdbfe; padding:0 9px; font-size:15px; font-weight:1000; color:#0f172a; box-sizing:border-box; }
      .price-actions { display:flex; gap:5px; align-items:center; justify-content:flex-end; }
      .mini-action { min-width:30px; min-height:34px; font-size:14px; border-radius:10px; }
      .mini-action.danger { color:#991b1b; }
      .prices-empty { padding:18px; color:#6b7280; border:1px dashed #d1d5db; border-radius:14px; }
      .prices-toast {
        position:fixed; right:18px; bottom:18px; z-index:60; background:#111827; color:#fff; padding:12px 16px;
        border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,.2); opacity:0; transform:translateY(8px); transition:all .2s ease;
      }
      .prices-toast[data-tone="error"] { background:#991b1b; }
      .prices-toast[data-tone="warn"] { background:#92400e; }
      .prices-toast[data-tone="ok"] { background:#166534; }
      @media (max-width: 768px) {
        .prices-title h2 { font-size:25px; }
        .prices-toolbar { top: 60px; padding:12px; }
        .prices-toolbar-row { align-items:stretch; }
        .prices-search, .prices-select, .prices-btn { width:100%; }
        .prices-list { grid-template-columns:1fr; }
        .price-row { grid-template-columns:1fr 96px 98px; gap:6px; align-items:center; padding:8px; }
        .price-row-main { display:block; min-width:0; }
        .price-name { font-size:15px; }
        .price-input-wrap { width:100%; }
        .price-input { width:100%; min-height:36px; font-size:15px; }
        .price-actions { justify-content:flex-end; }
        .mini-action { min-height:34px; min-width:30px; }
      }

      /* V12.13-C6-FIX2 - Cambiar Precios: más aire, menos planilla */
      .prices-shell { gap:10px; }
      .prices-title h2 { margin-bottom:4px; font-size:26px; letter-spacing:-.03em; }
      .prices-title p { font-size:13px; line-height:1.28; font-weight:800; }
      .prices-web-tip { padding:9px 11px; border-radius:14px; gap:9px; align-items:center; box-shadow:0 5px 12px rgba(194,65,12,.06); }
      .prices-web-tip-icon { width:28px; height:28px; font-size:15px; }
      .prices-web-tip strong { margin-bottom:2px; font-size:12px; }
      .prices-web-tip p { font-size:12px; line-height:1.25; font-weight:850; }
      .prices-toolbar-lite { top:8px; padding:9px; gap:8px; border-radius:16px; background:rgba(255,249,247,.96); box-shadow:0 8px 18px rgba(15,23,42,.06); }
      .prices-search-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(116px,.48fr); gap:8px; }
      .prices-search, .prices-select { width:100%; min-height:42px; border-radius:13px; font-size:13px; font-weight:850; box-sizing:border-box; }
      .prices-rubro-scroll { display:flex; gap:7px; overflow-x:auto; overflow-y:hidden; flex-wrap:nowrap; padding:1px 0 4px; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
      .prices-rubro-scroll::-webkit-scrollbar { display:none; }
      .price-chip { flex:0 0 auto; min-height:34px; padding:0 12px; font-size:12px; border-radius:999px; white-space:nowrap; box-shadow:0 4px 10px rgba(15,23,42,.04); }
      .prices-statusbar { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; }
      .prices-status { min-height:34px; padding:0 10px; font-size:12px; border-radius:999px; }
      .prices-summary { font-size:12px; line-height:1.2; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .prices-btn { min-height:38px; padding:0 11px; border-radius:12px; font-size:12px; font-weight:1000; }
      .prices-btn.primary { min-width:92px; }
      .prices-advanced { border:1px solid #e5e7eb; border-radius:13px; background:#fff; overflow:hidden; }
      .prices-advanced summary { min-height:36px; display:flex; align-items:center; padding:0 12px; cursor:pointer; color:#7f1d1d; font-size:12px; font-weight:1000; list-style:none; }
      .prices-advanced summary::-webkit-details-marker { display:none; }
      .prices-advanced summary::after { content:"+"; margin-left:auto; font-size:16px; line-height:1; color:#b91c1c; }
      .prices-advanced[open] summary::after { content:"−"; }
      .prices-quick-adjust { padding:0 9px 9px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
      .prices-list { gap:7px; }
      .price-row { min-height:48px; padding:8px 9px; border-radius:14px; gap:8px; }
      .price-name { font-size:14px; line-height:1.15; }
      .price-input { min-height:38px; font-size:14px; }
      .mini-action { min-height:36px; min-width:31px; }
      @media (max-width: 768px) {
        .prices-title h2 { font-size:22px; }
        .prices-header { gap:6px; }
        .prices-toolbar-lite { position:sticky; top:8px; padding:8px; }
        .prices-search-row { grid-template-columns:1fr; }
        .prices-statusbar { grid-template-columns:1fr auto; }
        .prices-statusbar .prices-summary { grid-column:1 / -1; order:3; }
        .prices-statusbar #saveAllBtn { min-width:94px; }
        .prices-quick-adjust { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .price-row { grid-template-columns:minmax(0,1fr) 92px 94px; min-height:50px; padding:8px; }
        .price-actions { gap:4px; }
        .mini-action { min-width:29px; }
      }

      /* V12.13-C6-FIX2A - Precios limpio: sin chips duplicados ni ordenamientos */
      #rubroButtons.prices-rubro-scroll { display:none !important; }
      .prices-hidden-control { display:none !important; }
      .prices-advanced summary { color:#7f1d1d; font-weight:1000; }
      .prices-quick-adjust { grid-template-columns:repeat(3,minmax(0,1fr)) !important; }
      .prices-quick-adjust .prices-btn { min-height:40px; font-size:13px; }
      .prices-toolbar-lite { gap:7px; }
      .prices-statusbar { margin-top:0; }
      @media (max-width: 768px) {
        .prices-advanced summary { min-height:34px; }
        .prices-quick-adjust { grid-template-columns:repeat(3,minmax(0,1fr)) !important; }
      }
    /* APPPROMOS C6 FIX2B - precios acciones simples */
.price-actions-simple {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.price-no-use-btn {
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid rgba(185, 28, 28, .22);
  border-radius: 14px;
  background: #fff7f7;
  color: #991b1b;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
  cursor: pointer;
}
.price-no-use-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}
/* APPPROMOS C6 FIX4 - deshacer ajuste masivo */
.prices-mass-undo {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:8px 10px;
  border:1px solid rgba(245, 158, 11, .35);
  border-radius:13px;
  background:#fffbeb;
  color:#7c2d12;
  font-size:12px;
  font-weight:900;
}
.prices-mass-undo[hidden] {
  display:none !important;
}
.prices-undo-btn {
  min-height:34px;
  padding:0 12px;
  border:1px solid rgba(180, 83, 9, .32);
  border-radius:999px;
  background:#fff;
  color:#92400e;
  font-size:12px;
  font-weight:1000;
  cursor:pointer;
  white-space:nowrap;
}
.prices-undo-btn:disabled {
  opacity:.45;
  cursor:not-allowed;
}
/* APPPROMOS C6 FIX6 - filas precios mobile legibles */
.price-name {
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  word-break:break-word;
  font-weight:800;
  letter-spacing:-.01em;
}
.price-input-wrap-compact {
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:2px;
  justify-items:end;
  align-content:center;
}
.price-input-wrap-compact .price-input {
  text-align:right;
  font-weight:950;
}
.price-input-unit {
  display:block;
  width:100%;
  text-align:right;
  color:#64748b;
  font-size:10px;
  font-weight:900;
  line-height:1;
  margin-top:1px;
}
.price-no-use-check {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  min-height:34px;
  padding:0 8px;
  border-radius:999px;
}
.price-no-use-box {
  width:13px;
  height:13px;
  border:2px solid rgba(153,27,27,.45);
  border-radius:4px;
  background:#fff;
  flex:0 0 auto;
}
.price-no-use-label {
  font-size:10px;
  font-weight:950;
  line-height:1;
}
@media (max-width: 768px) {
  .price-row {
    grid-template-columns:minmax(0,1fr) 84px 74px !important;
    gap:7px !important;
    align-items:center !important;
    min-height:54px !important;
  }
  .price-name {
    font-size:13.5px !important;
    line-height:1.15 !important;
    font-weight:780 !important;
  }
  .price-input {
    min-height:36px !important;
    font-size:14px !important;
    padding:0 7px !important;
  }
  .price-no-use-check {
    min-width:0;
    width:100%;
    padding:0 6px;
  }
}
/* APPPROMOS C6 FIX6B - filas precios simples producto precio uso */
.prices-kg-note {
  margin:6px 0 8px;
  padding:7px 9px;
  border:1px solid rgba(15, 23, 42, .08);
  border-radius:12px;
  background:#f8fafc;
  color:#334155;
  font-size:11px;
  font-weight:850;
  line-height:1.25;
}
.price-input-unit {
  display:none !important;
}
.price-no-use-label {
  display:none !important;
}
.price-use-only-check,
.price-no-use-check {
  width:38px !important;
  min-width:38px !important;
  max-width:38px !important;
  min-height:36px !important;
  padding:0 !important;
  border-radius:14px !important;
  gap:0 !important;
}
.price-no-use-box {
  width:16px !important;
  height:16px !important;
  border-radius:5px !important;
  margin:0 !important;
}
.price-name,
.price-row .price-name,
.price-row strong,
.price-row b {
  white-space:normal !important;
  overflow:hidden !important;
  text-overflow:clip !important;
  display:-webkit-box !important;
  -webkit-line-clamp:2 !important;
  -webkit-box-orient:vertical !important;
  word-break:break-word !important;
  overflow-wrap:anywhere !important;
  line-height:1.15 !important;
}
@media (max-width: 768px) {
  .price-row {
    grid-template-columns:minmax(0,1fr) 88px 44px !important;
    gap:8px !important;
    min-height:56px !important;
    align-items:center !important;
  }
  .price-name,
  .price-row .price-name,
  .price-row strong,
  .price-row b {
    font-size:13px !important;
    font-weight:760 !important;
  }
  .price-input-wrap,
  .price-input-wrap-compact {
    width:88px !important;
    min-width:88px !important;
  }
  .price-input {
    width:88px !important;
    min-height:37px !important;
    text-align:right !important;
    font-size:14px !important;
    font-weight:950 !important;
    padding:0 7px !important;
  }
  .price-actions,
  .price-actions-simple {
    width:44px !important;
    min-width:44px !important;
    justify-content:center !important;
  }
}
/* APPPROMOS C6 FIX6C - precio moneda y uso claro */
.prices-tip {
  display:none !important;
}
.prices-kg-note {
  margin:6px 0 8px !important;
  padding:7px 9px !important;
  border:1px solid rgba(15, 23, 42, .08) !important;
  border-radius:12px !important;
  background:#f8fafc !important;
  color:#334155 !important;
  font-size:10.5px !important;
  font-weight:850 !important;
  line-height:1.25 !important;
}
.price-input {
  font-variant-numeric: tabular-nums;
}
/* APPPROMOS C6 FIX6C - uso checkbox mas claro */
.price-use-only-check,
.price-no-use-check {
  background:#fff7f7 !important;
  border:1px solid rgba(185, 28, 28, .22) !important;
}
.price-use-only-check:hover,
.price-no-use-check:hover {
  background:#fee2e2 !important;
}
</style>

    <div class="prices-shell">
      <div class="prices-header">
        <div class="prices-title">
          <h2>⚡ Cambiar precios</h2>
          <p>Buscá, tocá el precio y guardá.</p>
        </div>
      </div>

      ${isDemoPriceSession ? `<div style="padding:14px 16px;border:1px solid #93c5fd;border-radius:16px;background:#eff6ff;color:#1d4ed8;font-weight:900;line-height:1.35;">Estás probando AppPromos. Estos cambios quedan solo en esta demo.</div>` : (!canPersistPrices ? `<div style="padding:14px 16px;border:1px solid #f97316;border-radius:16px;background:#fff4e5;color:#9a3412;font-weight:900;line-height:1.35;">🔒 Para guardar cambios, ponete al día. Podés seguir viendo la lista de precios.</div>` : "")}

<div class="prices-toolbar prices-toolbar-lite">
        <div class="prices-toolbar-row prices-search-row">
          <input id="searchInput" class="prices-search" placeholder="Buscar producto..." />
          <select id="rubroFilter" class="prices-select"></select>
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

      <div id="list" class="prices-list"></div>
      <div id="pricesToast" class="prices-toast" data-tone="ok"></div>
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

  container.querySelector("#saveAllBtn").onclick = saveAllPendingChanges;

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
