import {
  DEFAULT_MODULES,
  MODULE_LABELS,
  BILLING_PLANS
} from "../services/access-control-service.js";

import {
  listAdminBusinesses,
  listAdminUsers,
  updateBusinessStatus,
  updateBusinessModules,
  updateBusinessBillingPlan,
  updateBusinessBillingStatus,
  updateBusinessPaymentDueDate,
  markBusinessPaymentReceived,
  activateBusinessPaidPlan,
  restartBusinessTrial,
  updateBusinessCommercialBilling,
  listBusinessBillingMovements,
  recordBusinessBillingMovement,
  updateBusinessFollowup,
  setBusinessTestFlag,
  markExistingBusinessesAsTest,
  cloneBusinessAsTest,
  deleteTestBusiness,
  archiveBusiness,
  restoreBusiness,
  setUserDisabled,
  ensureBusinessAdminDefaults,
  listBusinessCommercialEvents
} from "../services/admin-service.js";

const ADMIN_PLANS = Array.from(new Set([...(BILLING_PLANS || []), "dueno"]));
const PAYMENT_STATUSES = ["active", "pending", "overdue", "suspended", "manual"];
const ACCESS_STATUSES = ["active", "trial", "suspended", "disabled"];
const MP_BACKEND_URL = "http://127.0.0.1:8000";
const MP_LINKS_BY_BUSINESS = new Map();
const BILLING_MOVEMENTS_BY_BUSINESS = new Map();
const COMMERCIAL_EVENTS_BY_BUSINESS = new Map();
const PUBLIC_SIGNAL_SUMMARY_BY_BUSINESS = new Map();

const FOLLOWUP_STATUS_OPTIONS = Object.freeze([
  ["pending", "Pendiente"],
  ["contacted", "Contactado"],
  ["helped", "Ayudado"],
  ["resolved", "Resuelto"],
  ["no_response", "Sin respuesta"]
]);

const COMMERCIAL_EVENT_LABELS = Object.freeze({
  business_registered: "Se registró en AppPromos",
  first_login: "Ingresó por primera vez",
  app_open: "Abrió AppPromos",
  price_save: "Guardó precios",
  price_milestone_reached: "Alcanzó un hito de precios",
  web_open: "Abrió su vidriera",
  web_share: "Compartió su vidriera",
  offer_created: "Creó una promo",
  offer_published: "Publicó una promo",
  offer_shared: "Compartió una promo",
  seller_whatsapp: "Abrió WhatsApp para vender",
  daily_promo_created: "Creó una Promo del día",
  daily_promo_published: "Publicó una Promo del día",
  business_identity_completed: "Completó la identidad de su carnicería",
  external_storefront_visit: "Recibió una visita externa",
  public_order_whatsapp_started: "Un cliente inició un pedido por WhatsApp",
  storefront_theme_offered: "Recibió la propuesta de estilo",
  storefront_theme_previewed: "Previsualizó un estilo",
  storefront_theme_selected: "Eligió un estilo",
  storefront_theme_deferred: "Postergó elegir un estilo",
  manual_followup_updated: "Se actualizó el seguimiento"
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstText(...values) {
  for (const value of values) {
    const clean = String(value ?? "").trim();
    if (clean) return clean;
  }
  return "";
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "$ 0";
  return number.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function currentBillingPeriodMonth() {
  const today = new Date();
  const closedMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = closedMonth.getFullYear();
  const month = String(closedMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeMpPlan(value = "") {
  const clean = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (clean.includes("salvador") || clean === "pro") return "SALVADOR";
  if (clean.includes("dueno") || clean.includes("duenio") || clean.includes("dueño")) return "DUENO";
  return "ARRANQUE";
}

function mpLinkForBusiness(row = {}) {
  const id = safeBusinessId(row);
  return MP_LINKS_BY_BUSINESS.get(id) || row.billing?.mpLastLink || row.billing?.mercadoPagoLink || row.mpLastLink || null;
}

function mpPaymentUrl(link = null) {
  const safeLink = link && typeof link === "object" ? link : {};
  return String(safeLink.init_point || safeLink.sandbox_init_point || safeLink.payment_link || safeLink.url || "").trim();
}

function mpAmount(link = null) {
  const safeLink = link && typeof link === "object" ? link : {};
  return Number(safeLink.calculation?.amount || safeLink.amount || 0) || 0;
}

function mpDescription(link = null) {
  const safeLink = link && typeof link === "object" ? link : {};
  return firstText(safeLink.calculation?.description, safeLink.description, "abono AppPromos");
}

function userBusinessId(user = {}) {
  return firstText(user.businessId, user.business_id, user.business?.businessId, user.profile?.businessId, user.meta?.businessId);
}

function userDisabled(user = {}) {
  const status = String(user.status || user.accessStatus || "").toLowerCase();
  return user.disabled === true || user.isDisabled === true || status === "disabled" || status === "archived";
}

function additionalUsersForBusiness(businessId = "", users = []) {
  if (!businessId) return 0;
  const activeUsers = (users || []).filter((user) => userBusinessId(user) === businessId && !userDisabled(user));
  return Math.max(0, activeUsers.length - 1);
}

function buildMpPaymentWhatsappText(row = {}, link = {}) {
  const url = mpPaymentUrl(link);
  const amount = mpAmount(link);
  const period = firstText(link.calculation?.period_key, link.period_key, "este período");
  return [
    "Hola, soy Damian de AppPromos.",
    "",
    `Te paso el link de Mercado Pago para regularizar AppPromos de ${businessName(row)}.`,
    `Período: ${period}`,
    amount ? `Importe: ${formatMoney(amount)}` : "Importe: ver link de pago",
    "",
    url,
    "",
    "Cuando se acredita, AppPromos lo registra y seguimos trabajando normal.",
    "",
    "Cualquier cosa me avisás."
  ].join("\n");
}

function openMpWhatsapp(row = {}, link = {}) {
  const number = normalizeWhatsappNumber(businessPhone(row));
  const url = mpPaymentUrl(link);
  if (!number) {
    window.alert("Esta carnicería no tiene WhatsApp válido cargado.");
    return;
  }
  if (!url) {
    window.alert("Primero generá o cargá un link de Mercado Pago.");
    return;
  }
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildMpPaymentWhatsappText(row, link))}`, "_blank", "noopener,noreferrer");
}

async function copyMpLinkToClipboard(link = {}) {
  const url = mpPaymentUrl(link);
  if (!url) {
    window.alert("No hay link de Mercado Pago para copiar.");
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    window.alert("Link Mercado Pago copiado.");
  } catch (error) {
    window.prompt("Copiá este link Mercado Pago:", url);
  }
}

function businessName(row = {}) {
  return firstText(row.displayName, row.name, row.meta?.displayName, row.meta?.name, row.businessId, "Sin nombre");
}

function businessOwner(row = {}) {
  return firstText(row.responsable, row.responsibleName, row.ownerName, row.owner?.displayName, row.owner?.nombre, row.meta?.responsable, row.meta?.responsibleName, "Sin responsable");
}

function businessEmail(row = {}) {
  return firstText(row.ownerEmail, row.email, row.owner?.email, row.meta?.ownerEmail, row.meta?.email, "Sin email");
}

function businessPhone(row = {}) {
  return firstText(row.telefono, row.phone, row.whatsapp, row.ownerPhone, row.phoneKey, row.publicPhoneKey, row.phoneIndex?.phoneKey, row.meta?.telefono, row.meta?.phone, row.meta?.whatsapp, row.owner?.telefono, row.owner?.phone, "");
}

function businessLocation(row = {}) {
  const city = firstText(row.localidad, row.city, row.meta?.localidad, row.meta?.city);
  const province = firstText(row.provincia, row.province, row.meta?.provincia, row.meta?.province);
  return [city, province].filter(Boolean).join(", ") || "Sin localidad";
}

function shortId(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "—";
  return clean.length <= 14 ? clean : `${clean.slice(0, 8)}...${clean.slice(-4)}`;
}

function normalizeWhatsappNumber(value = "") {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  while (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return digits;
  if (digits.length >= 10) return `549${digits}`;
  return digits;
}

function buildWhatsappText(row = {}, reason = "base") {
  const name = businessName(row);
  if (reason === "cobranza") {
    return [
      "Hola, soy Damian de AppPromos.",
      "",
      `Te escribo por ${name}. Tenemos que revisar el abono para que sigas usando AppPromos sin cortes.`,
      "Lo vemos por WhatsApp y lo resolvemos."
    ].join("\n");
  }
  if (reason === "seguimiento") {
    return [
      "Hola, soy Damian de AppPromos.",
      "",
      `Te escribo por ${name}. Quería ver si ya pudiste armar ofertas y mandar promos por WhatsApp.`,
      "Si querés, te ayudo a salir vendiendo rápido."
    ].join("\n");
  }
  return [
    "Hola, soy Damian de AppPromos.",
    "",
    `Te escribo por ${name} en AppPromos.`
  ].join("\n");
}

function whatsappUrl(row = {}, reason = "base") {
  const number = normalizeWhatsappNumber(businessPhone(row));
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappText(row, reason))}`;
}

function openWhatsapp(row = {}, reason = "base") {
  const url = whatsappUrl(row, reason);
  if (!url) {
    window.alert("Esta carnicería no tiene WhatsApp válido cargado.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function publicStorefrontUrl(row = {}) {
  return firstText(row.publicUrl, row.web?.publicUrl, row.operationalState?.publicUrl, row.meta?.publicUrl, "");
}

function supportMessageLibrary(row = {}) {
  const shop = businessName(row);
  const owner = businessOwner(row) === "Sin responsable" ? "" : businessOwner(row);
  const greeting = owner ? `Hola ${owner}, soy Damian de AppPromos.` : "¡Hola! Soy Damian de AppPromos.";
  const prices = Number(row.operationalState?.pricedProductCount || metricNumber(row, "maxPricedProductCount") || 0);
  const days = daysSince(commercialMetricValue(row, "lastCommercialActionAt") || lastActivityValue(row));
  const trialDays = daysUntil(dueValue(row));
  const url = publicStorefrontUrl(row);
  const messages = [
    ["welcome", "Bienvenida y solicitud de datos", ["¡Hola! 👋 Soy Damian, de AppPromos.", "", "Quiero acompañarte para que puedas poner tu carnicería online de manera simple.", "", "Para comenzar, ¿me pasás estos tres datos?", "", "• Tu nombre", "• El nombre de tu carnicería", "• Tu número de WhatsApp", "", "Con eso dejamos registrado tu contacto y podemos ayudarte con los próximos pasos. 🥩"].join("\n")],
    ["no_prices", "Todavía no cargó precios", `${greeting}\n\nVi que ${shop} todavía no cargó sus primeros precios. Si querés, te acompaño para dejar la vidriera lista en pocos minutos.`],
    ["few_prices", "Cargó entre 1 y 4 precios", `${greeting}\n\nYa empezaste a cargar precios en ${shop}. Tenés ${prices}; sumemos algunos más y dejamos una vidriera que ya puedas compartir.`],
    ["five_prices", "Llegó a 5 precios y se detuvo", `${greeting}\n\nYa cargaste ${prices} precios en ${shop}. Estás cerca de tener una vidriera completa. ¿Querés que te ayude con el próximo paso?`],
    ["almost_catalog", "Tiene entre 12 y 14 precios", `${greeting}\n\n¡Muy bien! ${shop} ya tiene ${prices} precios. Te falta muy poco para completar el catálogo inicial y empezar a moverlo por WhatsApp.`],
    ["ready_no_promo", "Catálogo listo, sin promo", `${greeting}\n\nLa vidriera de ${shop} ya está lista. El próximo paso es crear una primera promo para empezar a venderla por WhatsApp.`],
    ["promo_unpublished", "Promo creada, sin publicar", `${greeting}\n\nYa creaste una promo en ${shop}. Solo falta publicarla para que aparezca en tu vidriera y puedas compartirla.`],
    ["storefront_unshared", "Vidriera lista, sin compartir", `${greeting}\n\nTu vidriera ya está lista${url ? `: ${url}` : ""}. Compartila con tus clientes y podrán enviarte el pedido ordenado por WhatsApp.`],
    ["identity_incomplete", "Identidad incompleta", `${greeting}\n\nPodemos mejorar la presentación de ${shop} completando el logo y la foto del frente. Si querés, te indico dónde hacerlo.`],
    ["shared_no_visits", "Compartió, sin visitas", `${greeting}\n\nVi que compartiste la vidriera de ${shop}. Probemos volver a publicarla en estados y grupos para empezar a generar visitas.`],
    ["visits_no_orders", "Tiene visitas, sin pedidos", `${greeting}\n\nTu vidriera ya está recibiendo visitas. Ahora conviene destacar una promo clara para ayudar a que esas visitas se conviertan en pedidos.`],
    ["order_started", "Un cliente inició un pedido", `${greeting}\n\n¡Buena señal! Un cliente inició un pedido desde la vidriera de ${shop}. Sigamos compartiendo y manteniendo precios y promos actualizados.`],
    ["inactive", "Usuario inactivo", `${greeting}\n\nHace ${days ?? "varios"} días que no vemos actividad en ${shop}. ¿Necesitás ayuda para retomar precios, promos o la vidriera?`],
    ["trial_midpoint", "Mitad de la prueba", `${greeting}\n\nYa pasó la primera parte de la prueba de ${shop}. Quiero ayudarte a publicar, compartir la vidriera y comprobar que los pedidos lleguen bien por WhatsApp.`],
    ["trial_conversion", "Quedan 4 días o menos", `${greeting}\n\nA ${shop} le quedan ${trialDays ?? "pocos"} días de prueba. Si AppPromos ya te sirve, vemos el plan para que puedas seguir trabajando sin interrupciones.`],
    ["trial_last_day", "Vence hoy o mañana", `${greeting}\n\nLa prueba de ${shop} vence ${trialDays === 0 ? "hoy" : "mañana"}. Si querés continuar, te ayudo a activar el plan sin perder lo que cargaste.`],
    ["trial_expired", "Prueba vencida", `${greeting}\n\nLa prueba de ${shop} terminó. Todo lo que cargaste sigue guardado: podés entrar y consultar, y al activar un plan recuperás inmediatamente la posibilidad de guardar y publicar.`],
    ["no_response", "No respondió", `${greeting}\n\nTe escribo nuevamente para saber si pudiste avanzar con ${shop}. Cuando tengas un momento, respondeme y vemos juntos el próximo paso.`],
    ["resolved", "Cierre de ayuda", `${greeting}\n\nPerfecto, dejamos resuelto este paso de ${shop}. Si aparece otra duda, escribime y lo vemos.`]
  ];
  return messages.map(([key, label, text]) => ({ key, label, text }));
}

function recommendedSupportMessageKey(row = {}) {
  const events = COMMERCIAL_EVENTS_BY_BUSINESS.get(safeBusinessId(row)) || [];
  const hasVisit = events.some((event) => event.type === "external_storefront_visit");
  const hasOrder = events.some((event) => event.type === "public_order_whatsapp_started");
  const prices = Number(row.operationalState?.pricedProductCount || metricNumber(row, "maxPricedProductCount") || 0);
  if (row.followup?.status === "resolved") return "resolved";
  if (row.followup?.status === "no_response") return "no_response";
  if (hasOrder) return "order_started";
  if (hasVisit) return "visits_no_orders";
  if (isTrial(row)) {
    const daysToTrialEnd = daysUntil(dueValue(row));
    if (daysToTrialEnd !== null && daysToTrialEnd < 0) return "trial_expired";
    if (daysToTrialEnd !== null && daysToTrialEnd <= 1) return "trial_last_day";
    if (daysToTrialEnd !== null && daysToTrialEnd <= 4) return "trial_conversion";
    if (daysToTrialEnd !== null && daysToTrialEnd <= 7) return "trial_midpoint";
  }
  if ((daysSince(commercialMetricValue(row, "lastCommercialActionAt") || lastActivityValue(row)) ?? 0) >= 7) return "inactive";
  if (prices === 0) return "no_prices";
  if (prices < 5) return "few_prices";
  if (prices < 12) return "five_prices";
  if (prices < 15) return "almost_catalog";
  if (metricNumber(row, "offerCreatedCount") === 0) return "ready_no_promo";
  if (metricNumber(row, "offerPublishedCount") === 0) return "promo_unpublished";
  if (metricNumber(row, "webShareCount") === 0) return "storefront_unshared";
  return "shared_no_visits";
}

async function copySupportMessage(text = "") {
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    window.alert("Mensaje copiado.");
  } catch (error) {
    window.prompt("Copiá este mensaje:", text);
  }
}

function openSupportWhatsapp(row = {}, text = "") {
  const number = normalizeWhatsappNumber(businessPhone(row));
  if (!number) return window.alert("Esta carnicería no tiene WhatsApp válido cargado.");
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function toDate(value) {
  if (!value) return null;
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(value) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateTime(value) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function dateInput(value) {
  const date = toDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateTimeInput(value) {
  const date = toDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function daysUntil(value) {
  const date = toDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function daysSince(value) {
  const date = toDate(value);
  if (!date) return null;
  const now = Date.now();
  return Math.max(0, Math.floor((now - date.getTime()) / 86400000));
}

function billing(row = {}) {
  return row.billing && typeof row.billing === "object" ? row.billing : {};
}

function planKey(row = {}) {
  return String(billing(row).plan || "trial").toLowerCase();
}

function paymentKey(row = {}) {
  return String(billing(row).status || "active").toLowerCase();
}

function accessKey(row = {}) {
  if (isArchived(row)) return "archived";
  return String(row.status || "active").toLowerCase();
}

function selectedAttr(current, value) {
  return String(current || "all") === String(value) ? "selected" : "";
}

function optionList(options = [], current = "all") {
  return options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${selectedAttr(current, value)}>${escapeHtml(label)}</option>`).join("");
}

function dueValue(row = {}) {
  const b = billing(row);
  return b.nextPaymentDueAt || b.currentPeriodEnd || b.trialEndsAt || row.nextPaymentDueAt || row.currentPeriodEnd || "";
}

function lastActivityValue(row = {}) {
  const metrics = row.metrics || row.usage || row.activity || {};
  return metrics.lastActivityAt || row.lastActivityAt || row.lastLoginAt || row.updatedAt || row.createdAt || "";
}

function metricNumber(row = {}, ...keys) {
  const sources = [row.metrics, row.usage, row.activity, row.stats, row];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const raw = source[key];
      if (raw !== undefined && raw !== null && raw !== "") return Number(raw) || 0;
    }
  }
  return 0;
}

function metricOptionalNumber(row = {}, ...keys) {
  const sources = [row.metrics, row.usage, row.activity, row.stats, row];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const raw = source[key];
      if (raw === undefined || raw === null || raw === "") continue;
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    }
  }
  return null;
}

function trackingMetricDisplay(value) {
  return value === null ? "—" : String(value);
}

function isArchived(row = {}) {
  return row.archived === true || String(row.status || "").toLowerCase() === "archived";
}

function isTest(row = {}) {
  return row.isTestBusiness === true || String(row.adminStatus || "").toLowerCase() === "test";
}

function isTrial(row = {}) {
  return planKey(row) === "trial";
}

function paymentLabel(status = "active") {
  const map = {
    active: "Al día",
    paid: "Al día",
    pending: "Pendiente",
    overdue: "Vencido",
    suspended: "Suspendido",
    manual: "Bonificado"
  };
  return map[String(status || "active").toLowerCase()] || status || "—";
}

function accessLabel(status = "active") {
  const map = {
    active: "Activo",
    trial: "Prueba",
    suspended: "Suspendido",
    disabled: "Bloqueado",
    archived: "Archivado"
  };
  return map[String(status || "active").toLowerCase()] || status || "—";
}

function planLabel(plan = "trial") {
  const key = String(plan || "trial").toLowerCase();
  const map = {
    trial: "Prueba",
    basic: "ARRANQUE",
    arranque: "ARRANQUE",
    pro: "SALVADOR",
    salvador: "SALVADOR",
    dueno: "DUE\u00D1O",
    duenio: "DUE\u00D1O",
    "due\u00F1o": "DUE\u00D1O",
    owner: "DUE\u00D1O"
  };
  return map[key] || String(plan || "—").toUpperCase();
}

function chip(label, tone = "neutral") {
  return `<span class="admin-chip ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function accessChip(row = {}) {
  const key = accessKey(row);
  const tone = key === "active" ? "ok" : key === "trial" ? "warn" : key === "archived" ? "neutral" : "danger";
  return chip(accessLabel(key), tone);
}

function billingPaymentPresentation(row = {}) {
  const key = paymentKey(row);
  const plan = planKey(row);
  const days = daysUntil(dueValue(row));

  if (key === "manual") {
    return { label: "Bonificado", tone: "warn" };
  }

  if (key === "overdue") {
    return { label: "Vencido", tone: "danger" };
  }

  if (key === "suspended") {
    return { label: "Suspendido", tone: "danger" };
  }

  if (plan === "trial" && days !== null && days < 0 && ["active", "paid", "pending"].includes(key)) {
    return { label: "Prueba vencida", tone: "danger" };
  }

  if (plan !== "trial" && days !== null && days < 0 && Math.abs(days) <= 4 && ["active", "paid", "pending"].includes(key)) {
    return { label: "En gracia", tone: "warn" };
  }

  if (plan !== "trial" && days !== null && days <= -6 && ["active", "paid", "pending"].includes(key)) {
    return { label: "Pausa automática", tone: "danger" };
  }

  if (days !== null && days < 0 && key === "pending") {
    return { label: "Vencido", tone: "danger" };
  }

  if (days !== null && days < 0 && ["active", "paid"].includes(key)) {
    return { label: "Revisar vencimiento", tone: "warn" };
  }

  const tone = key === "active" || key === "paid" ? "ok" : key === "pending" ? "warn" : "danger";
  return { label: paymentLabel(key), tone };
}

function paymentChip(row = {}) {
  const visual = billingPaymentPresentation(row);
  return chip(visual.label, visual.tone);
}

function billingDuePresentation(row = {}) {
  const key = paymentKey(row);
  const due = dueValue(row);
  const days = daysUntil(due);

  if (key === "manual") {
    return { date: "—", detail: "Sin vencimiento mientras esté bonificado" };
  }

  if (!due || days === null) {
    return { date: "—", detail: "Sin fecha" };
  }

  if (days < 0) {
    const elapsed = Math.abs(days);
    const detail = planKey(row) !== "trial" && elapsed <= 4
      ? `Día ${elapsed} de 5 de gracia · todavía puede guardar`
      : planKey(row) !== "trial" && elapsed >= 6
        ? `${elapsed} días vencido · guardados pausados`
        : `${elapsed} día(s) vencido`;
    return { date: dateOnly(due), detail };
  }

  return {
    date: dateOnly(due),
    detail: `${days} día(s) para vencer`
  };
}

function planChip(row = {}) {
  const key = planKey(row);
  const tone = key === "trial" ? "warn" : key === "dueno" ? "admin" : "ok";
  return chip(planLabel(key), tone);
}

function adminChip(row = {}) {
  if (isArchived(row)) return chip("Archivada", "neutral");
  if (isTest(row)) return chip("TEST", "warn");
  return chip("Real", "ok");
}

function commercialMetricValue(row = {}, key = "") {
  const metrics = row.metrics && typeof row.metrics === "object" ? row.metrics : {};
  return metrics[key];
}

function hasLoadedPrices(row = {}) {
  const state = row.operationalState || {};
  if (state.hasLoadedPrices === true) return true;
  if (Number(state.pricedProductCount || 0) > 0) return true;
  return metricNumber(row, "priceSaveCount") > 0;
}
function commercialLastAt(row = {}) {
  return commercialMetricValue(row, "lastCommercialActionAt") || "";
}

function activationStage(row = {}) {
  const sellerWhatsapp = metricNumber(row, "sellerWhatsappCount");
  const offerPublished = metricNumber(row, "offerPublishedCount");
  const webShare = metricNumber(row, "webShareCount");
  const webOpened = commercialMetricValue(row, "firstWebOpenedAt");
  const priceSave = metricNumber(row, "priceSaveCount");

  if (sellerWhatsapp > 0 || offerPublished > 0) return { key: "selling", label: "Vendiendo", rank: 4 };
  if (webShare > 0) return { key: "sharing", label: "Compartiendo", rank: 3 };
  if (webOpened) return { key: "storefront", label: "Vidriera", rank: 2 };
  if (hasLoadedPrices(row)) return { key: "prices", label: "Precios", rank: 1 };
  return { key: "registered", label: "Registrada", rank: 0 };
}

function commercialActionLabel(type = "") {
  const labels = {
    price_save: "Guardó precios",
    offer_created: "Creó una promo",
    offer_published: "Publicó una promo",
    seller_whatsapp: "Abrió WhatsApp",
    web_share: "Compartió su web"
  };
  return labels[String(type || "")] || "Sin acción comercial";
}

function relativeCommercialAction(row = {}) {
  const at = commercialLastAt(row);
  if (!at && hasLoadedPrices(row)) return "Sin registro reciente";
  if (!at) return "Nunca";
  const days = daysSince(at);
  const label = commercialActionLabel(commercialMetricValue(row, "lastCommercialActionType"));
  if (days === 0) return `${label} · hoy`;
  if (days === 1) return `${label} · ayer`;
  return `${label} · hace ${days}d`;
}

function commercialStatus(row = {}) {
  const stage = activationStage(row);
  const commercialAt = commercialLastAt(row);
  const commercialDays = daysSince(commercialAt);
  const knownActivityAt = commercialMetricValue(row, "lastAppOpenAt") || lastActivityValue(row);
  const knownActivityDays = daysSince(knownActivityAt);

  if (stage.rank === 0) {
    if (knownActivityDays !== null && knownActivityDays < 7) {
      return { key: "activating", label: "Activándose", tone: "warn", reason: "Todavía no cargó precios", priority: 2 };
    }
    return { key: "attention", label: "Requiere atención", tone: "danger", reason: "Todavía no empezó a usar AppPromos", priority: 0 };
  }

  if (commercialDays !== null && commercialDays >= 14) {
    return { key: "attention", label: "Requiere atención", tone: "danger", reason: `Sin acción comercial hace ${commercialDays} días`, priority: 0 };
  }

  if (commercialDays !== null && commercialDays >= 7) {
    return { key: "risk", label: "En riesgo", tone: "warn", reason: `Se frenó hace ${commercialDays} días`, priority: 1 };
  }

  if (!commercialAt && knownActivityDays !== null && knownActivityDays >= 14) {
    return { key: "attention", label: "Requiere atenci\u00f3n", tone: "danger", reason: `Sin actividad conocida hace ${knownActivityDays} d\u00edas`, priority: 0 };
  }

  if (!commercialAt && knownActivityDays !== null && knownActivityDays >= 7) {
    return { key: "risk", label: "En riesgo", tone: "warn", reason: `Sin actividad conocida hace ${knownActivityDays} d\u00edas`, priority: 1 };
  }

  if (stage.rank >= 3) {
    return { key: "active", label: "Activa", tone: "ok", reason: "Uso comercial reciente", priority: 3 };
  }

  const reason = stage.key === "prices"
    ? "Ya cargó precios; falta avanzar con su vidriera"
    : "La vidriera está lista; falta compartir";
  return { key: "activating", label: "Activándose", tone: "warn", reason, priority: 2 };
}

function recommendedNextStep(row = {}) {
  const status = commercialStatus(row);
  const stage = activationStage(row);
  const commercialDays = daysSince(commercialLastAt(row));

  if (status.key === "attention" && stage.rank === 0) {
    return {
      tone: "danger",
      eyebrow: "Próximo paso recomendado",
      title: "Contactarla y ayudarla a empezar",
      text: "Todavía no cargó precios. Conviene escribirle y acompañarla a cargar sus primeros precios."
    };
  }

  if (["attention", "risk"].includes(status.key) && stage.rank > 0) {
    return {
      tone: status.key === "attention" ? "danger" : "warn",
      eyebrow: "Próximo paso recomendado",
      title: "Retomar contacto",
      text: commercialDays !== null
        ? `Hace ${commercialDays} días que no registra una acción comercial. Conviene escribirle y destrabar el próximo paso.`
        : "Conviene escribirle y destrabar el próximo paso comercial."
    };
  }

  if (stage.key === "registered") {
    return {
      tone: "warn",
      eyebrow: "Próximo paso recomendado",
      title: "Cargar los primeros precios",
      text: "Ayudala a cargar algunos precios para que empiece a construir su vidriera online."
    };
  }

  if (stage.key === "prices") {
    return {
      tone: "warn",
      eyebrow: "Próximo paso recomendado",
      title: "Abrir la vidriera online",
      text: "Ya tiene precios cargados. El siguiente objetivo es que vea su carnicería online y avance con la vidriera."
    };
  }

  if (stage.key === "storefront") {
    return {
      tone: "warn",
      eyebrow: "Próximo paso recomendado",
      title: "Compartir la web",
      text: "La vidriera ya está lista. Pedile que la comparta por WhatsApp para empezar a llevar clientes."
    };
  }

  if (stage.key === "sharing") {
    return {
      tone: "ok",
      eyebrow: "Próximo paso recomendado",
      title: "Dar el salto a la venta",
      text: "Ya compartió su web. Ayudala a crear o publicar su primera promo y moverla por WhatsApp."
    };
  }

  return {
    tone: "ok",
    eyebrow: "Próximo paso recomendado",
    title: "Seguir acompañando",
    text: "Ya está usando AppPromos comercialmente. Conviene seguir observando su actividad y ayudar cuando aparezca una traba."
  };
}

function matchesSearch(row = {}, query = "") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    businessName(row), businessOwner(row), businessEmail(row), businessPhone(row),
    businessLocation(row), row.businessId, row.ownerUid
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

function safeBusinessId(row = {}) {
  return escapeHtml(row.businessId || row.id || "");
}

function rowById(rows = [], id = "") {
  return rows.find((row) => String(row.businessId || row.id || "") === String(id || "")) || null;
}

function renderNav(activeView) {
  const tabs = [
    ["home", "Hoy"],
    ["clients", "Carnicerías"],
    ["billing", "Cobranzas"],
    ["more", "Más"]
  ];
  return `
    <div class="admin-nav admin-nav-top">
      ${tabs.map(([key, label]) => `<button type="button" data-admin-view="${key}" class="${activeView === key ? "active" : ""}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function renderBottomNav(activeView = "home", selectedRow = null) {
  const navStyle = "position:fixed!important;z-index:2147483646!important;left:50%!important;bottom:14px!important;transform:translateX(-50%)!important;display:grid!important;grid-template-columns:repeat(4,minmax(86px,1fr))!important;gap:5px!important;width:min(560px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;box-sizing:border-box!important;padding:7px!important;border:1px solid #d9d2c8!important;border-radius:18px!important;background:rgba(255,255,255,.98)!important;box-shadow:0 14px 38px rgba(0,0,0,.18)!important;";
  const itemStyle = "display:flex!important;visibility:visible!important;opacity:1!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;min-width:0!important;min-height:48px!important;padding:4px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#5b534b!important;font:900 11px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;text-decoration:none!important;cursor:pointer!important;box-sizing:border-box!important;";
  const activeStyle = "background:#1f1f1f!important;color:#fff!important;";
  if (selectedRow) {
    return `
      <nav class="admin-bottom-nav" style="${navStyle}" aria-label="Acciones de la carnicería">
        <a href="#" role="button" style="${itemStyle}" data-close-detail><span>←</span>Volver</a>
        <a href="#" role="button" style="${itemStyle}" data-open-support-whatsapp="${safeBusinessId(selectedRow)}"><span>◉</span>WhatsApp</a>
        <a href="#" role="button" style="${itemStyle}" data-scroll-admin="adminFollowup"><span>✓</span>Seguimiento</a>
        <a href="#" role="button" style="${itemStyle}" data-scroll-admin="adminExtra"><span>•••</span>Más</a>
      </nav>
    `;
  }
  const tabs = [
    ["home", "⌂", "Hoy"],
    ["clients", "▦", "Carnicerías"],
    ["billing", "$", "Cobranzas"],
    ["more", "•••", "Más"]
  ];
  const visibleActiveView = ["tracking", "users"].includes(activeView) ? "more" : activeView;
  return `
    <nav class="admin-bottom-nav" style="${navStyle}" aria-label="Navegación del Centro de Control">
      ${tabs.map(([key, icon, label]) => `<a href="#" role="button" data-admin-view="${key}" class="${visibleActiveView === key ? "active" : ""}" style="${itemStyle}${visibleActiveView === key ? activeStyle : ""}"><span>${icon}</span>${label}</a>`).join("")}
    </nav>
  `;
}

function realOperationalBusinesses(businesses = []) {
  return businesses.filter((row) => !isArchived(row) && !isTest(row));
}

function homeOperationalBusinesses(businesses = []) {
  const real = realOperationalBusinesses(businesses);
  if (real.length) return real;
  return businesses.filter((row) => !isArchived(row));
}

function followupNeedsAttention(row = {}) {
  const status = String(row.followup?.status || "");
  if (["pending", "no_response"].includes(status)) return true;
  const nextAt = toDate(row.followup?.nextContactAt);
  return Boolean(nextAt && nextAt.getTime() <= Date.now());
}

function renderQuickStats(businesses = []) {
  const rows = homeOperationalBusinesses(businesses);
  const statuses = rows.map((row) => commercialStatus(row));
  const active = statuses.filter((status) => status.key === "active").length;
  const attention = statuses.filter((status) => ["attention", "risk"].includes(status.key)).length;
  const followups = rows.filter(followupNeedsAttention).length;

  return `
    <div class="admin-kpis admin-control-kpis">
      <div><b>${attention}</b><span>Necesitan ayuda</span></div>
      <div><b>${followups}</b><span>Seguimientos</span></div>
      <div><b>${active}</b><span>Activas</span></div>
    </div>
  `;
}

function renderHome(businesses = [], state = {}) {
  const filter = state.homeFilter || "today";
  const query = state.homeSearch || "";
  const sourceRows = homeOperationalBusinesses(businesses);
  const rows = sourceRows
    .filter((row) => matchesSearch(row, query))
    .filter((row) => {
      const status = commercialStatus(row);
      if (filter === "today") return ["attention", "risk", "activating"].includes(status.key) || followupNeedsAttention(row);
      if (filter === "active") return status.key === "active";
      return true;
    })
    .sort((a, b) => {
      const aStatus = commercialStatus(a);
      const bStatus = commercialStatus(b);
      if (aStatus.priority !== bStatus.priority) return aStatus.priority - bStatus.priority;
      const aDate = toDate(commercialLastAt(a))?.getTime() || 0;
      const bDate = toDate(commercialLastAt(b))?.getTime() || 0;
      return aDate - bDate;
    });

  return `
    ${renderQuickStats(businesses)}
    <div class="admin-section-head admin-control-head">
      <div>
        <h3>A quién ayudar hoy</h3>
        <p>Primero aparece lo que podés resolver ahora.</p>
      </div>
      <div class="admin-filter-tabs">
        ${[["today", "Necesitan ayuda"], ["all", "Todas"], ["active", "Activas"]]
          .map(([key, label]) => `<button type="button" data-home-filter="${key}" class="${filter === key ? "active" : ""}">${label}</button>`).join("")}
      </div>
    </div>
    <div class="admin-control-search">
      <input id="adminHomeSearch" value="${escapeHtml(query)}" placeholder="Buscar carnicería" />
      <span>${rows.length} carnicería${rows.length === 1 ? "" : "s"}</span>
    </div>
    ${sourceRows.length && sourceRows.every(isTest) ? `<div class="admin-qa-note">Entorno QA: se muestran empresas TEST porque no hay carnicerías reales.</div>` : ""}
    <div class="admin-help-list">
      ${rows.map((row) => {
        const status = commercialStatus(row);
        const nextStep = recommendedNextStep(row);
        return `
          <article class="admin-help-card ${status.tone}">
            <div class="admin-help-main">
              <div class="admin-help-heading">
                <div><h4>${escapeHtml(businessName(row))}</h4><span>${escapeHtml(businessOwner(row))} · ${escapeHtml(businessLocation(row))}</span></div>
                ${chip(status.label, status.tone)}
              </div>
              <strong class="admin-help-problem">${escapeHtml(status.reason)}</strong>
              <p><b>Qué hacer:</b> ${escapeHtml(nextStep.title)}</p>
              <small>${escapeHtml(relativeCommercialAction(row))}</small>
            </div>
            <div class="admin-help-actions">
              <button type="button" class="primary-action" data-view-business="${safeBusinessId(row)}">Ayudar</button>
              <button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="seguimiento">WhatsApp</button>
            </div>
          </article>
        `;
      }).join("") || `<div class="admin-empty">No hay carnicerías que necesiten ayuda en este momento.</div>`}
    </div>
  `;
}

function renderSmallQueue(rows = [], emptyText = "Sin datos", whatsappReason = "base") {
  if (!rows.length) return `<div class="admin-empty">${escapeHtml(emptyText)}</div>`;
  return `
    <div class="admin-queue">
      ${rows.map((row) => {
        const status = commercialStatus(row);
        return `
          <div class="admin-queue-row">
            <div>
              <strong>${escapeHtml(businessName(row))}</strong>
              <span>${escapeHtml(status.reason)} · ${paymentLabel(paymentKey(row))} · ${planLabel(planKey(row))}</span>
            </div>
            <div class="admin-queue-actions">
              <button type="button" data-view-business="${safeBusinessId(row)}">Ver</button>
              <button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="${escapeHtml(whatsappReason)}">WhatsApp</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderClients(businesses = [], state = {}) {
  const query = state.search || "";
  const clientFilter = state.clientFilter || "all";
  const accessFilter = state.clientAccessFilter || "all";
  const planFilter = state.clientPlanFilter || "all";
  const paymentFilter = state.clientPaymentFilter || "all";

  const rows = businesses.filter((row) => {
    if (!matchesSearch(row, query)) return false;

    if (clientFilter === "test" && !isTest(row)) return false;
    if (clientFilter === "real" && isTest(row)) return false;
    if (clientFilter === "archived" && !isArchived(row)) return false;
    if (clientFilter === "active" && (isArchived(row) || accessKey(row) !== "active")) return false;

    if (accessFilter !== "all" && accessKey(row) !== accessFilter) return false;
    if (planFilter !== "all" && planKey(row) !== planFilter) return false;
    if (paymentFilter !== "all" && paymentKey(row) !== paymentFilter) return false;

    return true;
  });

  const planOptions = [["all", "Plan: todos"], ...ADMIN_PLANS.map((plan) => [plan, `Plan: ${planLabel(plan)}`])];
  const accessOptions = [
    ["all", "Acceso: todos"],
    ["active", "Acceso: activo"],
    ["trial", "Acceso: prueba"],
    ["suspended", "Acceso: pausado"],
    ["disabled", "Acceso: desactivado"],
    ["archived", "Acceso: archivado"]
  ];
  const paymentOptions = [
    ["all", "Pago: todos"],
    ["active", "Pago: al día"],
    ["pending", "Pago: pendiente"],
    ["overdue", "Pago: vencido"],
    ["suspended", "Pago: suspendido"],
    ["manual", "Pago: manual"]
  ];

  return `
    <div class="admin-directory-search">
      <input id="adminSearch" value="${escapeHtml(query)}" placeholder="Buscar por nombre, responsable, email, WhatsApp o localidad" />
    </div>
    <details class="admin-filter-disclosure">
      <summary>Filtros</summary>
      <div class="admin-toolbar-simple admin-client-toolbar">
        <select id="adminClientFilter" title="Tipo de cliente">
          <option value="all" ${selectedAttr(clientFilter, "all")}>Carnicerías: todas</option>
          <option value="active" ${selectedAttr(clientFilter, "active")}>Activas</option>
          <option value="real" ${selectedAttr(clientFilter, "real")}>Reales</option>
          <option value="test" ${selectedAttr(clientFilter, "test")}>Empresas TEST</option>
          <option value="archived" ${selectedAttr(clientFilter, "archived")}>Archivadas</option>
        </select>
        <select id="adminAccessFilter" title="Filtro por acceso">${optionList(accessOptions, accessFilter)}</select>
        <select id="adminPlanFilter" title="Filtro por plan">${optionList(planOptions, planFilter)}</select>
        <select id="adminPaymentFilter" title="Filtro por pago">${optionList(paymentOptions, paymentFilter)}</select>
      </div>
    </details>
    <div class="admin-results-note">${rows.length} de ${businesses.length} carnicerías</div>
    ${renderClientsTable(rows, "clients")}
  `;
}
function renderClientsTable(rows = [], source = "clients") {
  if (!rows.length) return `<div class="admin-empty">No hay carnicerías para mostrar.</div>`;
  return `
    <div class="admin-directory-list">
      ${rows.map((row) => {
        const status = commercialStatus(row);
        return `
          <article class="admin-directory-card ${isArchived(row) ? "archived" : ""}">
            <div class="admin-directory-main">
              <div class="admin-directory-title"><h4>${escapeHtml(businessName(row))}</h4>${adminChip(row)}</div>
              <p>${escapeHtml(businessOwner(row))} · ${escapeHtml(businessPhone(row) || "Sin WhatsApp")}</p>
              <small>${escapeHtml(businessLocation(row))} · ${escapeHtml(relativeCommercialAction(row))}</small>
              <div class="admin-mini-chips">${chip(status.label, status.tone)} ${planChip(row)} ${paymentChip(row)}</div>
              <span class="admin-directory-reason">${escapeHtml(status.reason)}</span>
            </div>
            <div class="admin-directory-actions">
              <button type="button" class="primary-action" data-view-business="${safeBusinessId(row)}">Ver</button>
              <button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="${source === "billing" ? "cobranza" : "base"}">WhatsApp</button>
              <button type="button" data-enter-business="${safeBusinessId(row)}">Entrar</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function billingBucket(row = {}) {
  const status = paymentKey(row);
  const days = daysUntil(dueValue(row));
  if (["overdue", "suspended"].includes(status) || (days !== null && days <= -5)) return "overdue";
  if (planKey(row) !== "trial" && days !== null && days < 0) return "pending";
  if (days !== null && days >= 0 && days <= 7) return "soon";
  if (["active", "paid", "manual"].includes(status)) return "ok";
  return "pending";
}

function renderBilling(businesses = [], state = {}) {
  const filter = state.billingFilter || "all";
  const rows = businesses.filter((row) => {
    const bucket = billingBucket(row);
    if (filter === "all") return true;
    return bucket === filter;
  });

  return `
    <div class="admin-section-head">
      <div>
        <h3>Cobranzas</h3>
        <p>Mercado Pago prepara el link. Vos supervisás y enviás WhatsApp manualmente.</p>
        <small>Backend local: ${escapeHtml(MP_BACKEND_URL)} · ciclo mes vencido · gracia hasta día 5 · pausa desde día 7.</small>
      </div>
      <div class="admin-filter-tabs">
        ${[
          ["all", "Todos"], ["overdue", "Vencidos"], ["soon", "A vencer"], ["ok", "Al día"], ["pending", "Pendientes"]
        ].map(([key, label]) => `<button type="button" data-billing-filter="${key}" class="${filter === key ? "active" : ""}">${label}</button>`).join("")}
      </div>
    </div>

    <div class="admin-billing-list">
      ${rows.map((row) => {
        const duePresentation = billingDuePresentation(row);
        const mpLink = mpLinkForBusiness(row);
        const hasMpLink = Boolean(mpPaymentUrl(mpLink));
        const amount = mpAmount(mpLink);
        const period = firstText(mpLink?.calculation?.period_key, mpLink?.period_key, "período");
        const phone = businessPhone(row) || "Sin WhatsApp";
        return `
          <section class="admin-billing-card ${hasMpLink ? "has-link" : ""}">
            <div class="admin-billing-client">
              <div>
                <strong>${escapeHtml(businessName(row))}</strong>
                <span>${escapeHtml(businessOwner(row))} · ${escapeHtml(phone)}</span>
              </div>
              <div class="admin-mini-chips">${planChip(row)} ${paymentChip(row)}</div>
            </div>

            <div class="admin-billing-info">
              <div>
                <b>Vence</b>
                <span>${escapeHtml(duePresentation.date)}</span>
                <small>${escapeHtml(duePresentation.detail)}</small>
              </div>
              <div>
                <b>Mercado Pago</b>
                ${hasMpLink
                  ? `${chip("Link listo", "ok")}<small>${escapeHtml(formatMoney(amount))} · ${escapeHtml(period)}</small>`
                  : `${chip("Sin link", "warn")}<small>Generalo desde AppPromos.</small>`}
              </div>
            </div>

            <div class="admin-billing-actions">
              <button type="button" class="primary-action" data-generate-mp-link="${safeBusinessId(row)}">Generar link MP</button>
              <button type="button" data-load-mp-link="${safeBusinessId(row)}">Último link</button>
              <button type="button" data-copy-mp-link="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Copiar link</button>
              <button type="button" class="success-action" data-send-mp-whatsapp="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Enviar cobro</button>
              <button type="button" class="muted-action" data-mark-payment="${safeBusinessId(row)}" ${isTrial(row) ? 'disabled title="Elegí un plan pago desde el detalle"' : ""}>Pago manual</button>
              <button type="button" data-view-business="${safeBusinessId(row)}">Ver</button>
            </div>
          </section>
        `;
      }).join("") || `<div class="admin-empty">No hay clientes en este filtro.</div>`}
    </div>
  `;
}

function trackingBucket(row = {}) {
  if (isTest(row)) return "demo";
  if (isTrial(row)) return "trial";
  return "prod";
}

function renderTracking(businesses = [], state = {}) {
  const filter = state.trackingFilter || "all";
  const rows = businesses.filter((row) => filter === "all" || trackingBucket(row) === filter);

  return `
    <div class="admin-section-head">
      <div>
        <h3>Tracking</h3>
        <p>Uso comercial simple: actividad, ofertas, WhatsApp y salud del cliente.</p>
        <small>— = sin historial disponible en Tracking V1. No significa cero actividad histórica.</small>
      </div>
      <div class="admin-filter-tabs">
        ${[["all", "Todos"], ["demo", "Demo / TEST"], ["trial", "Prueba"], ["prod", "Producción"]]
          .map(([key, label]) => `<button type="button" data-tracking-filter="${key}" class="${filter === key ? "active" : ""}">${label}</button>`).join("")}
      </div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Carnicería</th>
            <th>Estado</th>
            <th>Última actividad</th>
            <th>Ofertas</th>
            <th>WhatsApps</th>
            <th>Precios</th>
            <th>Salud</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const status = commercialStatus(row);
            const offers = metricOptionalNumber(row, "offerCreatedCount", "offersCreatedCount", "savedOffersCount", "demoOfferCreatedCount");
            const whatsapp = metricOptionalNumber(row, "sellerWhatsappCount", "whatsappSentCount", "demoWhatsappClickedCount", "whatsappClicks");
            const prices = metricOptionalNumber(row, "priceSaveCount", "priceUpdatesCount", "pricesUpdatedCount", "itemsUpdatedCount", "productsUpdatedCount");
            return `
              <tr>
                <td><strong>${escapeHtml(businessName(row))}</strong><small>${escapeHtml(businessEmail(row))}</small></td>
                <td>${adminChip(row)} ${planChip(row)}</td>
                <td>${escapeHtml(dateTime(lastActivityValue(row)))}</td>
                <td>${escapeHtml(trackingMetricDisplay(offers))}</td>
                <td>${escapeHtml(trackingMetricDisplay(whatsapp))}</td>
                <td>${escapeHtml(trackingMetricDisplay(prices))}</td>
                <td>${chip(status.label, status.tone)}<small>${escapeHtml(status.reason)}</small></td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" data-view-business="${safeBusinessId(row)}">Ver</button>
                    <button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="seguimiento">Escribir</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="8"><div class="admin-empty">No hay clientes en este filtro.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderUsers(users = [], businesses = []) {
  if (!users.length) return `<div class="admin-empty">No hay usuarios cargados.</div>`;
  const byBusiness = new Map(businesses.map((b) => [String(b.businessId || ""), b]));
  return `
    <div class="admin-section-head">
      <div><h3>Usuarios</h3><p>Quién entra a AppPromos. Las contraseñas no se muestran nunca.</p></div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Usuario</th><th>Rol</th><th>Carnicería</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          ${users.map((user) => {
            const business = byBusiness.get(String(user.businessId || ""));
            const disabled = user.disabled === true || String(user.status || "").toLowerCase() === "disabled";
            return `
              <tr>
                <td><strong>${escapeHtml(user.email || "Sin email")}</strong><small>${escapeHtml(user.displayName || "Sin nombre")} · UID ${escapeHtml(shortId(user.uid))}</small></td>
                <td>${escapeHtml(user.role || "client")}</td>
                <td>${business ? escapeHtml(businessName(business)) : escapeHtml(user.businessId || "Sin carnicería")}</td>
                <td>${chip(disabled ? "Desactivado" : "Activo", disabled ? "danger" : "ok")}</td>
                <td>
                  ${disabled
                    ? `<button type="button" data-enable-user="${escapeHtml(user.uid || "")}">Reactivar</button>`
                    : `<button type="button" data-disable-user="${escapeHtml(user.uid || "")}">Desactivar</button>`}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function acquisitionData(row = {}) {
  const value = row.acquisition && typeof row.acquisition === "object"
    ? row.acquisition
    : {};

  return {
    source: String(value.utm_source || "").trim(),
    medium: String(value.utm_medium || "").trim(),
    campaign: String(value.utm_campaign || "").trim(),
    content: String(value.utm_content || "").trim()
  };
}

function campaignDisplayName(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "Sin campaña";
  return clean.replace(/_/g, " ").replace(/\bsep26\b/gi, "Sep26").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function adDisplayName(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "Sin anuncio";
  const match = clean.match(/^video[_-]?(\d+)$/i);
  if (match) return `Video ${match[1]}`;
  return clean.replace(/_/g, " ");
}

function sourceDisplayName(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "Origen desconocido";
  if (clean.toLowerCase() === "meta") return "Meta";
  return clean;
}

function acquisitionOriginLabel(row = {}) {
  const acquisition = acquisitionData(row);
  const hasAttribution = Object.values(acquisition).some(Boolean);
  if (!hasAttribution) return "Sin atribución";
  const source = sourceDisplayName(acquisition.source);
  return acquisition.content ? `${source} · ${adDisplayName(acquisition.content)}` : source;
}

function renderCampaigns(businesses = []) {
  const realBusinesses = businesses.filter((row) => !isTest(row));
  const attributed = realBusinesses.filter((row) => Object.values(acquisitionData(row)).some(Boolean));
  const unattributedCount = realBusinesses.length - attributed.length;
  const groups = new Map();

  attributed.forEach((row) => {
    const acquisition = acquisitionData(row);
    const key = [acquisition.campaign || "sin_campaign", acquisition.content || "sin_content", acquisition.source || "sin_source"].join("|");
    if (!groups.has(key)) groups.set(key, { campaign: acquisition.campaign, content: acquisition.content, source: acquisition.source, businesses: [] });
    groups.get(key).businesses.push(row);
  });

  const rows = Array.from(groups.values()).sort((a, b) => b.businesses.length - a.businesses.length);
  return `
    <div class="admin-section-head"><div><h3>Campañas</h3><p>Qué anuncios están creando carnicerías reales.</p></div></div>
    <div class="admin-home-grid">
      <section class="admin-panel-card"><h3>${attributed.length}</h3><p>Altas con origen identificado</p></section>
      <section class="admin-panel-card"><h3>${unattributedCount}</h3><p>Altas sin atribución</p></section>
      <section class="admin-panel-card"><h3>${realBusinesses.length}</h3><p>Carnicerías reales totales</p></section>
    </div>
    ${rows.length ? `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Campaña</th><th>Anuncio</th><th>Origen</th><th>Altas</th><th>Carnicerías</th></tr></thead>
        <tbody>${rows.map((group) => `
          <tr><td><strong>${escapeHtml(campaignDisplayName(group.campaign))}</strong></td><td>${escapeHtml(adDisplayName(group.content))}</td><td>${escapeHtml(sourceDisplayName(group.source))}</td><td><strong>${group.businesses.length}</strong></td><td>${group.businesses.map((row) => escapeHtml(businessName(row))).join("<br>")}</td></tr>
        `).join("")}</tbody>
      </table></div>
    ` : `<div class="admin-empty">Todavía no hay altas provenientes de campañas. Las nuevas carnicerías con UTM aparecerán automáticamente acá.</div>`}
  `;
}

function renderMore(businesses = []) {
  const realCount = businesses.filter((b) => !isTest(b)).length;
  return `
    <div class="admin-home-grid">
      <section class="admin-panel-card">
        <h3>Consultas administrativas</h3>
        <p>Información que no necesitás para el trabajo diario.</p>
        <div class="admin-more-links">
          <button type="button" data-admin-view="campaigns"><strong>Campañas</strong><span>Altas por anuncio y origen</span></button>
          <button type="button" data-admin-view="tracking"><strong>Tracking</strong><span>Embudo y métricas comerciales</span></button>
          <button type="button" data-admin-view="users"><strong>Usuarios</strong><span>Accesos y cuentas registradas</span></button>
        </div>
      </section>
      <section class="admin-panel-card">
        <h3>Herramientas de base</h3>
        <p>Acciones poco frecuentes. Usarlas con cuidado.</p>
        <div class="admin-row-actions left">
          <button type="button" data-mark-current-base-test ${realCount ? "" : "disabled"}>Marcar base actual como TEST</button>
        </div>
        <small>${realCount ? `Hay ${realCount} empresa(s) sin marca TEST.` : "La base visible ya parece marcada como TEST."}</small>
      </section>
      <section class="admin-panel-card">
        <h3>Regla de trabajo</h3>
        <p>Clientes se archivan. Empresas TEST se pueden clonar/eliminar. Usuarios se desactivan, no se borran desde el frontend.</p>
      </section>
    </div>
  `;
}


function accountEstimatedMonthlyAmount(row = {}) {
  const key = planKey(row);
  const amounts = {
    trial: 0,
    basic: 19999,
    arranque: 19999,
    pro: 34999,
    salvador: 34999,
    dueno: 54999,
    duenio: 54999,
    "due\u00f1o": 54999,
    owner: 54999
  };
  return Number(amounts[key] || 0);
}

function accountMovementDate(value, fallback = "\u2014") {
  return dateOnly(value) || fallback;
}

function buildAccountLedgerRows(row = {}, persistedMovements = []) {
  const realMovements = Array.isArray(persistedMovements) ? persistedMovements.filter(Boolean) : [];
  if (realMovements.length) {
    let runningBalance = 0;
    return realMovements
      .slice()
      .sort((a, b) => String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || "")))
      .map((item) => {
        const debit = Number(item.debit || 0) || 0;
        const credit = Number(item.credit || 0) || 0;
        runningBalance = item.balanceAfter !== undefined && item.balanceAfter !== null
          ? Number(item.balanceAfter || 0) || 0
          : Math.max(0, runningBalance + debit - credit);
        return {
          date: accountMovementDate(item.date || item.createdAt || item.createdAtIso),
          movement: firstText(item.description, item.movement, item.type, "Movimiento de cuenta corriente"),
          debit,
          credit,
          balance: runningBalance
        };
      });
  }

  const b = billing(row);
  const link = mpLinkForBusiness(row);
  const hasLink = Boolean(mpPaymentUrl(link));
  const payment = paymentKey(row);
  const due = dueValue(row);
  const lastPaymentAt = b.lastPaymentAt || row.lastPaymentAt || null;
  const linkAmount = mpAmount(link);
  const estimatedAmount = accountEstimatedMonthlyAmount(row);
  const period = firstText(link?.calculation?.period_key, link?.period_key, "per\u00edodo actual");

  const rows = [];
  let balance = 0;

  const shouldShowDebit = hasLink || ["pending", "overdue", "suspended"].includes(payment);
  const debitAmount = Number(linkAmount || (shouldShowDebit ? estimatedAmount : 0) || 0);

  if (debitAmount > 0) {
    balance += debitAmount;
    rows.push({
      date: accountMovementDate(link?.raw?.created_at || link?.created_at || due),
      movement: hasLink ? `Link Mercado Pago generado · ${period}` : `Abono ${planLabel(planKey(row))} pendiente`,
      debit: debitAmount,
      credit: 0,
      balance
    });
  }

  if (lastPaymentAt) {
    const creditAmount = Number(debitAmount || estimatedAmount || 0);
    balance = Math.max(0, balance - creditAmount);
    rows.push({
      date: accountMovementDate(lastPaymentAt),
      movement: payment === "manual" ? "Pago / bonificaci\u00f3n manual registrada" : "Pago manual registrado",
      debit: 0,
      credit: creditAmount,
      balance
    });
  }

  if (!rows.length) {
    rows.push({
      date: "\u2014",
      movement: "Sin movimientos de cuenta corriente registrados todav\u00eda",
      debit: 0,
      credit: 0,
      balance: 0
    });
  }

  return rows;
}

function renderAccountLedger(row = {}, persistedMovements = []) {
  const b = billing(row);
  const link = mpLinkForBusiness(row);
  const hasLink = Boolean(mpPaymentUrl(link));
  const amount = mpAmount(link);
  const period = firstText(link?.calculation?.period_key, link?.period_key, "\u2014");
  const due = dateOnly(dueValue(row)) || "Sin fecha";
  const lastPayment = dateTime(b.lastPaymentAt || row.lastPaymentAt) || "Sin pago registrado";
  const rows = buildAccountLedgerRows(row, persistedMovements);
  const hasPersistedMovements = Array.isArray(persistedMovements) && persistedMovements.length > 0;
  const lastBalance = rows.length ? Number(rows[rows.length - 1].balance || 0) : 0;

  return `
    <div class="admin-ledger-box">
      <div class="admin-ledger-summary">
        <div><span>Estado</span><strong>${escapeHtml(paymentLabel(paymentKey(row)))}</strong><small>${escapeHtml(planLabel(planKey(row)))}</small></div>
        <div><span>Vencimiento</span><strong>${escapeHtml(due)}</strong><small>Pr\u00f3ximo control</small></div>
        <div><span>\u00daltimo pago</span><strong>${escapeHtml(lastPayment)}</strong><small>Registro del cliente</small></div>
        <div><span>Saldo visual</span><strong>${escapeHtml(formatMoney(lastBalance))}</strong><small>No contable todav\u00eda</small></div>
      </div>

      <div class="admin-ledger-link-note">
        Mercado Pago: ${hasLink ? `link listo · ${escapeHtml(formatMoney(amount))} · ${escapeHtml(period)}` : "sin link cargado en esta sesi\u00f3n"}
      </div>

      <div class="admin-ledger-table-wrap">
        <table class="admin-ledger-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>D\u00e9bito</th>
              <th>Cr\u00e9dito</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((item) => `
              <tr>
                <td>${escapeHtml(item.date)}</td>
                <td>${escapeHtml(item.movement)}</td>
                <td>${item.debit ? escapeHtml(formatMoney(item.debit)) : "\u2014"}</td>
                <td>${item.credit ? escapeHtml(formatMoney(item.credit)) : "\u2014"}</td>
                <td><strong>${escapeHtml(formatMoney(item.balance || 0))}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <small class="admin-ledger-help">Vista m\u00ednima visual. Los movimientos persistidos reales quedan para el pr\u00f3ximo hito.</small>
    </div>
  `;
}

function commercialEventDetail(event = {}) {
  const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
  if (event.type === "price_milestone_reached") {
    return `${Number(metadata.milestone || 0)} precios cargados`;
  }
  if (event.type === "price_save" && Number(metadata.pricedProductCount || 0) > 0) {
    return `${Number(metadata.pricedProductCount)} productos con precio`;
  }
  if (String(event.type || "").startsWith("storefront_theme_") && metadata.theme) {
    return `Estilo: ${String(metadata.theme)}`;
  }
  if (event.type === "seller_whatsapp" && event.source) {
    return `Origen: ${String(event.source).replaceAll("_", " ")}`;
  }
  if (event.type === "public_order_whatsapp_started") {
    const count = Number(metadata.itemCount || 0);
    const parts = [];
    if (count > 0) parts.push(`${count} ítem${count === 1 ? "" : "s"}`);
    if (metadata.containsOffer === true) parts.push("incluye promo");
    if (metadata.containsDailyOffer === true) parts.push("incluye Promo del día");
    return parts.join(" · ");
  }
  if (event.type === "external_storefront_visit") {
    return "Señal anónima · sin datos del visitante";
  }
  if (event.type === "manual_followup_updated") {
    const status = FOLLOWUP_STATUS_OPTIONS.find(([key]) => key === event.status)?.[1] || event.status;
    return [status, event.nextAction, event.nextContactAt ? `próximo: ${dateTime(event.nextContactAt)}` : ""]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

function renderCommercialTimeline(businessId = "") {
  const events = COMMERCIAL_EVENTS_BY_BUSINESS.get(businessId);
  if (!events) {
    return `<div class="admin-empty">Cargando línea de tiempo...</div>`;
  }
  if (!events.length) {
    return `<div class="admin-empty">Todavía no hay eventos V12.28-A1 para esta carnicería. Los contadores históricos continúan disponibles arriba.</div>`;
  }
  return `
    <ol class="admin-commercial-timeline">
      ${events.map((event) => {
        const detail = commercialEventDetail(event);
        return `
          <li>
            <span class="admin-timeline-dot" aria-hidden="true"></span>
            <div>
              <strong>${escapeHtml(COMMERCIAL_EVENT_LABELS[event.type] || event.type || "Evento comercial")}</strong>
              <span>${escapeHtml(dateTime(event.occurredAt || event.createdAt))}${detail ? ` · ${escapeHtml(detail)}` : ""}</span>
            </div>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

function renderPublicImpact(businessId = "") {
  const summary = PUBLIC_SIGNAL_SUMMARY_BY_BUSINESS.get(businessId);
  if (!summary) {
    return `<section class="admin-public-impact"><div class="admin-empty">Cargando resultados de la vidriera...</div></section>`;
  }
  const conversion = Number(summary.conversionPercent || 0);
  return `
    <section class="admin-public-impact" aria-label="Resultados de la vidriera pública">
      <div class="admin-impact-heading">
        <div><span class="admin-eyebrow">Resultados de la vidriera</span><h3>Qué está pasando afuera</h3></div>
        <small>Señales anónimas registradas por navegador y día.</small>
      </div>
      <div class="admin-impact-grid">
        <div><strong>${Number(summary.visitsLast7Days || 0)}</strong><span>Visitas · 7 días</span><small>Última: ${escapeHtml(dateTime(summary.lastVisitAt))}</small></div>
        <div><strong>${Number(summary.visitsTotal || 0)}</strong><span>Visitas registradas</span><small>Desde A2</small></div>
        <div><strong>${Number(summary.orderStartsTotal || 0)}</strong><span>Pedidos iniciados</span><small>${Number(summary.orderStartsLast7Days || 0)} en 7 días</small></div>
        <div><strong>${conversion}%</strong><span>Conversión aproximada</span><small>Pedidos ÷ visitas</small></div>
      </div>
    </section>
  `;
}


function renderDetail(row = {}) {
  const status = commercialStatus(row);
  const stage = activationStage(row);
  const b = billing(row);
  const metrics = row.metrics && typeof row.metrics === "object" ? row.metrics : {};
  const operationalState = row.operationalState && typeof row.operationalState === "object" ? row.operationalState : {};
  const internalNote = firstText(row.internalNote, row.adminNote, row.commercialNote, row.notes?.internal, row.admin?.note, "");
  const followup = row.followup && typeof row.followup === "object" ? row.followup : {};
  const supportMessages = supportMessageLibrary(row);
  const recommendedMessageKey = recommendedSupportMessageKey(row);
  const recommendedMessage = supportMessages.find((item) => item.key === recommendedMessageKey) || supportMessages[0];
  const modules = { ...DEFAULT_MODULES, ...(row.modules || {}) };

  const pricesLoaded = hasLoadedPrices(row);
  const webOpened = Boolean(commercialMetricValue(row, "firstWebOpenedAt"));
  const webShared = metricNumber(row, "webShareCount") > 0;
  const selling = metricNumber(row, "offerPublishedCount") > 0 || metricNumber(row, "sellerWhatsappCount") > 0;

  const appOpenCount = metricNumber(row, "appOpenCount");
  const priceSaveCount = metricNumber(row, "priceSaveCount");
  const offerCreatedCount = metricNumber(row, "offerCreatedCount");
  const offerPublishedCount = metricNumber(row, "offerPublishedCount");
  const sellerWhatsappCount = metricNumber(row, "sellerWhatsappCount");
  const webShareCount = metricNumber(row, "webShareCount");

  const yesNoChip = (value) => value ? chip("Sí", "ok") : chip("No", "neutral");
  const nextStep = recommendedNextStep(row);
  const acquisition = acquisitionData(row);

  return `
    <div class="admin-detail-page admin-operational-detail">
      <section class="admin-panel-card">
        <h3>Adquisición</h3>
        <p><strong>Origen:</strong> ${escapeHtml(acquisitionOriginLabel(row))}</p>
        <p><strong>Campaña:</strong> ${escapeHtml(acquisition.campaign ? campaignDisplayName(acquisition.campaign) : "Sin atribución")}</p>
      </section>
      <div class="admin-detail-top">
        <button type="button" data-close-detail>← Centro de Control</button>
        <div>
          <h3>${escapeHtml(businessName(row))}</h3>
          <p>${escapeHtml(businessOwner(row))} · ${escapeHtml(businessPhone(row) || "Sin WhatsApp")} · ${escapeHtml(businessLocation(row))}</p>
        </div>
        <div class="admin-mini-chips">
          ${chip(status.label, status.tone)}
          ${chip(stage.label, stage.rank >= 3 ? "ok" : stage.rank > 0 ? "warn" : "neutral")}
          ${planChip(row)}
          ${paymentChip(row)}
        </div>
      </div>


      <section class="admin-panel-card admin-next-step ${nextStep.tone}">
        <div class="admin-next-step-copy">
          <span class="admin-eyebrow">${escapeHtml(nextStep.eyebrow)}</span>
          <h3>${escapeHtml(nextStep.title)}</h3>
          <p>${escapeHtml(nextStep.text)}</p>
        </div>
        <div class="admin-next-step-actions">
          <button type="button" class="primary-action" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="seguimiento">WhatsApp</button>
          <button type="button" data-enter-business="${safeBusinessId(row)}">Entrar a la carnicería</button>
        </div>
      </section>

      ${renderPublicImpact(String(row.businessId || row.id || ""))}

      <div class="admin-detail-grid-real admin-operational-grid">
        <section id="adminFollowup" class="admin-panel-card note admin-followup-card">
          <h3>Resolver y hacer seguimiento</h3>
          <p class="admin-card-help">Registrá solamente lo necesario para saber qué pasó y qué hacer después.</p>
          <div class="admin-form-grid admin-followup-grid">
            <label>Estado<select data-followup-status>${FOLLOWUP_STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${String(followup.status || "pending") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            <label>Volver a contactar<input type="datetime-local" data-followup-next-at value="${escapeHtml(dateTimeInput(followup.nextContactAt))}" /></label>
            <label class="admin-form-wide">Qué pasó<input type="text" data-followup-outcome maxlength="240" value="${escapeHtml(followup.outcome || "")}" placeholder="Ej.: respondió y necesita ayuda" /></label>
            <label class="admin-form-wide">Qué hago después<input type="text" data-followup-next-action maxlength="240" value="${escapeHtml(followup.nextAction || "")}" placeholder="Ej.: ayudarlo a compartir su vidriera" /></label>
          </div>
          <details class="admin-inline-details">
            <summary>Agregar nota interna</summary>
            <label class="admin-followup-note">Nota<textarea data-detail-note rows="3" maxlength="1000" placeholder="Contexto adicional...">${escapeHtml(followup.note || internalNote)}</textarea></label>
          </details>
          <div class="admin-row-actions left">
            <button type="button" class="primary-action" data-save-followup="${safeBusinessId(row)}">Guardar seguimiento</button>
          </div>
        </section>

        <section class="admin-panel-card admin-support-message-card">
          <h3>Mensaje para WhatsApp</h3>
          <p class="admin-card-help">El sistema sugiere uno. Podés elegir otro o editarlo antes de abrir WhatsApp.</p>
          <label>Situación
            <select data-support-message-select>
              ${supportMessages.map((item) => `<option value="${escapeHtml(item.key)}" ${item.key === recommendedMessage.key ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
          </label>
          <textarea data-support-message-text rows="7">${escapeHtml(recommendedMessage.text)}</textarea>
          <div class="admin-row-actions left">
            <button type="button" data-copy-support-message="${safeBusinessId(row)}">Copiar</button>
            <button type="button" class="primary-action" data-open-support-whatsapp="${safeBusinessId(row)}">Abrir WhatsApp</button>
          </div>
          <small class="admin-detail-note">Abrir WhatsApp no marca automáticamente que hubo contacto.</small>
        </section>

        <details id="adminExtra" class="admin-detail-disclosure">
          <summary><strong>Actividad y datos de la carnicería</strong><span>Ver métricas, contacto y configuración</span></summary>
          <div class="admin-secondary-grid">
        <section class="admin-panel-card">
          <h3>Activación</h3>
          <p class="admin-card-help">Qué tan lejos llegó esta carnicería dentro del circuito comercial.</p>
          <dl class="admin-dl admin-activation-list">
            <dt>Etapa</dt><dd>${chip(stage.label, stage.rank >= 3 ? "ok" : stage.rank > 0 ? "warn" : "neutral")}</dd>
            <dt>Precios</dt><dd>${yesNoChip(pricesLoaded)}</dd>
            <dt>Vidriera</dt><dd>${yesNoChip(webOpened)}</dd>
            <dt>Compartió web</dt><dd>${yesNoChip(webShared)}</dd>
            <dt>Vendiendo</dt><dd>${yesNoChip(selling)}</dd>
          </dl>
        </section>

        <section class="admin-panel-card">
          <h3>Actividad</h3>
          <p class="admin-card-help">Actividad real registrada desde Tracking Comercial V1.</p>
          <dl class="admin-dl">
            <dt>Última acción</dt><dd>${escapeHtml(relativeCommercialAction(row))}</dd>
            ${(() => {
              const trackedAppOpen = commercialMetricValue(row, "lastAppOpenAt");
              return trackedAppOpen
                ? `<dt>Última apertura</dt><dd>${escapeHtml(dateTime(trackedAppOpen))}</dd>`
                : `<dt>Última actividad conocida</dt><dd>${escapeHtml(dateTime(lastActivityValue(row)))}</dd>`;
            })()}
            <dt>Aperturas app</dt><dd>${appOpenCount}</dd>
            <dt>Guardados precios</dt><dd>${priceSaveCount}</dd>
            <dt>Promos creadas</dt><dd>${offerCreatedCount}</dd>
            <dt>Promos publicadas</dt><dd>${offerPublishedCount}</dd>
            <dt>WhatsApp vendedor</dt><dd>${sellerWhatsappCount}</dd>
            <dt>Web compartida</dt><dd>${webShareCount}</dd>
          </dl>
          <small class="admin-detail-note">Los negocios anteriores a Tracking V1 pueden tener estado real sin historial completo.</small>
        </section>

        <section class="admin-panel-card">
          <h3>Estado actual</h3>
          <p class="admin-card-help">Lo que existe hoy en la carnicería, independientemente del historial de tracking.</p>
          <dl class="admin-dl">
            <dt>Productos</dt><dd>${Number(operationalState.productCount || 0)}</dd>
            <dt>Con precio</dt><dd>${Number(operationalState.pricedProductCount || 0)}</dd>
            <dt>Activos con precio</dt><dd>${Number(operationalState.activePricedProductCount || 0)}</dd>
            <dt>Última actividad app</dt><dd>${escapeHtml(dateTime(lastActivityValue(row)))}</dd>
          </dl>
        </section>

        <section class="admin-panel-card">
          <h3>Datos de la carnicería</h3>
          <dl class="admin-dl">
            <dt>Responsable</dt><dd>${escapeHtml(businessOwner(row))}</dd>
            <dt>Email</dt><dd>${escapeHtml(businessEmail(row))}</dd>
            <dt>WhatsApp</dt><dd>${escapeHtml(businessPhone(row) || "Sin WhatsApp")}</dd>
            <dt>Localidad</dt><dd>${escapeHtml(businessLocation(row))}</dd>
            <dt>Dirección</dt><dd>${escapeHtml(firstText(row.direccion, row.address, row.meta?.direccion, row.meta?.address, "—"))}</dd>
            <dt>ID técnico</dt><dd>${escapeHtml(row.businessId || "—")}</dd>
          </dl>
        </section>

        <section class="admin-panel-card important admin-account-operational">
          <h3>Cuenta y acceso</h3>
          <p class="admin-card-help">La situación comercial se mantiene separada de pago y acceso.</p>
          <div class="admin-account-chips">${planChip(row)} ${paymentChip(row)} ${accessChip(row)}</div>
          <div class="admin-form-grid">
            <label>Plan<select data-detail-plan>${ADMIN_PLANS.map((plan) => `<option value="${escapeHtml(plan)}" ${String(plan) === String(b.plan || "trial") ? "selected" : ""}>${escapeHtml(planLabel(plan))}</option>`).join("")}</select></label>
            <label>Pago<select data-detail-payment>${PAYMENT_STATUSES.map((paymentStatus) => `<option value="${escapeHtml(paymentStatus)}" ${String(paymentStatus) === String(b.status || "active") ? "selected" : ""}>${escapeHtml(paymentLabel(paymentStatus))}</option>`).join("")}</select></label>
            <label>Vence<input type="date" data-detail-due value="${escapeHtml(dateInput(dueValue(row)))}" /></label>
            <label>Acceso<select data-detail-access>${ACCESS_STATUSES.map((accessStatus) => `<option value="${escapeHtml(accessStatus)}" ${String(accessStatus) === accessKey(row) ? "selected" : ""}>${escapeHtml(accessLabel(accessStatus))}</option>`).join("")}</select></label>
          </div>
          <div class="admin-row-actions left">
            <button type="button" data-save-commercial="${safeBusinessId(row)}">Guardar plan/pago</button>
            <button type="button" class="success-action" data-activate-paid-plan="${safeBusinessId(row)}">Activar plan pago</button>
            ${isTrial(row) ? `<button type="button" class="muted-action" data-restart-trial="${safeBusinessId(row)}">Reiniciar 14 días</button>` : ""}
          </div>
        </section>

        <section class="admin-panel-card">
          <h3>Módulos</h3>
          <div class="admin-modules-list">
            ${Object.keys(DEFAULT_MODULES).map((key) => `
              <label class="admin-module-toggle">
                <input type="checkbox" data-module-key="${escapeHtml(key)}" ${modules[key] ? "checked" : ""} />
                <span>${escapeHtml(MODULE_LABELS[key] || key)}</span>
              </label>
            `).join("")}
          </div>
          <div class="admin-row-actions left">
            <button type="button" data-save-access-modules="${safeBusinessId(row)}">Guardar acceso/módulos</button>
          </div>
        </section>
          </div>
        </details>

        <details class="admin-detail-disclosure admin-timeline-card">
          <summary><strong>Historial</strong><span>Actividad comercial y seguimientos anteriores</span></summary>
          <div class="admin-disclosure-body">
          <p class="admin-card-help">Actividad comercial, señales públicas anónimas y seguimiento interno. No contiene datos del comprador final.</p>
          ${renderCommercialTimeline(String(row.businessId || row.id || ""))}
          </div>
        </details>

        <details class="admin-detail-disclosure admin-ledger-panel-wide">
          <summary><strong>Cobranzas</strong><span>${escapeHtml(paymentChip(row).replace(/<[^>]*>/g, ""))} · ${escapeHtml(billingDuePresentation(row).detail)}</span></summary>
          <div class="admin-disclosure-body">
          ${(!b.writeAccessUntil && !(String(b.status || "").toLowerCase() === "manual" && String(b.plan || "trial").toLowerCase() !== "trial"))
            ? `<div class="admin-empty" style="border-color:#f0b8b2;background:#fff7f6;color:#8f241c;margin-bottom:10px;">⚠ Falta preparar esta cuenta para las reglas RC2. Usá <strong>Reparar base</strong>, reiniciá la prueba o activá un plan antes del despliegue.</div>`
            : ""}
          ${renderAccountLedger(row, BILLING_MOVEMENTS_BY_BUSINESS.get(safeBusinessId(row)) || [])}
          ${(() => {
            const mpLink = mpLinkForBusiness(row);
            const hasMpLink = Boolean(mpPaymentUrl(mpLink));
            return `
              <div class="admin-row-actions left">
                <button type="button" data-generate-mp-link="${safeBusinessId(row)}">Generar link MP</button>
                <button type="button" data-load-mp-link="${safeBusinessId(row)}">Último link</button>
                <button type="button" data-copy-mp-link="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Copiar link</button>
                <button type="button" data-send-mp-whatsapp="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Enviar cobro</button>
                <button type="button" data-mark-payment="${safeBusinessId(row)}" ${isTrial(row) ? 'disabled title="Usá Activar plan pago"' : ""}>Pago manual</button>
              </div>
              <small>Último pago: ${escapeHtml(dateTime(b.lastPaymentAt || row.lastPaymentAt))} · MP: ${hasMpLink ? `link listo ${escapeHtml(formatMoney(mpAmount(mpLink)))}` : "sin link generado en esta sesión"}</small>
            `;
          })()}
          </div>
        </details>

        <details class="admin-detail-disclosure admin-technical-actions">
          <summary><strong>Herramientas técnicas</strong><span>Acceso, reparación, archivo y empresas TEST</span></summary>
          <div class="admin-disclosure-body danger-zone">
          <p class="admin-card-help">Acciones poco frecuentes. No forman parte del seguimiento diario.</p>
          <div class="admin-row-actions left">
            ${isArchived(row)
              ? `<button type="button" data-restore-business="${safeBusinessId(row)}">Restaurar</button>`
              : `<button type="button" data-archive-business="${safeBusinessId(row)}">Archivar</button>`}
            <button type="button" data-ensure-business="${safeBusinessId(row)}">Reparar base</button>
            <button type="button" data-toggle-test="${safeBusinessId(row)}" data-test-current="${isTest(row) ? "true" : "false"}">${isTest(row) ? "Quitar TEST" : "Marcar TEST"}</button>
            <button type="button" data-clone-test="${safeBusinessId(row)}" ${isTest(row) ? "" : "disabled"}>Clonar TEST</button>
            <button type="button" data-delete-test="${safeBusinessId(row)}" ${isTest(row) ? "" : "disabled"}>Eliminar TEST</button>
          </div>
          <small>Eliminar solo está habilitado para TEST. Clientes reales se archivan.</small>
          </div>
        </details>
      </div>
    </div>
  `;
}

export async function renderAdminUsers(container, options = {}) {
  if (!container) return;
  const { onEnterAsBusiness = null, showBackToApp = false } = options;

  // La navegación flotante debe vivir fuera del árbol visual de AppPromos.
  // Algunos contenedores de la app crean un containing block que impide que
  // position:fixed se ancle a la ventana y además genera overflow horizontal.
  document.getElementById("adminControlFloatingNav")?.remove();
  const floatingNavMount = document.createElement("div");
  floatingNavMount.id = "adminControlFloatingNav";
  document.body.appendChild(floatingNavMount);

  const state = {
    view: "home",
    homeFilter: "today",
    homeSearch: "",
    search: "",
    clientFilter: "all",
    clientAccessFilter: "all",
    clientPlanFilter: "all",
    clientPaymentFilter: "all",
    billingFilter: "all",
    trackingFilter: "all",
    selectedBusinessId: ""
  };

  let businesses = [];
  let users = [];
  let loading = false;

  container.innerHTML = `
    <style>
      .admin-shell{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1f1f1f;padding-bottom:88px;max-width:100%;min-width:0;overflow-x:clip;}
      .admin-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
      .admin-top h2{margin:0;font-size:26px;line-height:1.1;}
      .admin-top p{margin:5px 0 0;color:#6e6e6e;font-size:13px;}
      .admin-top-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .admin-top-actions button,.admin-row-actions button,.admin-queue-actions button,.admin-panel-head button,.admin-nav button,.admin-filter-tabs button,.admin-detail-top button{min-height:36px;padding:0 12px;border:1px solid #ded6ca;border-radius:10px;background:#fff;color:#1f1f1f;font-weight:900;cursor:pointer;}
      .admin-top-actions .primary{background:#b63b2b;color:#fff;border-color:#b63b2b;}
      .admin-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
      .admin-nav button{border-radius:999px;background:#ece7df;}
      .admin-nav button.active{background:#1f1f1f;color:#fff;border-color:#1f1f1f;}
      .admin-content{width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-x:clip;border:1px solid #e7e1d8;border-radius:16px;background:#fff;padding:14px;min-height:360px;}
      .admin-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:14px;}
      .admin-control-kpis{grid-template-columns:repeat(3,minmax(130px,1fr));}
      .admin-control-search{display:flex;align-items:center;gap:10px;margin:0 0 12px;}
      .admin-control-search input{flex:1;min-height:40px;border:1px solid #ded6ca;border-radius:10px;padding:0 12px;font-weight:800;box-sizing:border-box;}
      .admin-control-search span{color:#6e6e6e;font-size:12px;font-weight:900;white-space:nowrap;}
      .admin-control-table{min-width:860px;}
      .admin-control-table button{min-height:34px;padding:0 14px;border:1px solid #ded6ca;border-radius:10px;background:#fff;font-weight:900;cursor:pointer;}
      .primary-action{background:#1f1f1f!important;color:#fff!important;border-color:#1f1f1f!important;}
      .admin-kpis div{border:1px solid #eee6dc;border-radius:16px;background:#fffaf5;padding:12px;}
      .admin-kpis b{display:block;font-size:28px;line-height:1;font-weight:1000;}
      .admin-kpis span{display:block;margin-top:5px;color:#6e6e6e;font-size:12px;font-weight:900;text-transform:uppercase;}
      .admin-home-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}
      .admin-help-list{display:grid;gap:10px;}
      .admin-help-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;border:1px solid #eee6dc;border-left:5px solid #64748b;border-radius:16px;background:#fff;padding:14px;box-shadow:0 5px 16px rgba(0,0,0,.035);}
      .admin-help-card.warn{border-left-color:#d97706;background:#fffdf7;}
      .admin-help-card.danger{border-left-color:#dc2626;background:#fff9f8;}
      .admin-help-card.ok{border-left-color:#16a34a;}
      .admin-help-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
      .admin-help-heading h4{margin:0;font-size:17px;}
      .admin-help-heading span,.admin-help-main small{display:block;color:#6e6e6e;font-size:12px;margin-top:3px;}
      .admin-help-problem{display:block;margin-top:10px;font-size:14px;}
      .admin-help-main p{margin:5px 0;color:#4f4f4f;font-size:13px;}
      .admin-help-actions{display:grid;gap:7px;min-width:118px;}
      .admin-help-actions button{min-height:40px;padding:0 13px;border:1px solid #ded6ca;border-radius:10px;background:#fff;font-weight:900;cursor:pointer;}
      .admin-qa-note{margin:0 0 10px;padding:9px 11px;border-radius:10px;background:#fff4df;color:#795600;font-size:12px;font-weight:800;}
      .admin-panel-card{border:1px solid #eee6dc;border-radius:16px;background:#fff;padding:14px;box-shadow:0 6px 18px rgba(0,0,0,.035);}
      .admin-panel-card.highlight{border-color:#ffd0a0;background:#fffaf3;}
      .admin-panel-card.important{border-color:#d7e5ff;background:#f8fbff;}
      .admin-panel-card.note{background:#fffdf7;}
      .admin-panel-card.danger-zone{border-color:#f0b4ae;background:#fff8f7;}
      .admin-panel-card h3,.admin-section-head h3{margin:0 0 6px;font-size:18px;}
      .admin-panel-card p,.admin-section-head p{margin:0;color:#6e6e6e;font-size:13px;line-height:1.35;}
      .admin-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;}
      .admin-more-links{display:grid;gap:8px;margin-top:12px;}
      .admin-more-links button{display:grid;gap:2px;text-align:left;min-height:54px;padding:10px 12px;border:1px solid #ded6ca;border-radius:12px;background:#fff;cursor:pointer;}
      .admin-more-links button span{color:#6e6e6e;font-size:12px;}
      .admin-queue{display:grid;gap:8px;}
      .admin-queue-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border-top:1px solid #f0ebe3;padding-top:8px;}
      .admin-queue-row strong{display:block;font-size:14px;}
      .admin-queue-row span{display:block;color:#6e6e6e;font-size:12px;margin-top:2px;}
      .admin-queue-actions,.admin-row-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
      .admin-row-actions.left{justify-content:flex-start;}
      .admin-toolbar-simple{display:grid;grid-template-columns:minmax(260px,1fr) repeat(4,minmax(145px,180px));gap:10px;margin-bottom:8px;}
      .admin-client-toolbar{align-items:center;}
      .admin-directory-search{margin-bottom:8px;}
      .admin-directory-search input{width:100%;min-height:44px;padding:0 12px;border:1px solid #ded6ca;border-radius:12px;font-weight:800;box-sizing:border-box;}
      .admin-filter-disclosure{margin-bottom:10px;}
      .admin-filter-disclosure summary{display:inline-flex;cursor:pointer;color:#5f5147;font-size:12px;font-weight:900;padding:6px 2px;}
      .admin-filter-disclosure .admin-toolbar-simple{grid-template-columns:repeat(4,minmax(145px,1fr));padding-top:6px;}
      .admin-directory-list{display:grid;gap:9px;}
      .admin-directory-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #eee6dc;border-radius:15px;background:#fff;padding:13px;}
      .admin-directory-card.archived{background:#f8f7f4;opacity:.76;}
      .admin-directory-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      .admin-directory-title h4{margin:0;font-size:16px;}
      .admin-directory-main p{margin:4px 0 0;font-size:13px;font-weight:750;}
      .admin-directory-main small{display:block;margin-top:3px;color:#6e6e6e;font-size:12px;}
      .admin-directory-reason{display:block;margin-top:5px;color:#5f5147;font-size:12px;font-weight:800;}
      .admin-directory-actions{display:grid;grid-template-columns:repeat(3,auto);gap:6px;}
      .admin-directory-actions button{min-height:38px;padding:0 11px;border:1px solid #ded6ca;border-radius:10px;background:#fff;font-weight:900;cursor:pointer;}
      .admin-results-note{font-size:12px;color:#6e6e6e;font-weight:900;margin:0 0 10px 2px;}
      .admin-toolbar-simple input,.admin-toolbar-simple select,.admin-form-grid input,.admin-form-grid select,.admin-panel-card textarea{width:100%;min-height:38px;border:1px solid #ded6ca;border-radius:10px;padding:0 10px;font-weight:800;background:#fff;box-sizing:border-box;}
      .admin-panel-card textarea{padding:10px;resize:vertical;font-weight:700;line-height:1.4;}
      .admin-table-wrap{overflow:auto;border:1px solid #eee6dc;border-radius:14px;}
      .admin-table{width:100%;border-collapse:collapse;font-size:13px;min-width:980px;}
      .admin-billing-table{min-width:1120px;}
      .admin-table th{background:#f8f5f0;color:#5f5147;text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
      .admin-table td{padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;}
      .admin-table tr.archived{background:#fbfaf7;color:#6e6e6e;}
      .admin-table strong{display:block;font-size:14px;}
      .admin-table small{display:block;color:#6e6e6e;font-size:12px;line-height:1.35;margin-top:2px;}
      .admin-chip{display:inline-flex;align-items:center;min-height:24px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:1000;margin:2px 3px 2px 0;white-space:nowrap;}
      .admin-chip.ok{background:#e9f8ef;color:#16703a;}
      .admin-chip.warn{background:#fff4df;color:#8a6200;}
      .admin-chip.danger{background:#fff1f0;color:#b42318;}
      .admin-chip.neutral{background:#f2f2f2;color:#555;}
      .admin-chip.admin{background:#eef2ff;color:#1d3b7a;}
      .admin-mini-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;}
      .admin-empty{padding:18px;border:1px dashed #ded6ca;border-radius:14px;background:#fff;color:#6e6e6e;font-weight:800;}
      .admin-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
      .admin-filter-tabs{display:flex;gap:7px;flex-wrap:wrap;}
      .admin-filter-tabs button.active{background:#1f1f1f;color:#fff;border-color:#1f1f1f;}
      .admin-billing-list{display:grid;gap:10px;}
      .admin-billing-card{display:grid;grid-template-columns:minmax(220px,1.25fr) minmax(240px,1fr) minmax(260px,1.15fr);gap:12px;align-items:center;border:1px solid #eee6dc;border-radius:16px;background:#fff;padding:12px;box-shadow:0 4px 14px rgba(0,0,0,.035);}
      .admin-billing-card.has-link{border-color:#bfe8cf;background:#fbfffc;}
      .admin-billing-client strong{display:block;font-size:15px;}
      .admin-billing-client span{display:block;color:#6e6e6e;font-size:12px;line-height:1.35;margin-top:3px;}
      .admin-billing-info{display:grid;grid-template-columns:1fr 1.35fr;gap:10px;align-items:start;}
      .admin-billing-info b{display:block;color:#5f5147;font-size:11px;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;}
      .admin-billing-info span{display:block;font-weight:900;font-size:13px;}
      .admin-billing-info small{display:block;color:#6e6e6e;font-size:12px;line-height:1.35;margin-top:3px;}
      .admin-billing-actions{display:grid;grid-template-columns:repeat(2,minmax(110px,1fr));gap:7px;}
      .admin-billing-actions button{min-height:36px;padding:0 10px;border:1px solid #ded6ca;border-radius:10px;background:#fff;color:#1f1f1f;font-weight:900;cursor:pointer;}
      .admin-billing-actions .primary-action{background:#0f6fe8;color:#fff;border-color:#0f6fe8;}
      .admin-billing-actions .success-action{background:#13a85b;color:#fff;border-color:#13a85b;}
      .admin-billing-actions .muted-action{background:#f8f5f0;color:#6b5d50;}

      .admin-ledger-panel-wide{grid-column:span 2;}
      .admin-ledger-box{border:1px solid #e7dccb;border-radius:18px;background:#fffdf8;padding:12px;margin:10px 0 14px;}
      .admin-ledger-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px;}
      .admin-ledger-summary div{border:1px solid #f0ebe3;border-radius:14px;background:#fff;padding:10px;min-width:0;}
      .admin-ledger-summary span{display:block;color:#6e6e6e;font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:900;}
      .admin-ledger-summary strong{display:block;font-size:14px;line-height:1.2;margin-top:4px;word-break:break-word;}
      .admin-ledger-summary small{display:block;color:#6e6e6e;font-size:11px;line-height:1.35;margin-top:3px;}
      .admin-ledger-link-note{border:1px dashed #e7dccb;border-radius:12px;background:#fff;padding:9px 10px;color:#5f5147;font-size:12px;font-weight:800;margin-bottom:10px;}
      .admin-ledger-table-wrap{overflow:auto;border:1px solid #eee6dc;border-radius:14px;background:#fff;}
      .admin-ledger-table{width:100%;border-collapse:collapse;font-size:12px;min-width:660px;}
      .admin-ledger-table th{background:#f8f5f0;color:#5f5147;text-align:left;padding:9px;border-bottom:1px solid #e7e1d8;font-size:10px;text-transform:uppercase;letter-spacing:.03em;}
      .admin-ledger-table td{padding:9px;border-bottom:1px solid #f0ebe3;vertical-align:top;}
      .admin-ledger-table tr:last-child td{border-bottom:0;}
      .admin-ledger-table td:nth-child(3),
      .admin-ledger-table td:nth-child(4),
      .admin-ledger-table td:nth-child(5){text-align:right;white-space:nowrap;}
      .admin-ledger-help{display:block;color:#6e6e6e;font-size:11px;line-height:1.35;margin-top:8px;}

      .admin-operational-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;}
      .admin-operational-actions button{min-height:40px;padding:0 14px;border:1px solid #ded6ca;border-radius:10px;background:#fff;font-weight:900;cursor:pointer;}
      .admin-operational-actions .primary-action{background:#1f1f1f;color:#fff;border-color:#1f1f1f;}
      .admin-next-step{display:flex;align-items:center;justify-content:space-between;gap:18px;border-left:5px solid #64748b;}
      .admin-next-step.warn{border-left-color:#d97706;background:#fffaf0;}
      .admin-next-step.danger{border-left-color:#dc2626;background:#fff7f7;}
      .admin-next-step.ok{border-left-color:#16a34a;background:#f5fff7;}
      .admin-next-step-copy{min-width:0;}
      .admin-next-step-copy h3{margin:4px 0 6px;font-size:1.12rem;}
      .admin-next-step-copy p{margin:0;line-height:1.45;}
      .admin-next-step-actions{display:flex;gap:8px;flex-wrap:wrap;flex:0 0 auto;}
      .admin-public-impact{margin:12px 0;border:1px solid #dce8f8;border-radius:16px;background:#f8fbff;padding:14px;}
      .admin-impact-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;}
      .admin-impact-heading h3{margin:2px 0 0;font-size:18px;}
      .admin-impact-heading small{color:#6e6e6e;font-size:11px;max-width:260px;text-align:right;}
      .admin-impact-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;}
      .admin-impact-grid>div{min-width:0;border:1px solid #e4edf8;border-radius:13px;background:#fff;padding:11px;}
      .admin-impact-grid strong{display:block;font-size:25px;line-height:1;}
      .admin-impact-grid span{display:block;margin-top:5px;font-size:11px;font-weight:950;text-transform:uppercase;}
      .admin-impact-grid small{display:block;margin-top:3px;color:#6e6e6e;font-size:11px;}
      @media (max-width:760px){
        .admin-next-step{align-items:stretch;flex-direction:column;}
        .admin-next-step-actions{width:100%;}
        .admin-next-step-actions button{flex:1 1 160px;}
      }
      .admin-operational-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:12px;}
      .admin-operational-summary.ok{border-color:#b9dfc6;background:#f7fcf8;}
      .admin-operational-summary.warn{border-color:#f0d49b;background:#fffaf0;}
      .admin-operational-summary.danger{border-color:#efb5af;background:#fff7f6;}
      .admin-eyebrow{display:block;color:#6e6e6e;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;}
      .admin-operational-stage{min-width:170px;padding:10px 12px;border:1px solid #eee6dc;border-radius:12px;background:#fff;}
      .admin-operational-stage span,.admin-operational-stage small{display:block;color:#6e6e6e;font-size:11px;font-weight:800;}
      .admin-operational-stage strong{display:block;font-size:18px;margin:2px 0;}
      .admin-operational-grid{align-items:start;grid-template-columns:minmax(0,1fr);width:100%;max-width:100%;min-width:0;}
      .admin-operational-grid>*{min-width:0;}
      .admin-operational-grid>.admin-followup-card,.admin-operational-grid>.admin-support-message-card{grid-column:1/-1;width:100%;max-width:100%;box-sizing:border-box;}
      .admin-card-help{margin-bottom:10px!important;}
      .admin-detail-note{display:block;margin-top:10px;color:#6e6e6e;font-size:11px;line-height:1.35;}
      .admin-followup-grid{margin-top:12px;}
      .admin-form-wide{grid-column:1/-1;}
      .admin-followup-note{display:grid;gap:6px;margin-top:12px;font-size:12px;font-weight:700;}
      .admin-support-message-card{display:grid;gap:10px;}
      .admin-support-message-card label{display:grid;gap:6px;font-size:12px;font-weight:700;}
      .admin-support-message-card select,.admin-support-message-card textarea,.admin-followup-card input,.admin-followup-card select,.admin-followup-card textarea{width:100%;box-sizing:border-box;}
      .admin-inline-details{margin:10px 0;border-top:1px solid #eee6dc;padding-top:8px;}
      .admin-inline-details summary{cursor:pointer;font-size:12px;font-weight:900;color:#5f5147;}
      .admin-account-chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px;}
      .admin-followup-card textarea{width:100%;box-sizing:border-box;min-height:110px;}
      .admin-commercial-timeline{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:0;}
      .admin-commercial-timeline li{position:relative;display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;padding:0 0 16px;}
      .admin-commercial-timeline li:not(:last-child)::before{content:"";position:absolute;left:6px;top:13px;bottom:0;width:2px;background:#e7e1d8;}
      .admin-timeline-dot{position:relative;z-index:1;width:12px;height:12px;margin-top:3px;border-radius:999px;background:#b63b2b;box-shadow:0 0 0 3px #f8e9e5;}
      .admin-commercial-timeline strong{display:block;font-size:13px;}
      .admin-commercial-timeline span{display:block;margin-top:2px;color:#6e6e6e;font-size:12px;line-height:1.35;}
      .admin-ledger-panel-wide,.admin-timeline-card,.admin-technical-actions,.admin-detail-disclosure{grid-column:1/-1;}
      .admin-detail-disclosure{border:1px solid #eee6dc;border-radius:16px;background:#fff;overflow:hidden;}
      .admin-detail-disclosure>summary{display:flex;justify-content:space-between;gap:12px;align-items:center;cursor:pointer;padding:14px;list-style:none;}
      .admin-detail-disclosure>summary::-webkit-details-marker{display:none;}
      .admin-detail-disclosure>summary::after{content:"⌄";font-size:18px;color:#6e6e6e;}
      .admin-detail-disclosure[open]>summary::after{content:"⌃";}
      .admin-detail-disclosure>summary span{margin-left:auto;color:#6e6e6e;font-size:12px;text-align:right;}
      .admin-disclosure-body{border-top:1px solid #eee6dc;padding:14px;}
      .admin-secondary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;padding:0 14px 14px;}
      .admin-detail-top{display:grid;grid-template-columns:auto minmax(220px,1fr) auto;gap:12px;align-items:start;margin-bottom:12px;border-bottom:1px solid #eee6dc;padding-bottom:12px;}
      .admin-detail-top h3{margin:0;font-size:22px;}
      .admin-detail-top p{margin:4px 0 0;color:#6e6e6e;font-size:13px;}
      .admin-detail-grid-real{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
      .admin-dl{display:grid;grid-template-columns:110px minmax(0,1fr);gap:7px 10px;margin:0;font-size:13px;}
      .admin-dl dt{color:#6e6e6e;font-weight:900;}
      .admin-dl dd{margin:0;font-weight:800;word-break:break-word;}
      .admin-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:8px 0 10px;}
      .admin-form-grid label{font-size:12px;color:#6e6e6e;font-weight:1000;display:grid;gap:4px;}
      .admin-modules-list{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 10px;}
      .admin-module-toggle{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 9px;border:1px solid #ded6ca;border-radius:999px;background:#fff;font-size:12px;font-weight:900;}
      #adminNavMount:empty,#adminBottomNavMount:empty{display:none;}
      .admin-bottom-nav{position:fixed!important;z-index:2147483000;left:50%;bottom:14px;transform:translateX(-50%);display:grid!important;grid-template-columns:repeat(4,minmax(86px,1fr));gap:5px;width:min(560px,calc(100vw - 24px));max-width:calc(100vw - 24px);box-sizing:border-box;padding:7px;border:1px solid #d9d2c8;border-radius:18px;background:rgba(255,255,255,.98);box-shadow:0 14px 38px rgba(0,0,0,.18);backdrop-filter:blur(12px);}
      body.module-focus-admin{overflow-x:hidden!important;}
      #adminControlFloatingNav{display:block!important;visibility:visible!important;opacity:1!important;}
      #adminControlFloatingNav .admin-bottom-nav button{display:flex!important;visibility:visible!important;opacity:1!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;min-height:48px;border:0;border-radius:12px;background:transparent;color:#5b534b;font-size:11px;font-weight:900;cursor:pointer;}
      #adminControlFloatingNav .admin-bottom-nav button span{display:block!important;visibility:visible!important;opacity:1!important;font-size:17px;line-height:1;}
      .admin-bottom-nav button.active{background:#1f1f1f;color:#fff;}
      button:disabled{opacity:.45;cursor:not-allowed;}
      @media(max-width:980px){
        .admin-ledger-panel-wide{grid-column:span 1;}
        .admin-ledger-summary{grid-template-columns:repeat(2,minmax(0,1fr));}
        .admin-billing-card{grid-template-columns:1fr;}
        .admin-billing-actions{grid-template-columns:repeat(2,minmax(120px,1fr));}
      }
      @media(max-width:760px){
        .admin-ledger-summary{grid-template-columns:1fr;}
        .admin-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
        .admin-control-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
        .admin-nav-top{display:none;}
        .admin-help-card{grid-template-columns:1fr;}
        .admin-help-actions{grid-template-columns:1fr 1fr;}
        .admin-detail-disclosure>summary{align-items:flex-start;}
        .admin-detail-disclosure>summary span{display:none;}
        .admin-bottom-nav{bottom:8px;width:calc(100vw - 16px);}
        .admin-control-search{align-items:stretch;flex-direction:column;}
        .admin-impact-heading{display:block;}
        .admin-impact-heading small{display:block;margin-top:5px;text-align:left;}
        .admin-impact-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
        .admin-operational-grid{grid-template-columns:1fr;}
        .admin-toolbar-simple{grid-template-columns:1fr;}
        .admin-filter-disclosure .admin-toolbar-simple{grid-template-columns:1fr;}
        .admin-directory-card{grid-template-columns:1fr;}
        .admin-directory-actions{grid-template-columns:repeat(3,1fr);}
        .admin-content{padding:10px;}
        .admin-detail-top{grid-template-columns:1fr;}
        .admin-table{min-width:860px;}
      }
    </style>

    <div class="admin-shell">
      <div class="admin-top">
        <div>
          <h2>Centro de Control AppPromos</h2>
          <p>Qué carnicerías funcionan, cuáles se están activando y cuáles necesitan tu atención.</p>
        </div>
        <div class="admin-top-actions">
          <button id="exitAdminBtn" type="button">Salir del Centro de Control</button>
          <button id="reloadAdminBtn" class="primary" type="button">Recargar</button>
        </div>
      </div>
      <div id="adminContent" class="admin-content"><div class="admin-empty">Cargando panel...</div></div>
    </div>
  `;

  const content = container.querySelector("#adminContent");
  const reloadBtn = container.querySelector("#reloadAdminBtn");
  const exitAdminBtn = container.querySelector("#exitAdminBtn");

  function setView(view) {
    state.view = view;
    state.selectedBusinessId = "";
    render();
  }

  function render() {
    const selectedRow = state.selectedBusinessId ? rowById(businesses, state.selectedBusinessId) : null;
    floatingNavMount.innerHTML = renderBottomNav(state.view, selectedRow);
    if (state.selectedBusinessId) {
      const row = selectedRow;
      content.innerHTML = row ? renderDetail(row) : `<div class="admin-empty">No se encontró la carnicería seleccionada.</div>`;
      return;
    }
    if (loading) {
      content.innerHTML = `<div class="admin-empty">Cargando datos admin...</div>`;
      return;
    }
    if (state.view === "home") content.innerHTML = renderHome(businesses, state);
    if (state.view === "clients") content.innerHTML = renderClients(businesses, state);
    if (state.view === "billing") content.innerHTML = renderBilling(businesses, state);
    if (state.view === "tracking") content.innerHTML = renderTracking(businesses, state);
    if (state.view === "campaigns") content.innerHTML = renderCampaigns(businesses);
    if (state.view === "users") content.innerHTML = renderUsers(users, businesses);
    if (state.view === "more") content.innerHTML = renderMore(businesses);
  }

  async function loadData() {
    loading = true;
    render();
    try {
      [businesses, users] = await Promise.all([listAdminBusinesses(), listAdminUsers()]);
    } catch (error) {
      console.error("Error cargando admin", error);
      content.innerHTML = `<div class="admin-empty" style="color:#b42318;">Error cargando admin: ${escapeHtml(error?.message || "desconocido")}</div>`;
      return;
    } finally {
      loading = false;
    }
    render();
  }

  async function refreshKeepingDetail() {
    const selected = state.selectedBusinessId;
    await loadData();
    state.selectedBusinessId = selected;
    render();
  }

  async function withButton(button, text, action) {
    if (!button) return action();
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = text;
    try { await action(); }
    finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }


  function mpPayloadForBusiness(row = {}) {
    const businessId = safeBusinessId(row);
    const extraUsers = additionalUsersForBusiness(businessId, users);
    return {
      business_id: businessId,
      business_name: businessName(row),
      plan: normalizeMpPlan(planKey(row)),
      billing_kind: "full_month",
      period_month: currentBillingPeriodMonth(),
      additional_users_count: extraUsers,
      payer_email: businessEmail(row).includes("@") ? businessEmail(row) : "",
      description: ""
    };
  }


  async function refreshBillingMovementsForBusiness(businessId) {
    if (!businessId) return [];
    try {
      const rows = await listBusinessBillingMovements(businessId, { limit: 50 });
      BILLING_MOVEMENTS_BY_BUSINESS.set(businessId, rows);
      return rows;
    } catch (error) {
      console.warn("No se pudieron leer movimientos de cuenta corriente", error);
      return BILLING_MOVEMENTS_BY_BUSINESS.get(businessId) || [];
    }
  }

  async function refreshCommercialEventsForBusiness(businessId) {
    if (!businessId) return [];
    try {
      const rows = await listBusinessCommercialEvents(businessId, { limit: 40 });
      COMMERCIAL_EVENTS_BY_BUSINESS.set(businessId, rows);
      PUBLIC_SIGNAL_SUMMARY_BY_BUSINESS.set(businessId, rows.publicSignalSummary || {
        visitsTotal: 0,
        visitsLast7Days: 0,
        lastVisitAt: "",
        orderStartsTotal: 0,
        orderStartsLast7Days: 0,
        lastOrderStartAt: "",
        conversionPercent: 0
      });
      return rows;
    } catch (error) {
      console.warn("No se pudo leer la línea de tiempo comercial", error);
      COMMERCIAL_EVENTS_BY_BUSINESS.set(businessId, []);
      PUBLIC_SIGNAL_SUMMARY_BY_BUSINESS.delete(businessId);
      return [];
    }
  }

  async function recordBillingMovementSafe(businessId, movement = {}) {
    if (!businessId) return null;
    try {
      const saved = await recordBusinessBillingMovement(businessId, movement);
      await refreshBillingMovementsForBusiness(businessId);
      return saved;
    } catch (error) {
      console.warn("No se pudo registrar movimiento de cuenta corriente", error);
      return null;
    }
  }

  async function generateMpLink(row = {}) {
    const payload = mpPayloadForBusiness(row);
    const response = await fetch(`${MP_BACKEND_URL}/billing/mp/app-charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = null;
    try { data = await response.json(); }
    catch (error) { data = null; }
    if (!response.ok || !data?.ok) {
      const detail = data?.detail || data?.message || `HTTP ${response.status}`;
      throw new Error(detail);
    }
    MP_LINKS_BY_BUSINESS.set(payload.business_id, data);
    return data;
  }


  async function loadLastMpLink(row = {}) {
    const businessId = safeBusinessId(row);
    const response = await fetch(`${MP_BACKEND_URL}/billing/mp/status/${encodeURIComponent(businessId)}`);
    let data = null;
    try { data = await response.json(); }
    catch (error) { data = null; }
    if (!response.ok || !data?.ok) {
      const detail = data?.detail || data?.message || `HTTP ${response.status}`;
      throw new Error(detail);
    }
    if (!data.last_link) return null;
    const link = {
      ok: true,
      business_id: businessId,
      amount: data.last_link.amount,
      init_point: data.last_link.init_point,
      sandbox_init_point: data.last_link.sandbox_init_point,
      external_reference: data.last_link.external_reference,
      calculation: {
        amount: data.last_link.amount,
        period_key: data.last_link.period_key,
        description: data.last_link.metadata_json || data.last_link.external_reference || "AppPromos"
      },
      raw: data.last_link
    };
    MP_LINKS_BY_BUSINESS.set(businessId, link);
    return link;
  }

  const handleAdminClick = async (event) => {
    const target = event.target;
    if (target.closest("#adminControlFloatingNav a")) event.preventDefault();
    const scrollButton = target.closest("[data-scroll-admin]");
    if (scrollButton) {
      const destination = container.querySelector(`#${scrollButton.dataset.scrollAdmin}`);
      if (destination) {
        if (destination.tagName === "DETAILS") destination.open = true;
        destination.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const nav = target.closest("[data-admin-view]");
    if (nav) {
      setView(nav.dataset.adminView || "home");
      return;
    }

    const homeFilter = target.closest("[data-home-filter]");

    if (homeFilter) {

      state.homeFilter = homeFilter.dataset.homeFilter || "all";

      state.view = "home";

      state.selectedBusinessId = "";

      render();

      return;

    }



    const billingFilter = target.closest("[data-billing-filter]");
    if (billingFilter) {
      state.billingFilter = billingFilter.dataset.billingFilter || "all";
      state.view = "billing";
      state.selectedBusinessId = "";
      render();
      return;
    }

    const trackingFilter = target.closest("[data-tracking-filter]");
    if (trackingFilter) {
      state.trackingFilter = trackingFilter.dataset.trackingFilter || "all";
      state.view = "tracking";
      state.selectedBusinessId = "";
      render();
      return;
    }

    const viewButton = target.closest("[data-view-business]");
    if (viewButton) {
      const businessId = viewButton.dataset.viewBusiness || "";
      state.selectedBusinessId = businessId;
      render();
      await Promise.all([
        refreshBillingMovementsForBusiness(businessId),
        refreshCommercialEventsForBusiness(businessId)
      ]);
      render();
      return;
    }

    if (target.closest("[data-close-detail]")) {
      state.selectedBusinessId = "";
      render();
      return;
    }

    const whatsappButton = target.closest("[data-whatsapp-business]");
    if (whatsappButton) {
      const row = rowById(businesses, whatsappButton.dataset.whatsappBusiness);
      if (!row) return window.alert("No se encontró la carnicería.");
      openWhatsapp(row, whatsappButton.dataset.whatsappReason || "base");
      return;
    }

    const enterButton = target.closest("[data-enter-business]");
    if (enterButton) {
      if (typeof onEnterAsBusiness === "function") {
        floatingNavMount.remove();
        await onEnterAsBusiness(enterButton.dataset.enterBusiness);
      }
      return;
    }

    const generateMpButton = target.closest("[data-generate-mp-link]");
    if (generateMpButton) {
      const businessId = generateMpButton.dataset.generateMpLink;
      const row = rowById(businesses, businessId);
      if (!row) return window.alert("No se encontró la carnicería.");
      if (!window.confirm(`Generar link Mercado Pago para "${businessName(row)}"?\n\nSe calculará el mes vencido con el plan actual y usuarios adicionales activos.`)) return;
      await withButton(generateMpButton, "Generando...", async () => {
        try {
          const result = await generateMpLink(row);
          await recordBillingMovementSafe(businessId, {
            type: "mp_link_created",
            description: `Link Mercado Pago generado · ${firstText(result.calculation?.period_key, "período actual")}`,
            debit: mpAmount(result),
            credit: 0,
            source: "panel_admin_mp_link",
            periodKey: firstText(result.calculation?.period_key, result.period_key, ""),
            mpPreferenceId: firstText(result.preference_id, ""),
            mpExternalReference: firstText(result.external_reference, ""),
            mpInitPoint: mpPaymentUrl(result),
            metadata: {
              plan: firstText(result.calculation?.plan, result.plan, planKey(row)),
              businessName: businessName(row)
            }
          });
          window.alert(`Link Mercado Pago generado.\n\nImporte: ${formatMoney(mpAmount(result))}\nPeríodo: ${firstText(result.calculation?.period_key, "—")}`);
          render();
        } catch (error) {
          window.alert(`No se pudo generar el link Mercado Pago.\n\n${error?.message || error}`);
        }
      });
      return;
    }

    const loadMpButton = target.closest("[data-load-mp-link]");
    if (loadMpButton) {
      const row = rowById(businesses, loadMpButton.dataset.loadMpLink);
      if (!row) return window.alert("No se encontró la carnicería.");
      await withButton(loadMpButton, "Buscando...", async () => {
        try {
          const link = await loadLastMpLink(row);
          if (!link) return window.alert("No hay links Mercado Pago guardados para esta carnicería.");
          window.alert(`Último link Mercado Pago cargado.\n\nImporte: ${formatMoney(mpAmount(link))}`);
          render();
        } catch (error) {
          window.alert(`No se pudo cargar el último link Mercado Pago.\n\n${error?.message || error}`);
        }
      });
      return;
    }

    const copyMpButton = target.closest("[data-copy-mp-link]");
    if (copyMpButton) {
      const row = rowById(businesses, copyMpButton.dataset.copyMpLink);
      if (!row) return window.alert("No se encontró la carnicería.");
      await copyMpLinkToClipboard(mpLinkForBusiness(row));
      return;
    }

    const sendMpButton = target.closest("[data-send-mp-whatsapp]");
    if (sendMpButton) {
      const row = rowById(businesses, sendMpButton.dataset.sendMpWhatsapp);
      if (!row) return window.alert("No se encontró la carnicería.");
      openMpWhatsapp(row, mpLinkForBusiness(row));
      return;
    }

    const markPaymentButton = target.closest("[data-mark-payment]");
    if (markPaymentButton) {
      const businessId = markPaymentButton.dataset.markPayment;
      const row = rowById(businesses, businessId);
      if (!row) return;
      if (!window.confirm(`Marcar pago recibido para "${businessName(row)}"?`)) return;
      await withButton(markPaymentButton, "Guardando...", async () => {
        const dueInput = container.querySelector("[data-detail-due]");
        const creditAmount = Math.max(
          Number(row.billing?.accountBalance || row.accountBalance || 0) || 0,
          Number(mpAmount(mpLinkForBusiness(row)) || 0) || 0,
          Number(accountEstimatedMonthlyAmount(row) || 0) || 0
        );
        await markBusinessPaymentReceived(businessId, { nextPaymentDueAt: dueInput?.value || dateInput(dueValue(row)) || null });
        await recordBillingMovementSafe(businessId, {
          type: "manual_payment",
          description: "Pago manual registrado",
          debit: 0,
          credit: creditAmount,
          source: "panel_admin_manual_payment",
          periodKey: firstText(mpLinkForBusiness(row)?.calculation?.period_key, mpLinkForBusiness(row)?.period_key, "")
        });
        await refreshKeepingDetail();
      });
      return;
    }

    const restartTrialButton = target.closest("[data-restart-trial]");
    if (restartTrialButton) {
      const businessId = restartTrialButton.dataset.restartTrial;
      const row = rowById(businesses, businessId);
      if (!row) return window.alert("No se encontró la carnicería.");
      if (!window.confirm(`¿Reiniciar hoy una nueva prueba de 14 días para "${businessName(row)}"?\n\nNo se modificará ninguna otra carnicería.`)) return;
      await withButton(restartTrialButton, "Reiniciando...", async () => {
        await restartBusinessTrial(businessId);
        await refreshKeepingDetail();
      });
      return;
    }

    const activatePaidPlanButton = target.closest("[data-activate-paid-plan]");
    if (activatePaidPlanButton) {
      const businessId = activatePaidPlanButton.dataset.activatePaidPlan;
      const row = rowById(businesses, businessId);
      if (!row) return window.alert("No se encontró la carnicería.");
      const plan = container.querySelector("[data-detail-plan]")?.value || "basic";
      const due = container.querySelector("[data-detail-due]")?.value || null;
      if (plan === "trial") return window.alert("Elegí ARRANQUE, SALVADOR o DUEÑO antes de activar.");
      if (!window.confirm(`Activar ${planLabel(plan)} para "${businessName(row)}" y marcar el pago recibido?`)) return;
      await withButton(activatePaidPlanButton, "Activando...", async () => {
        await activateBusinessPaidPlan(businessId, { plan, nextPaymentDueAt: isTrial(row) ? null : due, paymentReceived: true });
        await recordBillingMovementSafe(businessId, {
          type: "manual_payment",
          description: `Activación de plan ${planLabel(plan)}`,
          debit: 0,
          credit: Number(accountEstimatedMonthlyAmount({ ...row, billing: { ...(row.billing || {}), plan } }) || 0) || 0,
          source: "panel_admin_plan_activation"
        });
        await refreshKeepingDetail();
      });
      return;
    }

    const saveCommercial = target.closest("[data-save-commercial]");
    if (saveCommercial) {
      const businessId = saveCommercial.dataset.saveCommercial;
      await withButton(saveCommercial, "Guardando...", async () => {
        const plan = container.querySelector("[data-detail-plan]")?.value || "trial";
        const payment = container.querySelector("[data-detail-payment]")?.value || "active";
        const due = container.querySelector("[data-detail-due]")?.value || null;
        await updateBusinessCommercialBilling(businessId, {
          plan,
          status: payment,
          nextPaymentDueAt: due
        });
        await refreshKeepingDetail();
      });
      return;
    }

    const saveAccessModules = target.closest("[data-save-access-modules]");
    if (saveAccessModules) {
      const businessId = saveAccessModules.dataset.saveAccessModules;
      await withButton(saveAccessModules, "Guardando...", async () => {
        const access = container.querySelector("[data-detail-access]")?.value || "active";
        const modules = { ...DEFAULT_MODULES };
        container.querySelectorAll("[data-module-key]").forEach((input) => {
          modules[input.dataset.moduleKey] = input.checked === true;
        });
        await updateBusinessStatus(businessId, access);
        await updateBusinessModules(businessId, modules);
        await refreshKeepingDetail();
      });
      return;
    }

    const saveFollowup = target.closest("[data-save-followup]");
    if (saveFollowup) {
      const businessId = saveFollowup.dataset.saveFollowup;
      await withButton(saveFollowup, "Guardando...", async () => {
        await updateBusinessFollowup(businessId, {
          status: container.querySelector("[data-followup-status]")?.value || "pending",
          outcome: container.querySelector("[data-followup-outcome]")?.value || "",
          nextAction: container.querySelector("[data-followup-next-action]")?.value || "",
          nextContactAt: container.querySelector("[data-followup-next-at]")?.value || null,
          note: container.querySelector("[data-detail-note]")?.value || ""
        });
        await refreshKeepingDetail();
      });
      return;
    }

    const copySupport = target.closest("[data-copy-support-message]");
    if (copySupport) {
      await copySupportMessage(container.querySelector("[data-support-message-text]")?.value || "");
      return;
    }

    const openSupport = target.closest("[data-open-support-whatsapp]");
    if (openSupport) {
      const row = rowById(businesses, openSupport.dataset.openSupportWhatsapp);
      if (!row) return window.alert("No se encontró la carnicería.");
      openSupportWhatsapp(row, container.querySelector("[data-support-message-text]")?.value || "");
      return;
    }

    const archiveButton = target.closest("[data-archive-business]");
    if (archiveButton) {
      const businessId = archiveButton.dataset.archiveBusiness;
      const row = rowById(businesses, businessId);
      if (!row || !window.confirm(`Archivar "${businessName(row)}"?`)) return;
      await withButton(archiveButton, "Archivando...", async () => { await archiveBusiness(businessId); state.selectedBusinessId = ""; await loadData(); });
      return;
    }

    const restoreButton = target.closest("[data-restore-business]");
    if (restoreButton) {
      const businessId = restoreButton.dataset.restoreBusiness;
      const row = rowById(businesses, businessId);
      if (!row || !window.confirm(`Restaurar "${businessName(row)}"?`)) return;
      await withButton(restoreButton, "Restaurando...", async () => { await restoreBusiness(businessId); await refreshKeepingDetail(); });
      return;
    }

    const ensureButton = target.closest("[data-ensure-business]");
    if (ensureButton) {
      const businessId = ensureButton.dataset.ensureBusiness;
      const row = rowById(businesses, businessId);
      if (!row || !window.confirm(`Reparar configuración base de "${businessName(row)}"?`)) return;
      await withButton(ensureButton, "Reparando...", async () => { await ensureBusinessAdminDefaults(businessId); await refreshKeepingDetail(); });
      return;
    }

    const toggleTest = target.closest("[data-toggle-test]");
    if (toggleTest) {
      const businessId = toggleTest.dataset.toggleTest;
      const nextValue = toggleTest.dataset.testCurrent !== "true";
      await withButton(toggleTest, "Guardando...", async () => { await setBusinessTestFlag(businessId, nextValue); await refreshKeepingDetail(); });
      return;
    }

    const cloneButton = target.closest("[data-clone-test]");
    if (cloneButton && !cloneButton.disabled) {
      const businessId = cloneButton.dataset.cloneTest;
      const row = rowById(businesses, businessId);
      if (!row || !window.confirm(`Clonar "${businessName(row)}" como TEST?`)) return;
      await withButton(cloneButton, "Clonando...", async () => { await cloneBusinessAsTest(businessId); state.selectedBusinessId = ""; await loadData(); });
      return;
    }

    const deleteButton = target.closest("[data-delete-test]");
    if (deleteButton && !deleteButton.disabled) {
      const businessId = deleteButton.dataset.deleteTest;
      const row = rowById(businesses, businessId);
      if (!row) return;
      const typed = window.prompt(`Eliminar empresa TEST "${businessName(row)}".\n\nPara confirmar escribí: ELIMINAR TEST`);
      if (typed !== "ELIMINAR TEST") return window.alert("Cancelado. No se eliminó nada.");
      await withButton(deleteButton, "Eliminando...", async () => { await deleteTestBusiness(businessId); state.selectedBusinessId = ""; await loadData(); });
      return;
    }

    const disableUser = target.closest("[data-disable-user]");
    if (disableUser) {
      if (!window.confirm("Desactivar este usuario en AppPromos?")) return;
      await withButton(disableUser, "Guardando...", async () => { await setUserDisabled(disableUser.dataset.disableUser, true); await loadData(); });
      return;
    }

    const enableUser = target.closest("[data-enable-user]");
    if (enableUser) {
      await withButton(enableUser, "Guardando...", async () => { await setUserDisabled(enableUser.dataset.enableUser, false); await loadData(); });
      return;
    }

    const markBaseTest = target.closest("[data-mark-current-base-test]");
    if (markBaseTest && !markBaseTest.disabled) {
      const typed = window.prompt(`Esta acción marcará la base actual como EMPRESAS TEST.\n\nNo borra nada. No toca Auth. No libera WhatsApp ni slug.\n\nPara confirmar escribí: MARCAR TEST`);
      if (typed !== "MARCAR TEST") return window.alert("Cancelado. No se marcó la base.");
      await withButton(markBaseTest, "Marcando...", async () => { await markExistingBusinessesAsTest({ reason: "Base marcada como TEST desde Panel Admin operativo" }); await loadData(); });
    }
  };

  container.addEventListener("click", handleAdminClick);
  floatingNavMount.addEventListener("click", handleAdminClick);

  container.addEventListener("input", (event) => {
    const homeSearch = event.target.closest("#adminHomeSearch");
    if (homeSearch) {
      state.homeSearch = homeSearch.value || "";
      const cursorStart = homeSearch.selectionStart ?? state.homeSearch.length;
      const cursorEnd = homeSearch.selectionEnd ?? cursorStart;
      render();
      requestAnimationFrame(() => {
        const nextSearch = container.querySelector("#adminHomeSearch");
        if (!nextSearch) return;
        nextSearch.focus();
        nextSearch.setSelectionRange(cursorStart, cursorEnd);
      });
      return;
    }

    const search = event.target.closest("#adminSearch");
    if (search) {
      state.search = search.value || "";
      render();
    }
  });

  container.addEventListener("change", (event) => {
    const supportSelect = event.target.closest("[data-support-message-select]");
    if (supportSelect) {
      const row = rowById(businesses, state.selectedBusinessId);
      const message = supportMessageLibrary(row || {}).find((item) => item.key === supportSelect.value);
      const textarea = container.querySelector("[data-support-message-text]");
      if (textarea && message) textarea.value = message.text;
      return;
    }

    const clientFilter = event.target.closest("#adminClientFilter");
    if (clientFilter) {
      state.clientFilter = clientFilter.value || "all";
      render();
      return;
    }

    const accessFilter = event.target.closest("#adminAccessFilter");
    if (accessFilter) {
      state.clientAccessFilter = accessFilter.value || "all";
      render();
      return;
    }

    const planFilter = event.target.closest("#adminPlanFilter");
    if (planFilter) {
      state.clientPlanFilter = planFilter.value || "all";
      render();
      return;
    }

    const paymentFilter = event.target.closest("#adminPaymentFilter");
    if (paymentFilter) {
      state.clientPaymentFilter = paymentFilter.value || "all";
      render();
    }
  });

  reloadBtn?.addEventListener("click", loadData);
  exitAdminBtn?.addEventListener("click", () => {
    floatingNavMount.remove();
    const dashboardButton = document.querySelector('[data-panel="dashboardPanel"]');
    if (dashboardButton) {
      dashboardButton.click();
      return;
    }
    window.location.assign(window.location.pathname);
  });
  await loadData();
}
