import { saveCombo } from "../services/data-service.js";

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR").format(value || 0);
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
  let items = [];
  let currentSearchTerm = "";
  let currentRubroFilter = "";

  container.innerHTML = `
    <h2 style="margin-top:0;">Crear oferta</h2>
    <p class="muted">Elegí productos, armá una oferta y mandala por WhatsApp.</p>

    <div class="toolbar">
      <input
        id="builderSearchInput"
        type="text"
        placeholder="Buscar productos…"
        style="flex:1; min-width:150px;"
      />

      <select id="builderRubroSelect" style="min-width:140px;">
        <option value="">Todos los rubros</option>
      </select>
    </div>

    <div class="toolbar">
      <select id="builderProductSelect">
        <option value="">Seleccionar producto...</option>
      </select>

      <button id="addItemBtn" type="button">Agregar</button>
    </div>

    <div id="builderList" class="list"></div>

    <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <strong>Total: $ <span id="builderTotal">0</span></strong>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button id="saveComboBtn" type="button">Guardar oferta</button>
        <button id="saveAndWhatsappBtn" type="button" style="background:#16a34a; color:#fff; border-color:#16a34a;">Guardar y mandar WhatsApp</button>
      </div>
    </div>
  `;

  const builderSearchInput = container.querySelector("#builderSearchInput");
  const builderRubroSelect = container.querySelector("#builderRubroSelect");
  const select = container.querySelector("#builderProductSelect");
  const addBtn = container.querySelector("#addItemBtn");
  const listEl = container.querySelector("#builderList");
  const totalEl = container.querySelector("#builderTotal");
  const saveBtn = container.querySelector("#saveComboBtn");
  const saveAndWhatsappBtn = container.querySelector("#saveAndWhatsappBtn");

  function getUniqueRubros(productList) {
    const rubros = new Set();
    productList.forEach((product) => {
      const rubro = String(product.rubro || "").trim();
      if (rubro) rubros.add(rubro);
    });
    return Array.from(rubros).sort();
  }

  function getFilteredProducts() {
    return safeProducts.filter((product) => {
      const nombre = String(product.nombre || "").toLowerCase();
      const rubro = String(product.rubro || "").toLowerCase();

      const matchSearch =
        currentSearchTerm === "" ||
        nombre.includes(currentSearchTerm) ||
        rubro.includes(currentSearchTerm);

      const matchRubro =
        currentRubroFilter === "" ||
        rubro === currentRubroFilter.toLowerCase();

      return matchSearch && matchRubro;
    });
  }

  function populateRubroSelect() {
    const rubros = getUniqueRubros(safeProducts);
    const options = rubros
      .map((rubro) => `<option value="${rubro}">${rubro}</option>`)
      .join("");
    builderRubroSelect.innerHTML = `<option value="">Todos los rubros</option>${options}`;
  }

  function updateProductSelect() {
    const filteredProducts = getFilteredProducts();

    select.innerHTML = `<option value="">Seleccionar producto...</option>
      ${filteredProducts
        .map((product) => {
          const nombre = product?.nombre || "Sin nombre";
          const rubro = product?.rubro || "Sin rubro";
          const originalIndex = safeProducts.findIndex(
            (p) => p.nombre === product.nombre && p.rubro === product.rubro
          );
          return `<option value="${originalIndex}">${nombre} (${rubro})</option>`;
        })
        .join("")}
    `;
  }

  function applyFilters() {
    updateProductSelect();
    select.value = "";
  }

  function getComboTotal() {
    return items.reduce((acc, item) => {
      return acc + Number(item.precio || 0) * Number(item.cantidad || 0);
    }, 0);
  }

  function buildComboPayload() {
    const now = new Date();
    return {
      name: "Oferta del día " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      description: "Oferta creada para vender por WhatsApp.",
      items: items.map((item) => ({
        productKey: item.productKey || item.id || null,
        nombre: item.nombre,
        rubro: item.rubro || "",
        unidad: item.unidad || "kg",
        precio: Number(item.precio || 0),
        cantidad: Number(item.cantidad || 1),
        subtotal: Number(item.precio || 0) * Number(item.cantidad || 1),
      })),
      total: getComboTotal(),
    };
  }

  function draw() {
    if (!items.length) {
      listEl.innerHTML = `<div class="empty">No hay productos en la oferta.</div>`;
      totalEl.textContent = "0";
      return;
    }

    let total = 0;

    listEl.innerHTML = items
      .map((item, index) => {
        const subtotal = Number(item.precio || 0) * Number(item.cantidad || 0);
        total += subtotal;

        return `
          <article class="row">
            <div class="row-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div>
                <div class="row-title">${item.nombre}</div>
                <div class="row-sub">${item.rubro || "Sin rubro"} · ${item.unidad || "kg"}</div>
              </div>

              <div style="display:flex; gap:6px; align-items:center;">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value="${item.cantidad}"
                  data-index="${index}"
                  class="qtyInput"
                  style="width:76px;"
                />
                <button type="button" data-del="${index}">✕</button>
              </div>
            </div>

            <div style="text-align:right; margin-top:6px; font-weight:700;">
              $ ${formatMoney(subtotal)}
            </div>
          </article>
        `;
      })
      .join("");

    totalEl.textContent = formatMoney(total);

    container.querySelectorAll(".qtyInput").forEach((input) => {
      input.addEventListener("change", (event) => {
        const index = Number(event.target.dataset.index);
        const nextValue = Number(event.target.value) || 1;
        items[index].cantidad = nextValue <= 0 ? 1 : nextValue;
        draw();
      });
    });

    container.querySelectorAll("[data-del]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.target.dataset.del);
        items.splice(index, 1);
        draw();
      });
    });
  }

  async function saveCurrentCombo({ openWhatsapp = false } = {}) {
    if (!items.length) {
      alert("Agregá al menos un producto");
      return;
    }

    const combo = buildComboPayload();

    try {
      const saved = await saveCombo(combo);
      console.log("✅ OFERTA PROCESADA:", saved);

      items = [];
      draw();

      if (typeof onComboSaved === "function") {
        await onComboSaved(saved);
      }

      if (openWhatsapp) {
        openComboWhatsapp(saved);
      }

      alert(openWhatsapp ? "Oferta lista para mandar por WhatsApp" : "Oferta guardada correctamente");
    } catch (error) {
      console.error("❌ ERROR AL GUARDAR OFERTA:", error);
      alert("No se pudo guardar la oferta. Probá de nuevo.");
    }
  }

  builderSearchInput?.addEventListener("input", (event) => {
    currentSearchTerm = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  builderRubroSelect?.addEventListener("change", (event) => {
    currentRubroFilter = event.target.value.trim();
    applyFilters();
  });

  addBtn?.addEventListener("click", () => {
    const index = select?.value;
    if (index === "" || index == null) return;

    const product = safeProducts[Number(index)];
    if (!product) return;

    items.push({
      id: product.id || product.productKey || null,
      productKey: product.productKey || product.id || null,
      nombre: product.nombre || "Sin nombre",
      precio: Number(product.precio) || 0,
      rubro: product.rubro || "",
      unidad: product.unidad || "kg",
      cantidad: 1,
    });

    if (select) select.value = "";
    draw();
  });

  saveBtn?.addEventListener("click", () => saveCurrentCombo({ openWhatsapp: false }));
  saveAndWhatsappBtn?.addEventListener("click", () => saveCurrentCombo({ openWhatsapp: true }));

  populateRubroSelect();
  updateProductSelect();
  draw();
}
