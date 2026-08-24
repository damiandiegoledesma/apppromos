// AppPromos V12.16-A1-FIX2
// Servicio comun para mensajes de WhatsApp salientes desde el carnicero al cliente comprador.
// Archivo escrito con escapes Unicode para evitar problemas de encoding en Windows/PowerShell.

function cleanText(value = "") {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripForbiddenExternalWords(value = "") {
  return cleanText(value)
    .replace(/liquidaci[o\u00f3]n/gi, "Oferta")
    .replace(/vender\s+urgente/gi, "Oferta del d\u00eda")
    .replace(/producto\s+atrasado/gi, "")
    .replace(/sacar\s+hoy/gi, "")
    .replace(/\uD83D\uDD25/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMoney(value = 0) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(number));
}

function formatQty(value = 1) {
  const number = Number(value || 1);
  if (!Number.isFinite(number) || number <= 0) return "1";
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function normalizeLower(value = "") {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getWhatsappItemIcon(item = {}) {
  const text = normalizeLower(`${item?.rubro || item?.category || ""} ${item?.nombre || item?.name || ""}`);
  if (text.includes("pollo") || text.includes("pata") || text.includes("muslo") || text.includes("suprema") || text.includes("alita")) return "\uD83D\uDC14";
  if (text.includes("cerdo") || text.includes("costeleta") || text.includes("matambrito") || text.includes("bondiola") || text.includes("pulp")) return "\uD83D\uDC16";
  if (text.includes("novillo") || text.includes("vaca") || text.includes("ternera") || text.includes("asado") || text.includes("vacio") || text.includes("bife") || text.includes("entrana") || text.includes("entra\u00f1a") || text.includes("falda") || text.includes("marucha") || text.includes("aguja")) return "\uD83D\uDC02";
  return "\uD83E\uDD69";
}

function getTotal(combo = {}) {
  return Number(
    combo?.total ||
    combo?.totalFinal ||
    combo?.precioFinal ||
    combo?.snapshot?.totals?.total_redondeado ||
    combo?.snapshot?.totals?.total ||
    0
  ) || 0;
}

function getBusinessName(meta = {}) {
  return cleanText(
    meta?.publicDisplayName ||
    meta?.publicName ||
    meta?.businessName ||
    meta?.displayName ||
    meta?.name ||
    meta?.nombre ||
    "Tu carnicer\u00eda"
  );
}

function getBusinessAddress(meta = {}) {
  return cleanText(meta?.direccion || meta?.address || "");
}

function getBusinessLocation(meta = {}) {
  const city = cleanText(meta?.ciudad || meta?.city || meta?.localidad || meta?.locality || "");
  const province = cleanText(meta?.provincia || meta?.province || "");
  return [city, province].filter(Boolean).join(", ");
}

function getBusinessWhatsapp(meta = {}) {
  return cleanText(meta?.whatsapp || meta?.telefono || meta?.phone || meta?.phoneKey || "");
}

function getTimeGreeting(now = new Date()) {
  const hour = Number(now.getHours());
  if (hour >= 5 && hour < 13) return "buen d\u00eda";
  if (hour >= 13 && hour < 20) return "buenas tardes";
  return "buenas noches";
}

function getTitle(combo = {}, options = {}) {
  const raw = options?.title || combo?.name || combo?.nombre || "OFERTA DEL D\u00cdA";
  const clean = stripForbiddenExternalWords(raw) || "OFERTA DEL D\u00cdA";
  return `\uD83D\uDD25 ${clean.toUpperCase()}`;
}

function buildProductLine(item = {}) {
  const icon = getWhatsappItemIcon(item);
  const quantity = formatQty(item?.cantidad || item?.quantity || item?.kilos || 1);
  const unit = cleanText(item?.unidad || item?.unit || "kg");
  const name = cleanText(item?.nombre || item?.name || "Producto");
  const rubro = cleanText(item?.rubro || item?.category || "");
  return `${icon} ${quantity} ${unit} ${name}${rubro ? ` \u2014 ${rubro}` : ""}`;
}

export function buildCustomerWhatsappMessage(combo = {}, businessMeta = {}, options = {}) {
  const items = Array.isArray(combo?.items) ? combo.items : [];
  const customerName = cleanText(options?.customerName || options?.customer?.name || "");
  const greeting = customerName
    ? `Hola ${customerName}, ${getTimeGreeting()} \uD83D\uDC4B`
    : `Hola, ${getTimeGreeting()} \uD83D\uDC4B`;

  const lines = [
    greeting,
    "",
    getTitle(combo, options),
    ""
  ];

  if (items.length) {
    items.forEach((item) => lines.push(buildProductLine(item)));
  } else {
    lines.push("\uD83E\uDD69 Promo especial disponible");
  }

  lines.push(
    "",
    `Total: $ ${formatMoney(getTotal(combo))}`,
    "",
    "Oferta especial hasta agotar stock.",
    ""
  );

  const businessName = getBusinessName(businessMeta);
  const address = getBusinessAddress(businessMeta);
  const location = getBusinessLocation(businessMeta);
  const whatsapp = getBusinessWhatsapp(businessMeta);

  if (businessName) lines.push(`\uD83D\uDCCD ${businessName}`);
  if (address) lines.push(`\uD83C\uDFE0 Direcci\u00f3n: ${address}`);
  else if (location) lines.push(`\uD83C\uDFE0 ${location}`);
  if (whatsapp) lines.push(`\uD83D\uDCF2 WhatsApp: ${whatsapp}`);

  return lines.filter((line, index, array) => {
    if (line !== "") return true;
    return array[index - 1] !== "" && array[index + 1] !== "";
  }).join("\n");
}

export function buildWhatsappShareUrl(message = "", phone = "") {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const encoded = encodeURIComponent(String(message || ""));
  const userAgent = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);

  if (isMobile) {
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  return cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
}

export function openCustomerWhatsappMessage(combo = {}, businessMeta = {}, options = {}) {
  const message = buildCustomerWhatsappMessage(combo, businessMeta, options);
  const url = buildWhatsappShareUrl(message, options?.phone || "");

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
  } catch (_) {}

  window.open(url, "_blank", "noopener,noreferrer");
  return message;
}
