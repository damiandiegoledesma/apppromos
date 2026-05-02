import {
  updateProduct,
  disableProduct,
  updateProductPricesBatch
} from "../services/data-service.js";

function roundUpTo100(value) {
  const numeric = Number(value || 0);
  if (numeric <= 0) return 0;
  return Math.ceil(numeric / 100) * 100;
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
  let statusMessage = "Sin cambios pendientes";
  let lastSavedAt = "";

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

  function setStatus(mode = "idle", message = "") {
    statusMode = mode;
    statusMessage = message || statusMessage;

    const badge = container.querySelector("#pricePendingStatus");
    const saveAllBtn = container.querySelector("#saveAllBtn");
    const summary = container.querySelector("#pricesSummary");
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
            : "💾 Sin cambios";
    }

    if (summary) {
      const visibleCount = getVisibleItems().length;
      summary.innerHTML = `
        <strong>${visibleCount}</strong> producto${visibleCount === 1 ? "" : "s"} visibles ·
        <strong>${pendingCount}</strong> cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}
        ${lastSavedAt ? ` · Último guardado: ${lastSavedAt}` : ""}
      `;
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
      setStatus("idle", "Sin cambios pendientes");
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

    targetItems.forEach((p) => {
      const key = p.id ?? p.productKey;
      const basePrice = pendingChanges[key] !== undefined ? Number(pendingChanges[key] || 0) : Number(p.precio || 0);
      pendingChanges[key] = roundUpTo100(basePrice * (1 + percent / 100));
    });

    draw();
    showToast(`Ajuste aplicado: ${percent > 0 ? "+" : ""}${percent}%`, "ok");
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
        <div class="price-row ${isDirty ? "dirty" : ""}">
          <div class="price-row-main">
            <div class="price-name">${p.nombre}</div>
            <div class="price-meta">
              <span>${getRubroIcon(p.rubro)}</span>
              <span>${p.rubro || "Sin rubro"}</span>
              <span>·</span>
              <span>${formatCurrency(p.precio)}</span>
            </div>
          </div>

          <div class="price-actions-wrap">
            <label class="price-input-wrap">
              <span>Nuevo precio</span>
              <input type="number" value="${currentValue}" data-id="${key}" class="price-input" ${canPersistPrices ? "" : "readonly"} />
            </label>
            <div class="price-actions">
              <button data-save="${key}" class="mini-action" ${canPersistPrices ? "" : "disabled"}>💾</button>
              <button data-edit="${key}" class="mini-action" ${canPersistPrices ? "" : "disabled"}>✏️</button>
              <button data-del="${key}" class="mini-action danger" ${canPersistPrices ? "" : "disabled"}>🗑️</button>
            </div>
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
        const value = Number(input.value || 0);
        const original = Number(safeProducts.find((p) => String(p.id ?? p.productKey) === String(id))?.precio || 0);

        if (!value || value === original) {
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

        const value = Number(input.value || 0);
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
        const ok = confirm("¿Desactivar producto?");
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
          showToast("Producto desactivado", "ok");
        } catch (error) {
          console.error(error);
          showToast("No se pudo desactivar", "error");
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
      .prices-list { display:flex; flex-direction:column; gap:12px; }
      .price-row {
        display:flex; justify-content:space-between; gap:16px; align-items:center; padding:18px; background:#fff;
        border:1px solid #ece7df; border-radius:16px; transition:all .2s ease; flex-wrap:wrap;
      }
      .price-row.dirty { border-color:#f59e0b; background:#fffbeb; }
      .price-row-main { flex:1; min-width:220px; }
      .price-name { font-size:24px; font-weight:950; color:#8b1f1f; color:#111827; margin-bottom:4px; }
      .price-meta { display:flex; gap:8px; flex-wrap:wrap; color:#6b7280; font-size:14px; }
      .price-meta span:last-child { font-weight:900; color:#374151; }
      .price-actions-wrap { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; }
      .price-input-wrap { display:flex; flex-direction:column; gap:4px; color:#6b7280; font-size:12px; font-weight:700; }
      .price-input { width:170px; min-height:54px; border-radius:12px; border:1px solid #d1d5db; padding:0 12px; font-size:24px; font-weight:950; color:#8b1f1f; }
      .price-actions { display:flex; gap:8px; align-items:center; }
      .mini-action { min-width:48px; font-size:18px; }
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
        .price-input { width:100%; min-height:56px; }
        .price-actions-wrap { width:100%; justify-content:space-between; align-items:stretch; }
        .price-actions { margin-left:auto; align-self:center; }
        .price-input-wrap { flex:1; }
      }
    </style>

    <div class="prices-shell">
      <div class="prices-header">
        <div class="prices-title">
          <h2>⚡ Cambiar precios</h2>
          <p>Buscá, editá y guardá. La app te avisa siempre qué quedó pendiente.</p>
        </div>
      </div>

      ${isDemoPriceSession ? `<div style="padding:14px 16px;border:1px solid #93c5fd;border-radius:16px;background:#eff6ff;color:#1d4ed8;font-weight:900;line-height:1.35;">Estás probando AppPromos. Estos cambios quedan solo en esta demo.</div>` : (!canPersistPrices ? `<div style="padding:14px 16px;border:1px solid #f97316;border-radius:16px;background:#fff4e5;color:#9a3412;font-weight:900;line-height:1.35;">🔒 Para guardar cambios, ponete al día. Podés seguir viendo la lista de precios.</div>` : "")}

      <div class="prices-toolbar">
        <div class="prices-toolbar-row">
          <button id="saveAllBtn" class="prices-btn primary">💾 Guardar cambios</button>
          <div id="pricePendingStatus" class="prices-status" data-mode="idle">Sin cambios pendientes</div>
          <div id="pricesSummary" class="prices-summary"></div>
        </div>

        <div id="rubroButtons" class="prices-toolbar-row"></div>

        <div class="prices-toolbar-row">
          <input id="searchInput" class="prices-search" placeholder="Buscar producto o rubro..." />
          <select id="rubroFilter" class="prices-select"></select>
        </div>

        <div class="prices-toolbar-row">
          <button id="sortNombre" class="prices-btn secondary">🔤 Nombre</button>
          <button id="sortPrecio" class="prices-btn secondary">💲 Precio</button>
          <button id="adjustRubroBtn" class="prices-btn secondary">📊 Ajustar rubro actual</button>
          <button data-adjust-rubro="5" class="prices-btn secondary">+5%</button>
          <button data-adjust-rubro="10" class="prices-btn secondary">+10%</button>
          <button data-adjust-rubro="-5" class="prices-btn secondary">-5%</button>
        </div>
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
