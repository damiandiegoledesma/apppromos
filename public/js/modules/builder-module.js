import { buildCustomerWhatsappMessage, openCustomerWhatsappMessage } from "../services/whatsapp-message-service.js";
import { saveCombo, updateSavedCombo } from "../services/data-service.js";
import { getProductThumbnailPath } from "../services/product-image-service.js";
import { CARNIZA_SPOTLIGHT_STYLES, renderCarnizaSpotlight } from "../services/carniza-spotlight-service.js";

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR").format(Number(value || 0));
}

function roundUpTo100(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.ceil(numeric / 100) * 100;
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clampPercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
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

function getProductName(product = {}) {
  return String(product.nombre || product.name || product.label || product.title || "Sin nombre").trim();
}

function getProductRubro(product = {}) {
  return String(product.rubro || product.category || product.categoria || product.section || "").trim();
}

function getProductUnit(product = {}) {
  return String(product.unidad || product.unit || "kg").trim() || "kg";
}

function getProductPrice(product = {}) {
  const value = product.precio ?? product.price ?? product.precioFinal ?? product.valor ?? 0;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getProductKey(product) {
  return product?.productKey || product?.id || product?.key || getProductName(product) || null;
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product?.id || product?.productKey || product?.key || null,
    productKey: getProductKey(product),
    nombre: getProductName(product),
    precio: getProductPrice(product),
    rubro: getProductRubro(product),
    unidad: getProductUnit(product),
    cantidad: Number(product?.cantidad || 1),
    descuento_individual: clampPercent(product?.descuento_individual || 0),
  };
}

function calculateDiscountItem(item) {
  const cantidad = Number(item.cantidad || 1);
  const precio = Number(item.precio || 0);
  const descuento = clampPercent(item.descuento_individual || 0);
  const bruto = precio * cantidad;
  const descuentoMonto = bruto * (descuento / 100);
  const neto = roundUpTo100(bruto - descuentoMonto);

  return {
    cantidad,
    precio,
    descuento,
    bruto,
    descuentoMonto,
    neto,
  };
}

function calculateDiscountTotals(items = [], globalDiscount = 0) {
  const subtotalBruto = items.reduce((acc, item) => acc + calculateDiscountItem(item).bruto, 0);
  const subtotalNeto = items.reduce((acc, item) => acc + calculateDiscountItem(item).neto, 0);
  const descuentoPorProducto = Math.max(0, subtotalBruto - subtotalNeto);
  const descuentoGlobal = clampPercent(globalDiscount);
  const descuentoGlobalMonto = subtotalNeto * (descuentoGlobal / 100);
  const totalMatematico = Math.max(0, subtotalNeto - descuentoGlobalMonto);
  const totalWeight = items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  const normalizedUnits = new Set(items.map((item) => String(item.unidad || "kg").trim().toLowerCase()));
  const allSoldByKg = items.length > 0
    && [...normalizedUnits].every((unit) => ["kg", "kilo", "kilos"].includes(unit));

  let scalePricePerKg = 0;
  let total = roundUpTo100(totalMatematico);

  if (allSoldByKg && totalWeight > 0 && totalMatematico > 0) {
    const exactPricePerKg = totalMatematico / totalWeight;
    let candidate = roundUpTo100(exactPricePerKg);

    /* V12.22-A2-FIX3D: buscamos el menor precio de balanza, en centenas,
       cuyo total para el peso previsto también cierre exactamente en centenas. */
    for (let attempts = 0; attempts < 1000; attempts += 1) {
      const candidateTotal = candidate * totalWeight;
      const roundedHundreds = Math.round(candidateTotal / 100) * 100;
      if (Math.abs(candidateTotal - roundedHundreds) < 0.0001) {
        scalePricePerKg = candidate;
        total = roundedHundreds;
        break;
      }
      candidate += 100;
    }

    if (!scalePricePerKg) {
      scalePricePerKg = roundUpTo100(exactPricePerKg);
      total = scalePricePerKg * totalWeight;
    }
  }

  const descuentosAplicados = Math.max(0, subtotalBruto - total);

  return {
    subtotalBruto,
    subtotalNeto,
    descuentoPorProducto,
    descuentoGlobal,
    descuentoGlobalMonto,
    totalMatematico,
    totalWeight,
    allSoldByKg,
    scalePricePerKg,
    descuentosAplicados,
    total,
  };
}

function buildWhatsappText(combo, businessMeta = {}) {
  return buildCustomerWhatsappMessage(combo, businessMeta);
}

function openComboWhatsapp(combo, businessMeta = {}) {
  return openCustomerWhatsappMessage(combo, businessMeta);
}

function canRunOptionHook(hook, payload) {
  if (typeof hook !== "function") return true;
  try {
    return hook(payload) !== false;
  } catch (error) {
    console.warn("AppPromos: no se pudo validar la acción de demo", error);
    return true;
  }
}

const PRODUCT_RENDER_BATCH = 24;
const QUICK_SUGGESTED_LIMIT = 5;

export function renderBuilder(container, products = [], onComboSaved = null, options = {}) {
  if (!container) return;

  const safeProducts = (Array.isArray(products) ? products : [])
    .map((product) => normalizeProduct(product))
    .filter((product) => product && product.active !== false && product.activo !== false && product.precio > 0)
    .sort((a, b) => String(a.rubro || "").localeCompare(String(b.rubro || ""), "es") || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  let mode = "chooser";
  const editingCombo = options?.initialCombo && typeof options.initialCombo === "object"
    ? options.initialCombo
    : null;

  function createQuickState() {
    return {
      step: 1,
      items: [],
      searchTerm: "",
      rubroFilter: "",
      productLimit: PRODUCT_RENDER_BATCH,
      searchDebounceTimer: null,
      offerTracked: false,
    };
  }

  function createDiscountState() {
    return {
      step: 1,
      items: [],
      searchTerm: "",
      rubroFilter: "",
      productLimit: PRODUCT_RENDER_BATCH,
      searchDebounceTimer: null,
      offerTracked: false,
      globalDiscount: 0,
      offerName: "",
    };
  }

  const state = {
    quick: createQuickState(),
    discount: createDiscountState(),
  };

  function resetQuickState() {
    if (state.quick?.searchDebounceTimer) clearTimeout(state.quick.searchDebounceTimer);
    state.quick = createQuickState();
  }

  function resetDiscountState() {
    if (state.discount?.searchDebounceTimer) clearTimeout(state.discount.searchDebounceTimer);
    state.discount = createDiscountState();
  }

  function resetAllOfferFlows() {
    resetQuickState();
    resetDiscountState();
  }

  function showChooser({ clear = false } = {}) {
    if (clear) resetAllOfferFlows();
    mode = "chooser";
    renderChooser();
  }

  function startQuickMode() {
    resetQuickState();
    resetDiscountState();
    mode = "quick";
    renderQuick();
  }

  function startDiscountMode() {
    resetQuickState();
    resetDiscountState();
    mode = "discount";
    renderDiscount();
  }

  function startEditMode(combo = {}) {
    resetQuickState();
    resetDiscountState();
    const productsById = new Map();
    safeProducts.forEach((product = {}) => {
      [product.id, product.productKey, product.key]
        .filter(Boolean)
        .forEach((id) => productsById.set(String(id), product));
    });

    state.discount.items = (Array.isArray(combo.items) ? combo.items : []).map((savedItem = {}) => {
      const link = String(savedItem.productId || savedItem.productKey || savedItem.id || "");
      const currentProduct = productsById.get(link);
      return normalizeProduct({
        ...(currentProduct || {}),
        ...savedItem,
        id: currentProduct?.id || savedItem.id || savedItem.productId || null,
        productKey: currentProduct?.productKey || savedItem.productKey || savedItem.productId || savedItem.id || null,
        precio: currentProduct ? getProductPrice(currentProduct) : getProductPrice(savedItem),
        cantidad: Number(savedItem.cantidad ?? savedItem.qty ?? 1),
        descuento_individual: clampPercent(savedItem.descuento_individual ?? savedItem.individualDiscount ?? 0),
      });
    });
    state.discount.globalDiscount = clampPercent(combo?.discountSummary?.globalDiscount || 0);
    state.discount.offerName = String(combo.name || "").trim();
    state.discount.step = 1;
    mode = "discount";
    renderDiscount();
  }

  function getUniqueRubros(productList = safeProducts) {
    const rubros = new Set();
    productList.forEach((product) => {
      const rubro = String(product.rubro || "").trim();
      if (rubro) rubros.add(rubro);
    });
    return Array.from(rubros).sort((a, b) => a.localeCompare(b, "es"));
  }

  function getFilteredProducts({ searchTerm = "", rubroFilter = "" } = {}) {
    const term = String(searchTerm || "").toLowerCase().trim();
    const selectedRubro = String(rubroFilter || "").toLowerCase().trim();

    const filtered = safeProducts.filter((product) => {
      const nombre = String(product.nombre || "").toLowerCase();
      const rubro = String(product.rubro || "").toLowerCase();
      const matchSearch = !term || nombre.includes(term) || rubro.includes(term);
      const matchRubro = !selectedRubro || rubro === selectedRubro;
      return matchSearch && matchRubro;
    });

    return filtered;
  }

  function findProductByKey(key) {
    return safeProducts.find((product) => String(getProductKey(product)) === String(key));
  }

  function addProductToList(list, product) {
    const key = getProductKey(product);
    const existing = list.find((item) => String(item.productKey || item.id || item.nombre) === String(key));
    if (existing) {
      existing.cantidad = Number(existing.cantidad || 1) + 1;
      return;
    }
    list.push(normalizeProduct(product));
  }

  function getQuickTotal() {
    const rawTotal = state.quick.items.reduce((acc, item) => acc + Number(item.precio || 0) * Number(item.cantidad || 0), 0);
    return roundUpTo100(rawTotal);
  }

  function buildQuickPayload() {
    return {
      name: "OFERTA DEL DIA",
      description: "Respuesta puntual creada para un cliente por WhatsApp.",
      mode: "quick",
      items: state.quick.items.map((item) => ({ ...item })),
      total: getQuickTotal(),
      createdAt: new Date().toISOString(),
    };
  }

  function buildDiscountPayload() {
    const totals = calculateDiscountTotals(state.discount.items, state.discount.globalDiscount);
    return {
      name: String(state.discount.offerName || "").trim(),
      description: "",
      mode: "discount",
      discountSummary: {
        globalDiscount: state.discount.globalDiscount,
        subtotalBruto: totals.subtotalBruto,
        subtotalNeto: totals.subtotalNeto,
        descuentosAplicados: totals.descuentosAplicados,
        totalMatematico: totals.totalMatematico,
        totalWeight: totals.totalWeight,
        scalePricePerKg: totals.scalePricePerKg,
        scalePricingAvailable: totals.allSoldByKg,
      },
      items: state.discount.items.map((item) => {
        const calc = calculateDiscountItem(item);
        return {
          ...item,
          precio_original: calc.bruto,
          descuento_individual: calc.descuento,
          total_con_descuento: calc.neto,
        };
      }),
      total: totals.total,
      tipo: "promo_con_descuento",
      savedAs: "promo",
      isPromotional: true,
      status: "active",
      createdAt: new Date().toISOString(),
    };
  }

  async function saveBuiltCombo(payload) {
    if (payload?.mode !== "discount") {
      alert("Esta oferta es del momento. Mandala por WhatsApp; solo las promos con descuento se guardan.");
      return null;
    }
    if (!canRunOptionHook(options?.onBeforePromoSave, { source: "builder_discount", payload })) {
      return null;
    }
    let combo = null;
    if (editingCombo) {
      if (options?.initialComboPublished) {
        const confirmed = window.confirm("Esta promo está publicada. Al guardar, también se actualizará en tu carnicería online. ¿Continuar?");
        if (!confirmed) return null;
      }
      combo = await updateSavedCombo(editingCombo.id || editingCombo.comboId, payload, options?.businessId || null);
    } else {
      combo = await saveCombo(payload, options?.businessId || null);
    }
    if (typeof onComboSaved === "function") {
      await onComboSaved(combo, {
        created: !editingCombo,
        updated: Boolean(editingCombo)
      });
    }
    if (editingCombo && typeof options?.onAfterComboUpdated === "function") {
      await options.onAfterComboUpdated(combo, { published: Boolean(options?.initialComboPublished) });
    }
    alert(editingCombo ? "Promo actualizada." : "Promo o combo guardado.");
    return combo;
  }

  function goHome() {
    resetAllOfferFlows();
    window.dispatchEvent(new CustomEvent("apppromos:builder-go-home"));
    const homeButton = document.querySelector('button[data-panel="dashboardPanel"]');
    if (homeButton) homeButton.click();
  }

  function renderTopActions(title, subtitle, backLabel = "← Cambiar modo") {
    return `
      <header class="builder-topbar">
        <div>
          <div class="builder-topbar__kicker">Crear oferta</div>
          <h2 class="builder-topbar__title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="muted builder-topbar__subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <div class="builder-actions builder-actions--end">
          <button data-builder-home type="button">Inicio</button>
          <button data-back-mode type="button">${escapeHtml(backLabel)}</button>
        </div>
      </header>
    `;
  }

  function bindTopActions(root, backHandler) {
    root.querySelectorAll("[data-builder-home]").forEach((button) => button.addEventListener("click", goHome));
    root.querySelectorAll("[data-back-mode]").forEach((button) => button.addEventListener("click", backHandler));
  }

  function renderRubroSelector(scope, activeRubro) {
    const rubros = getUniqueRubros();
    const accent = scope === "discount" ? "#f97316" : "#E52223";
    const border = scope === "discount" ? "#fed7aa" : "#F6C6C6";
    const soft = scope === "discount" ? "#fff7ed" : "#FFF1F0";

    return `
      <div class="builder-rubro-field">
        <label for="${scope}RubroSelect" style="font-size:.72rem; font-weight:1000; text-transform:uppercase; letter-spacing:.04em; color:${accent};">Rubro opcional</label>
        <select id="${scope}RubroSelect" data-${scope}-rubro-select="true" style="width:100%; box-sizing:border-box; min-height:46px; border:1px solid ${border}; border-radius:14px; background:${soft}; color:#0A2E5B; padding:0 12px; font-weight:1000;">
          <option value="">Todos los productos</option>
          ${rubros.map((rubro) => `
            <option value="${escapeHtml(rubro)}" ${rubro === activeRubro ? "selected" : ""}>${escapeHtml(rubro)}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function renderProductGrid(scope, filteredProducts, selectedItems = []) {
    if (!safeProducts.length) {
      return `<div class="empty">No hay productos con precio para armar una oferta.</div>`;
    }

    if (!filteredProducts.length) {
      return `<div class="empty">No encontré productos con ese filtro.</div>`;
    }

    const localState = scope === "quick" ? state.quick : state.discount;
    const hasSearch = String(localState.searchTerm || "").trim().length > 0;
    const hasRubro = String(localState.rubroFilter || "").trim().length > 0;
    const isQuickSuggestions = scope === "quick" && !hasSearch && !hasRubro;

    const limit = isQuickSuggestions
      ? QUICK_SUGGESTED_LIMIT
      : Math.max(PRODUCT_RENDER_BATCH, Number(localState.productLimit || PRODUCT_RENDER_BATCH));
    const visibleProducts = filteredProducts.slice(0, limit);
    const hiddenCount = Math.max(0, filteredProducts.length - visibleProducts.length);
    const selectedKeys = new Set(selectedItems.map((item) => String(item.productKey || item.id || item.nombre)));

    const headerTitle = isQuickSuggestions
      ? "Sugeridos para arrancar"
      : hasSearch
        ? `Resultados para “${localState.searchTerm}”`
        : hasRubro
          ? `Productos de ${localState.rubroFilter}`
          : "Catálogo";

    const headerHelp = isQuickSuggestions
      ? "Buscá por nombre o elegí rubro solo si hace falta."
      : hiddenCount
        ? "Hay más resultados. Usá buscar, rubro o ver más."
        : "Catálogo listo.";

    return `
      <div class="builder-products">
        <div class="builder-products__meta">
          <span>${escapeHtml(headerTitle)}</span>
          <span>${escapeHtml(headerHelp)}</span>
        </div>
        <div class="builder-products__grid">
          ${visibleProducts.map((product) => {
            const key = getProductKey(product);
            const active = selectedKeys.has(String(key));
            const actionText = active ? "Elegido" : "Sumar";
            const thumbnailPath = getProductThumbnailPath(product);
            return `
              <button type="button" data-${scope}-add-key="${escapeHtml(key)}" aria-label="Sumar ${escapeHtml(product.nombre || "producto")} a la oferta" style="text-align:left; min-height:98px; border-radius:16px; border:1px solid ${active ? "#16a34a" : "#FADBD8"}; background:${active ? "#ecfdf5" : "#fff"}; color:#0A2E5B; padding:10px; cursor:pointer; box-shadow:0 8px 18px rgba(15,23,42,.04);">
                <div style="display:grid; grid-template-columns:${thumbnailPath ? "76px " : ""}minmax(0,1fr) auto; gap:9px; align-items:center;">
                  ${thumbnailPath ? `<img src="${thumbnailPath}" alt="" loading="lazy" onerror="this.hidden=true" class="builder-product__thumb" />` : ""}
                  <strong class="builder-product__name">${escapeHtml(product.nombre || "Producto")}</strong>
                  <span style="font-size:.74rem; font-weight:1000; color:${active ? "#15803d" : "#E52223"};">${active ? "✓" : "+"} ${actionText}</span>
                </div>
                <div class="builder-product__meta">${escapeHtml(product.rubro || "Sin rubro")} · $ ${formatMoney(product.precio)}</div>
              </button>
            `;
          }).join("")}
        </div>
        ${hiddenCount && !isQuickSuggestions ? `
          <button type="button" data-${scope}-show-more="true" class="builder-show-more">
            Ver más resultados (${hiddenCount} más)
          </button>
        ` : ""}
      </div>
    `;
  }

  function renderSelectedStrip(items, totalLabel = "Total estimado") {
    if (!items.length) {
      return `
        <div class="builder-selected builder-selected--empty">
          Todavía no elegiste productos.
        </div>
      `;
    }

    const rawTotal = items.reduce((acc, item) => acc + Number(item.precio || 0) * Number(item.cantidad || 0), 0);
    return `
      <div class="builder-selected builder-selected--filled">
        <div class="builder-selected__row">
          <strong class="builder-selected__value">${items.length} producto${items.length === 1 ? "" : "s"} elegido${items.length === 1 ? "" : "s"}</strong>
          <strong class="builder-selected__value">${escapeHtml(totalLabel)}: $ ${formatMoney(roundUpTo100(rawTotal))}</strong>
        </div>
        <div class="builder-selected__names">
          ${items.map((item) => `${escapeHtml(item.nombre)} · ${formatQty(item.cantidad)} ${escapeHtml(item.unidad || "kg")}`).join("  |  ")}
        </div>
      </div>
    `;
  }


  function renderQuickFloatingSummary() {
    const count = state.quick.items.length;
    if (!count) return "";

    const total = getQuickTotal();
    const totalQuantity = state.quick.items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    const buildProductNames = (limit) => {
      const visibleNames = state.quick.items.slice(0, limit).map((item) => escapeHtml(item.nombre));
      const remaining = Math.max(0, count - visibleNames.length);
      return `${visibleNames.join(" · ")}${remaining ? ` <strong>+${remaining} más</strong>` : ""}`;
    };
    const desktopProductNames = buildProductNames(3);
    const mobileProductNames = buildProductNames(2);
    return `
      <aside class="quick-fixed-summary" role="status" aria-live="polite">
        <div class="quick-fixed-summary-copy">
          <span class="quick-fixed-summary-label">Tu respuesta</span>
          <span class="quick-fixed-summary-products quick-fixed-summary-products-desktop">${desktopProductNames}</span>
          <span class="quick-fixed-summary-products quick-fixed-summary-products-mobile">${mobileProductNames}</span>
          <strong class="quick-fixed-summary-main">${count} producto${count === 1 ? "" : "s"} · Total $ ${formatMoney(total)}</strong>
          <span class="quick-fixed-summary-detail">Cantidad total: ${formatQty(totalQuantity)}</span>
        </div>
        <button id="quickReviewBtn" type="button">Ver respuesta lista</button>
      </aside>
    `;
  }

  function renderDiscountProductsFloatingSummary() {
    const count = state.discount.items.length;
    if (!count) return "";

    const totals = calculateDiscountTotals(state.discount.items, 0);
    const totalQuantity = state.discount.items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    const buildProductNames = (limit) => {
      const visibleNames = state.discount.items.slice(0, limit).map((item) => escapeHtml(item.nombre));
      const remaining = Math.max(0, count - visibleNames.length);
      return `${visibleNames.join(" · ")}${remaining ? ` <strong>+${remaining} más</strong>` : ""}`;
    };

    return `
      <aside class="discount-products-fixed-summary" role="status" aria-live="polite">
        <div class="discount-products-fixed-copy">
          <span class="discount-products-fixed-label">Tu promo</span>
          <span class="discount-products-fixed-names discount-products-fixed-names-desktop">${buildProductNames(3)}</span>
          <span class="discount-products-fixed-names discount-products-fixed-names-mobile">${buildProductNames(2)}</span>
          <strong class="discount-products-fixed-main">${count} producto${count === 1 ? "" : "s"} · Total $ ${formatMoney(totals.total)}</strong>
          <span class="discount-products-fixed-detail">Cantidad total: ${formatQty(totalQuantity)}</span>
        </div>
        <button id="discountFloatingNextBtn" type="button">Ajustar descuentos</button>
      </aside>
    `;
  }

  function renderChooser() {
    container.innerHTML = `
      <section class="builder-screen builder-screen--chooser">
        ${renderCarnizaSpotlight("builderPanel", { compact: true })}

        <header class="builder-hero">
          <div class="builder-hero__kicker">Tres maneras de vender</div>
          <h2 class="builder-hero__title">¿Qué necesitás hacer ahora?</h2>
          <p class="muted builder-hero__subtitle">Respondé una consulta, prepará una promo para vender varias veces o sacá hoy la mercadería en riesgo.</p>
        </header>

        <div class="builder-modes">
          <button id="quickModeBtn" type="button" class="builder-mode builder-mode--quick">
            <div class="builder-mode__icon"><svg class="ci ci-lg ci--navy" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#bolt"></use></svg></div>
            <h3 class="builder-mode__title">Responder una consulta</h3>
            <p class="builder-mode__desc">Un cliente te pidió varios productos. Calculá el total y respondé por WhatsApp. No se guarda.</p>
          </button>
          <button id="discountModeBtn" type="button" class="builder-mode builder-mode--promo">
            <div class="builder-mode__icon"><svg class="ci ci-lg ci--red" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#tag"></use></svg></div>
            <h3 class="builder-mode__title">Crear promo o combo</h3>
            <p class="builder-mode__desc">Armá una estrategia para vender varias veces: guardala, publicala y compartila.</p>
          </button>
          <button id="urgentModeBtn" type="button" data-carniza-open-liquidator data-carniza-signal="builder_urgent_clicked" class="builder-mode builder-mode--urgent">
            <div class="builder-mode__icon"><svg class="ci ci-lg ci--red" aria-hidden="true"><use href="/assets/icons/carnis-icons.svg#sell"></use></svg></div>
            <h3 class="builder-mode__title">Promo del día</h3>
            <p class="builder-mode__desc">Elegí la mercadería que necesitás vender hoy. Publicala por el día y finalizala cuando quieras.</p>
          </button>
        </div>
      </section>
    `;

    container.querySelector("#quickModeBtn")?.addEventListener("click", startQuickMode);
    container.querySelector("#discountModeBtn")?.addEventListener("click", startDiscountMode);
  }

  function restoreSearchFocus(inputId, start, end) {
    requestAnimationFrame(() => {
      const input = document.getElementById(inputId);
      if (!input) return;
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      if (typeof start === "number" && typeof end === "number") {
        try {
          const safeStart = Math.min(start, input.value.length);
          const safeEnd = Math.min(end, input.value.length);
          input.setSelectionRange(safeStart, safeEnd);
        } catch (_) {}
      }
    });
  }

  function bindProductSelection(root, scope, list, localState, rerender) {
    root.querySelector(`#${scope}SearchInput`)?.addEventListener("input", (event) => {
      const input = event.target;
      localState.searchTerm = input.value || "";
      localState.productLimit = PRODUCT_RENDER_BATCH;
      if (localState.searchDebounceTimer) clearTimeout(localState.searchDebounceTimer);
      const inputId = input.id;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      localState.searchDebounceTimer = setTimeout(() => {
        localState.searchDebounceTimer = null;
        rerender();
        restoreSearchFocus(inputId, start, end);
      }, 220);
    });

    root.querySelector(`[data-${scope}-rubro-select]`)?.addEventListener("change", (event) => {
      if (localState.searchDebounceTimer) {
        clearTimeout(localState.searchDebounceTimer);
        localState.searchDebounceTimer = null;
      }
      localState.rubroFilter = event.target.value || "";
      localState.productLimit = PRODUCT_RENDER_BATCH;
      rerender();
    });

    root.querySelectorAll(`[data-${scope}-rubro]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        localState.rubroFilter = event.currentTarget.getAttribute(`data-${scope}-rubro`) || "";
        localState.productLimit = PRODUCT_RENDER_BATCH;
        rerender();
      });
    });

    root.querySelector(`[data-${scope}-show-more]`)?.addEventListener("click", () => {
      const total = getFilteredProducts(localState).length;
      localState.productLimit = Math.min(total, Number(localState.productLimit || PRODUCT_RENDER_BATCH) + PRODUCT_RENDER_BATCH);
      rerender();
    });

    root.querySelectorAll(`[data-${scope}-add-key]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const key = event.currentTarget.getAttribute(`data-${scope}-add-key`);
        const product = findProductByKey(key);
        if (!product) return;
        addProductToList(list, product);
        rerender();
      });
    });
  }

  function renderQuick() {
    const filteredProducts = getFilteredProducts(state.quick);

    if (state.quick.step === 2) {
      renderQuickReview();
      return;
    }

    container.innerHTML = `
      <section class="builder-screen">
        ${renderTopActions("Responder una consulta", "Elegí lo que pidió el cliente y calculá la respuesta con tus precios reales.")}
        ${renderQuickFloatingSummary()}

        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:14px 14px calc(230px + var(--apppromos-mobile-nav-height, 0px)); display:grid; gap:12px;">
          <input id="quickSearchInput" type="text" placeholder="Buscar corte o producto..." value="${escapeHtml(state.quick.searchTerm)}" style="width:100%; box-sizing:border-box; min-height:46px; border:1px solid #F6C6C6; border-radius:14px; padding:0 12px; font-weight:900;" />
          ${renderRubroSelector("quick", state.quick.rubroFilter)}
          ${renderProductGrid("quick", filteredProducts, state.quick.items)}
        </div>
      </section>
    `;

    bindTopActions(container, () => showChooser({ clear: true }));
    bindProductSelection(container, "quick", state.quick.items, state.quick, renderQuick);

    container.querySelector("#quickReviewBtn")?.addEventListener("click", () => {
      if (!state.quick.items.length) {
        alert("Elegí al menos un producto para ver la oferta lista.");
        return;
      }
      state.quick.step = 2;
      renderQuick();
    });
  }

  function renderQuantityList(items, scope, includeDiscount = false) {
    return items.map((item, index) => {
      const subtotal = Number(item.precio || 0) * Number(item.cantidad || 0);
      const calc = calculateDiscountItem(item);
      const lineDiscount = calc.descuento > 0 ? Math.max(0, calc.descuentoMonto) : 0;

      if (includeDiscount) {
        return `
          <article class="builder-line">
            <div class="builder-line__head">
              <div class="builder-line__title">
                <strong class="builder-line__name">${escapeHtml(item.nombre)}</strong>
                <span class="builder-line__unit">$ ${formatMoney(item.precio)} / ${escapeHtml(item.unidad || "kg")}</span>
              </div>
              <button type="button" data-${scope}-del="${index}" class="builder-remove builder-remove--line">Quitar</button>
            </div>

            <div class="builder-line__fields">
              <div class="builder-line-field">
                <span class="builder-line-field__label">Cantidad</span>
                <div class="builder-stepper">
                  <button type="button" data-${scope}-minus="${index}" style="min-width:34px; min-height:36px; padding:0; font-weight:1000;">−</button>
                  <input type="number" min="0.5" step="0.5" value="${item.cantidad}" data-${scope}-qty="${index}" style="width:58px; min-height:36px; text-align:center; font-weight:1000; padding:0 4px;" />
                  <button type="button" data-${scope}-plus="${index}" style="min-width:34px; min-height:36px; padding:0; font-weight:1000;">+</button>
                </div>
              </div>

              <div class="builder-line-field builder-line-field--discount">
                <span class="builder-line-field__label">Desc. producto</span>
                <div class="builder-stepper">
                  <button type="button" data-${scope}-discount-minus="${index}" style="min-width:34px; min-height:36px; padding:0; font-weight:1000;">−</button>
                  <input type="number" min="0" max="100" step="1" value="${calc.descuento}" data-${scope}-percent="${index}" style="width:54px; min-height:36px; text-align:center; font-weight:1000; padding:0 4px;" />
                  <button type="button" data-${scope}-discount-plus="${index}" style="min-width:34px; min-height:36px; padding:0; font-weight:1000;">+</button>
                  <span class="builder-stepper__suffix">%</span>
                </div>
              </div>
            </div>

            <div class="builder-line__figures">
              <div class="builder-figure">
                <span class="builder-figure__label">Sin descuento</span>
                <strong class="builder-figure__value">$ ${formatMoney(calc.bruto)}</strong>
              </div>
              <div class="builder-figure builder-figure--discount">
                <span class="builder-figure__label">Descuento</span>
                <strong data-${scope}-line-discount="${index}" class="builder-figure__value">-$ ${formatMoney(lineDiscount)}</strong>
              </div>
              <div class="builder-figure builder-figure--final">
                <span class="builder-figure__label">Queda</span>
                <strong data-${scope}-line-final="${index}" class="builder-figure__value">$ ${formatMoney(calc.neto)}</strong>
              </div>
            </div>
          </article>
        `;
      }

      return `
        <article class="builder-row">
          <div style="display:grid; grid-template-columns:minmax(170px,1fr) 126px 130px 74px; gap:8px; align-items:center; min-width:520px;">
            <div class="builder-row__title">
              <strong class="builder-row__name">${escapeHtml(item.nombre)}</strong>
              <span class="builder-row__unit">$ ${formatMoney(item.precio)} / ${escapeHtml(item.unidad || "kg")}</span>
            </div>

            <div class="builder-stepper builder-stepper--compact">
              <button type="button" data-${scope}-minus="${index}" style="min-width:30px; min-height:32px; padding:0;">−</button>
              <input type="number" min="0.5" step="0.5" value="${item.cantidad}" data-${scope}-qty="${index}" style="width:50px; min-height:32px; text-align:center; font-weight:1000; padding:0 4px;" />
              <button type="button" data-${scope}-plus="${index}" style="min-width:30px; min-height:32px; padding:0;">+</button>
            </div>

            <strong class="builder-row__subtotal">$ ${formatMoney(subtotal)}</strong>
            <button type="button" data-${scope}-del="${index}" class="builder-remove builder-remove--compact">Quitar</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function updateDiscountLive(root) {
    const totals = calculateDiscountTotals(state.discount.items, state.discount.globalDiscount);
    root.querySelectorAll("[data-discount-summary-subtotal]").forEach((el) => { el.textContent = `$ ${formatMoney(totals.subtotalBruto)}`; });
    root.querySelectorAll("[data-discount-summary-discounts]").forEach((el) => { el.textContent = `-$ ${formatMoney(totals.descuentosAplicados)}`; });
    root.querySelectorAll("[data-discount-summary-total]").forEach((el) => { el.textContent = `$ ${formatMoney(totals.total)}`; });
    root.querySelectorAll("[data-discount-summary-scale-price]").forEach((el) => { el.textContent = totals.scalePricePerKg ? `$ ${formatMoney(totals.scalePricePerKg)} / kg` : "No disponible"; });
    root.querySelectorAll("[data-discount-summary-weight]").forEach((el) => { el.textContent = `${formatQty(totals.totalWeight)} kg previstos`; });

    state.discount.items.forEach((item, index) => {
      const calc = calculateDiscountItem(item);
      root.querySelectorAll(`[data-discountAdjust-line-discount="${index}"]`).forEach((el) => { el.textContent = `Desc. -$ ${formatMoney(calc.descuento > 0 ? Math.max(0, calc.descuentoMonto) : 0)}`; });
      root.querySelectorAll(`[data-discountAdjust-line-final="${index}"]`).forEach((el) => { el.textContent = `Queda $ ${formatMoney(calc.neto)}`; });
    });
  }

  function bindQuantityList(root, scope, items, rerender) {
    const isDiscountAdjust = scope === "discountAdjust";
    const refresh = () => {
      if (isDiscountAdjust) updateDiscountLive(root);
      else rerender();
    };

    root.querySelectorAll(`[data-${scope}-qty]`).forEach((input) => {
      input.addEventListener("input", (event) => {
        const index = Number(event.target.getAttribute(`data-${scope}-qty`));
        const nextValue = Number(event.target.value || 1);
        items[index].cantidad = nextValue <= 0 ? 1 : nextValue;
        refresh();
      });
      input.addEventListener("change", (event) => {
        const index = Number(event.target.getAttribute(`data-${scope}-qty`));
        const nextValue = Number(event.target.value || 1);
        items[index].cantidad = nextValue <= 0 ? 1 : nextValue;
        if (!isDiscountAdjust) rerender();
        else updateDiscountLive(root);
      });
    });

    root.querySelectorAll(`[data-${scope}-minus]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute(`data-${scope}-minus`));
        items[index].cantidad = Math.max(0.5, Number(items[index].cantidad || 1) - 0.5);
        rerender();
      });
    });

    root.querySelectorAll(`[data-${scope}-plus]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute(`data-${scope}-plus`));
        items[index].cantidad = Number(items[index].cantidad || 1) + 0.5;
        rerender();
      });
    });

    root.querySelectorAll(`[data-${scope}-del]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute(`data-${scope}-del`));
        items.splice(index, 1);
        rerender();
      });
    });

    root.querySelectorAll(`[data-${scope}-percent]`).forEach((input) => {
      input.addEventListener("input", (event) => {
        const index = Number(event.target.getAttribute(`data-${scope}-percent`));
        items[index].descuento_individual = clampPercent(event.target.value);
        if (isDiscountAdjust) updateDiscountLive(root);
      });
      input.addEventListener("change", (event) => {
        const index = Number(event.target.getAttribute(`data-${scope}-percent`));
        items[index].descuento_individual = clampPercent(event.target.value);
        rerender();
      });
    });

    root.querySelectorAll(`[data-${scope}-discount-minus]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute(`data-${scope}-discount-minus`));
        items[index].descuento_individual = Math.max(0, clampPercent(items[index].descuento_individual || 0) - 1);
        rerender();
      });
    });

    root.querySelectorAll(`[data-${scope}-discount-plus]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute(`data-${scope}-discount-plus`));
        items[index].descuento_individual = Math.min(100, clampPercent(items[index].descuento_individual || 0) + 1);
        rerender();
      });
    });
  }

  function renderQuickReview() {
    const payload = buildQuickPayload();
    const whatsappPreview = buildWhatsappText(payload, options?.businessMeta || {});

    container.innerHTML = `
      <section style="display:grid; gap:12px; padding-bottom:calc(138px + var(--apppromos-mobile-nav-height, 0px));">
        ${renderTopActions("Respuesta lista", "Revisá productos y cantidades. Es para este cliente y no se guarda en tus promociones.", "← Productos")}
        <div style="display:grid; gap:10px;">
          ${renderQuantityList(state.quick.items, "quickReview")}
        </div>
        <div style="background:#FFF1F0; border:1px solid #F6C6C6; border-radius:18px; padding:14px; display:grid; gap:10px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <strong style="font-size:1.2rem; color:#8E1014;">Total final: $ ${formatMoney(payload.total)}</strong>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button id="quickWhatsappBtn" type="button" class="builder-btn-whatsapp">Responder por WhatsApp</button>
            </div>
          </div>
          <div style="background:#fff; border:1px solid #FADBD8; border-radius:14px; padding:11px; white-space:pre-line; line-height:1.45; font-weight:800; color:#334155;">${escapeHtml(whatsappPreview)}</div>
        </div>
      </section>
    `;

    bindTopActions(container, () => { state.quick.step = 1; renderQuick(); });
    bindQuantityList(container, "quickReview", state.quick.items, renderQuickReview);


    container.querySelector("#quickWhatsappBtn")?.addEventListener("click", () => {
      const payload = buildQuickPayload();
      if (!canRunOptionHook(options?.onBeforeWhatsapp, { source: "builder_quick", payload })) return;
      openComboWhatsapp(payload, options?.businessMeta || {});
    });
  }

  function renderDiscount() {
    const totals = calculateDiscountTotals(state.discount.items, state.discount.globalDiscount);
    const steps = [
      { id: 1, title: "Productos" },
      { id: 2, title: "Descuentos" },
      { id: 3, title: "Vender" },
    ];

    container.innerHTML = `
      <section class="builder-screen">
        ${renderTopActions(editingCombo ? "Editar promo" : "Crear promo o combo", editingCombo ? "Modificá la receta y guardá los cambios sobre esta promo." : "Armá una propuesta para vender varias veces. Podés guardarla, publicarla y compartirla.")}
        <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px;">
          ${steps.map((step) => `
            <button type="button" data-discount-step="${step.id}" style="border:1px solid ${state.discount.step === step.id ? "#f97316" : "#e5e7eb"}; background:${state.discount.step === step.id ? "#fff7ed" : "#fff"}; border-radius:14px; padding:10px; font-weight:1000; cursor:pointer;">${step.id}. ${escapeHtml(step.title)}</button>
          `).join("")}
        </div>
        <div id="discountStepContent"></div>
      </section>
    `;

    bindTopActions(container, () => showChooser({ clear: true }));

    container.querySelectorAll("[data-discount-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const nextStep = Number(event.currentTarget.dataset.discountStep);
        if (nextStep > 1 && !state.discount.items.length) {
          alert("Elegí al menos un producto para seguir.");
          return;
        }
        state.discount.step = nextStep;
        renderDiscount();
      });
    });

    const content = container.querySelector("#discountStepContent");
    if (state.discount.step === 1) renderDiscountStepProducts(content);
    if (state.discount.step === 2) renderDiscountStepAdjust(content, totals);
    if (state.discount.step === 3) renderDiscountStepSell(content, totals);
  }

  function renderDiscountStepProducts(content) {
    const filteredProducts = getFilteredProducts(state.discount);
    content.innerHTML = `
      <div class="builder-screen">
        ${renderSelectedStrip(state.discount.items)}
        ${renderDiscountProductsFloatingSummary()}
        <div class="builder-card">
          <input id="discountSearchInput" type="text" placeholder="Buscar corte o producto..." value="${escapeHtml(state.discount.searchTerm)}" style="width:100%; box-sizing:border-box; min-height:46px; border:1px solid #fed7aa; border-radius:14px; padding:0 12px; font-weight:900;" />
          ${renderRubroSelector("discount", state.discount.rubroFilter)}
          ${renderProductGrid("discount", filteredProducts, state.discount.items)}
        </div>
        <div style="height:${state.discount.items.length ? "112px" : "0"};" aria-hidden="true"></div>
      </div>
    `;

    bindProductSelection(content, "discount", state.discount.items, state.discount, () => renderDiscountStepProducts(content));
    content.querySelector("#discountFloatingNextBtn")?.addEventListener("click", () => {
      if (!state.discount.items.length) {
        alert("Elegí al menos un producto para seguir.");
        return;
      }
      state.discount.step = 2;
      renderDiscount();
    });
  }

  function renderDiscountSummary(totals, compact = false, floating = false) {
    const baseStyle = floating
      ? "position:fixed;left:10px;right:10px;bottom:calc(var(--apppromos-mobile-floating-bottom, 10px) + 82px);z-index:2147482400;max-width:760px;margin:0 auto;"
      : "position:sticky;top:0;z-index:5;";

    return `
      <aside style="${baseStyle} background:#fff7ed; border:1px solid #fed7aa; border-radius:18px; padding:${compact ? "10px" : "14px"}; box-shadow:0 14px 34px rgba(15,23,42,.20);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px;">
          <div style="font-size:.76rem; color:#9a3412; font-weight:1000; text-transform:uppercase; letter-spacing:.04em;">Resumen</div>
          <div style="font-size:.72rem; color:#9a3412; font-weight:900;">se actualiza solo</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px;">
          <div style="background:#fff; border:1px solid #fed7aa; border-radius:13px; padding:8px; min-width:0;">
            <div style="font-size:.68rem; color:#92400e; font-weight:900; line-height:1.05;">Sin descuento</div>
            <strong data-discount-summary-subtotal style="display:block; margin-top:3px; color:#431407; font-size:.92rem; white-space:nowrap;">$ ${formatMoney(totals.subtotalBruto)}</strong>
          </div>
          <div style="background:#fff; border:1px solid #fed7aa; border-radius:13px; padding:8px; min-width:0;">
            <div style="font-size:.68rem; color:#92400e; font-weight:900; line-height:1.05;">Descuentos</div>
            <strong data-discount-summary-discounts style="display:block; margin-top:3px; color:#b45309; font-size:.92rem; white-space:nowrap;">-$ ${formatMoney(totals.descuentosAplicados)}</strong>
          </div>
          <div style="background:#fff; border:2px solid #fb923c; border-radius:13px; padding:8px; min-width:0;">
            <div style="font-size:.68rem; color:#9a3412; font-weight:1000; line-height:1.05;">Total final</div>
            <strong data-discount-summary-total style="display:block; margin-top:3px; color:#c2410c; font-size:1.02rem; white-space:nowrap;">$ ${formatMoney(totals.total)}</strong>
          </div>
        </div>
        ${totals.allSoldByKg ? `
          <div style="margin-top:7px; display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid #fdba74; border-radius:13px; background:#fff; padding:8px 10px;">
            <div style="min-width:0;">
              <strong style="display:block; color:#7c2d12; font-size:.76rem; line-height:1.1;">Precio para la balanza</strong>
              <span data-discount-summary-weight style="display:block; margin-top:2px; color:#92400e; font-size:.68rem; font-weight:850;">${formatQty(totals.totalWeight)} kg previstos</span>
            </div>
            <strong data-discount-summary-scale-price style="flex:0 0 auto; color:#c2410c; font-size:1.02rem; white-space:nowrap;">$ ${formatMoney(totals.scalePricePerKg)} / kg</strong>
          </div>
        ` : `
          <div style="margin-top:7px; border:1px solid #fde68a; border-radius:13px; background:#fffbeb; padding:8px 10px; color:#92400e; font-size:.72rem; line-height:1.3; font-weight:900;">
            Esta promo combina diferentes unidades. No se puede generar un único precio para la balanza.
          </div>
        `}
      </aside>
    `;
  }

  function renderDiscountStepAdjust(content, totals) {
    content.innerHTML = `
      <div class="builder-screen">
        ${renderDiscountSummary(totals, true, true)}
        <div style="display:grid; gap:10px; padding-bottom:calc(238px + var(--apppromos-mobile-nav-height, 0px));">
          ${renderQuantityList(state.discount.items, "discountAdjust", true)}
        </div>
        <div class="builder-global-discount">
          <div class="builder-global-discount__head">
            <span>Descuento general</span>
            <div class="builder-global-discount__control">
              <button id="discountGlobalMinusBtn" type="button" style="min-width:38px; min-height:38px; padding:0; font-weight:1000;">−</button>
              <input id="discountGlobalInput" type="number" min="0" max="100" step="1" value="${state.discount.globalDiscount}" style="width:62px; min-height:38px; text-align:center; font-weight:1000; padding:0 4px;" />
              <button id="discountGlobalPlusBtn" type="button" style="min-width:38px; min-height:38px; padding:0; font-weight:1000;">+</button>
              <span class="builder-stepper__suffix">%</span>
            </div>
          </div>
          <p class="muted builder-global-discount__note">Se aplica al final. El cliente no ve estos descuentos: recibe una oferta limpia.</p>
        </div>
        <div class="builder-actions builder-actions--between">
          <button id="discountBackProductsBtn" type="button">← Productos</button>
          <button id="discountNextSellBtn" type="button" class="builder-btn-promo">Ver oferta lista</button>
        </div>
      </div>
    `;

    bindQuantityList(content, "discountAdjust", state.discount.items, () => renderDiscountStepAdjust(content, calculateDiscountTotals(state.discount.items, state.discount.globalDiscount)));

    content.querySelector("#discountGlobalInput")?.addEventListener("input", (event) => {
      state.discount.globalDiscount = clampPercent(event.target.value);
      updateDiscountLive(content);
    });

    content.querySelector("#discountGlobalInput")?.addEventListener("change", (event) => {
      state.discount.globalDiscount = clampPercent(event.target.value);
      renderDiscountStepAdjust(content, calculateDiscountTotals(state.discount.items, state.discount.globalDiscount));
    });

    content.querySelector("#discountGlobalMinusBtn")?.addEventListener("click", () => {
      state.discount.globalDiscount = Math.max(0, clampPercent(state.discount.globalDiscount || 0) - 1);
      renderDiscountStepAdjust(content, calculateDiscountTotals(state.discount.items, state.discount.globalDiscount));
    });

    content.querySelector("#discountGlobalPlusBtn")?.addEventListener("click", () => {
      state.discount.globalDiscount = Math.min(100, clampPercent(state.discount.globalDiscount || 0) + 1);
      renderDiscountStepAdjust(content, calculateDiscountTotals(state.discount.items, state.discount.globalDiscount));
    });

    content.querySelector("#discountBackProductsBtn")?.addEventListener("click", () => {
      state.discount.step = 1;
      renderDiscount();
    });

    content.querySelector("#discountNextSellBtn")?.addEventListener("click", () => {
      state.discount.step = 3;
      renderDiscount();
    });
  }

  function renderDiscountStepSell(content, totals) {
    const combo = buildDiscountPayload();
    const businessMeta = options?.businessMeta || {};
    const whatsappPreview = combo.name
      ? buildWhatsappText(combo, businessMeta)
      : "Escribí un nombre comercial para ver el mensaje que recibirá el cliente.";

    content.innerHTML = `
      <div class="builder-screen">
        ${renderDiscountSummary(totals, true)}
        <div class="builder-card">
          <label style="display:grid; gap:6px; font-weight:1000;">
            Nombre comercial de la promo
            <input id="discountOfferNameInput" type="text" value="${escapeHtml(state.discount.offerName)}" placeholder="Ej: 2 kg de achuras" required />
          </label>
          <div id="discountWhatsappPreview" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:12px; white-space:pre-line; line-height:1.45; font-weight:800; color:#334155;">${escapeHtml(whatsappPreview)}</div>
          <div class="builder-actions builder-actions--between">
            <button id="discountBackAdjustBtn" type="button">← Volver y ajustar</button>
            <div class="builder-actions builder-actions--end">
              <button id="discountSaveBtn" type="button">${editingCombo ? "Guardar cambios" : "Guardar promo o combo"}</button>
              <button id="discountWhatsappBtn" type="button" class="builder-btn-whatsapp">Enviar por WhatsApp</button>
            </div>
          </div>
        </div>
      </div>
    `;

    content.querySelector("#discountOfferNameInput")?.addEventListener("input", (event) => {
      state.discount.offerName = event.target.value;
      const preview = content.querySelector("#discountWhatsappPreview");
      const payload = buildDiscountPayload();
      if (preview) {
        preview.textContent = payload.name
          ? buildWhatsappText(payload, businessMeta)
          : "Escribí un nombre comercial para ver el mensaje que recibirá el cliente.";
      }
    });

    function validateOfferName() {
      if (String(state.discount.offerName || "").trim()) return true;
      alert("Escribí un nombre comercial para guardar o enviar esta promo.");
      content.querySelector("#discountOfferNameInput")?.focus();
      return false;
    }

    content.querySelector("#discountBackAdjustBtn")?.addEventListener("click", () => {
      state.discount.step = 2;
      renderDiscount();
    });

    content.querySelector("#discountSaveBtn")?.addEventListener("click", async () => {
      if (!validateOfferName()) return;
      const saved = await saveBuiltCombo(buildDiscountPayload());
      if (saved) showChooser({ clear: true });
    });

    content.querySelector("#discountWhatsappBtn")?.addEventListener("click", () => {
      if (!validateOfferName()) return;
      const payload = buildDiscountPayload();
      if (!canRunOptionHook(options?.onBeforeWhatsapp, { source: "builder_discount", payload })) return;
      openComboWhatsapp(payload, options?.businessMeta || {});
      showChooser({ clear: true });
    });
  }

  if (editingCombo) {
    startEditMode(editingCombo);
  } else if (options?.initialMode === "quick") {
    startQuickMode();
  } else if (options?.initialMode === "discount") {
    startDiscountMode();
  } else {
    renderChooser();
  }
}
