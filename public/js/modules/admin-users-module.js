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
  updateBusinessInternalNote,
  setBusinessTestFlag,
  markExistingBusinessesAsTest,
  cloneBusinessAsTest,
  deleteTestBusiness,
  archiveBusiness,
  restoreBusiness,
  setUserDisabled,
  ensureBusinessAdminDefaults
} from "../services/admin-service.js";

const ADMIN_PLANS = Array.from(new Set([...(BILLING_PLANS || []), "dueno"]));
const PAYMENT_STATUSES = ["active", "pending", "overdue", "suspended", "manual"];
const ACCESS_STATUSES = ["active", "trial", "suspended", "disabled"];
const MP_BACKEND_URL = "http://127.0.0.1:8000";
const MP_LINKS_BY_BUSINESS = new Map();

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

function isArchived(row = {}) {
  return row.archived === true || String(row.status || "").toLowerCase() === "archived";
}

function isTest(row = {}) {
  return row.isTestBusiness === true || String(row.adminStatus || "").toLowerCase() === "test";
}

function isTrial(row = {}) {
  return planKey(row) === "trial" || accessKey(row) === "trial";
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

function paymentChip(row = {}) {
  const key = paymentKey(row);
  const tone = key === "active" || key === "paid" ? "ok" : key === "pending" || key === "manual" ? "warn" : "danger";
  return chip(paymentLabel(key), tone);
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

function commercialStatus(row = {}) {
  const access = accessKey(row);
  const pay = paymentKey(row);
  const dueDays = daysUntil(dueValue(row));
  const inactiveDays = daysSince(lastActivityValue(row));
  const whatsapp = metricNumber(row, "whatsappSentCount", "demoWhatsappClickedCount", "whatsappClicks", "whatsapp_count");
  const offers = metricNumber(row, "offersCreatedCount", "savedOffersCount", "demoOfferCreatedCount", "offers_count");

  if (isArchived(row)) return { label: "Archivada", tone: "neutral", reason: "Fuera del uso normal", action: "Restaurar si vuelve" };
  if (["suspended", "disabled"].includes(access) || ["overdue", "suspended"].includes(pay)) {
    return { label: "Urgente", tone: "danger", reason: "Pago/acceso para resolver", action: "Escribir o cobrar" };
  }
  if (dueDays !== null && dueDays <= 2) {
    return { label: "Urgente", tone: "danger", reason: `Vence en ${dueDays} día${dueDays === 1 ? "" : "s"}`, action: "Prevenir corte" };
  }
  if (isTrial(row) && (whatsapp + offers) === 0) {
    return { label: "Revisar", tone: "warn", reason: "Prueba sin uso comercial", action: "Acompañar demo" };
  }
  if (inactiveDays !== null && inactiveDays >= 7) {
    return { label: "Riesgo", tone: "warn", reason: `${inactiveDays} días sin actividad`, action: "Seguimiento" };
  }
  return { label: "Bien", tone: "ok", reason: "Sin alerta fuerte", action: "Mantener" };
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
    ["home", "Inicio"],
    ["clients", "Clientes"],
    ["billing", "Cobranzas"],
    ["tracking", "Tracking"],
    ["users", "Usuarios"],
    ["more", "Más"]
  ];
  return `
    <div class="admin-nav">
      ${tabs.map(([key, label]) => `<button type="button" data-admin-view="${key}" class="${activeView === key ? "active" : ""}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function renderQuickStats(businesses = []) {
  const active = businesses.filter((b) => !isArchived(b) && accessKey(b) === "active").length;
  const tests = businesses.filter(isTest).length;
  const urgent = businesses.filter((b) => commercialStatus(b).tone === "danger").length;
  const review = businesses.filter((b) => commercialStatus(b).tone === "warn").length;
  return `
    <div class="admin-kpis">
      <div><b>${businesses.length}</b><span>Clientes</span></div>
      <div><b>${active}</b><span>Activos</span></div>
      <div><b>${urgent}</b><span>Urgentes</span></div>
      <div><b>${review}</b><span>Revisar</span></div>
      <div><b>${tests}</b><span>TEST</span></div>
    </div>
  `;
}

function renderHome(businesses = []) {
  const urgent = businesses.filter((b) => commercialStatus(b).tone === "danger").slice(0, 8);
  const review = businesses.filter((b) => commercialStatus(b).tone === "warn").slice(0, 8);
  const dueSoon = businesses
    .filter((b) => {
      const days = daysUntil(dueValue(b));
      return days !== null && days >= 0 && days <= 7 && !["overdue", "suspended"].includes(paymentKey(b));
    })
    .slice(0, 8);

  return `
    ${renderQuickStats(businesses)}
    <div class="admin-home-grid">
      <section class="admin-panel-card highlight">
        <div class="admin-panel-head">
          <h3>Para resolver hoy</h3>
          <button type="button" data-admin-view="billing">Ir a cobranzas</button>
        </div>
        ${renderSmallQueue(urgent, "No hay urgencias fuertes.", "cobranza")}
      </section>
      <section class="admin-panel-card">
        <div class="admin-panel-head">
          <h3>Clientes para revisar</h3>
          <button type="button" data-admin-view="tracking">Ir a tracking</button>
        </div>
        ${renderSmallQueue(review, "No hay clientes fríos detectados.", "seguimiento")}
      </section>
      <section class="admin-panel-card">
        <div class="admin-panel-head">
          <h3>Vencimientos próximos</h3>
          <button type="button" data-admin-view="billing" data-set-billing-filter="soon">Ver a vencer</button>
        </div>
        ${renderSmallQueue(dueSoon, "No hay vencimientos próximos cargados.", "cobranza")}
      </section>
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
    <div class="admin-toolbar-simple admin-client-toolbar">
      <input id="adminSearch" value="${escapeHtml(query)}" placeholder="Buscar por nombre, responsable, email, WhatsApp o localidad" />
      <select id="adminClientFilter" title="Tipo de cliente">
        <option value="all" ${selectedAttr(clientFilter, "all")}>Clientes: todos</option>
        <option value="active" ${selectedAttr(clientFilter, "active")}>Clientes activos</option>
        <option value="real" ${selectedAttr(clientFilter, "real")}>Clientes reales</option>
        <option value="test" ${selectedAttr(clientFilter, "test")}>Empresas TEST</option>
        <option value="archived" ${selectedAttr(clientFilter, "archived")}>Archivados</option>
      </select>
      <select id="adminAccessFilter" title="Filtro por acceso">${optionList(accessOptions, accessFilter)}</select>
      <select id="adminPlanFilter" title="Filtro por plan">${optionList(planOptions, planFilter)}</select>
      <select id="adminPaymentFilter" title="Filtro por pago">${optionList(paymentOptions, paymentFilter)}</select>
    </div>
    <div class="admin-results-note">${rows.length} de ${businesses.length} carnicerías</div>
    ${renderClientsTable(rows, "clients")}
  `;
}
function renderClientsTable(rows = [], source = "clients") {
  if (!rows.length) return `<div class="admin-empty">No hay carnicerías para mostrar.</div>`;
  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Carnicería</th>
            <th>Contacto</th>
            <th>Plan</th>
            <th>Acceso</th>
            <th>Pago</th>
            <th>Actividad</th>
            <th>Salud</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const status = commercialStatus(row);
            return `
              <tr class="${isArchived(row) ? "archived" : ""}">
                <td>
                  <strong>${escapeHtml(businessName(row))}</strong>
                  <small>${escapeHtml(businessLocation(row))} · ID ${escapeHtml(shortId(row.businessId))}</small>
                  <div class="admin-mini-chips">${adminChip(row)}</div>
                </td>
                <td>
                  <span>${escapeHtml(businessOwner(row))}</span>
                  <small>${escapeHtml(businessEmail(row))}</small>
                  <small>WhatsApp: ${escapeHtml(businessPhone(row) || "Sin WhatsApp")}</small>
                </td>
                <td>${planChip(row)}</td>
                <td>${accessChip(row)}</td>
                <td>
                  ${paymentChip(row)}
                  <small>Vence: ${escapeHtml(dateOnly(dueValue(row)))}</small>
                </td>
                <td><small>${escapeHtml(dateTime(lastActivityValue(row)))}</small></td>
                <td>${chip(status.label, status.tone)}<small>${escapeHtml(status.reason)}</small></td>
                <td>
                  <div class="admin-row-actions">
                    <button type="button" data-view-business="${safeBusinessId(row)}">Ver</button>
                    <button type="button" data-enter-business="${safeBusinessId(row)}">Entrar</button>
                    <button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="${source === "billing" ? "cobranza" : "base"}">WhatsApp</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function billingBucket(row = {}) {
  const status = paymentKey(row);
  const days = daysUntil(dueValue(row));
  if (["overdue", "suspended"].includes(status) || (days !== null && days < 0)) return "overdue";
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
        const days = daysUntil(dueValue(row));
        const daysLabel = days === null ? "Sin fecha" : days < 0 ? `${Math.abs(days)} día(s) vencido` : `${days} día(s) para vencer`;
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
                <span>${escapeHtml(dateOnly(dueValue(row)))}</span>
                <small>${escapeHtml(daysLabel)}</small>
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
              <button type="button" class="muted-action" data-mark-payment="${safeBusinessId(row)}">Pago manual</button>
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
            const offers = metricNumber(row, "offersCreatedCount", "savedOffersCount", "demoOfferCreatedCount");
            const whatsapp = metricNumber(row, "whatsappSentCount", "demoWhatsappClickedCount", "whatsappClicks");
            const prices = metricNumber(row, "priceUpdatesCount", "pricesUpdatedCount", "itemsUpdatedCount", "productsUpdatedCount");
            return `
              <tr>
                <td><strong>${escapeHtml(businessName(row))}</strong><small>${escapeHtml(businessEmail(row))}</small></td>
                <td>${adminChip(row)} ${planChip(row)}</td>
                <td>${escapeHtml(dateTime(lastActivityValue(row)))}</td>
                <td>${offers}</td>
                <td>${whatsapp}</td>
                <td>${prices}</td>
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

function renderMore(businesses = []) {
  const realCount = businesses.filter((b) => !isTest(b)).length;
  return `
    <div class="admin-home-grid">
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

function renderDetail(row = {}) {
  const status = commercialStatus(row);
  const b = billing(row);
  const internalNote = firstText(row.internalNote, row.adminNote, row.commercialNote, row.notes?.internal, row.admin?.note, "");
  const modules = { ...DEFAULT_MODULES, ...(row.modules || {}) };

  return `
    <div class="admin-detail-page">
      <div class="admin-detail-top">
        <button type="button" data-close-detail>← Volver</button>
        <div>
          <h3>${escapeHtml(businessName(row))}</h3>
          <p>${escapeHtml(businessOwner(row))} · ${escapeHtml(businessPhone(row) || "Sin WhatsApp")} · ${escapeHtml(businessLocation(row))}</p>
        </div>
        <div class="admin-mini-chips">${adminChip(row)} ${planChip(row)} ${accessChip(row)} ${paymentChip(row)} ${chip(status.label, status.tone)}</div>
      </div>

      <div class="admin-detail-grid-real">
        <section class="admin-panel-card">
          <h3>Datos básicos</h3>
          <dl class="admin-dl">
            <dt>Responsable</dt><dd>${escapeHtml(businessOwner(row))}</dd>
            <dt>Email</dt><dd>${escapeHtml(businessEmail(row))}</dd>
            <dt>WhatsApp</dt><dd>${escapeHtml(businessPhone(row) || "Sin WhatsApp")}</dd>
            <dt>Localidad</dt><dd>${escapeHtml(businessLocation(row))}</dd>
            <dt>Dirección</dt><dd>${escapeHtml(firstText(row.direccion, row.address, row.meta?.direccion, row.meta?.address, "—"))}</dd>
            <dt>ID técnico</dt><dd>${escapeHtml(row.businessId || "—")}</dd>
          </dl>
        </section>

        <section class="admin-panel-card important">
          <h3>Cobranzas</h3>
          <div class="admin-form-grid">
            <label>Plan<select data-detail-plan>${ADMIN_PLANS.map((plan) => `<option value="${escapeHtml(plan)}" ${String(plan) === String(b.plan || "trial") ? "selected" : ""}>${escapeHtml(planLabel(plan))}</option>`).join("")}</select></label>
            <label>Pago<select data-detail-payment>${PAYMENT_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${String(status) === String(b.status || "active") ? "selected" : ""}>${escapeHtml(paymentLabel(status))}</option>`).join("")}</select></label>
            <label>Vence<input type="date" data-detail-due value="${escapeHtml(dateInput(dueValue(row)))}" /></label>
          </div>
          ${(() => {
            const mpLink = mpLinkForBusiness(row);
            const hasMpLink = Boolean(mpPaymentUrl(mpLink));
            return `
              <div class="admin-row-actions left">
                <button type="button" data-save-commercial="${safeBusinessId(row)}">Guardar gestión</button>
                <button type="button" data-generate-mp-link="${safeBusinessId(row)}">Generar link MP</button>
                <button type="button" data-load-mp-link="${safeBusinessId(row)}">Último link</button>
                <button type="button" data-copy-mp-link="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Copiar link</button>
                <button type="button" data-send-mp-whatsapp="${safeBusinessId(row)}" ${hasMpLink ? "" : "disabled"}>Enviar cobro</button>
                <button type="button" data-mark-payment="${safeBusinessId(row)}">Pago manual</button>
              </div>
              <small>Último pago: ${escapeHtml(dateTime(b.lastPaymentAt || row.lastPaymentAt))} · MP: ${hasMpLink ? `link listo ${escapeHtml(formatMoney(mpAmount(mpLink)))}` : "sin link generado en esta sesión"}</small>
            `;
          })()}
        </section>

        <section class="admin-panel-card">
          <h3>Tracking simple</h3>
          <dl class="admin-dl">
            <dt>Salud</dt><dd>${escapeHtml(status.label)} — ${escapeHtml(status.reason)}</dd>
            <dt>Última actividad</dt><dd>${escapeHtml(dateTime(lastActivityValue(row)))}</dd>
            <dt>Ofertas</dt><dd>${metricNumber(row, "offersCreatedCount", "savedOffersCount", "demoOfferCreatedCount")}</dd>
            <dt>WhatsApps</dt><dd>${metricNumber(row, "whatsappSentCount", "demoWhatsappClickedCount", "whatsappClicks")}</dd>
            <dt>Precios</dt><dd>${metricNumber(row, "priceUpdatesCount", "pricesUpdatedCount", "itemsUpdatedCount", "productsUpdatedCount")}</dd>
          </dl>
          <div class="admin-row-actions left"><button type="button" data-whatsapp-business="${safeBusinessId(row)}" data-whatsapp-reason="seguimiento">Escribir seguimiento</button></div>
        </section>

        <section class="admin-panel-card">
          <h3>Acceso y módulos</h3>
          <div class="admin-form-grid">
            <label>Acceso<select data-detail-access>${ACCESS_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${String(status) === accessKey(row) ? "selected" : ""}>${escapeHtml(accessLabel(status))}</option>`).join("")}</select></label>
          </div>
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
            <button type="button" data-enter-business="${safeBusinessId(row)}">Entrar como cliente</button>
          </div>
        </section>

        <section class="admin-panel-card note">
          <h3>Nota interna</h3>
          <textarea data-detail-note rows="5" placeholder="Anotar seguimiento, pago hablado, próxima acción...">${escapeHtml(internalNote)}</textarea>
          <div class="admin-row-actions left"><button type="button" data-save-note="${safeBusinessId(row)}">Guardar nota</button></div>
        </section>

        <section class="admin-panel-card danger-zone">
          <h3>Acciones</h3>
          <div class="admin-row-actions left">
            <button type="button" data-whatsapp-business="${safeBusinessId(row)}">WhatsApp</button>
            ${isArchived(row)
              ? `<button type="button" data-restore-business="${safeBusinessId(row)}">Restaurar</button>`
              : `<button type="button" data-archive-business="${safeBusinessId(row)}">Archivar</button>`}
            <button type="button" data-ensure-business="${safeBusinessId(row)}">Reparar base</button>
            <button type="button" data-toggle-test="${safeBusinessId(row)}" data-test-current="${isTest(row) ? "true" : "false"}">${isTest(row) ? "Quitar TEST" : "Marcar TEST"}</button>
            <button type="button" data-clone-test="${safeBusinessId(row)}" ${isTest(row) ? "" : "disabled"}>Clonar TEST</button>
            <button type="button" data-delete-test="${safeBusinessId(row)}" ${isTest(row) ? "" : "disabled"}>Eliminar TEST</button>
          </div>
          <small>Eliminar solo está habilitado para TEST. Clientes reales se archivan.</small>
        </section>
      </div>
    </div>
  `;
}

export async function renderAdminUsers(container, options = {}) {
  if (!container) return;
  const { onEnterAsBusiness = null } = options;

  const state = {
    view: "home",
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
      .admin-shell{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1f1f1f;}
      .admin-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
      .admin-top h2{margin:0;font-size:26px;line-height:1.1;}
      .admin-top p{margin:5px 0 0;color:#6e6e6e;font-size:13px;}
      .admin-top-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .admin-top-actions button,.admin-row-actions button,.admin-queue-actions button,.admin-panel-head button,.admin-nav button,.admin-filter-tabs button,.admin-detail-top button{min-height:36px;padding:0 12px;border:1px solid #ded6ca;border-radius:10px;background:#fff;color:#1f1f1f;font-weight:900;cursor:pointer;}
      .admin-top-actions .primary{background:#b63b2b;color:#fff;border-color:#b63b2b;}
      .admin-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
      .admin-nav button{border-radius:999px;background:#ece7df;}
      .admin-nav button.active{background:#1f1f1f;color:#fff;border-color:#1f1f1f;}
      .admin-content{overflow:auto;border:1px solid #e7e1d8;border-radius:16px;background:#fff;padding:14px;min-height:360px;}
      .admin-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:14px;}
      .admin-kpis div{border:1px solid #eee6dc;border-radius:16px;background:#fffaf5;padding:12px;}
      .admin-kpis b{display:block;font-size:28px;line-height:1;font-weight:1000;}
      .admin-kpis span{display:block;margin-top:5px;color:#6e6e6e;font-size:12px;font-weight:900;text-transform:uppercase;}
      .admin-home-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}
      .admin-panel-card{border:1px solid #eee6dc;border-radius:16px;background:#fff;padding:14px;box-shadow:0 6px 18px rgba(0,0,0,.035);}
      .admin-panel-card.highlight{border-color:#ffd0a0;background:#fffaf3;}
      .admin-panel-card.important{border-color:#d7e5ff;background:#f8fbff;}
      .admin-panel-card.note{background:#fffdf7;}
      .admin-panel-card.danger-zone{border-color:#f0b4ae;background:#fff8f7;}
      .admin-panel-card h3,.admin-section-head h3{margin:0 0 6px;font-size:18px;}
      .admin-panel-card p,.admin-section-head p{margin:0;color:#6e6e6e;font-size:13px;line-height:1.35;}
      .admin-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;}
      .admin-queue{display:grid;gap:8px;}
      .admin-queue-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border-top:1px solid #f0ebe3;padding-top:8px;}
      .admin-queue-row strong{display:block;font-size:14px;}
      .admin-queue-row span{display:block;color:#6e6e6e;font-size:12px;margin-top:2px;}
      .admin-queue-actions,.admin-row-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
      .admin-row-actions.left{justify-content:flex-start;}
      .admin-toolbar-simple{display:grid;grid-template-columns:minmax(260px,1fr) repeat(4,minmax(145px,180px));gap:10px;margin-bottom:8px;}
      .admin-client-toolbar{align-items:center;}
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
      button:disabled{opacity:.45;cursor:not-allowed;}
      @media(max-width:980px){
        .admin-billing-card{grid-template-columns:1fr;}
        .admin-billing-actions{grid-template-columns:repeat(2,minmax(120px,1fr));}
      }
      @media(max-width:760px){
        .admin-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
        .admin-toolbar-simple{grid-template-columns:1fr;}
        .admin-content{padding:10px;}
        .admin-detail-top{grid-template-columns:1fr;}
        .admin-table{min-width:860px;}
      }
    </style>

    <div class="admin-shell">
      <div class="admin-top">
        <div>
          <h2>Panel Admin AppPromos</h2>
          <p>Tablero para trabajar: clientes, cobranzas, tracking y acciones. Sin ficha gigante en la pantalla principal.</p>
        </div>
        <div class="admin-top-actions">
          <button data-action-panel="dashboardPanel" type="button">← Volver a la app</button>
          <button id="reloadAdminBtn" class="primary" type="button">Recargar</button>
        </div>
      </div>
      <div id="adminNavMount"></div>
      <div id="adminContent" class="admin-content"><div class="admin-empty">Cargando panel...</div></div>
    </div>
  `;

  const navMount = container.querySelector("#adminNavMount");
  const content = container.querySelector("#adminContent");
  const reloadBtn = container.querySelector("#reloadAdminBtn");

  function setView(view) {
    state.view = view;
    state.selectedBusinessId = "";
    render();
  }

  function render() {
    navMount.innerHTML = renderNav(state.selectedBusinessId ? "" : state.view);
    if (state.selectedBusinessId) {
      const row = rowById(businesses, state.selectedBusinessId);
      content.innerHTML = row ? renderDetail(row) : `<div class="admin-empty">No se encontró la carnicería seleccionada.</div>`;
      return;
    }
    if (loading) {
      content.innerHTML = `<div class="admin-empty">Cargando datos admin...</div>`;
      return;
    }
    if (state.view === "home") content.innerHTML = renderHome(businesses);
    if (state.view === "clients") content.innerHTML = renderClients(businesses, state);
    if (state.view === "billing") content.innerHTML = renderBilling(businesses, state);
    if (state.view === "tracking") content.innerHTML = renderTracking(businesses, state);
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

  container.addEventListener("click", async (event) => {
    const target = event.target;
    const nav = target.closest("[data-admin-view]");
    if (nav) {
      setView(nav.dataset.adminView || "home");
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
      state.selectedBusinessId = viewButton.dataset.viewBusiness || "";
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
      if (typeof onEnterAsBusiness === "function") await onEnterAsBusiness(enterButton.dataset.enterBusiness);
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
        await markBusinessPaymentReceived(businessId, { nextPaymentDueAt: dueInput?.value || dateInput(dueValue(row)) || null });
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
        await updateBusinessBillingPlan(businessId, plan);
        await updateBusinessBillingStatus(businessId, payment);
        await updateBusinessPaymentDueDate(businessId, due);
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

    const saveNote = target.closest("[data-save-note]");
    if (saveNote) {
      const businessId = saveNote.dataset.saveNote;
      await withButton(saveNote, "Guardando...", async () => {
        const note = container.querySelector("[data-detail-note]")?.value || "";
        await updateBusinessInternalNote(businessId, note);
        await refreshKeepingDetail();
      });
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
  });

  container.addEventListener("input", (event) => {
    const search = event.target.closest("#adminSearch");
    if (search) {
      state.search = search.value || "";
      render();
    }
  });

  container.addEventListener("change", (event) => {
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
  await loadData();
}
