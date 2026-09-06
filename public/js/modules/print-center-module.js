// AppPromos V12.24-A — Centro de Impresiones / Imprimir pedido
// MVP local y stateless: pega un pedido generado por AppPromos y crea una comanda imprimible.

function cleanMarkdown(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\*+/g, "")
    .trim();
}

function parseMoney(value = "") {
  const digits = String(value || "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(digits);
  return Number.isFinite(number) ? number : null;
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || "").trim();
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(number);
}

function parseOrderLine(rawLine = "") {
  const original = String(rawLine || "").trim();
  if (!original) return null;
  const isComponent = /^-\s+/.test(original) && /^-\s+[\d.,]+\s+\S+\s+/.test(original);
  const clean = cleanMarkdown(original);

  // Los componentes aparecen inmediatamente debajo de una promoción y no tienen precio final.
  if (isComponent && !/\s-\s\$\s*[\d.]+(?:,\d+)?\s*$/.test(clean)) {
    const match = clean.match(/^-\s*([\d.,]+)\s+(\S+)\s+(.+)$/);
    if (!match) return { kind: "component", text: clean.replace(/^-\s*/, "") };
    return {
      kind: "component",
      quantity: match[1],
      unit: match[2],
      name: match[3].trim()
    };
  }

  const priceMatch = clean.match(/\s-\s(\$\s*[\d.]+(?:,\d+)?)\s*$/);
  if (!priceMatch) return null;

  const priceText = priceMatch[1];
  let left = clean.slice(0, priceMatch.index).trim().replace(/^-\s*/, "");
  const qtyMatch = left.match(/^([\d.,]+)\s+(kg|oferta|ofertas)\s+(.+)$/i);
  if (!qtyMatch) {
    return { kind: "item", name: left, quantityLabel: "", subtotal: parseMoney(priceText), subtotalText: priceText };
  }

  const quantity = qtyMatch[1];
  const unit = qtyMatch[2].toLowerCase();
  let name = qtyMatch[3].trim();
  let rubro = "";

  if (unit === "kg") {
    const rubroMatch = name.match(/^(.*)\s-\s([^\-]+)$/);
    if (rubroMatch) {
      name = rubroMatch[1].trim();
      rubro = rubroMatch[2].trim();
    }
  }

  return {
    kind: "item",
    name,
    rubro,
    quantityLabel: `${quantity} ${unit === "kg" ? "kg" : Number(String(quantity).replace(",", ".")) === 1 ? "oferta" : "ofertas"}`,
    subtotal: parseMoney(priceText),
    subtotalText: priceText,
    isOffer: unit !== "kg",
    components: []
  };
}

function parseAppPromosOrder(text = "") {
  const source = String(text || "").replace(/\r/g, "").trim();
  if (!source) throw new Error("Pegá primero el pedido recibido por WhatsApp.");
  if (!/\*?PEDIDO\*?/i.test(source) || !/TOTAL ESTIMADO/i.test(source)) {
    throw new Error("No reconocimos un pedido de AppPromos. Copiá el mensaje completo recibido por WhatsApp.");
  }

  const lines = source.split("\n");
  const result = {
    businessName: "",
    customerName: "",
    customerPhone: "",
    delivery: "",
    address: "",
    payment: "",
    totalEstimated: null,
    totalText: "",
    items: []
  };

  const greeting = lines.find((line) => /pedido en/i.test(line));
  const greetingMatch = greeting?.match(/pedido en\s+\*?(.+?)\*?:?\s*$/i);
  if (greetingMatch) result.businessName = cleanMarkdown(greetingMatch[1]).replace(/:$/, "").trim();

  let inItems = false;
  let currentOffer = null;

  for (const rawLine of lines) {
    const line = String(rawLine || "");
    const clean = cleanMarkdown(line);
    if (!clean) continue;

    if (/^PEDIDO$/i.test(clean)) {
      inItems = true;
      currentOffer = null;
      continue;
    }

    const totalMatch = clean.match(/^TOTAL ESTIMADO:\s*(.+)$/i);
    if (totalMatch) {
      result.totalText = totalMatch[1].trim();
      result.totalEstimated = parseMoney(totalMatch[1]);
      inItems = false;
      currentOffer = null;
      continue;
    }

    const fieldMatch = clean.match(/^(Cliente|Telefono|Teléfono|Entrega|Direccion|Dirección|Pago):\s*(.*)$/i);
    if (fieldMatch) {
      const field = fieldMatch[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const value = fieldMatch[2].trim();
      if (field === "cliente") result.customerName = value;
      if (field === "telefono") result.customerPhone = value;
      if (field === "entrega") result.delivery = value;
      if (field === "direccion") result.address = value;
      if (field === "pago") result.payment = value;
      continue;
    }

    if (!inItems) continue;
    const parsed = parseOrderLine(line);
    if (!parsed) continue;

    if (parsed.kind === "component") {
      if (currentOffer) currentOffer.components.push(parsed);
      continue;
    }

    result.items.push(parsed);
    currentOffer = parsed.isOffer ? parsed : null;
  }

  if (!result.items.length) throw new Error("Encontramos el pedido, pero no pudimos leer sus productos. Copiá el mensaje completo.");
  if (!result.customerName) throw new Error("No encontramos el nombre del cliente en el mensaje.");

  return result;
}

function setText(root, selector, value = "") {
  const node = root.querySelector(selector);
  if (node) node.textContent = String(value || "");
}

function renderTicket(root, order) {
  setText(root, "[data-print-business]", order.businessName || "PEDIDO APPPROMOS");
  setText(root, "[data-print-date]", new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date()));
  setText(root, "[data-print-customer]", order.customerName);
  setText(root, "[data-print-phone]", order.customerPhone || "—");
  setText(root, "[data-print-delivery]", order.delivery || "—");
  setText(root, "[data-print-payment]", order.payment || "—");

  const addressRow = root.querySelector("[data-print-address-row]");
  if (addressRow) {
    addressRow.hidden = !order.address;
    setText(addressRow, "[data-print-address]", order.address);
  }

  const itemsRoot = root.querySelector("[data-print-items]");
  if (itemsRoot) {
    itemsRoot.replaceChildren();
    order.items.forEach((item) => {
      const article = document.createElement("article");
      article.className = "print-order-item";

      const head = document.createElement("div");
      head.className = "print-order-item__head";

      const left = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.name || "Producto";
      left.appendChild(name);
      if (item.rubro) {
        const rubro = document.createElement("small");
        rubro.textContent = item.rubro;
        left.appendChild(rubro);
      }

      const price = document.createElement("strong");
      price.textContent = item.subtotal !== null ? money(item.subtotal) : item.subtotalText;
      head.append(left, price);
      article.appendChild(head);

      if (item.quantityLabel) {
        const qty = document.createElement("div");
        qty.className = "print-order-qty";
        qty.textContent = item.quantityLabel;
        article.appendChild(qty);
      }

      (item.components || []).forEach((component) => {
        const row = document.createElement("div");
        row.className = "print-order-component";
        row.textContent = component.name
          ? `- ${component.name} · ${component.quantity || ""} ${component.unit || ""}`.trim()
          : `- ${component.text || ""}`;
        article.appendChild(row);
      });

      itemsRoot.appendChild(article);
    });
  }

  setText(root, "[data-print-total]", order.totalEstimated !== null ? money(order.totalEstimated) : order.totalText);
  root.querySelector("[data-print-preview]")?.classList.add("is-ready");
}

export function renderPrintCenter(container, { businessMeta = {}, products = [], publicOffers = [], dailyOffers = [], publicWebUrl = "" } = {}) {
  if (!container) return;
  container.innerHTML = `
    <style>
      .print-center{max-width:980px;margin:0 auto;padding:18px 16px 120px;color:#172033}
      .print-center__head{margin-bottom:18px}.print-center__head h2{margin:0;color:#8f1717;font-size:clamp(25px,4vw,34px)}
      .print-center__head p{margin:7px 0 0;color:#64748b;font-weight:750;line-height:1.45}
      .print-center__tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:12px;margin-bottom:18px}
      .print-tool-card{display:block;width:100%;font:inherit;text-align:left;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.06);text-decoration:none;color:inherit;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
      .print-tool-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,23,42,.10);border-color:#fca5a5}.print-tool-card:focus-visible{outline:3px solid rgba(185,28,28,.22);outline-offset:2px}
      .print-tool-card.active{border-color:#fecaca;background:#fffafa}.print-tool-card h3{margin:0;font-size:18px;color:#1f2937}.print-tool-card p{margin:7px 0 0;color:#64748b;line-height:1.35;font-weight:700}
      .print-order-workspace,.price-list-workspace,.offer-poster-workspace,.qr-shop-workspace,.flyer-workspace{scroll-margin-top:22px}
      [data-print-tool-view]{display:none}
      .print-center.is-tool-open [data-print-hub]{display:none}
      .print-center.is-tool-open [data-print-tool-view].is-active{display:block}
      .print-center__back{display:inline-flex;align-items:center;gap:7px;margin:0 0 14px;border:1px solid #fecaca;border-radius:999px;background:#fff7f7;color:#991b1b;padding:9px 13px;font:inherit;font-size:13px;font-weight:900;cursor:pointer}
      .print-center__back:hover{background:#fee2e2}
      .print-center__back--bottom{margin:18px 0 0}

      .print-tool-card .badge{display:inline-flex;margin-top:10px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;background:#f1f5f9;color:#64748b}.print-tool-card.active .badge{background:#fee2e2;color:#991b1b}
      .print-order-workspace{border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
      .print-order-workspace h3{margin:0;color:#7f1d1d;font-size:22px}.print-order-workspace>p{color:#64748b;font-weight:750;line-height:1.4}
      .print-order-input{width:100%;min-height:220px;resize:vertical;border:1px solid #cbd5e1;border-radius:16px;padding:14px;font:700 14px/1.45 system-ui,sans-serif;color:#0f172a;background:#fff;box-sizing:border-box}
      .print-order-input:focus{outline:3px solid rgba(185,28,28,.12);border-color:#b91c1c}
      .print-order-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.print-order-actions button{min-height:46px;border:1px solid #e2e8f0;border-radius:14px;padding:0 16px;background:#fff;color:#334155;font-weight:950;cursor:pointer}.print-order-actions .primary{background:#b91c1c;border-color:#b91c1c;color:#fff}
      .print-order-error{min-height:20px;margin-top:9px;color:#b42318;font-weight:850;font-size:13px}
      .print-order-preview-wrap{display:none;margin-top:22px;padding-top:20px;border-top:1px solid #e2e8f0}.print-order-preview-wrap.is-ready{display:block}
      .print-order-preview-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.print-order-preview-title h4{margin:0;font-size:18px}.print-order-preview-title span{color:#64748b;font-size:12px;font-weight:800}
      .print-order-ticket{width:58mm;max-width:100%;margin:0 auto;background:#fff;color:#111;border:1px solid #d1d5db;padding:5mm 4mm;box-shadow:0 10px 30px rgba(15,23,42,.12);font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;overflow-wrap:anywhere}
      .print-ticket-center{text-align:center}.print-ticket-logo{display:none;max-width:44mm;max-height:24mm;width:auto;height:auto;object-fit:contain;margin:0 auto 3mm;filter:grayscale(1);}.print-ticket-logo.is-ready{display:block}.print-ticket-business{font-size:13px;font-weight:900}.print-ticket-title{font-size:15px;font-weight:950}.print-ticket-date{font-size:9px;margin-top:2px}.print-ticket-rule{border:0;border-top:1px dashed #111;margin:7px 0}.print-ticket-meta{display:grid;gap:2px}.print-ticket-meta strong{font-weight:950}.print-order-item{margin:0 0 8px}.print-order-item__head{display:flex;align-items:flex-start;justify-content:space-between;gap:7px}.print-order-item__head>div{min-width:0}.print-order-item__head strong{display:block;font-weight:950}.print-order-item__head>strong{text-align:right;white-space:nowrap}.print-order-item__head small{display:block;font-size:9px}.print-order-qty{font-size:10px}.print-order-component{padding-left:7px;font-size:9px;margin-top:2px}.print-ticket-total{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:950}.print-ticket-notice{font-size:8.5px;margin-top:7px}.print-ticket-checks{display:grid;gap:6px;font-size:11px;font-weight:900;margin:9px 0}.print-ticket-footer{text-align:center;font-size:8px}
      .price-list-workspace{margin-top:18px;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
      .price-list-workspace h3{margin:0;color:#7f1d1d;font-size:22px}.price-list-workspace>p{color:#64748b;font-weight:750;line-height:1.4}
      .price-list-models{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
      .price-list-model{border:2px solid #e2e8f0;border-radius:16px;background:#fff;padding:12px;text-align:left;cursor:pointer}
      .price-list-model strong{display:block;color:#172033}.price-list-model small{display:block;margin-top:4px;color:#64748b;font-weight:750}
      .price-list-model.is-selected{border-color:#b91c1c;background:#fff7f7;box-shadow:0 0 0 3px rgba(185,28,28,.08)}
      .price-list-qr-footer{display:flex;align-items:center;justify-content:center;gap:4mm;margin-top:3mm;padding-top:3mm;border-top:1px solid #d1d5db;flex:0 0 auto;min-height:25mm;box-sizing:border-box}
      .price-list-qr{width:20mm;height:20mm;object-fit:contain;background:#fff;border:1px solid #d1d5db;border-radius:2mm;padding:1.5mm;box-sizing:border-box}
      .price-list-qr-copy{max-width:72mm;font-size:9.5px;line-height:1.2;font-weight:800;color:#334155}.price-list-qr-copy strong{display:block;font-size:12.5px;color:#111;margin-bottom:1mm}
      .price-list-sheet.model-classic{border:3mm solid #b91c1c;padding:7mm 9mm 6mm}.price-list-sheet.model-classic .price-list-head{border-bottom-color:#b91c1c}.price-list-sheet.model-classic .price-list-title{color:#b91c1c;text-transform:uppercase}.price-list-sheet.model-classic .price-list-group h5{background:#b91c1c;color:#fff;border:0;padding:1.5mm 2mm}.price-list-sheet.model-classic .price-list-row{border-bottom:1px solid #fecaca}
      .price-list-sheet.model-app{padding:10mm 12mm 8mm}.price-list-sheet.model-app .price-list-title{color:#172033}.price-list-sheet.model-app .price-list-group h5{background:#f7f0e8;color:#7c2d12;border:0;border-radius:2mm;padding:1.5mm 2mm}.price-list-sheet.model-app .price-list-row{border-bottom:1px solid #e2e8f0}
      .price-list-sheet.model-commercial{border:3mm solid #b91c1c;padding:7mm 9mm 6mm}.price-list-sheet.model-commercial .price-list-title{background:#b91c1c;color:#fff;padding:2.5mm;border-radius:2mm;text-transform:uppercase}.price-list-sheet.model-commercial .price-list-group h5{background:#b91c1c;color:#fff;border:0;padding:1.5mm 2mm}.price-list-sheet.model-commercial .price-list-row strong:last-child{font-size:13px;color:#b91c1c}.price-list-sheet.model-commercial .price-list-qr-footer{border-top:2px solid #b91c1c}
      .price-list-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:end}.price-list-field{display:grid;gap:6px}.price-list-field label{font-size:12px;font-weight:950;color:#475569}.price-list-field select{min-height:46px;border:1px solid #cbd5e1;border-radius:14px;padding:0 12px;background:#fff;color:#0f172a;font-weight:850}.price-list-actions{display:flex;gap:10px;margin-top:14px}.price-list-actions button{min-height:46px;border:1px solid #e2e8f0;border-radius:14px;padding:0 16px;background:#fff;color:#334155;font-weight:950;cursor:pointer}.price-list-actions .primary{background:#b91c1c;border-color:#b91c1c;color:#fff}.price-list-error{min-height:20px;margin-top:8px;color:#b42318;font-weight:850;font-size:13px}
      .price-list-preview-wrap{display:none;margin-top:22px;padding-top:20px;border-top:1px solid #e2e8f0}.price-list-preview-wrap.is-ready{display:block}.price-list-preview-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.price-list-preview-title h4{margin:0;font-size:18px}.price-list-preview-title span{color:#64748b;font-size:12px;font-weight:800}
      .price-list-pages{display:grid;gap:18px}.price-list-sheet{width:210mm;height:297mm;max-width:100%;box-sizing:border-box;margin:0 auto;background:#fff;color:#111;border:1px solid #d1d5db;padding:10mm 12mm 9mm;box-shadow:0 10px 30px rgba(15,23,42,.12);font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;overflow:hidden}.price-list-head{text-align:center;border-bottom:2px solid #111;padding-bottom:4mm;margin-bottom:4mm;flex:0 0 auto}.price-list-logo{display:none;max-width:34mm;max-height:17mm;width:auto;height:auto;object-fit:contain;margin:0 auto 2mm}.price-list-logo.is-ready{display:block}.price-list-business{font-size:18px;font-weight:900}.price-list-title{font-size:24px;font-weight:950;letter-spacing:.02em;margin-top:1mm}.price-list-date{font-size:10px;margin-top:1mm;color:#444}.price-list-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10mm;min-height:0;flex:1}.price-list-column{min-width:0}.price-list-group{margin:0 0 4mm;break-inside:avoid}.price-list-group h5{margin:0 0 1.5mm;padding:0 0 1mm;border-bottom:2px solid #111;font-size:14px;text-transform:uppercase}.price-list-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4mm;align-items:end;padding:1mm 0;border-bottom:1px dotted #bbb;font-size:11px}.price-list-row strong:last-child{white-space:nowrap;font-size:11.5px}.price-list-footer{padding-top:2.5mm;border-top:1px solid #aaa;text-align:center;font-size:8px;color:#444;flex:0 0 auto}.price-list-page-number{font-weight:800;margin-left:3mm}.offer-list-card{border:1.5px solid #111;border-radius:4mm;padding:4mm;margin:0 0 4mm;break-inside:avoid;background:#fff}.offer-list-card__badge{display:inline-block;margin-bottom:2mm;padding:1mm 2mm;border:1px solid #111;border-radius:999px;font-size:8px;font-weight:900;text-transform:uppercase}.offer-list-card h5{margin:0 0 2.5mm;font-size:16px;line-height:1.15}.offer-list-items{display:grid;gap:1.3mm}.offer-list-item{font-size:10.5px;line-height:1.25}.offer-list-price{margin-top:3mm;padding-top:2.5mm;border-top:2px solid #111;text-align:right;font-size:22px;font-weight:950}.offer-list-empty{grid-column:1/-1;padding:12mm;text-align:center;border:1px dashed #aaa;font-weight:800;color:#555}.offer-section-title{grid-column:1/-1;margin:1mm 0 3mm;padding:2mm 0;border-bottom:3px solid #111;font-size:16px;font-weight:950;text-transform:uppercase}.offer-subtitle{margin:0 0 2mm;font-size:10px;font-weight:900;text-transform:uppercase;color:#333}.offer-list-card.is-large{padding:6mm;margin-bottom:6mm}.offer-list-card.is-large h5{font-size:20px}.offer-list-card.is-large .offer-list-item{font-size:12px}.offer-list-card.is-large .offer-list-price{font-size:28px}.offer-list-card.is-medium{padding:5mm;margin-bottom:5mm}.offer-list-card.is-medium h5{font-size:18px}.offer-list-card.is-medium .offer-list-price{font-size:25px}.offer-list-card.is-compact{padding:3mm;margin-bottom:3mm}.offer-list-card.is-compact h5{font-size:13px}.offer-list-card.is-compact .offer-list-item{font-size:9.5px}.offer-list-card.is-compact .offer-list-price{font-size:18px}.offer-list-page-body{display:flex;flex-direction:column;gap:4mm;min-height:0;flex:1}.offer-group-block{break-inside:avoid}.offer-group-block .offer-section-title{margin:0 0 3mm}.offer-group-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm 8mm;align-items:stretch}.offer-group-grid .offer-list-card{height:100%;box-sizing:border-box;margin:0;display:flex;flex-direction:column}.offer-group-grid .offer-list-items{flex:1}.offer-group-grid .offer-list-price{margin-top:auto}.offer-list-card.is-medium h5{font-size:19px}.offer-list-card.is-medium .offer-list-item{font-size:11px}.offer-list-card.is-medium .offer-list-price{font-size:27px}.offer-list-card.is-compact h5{font-size:14px}.offer-list-card.is-compact .offer-list-price{font-size:20px}.offer-list-unit-price{margin-top:1mm;text-align:right;font-size:11px;font-weight:850;color:#333}.offer-list-card.is-large .offer-list-unit-price{font-size:13px}.offer-list-card.is-medium .offer-list-unit-price{font-size:12px}.offer-list-card.is-compact .offer-list-unit-price{font-size:10px}
      .offer-poster-workspace{margin-top:18px;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
      .offer-poster-workspace h3{margin:0;color:#7f1d1d;font-size:22px}.offer-poster-workspace>p{color:#64748b;font-weight:750;line-height:1.4}
      .offer-poster-controls{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;align-items:end}.offer-poster-field{display:grid;gap:6px}.offer-poster-field label{font-size:12px;font-weight:950;color:#475569}.offer-poster-field select{min-height:46px;border:1px solid #cbd5e1;border-radius:14px;padding:0 12px;background:#fff;color:#0f172a;font-weight:850}
      .offer-poster-models{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.offer-poster-model{border:2px solid #e2e8f0;border-radius:16px;background:#fff;padding:12px;text-align:left;cursor:pointer}.offer-poster-model strong{display:block;color:#172033}.offer-poster-model small{display:block;margin-top:4px;color:#64748b;font-weight:750}.offer-poster-model.is-selected{border-color:#b91c1c;background:#fff7f7;box-shadow:0 0 0 3px rgba(185,28,28,.08)}
      .offer-poster-actions{display:flex;gap:10px;margin-top:14px}.offer-poster-actions button{min-height:46px;border:1px solid #e2e8f0;border-radius:14px;padding:0 16px;background:#fff;color:#334155;font-weight:950;cursor:pointer}.offer-poster-actions .primary{background:#b91c1c;border-color:#b91c1c;color:#fff}.offer-poster-error{min-height:20px;margin-top:8px;color:#b42318;font-weight:850;font-size:13px}.offer-poster-export-status{min-height:18px;margin-top:8px;color:#475569;font-size:12px;font-weight:800}
      .offer-poster-preview{display:none;margin-top:22px;padding-top:20px;border-top:1px solid #e2e8f0}.offer-poster-preview.is-ready{display:block}.offer-poster-preview-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.offer-poster-preview-head h4{margin:0;font-size:18px}.offer-poster-preview-head span{color:#64748b;font-size:12px;font-weight:800}
      .offer-poster-sheet{width:210mm;height:297mm;max-width:100%;box-sizing:border-box;margin:0 auto;background:#fff;color:#111;border:1px solid #d1d5db;padding:12mm;box-shadow:0 10px 30px rgba(15,23,42,.12);font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;overflow:hidden}
      .offer-poster-logo{display:none;max-width:78mm;max-height:38mm;width:auto;height:auto;object-fit:contain;margin:0 auto 2mm}.offer-poster-logo.is-ready{display:block}.offer-poster-business{text-align:center;font-size:24px;font-weight:950}.offer-poster-kicker{text-align:center;font-weight:950;text-transform:uppercase;letter-spacing:.06em}.offer-poster-title{text-align:center;font-weight:950;line-height:1.02}.offer-poster-items{display:grid;gap:2.5mm}.offer-poster-item{text-align:center;font-weight:850}.offer-poster-total{text-align:center;font-weight:1000;line-height:1}.offer-poster-unit{text-align:center;font-weight:900}.offer-poster-legend{text-align:center;font-weight:950;text-transform:uppercase}.offer-poster-footer{text-align:center;margin-top:auto;font-size:9px;font-weight:800}.offer-poster-qr-row{display:flex;align-items:center;justify-content:center;gap:5mm;margin-top:3mm}.offer-poster-qr{width:28mm;height:28mm;object-fit:contain;background:#fff;border:1px solid #d1d5db;border-radius:3mm;padding:2mm;box-sizing:border-box}.offer-poster-qr-copy{max-width:62mm;text-align:left;font-size:12px;line-height:1.15;font-weight:900}.offer-poster-qr-copy strong{display:block;font-size:15px;margin-bottom:1mm}
      .offer-poster-sheet.model-classic{border:4mm solid #b91c1c;padding:9mm}.model-classic .offer-poster-kicker{font-size:25px;color:#b91c1c;margin-top:2mm}.model-classic .offer-poster-title{font-size:42px;margin:2mm 0 3mm;text-transform:uppercase}.model-classic .offer-poster-items{border:2px solid #b91c1c;border-radius:6mm;padding:6mm;margin:0 4mm}.model-classic .offer-poster-item{font-size:19px}.model-classic .offer-poster-total{font-size:52px;background:#b91c1c;color:#fff;border-radius:5mm;padding:3mm;margin:3mm 0 1mm}.model-classic .offer-poster-unit{font-size:25px}.model-classic .offer-poster-legend{font-size:20px;color:#b91c1c;margin-top:5mm}
      .offer-poster-sheet.model-app{padding:14mm}.model-app .offer-poster-business{font-size:29px}.model-app .offer-poster-kicker{font-size:16px;color:#64748b;margin-top:3mm}.model-app .offer-poster-title{font-size:39px;background:#f7f0e8;border-radius:7mm;padding:5mm;margin:2mm 0 4mm}.model-app .offer-poster-item{font-size:19px}.model-app .offer-poster-total{font-size:54px;border-top:2px solid #cbd5e1;padding-top:4mm;margin-top:4mm}.model-app .offer-poster-unit{font-size:25px;background:#f1f5f9;border-radius:4mm;padding:2.5mm 5mm;margin:3mm auto 0}.model-app .offer-poster-legend{font-size:18px;margin-top:8mm;color:#475569}
      .offer-poster-sheet.model-window{border:4mm solid #b91c1c;padding:9mm}.model-window .offer-poster-kicker{font-size:40px;color:#b91c1c;margin:2mm 0 1mm}.model-window .offer-poster-title{font-size:37px;background:#fff;color:#111;padding:4mm;border:3px solid #b91c1c;border-radius:2mm;margin:0 0 3mm;text-transform:uppercase}.model-window .offer-poster-item{font-size:18px}.model-window .offer-poster-total{font-size:54px;background:#fde047;color:#b91c1c;border:3px solid #b91c1c;border-radius:50%;padding:5mm 4mm;margin:3mm 0 1mm}.model-window .offer-poster-unit{font-size:24px}.model-window .offer-poster-legend{font-size:25px;background:#b91c1c;color:#fff;padding:3mm;margin-top:6mm}
      @media(max-width:700px){.print-center{padding:14px 10px 110px}.print-center__tools{grid-template-columns:1fr}.print-order-workspace{padding:14px}.print-order-actions{display:grid;grid-template-columns:1fr}.print-order-actions button{width:100%}.print-order-preview-title{align-items:flex-start;flex-direction:column}.print-order-input{min-height:190px}}
      @media(max-width:700px){.offer-poster-controls,.offer-poster-models{grid-template-columns:1fr}.offer-poster-actions{display:grid}.offer-poster-actions button{width:100%}.offer-poster-sheet{height:auto;min-height:297mm}.model-classic .offer-poster-title,.model-app .offer-poster-title,.model-window .offer-poster-title{font-size:32px}.model-classic .offer-poster-total,.model-app .offer-poster-total,.model-window .offer-poster-total{font-size:44px}}\n      @media(max-width:700px){.price-list-models{grid-template-columns:1fr}}\n      @media(max-width:700px){.price-list-controls{grid-template-columns:1fr}.price-list-actions{display:grid}.price-list-actions button{width:100%}.price-list-sheet{padding:8mm 6mm;height:auto;min-height:297mm}.price-list-columns{grid-template-columns:1fr}.offer-group-grid{grid-template-columns:1fr}.price-list-title{font-size:22px}.price-list-business{font-size:17px}}
      @media print{
        html,body{margin:0!important;padding:0!important;width:58mm!important;min-width:58mm!important;background:#fff!important}
        body.print-ticket-only>*:not(.print-order-ticket--print-clone){display:none!important}
        .print-order-ticket--print-clone{display:block!important;position:static!important;box-sizing:border-box!important;width:58mm!important;max-width:58mm!important;margin:0!important;padding:4mm 3mm!important;border:0!important;box-shadow:none!important;background:#fff!important;color:#111!important;overflow:visible!important}
        body.print-price-list-only{width:210mm!important;min-width:210mm!important}
        body.print-price-list-only>*:not(.price-list-pages--print-clone){display:none!important}
        .price-list-pages--print-clone{display:block!important;margin:0!important;padding:0!important}
        .price-list-pages--print-clone .price-list-sheet{display:flex!important;box-sizing:border-box!important;width:210mm!important;max-width:210mm!important;height:297mm!important;margin:0!important;box-shadow:none!important;background:#fff!important;color:#111!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        .price-list-pages--print-clone .price-list-sheet:last-child{break-after:auto!important;page-break-after:auto!important}
        .price-list-pages--print-clone .price-list-columns{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0 10mm!important}
        body.print-offer-poster-only{width:210mm!important;min-width:210mm!important}
        body.print-offer-poster-only>*:not(.offer-poster-sheet--print-clone){display:none!important}
        .offer-poster-sheet--print-clone{display:flex!important;box-sizing:border-box!important;width:194mm!important;max-width:194mm!important;height:280mm!important;min-height:280mm!important;margin:8mm auto 0!important;box-shadow:none!important;background:#fff!important;overflow:hidden!important;break-inside:avoid!important;page-break-inside:avoid!important;break-after:avoid!important;page-break-after:avoid!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

      }
          .qr-shop-workspace{margin-top:18px;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
      .qr-shop-workspace h3{margin:0;color:#7f1d1d;font-size:22px}.qr-shop-workspace>p{color:#64748b;font-weight:750;line-height:1.4}
      .qr-shop-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.qr-shop-actions button{border:1px solid #dbe3ee;border-radius:14px;background:#fff;padding:11px 16px;font-weight:900;color:#172033;cursor:pointer}.qr-shop-actions button.primary{background:#b91c1c;border-color:#b91c1c;color:#fff}
      .qr-shop-preview{display:none;margin-top:16px}.qr-shop-preview.is-ready{display:block}.qr-shop-card{width:min(100%,560px);aspect-ratio:794/1123;margin:0 auto;border:10px solid #b91c1c;background:#fff;box-sizing:border-box;padding:34px 28px;display:flex;flex-direction:column;align-items:center;text-align:center;box-shadow:0 16px 34px rgba(15,23,42,.10)}
      .qr-shop-card h4{font-size:30px;margin:10px 0;color:#111}.qr-shop-kicker{font-size:26px;font-weight:1000;color:#b91c1c;margin-top:16px}.qr-shop-copy{font-size:17px;font-weight:850;color:#334155;line-height:1.35}.qr-shop-code{width:250px;height:250px;object-fit:contain;margin:24px 0 16px}.qr-shop-whatsapp{font-size:15px;font-weight:850;color:#111;margin-top:10px}.qr-shop-brand{margin-top:auto;font-size:10px;font-weight:850;color:#111}.qr-shop-status{min-height:18px;margin-top:8px;color:#475569;font-size:12px;font-weight:800}

      .flyer-workspace{margin-top:18px;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
      .flyer-workspace h3{margin:0;color:#7f1d1d;font-size:22px}.flyer-workspace>p{color:#64748b;font-weight:750;line-height:1.4}
      .flyer-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-top:14px}.flyer-controls label{display:grid;gap:6px;font-size:12px;font-weight:900;color:#334155}.flyer-controls select{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;background:#fff;color:#172033;font-weight:800}
      .flyer-actions{display:flex;gap:10px;flex-wrap:wrap}.flyer-actions button{border:1px solid #dbe3ee;border-radius:14px;background:#fff;padding:11px 16px;font-weight:900;color:#172033;cursor:pointer}.flyer-actions button.primary{background:#b91c1c;border-color:#b91c1c;color:#fff}
      .flyer-error{min-height:20px;margin-top:8px;color:#b42318;font-weight:850;font-size:13px}.flyer-preview{display:none;margin-top:16px}.flyer-preview.is-ready{display:block}
      .flyer-a4{width:min(100%,794px);aspect-ratio:794/1123;margin:0 auto;background:#fff;border:1px solid #dbe3ee;box-shadow:0 14px 34px rgba(15,23,42,.10);padding:18px;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:10px}
      .flyer-card{min-width:0;min-height:0;border:3px dashed #cbd5e1;padding:10px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden;background:#fff}
      .flyer-card__business{font-size:12px;font-weight:1000;color:#111;line-height:1.05}.flyer-card__badge{margin-top:5px;background:#b91c1c;color:#fff;border-radius:999px;padding:3px 10px;font-size:9px;font-weight:1000;letter-spacing:.04em}.flyer-card__title{margin-top:6px;font-size:16px;font-weight:1000;color:#111;line-height:1.05;text-transform:uppercase}.flyer-card__items{margin-top:5px;font-size:9px;font-weight:800;color:#334155;line-height:1.2}.flyer-card__price{margin-top:6px;font-size:25px;font-weight:1000;color:#b91c1c;line-height:1}.flyer-card__kg{margin-top:3px;font-size:10px;font-weight:900;color:#111}.flyer-card__bottom{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;width:100%}.flyer-card__qr{width:56px;height:56px;object-fit:contain}.flyer-card__cta{font-size:8px;font-weight:900;color:#111;line-height:1.2;text-align:left}.flyer-card__stock{margin-top:4px;font-size:7px;font-weight:900;color:#b91c1c}.flyer-card__brand{font-size:6px;font-weight:800;color:#64748b;margin-top:2px}
      @media(max-width:720px){.flyer-controls{grid-template-columns:1fr}}

      .flyer-format{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;background:#fff;color:#172033;font-weight:800}
      .flyer-offer-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.flyer-offer-slot{display:none}.flyer-offer-slot.is-visible{display:grid;gap:6px;font-size:12px;font-weight:900;color:#334155}.flyer-offer-slot select{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0 10px;background:#fff;font-weight:800}
      .flyer-card__identity{margin-top:3px;font-size:6.5px;font-weight:800;color:#475569;line-height:1.15;max-width:100%}.flyer-card__identity span{display:block}
      @media(max-width:720px){.flyer-offer-slots{grid-template-columns:1fr}}
</style>
    <div class="print-center">
      <header class="print-center__head">
        <h2>🖨️ Centro de Impresiones</h2>
        <p>Convertí la información que ya tenés en AppPromos en piezas listas para usar en el negocio.</p>
      </header>

      <nav class="print-center__tools" data-print-hub aria-label="Herramientas del Centro de Impresiones">
        <button type="button" class="print-tool-card active" data-print-view="order"><h3>🧾 Imprimir pedido</h3><p>Pegá un pedido recibido por WhatsApp y generá una comanda interna.</p></button>
        <button type="button" class="print-tool-card active" data-print-view="lists"><h3>📋 Listas para imprimir</h3><p>Prepará listas A4 de productos por rubro u ofertas publicadas.</p></button>
        <button type="button" class="print-tool-card active" data-print-view="poster"><h3>🏷️ Cartel de oferta</h3><p>Elegí una promo publicada y generá un cartel A4 para el local.</p></button>
        <button type="button" class="print-tool-card active" data-print-view="qr"><h3>📱 QR de mi carnicería</h3><p>Generá el QR de tu vidriera online para imprimir o compartir.</p></button>
        <button type="button" class="print-tool-card active" data-print-view="flyers"><h3>✂️ Folletos</h3><p>Armá una hoja A4 con ocho folletos, iguales o con varias promos.</p></button>
      </nav>

      <section class="print-order-workspace" data-print-tool-view="order" id="print-order-section">
        <button type="button" class="print-center__back" data-print-back>← Volver al Centro de Impresiones</button>
        <h3>Imprimir pedido</h3>
        <p>Copiá el mensaje completo que recibiste por WhatsApp, pegalo acá y AppPromos lo convierte en una comanda.</p>
        <textarea class="print-order-input" data-print-order-input placeholder="Pegá acá el pedido recibido por WhatsApp…" spellcheck="false"></textarea>
        <div class="print-order-actions">
          <button type="button" data-print-paste>Pegar pedido</button>
          <button type="button" class="primary" data-print-generate>Generar comanda</button>
          <button type="button" data-print-clear>Limpiar</button>
        </div>
        <div class="print-order-error" data-print-error role="status"></div>

        <div class="print-order-preview-wrap" data-print-preview>
          <div class="print-order-preview-title"><h4>Vista previa</h4><span>Formato inicial: ticket 58 mm</span></div>
          <div class="print-order-ticket" aria-label="Pedido interno listo para imprimir">
            <header class="print-ticket-center">
              <img class="print-ticket-logo" data-print-logo alt="Logo del comercio">
              <div class="print-ticket-business" data-print-business></div>
              <div class="print-ticket-title">PEDIDO INTERNO</div>
              <div class="print-ticket-date" data-print-date></div>
            </header>
            <hr class="print-ticket-rule">
            <div class="print-ticket-meta">
              <div><strong>CLIENTE:</strong> <span data-print-customer></span></div>
              <div><strong>TELÉFONO:</strong> <span data-print-phone></span></div>
              <div><strong>ENTREGA:</strong> <span data-print-delivery></span></div>
              <div data-print-address-row><strong>DIRECCIÓN:</strong> <span data-print-address></span></div>
              <div><strong>PAGO:</strong> <span data-print-payment></span></div>
            </div>
            <hr class="print-ticket-rule">
            <div data-print-items></div>
            <hr class="print-ticket-rule">
            <div class="print-ticket-total"><span>TOTAL ESTIMADO</span><span data-print-total></span></div>
            <div class="print-ticket-notice">El total puede variar en productos vendidos por peso según el pesaje final.</div>
            <hr class="print-ticket-rule">
            <div class="print-ticket-checks"><div>☐ PREPARADO</div><div>☐ CONTROLADO</div><div>☐ ENTREGADO</div></div>
            <hr class="print-ticket-rule">
            <div class="print-ticket-footer">Generado con AppPromos</div>
          </div>
          <div class="print-order-actions">
            <button type="button" class="primary" data-print-now>🖨️ Imprimir</button>
          </div>
        </div>
      </section>

      <section class="price-list-workspace" data-print-tool-view="lists" id="print-lists-section">
        <button type="button" class="print-center__back" data-print-back>← Volver al Centro de Impresiones</button>
        <h3>Listas para imprimir</h3>
        <p>Elegí entre tus productos por rubro o las ofertas que hoy están publicadas en tu web.</p>
        <div class="price-list-controls">
          <div class="price-list-field"><label for="printListType">Qué querés imprimir</label><select id="printListType" data-price-list-type><option value="products">Productos por rubro</option><option value="offers">Ofertas publicadas</option></select></div>
          <div class="price-list-field" data-price-scope-field><label for="printPriceScope">Productos a incluir</label><select id="printPriceScope" data-price-scope><option value="all">Todos los rubros</option></select></div>
          <div class="price-list-field" data-offer-weight-field style="display:none"><label for="printOfferWeight">Peso de la oferta</label><select id="printOfferWeight" data-offer-weight><option value="all">Todos los pesos</option><option value="2">2 kg</option><option value="3">3 kg</option><option value="5">5 kg</option><option value="10">10 kg</option><option value="other">Otros</option></select></div>
          <div class="price-list-field" data-offer-category-field style="display:none"><label for="printOfferCategory">Composición</label><select id="printOfferCategory" data-offer-category><option value="all">Todas</option><option value="Cerdo">Cerdo</option><option value="Novillo">Novillo</option><option value="Pollo">Pollo</option><option value="Mixtas">Mixtas</option><option value="Otras">Otras</option></select></div>
          <div class="price-list-field"><label>Formato</label><select disabled><option>A4 vertical · 2 columnas</option></select></div>
        </div>
        <div class="price-list-models" data-price-list-models>
          <button type="button" class="price-list-model is-selected" data-price-list-model="classic"><strong>Modelo 1 · Clásico</strong><small>Alto contraste y lectura rápida.</small></button>
          <button type="button" class="price-list-model" data-price-list-model="app"><strong>Modelo 2 · AppPromos</strong><small>Limpio, moderno e institucional.</small></button>
          <button type="button" class="price-list-model" data-price-list-model="commercial"><strong>Modelo 3 · Comercial</strong><small>Más impacto para mostrador o vidriera.</small></button>
        </div>
        <div class="price-list-actions"><button type="button" class="primary" data-price-generate>Generar lista</button></div>
        <div class="price-list-error" data-price-error role="status"></div>
        <div class="price-list-preview-wrap" data-price-preview>
          <div class="price-list-preview-title"><h4>Vista previa</h4><span data-price-preview-label>A4 vertical · 2 columnas</span></div>
          <div class="price-list-pages" data-price-pages aria-label="Lista de precios lista para imprimir"></div>
          <div class="price-list-actions"><button type="button" class="primary" data-price-print>🖨️ Imprimir</button></div>
        </div>
      </section>

      <section class="offer-poster-workspace" data-print-tool-view="poster" id="print-poster-section">
        <button type="button" class="print-center__back" data-print-back>← Volver al Centro de Impresiones</button>
        <h3>Cartel de oferta</h3>
        <p>Elegí una oferta publicada, seleccioná uno de los tres diseños y generá un cartel A4 listo para imprimir.</p>
        <div class="offer-poster-controls">
          <div class="offer-poster-field"><label for="printPosterOffer">Oferta publicada</label><select id="printPosterOffer" data-poster-offer></select></div>
          <div class="offer-poster-field"><label>Formato</label><select disabled><option>A4 vertical · 1 cartel</option></select></div>
        </div>
        <div class="offer-poster-models" data-poster-models>
          <button type="button" class="offer-poster-model is-selected" data-poster-model="classic"><strong>Modelo 1 · Clásico</strong><small>Directo, alto contraste y precio protagonista.</small></button>
          <button type="button" class="offer-poster-model" data-poster-model="app"><strong>Modelo 2 · AppPromos</strong><small>Limpio, moderno y equilibrado.</small></button>
          <button type="button" class="offer-poster-model" data-poster-model="window"><strong>Modelo 3 · Vidriera</strong><small>Más impacto visual para destacar la oferta.</small></button>
        </div>
        <div class="offer-poster-actions"><button type="button" class="primary" data-poster-generate>Generar cartel</button></div>
        <div class="offer-poster-error" data-poster-error role="status"></div>
        <div class="offer-poster-preview" data-poster-preview>
          <div class="offer-poster-preview-head"><h4>Vista previa</h4><span>A4 vertical · 1 cartel</span></div>
          <div data-poster-sheet-root></div>
          <div class="offer-poster-actions">
            <button type="button" class="primary" data-poster-print>🖨️ Imprimir</button>
            <button type="button" data-poster-png>🖼️ Guardar PNG</button>
            <button type="button" data-poster-share>📲 Compartir imagen</button>
          </div>
          <div class="offer-poster-export-status" data-poster-export-status role="status"></div>
        </div>
      </section>

      <section class="qr-shop-workspace" data-print-tool-view="qr" id="print-qr-section">
        <button type="button" class="print-center__back" data-print-back>← Volver al Centro de Impresiones</button>
        <h3>QR de mi carnicería</h3>
        <p>Generá una pieza para el mostrador, la vidriera o para compartir por WhatsApp.</p>
        <div class="qr-shop-actions"><button type="button" class="primary" data-qr-shop-generate>Generar QR</button></div>
        <div class="qr-shop-preview" data-qr-shop-preview>
          <div class="qr-shop-card">
            <h4 data-qr-shop-name></h4>
            <div class="qr-shop-kicker">Visitá nuestra vidriera online</div>
            <img class="qr-shop-code" data-qr-shop-code alt="QR de la carnicería">
            <div class="qr-shop-copy">Consultá ofertas diarias, promos y precios.</div>
            <div class="qr-shop-whatsapp">Elegí tus productos y mandá tu pedido por WhatsApp.</div>
            <div class="qr-shop-brand">Generado con AppPromos</div>
          </div>
          <div class="qr-shop-actions">
            <button type="button" class="primary" data-qr-shop-print>🖨️ Imprimir</button>
            <button type="button" data-qr-shop-png>🖼️ Guardar PNG</button>
            <button type="button" data-qr-shop-share>📲 Compartir imagen</button>
          </div>
          <div class="qr-shop-status" data-qr-shop-status role="status"></div>
        </div>
      </section>

      <section class="flyer-workspace" data-print-tool-view="flyers" id="print-flyers-section">
        <button type="button" class="print-center__back" data-print-back>← Volver al Centro de Impresiones</button>
        <h3>Folletos · 8 por hoja A4</h3>
        <p>Elegí una oferta publicada. AppPromos genera 8 folletos iguales listos para imprimir, cortar y entregar.</p>
        <div class="flyer-controls">
          <label>Formato de hoja
            <select class="flyer-format" data-flyer-format>
              <option value="8">8 iguales · 1 promo</option>
              <option value="4x2">4 + 4 · 2 promos</option>
              <option value="2x4">2 + 2 + 2 + 2 · 4 promos</option>
            </select>
          </label>
          <div class="flyer-actions">
            <button type="button" class="primary" data-flyer-generate>Generar hoja</button>
          </div>
        </div>
        <div class="flyer-offer-slots" data-flyer-offer-slots>
          <label class="flyer-offer-slot is-visible" data-flyer-slot="0">Promo 1<select data-flyer-offer="0"></select></label>
          <label class="flyer-offer-slot" data-flyer-slot="1">Promo 2<select data-flyer-offer="1"></select></label>
          <label class="flyer-offer-slot" data-flyer-slot="2">Promo 3<select data-flyer-offer="2"></select></label>
          <label class="flyer-offer-slot" data-flyer-slot="3">Promo 4<select data-flyer-offer="3"></select></label>
        </div>
        <div class="flyer-error" data-flyer-error role="alert"></div>
        <div class="flyer-preview" data-flyer-preview>
          <div class="flyer-a4" data-flyer-a4></div>
          <div class="flyer-actions" style="margin-top:14px">
            <button type="button" class="primary" data-flyer-print>🖨️ Imprimir 8 folletos</button>
          </div>
        </div>
      </section>
    </div>
  `;

  const printCenterRoot = container.querySelector(".print-center");

  const openPrintTool = (view, { autoGenerateQr = false } = {}) => {
    const cleanView = String(view || "").trim();
    const target = cleanView ? container.querySelector(`[data-print-tool-view="${cleanView}"]`) : null;
    if (!printCenterRoot || !target) return;

    container.querySelectorAll("[data-print-tool-view]").forEach((section) => {
      section.classList.toggle("is-active", section === target);
    });
    printCenterRoot.classList.add("is-tool-open");
    printCenterRoot.scrollIntoView({ behavior: "smooth", block: "start" });

    if (cleanView === "qr" && autoGenerateQr) {
      requestAnimationFrame(() => target.querySelector("[data-qr-shop-generate]")?.click());
    }
  };

  const closePrintTool = () => {
    if (!printCenterRoot) return;
    printCenterRoot.classList.remove("is-tool-open");
    container.querySelectorAll("[data-print-tool-view]").forEach((section) => section.classList.remove("is-active"));
    printCenterRoot.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  container.querySelectorAll("[data-print-view]").forEach((button) => {
    button.addEventListener("click", () => openPrintTool(button.dataset.printView));
  });

  container.querySelectorAll("[data-print-back]").forEach((button) => {
    button.addEventListener("click", closePrintTool);
  });

  // Entrada directa desde Inicio > Compartir con QR.
  if (globalThis.__APPPROMOS_PRINT_CENTER_OPEN_QR__ === true) {
    globalThis.__APPPROMOS_PRINT_CENTER_OPEN_QR__ = false;
    requestAnimationFrame(() => openPrintTool("qr", { autoGenerateQr: true }));
  }

  const logo = container.querySelector("[data-print-logo]");
  const logoUrl = String(businessMeta?.brand?.logoUrl || "").trim();
  if (logo && logoUrl) {
    logo.addEventListener("load", () => logo.classList.add("is-ready"), { once: true });
    logo.addEventListener("error", () => {
      logo.classList.remove("is-ready");
      logo.removeAttribute("src");
    }, { once: true });
    logo.src = logoUrl;
    if (logo.complete && logo.naturalWidth > 0) logo.classList.add("is-ready");
  }

  const input = container.querySelector("[data-print-order-input]");
  const error = container.querySelector("[data-print-error]");
  const preview = container.querySelector("[data-print-preview]");

  const showError = (message = "") => {
    if (error) error.textContent = String(message || "");
  };

  const generate = () => {
    showError("");
    try {
      const order = parseAppPromosOrder(input?.value || "");
      renderTicket(container, order);
      preview?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      preview?.classList.remove("is-ready");
      showError(err?.message || "No pudimos generar la comanda.");
    }
  };

  container.querySelector("[data-print-generate]")?.addEventListener("click", generate);
  container.querySelector("[data-print-clear]")?.addEventListener("click", () => {
    if (input) input.value = "";
    preview?.classList.remove("is-ready");
    showError("");
    input?.focus();
  });
  container.querySelector("[data-print-paste]")?.addEventListener("click", async () => {
    showError("");
    try {
      const value = await navigator.clipboard.readText();
      if (input) input.value = value;
      generate();
    } catch (_) {
      showError("El navegador no permitió pegar automáticamente. Mantené presionado en el cuadro y elegí Pegar.");
      input?.focus();
    }
  });
  container.querySelector("[data-print-now]")?.addEventListener("click", () => {
    const ticket = container.querySelector(".print-order-ticket");
    if (!ticket) return;

    const clone = ticket.cloneNode(true);
    clone.classList.add("print-order-ticket--print-clone");
    document.body.appendChild(clone);
    document.body.classList.add("print-ticket-only");
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@page{size:58mm auto;margin:0}";
    document.head.appendChild(pageStyle);

    try {
      window.print();
    } finally {
      document.body.classList.remove("print-ticket-only");
      pageStyle.remove();
      clone.remove();
    }
  });

  const pricedProducts = (Array.isArray(products) ? products : [])
    .filter((product) => {
      if (!product || product.active === false || product.activo === false) return false;
      const price = Number(product.precio ?? product.price ?? product.precioFinal ?? product.valor ?? 0);
      return Number.isFinite(price) && price > 0;
    })
    .map((product) => ({
      name: String(product.nombre ?? product.name ?? "Producto").trim() || "Producto",
      rubro: String(product.rubro ?? product.category ?? "Otros").trim() || "Otros",
      price: Number(product.precio ?? product.price ?? product.precioFinal ?? product.valor ?? 0)
    }));

  const listType = container.querySelector("[data-price-list-type]");
  const scope = container.querySelector("[data-price-scope]");
  const scopeField = container.querySelector("[data-price-scope-field]");
  const offerWeightField = container.querySelector("[data-offer-weight-field]");
  const offerCategoryField = container.querySelector("[data-offer-category-field]");
  const offerWeight = container.querySelector("[data-offer-weight]");
  const offerCategory = container.querySelector("[data-offer-category]");
  const previewLabel = container.querySelector("[data-price-preview-label]");
  const priceError = container.querySelector("[data-price-error]");
  const pricePreview = container.querySelector("[data-price-preview]");
  const rubros = [...new Set(pricedProducts.map((item) => item.rubro))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  rubros.forEach((rubro) => {
    const option = document.createElement("option");
    option.value = rubro;
    option.textContent = rubro;
    scope?.appendChild(option);
  });

  const createPriceGroup = (rubro, items) => {
    const section = document.createElement("section");
    section.className = "price-list-group";
    const title = document.createElement("h5");
    title.textContent = rubro;
    section.appendChild(title);
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "price-list-row";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const price = document.createElement("strong");
      price.textContent = money(item.price);
      row.append(name, price);
      section.appendChild(row);
    });
    return section;
  };

  const splitPriceGroups = (grouped) => {
    const blocks = [];
    [...grouped.keys()]
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .forEach((rubro) => {
        const items = grouped.get(rubro)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
        // Evita títulos de rubro huérfanos y permite cortar rubros largos entre columnas/páginas.
        const chunkSize = 18;
        for (let index = 0; index < items.length; index += chunkSize) {
          blocks.push({
            rubro,
            continued: index > 0,
            items: items.slice(index, index + chunkSize)
          });
        }
      });
    return blocks;
  };

  const priceListModels = container.querySelector("[data-price-list-models]");
  let priceListModel = "classic";
  priceListModels?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-price-list-model]");
    if (!button) return;
    priceListModel = button.dataset.priceListModel || "classic";
    priceListModels.querySelectorAll("[data-price-list-model]").forEach((item) => item.classList.toggle("is-selected", item === button));
    container.querySelector("[data-price-preview]")?.classList.remove("is-ready");
  });

  const buildPricePages = (grouped) => {
    const blocks = splitPriceGroups(grouped);
    const pages = [];

    // B3-FIX2: el QR conserva su franja protegida, pero el reparto deja de
    // tratar cada rubro/continuación como un bloque indivisible. Si un bloque
    // no entra completo, se divide por filas y continúa en la otra columna
    // o página. Así aprovechamos las dos columnas sin pisar QR/footer.
    const hasQrFooter = /^https:\/\/apppromos\.web\.app\//i.test(String(publicWebUrl || "").trim());
    const maxWeight = hasQrFooter ? 27.5 : 31;
    const headerWeight = 2.2;

    let page = { columns: [[], []], weights: [0, 0] };
    let columnIndex = 0;

    const pushPageIfNeeded = () => {
      if (page.columns[0].length || page.columns[1].length) pages.push(page);
      page = { columns: [[], []], weights: [0, 0] };
      columnIndex = 0;
    };

    blocks.forEach((sourceBlock) => {
      let remaining = Array.isArray(sourceBlock.items) ? [...sourceBlock.items] : [];
      let continued = Boolean(sourceBlock.continued);

      while (remaining.length) {
        let available = maxWeight - page.weights[columnIndex];

        if (available <= headerWeight) {
          if (columnIndex === 0) {
            columnIndex = 1;
          } else {
            pushPageIfNeeded();
          }
          available = maxWeight - page.weights[columnIndex];
        }

        const capacity = Math.max(0, Math.floor(available - headerWeight));
        if (capacity <= 0) {
          const other = columnIndex === 0 ? 1 : 0;
          const otherAvailable = maxWeight - page.weights[other];

          if (otherAvailable > headerWeight) {
            columnIndex = other;
          } else {
            pushPageIfNeeded();
          }
          continue;
        }

        const take = Math.min(capacity, remaining.length);
        const chunkItems = remaining.splice(0, take);
        page.columns[columnIndex].push({
          ...sourceBlock,
          items: chunkItems,
          continued
        });
        page.weights[columnIndex] += chunkItems.length + headerWeight;
        continued = true;

        if (remaining.length) {
          if (columnIndex === 0) {
            columnIndex = 1;
          } else {
            // B3-FIX3: antes de crear una hoja nueva, volver a revisar ambas
            // columnas de la página actual. Puede quedar capacidad útil en la
            // primera columna aunque la segunda haya llegado a su límite.
            const firstAvailable = maxWeight - page.weights[0];
            const secondAvailable = maxWeight - page.weights[1];

            if (firstAvailable > headerWeight) {
              columnIndex = 0;
            } else if (secondAvailable > headerWeight) {
              columnIndex = 1;
            } else {
              pushPageIfNeeded();
            }
          }
        }
      }
    });

    if (page.columns[0].length || page.columns[1].length) pages.push(page);
    return pages;
  };

  const attachPriceLogo = (img) => {
    if (!img || !logoUrl) return;
    img.addEventListener("load", () => img.classList.add("is-ready"), { once: true });
    img.addEventListener("error", () => {
      img.classList.remove("is-ready");
      img.removeAttribute("src");
    }, { once: true });
    img.src = logoUrl;
    if (img.complete && img.naturalWidth > 0) img.classList.add("is-ready");
  };

  const createSheetBase = (titleText, pageIndex, pageCount) => {
    const sheet = document.createElement("section");
    sheet.className = `price-list-sheet model-${priceListModel}`;

    const head = document.createElement("header");
    head.className = "price-list-head";
    const img = document.createElement("img");
    img.className = "price-list-logo";
    img.alt = "Logo del comercio";
    attachPriceLogo(img);
    const business = document.createElement("div");
    business.className = "price-list-business";
    business.textContent = businessMeta?.name || businessMeta?.nombre || "Mi comercio";
    const title = document.createElement("div");
    title.className = "price-list-title";
    title.textContent = titleText;
    const date = document.createElement("div");
    date.className = "price-list-date";
    date.textContent = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(new Date());
    head.append(img, business, title, date);

    const footer = document.createElement("footer");
    footer.className = "price-list-footer";
    footer.append(document.createTextNode("Generado con AppPromos"));
    const pageNumber = document.createElement("span");
    pageNumber.className = "price-list-page-number";
    pageNumber.textContent = `Página ${pageIndex + 1} de ${pageCount}`;
    footer.appendChild(pageNumber);

    return { sheet, head, footer };
  };

  const createPriceListQrFooter = () => {
    const safeUrl = String(publicWebUrl || "").trim();
    if (!/^https:\/\/apppromos\.web\.app\//i.test(safeUrl)) return null;
    const qrFooter = document.createElement("div");
    qrFooter.className = "price-list-qr-footer";
    const qr = document.createElement("img");
    qr.className = "price-list-qr";
    qr.alt = "QR para abrir la carnicería online";
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(safeUrl)}`;
    const copy = document.createElement("div");
    copy.className = "price-list-qr-copy";
    const title = document.createElement("strong");
    title.textContent = "Escaneá y comprá online";
    const hint = document.createElement("span");
    hint.textContent = "Consultá ofertas diarias, promos y precios en nuestra vidriera online.";
    copy.append(title, hint);
    qrFooter.append(qr, copy);
    return qrFooter;
  };

  const renderPricePages = (grouped) => {
    const pagesRoot = container.querySelector("[data-price-pages]");
    pagesRoot?.replaceChildren();
    const pages = buildPricePages(grouped);

    pages.forEach((page, pageIndex) => {
      const { sheet, head, footer } = createSheetBase("LISTA DE PRECIOS", pageIndex, pages.length);
      const columns = document.createElement("div");
      columns.className = "price-list-columns";

      page.columns.forEach((blocks) => {
        const column = document.createElement("div");
        column.className = "price-list-column";
        blocks.forEach((block) => {
          const label = block.continued ? `${block.rubro} · continuación` : block.rubro;
          column.appendChild(createPriceGroup(label, block.items));
        });
        columns.appendChild(column);
      });

      footer.firstChild.textContent = "Precios sujetos a modificación · Generado con AppPromos";
      sheet.append(head, columns);
      const qrFooter = createPriceListQrFooter();
      if (qrFooter) sheet.appendChild(qrFooter);
      sheet.appendChild(footer);
      pagesRoot?.appendChild(sheet);
    });
  };

  const normalizeKey = (value = "") => String(value || "").trim().toLocaleLowerCase("es");
  const productRubros = new Map(
    (Array.isArray(products) ? products : []).map((product = {}) => [
      normalizeKey(product.nombre ?? product.name),
      String(product.rubro ?? product.category ?? "").trim()
    ])
  );

  const meatCategory = (rubro = "", name = "") => {
    const value = normalizeKey(`${rubro} ${name}`);
    if (value.includes("cerdo")) return "Cerdo";
    if (value.includes("pollo") || value.includes("ave")) return "Pollo";
    if (value.includes("novillo") || value.includes("ternera") || value.includes("vaca")) return "Novillo";
    return "";
  };

  const enrichOffer = (offer = {}, kind = "published") => {
    const items = Array.isArray(offer.items) ? offer.items : [];
    let kg = 0;
    const categories = new Set();
    items.forEach((item = {}) => {
      const qty = Number(item.cantidad ?? item.qty ?? 0);
      const unit = normalizeKey(item.unidad ?? item.unit ?? "kg");
      if (Number.isFinite(qty) && (unit === "kg" || unit === "kgs" || unit.includes("kilo"))) kg += qty;
      const name = String(item.nombre ?? item.name ?? "").trim();
      const rubro = String(item.rubro ?? item.category ?? productRubros.get(normalizeKey(name)) ?? "").trim();
      const category = meatCategory(rubro, name);
      if (category) categories.add(category);
    });
    const roundedKg = Math.round(kg * 100) / 100;
    const weightGroup = [2, 3, 5, 10].find((value) => Math.abs(roundedKg - value) < 0.01);
    const category = categories.size > 1 ? "Mixtas" : (categories.values().next().value || "Otras");
    return { ...offer, kind, offerKg: roundedKg, weightGroup: weightGroup ? String(weightGroup) : "other", offerCategory: category };
  };

  const printableOffers = [
    ...(Array.isArray(publicOffers) ? publicOffers : []).map((offer) => enrichOffer(offer, "published")),
    ...(Array.isArray(dailyOffers) ? dailyOffers : []).map((offer) => enrichOffer(offer, "daily"))
  ].filter((offer = {}) => {
    const total = Number(offer.total || 0);
    return String(offer.name || "").trim() && Number.isFinite(total) && total > 0 && Array.isArray(offer.items) && offer.items.length;
  });

  const posterOfferSelect = container.querySelector("[data-poster-offer]");
  const posterModels = container.querySelector("[data-poster-models]");
  const posterPreview = container.querySelector("[data-poster-preview]");
  const posterError = container.querySelector("[data-poster-error]");
  const posterSheetRoot = container.querySelector("[data-poster-sheet-root]");
  let posterModel = "classic";

  const posterOfferLabel = (offer = {}) => {
    const kg = Number(offer.offerKg || 0);
    const kgText = kg > 0 ? `${String(kg).replace(".", ",")} kg · ` : "";
    return `${kgText}${offer.name || "Oferta"} · ${money(Number(offer.total || 0))}`;
  };

  if (posterOfferSelect) {
    posterOfferSelect.replaceChildren();
    if (!printableOffers.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay ofertas publicadas";
      posterOfferSelect.appendChild(option);
      posterOfferSelect.disabled = true;
    } else {
      printableOffers.forEach((offer, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = posterOfferLabel(offer);
        posterOfferSelect.appendChild(option);
      });
    }
  }

  posterModels?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-poster-model]");
    if (!button) return;
    posterModel = button.dataset.posterModel || "classic";
    posterModels.querySelectorAll("[data-poster-model]").forEach((item) => item.classList.toggle("is-selected", item === button));
    posterPreview?.classList.remove("is-ready");
  });

  const buildPosterSheet = (offer) => {
    const sheet = document.createElement("article");
    sheet.className = `offer-poster-sheet model-${posterModel}`;

    const posterLogo = document.createElement("img");
    posterLogo.className = "offer-poster-logo";
    posterLogo.alt = "Logo del comercio";
    if (logoUrl) {
      posterLogo.addEventListener("load", () => posterLogo.classList.add("is-ready"), { once: true });
      posterLogo.src = logoUrl;
      if (posterLogo.complete && posterLogo.naturalWidth > 0) posterLogo.classList.add("is-ready");
    }

    const business = document.createElement("div");
    business.className = "offer-poster-business";
    business.textContent = String(businessMeta?.name || businessMeta?.nombre || "Mi comercio").trim();

    const kicker = document.createElement("div");
    kicker.className = "offer-poster-kicker";
    kicker.textContent = posterModel === "window" ? "¡OFERTA!" : (offer.kind === "daily" ? "PROMO DEL DÍA" : "OFERTA");

    const title = document.createElement("div");
    title.className = "offer-poster-title";
    title.textContent = offer.name || "Oferta";

    const items = document.createElement("div");
    items.className = "offer-poster-items";
    (offer.items || []).forEach((item = {}) => {
      const row = document.createElement("div");
      row.className = "offer-poster-item";
      const qty = Number(item.cantidad ?? item.qty ?? 1);
      const unit = String(item.unidad ?? item.unit ?? "kg").trim() || "kg";
      const name = String(item.nombre ?? item.name ?? "Producto").trim();
      row.textContent = `${String(qty).replace(".", ",")} ${unit} ${name}`;
      items.appendChild(row);
    });

    const total = document.createElement("div");
    total.className = "offer-poster-total";
    total.textContent = money(Number(offer.total || 0));

    const unit = document.createElement("div");
    unit.className = "offer-poster-unit";
    const totalKg = Number(offer.offerKg || 0);
    const totalPrice = Number(offer.total || 0);
    unit.textContent = totalKg > 0 && totalPrice > 0 ? `${money(totalPrice / totalKg)}/kg` : "";

    const qrRow = document.createElement("div");
    qrRow.className = "offer-poster-qr-row";
    const safePublicWebUrl = String(publicWebUrl || "").trim();
    const isCanonicalProductionUrl = /^https:\/\/apppromos\.web\.app\//i.test(safePublicWebUrl);
    if (safePublicWebUrl && isCanonicalProductionUrl) {
      const qr = document.createElement("img");
      qr.className = "offer-poster-qr";
      qr.alt = "QR para abrir la carnicería online";
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(safePublicWebUrl)}`;
      const qrCopy = document.createElement("div");
      qrCopy.className = "offer-poster-qr-copy";
      const qrTitle = document.createElement("strong");
      qrTitle.textContent = "Escaneá y mirá nuestra carnicería online";
      const qrHint = document.createElement("span");
      qrHint.textContent = "Elegí productos, armá tu pedido y mandalo por WhatsApp.";
      qrCopy.append(qrTitle, qrHint);
      qrRow.append(qr, qrCopy);
    }

    const legend = document.createElement("div");
    legend.className = "offer-poster-legend";
    legend.textContent = "Hasta agotar stock";

    const footer = document.createElement("div");
    footer.className = "offer-poster-footer";
    footer.textContent = "Generado con AppPromos";

    sheet.append(posterLogo, business, kicker, title, items, total);
    if (unit.textContent) sheet.appendChild(unit);
    if (qrRow.childElementCount) sheet.appendChild(qrRow);
    sheet.append(legend, footer);
    return sheet;
  };

  const generatePoster = () => {
    if (posterError) posterError.textContent = "";
    if (!printableOffers.length || !posterOfferSelect?.value) {
      // value "0" is valid.
      if (!printableOffers.length) {
        posterPreview?.classList.remove("is-ready");
        if (posterError) posterError.textContent = "No hay ofertas publicadas para generar un cartel.";
        return;
      }
    }
    const index = Number(posterOfferSelect?.value || 0);
    const offer = printableOffers[index];
    if (!offer) {
      posterPreview?.classList.remove("is-ready");
      if (posterError) posterError.textContent = "Elegí una oferta publicada.";
      return;
    }
    posterSheetRoot?.replaceChildren(buildPosterSheet(offer));
    posterPreview?.classList.add("is-ready");
    posterPreview?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  container.querySelector("[data-poster-generate]")?.addEventListener("click", generatePoster);
  posterOfferSelect?.addEventListener("change", () => posterPreview?.classList.remove("is-ready"));

  const posterExportStatus = container.querySelector("[data-poster-export-status]");
  const setPosterExportStatus = (message = "") => {
    if (posterExportStatus) posterExportStatus.textContent = String(message || "");
  };

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });

  let qrCodeLibraryPromise = null;

  const ensureQrCodeLibrary = () => {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (qrCodeLibraryPromise) return qrCodeLibraryPromise;

    qrCodeLibraryPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-apppromos-qrcodejs="1"]');
      if (existing) {
        existing.addEventListener("load", () => window.QRCode ? resolve(window.QRCode) : reject(new Error("No se pudo iniciar el generador de QR.")), { once: true });
        existing.addEventListener("error", () => reject(new Error("No se pudo cargar el generador de QR.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.async = true;
      script.dataset.apppromosQrcodejs = "1";
      script.onload = () => window.QRCode ? resolve(window.QRCode) : reject(new Error("No se pudo iniciar el generador de QR."));
      script.onerror = () => reject(new Error("No se pudo cargar el generador de QR. Revisá la conexión e intentá nuevamente."));
      document.head.appendChild(script);
    });

    return qrCodeLibraryPromise;
  };

  const createLocalQrDataUrl = async (value, size = 320) => {
    const QRCodeCtor = await ensureQrCodeLibrary();
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "0";
    document.body.appendChild(holder);

    try {
      new QRCodeCtor(holder, {
        text: value,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCodeCtor.CorrectLevel.H
      });

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = holder.querySelector("canvas");
      if (canvas) return canvas.toDataURL("image/png");

      const generatedImage = holder.querySelector("img");
      if (generatedImage?.src?.startsWith("data:")) return generatedImage.src;

      throw new Error("No se pudo generar el QR para la imagen.");
    } finally {
      holder.remove();
    }
  };

  const inlinePosterImages = async (root) => {
    const images = Array.from(root.querySelectorAll("img"));

    await Promise.all(images.map(async (img) => {
      // C2-FIX2: el QR del PNG se genera dentro del navegador. Nunca se
      // rasteriza la imagen remota de qrserver, evitando canvas contaminado.
      if (img.classList.contains("offer-poster-qr")) {
        const safeUrl = String(publicWebUrl || "").trim();
        if (!/^https:\/\/apppromos\.web\.app\//i.test(safeUrl)) {
          throw new Error("No encontramos una URL pública válida para generar el QR.");
        }
        img.src = await createLocalQrDataUrl(safeUrl, 320);
        return;
      }

      const imageSrc = String(img.currentSrc || img.src || "").trim();
      if (!imageSrc || imageSrc.startsWith("data:")) return;

      try {
        const response = await fetch(imageSrc, { mode: "cors", cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        img.src = await blobToDataUrl(await response.blob());
      } catch (error) {
        // C2-FIX3: un logo remoto sin CORS no debe bloquear la exportación.
        // Lo quitamos del clon exportable y conservamos la identidad textual
        // ya presente en el cartel (nombre del comercio / AppPromos).
        console.warn("Centro de Impresiones: logo remoto sin CORS; el PNG continúa con identidad textual.", { imageSrc, error });
        const alt = String(img.getAttribute("alt") || "").trim();
        if (alt) {
          const fallback = document.createElement("div");
          fallback.textContent = alt;
          fallback.setAttribute("aria-label", alt);
          const computed = getComputedStyle(img);
          fallback.style.width = computed.width || "auto";
          fallback.style.minHeight = computed.height || "44px";
          fallback.style.display = "flex";
          fallback.style.alignItems = "center";
          fallback.style.justifyContent = "center";
          fallback.style.fontWeight = "900";
          fallback.style.fontSize = "18px";
          fallback.style.lineHeight = "1.1";
          fallback.style.textAlign = "center";
          fallback.style.color = "inherit";
          fallback.style.background = "transparent";
          img.replaceWith(fallback);
        } else {
          img.remove();
        }
      }
    }));
  };

  const inlineComputedStyles = (source, clone) => {
    const sourceNodes = [source, ...source.querySelectorAll("*")];
    const cloneNodes = [clone, ...clone.querySelectorAll("*")];
    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index];
      if (!target || !(node instanceof Element)) return;
      const computed = getComputedStyle(node);
      let cssText = "";
      for (const property of computed) {
        cssText += `${property}:${computed.getPropertyValue(property)};`;
      }
      target.setAttribute("style", cssText);
    });
  };

  const loadCanvasImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar una imagen para el PNG."));
    image.src = src;
  });

  const fetchImageAsDataUrl = async (src) => {
    const value = String(src || "").trim();
    if (!value) return "";
    if (value.startsWith("data:")) return value;
    const response = await fetch(value, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await blobToDataUrl(await response.blob());
  };

  const drawCenteredWrappedText = (ctx, text, centerX, y, maxWidth, lineHeight, maxLines = 3) => {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return y;
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);

    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      visible[visible.length - 1] = `${last}…`;
    }

    visible.forEach((line, index) => ctx.fillText(line, centerX, y + index * lineHeight));
    return y + visible.length * lineHeight;
  };

  const roundRectPath = (ctx, x, y, width, height, radius) => {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  };

  const posterToPngBlob = async () => {
    const sheet = posterSheetRoot?.querySelector(".offer-poster-sheet");
    if (!sheet) throw new Error("Primero generá un cartel.");

    const index = Number(posterOfferSelect?.value || 0);
    const offer = printableOffers[index];
    if (!offer) throw new Error("Elegí una oferta publicada.");

    // C2-FIX4: exportación directa a Canvas. No usamos DOM -> foreignObject -> Canvas.
    // Esto elimina el problema de canvas contaminado por recursos externos.
    const width = 794;
    const height = 1123;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos crear la imagen.");

    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fontFamily = "Arial, Helvetica, sans-serif";

    const red = "#b91c1c";
    const dark = "#111111";
    const muted = "#64748b";
    const cream = "#f7f0e8";
    const yellow = "#fde047";
    const businessName = String(businessMeta?.name || businessMeta?.nombre || "Mi comercio").trim();
    const totalPrice = Number(offer.total || 0);
    const totalKg = Number(offer.offerKg || 0);
    const kickerText = posterModel === "window"
      ? "¡OFERTA!"
      : (offer.kind === "daily" ? "PROMO DEL DÍA" : "OFERTA");

    let border = 0;
    let contentX = 54;
    let contentW = width - 108;

    if (posterModel === "classic" || posterModel === "window") {
      border = 14;
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(border, border, width - border * 2, height - border * 2);
      contentX = 52;
      contentW = width - 104;
    }

    let y = posterModel === "app" ? 56 : 48;

    // Logo: se intenta incorporar, pero nunca bloquea la exportación.
    if (logoUrl) {
      try {
        const logoDataUrl = await fetchImageAsDataUrl(logoUrl);
        const logoImage = await loadCanvasImage(logoDataUrl);
        const maxW = 250;
        const maxH = 115;
        const ratio = Math.min(maxW / logoImage.naturalWidth, maxH / logoImage.naturalHeight, 1);
        const drawW = Math.max(1, logoImage.naturalWidth * ratio);
        const drawH = Math.max(1, logoImage.naturalHeight * ratio);
        ctx.drawImage(logoImage, (width - drawW) / 2, y, drawW, drawH);
        y += drawH + 14;
      } catch (error) {
        console.warn("Centro de Impresiones: logo omitido del PNG por CORS.", error);
      }
    }

    ctx.fillStyle = dark;
    ctx.font = `900 ${posterModel === "app" ? 29 : 24}px Arial, Helvetica, sans-serif`;
    ctx.fillText(businessName || "Mi comercio", width / 2, y);
    y += posterModel === "app" ? 48 : 43;

    ctx.fillStyle = posterModel === "app" ? muted : red;
    ctx.font = `900 ${posterModel === "window" ? 40 : posterModel === "classic" ? 25 : 16}px Arial, Helvetica, sans-serif`;
    ctx.fillText(kickerText, width / 2, y);
    y += posterModel === "window" ? 58 : 42;

    // Título
    const title = String(offer.name || "Oferta").trim();
    if (posterModel === "app") {
      const boxY = y - 4;
      roundRectPath(ctx, contentX, boxY, contentW, 126, 24);
      ctx.fillStyle = cream;
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.font = "900 39px Arial, Helvetica, sans-serif";
      y = drawCenteredWrappedText(ctx, title, width / 2, boxY + 24, contentW - 48, 43, 2);
      y = Math.max(boxY + 126 + 24, y + 22);
    } else if (posterModel === "window") {
      const boxY = y - 8;
      roundRectPath(ctx, contentX + 20, boxY, contentW - 40, 126, 8);
      ctx.lineWidth = 5;
      ctx.strokeStyle = red;
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.font = "900 37px Arial, Helvetica, sans-serif";
      y = drawCenteredWrappedText(ctx, title.toUpperCase(), width / 2, boxY + 24, contentW - 88, 42, 2);
      y = Math.max(boxY + 126 + 20, y + 18);
    } else {
      ctx.fillStyle = dark;
      ctx.font = "900 42px Arial, Helvetica, sans-serif";
      y = drawCenteredWrappedText(ctx, title.toUpperCase(), width / 2, y, contentW - 40, 46, 2) + 20;
    }

    // Componentes
    const itemLines = (offer.items || []).map((item = {}) => {
      const qty = Number(item.cantidad ?? item.qty ?? 1);
      const unit = String(item.unidad ?? item.unit ?? "kg").trim() || "kg";
      const name = String(item.nombre ?? item.name ?? "Producto").trim();
      return `${String(qty).replace(".", ",")} ${unit} ${name}`;
    });

    if (posterModel === "classic") {
      const itemBoxH = Math.max(104, Math.min(230, 34 + itemLines.length * 34));
      roundRectPath(ctx, contentX + 24, y, contentW - 48, itemBoxH, 18);
      ctx.lineWidth = 3;
      ctx.strokeStyle = red;
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.font = "800 19px Arial, Helvetica, sans-serif";
      let iy = y + 22;
      itemLines.slice(0, 6).forEach((line) => {
        ctx.fillText(line, width / 2, iy);
        iy += 33;
      });
      y += itemBoxH + 24;
    } else {
      ctx.fillStyle = dark;
      ctx.font = `800 ${posterModel === "window" ? 18 : 19}px Arial, Helvetica, sans-serif`;
      itemLines.slice(0, 7).forEach((line) => {
        ctx.fillText(line, width / 2, y);
        y += 31;
      });
      y += 12;
    }

    // Precio protagonista
    if (posterModel === "classic") {
      roundRectPath(ctx, contentX + 40, y, contentW - 80, 104, 18);
      ctx.fillStyle = red;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "1000 52px Arial, Helvetica, sans-serif";
      ctx.fillText(money(totalPrice), width / 2, y + 23);
      y += 120;
    } else if (posterModel === "app") {
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentX + 40, y);
      ctx.lineTo(width - contentX - 40, y);
      ctx.stroke();
      y += 23;
      ctx.fillStyle = dark;
      ctx.font = "1000 54px Arial, Helvetica, sans-serif";
      ctx.fillText(money(totalPrice), width / 2, y);
      y += 73;
    } else {
      const radius = 92;
      const cy = y + radius;
      ctx.beginPath();
      ctx.arc(width / 2, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = yellow;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = red;
      ctx.stroke();
      ctx.fillStyle = red;
      ctx.font = "1000 48px Arial, Helvetica, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(money(totalPrice), width / 2, cy);
      ctx.textBaseline = "top";
      y += radius * 2 + 18;
    }

    if (totalKg > 0 && totalPrice > 0) {
      const perKg = `${money(totalPrice / totalKg)}/kg`;
      if (posterModel === "app") {
        roundRectPath(ctx, width / 2 - 125, y, 250, 56, 14);
        ctx.fillStyle = "#f1f5f9";
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.font = "900 25px Arial, Helvetica, sans-serif";
        ctx.fillText(perKg, width / 2, y + 14);
        y += 72;
      } else {
        ctx.fillStyle = dark;
        ctx.font = `900 ${posterModel === "window" ? 24 : 25}px Arial, Helvetica, sans-serif`;
        ctx.fillText(perKg, width / 2, y);
        y += 46;
      }
    }

    // QR local + CTA. Se dibuja antes del bloque inferior fijo.
    const safePublicWebUrl = String(publicWebUrl || "").trim();
    const isCanonicalProductionUrl = /^https:\/\/apppromos\.web\.app\//i.test(safePublicWebUrl);
    if (safePublicWebUrl && isCanonicalProductionUrl) {
      try {
        const qrDataUrl = await createLocalQrDataUrl(safePublicWebUrl, 320);
        const qrImage = await loadCanvasImage(qrDataUrl);
        const qrSize = 118;
        const qrX = width / 2 - 185;
        const qrY = Math.min(y + 8, 848);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - 7, qrY - 7, qrSize + 14, qrSize + 14);
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX - 7, qrY - 7, qrSize + 14, qrSize + 14);
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        ctx.textAlign = "left";
        ctx.fillStyle = dark;
        ctx.font = "900 16px Arial, Helvetica, sans-serif";
        ctx.fillText("Escaneá y mirá nuestra", qrX + qrSize + 28, qrY + 18);
        ctx.fillText("carnicería online", qrX + qrSize + 28, qrY + 39);
        ctx.font = "800 12px Arial, Helvetica, sans-serif";
        ctx.fillText("Elegí productos, armá tu pedido", qrX + qrSize + 28, qrY + 69);
        ctx.fillText("y mandalo por WhatsApp.", qrX + qrSize + 28, qrY + 86);
        ctx.textAlign = "center";
      } catch (error) {
        console.warn("Centro de Impresiones: no se pudo dibujar el QR local en el PNG.", error);
      }
    }

    // Leyenda inferior fija para que nunca se salga del A4.
    if (posterModel === "window") {
      ctx.fillStyle = red;
      ctx.fillRect(contentX + 18, 1001, contentW - 36, 58);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 25px Arial, Helvetica, sans-serif";
      ctx.fillText("HASTA AGOTAR STOCK", width / 2, 1017);
    } else {
      ctx.fillStyle = posterModel === "classic" ? red : "#475569";
      ctx.font = `900 ${posterModel === "classic" ? 20 : 18}px Arial, Helvetica, sans-serif`;
      ctx.fillText("HASTA AGOTAR STOCK", width / 2, 1015);
    }

    ctx.fillStyle = dark;
    ctx.font = "800 9px Arial, Helvetica, sans-serif";
    ctx.fillText("Generado con AppPromos", width / 2, 1081);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("No pudimos generar el PNG.")),
        "image/png",
        1
      );
    });
  };

  const posterFileName = () => {
    const index = Number(posterOfferSelect?.value || 0);
    const offer = printableOffers[index];
    const raw = String(offer?.name || "oferta").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const safe = raw.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "oferta";
    return `AppPromos-${safe}.png`;
  };

  container.querySelector("[data-poster-png]")?.addEventListener("click", async () => {
    setPosterExportStatus("Generando PNG…");
    try {
      const blob = await posterToPngBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = posterFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPosterExportStatus("PNG generado.");
    } catch (error) {
      console.error("Centro de Impresiones: exportación PNG.", error);
      const safeMessage = /tainted|toblob|security|failed to fetch|cross-origin|cors/i.test(String(error?.message || ""))
        ? "No pudimos generar la imagen. Recargá la página y probá nuevamente."
        : (error?.message || "No pudimos generar la imagen. Probá nuevamente.");
      setPosterExportStatus(safeMessage);
    }
  });

  container.querySelector("[data-poster-share]")?.addEventListener("click", async () => {
    setPosterExportStatus("Preparando imagen…");
    try {
      const blob = await posterToPngBlob();
      const file = new File([blob], posterFileName(), { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Oferta",
          text: "Te comparto esta oferta."
        });
        setPosterExportStatus("Imagen compartida.");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = posterFileName();
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setPosterExportStatus("Tu navegador no permite compartir archivos directamente. Guardamos el PNG para que puedas enviarlo por WhatsApp.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setPosterExportStatus("");
        return;
      }
      console.error("Centro de Impresiones: compartir PNG.", error);
      const safeMessage = /tainted|toblob|security|failed to fetch|cross-origin|cors/i.test(String(error?.message || ""))
        ? "No pudimos preparar la imagen para compartir. Recargá la página y probá nuevamente."
        : (error?.message || "No pudimos preparar la imagen para compartir. Probá nuevamente.");
      setPosterExportStatus(safeMessage);
    }
  });

  container.querySelector("[data-poster-print]")?.addEventListener("click", () => {
    const sheet = posterSheetRoot?.querySelector(".offer-poster-sheet");
    if (!sheet) return;
    const clone = sheet.cloneNode(true);
    clone.classList.add("offer-poster-sheet--print-clone");
    document.body.appendChild(clone);
    document.body.classList.add("print-offer-poster-only");
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@page{size:A4 portrait;margin:0}html,body{margin:0!important;padding:0!important;width:210mm!important;height:297mm!important;min-height:0!important;max-height:297mm!important;overflow:hidden!important}body.print-offer-poster-only{display:block!important}";
    document.head.appendChild(pageStyle);
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-offer-poster-only");
      pageStyle.remove();
      clone.remove();
    }
  });

  const offerGroupOrder = ["2", "3", "5", "10", "other"];
  const categoryOrder = ["Cerdo", "Novillo", "Pollo", "Mixtas", "Otras"];
  const offerWeightLabel = (value) => value === "other" ? "OTRAS OFERTAS" : `OFERTAS ${value} KG`;

  const buildOfferPages = (offers) => {
    const pages = [];
    let page = { columns: [[], []], weights: [0, 0] };
    const maxWeight = 31;

    offers.forEach((offer) => {
      const weight = 6 + Math.max(1, offer.items.length) * 1.45;
      let columnIndex = page.weights[0] <= page.weights[1] ? 0 : 1;
      if (page.weights[columnIndex] + weight > maxWeight) {
        const other = columnIndex === 0 ? 1 : 0;
        if (page.weights[other] + weight <= maxWeight) {
          columnIndex = other;
        } else {
          pages.push(page);
          page = { columns: [[], []], weights: [0, 0] };
          columnIndex = 0;
        }
      }
      page.columns[columnIndex].push(offer);
      page.weights[columnIndex] += weight;
    });

    if (page.columns[0].length || page.columns[1].length) pages.push(page);
    return pages;
  };

  const createOfferCard = (offer, density = "medium") => {
    const card = document.createElement("article");
    card.className = `offer-list-card is-${density}`;

    if (offer.kind === "daily") {
      const badge = document.createElement("div");
      badge.className = "offer-list-card__badge";
      badge.textContent = "PROMO DEL DÍA";
      card.appendChild(badge);
    }

    const title = document.createElement("h5");
    title.textContent = offer.name || "Oferta";
    card.appendChild(title);
    const subtitle = document.createElement("div");
    subtitle.className = "offer-subtitle";
    const weightText = offer.offerKg > 0 ? `${String(offer.offerKg).replace(".", ",")} kg` : "Peso variable";
    subtitle.textContent = `${weightText} · ${offer.offerCategory}`;
    card.appendChild(subtitle);

    const itemsRoot = document.createElement("div");
    itemsRoot.className = "offer-list-items";
    (offer.items || []).forEach((item = {}) => {
      const row = document.createElement("div");
      row.className = "offer-list-item";
      const qty = Number(item.cantidad ?? item.qty ?? 1);
      const unit = String(item.unidad ?? item.unit ?? "kg").trim() || "kg";
      const name = String(item.nombre ?? item.name ?? "Producto").trim();
      row.textContent = `${String(qty).replace(".", ",")} ${unit} ${name}`;
      itemsRoot.appendChild(row);
    });
    card.appendChild(itemsRoot);

    const price = document.createElement("div");
    price.className = "offer-list-price";
    price.textContent = money(Number(offer.total || 0));
    card.appendChild(price);

    const totalKg = Number(offer.offerKg || 0);
    const totalPrice = Number(offer.total || 0);
    if (Number.isFinite(totalKg) && totalKg > 0 && Number.isFinite(totalPrice) && totalPrice > 0) {
      const unitPrice = document.createElement("div");
      unitPrice.className = "offer-list-unit-price";
      unitPrice.textContent = `${money(totalPrice / totalKg)}/kg`;
      card.appendChild(unitPrice);
    }

    return card;
  };

  const renderOfferPages = (offers) => {
    const pagesRoot = container.querySelector("[data-price-pages]");
    pagesRoot?.replaceChildren();

    const density = offers.length <= 4 ? "large" : offers.length <= 12 ? "medium" : "compact";
    const groupedOffers = [];
    offerGroupOrder.forEach((weight) => {
      categoryOrder.forEach((category) => {
        const matches = offers
          .filter((offer) => offer.weightGroup === weight && offer.offerCategory === category)
          .sort((a, b) =>
            (a.kind === "daily" ? -1 : 0) - (b.kind === "daily" ? -1 : 0) ||
            String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" })
          );
        if (matches.length) groupedOffers.push({ weight, category, offers: matches });
      });
    });

    const rowUnits = (pair = []) => {
      const maxItems = Math.max(1, ...pair.map((offer) => Array.isArray(offer.items) ? offer.items.length : 0));
      if (maxItems >= 8) return 2.15;
      if (maxItems >= 6) return 1.8;
      if (maxItems >= 4) return 1.45;
      if (maxItems >= 3) return 1.2;
      return 1;
    };

    const groupRows = groupedOffers.map((group) => {
      const rows = [];
      for (let i = 0; i < group.offers.length; i += 2) {
        const pair = group.offers.slice(i, i + 2);
        rows.push({ offers: pair, units: rowUnits(pair) });
      }
      return { ...group, rows };
    });

    const HEADER_UNITS = 0.42;
    const totalUnits = groupRows.reduce(
      (sum, group) => sum + HEADER_UNITS + group.rows.reduce((rowSum, row) => rowSum + row.units, 0),
      0
    );

    // Objetivo visual: llenar cada A4 de forma pareja sin forzar contenido.
    // ~5 unidades por hoja da buena lectura y escala bien desde pocas promos a 40+.
    const estimatedPages = Math.max(1, Math.ceil(totalUnits / 5.1));
    const PAGE_UNITS = Math.max(4.6, Math.min(5.8, (totalUnits / estimatedPages) + 0.28));

    const pages = [];
    let page = { blocks: [], units: 0 };

    const flushPage = () => {
      if (!page.blocks.length) return;
      pages.push(page);
      page = { blocks: [], units: 0 };
    };

    groupRows.forEach((group) => {
      let rowIndex = 0;
      let continued = false;

      while (rowIndex < group.rows.length) {
        const firstRowUnits = group.rows[rowIndex]?.units || 1;
        const requiredToStart = HEADER_UNITS + firstRowUnits;

        if (page.blocks.length && page.units + requiredToStart > PAGE_UNITS) {
          flushPage();
        }

        const block = {
          weight: group.weight,
          category: group.category,
          continued,
          offers: []
        };
        let blockUnits = HEADER_UNITS;

        while (rowIndex < group.rows.length) {
          const row = group.rows[rowIndex];
          const projected = page.units + blockUnits + row.units;

          if (block.offers.length && projected > PAGE_UNITS) break;

          // Si la primera fila de un bloque grande excede levemente el objetivo,
          // se permite completa: jamás se genera una hoja vacía ni se corta una promo.
          block.offers.push(...row.offers);
          blockUnits += row.units;
          rowIndex += 1;

          if (page.units + blockUnits >= PAGE_UNITS) break;
        }

        page.blocks.push(block);
        page.units += blockUnits;
        continued = rowIndex < group.rows.length;

        if (continued) flushPage();
      }
    });

    flushPage();

    pages.forEach((pageData, pageIndex) => {
      const { sheet, head, footer } = createSheetBase("OFERTAS PUBLICADAS", pageIndex, pages.length);
      const body = document.createElement("div");
      body.className = "offer-list-page-body";

      pageData.blocks.forEach((block) => {
        const groupBlock = document.createElement("section");
        groupBlock.className = "offer-group-block";

        const sectionTitle = document.createElement("div");
        sectionTitle.className = "offer-section-title";
        sectionTitle.textContent = `${offerWeightLabel(block.weight)} · ${block.category}${block.continued ? " · continuación" : ""}`;

        const grid = document.createElement("div");
        grid.className = "offer-group-grid";
        block.offers.forEach((offer) => grid.appendChild(createOfferCard(offer, density)));

        groupBlock.append(sectionTitle, grid);
        body.appendChild(groupBlock);
      });

      footer.firstChild.textContent = "Ofertas vigentes al momento de generar esta lista · Generado con AppPromos";
      sheet.append(head, body, footer);
      pagesRoot?.appendChild(sheet);
    });
  };
  const updateListTypeUi = () => {
    const isOffers = (listType?.value || "products") === "offers";
    if (scopeField) scopeField.style.display = isOffers ? "none" : "grid";
    if (offerWeightField) offerWeightField.style.display = isOffers ? "grid" : "none";
    if (offerCategoryField) offerCategoryField.style.display = isOffers ? "grid" : "none";
    if (previewLabel) previewLabel.textContent = isOffers
      ? "Ofertas publicadas · A4 vertical · 2 columnas"
      : "Productos por rubro · A4 vertical · 2 columnas";
    pricePreview?.classList.remove("is-ready");
    if (priceError) priceError.textContent = "";
  };

  const generatePriceList = () => {
    if (priceError) priceError.textContent = "";
    const mode = listType?.value || "products";

    if (mode === "offers") {
      if (!printableOffers.length) {
        pricePreview?.classList.remove("is-ready");
        if (priceError) priceError.textContent = "No hay ofertas publicadas actualmente en tu web.";
        return;
      }
      const weightFilter = offerWeight?.value || "all";
      const categoryFilter = offerCategory?.value || "all";
      const visibleOffers = printableOffers.filter((offer) =>
        (weightFilter === "all" || offer.weightGroup === weightFilter) &&
        (categoryFilter === "all" || offer.offerCategory === categoryFilter)
      );
      if (!visibleOffers.length) {
        pricePreview?.classList.remove("is-ready");
        if (priceError) priceError.textContent = "No hay ofertas publicadas que coincidan con esos filtros.";
        return;
      }
      renderOfferPages(visibleOffers);
      pricePreview?.classList.add("is-ready");
      pricePreview?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (!pricedProducts.length) {
      pricePreview?.classList.remove("is-ready");
      if (priceError) priceError.textContent = "No encontramos productos activos con precio cargado.";
      return;
    }
    const selected = scope?.value || "all";
    const visible = selected === "all" ? pricedProducts : pricedProducts.filter((item) => item.rubro === selected);
    if (!visible.length) {
      pricePreview?.classList.remove("is-ready");
      if (priceError) priceError.textContent = "No hay productos con precio en ese rubro.";
      return;
    }

    const grouped = new Map();
    visible.forEach((item) => {
      if (!grouped.has(item.rubro)) grouped.set(item.rubro, []);
      grouped.get(item.rubro).push(item);
    });
    renderPricePages(grouped);
    pricePreview?.classList.add("is-ready");
    pricePreview?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  listType?.addEventListener("change", updateListTypeUi);
  offerWeight?.addEventListener("change", () => pricePreview?.classList.remove("is-ready"));
  offerCategory?.addEventListener("change", () => pricePreview?.classList.remove("is-ready"));
  updateListTypeUi();
  container.querySelector("[data-price-generate]")?.addEventListener("click", generatePriceList);
  container.querySelector("[data-price-print]")?.addEventListener("click", () => {
    const pages = container.querySelector("[data-price-pages]");
    if (!pages || !pages.children.length) return;
    const clone = pages.cloneNode(true);
    clone.classList.add("price-list-pages--print-clone");
    document.body.appendChild(clone);
    document.body.classList.add("print-price-list-only");
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@page{size:A4 portrait;margin:0}";
    document.head.appendChild(pageStyle);
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-price-list-only");
      pageStyle.remove();
      clone.remove();
    }
  });
  // V12.24-D — QR de mi carnicería
  const qrShopPreview = container.querySelector("[data-qr-shop-preview]");
  const qrShopCode = container.querySelector("[data-qr-shop-code]");
  const qrShopStatus = container.querySelector("[data-qr-shop-status]");
  const qrShopName = String(businessMeta?.name || businessMeta?.nombre || "Mi carnicería").trim();
  const canonicalShopUrl = String(publicWebUrl || "").trim();
  const setQrShopStatus = (message = "") => { if (qrShopStatus) qrShopStatus.textContent = String(message || ""); };

  const buildQrShop = async () => {
    if (!/^https:\/\/apppromos\.web\.app\//i.test(canonicalShopUrl)) {
      setQrShopStatus("Todavía no encontramos la dirección pública de tu carnicería.");
      return false;
    }
    try {
      const qrDataUrl = await createLocalQrDataUrl(canonicalShopUrl, 420);
      if (qrShopCode) qrShopCode.src = qrDataUrl;
      const nameNode = container.querySelector("[data-qr-shop-name]");
      if (nameNode) nameNode.textContent = qrShopName;
      qrShopPreview?.classList.add("is-ready");
      setQrShopStatus("");
      return true;
    } catch (error) {
      console.error("Centro de Impresiones: QR de mi carnicería.", error);
      setQrShopStatus("No pudimos generar el QR. Revisá la conexión y probá nuevamente.");
      return false;
    }
  };

  const qrShopToPngBlob = async () => {
    if (!/^https:\/\/apppromos\.web\.app\//i.test(canonicalShopUrl)) throw new Error("No encontramos la dirección pública de tu carnicería.");
    const qrDataUrl = await createLocalQrDataUrl(canonicalShopUrl, 520);
    const qrImage = await loadCanvasImage(qrDataUrl);
    const width = 794, height = 1123, scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale; canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No pudimos crear la imagen.");
    ctx.scale(scale, scale);
    ctx.fillStyle="#b91c1c"; ctx.fillRect(0,0,width,height);
    ctx.fillStyle="#ffffff"; ctx.fillRect(14,14,width-28,height-28);
    ctx.textAlign="center"; ctx.textBaseline="top";

    ctx.fillStyle="#111111"; ctx.font="900 34px Arial, Helvetica, sans-serif";
    ctx.fillText(qrShopName, width/2, 80);
    ctx.fillStyle="#b91c1c"; ctx.font="1000 38px Arial, Helvetica, sans-serif";
    ctx.fillText("VISITÁ NUESTRA", width/2, 158);
    ctx.fillText("VIDRIERA ONLINE", width/2, 204);

    const qrSize=360, qrX=(width-qrSize)/2, qrY=285;
    ctx.fillStyle="#ffffff"; ctx.fillRect(qrX-12,qrY-12,qrSize+24,qrSize+24);
    ctx.strokeStyle="#d1d5db"; ctx.lineWidth=2; ctx.strokeRect(qrX-12,qrY-12,qrSize+24,qrSize+24);
    ctx.drawImage(qrImage,qrX,qrY,qrSize,qrSize);

    ctx.fillStyle="#111111"; ctx.font="900 24px Arial, Helvetica, sans-serif";
    ctx.fillText("Escaneá el QR con tu celular",width/2,690);
    ctx.fillStyle="#334155"; ctx.font="800 21px Arial, Helvetica, sans-serif";
    ctx.fillText("Consultá ofertas diarias, promos y precios.",width/2,748);
    ctx.font="800 18px Arial, Helvetica, sans-serif";
    ctx.fillText("Elegí tus productos y mandá tu pedido",width/2,805);
    ctx.fillText("directamente por WhatsApp.",width/2,833);

    // D-FIX1: el QR ya contiene la URL productiva. Evitamos mostrar el slug
    // largo y usamos ese espacio para reforzar la acción principal.
    ctx.fillStyle="#f8fafc"; ctx.fillRect(105,900,width-210,88);
    ctx.fillStyle="#b91c1c"; ctx.font="1000 23px Arial, Helvetica, sans-serif";
    ctx.fillText("ESCANEÁ Y COMPRÁ ONLINE",width/2,922);
    ctx.fillStyle="#475569"; ctx.font="800 14px Arial, Helvetica, sans-serif";
    ctx.fillText("Nuestra vidriera está disponible las 24 horas.",width/2,956);
    ctx.fillStyle="#111111"; ctx.font="800 10px Arial, Helvetica, sans-serif";
    ctx.fillText("Generado con AppPromos",width/2,1064);

    return await new Promise((resolve,reject)=>canvas.toBlob(
      blob=>blob?resolve(blob):reject(new Error("No pudimos generar el PNG.")),
      "image/png",1
    ));
  };

  const qrShopFileName = () => {
    const raw = qrShopName.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const safe = raw.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase() || "mi-carniceria";
    return `AppPromos-QR-${safe}.png`;
  };

  container.querySelector("[data-qr-shop-generate]")?.addEventListener("click", buildQrShop);

  container.querySelector("[data-qr-shop-png]")?.addEventListener("click", async () => {
    setQrShopStatus("Generando PNG…");
    try {
      const blob=await qrShopToPngBlob(), url=URL.createObjectURL(blob), link=document.createElement("a");
      link.href=url; link.download=qrShopFileName(); document.body.appendChild(link); link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000); setQrShopStatus("PNG generado.");
    } catch(error) {
      console.error("Centro de Impresiones: PNG QR.",error);
      setQrShopStatus(error?.message || "No pudimos generar la imagen.");
    }
  });

  container.querySelector("[data-qr-shop-share]")?.addEventListener("click", async () => {
    setQrShopStatus("Preparando imagen…");
    try {
      const blob=await qrShopToPngBlob(), file=new File([blob],qrShopFileName(),{type:"image/png"});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:qrShopName,text:"Visitá nuestra vidriera online."});
        setQrShopStatus("Imagen compartida.");
      } else {
        const url=URL.createObjectURL(blob), link=document.createElement("a");
        link.href=url; link.download=qrShopFileName(); document.body.appendChild(link); link.click(); link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        setQrShopStatus("Guardamos el PNG para que puedas compartirlo.");
      }
    } catch(error) {
      if(error?.name==="AbortError"){setQrShopStatus("");return;}
      console.error("Centro de Impresiones: compartir QR.",error);
      setQrShopStatus(error?.message || "No pudimos preparar la imagen.");
    }
  });

  container.querySelector("[data-qr-shop-print]")?.addEventListener("click", async () => {
    const ok = qrShopPreview?.classList.contains("is-ready") || await buildQrShop();
    if (!ok) return;
    const card = container.querySelector(".qr-shop-card");
    if (!card) return;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) { setQrShopStatus("El navegador bloqueó la ventana de impresión."); return; }
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR - ${qrShopName}</title><style>@page{size:A4 portrait;margin:8mm}body{margin:0;font-family:Arial,sans-serif}.card{width:194mm;height:281mm;border:4mm solid #b91c1c;box-sizing:border-box;padding:14mm;text-align:center;display:flex;flex-direction:column;align-items:center}.card h4{font-size:28pt;margin:4mm 0}.qr-shop-kicker{font-size:24pt;font-weight:900;color:#b91c1c;margin:7mm 0}.qr-shop-code{width:95mm;height:95mm;margin:7mm 0}.qr-shop-copy{font-size:16pt;font-weight:800}.qr-shop-whatsapp{font-size:13pt;font-weight:800;margin-top:6mm}.qr-shop-brand{margin-top:auto;font-size:8pt;font-weight:800}</style></head><body><div class="card">${card.innerHTML}</div><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    printWindow.document.close();
  });

  // V12.24-E2 — Folletos con identidad comercial y varias promos por A4.
  const flyerFormatSelect = container.querySelector("[data-flyer-format]");
  const flyerOfferSelects = Array.from(container.querySelectorAll("[data-flyer-offer]"));
  const flyerSlots = Array.from(container.querySelectorAll("[data-flyer-slot]"));
  const flyerPreview = container.querySelector("[data-flyer-preview]");
  const flyerA4 = container.querySelector("[data-flyer-a4]");
  const flyerError = container.querySelector("[data-flyer-error]");
  const setFlyerError = (message = "") => { if (flyerError) flyerError.textContent = String(message || ""); };

  const flyerBusinessName = String(businessMeta?.name || businessMeta?.nombre || "Mi carnicería").trim();
  const flyerAddress = String(
    businessMeta?.address || businessMeta?.direccion || businessMeta?.domicilio || ""
  ).trim();
  const flyerWhatsapp = String(
    businessMeta?.whatsapp || businessMeta?.whatsApp || businessMeta?.phone || businessMeta?.telefono || ""
  ).trim();

  const fillFlyerOfferSelects = () => {
    flyerOfferSelects.forEach((select, slotIndex) => {
      select.replaceChildren();
      if (!printableOffers.length) {
        const option=document.createElement("option");
        option.value=""; option.textContent="No hay ofertas publicadas";
        select.appendChild(option); select.disabled=true; return;
      }
      printableOffers.forEach((offer,index)=>{
        const option=document.createElement("option");
        option.value=String(index);
        option.textContent=String(offer?.name || `Oferta ${index+1}`);
        select.appendChild(option);
      });
      // Por defecto, distribuir distintas promos cuando existen.
      select.value=String(Math.min(slotIndex, printableOffers.length-1));
    });
  };
  fillFlyerOfferSelects();

  const flyerSlotCount = () => flyerFormatSelect?.value === "2x4" ? 4 : flyerFormatSelect?.value === "4x2" ? 2 : 1;
  const refreshFlyerSlots = () => {
    const count=flyerSlotCount();
    flyerSlots.forEach((slot,index)=>slot.classList.toggle("is-visible",index<count));
    flyerPreview?.classList.remove("is-ready");
    setFlyerError("");
  };
  flyerFormatSelect?.addEventListener("change",refreshFlyerSlots);
  flyerOfferSelects.forEach(select=>select.addEventListener("change",()=>flyerPreview?.classList.remove("is-ready")));
  refreshFlyerSlots();

  const flyerItemLines = (offer = {}) => (offer.items || []).map((item = {}) => {
    const qty=Number(item.cantidad ?? item.qty ?? 1);
    const unit=String(item.unidad ?? item.unit ?? "kg").trim() || "kg";
    const name=String(item.nombre ?? item.name ?? "Producto").trim();
    return `${String(qty).replace(".", ",")} ${unit} ${name}`;
  });

  const buildFlyerCard = ({offer,qrDataUrl}) => {
    const card=document.createElement("article"); card.className="flyer-card";
    const business=document.createElement("div"); business.className="flyer-card__business"; business.textContent=flyerBusinessName;
    const badge=document.createElement("div"); badge.className="flyer-card__badge"; badge.textContent=offer?.kind==="daily" ? "OFERTA DEL DÍA" : "PROMO";
    const title=document.createElement("div"); title.className="flyer-card__title"; title.textContent=String(offer?.name || "Oferta");
    const items=document.createElement("div"); items.className="flyer-card__items"; items.textContent=flyerItemLines(offer).slice(0,4).join(" · ");
    const price=document.createElement("div"); price.className="flyer-card__price"; price.textContent=money(Number(offer?.total || 0));
    card.append(business,badge,title); if(items.textContent)card.appendChild(items); card.appendChild(price);

    const totalKg=Number(offer?.offerKg || 0), totalPrice=Number(offer?.total || 0);
    if(totalKg>0 && totalPrice>0){const kg=document.createElement("div");kg.className="flyer-card__kg";kg.textContent=`${money(totalPrice/totalKg)}/kg`;card.appendChild(kg);}

    const bottom=document.createElement("div");bottom.className="flyer-card__bottom";
    if(qrDataUrl){const qr=document.createElement("img");qr.className="flyer-card__qr";qr.src=qrDataUrl;qr.alt="QR de la carnicería";bottom.appendChild(qr);}
    const cta=document.createElement("div");cta.className="flyer-card__cta";cta.textContent="Escaneá y comprá online\nPedidos por WhatsApp";bottom.appendChild(cta);card.appendChild(bottom);

    const identity=document.createElement("div");identity.className="flyer-card__identity";
    if(flyerAddress){const a=document.createElement("span");a.textContent=flyerAddress;identity.appendChild(a);}
    if(flyerWhatsapp){const w=document.createElement("span");w.textContent=`WhatsApp: ${flyerWhatsapp}`;identity.appendChild(w);}
    if(identity.childNodes.length)card.appendChild(identity);

    const stock=document.createElement("div");stock.className="flyer-card__stock";stock.textContent="HASTA AGOTAR STOCK";
    const brand=document.createElement("div");brand.className="flyer-card__brand";brand.textContent="Generado con AppPromos";card.append(stock,brand);
    return card;
  };

  const selectedFlyerOffers = () => {
    const count=flyerSlotCount();
    return flyerOfferSelects.slice(0,count).map(select=>printableOffers[Number(select.value)]).filter(Boolean);
  };

  const generateFlyerSheet = async () => {
    setFlyerError("");
    const offers=selectedFlyerOffers();
    const expected=flyerSlotCount();
    if(offers.length!==expected){setFlyerError("Elegí todas las promociones necesarias para este formato.");flyerPreview?.classList.remove("is-ready");return false;}
    const safeUrl=String(publicWebUrl || "").trim();
    if(!/^https:\/\/apppromos\.web\.app\//i.test(safeUrl)){setFlyerError("Todavía no encontramos la dirección pública de tu carnicería.");return false;}
    try{
      const qrDataUrl=await createLocalQrDataUrl(safeUrl,220);
      flyerA4?.replaceChildren();
      let sequence=[];
      if(flyerFormatSelect?.value==="4x2") sequence=[offers[0],offers[0],offers[0],offers[0],offers[1],offers[1],offers[1],offers[1]];
      else if(flyerFormatSelect?.value==="2x4") sequence=offers.flatMap(offer=>[offer,offer]);
      else sequence=Array(8).fill(offers[0]);
      sequence.forEach(offer=>flyerA4?.appendChild(buildFlyerCard({offer,qrDataUrl})));
      flyerPreview?.classList.add("is-ready"); return true;
    }catch(error){console.error("Centro de Impresiones: folletos E2.",error);setFlyerError("No pudimos generar los folletos. Revisá la conexión y probá nuevamente.");return false;}
  };

  container.querySelector("[data-flyer-generate]")?.addEventListener("click",generateFlyerSheet);

  container.querySelector("[data-flyer-print]")?.addEventListener("click",async()=>{
    const ready=flyerPreview?.classList.contains("is-ready") || await generateFlyerSheet();
    if(!ready || !flyerA4)return;
    const printWindow=window.open("","_blank","width=1000,height=1200");
    if(!printWindow){setFlyerError("El navegador bloqueó la ventana de impresión.");return;}
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Folletos - ${flyerBusinessName}</title><style>
      @page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif}
      .sheet{width:196mm;height:283mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:2.5mm}
      .flyer-card{min-width:0;min-height:0;border:.5mm dashed #b8c0cc;padding:2.4mm;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
      .flyer-card__business{font-size:8.5pt;font-weight:900;line-height:1.05}.flyer-card__badge{margin-top:1mm;background:#b91c1c;color:#fff;border-radius:8mm;padding:.7mm 3mm;font-size:6.5pt;font-weight:900}
      .flyer-card__title{margin-top:1.2mm;font-size:11.5pt;font-weight:900;line-height:1.05;text-transform:uppercase}.flyer-card__items{margin-top:1mm;font-size:6.4pt;font-weight:700;color:#334155;line-height:1.15}
      .flyer-card__price{margin-top:1.2mm;font-size:19pt;font-weight:900;color:#b91c1c;line-height:1}.flyer-card__kg{margin-top:.6mm;font-size:7pt;font-weight:900}
      .flyer-card__bottom{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:2mm;width:100%}.flyer-card__qr{width:15mm;height:15mm;object-fit:contain}.flyer-card__cta{font-size:5.8pt;font-weight:900;line-height:1.15;text-align:left;white-space:pre-line}
      .flyer-card__identity{margin-top:.6mm;font-size:5.2pt;font-weight:800;color:#475569;line-height:1.1}.flyer-card__identity span{display:block}
      .flyer-card__stock{margin-top:.6mm;font-size:5pt;font-weight:900;color:#b91c1c}.flyer-card__brand{font-size:4.3pt;font-weight:700;color:#64748b;margin-top:.3mm}
    </style></head><body><main class="sheet">${flyerA4.innerHTML}</main><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    printWindow.document.close();
  });

}

export { parseAppPromosOrder };
