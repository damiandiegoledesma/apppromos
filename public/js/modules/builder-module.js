import { loadActiveBusinessData } from "../services/data-service.js";
import { updateBusinessState, getCurrentBusinessId } from "../services/business-service.js";
import { resolveSession } from "../services/auth-service.js";

const MODULE_VERSION = 9.6;
const HISTORY_LIMIT = 30;
const MAX_PRODUCT_RESULTS = 36;

export async function renderBuilder(container, products = [], onComboSaved = null, options = {}) {
  if (!container) return;

  const state = {
    step: 1,
    draft: {
      name: "",
      items: [],
      descuento_combo_percent: 0,
      loadedFromComboId: null
    },
    computed: emptyTotals(),
    ui: {
      searchTerm: "",
      rubroFilter: "",
      selectedHistoryComboId: "",
      isSaving: false,
      message: null,
      lastSavedComboId: null
    },
    products: normalizeProducts(products),
    savedCombos: [],
    businessId: options?.businessId || null,
    canWrite: options?.canWrite !== false,
    writeBlockMessage: options?.writeBlockMessage || "Tu cuenta está en modo consulta. Para volver a guardar ofertas, regularizá tu plan.",
    session: null
  };

  let refs = {};

  injectGuidedBuilderStyles();
  await hydrateHistory();
  recalculate();
  render();

  async function hydrateHistory() {
    try {
      state.session = await resolveSession().catch(() => null);

      const sessionBusinessId = state.session?.appMode === "client" ? state.session.businessId : null;
      const fallbackBusinessId = typeof getCurrentBusinessId === "function" ? getCurrentBusinessId() : null;
      state.businessId = options?.businessId || sessionBusinessId || state.businessId || fallbackBusinessId || null;

      const data = await loadActiveBusinessData(state.businessId);
      state.businessId = data?.businessId || state.businessId;
      state.products = normalizeProducts(data?.products || state.products);
      state.savedCombos = Array.isArray(data?.state?.savedCombos)
        ? data.state.savedCombos.slice().sort(sortCombosByDateDesc).slice(0, HISTORY_LIMIT)
        : [];
    } catch (error) {
      console.warn("Builder guiado: no se pudo hidratar historial", error);
      setMessage("No se pudo cargar el historial de ofertas.", "warning", false);
    }
  }

  function render() {
    container.innerHTML = `
      <section class="guided-builder">
        <header class="guided-builder__hero card">
          <div>
            <div class="guided-builder__eyebrow">Crear oferta guiada</div>
            <h2>🔥 Crear oferta</h2>
            <p>Armá una oferta en 3 pasos: elegí productos, ajustá cantidades y guardá para vender por WhatsApp.</p>
          </div>
          <button type="button" class="guided-builder__reset" data-action="new-offer">Nueva oferta</button>
        </header>

        <nav class="guided-steps" aria-label="Pasos para crear oferta">
          ${renderStepButton(1, "Productos", "Elegí qué vendés")}
          ${renderStepButton(2, "Ajustes", "Cantidad y descuentos")}
          ${renderStepButton(3, "Vender", "Guardar y compartir")}
        </nav>

        <div class="guided-builder__content">
          ${state.step === 1 ? renderStepProducts() : ""}
          ${state.step === 2 ? renderStepAdjust() : ""}
          ${state.step === 3 ? renderStepSell() : ""}
        </div>
      </section>
    `;

    cacheRefs();
    bindEvents();
    renderDynamicFragments();
  }

  function renderStepButton(step, title, subtitle) {
    const active = state.step === step;
    const complete = step === 1 ? state.draft.items.length > 0 : step === 2 ? state.draft.items.length > 0 && state.computed.total_final > 0 : state.ui.lastSavedComboId;
    return `
      <button type="button" class="guided-step ${active ? "active" : ""} ${complete ? "complete" : ""}" data-step="${step}">
        <span class="guided-step__number">${step}</span>
        <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span>
      </button>
    `;
  }

  function renderStepProducts() {
    return `
      <div class="guided-builder__grid guided-builder__grid--products">
        <section class="card guided-builder__work">
          <div class="guided-section-head">
            <div>
              <h3>1. Elegí productos</h3>
              <p>Buscá por nombre o rubro y tocá “Agregar”. Nada más.</p>
            </div>
          </div>

          <div class="guided-field">
            <label for="guidedComboName">Nombre de la oferta</label>
            <input id="guidedComboName" type="text" placeholder="Ej: Combo Parrillero" value="${escapeHtml(state.draft.name)}" autocomplete="off" />
          </div>

          <details class="guided-history" ${state.ui.selectedHistoryComboId ? "open" : ""}>
            <summary>Reusar una oferta guardada</summary>
            <div class="guided-history__body">
              <select id="guidedHistorySelect">
                <option value="">Seleccionar oferta guardada...</option>
                ${state.savedCombos.map((combo) => `
                  <option value="${escapeHtml(combo.id)}" ${state.ui.selectedHistoryComboId === combo.id ? "selected" : ""}>
                    ${escapeHtml(combo.name || "Oferta sin nombre")} · ${formatShortDate(combo.createdAt)}
                  </option>
                `).join("")}
              </select>
              <button type="button" data-action="load-history">Cargar</button>
              <div id="guidedHistoryMeta" class="guided-muted small"></div>
            </div>
          </details>

          <div class="guided-searchbar">
            <input id="guidedProductSearch" type="text" placeholder="Buscar producto..." value="${escapeHtml(state.ui.searchTerm)}" autocomplete="off" />
            <select id="guidedRubroFilter">
              <option value="">Todos los rubros</option>
              ${getUniqueRubros().map((rubro) => `
                <option value="${escapeHtml(rubro.toLowerCase())}" ${state.ui.rubroFilter === rubro.toLowerCase() ? "selected" : ""}>${escapeHtml(rubro)}</option>
              `).join("")}
            </select>
          </div>

          <div id="guidedProductGrid" class="guided-product-grid"></div>
        </section>

        <aside class="card guided-builder__preview guided-builder__preview--sticky">
          ${renderMiniPreview()}
          <div class="guided-actions guided-actions--stack">
            <button type="button" class="guided-primary" data-action="go-adjust" ${state.draft.items.length ? "" : "disabled"}>Siguiente: ajustar cantidades →</button>
            <button type="button" class="guided-secondary" data-action="clear-offer">Limpiar</button>
          </div>
        </aside>
      </div>
    `;
  }

  function renderStepAdjust() {
    return `
      <div class="guided-builder__grid guided-builder__grid--adjust">
        <section class="card guided-builder__work">
          <div class="guided-section-head">
            <div>
              <h3>2. Ajustá cantidades</h3>
              <p>Usá + / - para kilos y descuento si hace falta. El total se actualiza solo.</p>
            </div>
            <button type="button" class="guided-secondary" data-action="back-products">← Productos</button>
          </div>

          <div id="guidedAdjustList" class="guided-adjust-list"></div>

          <div class="guided-general-discount">
            <div>
              <strong>Descuento general</strong>
              <span>Opcional, se aplica sobre toda la oferta.</span>
            </div>
            <div class="guided-discount-control">
              <input id="guidedComboDiscount" type="number" min="0" max="100" step="1" value="${escapeHtml(String(state.draft.descuento_combo_percent || 0))}" inputmode="numeric" />
              <span>%</span>
            </div>
          </div>
        </section>

        <aside class="card guided-builder__preview guided-builder__preview--sticky">
          ${renderMiniPreview()}
          <div class="guided-actions guided-actions--stack">
            <button type="button" class="guided-primary" data-action="go-sell" ${state.draft.items.length ? "" : "disabled"}>Ver y guardar →</button>
            <button type="button" class="guided-secondary" data-action="back-products">Volver a productos</button>
          </div>
        </aside>
      </div>
    `;
  }

  function renderStepSell() {
    const whatsappDisabled = !state.ui.lastSavedComboId;
    return `
      <div class="guided-builder__grid guided-builder__grid--sell">
        <section class="card guided-builder__work">
          <div class="guided-section-head">
            <div>
              <h3>3. Guardá y vendé</h3>
              ${state.canWrite ? `<p>Revisá la vista comercial. Si está bien, guardá la oferta y mandala por WhatsApp.</p>` : `<p>Modo consulta: podés armar y revisar ofertas, pero el guardado está pausado hasta regularizar la cuenta.</p>`}
            </div>
            <button type="button" class="guided-secondary" data-action="back-adjust">← Ajustes</button>
          </div>

          <div class="guided-final-preview">
            ${renderCommercialPreview()}
          </div>

          <div id="guidedSaveStatus" class="guided-save-status ${state.ui.message ? `status-${state.ui.message.type}` : ""}">${escapeHtml(state.ui.message?.text || "")}</div>

          <div class="guided-actions guided-actions--sell">
            <button type="button" class="guided-primary guided-primary--save" data-action="save-offer" ${state.ui.isSaving || !state.canWrite ? "disabled" : ""}>
              ${!state.canWrite ? "🔒 Guardado pausado" : state.ui.isSaving ? "⏳ Guardando..." : "💾 Guardar oferta"}
            </button>
            <button type="button" class="guided-whatsapp" data-action-panel="whatsappPanel" ${whatsappDisabled ? "disabled" : ""}>📲 Ir a WhatsApp</button>
            <button type="button" class="guided-secondary" data-action="new-offer">Nueva oferta</button>
          </div>

          ${!state.canWrite ? `<p class="guided-muted">Para guardar ofertas y enviarlas desde la app, regularizá tu cuenta desde Inicio.</p>` : whatsappDisabled ? `<p class="guided-muted">Primero guardá la oferta para que aparezca en WhatsApp.</p>` : `<p class="guided-ok">Oferta guardada. Ya podés mandarla por WhatsApp.</p>`}
        </section>

        <aside class="card guided-builder__preview guided-builder__preview--sticky">
          ${renderTotalsBox()}
          <div class="guided-actions guided-actions--stack">
            <button type="button" class="guided-secondary" data-action="back-adjust">Editar cantidades</button>
            <button type="button" class="guided-secondary" data-action="back-products">Agregar productos</button>
          </div>
        </aside>
      </div>
    `;
  }

  function renderMiniPreview() {
    return `
      <div class="guided-mini-preview">
        <div class="guided-mini-preview__label">Vista para vender</div>
        ${renderCommercialPreview()}
      </div>
    `;
  }

  function renderCommercialPreview() {
    const previewName = String(state.draft.name || "").trim() || buildAutoComboName();
    const items = state.draft.items.map((item) => `<li>${formatNumber(item.cantidad)} ${escapeHtml(item.unidad || "u")} · ${escapeHtml(item.nombre || "Producto")}</li>`).join("");
    return `
      <div class="guided-commercial-card">
        <div class="guided-commercial-card__name">🔥 ${escapeHtml(previewName)}</div>
        <ul>${items || "<li>Sin productos</li>"}</ul>
        <div class="guided-commercial-card__meta">
          <span>${formatNumber(state.computed.peso_total)} kg</span>
          <span>${formatMoney(state.computed.precio_por_kg)}/kg</span>
        </div>
        <div class="guided-commercial-card__total">TOTAL: ${formatMoney(state.computed.total_final)}</div>
      </div>
    `;
  }

  function renderTotalsBox() {
    return `
      <div class="guided-totals-box">
        <div><span>Bruto</span><strong>${formatMoney(state.computed.bruto)}</strong></div>
        <div><span>Descuentos</span><strong>-${formatMoney(state.computed.descuento_total)}</strong></div>
        <div><span>Peso</span><strong>${formatNumber(state.computed.peso_total)} kg</strong></div>
        <div><span>Precio/kg</span><strong>${formatMoney(state.computed.precio_por_kg)}/kg</strong></div>
        <div class="guided-totals-box__final"><span>Total final</span><strong>${formatMoney(state.computed.total_final)}</strong></div>
      </div>
    `;
  }

  function cacheRefs() {
    refs = {
      comboName: container.querySelector("#guidedComboName"),
      historySelect: container.querySelector("#guidedHistorySelect"),
      historyMeta: container.querySelector("#guidedHistoryMeta"),
      productSearch: container.querySelector("#guidedProductSearch"),
      rubroFilter: container.querySelector("#guidedRubroFilter"),
      productGrid: container.querySelector("#guidedProductGrid"),
      adjustList: container.querySelector("#guidedAdjustList"),
      comboDiscount: container.querySelector("#guidedComboDiscount"),
      saveStatus: container.querySelector("#guidedSaveStatus")
    };
  }

  function bindEvents() {
    container.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => goToStep(Number(button.dataset.step)));
    });

    container.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        if (action === "new-offer") resetBuilder(true);
        if (action === "clear-offer") clearCurrentBuild();
        if (action === "go-adjust") goToStep(2);
        if (action === "go-sell") goToStep(3);
        if (action === "back-products") goToStep(1);
        if (action === "back-adjust") goToStep(2);
        if (action === "load-history") loadHistoryCombo();
        if (action === "save-offer") await handleSave();
      });
    });

    refs.comboName?.addEventListener("input", (event) => {
      state.draft.name = String(event.target.value || "");
      state.ui.lastSavedComboId = null;
    });

    refs.historySelect?.addEventListener("change", (event) => {
      state.ui.selectedHistoryComboId = String(event.target.value || "");
      renderHistoryMeta();
    });

    refs.productSearch?.addEventListener("input", (event) => {
      state.ui.searchTerm = String(event.target.value || "").trim().toLowerCase();
      populateProductGrid();
    });

    refs.rubroFilter?.addEventListener("change", (event) => {
      state.ui.rubroFilter = String(event.target.value || "").trim().toLowerCase();
      populateProductGrid();
    });

    refs.productGrid?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-add-product]");
      if (!btn) return;
      addProductById(btn.dataset.addProduct);
    });

    refs.adjustList?.addEventListener("click", (event) => {
      const dec = event.target.closest("[data-dec-index]");
      const inc = event.target.closest("[data-inc-index]");
      const del = event.target.closest("[data-del-index]");
      if (dec) changeQuantity(Number(dec.dataset.decIndex), -getStepForItem(Number(dec.dataset.decIndex)));
      if (inc) changeQuantity(Number(inc.dataset.incIndex), getStepForItem(Number(inc.dataset.incIndex)));
      if (del) removeItem(Number(del.dataset.delIndex));
    });

    refs.adjustList?.addEventListener("input", (event) => {
      const qty = event.target.closest("[data-qty-index]");
      const discount = event.target.closest("[data-discount-index]");
      if (qty) updateItemQuantity(Number(qty.dataset.qtyIndex), qty.value);
      if (discount) updateItemDiscount(Number(discount.dataset.discountIndex), discount.value);
    });

    refs.comboDiscount?.addEventListener("input", (event) => {
      state.draft.descuento_combo_percent = clampDiscount(event.target.value);
      state.ui.lastSavedComboId = null;
      recalculate();
      render();
    });
  }

  function renderDynamicFragments() {
    populateProductGrid();
    populateAdjustList();
    renderHistoryMeta();
  }

  function populateProductGrid() {
    if (!refs.productGrid) return;
    const filtered = getFilteredProducts().slice(0, MAX_PRODUCT_RESULTS);
    refs.productGrid.innerHTML = filtered.length
      ? filtered.map((product) => `
          <article class="guided-product-card">
            <div>
              <strong>${escapeHtml(product.nombre)}</strong>
              <span>${escapeHtml(product.rubro || "Sin rubro")}</span>
            </div>
            <div class="guided-product-card__price">${formatMoney(product.precio)}/${escapeHtml(product.unidad || "kg")}</div>
            <button type="button" data-add-product="${escapeHtml(product.id)}">+ Agregar</button>
          </article>
        `).join("")
      : `<div class="guided-empty">No encontré productos con ese filtro.</div>`;
  }

  function populateAdjustList() {
    if (!refs.adjustList) return;
    refs.adjustList.innerHTML = state.draft.items.length
      ? state.draft.items.map((item, index) => `
          <article class="guided-adjust-card">
            <div class="guided-adjust-card__main">
              <strong>${escapeHtml(item.nombre)}</strong>
              <span>${escapeHtml(item.rubro || "Sin rubro")} · ${formatMoney(item.precio_unitario_actual)}/${escapeHtml(item.unidad || "kg")}</span>
            </div>
            <div class="guided-qty-control">
              <button type="button" data-dec-index="${index}">−</button>
              <input type="number" min="${isKgUnit(item.unidad) ? "0.1" : "1"}" step="${isKgUnit(item.unidad) ? "0.1" : "1"}" value="${escapeHtml(String(item.cantidad))}" data-qty-index="${index}" inputmode="${isKgUnit(item.unidad) ? "decimal" : "numeric"}" />
              <button type="button" data-inc-index="${index}">+</button>
              <span>${escapeHtml(item.unidad || "kg")}</span>
            </div>
            <div class="guided-discount-inline">
              <label>Desc. %</label>
              <input type="number" min="0" max="100" step="1" value="${escapeHtml(String(item.descuento_individual || 0))}" data-discount-index="${index}" inputmode="numeric" />
            </div>
            <div class="guided-line-total">
              <span>Neto</span>
              <strong>${formatMoney(item._calc?.subtotal_neto || 0)}</strong>
            </div>
            <button type="button" class="guided-delete" data-del-index="${index}">Eliminar</button>
          </article>
        `).join("")
      : `<div class="guided-empty">Todavía no agregaste productos.</div>`;
  }

  function goToStep(nextStep) {
    const step = Number(nextStep);
    if (![1, 2, 3].includes(step)) return;
    if (step > 1 && !state.draft.items.length) {
      setMessage("Primero agregá al menos un producto.", "warning");
      return;
    }
    state.step = step;
    recalculate();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addProductById(productId) {
    const normalizedId = String(productId || "").trim();
    if (!normalizedId) return;

    const existing = state.draft.items.find((item) => String(item.productId) === normalizedId);
    if (existing) {
      existing.cantidad = normalizeQuantityByUnit(Number(existing.cantidad || 0) + getStepForUnit(existing.unidad), existing.unidad);
      recalculate();
      render();
      return;
    }

    const product = state.products.find((item) => String(item.id) === normalizedId);
    if (!product) {
      setMessage("El producto seleccionado ya no existe.", "error");
      return;
    }

    state.draft.items.push({
      productId: product.id,
      productKey: product.productKey || product.id,
      nombre: product.nombre,
      rubro: product.rubro,
      subrubro: product.subrubro || "",
      unidad: product.unidad || "kg",
      precio_unitario_actual: Number(product.precio || 0),
      cantidad: 1,
      descuento_individual: 0,
      _calc: { subtotal_bruto: 0, descuento_monto: 0, subtotal_neto: 0 }
    });

    if (!String(state.draft.name || "").trim()) {
      recalculate();
      state.draft.name = buildAutoComboName();
    }
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function changeQuantity(index, delta) {
    const item = state.draft.items[index];
    if (!item) return;
    item.cantidad = normalizeQuantityByUnit(Number(item.cantidad || 0) + delta, item.unidad);
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function getStepForItem(index) {
    const item = state.draft.items[index];
    return getStepForUnit(item?.unidad);
  }

  function getStepForUnit(unidad) {
    return isKgUnit(unidad) ? 0.5 : 1;
  }

  function updateItemQuantity(index, rawValue) {
    const item = state.draft.items[index];
    if (!item) return;
    item.cantidad = normalizeQuantityByUnit(Number(rawValue), item.unidad);
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function updateItemDiscount(index, rawValue) {
    const item = state.draft.items[index];
    if (!item) return;
    item.descuento_individual = clampDiscount(rawValue);
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function removeItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.draft.items.length) return;
    state.draft.items.splice(index, 1);
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function loadHistoryCombo() {
    const comboId = String(state.ui.selectedHistoryComboId || refs.historySelect?.value || "").trim();
    if (!comboId) {
      setMessage("Seleccioná una oferta para cargar.", "warning");
      return;
    }

    const combo = state.savedCombos.find((item) => item.id === comboId);
    if (!combo) {
      setMessage("No se encontró la oferta seleccionada.", "error");
      return;
    }

    const newItems = Array.isArray(combo.items)
      ? combo.items.map((savedItem) => buildDraftItemFromSavedCombo(savedItem)).filter(Boolean)
      : [];

    state.draft = {
      name: combo.name || "",
      items: newItems,
      descuento_combo_percent: Number(combo?.snapshot?.totals?.descuento_combo_percent ?? combo?.descuento_combo_percent ?? 0) || 0,
      loadedFromComboId: combo.id
    };

    state.step = 2;
    state.ui.lastSavedComboId = null;
    recalculate();
    setMessage("Oferta cargada con precios actuales.", "success", false);
    render();
  }

  function buildDraftItemFromSavedCombo(savedItem) {
    const productId = String(savedItem?.productId || savedItem?.productKey || "").trim();
    const currentProduct = state.products.find((product) => String(product.id) === productId || String(product.productKey) === productId);

    if (currentProduct) {
      return {
        productId: currentProduct.id,
        productKey: currentProduct.productKey || currentProduct.id,
        nombre: currentProduct.nombre,
        rubro: currentProduct.rubro,
        subrubro: currentProduct.subrubro || "",
        unidad: currentProduct.unidad || "kg",
        precio_unitario_actual: Number(currentProduct.precio || 0),
        cantidad: normalizeQuantityByUnit(Number(savedItem?.cantidad || 0) || 1, currentProduct.unidad || "kg"),
        descuento_individual: clampDiscount(savedItem?.descuento_individual),
        _calc: { subtotal_bruto: 0, descuento_monto: 0, subtotal_neto: 0 }
      };
    }

    const fallbackPrice = Number(savedItem?.snapshot_precio_unitario ?? savedItem?.precio_unitario ?? savedItem?.precio ?? 0) || 0;
    return {
      productId: productId || `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productKey: productId || null,
      nombre: String(savedItem?.nombre || "Producto eliminado").trim(),
      rubro: String(savedItem?.rubro || "").trim(),
      subrubro: String(savedItem?.subrubro || "").trim(),
      unidad: String(savedItem?.unidad || "kg").trim() || "kg",
      precio_unitario_actual: fallbackPrice,
      cantidad: normalizeQuantityByUnit(Number(savedItem?.cantidad || 0) || 1, savedItem?.unidad || "kg"),
      descuento_individual: clampDiscount(savedItem?.descuento_individual),
      _calc: { subtotal_bruto: 0, descuento_monto: 0, subtotal_neto: 0 }
    };
  }

  async function handleSave() {
    if (state.ui.isSaving) return;

    if (!state.canWrite) {
      setMessage(state.writeBlockMessage, "error", false);
      return;
    }

    const validationError = validateDraft();
    if (validationError) {
      setMessage(validationError, "error");
      return;
    }

    state.ui.isSaving = true;
    setMessage("Guardando oferta...", "info");

    try {
      state.session = state.session || await resolveSession().catch(() => null);
      const sessionBusinessId = state.session?.appMode === "client" ? state.session.businessId : null;
      state.businessId = options?.businessId || sessionBusinessId || state.businessId || getCurrentBusinessId();

      if (!state.businessId || state.businessId === "demo") {
        throw new Error("No se encontró una empresa activa válida para guardar la oferta.");
      }

      const latest = await loadActiveBusinessData(state.businessId);
      state.businessId = latest?.businessId || state.businessId;

      const payload = buildComboPayload();
      const currentSavedCombos = Array.isArray(latest?.state?.savedCombos) ? latest.state.savedCombos : [];
      const updatedCombos = [payload, ...currentSavedCombos].slice(0, 200);

      await updateBusinessState(state.businessId, { savedCombos: updatedCombos });

      state.savedCombos = updatedCombos.sort(sortCombosByDateDesc).slice(0, HISTORY_LIMIT);
      state.ui.lastSavedComboId = payload.id;
      setMessage("✅ Oferta guardada. Ya podés enviarla por WhatsApp.", "success", false);

      if (typeof onComboSaved === "function") {
        await onComboSaved(payload);
      }
    } catch (error) {
      console.error("Builder guiado save error:", error);
      setMessage(error?.message || "Error al guardar la oferta.", "error", false);
    } finally {
      state.ui.isSaving = false;
      render();
    }
  }

  function buildComboPayload() {
    const createdAt = new Date().toISOString();
    const comboId = `combo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanName = String(state.draft.name || "").trim() || buildAutoComboName();
    const items = state.draft.items.map((item) => ({
      productId: item.productId || null,
      productKey: item.productKey || item.productId || null,
      nombre: item.nombre,
      rubro: item.rubro || "",
      subrubro: item.subrubro || "",
      unidad: item.unidad || "kg",
      cantidad: Number(item.cantidad || 0),
      descuento_individual: clampDiscount(item.descuento_individual),
      snapshot_precio_unitario: Number(item.precio_unitario_actual || 0),
      snapshot_subtotal_bruto: round2(item._calc?.subtotal_bruto || 0),
      snapshot_subtotal_neto: round2(item._calc?.subtotal_neto || 0)
    }));

    const snapshotItems = state.draft.items.map((item) => ({
      productId: item.productId || null,
      productKey: item.productKey || item.productId || null,
      nombre: item.nombre,
      precio_unitario: round2(item.precio_unitario_actual || 0),
      subtotal_bruto: round2(item._calc?.subtotal_bruto || 0),
      descuento_monto: round2(item._calc?.descuento_monto || 0),
      subtotal_neto: round2(item._calc?.subtotal_neto || 0)
    }));

    return {
      id: comboId,
      businessId: state.businessId,
      name: cleanName,
      createdAt,
      updatedAt: createdAt,
      createdByUid: state.session?.firebaseUser?.uid || null,
      createdByEmail: state.session?.firebaseUser?.email || null,
      source: "builder_guided_v9_6",
      version: MODULE_VERSION,
      loadedFromComboId: state.draft.loadedFromComboId || null,
      items,
      snapshot: {
        items: snapshotItems,
        totals: {
          bruto: round2(state.computed.bruto),
          descuento_individual_total: round2(state.computed.descuento_individual_total),
          descuento_combo_percent: clampDiscount(state.draft.descuento_combo_percent),
          descuento_combo_monto: round2(state.computed.descuento_combo_monto),
          descuento_total: round2(state.computed.descuento_total),
          subtotal: round2(state.computed.subtotal),
          total_redondeado: round2(state.computed.total_final),
          peso_total: round2(state.computed.peso_total),
          precio_por_kg: round2(state.computed.precio_por_kg)
        }
      },
      total: round2(state.computed.total_final)
    };
  }

  function validateDraft() {
    if (!state.businessId) return "No se encontró la empresa activa.";
    if (!Array.isArray(state.draft.items) || !state.draft.items.length) return "Agregá al menos un producto a la oferta.";
    for (const item of state.draft.items) {
      if (!(Number(item.cantidad) > 0)) return `Cantidad inválida en ${item.nombre || "un producto"}.`;
      if (clampDiscount(item.descuento_individual) !== Number(item.descuento_individual || 0)) return `Descuento inválido en ${item.nombre || "un producto"}.`;
    }
    return null;
  }

  function clearCurrentBuild() {
    state.draft.items = [];
    state.draft.descuento_combo_percent = 0;
    state.draft.loadedFromComboId = null;
    state.ui.lastSavedComboId = null;
    recalculate();
    render();
  }

  function resetBuilder(fullReset = false) {
    state.draft = { name: fullReset ? "" : state.draft.name, items: [], descuento_combo_percent: 0, loadedFromComboId: null };
    if (fullReset) state.ui.selectedHistoryComboId = "";
    state.ui.lastSavedComboId = null;
    state.ui.message = null;
    state.step = 1;
    recalculate();
    render();
  }

  function setMessage(text, type = "info", shouldRender = true) {
    state.ui.message = { text, type };
    if (shouldRender) render();
  }

  function renderHistoryMeta() {
    if (!refs.historyMeta) return;
    if (!state.ui.selectedHistoryComboId) {
      refs.historyMeta.textContent = "Sin oferta seleccionada";
      return;
    }
    const combo = state.savedCombos.find((item) => item.id === state.ui.selectedHistoryComboId);
    if (!combo) {
      refs.historyMeta.textContent = "Oferta no encontrada";
      return;
    }
    const totalOriginal = Number(combo?.snapshot?.totals?.total_redondeado ?? combo?.total ?? 0);
    const itemCount = Array.isArray(combo?.items) ? combo.items.length : 0;
    refs.historyMeta.textContent = `${formatShortDate(combo.createdAt)} · ${itemCount} producto(s) · Original: ${formatMoney(totalOriginal)}`;
  }

  function getFilteredProducts() {
    return state.products.filter((product) => {
      if (product.active === false) return false;
      const nombre = String(product.nombre || "").toLowerCase();
      const rubro = String(product.rubro || "").toLowerCase();
      const subrubro = String(product.subrubro || "").toLowerCase();
      const matchSearch = !state.ui.searchTerm || nombre.includes(state.ui.searchTerm) || rubro.includes(state.ui.searchTerm) || subrubro.includes(state.ui.searchTerm);
      const matchRubro = !state.ui.rubroFilter || rubro === state.ui.rubroFilter;
      return matchSearch && matchRubro;
    });
  }

  function getUniqueRubros() {
    return Array.from(new Set(state.products.filter((item) => item.active !== false).map((item) => String(item.rubro || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
  }

  function recalculate() {
    let bruto = 0;
    let descuentoIndividualTotal = 0;
    let pesoTotal = 0;

    state.draft.items.forEach((item) => {
      const precio = Number(item.precio_unitario_actual || 0);
      const cantidad = Number(item.cantidad || 0);
      const descuentoPct = clampDiscount(item.descuento_individual);
      const subtotalBruto = precio * cantidad;
      const descuentoMonto = subtotalBruto * (descuentoPct / 100);
      const subtotalNeto = subtotalBruto - descuentoMonto;
      item.descuento_individual = descuentoPct;
      item._calc = { subtotal_bruto: subtotalBruto, descuento_monto: descuentoMonto, subtotal_neto: subtotalNeto };
      bruto += subtotalBruto;
      descuentoIndividualTotal += descuentoMonto;
      if (isKgUnit(item.unidad)) pesoTotal += cantidad;
    });

    const descuentoComboMonto = bruto * (clampDiscount(state.draft.descuento_combo_percent) / 100);
    const descuentoTotal = descuentoIndividualTotal + descuentoComboMonto;
    const subtotal = bruto - descuentoTotal;
    const totalFinal = roundUpTo100(subtotal);
    const precioPorKg = pesoTotal > 0 ? roundUpTo100(totalFinal / pesoTotal) : 0;

    state.computed = {
      bruto,
      descuento_individual_total: descuentoIndividualTotal,
      descuento_combo_monto: descuentoComboMonto,
      descuento_total: descuentoTotal,
      subtotal,
      redondeo_monto: totalFinal - subtotal,
      total_final: totalFinal,
      peso_total: pesoTotal,
      precio_por_kg: precioPorKg
    };
  }

  function buildAutoComboName() {
    const rubros = Array.from(new Set(state.draft.items.map((item) => String(item.rubro || "").trim()).filter(Boolean)));
    const peso = state.computed?.peso_total || state.draft.items.reduce((acc, item) => acc + (isKgUnit(item.unidad) ? Number(item.cantidad || 0) : 0), 0);
    const pesoLabel = peso > 0 ? ` ${formatNumber(peso)}kg` : "";
    if (rubros.length === 1) return `Combo ${rubros[0]}${pesoLabel}`.trim();
    if (rubros.length === 2) return `Combo ${rubros[0]} + ${rubros[1]}${pesoLabel}`.trim();
    if (rubros.length >= 3) return `Combo Familiar${pesoLabel}`.trim();
    const firstNames = state.draft.items.slice(0, 2).map((item) => String(item.nombre || "").trim()).filter(Boolean);
    if (firstNames.length) return `Combo ${firstNames.join(" + ")}${pesoLabel}`.trim();
    const date = new Date();
    return `Combo ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function normalizeProducts(rawProducts = []) {
    if (!Array.isArray(rawProducts)) return [];
    return rawProducts.map((item, index) => {
      const id = String(item?.id ?? item?.productKey ?? `prod_${index}`).trim();
      return {
        id,
        productKey: String(item?.productKey ?? id).trim(),
        nombre: String(item?.nombre ?? "").trim(),
        rubro: String(item?.rubro ?? "").trim(),
        subrubro: String(item?.subrubro ?? "").trim(),
        unidad: String(item?.unidad ?? "kg").trim() || "kg",
        precio: Number(item?.precio ?? 0) || 0,
        active: item?.active !== false && item?.activo !== false
      };
    });
  }

  function sortCombosByDateDesc(a, b) {
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0;
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0;
    return bTime - aTime;
  }

  function emptyTotals() {
    return { bruto: 0, descuento_individual_total: 0, descuento_combo_monto: 0, descuento_total: 0, subtotal: 0, redondeo_monto: 0, total_final: 0, peso_total: 0, precio_por_kg: 0 };
  }

  function clampDiscount(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function normalizeQuantityByUnit(value, unidad) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return isKgUnit(unidad) ? 0.1 : 1;
    return isKgUnit(unidad) ? round2(numeric) : Math.max(1, Math.round(numeric));
  }

  function isKgUnit(unidad) {
    return String(unidad || "").trim().toLowerCase() === "kg";
  }

  function roundUpTo100(value) {
    const numeric = Number(value || 0);
    if (numeric <= 0) return 0;
    return Math.ceil(numeric / 100) * 100;
  }

  function round2(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    const isInt = Math.abs(number - Math.round(number)) < 0.001;
    return new Intl.NumberFormat("es-AR", { minimumFractionDigits: isInt ? 0 : 2, maximumFractionDigits: isInt ? 0 : 2 }).format(number);
  }

  function formatShortDate(dateValue) {
    if (!dateValue) return "sin fecha";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "sin fecha";
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
}

function injectGuidedBuilderStyles() {
  if (document.getElementById("builder-guided-styles")) return;
  const style = document.createElement("style");
  style.id = "builder-guided-styles";
  style.textContent = `
    .guided-builder { display:flex; flex-direction:column; gap:14px; }
    .guided-builder .card { background:#fff; border:1px solid #eadfd7; border-radius:18px; box-shadow:0 8px 24px rgba(16,24,40,.045); }
    .guided-builder__hero { display:flex; justify-content:space-between; gap:14px; align-items:center; padding:18px; }
    .guided-builder__eyebrow { color:#c23b28; font-weight:950; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
    .guided-builder__hero h2 { margin:4px 0; font-size:34px; line-height:1; color:#8b1f1f; }
    .guided-builder__hero p { margin:0; color:#667085; font-size:15px; }
    .guided-builder button { font:inherit; border:0; border-radius:12px; padding:12px 15px; cursor:pointer; font-weight:850; transition:transform .05s ease, opacity .2s ease; }
    .guided-builder button:active { transform:translateY(1px); }
    .guided-builder button:disabled { opacity:.55; cursor:not-allowed; }
    .guided-builder input, .guided-builder select { font:inherit; width:100%; box-sizing:border-box; border:1px solid #d0d5dd; border-radius:14px; padding:13px 14px; background:#fff; }
    .guided-builder input:focus, .guided-builder select:focus { outline:none; border-color:#c23b28; box-shadow:0 0 0 4px rgba(194,59,40,.12); }
    .guided-builder__reset, .guided-secondary { background:#f8fafc; color:#111827; border:1px solid #d0d5dd !important; }
    .guided-primary { background:#d86618; color:#fff; }
    .guided-primary--save { background:#c23b28; font-size:18px; padding:16px 18px; }
    .guided-whatsapp { background:#16a34a; color:#fff; }
    .guided-steps { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
    .guided-step { background:#fff; border:1px solid #eadfd7 !important; color:#344054; display:flex; gap:10px; align-items:center; justify-content:flex-start; text-align:left; padding:12px; }
    .guided-step.active { background:#fff7ed; color:#8b1f1f; border-color:#fb923c !important; box-shadow:0 6px 18px rgba(216,102,24,.12); }
    .guided-step.complete .guided-step__number { background:#16a34a; }
    .guided-step__number { width:34px; height:34px; border-radius:50%; background:#d86618; color:#fff; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
    .guided-step small { display:block; color:#667085; font-weight:600; margin-top:2px; }
    .guided-builder__grid { display:grid; grid-template-columns:minmax(0, 1fr) minmax(300px, 360px); gap:16px; align-items:start; }
    .guided-builder__work, .guided-builder__preview { padding:16px; }
    .guided-builder__preview--sticky { position:sticky; top:94px; align-self:start; }
    .guided-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px; }
    .guided-section-head h3 { margin:0 0 4px; font-size:24px; color:#8b1f1f; }
    .guided-section-head p { margin:0; color:#667085; }
    .guided-field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
    .guided-field label { text-transform:uppercase; font-size:12px; font-weight:950; color:#344054; }
    .guided-history { border:1px dashed #eadfd7; border-radius:14px; margin-bottom:12px; padding:10px 12px; background:#fffdf8; }
    .guided-history summary { cursor:pointer; font-weight:900; color:#8b1f1f; }
    .guided-history__body { display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:10px; align-items:center; }
    .guided-history__body .small { grid-column:1 / -1; }
    .guided-searchbar { display:grid; grid-template-columns:1fr 220px; gap:10px; margin-bottom:14px; }
    .guided-product-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px; }
    .guided-product-card { border:1px solid #eef0f3; border-radius:16px; padding:12px; background:#fbfbfc; display:flex; flex-direction:column; gap:8px; min-height:132px; }
    .guided-product-card strong { display:block; color:#101828; font-size:16px; }
    .guided-product-card span { display:block; color:#667085; font-size:13px; margin-top:2px; }
    .guided-product-card__price { color:#8b1f1f; font-weight:950; }
    .guided-product-card button { background:#111827; color:#fff; margin-top:auto; }
    .guided-mini-preview__label { font-size:12px; font-weight:950; text-transform:uppercase; color:#8b1f1f; margin-bottom:10px; }
    .guided-commercial-card { background:#fff7ed; border:1px solid #fed7aa; border-radius:16px; padding:15px; display:flex; flex-direction:column; gap:10px; }
    .guided-commercial-card__name { font-size:18px; font-weight:950; color:#7c2d12; }
    .guided-commercial-card ul { margin:0; padding-left:18px; color:#9a3412; display:flex; flex-direction:column; gap:5px; }
    .guided-commercial-card__meta { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; color:#9a3412; font-weight:900; }
    .guided-commercial-card__total { color:#c23b28; font-size:32px; font-weight:950; line-height:1; }
    .guided-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
    .guided-actions--stack { flex-direction:column; }
    .guided-actions--stack button, .guided-actions--sell button { flex:1; }
    .guided-adjust-list { display:flex; flex-direction:column; gap:10px; }
    .guided-adjust-card { display:grid; grid-template-columns:minmax(180px, 1fr) auto auto minmax(120px, auto) auto; gap:10px; align-items:center; padding:12px; border:1px solid #eef0f3; border-radius:16px; background:#fbfbfc; }
    .guided-adjust-card__main strong { display:block; font-size:16px; color:#101828; }
    .guided-adjust-card__main span { display:block; font-size:13px; color:#667085; }
    .guided-qty-control { display:flex; align-items:center; gap:6px; }
    .guided-qty-control button { width:42px; height:42px; padding:0; background:#fff; color:#111827; border:1px solid #d0d5dd !important; font-size:22px; }
    .guided-qty-control input { width:76px; text-align:center; font-weight:950; }
    .guided-qty-control span { font-weight:900; color:#667085; }
    .guided-discount-inline { display:flex; align-items:center; gap:6px; }
    .guided-discount-inline label { font-size:12px; font-weight:900; color:#667085; }
    .guided-discount-inline input { width:76px; text-align:center; font-weight:950; }
    .guided-line-total span { display:block; font-size:12px; color:#667085; }
    .guided-line-total strong { font-size:17px; color:#101828; }
    .guided-delete { background:#fff1f2; color:#be123c; border:1px solid #fecdd3 !important; }
    .guided-general-discount { margin-top:14px; padding:14px; border:1px solid #eadfd7; border-radius:16px; background:#fffdf8; display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .guided-general-discount strong, .guided-general-discount span { display:block; }
    .guided-general-discount span { color:#667085; font-size:13px; margin-top:2px; }
    .guided-discount-control { display:flex; align-items:center; gap:8px; }
    .guided-discount-control input { width:110px; text-align:center; font-weight:950; }
    .guided-final-preview { max-width:540px; margin-bottom:14px; }
    .guided-totals-box { display:flex; flex-direction:column; gap:8px; }
    .guided-totals-box > div { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid #f0f0f0; padding-bottom:8px; }
    .guided-totals-box span { color:#667085; }
    .guided-totals-box__final { border-bottom:none !important; margin-top:8px; padding:14px; background:#fff7ed; border:1px solid #fed7aa !important; border-radius:14px; align-items:center; }
    .guided-totals-box__final strong { color:#c23b28; font-size:28px; }
    .guided-save-status { min-height:22px; font-weight:900; margin-bottom:8px; }
    .guided-ok { color:#12803c; font-weight:850; }
    .guided-muted { color:#667085; }
    .guided-empty { padding:18px; border:1px dashed #d0d5dd; border-radius:14px; color:#667085; background:#fafafa; }
    .status-success { color:#0a7d33; }
    .status-error { color:#b42318; }
    .status-warning { color:#9a6700; }
    .status-info { color:#175cd3; }
    @media (max-width: 980px) {
      .guided-builder__grid { grid-template-columns:1fr; }
      .guided-builder__preview--sticky { position:static; }
      .guided-searchbar { grid-template-columns:1fr; }
      .guided-adjust-card { grid-template-columns:1fr; align-items:stretch; }
      .guided-qty-control, .guided-discount-inline { justify-content:space-between; }
      .guided-general-discount { flex-direction:column; align-items:stretch; }
      .guided-discount-control input { width:100%; }
    }
    @media (max-width: 720px) {
      .guided-builder__hero { flex-direction:column; align-items:stretch; }
      .guided-steps { grid-template-columns:1fr; }
      .guided-builder__hero h2 { font-size:28px; }
      .guided-section-head { flex-direction:column; }
      .guided-history__body { grid-template-columns:1fr; }
      .guided-commercial-card__total { font-size:28px; }
    }
  `;
  document.head.appendChild(style);
}
