import { saveCombo } from "../services/data-service.js";

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

function getProductKey(product) {
  return product?.productKey || product?.id || product?.nombre || null;
}

function normalizeProduct(product) {
  return {
    id: product?.id || product?.productKey || null,
    productKey: getProductKey(product),
    nombre: product?.nombre || "Sin nombre",
    precio: Number(product?.precio || 0),
    rubro: product?.rubro || "",
    unidad: product?.unidad || "kg",
    cantidad: 1,
    descuento_individual: 0,
  };
}

function calculateDiscountItem(item) {
  const cantidad = Number(item.cantidad || 1);
  const precio = Number(item.precio || 0);
  const descuento = clampPercent(item.descuento_individual || 0);
  const bruto = precio * cantidad;
  const neto = roundUpTo100(bruto * (1 - descuento / 100));

  return {
    cantidad,
    precio,
    descuento,
    bruto,
    neto,
  };
}

function calculateDiscountTotals(items = [], globalDiscount = 0) {
  const subtotalBruto = items.reduce((acc, item) => {
    return acc + calculateDiscountItem(item).bruto;
  }, 0);

  const subtotalNeto = items.reduce((acc, item) => {
    return acc + calculateDiscountItem(item).neto;
  }, 0);

  const descuentoGlobal = clampPercent(globalDiscount);
  const total = roundUpTo100(subtotalNeto * (1 - descuentoGlobal / 100));

  return {
    subtotalBruto,
    subtotalNeto,
    descuentoGlobal,
    total,
  };
}

function buildWhatsappText(combo) {
  const items = Array.isArray(combo?.items) ? combo.items : [];
  const title = toWhatsappSafeText(String(combo?.name || "OFERTA DEL DIA").toUpperCase());
  const lines = [title, ""];

  for (const item of items) {
    const cantidad = formatQty(item.cantidad || 1);
    const unidad = toWhatsappSafeText(item.unidad || "kg");
    const nombre = toWhatsappSafeText(item.nombre || "Producto");
    const rubro = toWhatsappSafeText(item.rubro || "");
    let line = `- ${cantidad} ${unidad} ${nombre}`;
    if (rubro) line += ` - ${rubro}`;
    lines.push(line);
  }

  lines.push(
    "",
    `Total: $ ${formatMoney(combo?.total || 0)}`,
    "",
    "Oferta por tiempo limitado / hasta agotar stock.",
    "Carniceria de Carniza"
  );

  return lines.join("\n");
}

function openComboWhatsapp(combo) {
  const text = buildWhatsappText(combo);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function renderBuilder(container, products = [], onComboSaved = null) {
  if (!container) return;

  const safeProducts = Array.isArray(products) ? products : [];
  let mode = "chooser";

  const state = {
    quick: {
      items: [],
      searchTerm: "",
      rubroFilter: "",
    },
    discount: {
      step: 1,
      items: [],
      searchTerm: "",
      rubroFilter: "",
      globalDiscount: 0,
      offerName: "OFERTA DEL DIA",
    },
  };

  function getUniqueRubros(productList) {
    const rubros = new Set();
    productList.forEach((product) => {
      const rubro = String(product.rubro || "").trim();
      if (rubro) rubros.add(rubro);
    });
    return Array.from(rubros).sort((a, b) => a.localeCompare(b, "es"));
  }

  function getFilteredProducts({ searchTerm = "", rubroFilter = "" } = {}) {
    return safeProducts.filter((product) => {
      if (product?.active === false) return false;

      const nombre = String(product.nombre || "").toLowerCase();
      const rubro = String(product.rubro || "").toLowerCase();
      const term = String(searchTerm || "").toLowerCase().trim();

      const matchSearch = !term || nombre.includes(term) || rubro.includes(term);
      const matchRubro = !rubroFilter || rubro === String(rubroFilter).toLowerCase();
      return matchSearch && matchRubro;
    });
  }

  function buildProductOptions(filteredProducts) {
    return filteredProducts
      .map((product) => {
        const originalIndex = safeProducts.findIndex(
          (p) => p === product || (p.nombre === product.nombre && p.rubro === product.rubro)
        );
        const label = `${product?.nombre || "Sin nombre"} (${product?.rubro || "Sin rubro"})`;
        return `<option value="${originalIndex}">${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function buildRubroOptions(selected = "") {
    return getUniqueRubros(safeProducts)
      .map((rubro) => `<option value="${escapeHtml(rubro)}" ${rubro === selected ? "selected" : ""}>${escapeHtml(rubro)}</option>`)
      .join("");
  }

  function getQuickTotal() {
    return state.quick.items.reduce((acc, item) => {
      return acc + Number(item.precio || 0) * Number(item.cantidad || 0);
    }, 0);
  }

  function buildQuickPayload() {
    const now = new Date();
    return {
      name: "Oferta del día " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      description: "Oferta rápida creada para vender por WhatsApp.",
      mode: "quick",
      items: state.quick.items.map((item) => ({
        productKey: item.productKey || item.id || null,
        nombre: item.nombre,
        rubro: item.rubro || "",
        unidad: item.unidad || "kg",
        precio: Number(item.precio || 0),
        cantidad: Number(item.cantidad || 1),
        subtotal: Number(item.precio || 0) * Number(item.cantidad || 1),
      })),
      total: getQuickTotal(),
    };
  }

  function buildDiscountPayload() {
    const totals = calculateDiscountTotals(state.discount.items, state.discount.globalDiscount);
    return {
      name: state.discount.offerName || "OFERTA DEL DIA",
      description: "Oferta con descuentos creada para vender por WhatsApp.",
      mode: "discount",
      descuento_global: totals.descuentoGlobal,
      subtotal_bruto: totals.subtotalBruto,
      subtotal_neto: totals.subtotalNeto,
      items: state.discount.items.map((item) => {
        const calc = calculateDiscountItem(item);
        return {
          productKey: item.productKey || item.id || null,
          nombre: item.nombre,
          rubro: item.rubro || "",
          unidad: item.unidad || "kg",
          precio: Number(item.precio || 0),
          cantidad: calc.cantidad,
          descuento_individual: calc.descuento,
          subtotal_bruto: calc.bruto,
          subtotal: calc.neto,
        };
      }),
      total: totals.total,
    };
  }

  async function saveBuiltCombo(combo, { openWhatsapp = false } = {}) {
    if (!combo.items.length) {
      alert("Agregá al menos un producto");
      return;
    }

    try {
      const saved = await saveCombo(combo);
      console.log("OFERTA PROCESADA:", saved);

      if (typeof onComboSaved === "function") {
        await onComboSaved(saved);
      }

      if (openWhatsapp) {
        openComboWhatsapp(saved);
      }

      alert(openWhatsapp ? "Oferta lista para mandar por WhatsApp" : "Oferta guardada correctamente");
    } catch (error) {
      console.error("ERROR AL GUARDAR OFERTA:", error);
      alert("No se pudo guardar la oferta. Probá de nuevo.");
    }
  }

  function renderChooser() {
    container.innerHTML = `
      <section style="display:grid; gap:14px;">
        <header style="background:#fff; border:1px solid #dbeafe; border-radius:18px; padding:18px; box-shadow:0 8px 22px rgba(15,23,42,.06);">
          <div style="font-size:.74rem; font-weight:900; color:#2563eb; text-transform:uppercase; letter-spacing:.04em;">Crear oferta</div>
          <h2 style="margin:6px 0 4px; font-size:2rem; line-height:1;">Elegí cómo querés vender</h2>
          <p class="muted" style="margin:0;">Usá oferta rápida para salir vendiendo ya, o una oferta con descuentos para ajustar mejor la promo.</p>
        </header>

        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px;">
          <button id="quickModeBtn" type="button" style="text-align:left; background:#fff; border:2px solid #bfdbfe; border-radius:18px; padding:18px; cursor:pointer; box-shadow:0 8px 22px rgba(15,23,42,.06);">
            <div style="font-size:.78rem; font-weight:900; color:#2563eb; text-transform:uppercase;">Oferta rápida</div>
            <h3 style="margin:6px 0 6px; font-size:1.35rem;">Armar y mandar</h3>
            <p style="margin:0; color:#64748b; font-weight:700;">Elegís productos, se calcula el total y la mandás por WhatsApp. Sin descuentos.</p>
          </button>

          <button id="discountModeBtn" type="button" style="text-align:left; background:#fff7ed; border:2px solid #fed7aa; border-radius:18px; padding:18px; cursor:pointer; box-shadow:0 8px 22px rgba(15,23,42,.06);">
            <div style="font-size:.78rem; font-weight:900; color:#c2410c; text-transform:uppercase;">Oferta con descuentos</div>
            <h3 style="margin:6px 0 6px; font-size:1.35rem;">Productos, ajustes y vender</h3>
            <p style="margin:0; color:#7c2d12; font-weight:700;">Aplicás descuento por producto o general, ves el total final y la mandás por WhatsApp.</p>
          </button>
        </div>
      </section>
    `;

    container.querySelector("#quickModeBtn")?.addEventListener("click", () => {
      mode = "quick";
      renderQuick();
    });

    container.querySelector("#discountModeBtn")?.addEventListener("click", () => {
      mode = "discount";
      state.discount.step = 1;
      renderDiscount();
    });
  }

  function renderQuick() {
    const filteredProducts = getFilteredProducts(state.quick);

    container.innerHTML = `
      <section style="display:grid; gap:14px;">
        <header style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; background:#fff; border:1px solid #dbeafe; border-radius:18px; padding:18px;">
          <div>
            <div style="font-size:.72rem; font-weight:900; color:#2563eb; text-transform:uppercase; letter-spacing:.04em;">Oferta rápida</div>
            <h2 style="margin:6px 0 4px;">Armar y mandar</h2>
            <p class="muted" style="margin:0;">Elegí productos, ajustá kilos y mandá por WhatsApp sin descuentos.</p>
          </div>
          <button id="backToChooserBtn" type="button">← Cambiar modo</button>
        </header>

        <div class="toolbar">
          <input id="quickSearchInput" type="text" placeholder="Buscar productos..." value="${escapeHtml(state.quick.searchTerm)}" style="flex:1; min-width:150px;" />
          <select id="quickRubroSelect" style="min-width:140px;">
            <option value="">Todos los rubros</option>
            ${buildRubroOptions(state.quick.rubroFilter)}
          </select>
        </div>

        <div class="toolbar">
          <select id="quickProductSelect">
            <option value="">Seleccionar producto...</option>
            ${buildProductOptions(filteredProducts)}
          </select>
          <button id="quickAddItemBtn" type="button">Agregar</button>
        </div>

        <div id="quickList" class="list"></div>

        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; background:#fff; border:1px solid #dbeafe; border-radius:16px; padding:14px;">
          <strong>Total: $ <span id="quickTotal">${formatMoney(getQuickTotal())}</span></strong>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button id="quickSaveBtn" type="button">Guardar oferta</button>
            <button id="quickWhatsappBtn" type="button" style="background:#16a34a; color:#fff; border-color:#16a34a;">Guardar y mandar WhatsApp</button>
          </div>
        </div>
      </section>
    `;

    const listEl = container.querySelector("#quickList");

    if (!state.quick.items.length) {
      listEl.innerHTML = `<div class="empty">No hay productos en la oferta rápida.</div>`;
    } else {
      listEl.innerHTML = state.quick.items.map((item, index) => {
        const subtotal = Number(item.precio || 0) * Number(item.cantidad || 0);
        return `
          <article class="row">
            <div class="row-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div>
                <div class="row-title">${escapeHtml(item.nombre)}</div>
                <div class="row-sub">${escapeHtml(item.rubro || "Sin rubro")} · ${escapeHtml(item.unidad || "kg")} · $ ${formatMoney(item.precio)}</div>
              </div>
              <div style="display:flex; gap:6px; align-items:center;">
                <input type="number" min="0.5" step="0.5" value="${item.cantidad}" data-quick-qty="${index}" style="width:76px;" />
                <button type="button" data-quick-del="${index}">Quitar</button>
              </div>
            </div>
            <div style="text-align:right; margin-top:6px; font-weight:800;">$ ${formatMoney(subtotal)}</div>
          </article>
        `;
      }).join("");
    }

    container.querySelector("#backToChooserBtn")?.addEventListener("click", () => {
      mode = "chooser";
      renderChooser();
    });

    container.querySelector("#quickSearchInput")?.addEventListener("input", (event) => {
      state.quick.searchTerm = event.target.value.trim().toLowerCase();
      renderQuick();
    });

    container.querySelector("#quickRubroSelect")?.addEventListener("change", (event) => {
      state.quick.rubroFilter = event.target.value.trim();
      renderQuick();
    });

    container.querySelector("#quickAddItemBtn")?.addEventListener("click", () => {
      const index = container.querySelector("#quickProductSelect")?.value;
      if (index === "" || index == null) return;
      const product = safeProducts[Number(index)];
      if (!product) return;
      state.quick.items.push(normalizeProduct(product));
      renderQuick();
    });

    container.querySelectorAll("[data-quick-qty]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.quickQty);
        const nextValue = Number(event.target.value) || 1;
        state.quick.items[index].cantidad = nextValue <= 0 ? 1 : nextValue;
        renderQuick();
      });
    });

    container.querySelectorAll("[data-quick-del]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.target.dataset.quickDel);
        state.quick.items.splice(index, 1);
        renderQuick();
      });
    });

    container.querySelector("#quickSaveBtn")?.addEventListener("click", async () => {
      const combo = buildQuickPayload();
      await saveBuiltCombo(combo, { openWhatsapp: false });
      state.quick.items = [];
      renderQuick();
    });

    container.querySelector("#quickWhatsappBtn")?.addEventListener("click", async () => {
      const combo = buildQuickPayload();
      await saveBuiltCombo(combo, { openWhatsapp: true });
      state.quick.items = [];
      renderQuick();
    });
  }

  function renderDiscountSteps() {
    const steps = [
      { id: 1, title: "Productos", sub: "Elegí qué vendés" },
      { id: 2, title: "Ajustes", sub: "Cantidad y descuentos" },
      { id: 3, title: "Vender", sub: "Guardar y compartir" },
    ];

    return `
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:12px 0;">
        ${steps.map((step) => `
          <button type="button" data-discount-step="${step.id}" style="text-align:left; border:1px solid ${state.discount.step === step.id ? "#f97316" : "#e5e7eb"}; background:${state.discount.step === step.id ? "#fff7ed" : "#fff"}; border-radius:14px; padding:12px; cursor:pointer;">
            <strong style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:999px; background:#2563eb; color:white; margin-right:8px;">${step.id}</strong>
            <span style="font-weight:900;">${step.title}</span>
            <small style="display:block; color:#64748b; margin-left:36px;">${step.sub}</small>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderDiscount() {
    const totals = calculateDiscountTotals(state.discount.items, state.discount.globalDiscount);

    container.innerHTML = `
      <section style="display:grid; gap:14px;">
        <header style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; background:#fff; border:1px solid #fed7aa; border-radius:18px; padding:18px;">
          <div>
            <div style="font-size:.72rem; font-weight:900; color:#c2410c; text-transform:uppercase; letter-spacing:.04em;">Oferta con descuentos</div>
            <h2 style="margin:6px 0 4px;">Crear oferta guiada</h2>
            <p class="muted" style="margin:0;">Armá una oferta en 3 pasos: productos, ajustes y WhatsApp.</p>
          </div>
          <button id="discountBackToChooserBtn" type="button">← Cambiar modo</button>
        </header>

        ${renderDiscountSteps()}

        <div id="discountStepContent"></div>
      </section>
    `;

    container.querySelector("#discountBackToChooserBtn")?.addEventListener("click", () => {
      mode = "chooser";
      renderChooser();
    });

    container.querySelectorAll("[data-discount-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const nextStep = Number(event.currentTarget.dataset.discountStep);
        if (nextStep > 1 && !state.discount.items.length) {
          alert("Primero agregá al menos un producto.");
          return;
        }
        state.discount.step = nextStep;
        renderDiscount();
      });
    });

    const content = container.querySelector("#discountStepContent");
    if (!content) return;

    if (state.discount.step === 1) {
      renderDiscountStepProducts(content);
      return;
    }

    if (state.discount.step === 2) {
      renderDiscountStepAdjust(content, totals);
      return;
    }

    renderDiscountStepSell(content, totals);
  }

  function renderDiscountStepProducts(content) {
    const filteredProducts = getFilteredProducts(state.discount);

    content.innerHTML = `
      <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px; display:grid; gap:12px;">
        <h3 style="margin:0;">1. Elegí productos</h3>
        <p class="muted" style="margin:0;">Sumá los cortes o productos que van a entrar en la promo.</p>

        <div class="toolbar">
          <input id="discountSearchInput" type="text" placeholder="Buscar productos..." value="${escapeHtml(state.discount.searchTerm)}" style="flex:1; min-width:150px;" />
          <select id="discountRubroSelect" style="min-width:140px;">
            <option value="">Todos los rubros</option>
            ${buildRubroOptions(state.discount.rubroFilter)}
          </select>
        </div>

        <div class="toolbar">
          <select id="discountProductSelect">
            <option value="">Seleccionar producto...</option>
            ${buildProductOptions(filteredProducts)}
          </select>
          <button id="discountAddItemBtn" type="button">Agregar</button>
        </div>

        <div class="list">
          ${state.discount.items.length ? state.discount.items.map((item, index) => `
            <article class="row">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div>
                  <strong>${escapeHtml(item.nombre)}</strong>
                  <div class="row-sub">${escapeHtml(item.rubro || "Sin rubro")} · $ ${formatMoney(item.precio)}/${escapeHtml(item.unidad || "kg")}</div>
                </div>
                <button type="button" data-discount-del="${index}">Quitar</button>
              </div>
            </article>
          `).join("") : `<div class="empty">Todavía no agregaste productos.</div>`}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
          <button id="discountNextAdjustBtn" type="button">Siguiente: ajustar</button>
        </div>
      </div>
    `;

    content.querySelector("#discountSearchInput")?.addEventListener("input", (event) => {
      state.discount.searchTerm = event.target.value.trim().toLowerCase();
      renderDiscount();
    });

    content.querySelector("#discountRubroSelect")?.addEventListener("change", (event) => {
      state.discount.rubroFilter = event.target.value.trim();
      renderDiscount();
    });

    content.querySelector("#discountAddItemBtn")?.addEventListener("click", () => {
      const index = content.querySelector("#discountProductSelect")?.value;
      if (index === "" || index == null) return;
      const product = safeProducts[Number(index)];
      if (!product) return;
      state.discount.items.push(normalizeProduct(product));
      renderDiscount();
    });

    content.querySelectorAll("[data-discount-del]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.dataset.discountDel);
        state.discount.items.splice(index, 1);
        renderDiscount();
      });
    });

    content.querySelector("#discountNextAdjustBtn")?.addEventListener("click", () => {
      if (!state.discount.items.length) {
        alert("Agregá al menos un producto.");
        return;
      }
      state.discount.step = 2;
      renderDiscount();
    });
  }

  function renderDiscountStepAdjust(content, totals) {
    content.innerHTML = `
      <div style="display:grid; grid-template-columns:minmax(0,2fr) minmax(260px,1fr); gap:14px; align-items:start;">
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px; display:grid; gap:12px;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
            <div>
              <h3 style="margin:0;">2. Ajustá cantidades</h3>
              <p class="muted" style="margin:4px 0 0;">Usá kilos y descuentos si hace falta. El total se actualiza solo.</p>
            </div>
            <button id="discountBackProductsBtn" type="button">← Productos</button>
          </div>

          ${state.discount.items.map((item, index) => {
            const calc = calculateDiscountItem(item);
            return `
              <article class="row">
                <div style="display:grid; grid-template-columns:minmax(150px,1fr) auto auto auto auto; gap:10px; align-items:center;">
                  <div>
                    <strong>${escapeHtml(item.nombre)}</strong>
                    <div class="row-sub">${escapeHtml(item.rubro || "Sin rubro")} · $ ${formatMoney(item.precio)}/${escapeHtml(item.unidad || "kg")}</div>
                  </div>
                  <button type="button" data-qty-minus="${index}">−</button>
                  <input type="number" min="0.5" step="0.5" value="${item.cantidad}" data-discount-qty="${index}" style="width:72px; text-align:center; font-weight:900;" />
                  <button type="button" data-qty-plus="${index}">+</button>
                  <span style="font-weight:800;">${escapeHtml(item.unidad || "kg")}</span>
                  <div style="grid-column:2 / span 4; display:flex; gap:8px; align-items:center; justify-content:flex-end; flex-wrap:wrap;">
                    <label style="font-size:.78rem; font-weight:900; color:#2563eb;">Desc. %</label>
                    <input type="number" min="0" max="100" step="1" value="${calc.descuento}" data-discount-percent="${index}" style="width:80px; text-align:center; font-weight:900;" />
                    <strong>Neto: $ ${formatMoney(calc.neto)}</strong>
                    <button type="button" data-discount-del-adjust="${index}" style="color:#dc2626;">Eliminar</button>
                  </div>
                </div>
              </article>
            `;
          }).join("")}

          <div style="border:1px solid #bfdbfe; background:#eff6ff; border-radius:16px; padding:12px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
            <strong>Descuento general</strong>
            <div style="display:flex; gap:8px; align-items:center;">
              <input id="globalDiscountInput" type="number" min="0" max="100" step="1" value="${totals.descuentoGlobal}" style="width:90px; text-align:center; font-weight:900;" />
              <strong>%</strong>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
            <button id="discountBackProductsBtn2" type="button">← Productos</button>
            <button id="discountNextSellBtn" type="button">Ver oferta lista</button>
          </div>
        </div>

        ${renderDiscountPreview(totals)}
      </div>
    `;

    content.querySelectorAll("[data-discount-qty]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.discountQty);
        const nextValue = Number(event.target.value) || 1;
        state.discount.items[index].cantidad = nextValue <= 0 ? 1 : nextValue;
        renderDiscount();
      });
    });

    content.querySelectorAll("[data-qty-minus]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.dataset.qtyMinus);
        const current = Number(state.discount.items[index].cantidad || 1);
        state.discount.items[index].cantidad = Math.max(0.5, current - 0.5);
        renderDiscount();
      });
    });

    content.querySelectorAll("[data-qty-plus]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.dataset.qtyPlus);
        const current = Number(state.discount.items[index].cantidad || 1);
        state.discount.items[index].cantidad = current + 0.5;
        renderDiscount();
      });
    });

    content.querySelectorAll("[data-discount-percent]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.discountPercent);
        state.discount.items[index].descuento_individual = clampPercent(event.target.value);
        renderDiscount();
      });
    });

    content.querySelectorAll("[data-discount-del-adjust]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.dataset.discountDelAdjust);
        state.discount.items.splice(index, 1);
        if (!state.discount.items.length) state.discount.step = 1;
        renderDiscount();
      });
    });

    content.querySelector("#globalDiscountInput")?.addEventListener("change", (event) => {
      state.discount.globalDiscount = clampPercent(event.target.value);
      renderDiscount();
    });

    content.querySelector("#discountBackProductsBtn")?.addEventListener("click", () => {
      state.discount.step = 1;
      renderDiscount();
    });

    content.querySelector("#discountBackProductsBtn2")?.addEventListener("click", () => {
      state.discount.step = 1;
      renderDiscount();
    });

    content.querySelector("#discountNextSellBtn")?.addEventListener("click", () => {
      state.discount.step = 3;
      renderDiscount();
    });
  }

  function renderDiscountPreview(totals) {
    return `
      <aside style="background:#fff7ed; border:1px solid #fed7aa; border-radius:18px; padding:16px; position:sticky; top:10px;">
        <div style="font-size:.72rem; font-weight:900; color:#c2410c; text-transform:uppercase;">Vista para vender</div>
        <h3 style="margin:8px 0;">${escapeHtml(state.discount.offerName || "OFERTA DEL DIA")}</h3>
        <ul style="margin:0 0 12px 18px; padding:0; display:grid; gap:5px;">
          ${state.discount.items.map((item) => {
            const calc = calculateDiscountItem(item);
            return `<li>${formatQty(calc.cantidad)} ${escapeHtml(item.unidad || "kg")} · ${escapeHtml(item.nombre)}</li>`;
          }).join("")}
        </ul>
        <div style="font-size:1.6rem; color:#c2410c; font-weight:1000;">TOTAL: $ ${formatMoney(totals.total)}</div>
      </aside>
    `;
  }

  function renderDiscountStepSell(content, totals) {
    const combo = buildDiscountPayload();
    const whatsappPreview = buildWhatsappText(combo);

    content.innerHTML = `
      <div style="display:grid; grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr); gap:14px; align-items:start;">
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px; display:grid; gap:12px;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
            <div>
              <h3 style="margin:0;">3. Oferta lista</h3>
              <p class="muted" style="margin:4px 0 0;">Revisá el nombre, guardá y mandá por WhatsApp.</p>
            </div>
            <button id="discountBackAdjustBtn" type="button">← Ajustes</button>
          </div>

          <label style="display:grid; gap:6px; font-weight:900;">
            Nombre comercial de la oferta
            <input id="discountOfferNameInput" type="text" value="${escapeHtml(state.discount.offerName)}" placeholder="OFERTA DEL DIA" />
          </label>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:12px; white-space:pre-line; line-height:1.45;">
            ${escapeHtml(whatsappPreview)}
          </div>

          <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
            <button id="discountBackAdjustBtn2" type="button">← Volver y ajustar</button>
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <button id="discountSaveBtn" type="button">Guardar oferta</button>
              <button id="discountWhatsappBtn" type="button" style="background:#16a34a; color:#fff; border-color:#16a34a;">Enviar por WhatsApp</button>
            </div>
          </div>
        </div>

        ${renderDiscountPreview(totals)}
      </div>
    `;

    content.querySelector("#discountOfferNameInput")?.addEventListener("input", (event) => {
      state.discount.offerName = event.target.value || "OFERTA DEL DIA";
    });

    content.querySelector("#discountBackAdjustBtn")?.addEventListener("click", () => {
      state.discount.step = 2;
      renderDiscount();
    });

    content.querySelector("#discountBackAdjustBtn2")?.addEventListener("click", () => {
      state.discount.step = 2;
      renderDiscount();
    });

    content.querySelector("#discountSaveBtn")?.addEventListener("click", async () => {
      const payload = buildDiscountPayload();
      await saveBuiltCombo(payload, { openWhatsapp: false });
      state.discount.items = [];
      state.discount.step = 1;
      renderDiscount();
    });

    content.querySelector("#discountWhatsappBtn")?.addEventListener("click", async () => {
      const payload = buildDiscountPayload();
      await saveBuiltCombo(payload, { openWhatsapp: true });
      state.discount.items = [];
      state.discount.step = 1;
      renderDiscount();
    });
  }

  renderChooser();
}
