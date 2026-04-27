import { getMarketCache } from "../services/business-store.js";

const STATUS_THRESHOLD_PERCENT = 10;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(n);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePrice(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundToHundred(value) {
  const n = Math.abs(Number(value || 0));
  if (!n) return 0;
  return Math.max(100, Math.round(n / 100) * 100);
}

function getProductCompareKey(product = {}) {
  return normalizeText(product.compareKey || product.productKey || product.id || product.key || "");
}

function getProductName(product = {}) {
  return normalizeText(product.nombre || product.name || product.label || product.title || getProductCompareKey(product) || "Producto");
}

function getProductPrice(product = {}) {
  return normalizePrice(product.precio ?? product.price);
}

function isActiveProduct(product = {}) {
  return product.active !== false && product.activo !== false;
}

function getStatusMeta(status) {
  if (status === "caro") {
    return {
      key: "caro",
      label: "Caro",
      badge: "🔴 Caro",
      actionLabel: "Bajar precio",
      color: "#b42318",
      softBg: "#fdecea",
      border: "#fac5bd"
    };
  }

  if (status === "barato") {
    return {
      key: "barato",
      label: "Barato",
      badge: "🟢 Barato",
      actionLabel: "Podés subir",
      color: "#027a48",
      softBg: "#e8f7ef",
      border: "#bdebd1"
    };
  }

  if (status === "sin_datos") {
    return {
      key: "sin_datos",
      label: "Sin datos",
      badge: "⚪ Sin datos",
      actionLabel: "Esperar datos",
      color: "#667085",
      softBg: "#f2f4f7",
      border: "#e4e7ec"
    };
  }

  return {
    key: "competitivo",
    label: "Competitivo",
    badge: "🟡 Competitivo",
    actionLabel: "Mantener",
    color: "#936500",
    softBg: "#fff7e6",
    border: "#f7df9e"
  };
}

function classifyPrice(myPrice, avgPrice) {
  if (!avgPrice || !myPrice) return getStatusMeta("sin_datos");

  const diffPercent = ((myPrice - avgPrice) / avgPrice) * 100;
  if (diffPercent > STATUS_THRESHOLD_PERCENT) return getStatusMeta("caro");
  if (diffPercent < -STATUS_THRESHOLD_PERCENT) return getStatusMeta("barato");
  return getStatusMeta("competitivo");
}

function getMarketPrices(compareKey, marketCache = [], activeBusinessId) {
  return marketCache
    .filter((snapshot) => snapshot?.businessId && snapshot.businessId !== activeBusinessId)
    .map((snapshot) => ({
      businessId: snapshot.businessId,
      businessName: snapshot.name || snapshot.businessId,
      price: normalizePrice(snapshot?.products?.[compareKey])
    }))
    .filter((row) => row.price > 0);
}

function analyzeProduct(product = {}, marketCache = [], activeBusinessId) {
  if (!isActiveProduct(product)) return null;

  const compareKey = getProductCompareKey(product);
  const myPrice = getProductPrice(product);
  if (!compareKey || !myPrice) return null;

  const marketPrices = getMarketPrices(compareKey, marketCache, activeBusinessId);
  const prices = marketPrices.map((row) => row.price);
  const marketCount = prices.length;
  const avg = marketCount ? prices.reduce((acc, n) => acc + n, 0) / marketCount : 0;
  const min = marketCount ? Math.min(...prices) : 0;
  const max = marketCount ? Math.max(...prices) : 0;
  const diff = avg ? myPrice - avg : 0;
  const diffPercent = avg ? ((myPrice - avg) / avg) * 100 : 0;
  const status = classifyPrice(myPrice, avg);
  const suggestedAmount = roundToHundred(diff);

  return {
    compareKey,
    productName: getProductName(product),
    myPrice,
    avg,
    min,
    max,
    diff,
    diffPercent,
    marketCount,
    marketPrices,
    status,
    suggestedAmount
  };
}

function analyzeAllProducts(products = [], marketCache = [], activeBusinessId) {
  return (Array.isArray(products) ? products : [])
    .map((product) => analyzeProduct(product, marketCache, activeBusinessId))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.status.key === "caro" && b.status.key !== "caro") return -1;
      if (b.status.key === "caro" && a.status.key !== "caro") return 1;
      return Math.abs(b.diffPercent) - Math.abs(a.diffPercent);
    });
}

function buildSummary(rows = []) {
  const caroRows = rows.filter((r) => r.status.key === "caro");
  const baratoRows = rows.filter((r) => r.status.key === "barato");
  const competitivoRows = rows.filter((r) => r.status.key === "competitivo");
  const sinDatosRows = rows.filter((r) => r.status.key === "sin_datos");

  return {
    total: rows.length,
    caro: caroRows.length,
    barato: baratoRows.length,
    competitivo: competitivoRows.length,
    sinDatos: sinDatosRows.length,
    caroRows,
    baratoRows,
    competitivoRows,
    sinDatosRows
  };
}

function buildMarketPosition(summary = {}) {
  if (!summary.total) return "Todavía falta información para comparar tu lista.";

  if (summary.barato > summary.caro && summary.barato >= 3) {
    return "Estás bastante por debajo del mercado en varios productos. Hay oportunidad de mejorar margen.";
  }

  if (summary.caro > summary.barato && summary.caro >= 3) {
    return "Tenés varios productos por encima del mercado. Conviene revisar competitividad.";
  }

  return "Tu lista está bastante alineada. Revisá los extremos para ajustar fino.";
}

function actionText(row) {
  if (row.status.key === "caro") return `Bajar ${row.productName} ${formatMoney(row.suggestedAmount)}`;
  if (row.status.key === "barato") return `Subir ${row.productName} ${formatMoney(row.suggestedAmount)}`;
  if (row.status.key === "competitivo") return `Mantener ${row.productName}`;
  return `Revisar ${row.productName} cuando haya más datos`;
}

function renderStatCard(label, value, color = "#2b2118") {
  return `
    <div style="padding:14px;border:1px solid #eadfce;border-radius:16px;background:#fff;box-shadow:0 3px 12px rgba(42,24,12,0.04);">
      <div style="font-size:12px;color:#6e6258;font-weight:800;margin-bottom:5px;">${label}</div>
      <div style="font-size:28px;font-weight:900;color:${color};line-height:1;">${value}</div>
    </div>
  `;
}

function renderProductList(rows = [], emptyText = "Sin productos para mostrar.", limit = 6) {
  const sliced = rows.slice(0, limit);
  if (!sliced.length) {
    return `<div style="padding:14px;border:1px dashed #e1d6c7;border-radius:14px;color:#6e6258;background:#fff;">${emptyText}</div>`;
  }

  return sliced.map((row) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid ${row.status.border};border-radius:14px;background:${row.status.softBg};margin-bottom:8px;">
      <div>
        <div style="font-weight:900;color:#2b2118;">${escapeHtml(row.productName)}</div>
        <div style="font-size:12px;color:#6e6258;">Mi precio ${formatMoney(row.myPrice)} · Mercado ${row.avg ? formatMoney(row.avg) : "sin dato"}</div>
      </div>
      <div style="text-align:right;color:${row.status.color};font-weight:900;white-space:nowrap;">
        ${row.diffPercent > 0 ? "+" : ""}${row.diffPercent.toFixed(1)}%
      </div>
    </div>
  `).join("");
}

function renderActions(rows = []) {
  const priority = rows
    .filter((row) => row.status.key === "caro" || row.status.key === "barato")
    .sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent))
    .slice(0, 8);

  if (!priority.length) {
    return `<div style="padding:14px;border:1px solid #eadfce;border-radius:14px;background:#fff;color:#6e6258;">No hay acciones urgentes. Tu lista está bastante alineada.</div>`;
  }

  return priority.map((row) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid ${row.status.border};border-radius:16px;background:#fff;margin-bottom:9px;box-shadow:0 2px 10px rgba(42,24,12,0.04);">
      <div>
        <div style="font-size:15px;font-weight:950;color:${row.status.color};">${escapeHtml(actionText(row))}</div>
        <div style="font-size:12px;color:#6e6258;margin-top:3px;">Actual: ${formatMoney(row.myPrice)} · Mercado: ${formatMoney(row.avg)} · Dif: ${row.diffPercent > 0 ? "+" : ""}${row.diffPercent.toFixed(1)}%</div>
      </div>
      <span style="padding:6px 9px;border-radius:999px;background:${row.status.softBg};color:${row.status.color};font-size:12px;font-weight:900;white-space:nowrap;">${row.status.badge}</span>
    </div>
  `).join("");
}

function buildFilterButton(label, value, activeValue, count) {
  const isActive = activeValue === value;
  return `
    <button type="button" data-filter="${value}" style="min-height:38px;padding:0 12px;border-radius:999px;border:1px solid ${isActive ? "#b63b2b" : "#e7e1d8"};background:${isActive ? "#b63b2b" : "#fff"};color:${isActive ? "#fff" : "#1f1f1f"};font-weight:800;cursor:pointer;white-space:nowrap;">
      ${label} <span style="opacity:.75;">${count}</span>
    </button>
  `;
}

function renderTableRows(dataset = []) {
  return dataset.map((row) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;min-width:220px;">
        <div style="font-weight:800;">${escapeHtml(row.productName)}</div>
        <div style="font-size:12px;color:#6e6e6e;">${escapeHtml(row.compareKey)}</div>
      </td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;text-align:right;font-weight:800;white-space:nowrap;">${formatMoney(row.myPrice)}</td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;text-align:right;white-space:nowrap;">${row.avg ? formatMoney(row.avg) : "—"}</td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;text-align:right;color:${row.status.color};font-weight:900;white-space:nowrap;">${row.avg ? `${row.diff > 0 ? "+" : ""}${formatMoney(row.diff)}` : "—"}</td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;text-align:right;color:${row.status.color};font-weight:900;white-space:nowrap;">${row.avg ? `${row.diffPercent > 0 ? "+" : ""}${row.diffPercent.toFixed(1)}%` : "—"}</td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;white-space:nowrap;"><span style="display:inline-block;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;background:${row.status.softBg};color:${row.status.color};">${row.status.badge}</span></td>
      <td style="padding:12px;border-bottom:1px solid #f0ebe3;white-space:nowrap;font-weight:900;color:${row.status.color};">${escapeHtml(actionText(row))}</td>
    </tr>
  `).join("");
}

export async function renderMarket(container, options = {}) {
  if (!container) return;

  const {
    activeBusinessId = null,
    activeBusinessName = null,
    products = [],
    onRefreshMarket = null,
    onRebuildMarket = null
  } = options;

  if (!activeBusinessId) {
    container.innerHTML = `<div style="padding:16px;color:#6e6e6e;">No hay carnicería activa para comparar.</div>`;
    return;
  }

  const marketCache = getMarketCache();
  const otherBusinessesCount = Math.max(0, marketCache.filter((snapshot) => snapshot?.businessId !== activeBusinessId).length);
  const dataset = analyzeAllProducts(products, marketCache, activeBusinessId);
  const summary = buildSummary(dataset);
  let activeFilter = "all";

  container.innerHTML = `
    <section style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
      <button type="button" data-panel="dashboardPanel" style="min-height:40px;padding:0 13px;border-radius:12px;border:1px solid #e7e1d8;background:#fff;font-weight:900;cursor:pointer;">← Volver al inicio</button>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="marketRefreshBtn" type="button" style="min-height:40px;padding:0 13px;border-radius:12px;border:1px solid #e7e1d8;background:#fff;font-weight:900;cursor:pointer;">🔄 Actualizar comparación</button>
        ${onRebuildMarket ? `<button id="marketRebuildBtn" type="button" style="min-height:40px;padding:0 13px;border-radius:12px;border:1px solid #b63b2b;background:#b63b2b;color:#fff;font-weight:900;cursor:pointer;">🧱 Actualizar base</button>` : ""}
      </div>
    </section>

    <section style="padding:18px;border:1px solid #eadfce;border-radius:22px;background:linear-gradient(135deg,#fff7ea,#ffffff);box-shadow:0 10px 30px rgba(42,24,12,0.06);margin-bottom:16px;">
      <div style="max-width:860px;">
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#fff2df;color:#8a4b12;font-size:12px;font-weight:950;margin-bottom:10px;">📊 Competencia · Producto contra producto</div>
        <h2 style="margin:0;font-size:30px;line-height:1.1;color:#7d360c;">Tu posición frente al mercado</h2>
        <p style="margin:10px 0 0;color:#4e4035;line-height:1.5;font-size:15px;">
          Detectá rápido dónde estás caro, dónde estás barato y qué precios conviene ajustar hoy.
        </p>
        <p style="margin:8px 0 0;color:#6e6258;font-size:13px;">
          Comparando <strong>${escapeHtml(activeBusinessName || activeBusinessId)}</strong> contra <strong>${otherBusinessesCount}</strong> carnicerías disponibles.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px;">
        ${renderStatCard("Productos comparados", summary.total)}
        ${renderStatCard("🔴 Caros", summary.caro, "#b42318")}
        ${renderStatCard("🟢 Baratos", summary.barato, "#027a48")}
        ${renderStatCard("🟡 Competitivos", summary.competitivo, "#936500")}
      </div>

      <div style="margin-top:14px;padding:13px 14px;border-radius:16px;background:#22140f;color:#fff;font-size:14px;line-height:1.5;font-weight:700;">
        ${escapeHtml(buildMarketPosition(summary))}
      </div>
    </section>

    ${otherBusinessesCount < 1 ? `
      <div style="padding:14px;border:1px solid #f2d39b;border-radius:14px;background:#fff8e6;color:#7a4b00;margin-bottom:14px;line-height:1.45;">
        ⚠️ Todavía no hay suficientes carnicerías disponibles para comparar. Actualizá la comparación o pedile al administrador que actualice la base.
      </div>
    ` : ""}

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:16px;">
      <div style="padding:16px;border:1px solid #eadfce;border-radius:18px;background:#fff;">
        <div style="font-weight:950;color:#b42318;margin-bottom:10px;font-size:16px;">1️⃣ Dónde estás caro</div>
        ${renderProductList(summary.caroRows.sort((a,b)=>b.diffPercent-a.diffPercent), "No aparecen precios caros relevantes.", 5)}
      </div>
      <div style="padding:16px;border:1px solid #eadfce;border-radius:18px;background:#fff;">
        <div style="font-weight:950;color:#027a48;margin-bottom:10px;font-size:16px;">2️⃣ Dónde estás barato</div>
        ${renderProductList(summary.baratoRows.sort((a,b)=>a.diffPercent-b.diffPercent), "No aparecen oportunidades claras de suba.", 5)}
      </div>
    </section>

    <section style="padding:16px;border:1px solid #eadfce;border-radius:20px;background:#fff;margin-bottom:16px;box-shadow:0 6px 20px rgba(42,24,12,0.05);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;color:#7d360c;font-size:22px;">3️⃣ Acciones correctivas sugeridas</h3>
          <p style="margin:6px 0 0;color:#6e6258;font-size:13px;">Acciones simples para revisar hoy. Son referencias comerciales, no cambios automáticos.</p>
        </div>
        <button id="showFullTableBtn" type="button" style="min-height:38px;padding:0 12px;border-radius:12px;border:1px solid #e7e1d8;background:#fff;font-weight:900;cursor:pointer;">Ver tabla completa</button>
      </div>
      <div>${renderActions(dataset)}</div>
    </section>

    <section id="marketFullTableSection" style="display:none;">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
        <input id="marketSearch" type="search" placeholder="Buscar producto..." style="flex:1;min-width:220px;height:42px;border:1px solid #e7e1d8;border-radius:12px;padding:0 12px;font-weight:800;background:#fff;" />
      </div>
      <div id="marketFilters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;"></div>
      <div id="marketTableWrap" style="overflow:auto;border:1px solid #e7e1d8;border-radius:14px;background:#fff;"></div>
    </section>
  `;

  const tableSection = container.querySelector("#marketFullTableSection");
  const showFullTableBtn = container.querySelector("#showFullTableBtn");
  const filtersEl = container.querySelector("#marketFilters");
  const tableWrap = container.querySelector("#marketTableWrap");
  const searchEl = container.querySelector("#marketSearch");
  const refreshBtn = container.querySelector("#marketRefreshBtn");
  const rebuildBtn = container.querySelector("#marketRebuildBtn");
  let searchTerm = "";

  if (refreshBtn && typeof onRefreshMarket === "function") {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "🔄 Actualizando...";
      await onRefreshMarket();
    });
  }

  if (rebuildBtn && typeof onRebuildMarket === "function") {
    rebuildBtn.addEventListener("click", async () => {
      rebuildBtn.disabled = true;
      rebuildBtn.textContent = "🧱 Actualizando...";
      await onRebuildMarket();
    });
  }

  if (showFullTableBtn && tableSection) {
    showFullTableBtn.addEventListener("click", () => {
      const visible = tableSection.style.display !== "none";
      tableSection.style.display = visible ? "none" : "block";
      showFullTableBtn.textContent = visible ? "Ver tabla completa" : "Ocultar tabla";
      if (!visible) applyFilter(activeFilter);
    });
  }

  function applyFilter(filterValue = activeFilter) {
    activeFilter = filterValue;
    if (!filtersEl || !tableWrap) return;

    const counts = {
      all: dataset.length,
      caro: summary.caro,
      barato: summary.barato,
      competitivo: summary.competitivo,
      sin_datos: summary.sinDatos
    };

    const byStatus = activeFilter === "all" ? dataset : dataset.filter((row) => row.status.key === activeFilter);
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const filteredDataset = normalizedTerm
      ? byStatus.filter((row) => row.productName.toLowerCase().includes(normalizedTerm) || row.compareKey.toLowerCase().includes(normalizedTerm))
      : byStatus;

    filtersEl.innerHTML = `
      ${buildFilterButton("Todos", "all", activeFilter, counts.all)}
      ${buildFilterButton("🔴 Caros", "caro", activeFilter, counts.caro)}
      ${buildFilterButton("🟢 Baratos", "barato", activeFilter, counts.barato)}
      ${buildFilterButton("🟡 Competitivos", "competitivo", activeFilter, counts.competitivo)}
      ${buildFilterButton("⚪ Sin datos", "sin_datos", activeFilter, counts.sin_datos)}
    `;

    filtersEl.querySelectorAll("button[data-filter]").forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter || "all"));
    });

    if (!filteredDataset.length) {
      tableWrap.innerHTML = `<div style="padding:18px;color:#6e6e6e;">No hay productos para el filtro o búsqueda seleccionada.</div>`;
      return;
    }

    tableWrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:900px;">
        <thead>
          <tr style="background:#f8f5f0;">
            <th style="text-align:left;padding:12px;border-bottom:1px solid #e7e1d8;">Producto</th>
            <th style="text-align:right;padding:12px;border-bottom:1px solid #e7e1d8;">Mi precio</th>
            <th style="text-align:right;padding:12px;border-bottom:1px solid #e7e1d8;">Mercado</th>
            <th style="text-align:right;padding:12px;border-bottom:1px solid #e7e1d8;">Dif $</th>
            <th style="text-align:right;padding:12px;border-bottom:1px solid #e7e1d8;">Dif %</th>
            <th style="text-align:left;padding:12px;border-bottom:1px solid #e7e1d8;">Estado</th>
            <th style="text-align:left;padding:12px;border-bottom:1px solid #e7e1d8;">Acción sugerida</th>
          </tr>
        </thead>
        <tbody>${renderTableRows(filteredDataset)}</tbody>
      </table>
    `;
  }

  if (searchEl) {
    searchEl.addEventListener("input", (event) => {
      searchTerm = event.target.value || "";
      applyFilter(activeFilter);
    });
  }

  if (!dataset.length && tableWrap) {
    tableWrap.innerHTML = `<div style="padding:18px;color:#6e6e6e;line-height:1.5;">No hay productos comparables todavía.</div>`;
  }
}
