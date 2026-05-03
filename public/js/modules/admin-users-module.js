import {
  DEFAULT_MODULES,
  MODULE_LABELS,
  BILLING_PLANS,
  getBusinessCommercialStatus,
  renderAccessWarning
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
  ensureBusinessAdminDefaults,
  listAdminActionsForBusiness
} from "../services/admin-service.js";

const MODULE_DESCRIPTIONS = {
  prices: "Permite cargar, editar y guardar la lista de precios de la carnicería.",
  competition: "Permite comparar precios propios contra el mercado y detectar oportunidades.",
  combos: "Permite crear y gestionar combos/ofertas comerciales.",
  offers: "Permite trabajar con ofertas rápidas y piezas comerciales.",
  webPremium: "Activa la web pública premium de la carnicería.",
  whatsapp: "Habilita herramientas para preparar mensajes comerciales de WhatsApp."
};

const ADMIN_BILLING_PLANS = Array.from(new Set([
  ...BILLING_PLANS,
  "dueno"
]));

const ADMIN_PAYMENT_STATUSES = ["active", "pending", "overdue", "suspended", "manual"];

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

function businessHumanName(row = {}) {
  return firstText(row.name, row.displayName, row.meta?.name, row.meta?.displayName, row.businessId, "Sin nombre");
}

function businessOwnerName(row = {}) {
  return firstText(
    row.responsable,
    row.responsibleName,
    row.ownerName,
    row.owner?.displayName,
    row.owner?.nombre,
    row.meta?.responsable,
    row.meta?.responsibleName,
    row.meta?.ownerName,
    "Sin responsable"
  );
}

function businessOwnerEmail(row = {}) {
  return firstText(row.ownerEmail, row.email, row.owner?.email, row.meta?.ownerEmail, row.meta?.email, "Sin email");
}

function businessPhone(row = {}) {
  return firstText(
    row.telefono,
    row.phone,
    row.whatsapp,
    row.ownerPhone,
    row.phoneKey,
    row.publicPhoneKey,
    row.phoneIndex?.phoneKey,
    row.meta?.telefono,
    row.meta?.phone,
    row.meta?.whatsapp,
    row.meta?.phoneKey,
    row.owner?.telefono,
    row.owner?.phone,
    "Sin teléfono"
  );
}


function normalizeAdminWhatsappNumber(value = "") {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  while (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return digits;
  if (digits.length >= 10) return `549${digits}`;
  return digits;
}

function buildAdminWhatsappMessage(row = {}) {
  const name = businessHumanName(row);
  return [
    "Hola, soy Damian de AppPromos.",
    "",
    `Te escribo por ${name} en AppPromos.`
  ].join("\n");
}

function buildAdminWhatsappUrl(row = {}) {
  const number = normalizeAdminWhatsappNumber(businessPhone(row));
  if (!number) return "";
  const text = encodeURIComponent(buildAdminWhatsappMessage(row));
  return `https://wa.me/${number}?text=${text}`;
}

function renderWhatsappAction(row = {}, label = "📲 WhatsApp") {
  const phoneNumber = normalizeAdminWhatsappNumber(businessPhone(row));
  const disabled = !phoneNumber;
  const isTest = row.isTestBusiness === true || String(row.adminStatus || "").toLowerCase() === "test";
  const finalLabel = isTest && !disabled && /Escribir/i.test(label) ? label.replace(/Escribir/i, "Escribir TEST") : label;
  const title = disabled
    ? "Esta carnicería no tiene WhatsApp válido"
    : isTest
      ? "Empresa TEST: verificá que este número sea de prueba antes de enviar"
      : "Abrir WhatsApp con mensaje base";

  return `
    <button
      data-whatsapp-business="${escapeHtml(row.businessId || "")}"
      type="button"
      class="admin-whatsapp-action${disabled ? " disabled" : ""}${isTest ? " test" : ""}"
      ${disabled ? "disabled" : ""}
      title="${escapeHtml(title)}"
    >${escapeHtml(finalLabel)}</button>
  `;
}

function businessLocation(row = {}) {
  const city = firstText(row.localidad, row.city, row.meta?.localidad, row.meta?.city);
  const province = firstText(row.provincia, row.province, row.meta?.provincia, row.meta?.province);
  return [city, province].filter(Boolean).join(", ") || "Sin localidad";
}

function businessAddress(row = {}) {
  return firstText(row.direccion, row.address, row.meta?.direccion, row.meta?.address, "");
}

function shortUid(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "—";
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 8)}...${clean.slice(-4)}`;
}

function businessLabel(row = {}) {
  const name = businessHumanName(row);
  const phone = businessPhone(row);
  return `${name}${phone && phone !== "Sin teléfono" ? " · " + phone : ""}`;
}


function isArchivedBusiness(row = {}) {
  return row.archived === true || String(row.status || "").toLowerCase() === "archived";
}

function isDisabledUser(user = {}) {
  return user.disabled === true || String(user.status || "").toLowerCase() === "disabled";
}

function businessStatusLabel(row = {}) {
  if (isArchivedBusiness(row)) return "Archivada";
  const status = String(row.status || "active").toLowerCase();
  if (status === "suspended") return "Acceso pausado";
  if (status === "overdue") return "Pago pendiente";
  if (status === "active") return "Activa";
  return row.status || "Activa";
}

function userStatusLabel(user = {}) {
  if (isDisabledUser(user)) return "Desactivado";
  return user.status || "active";
}

function findBusinessForUser(user = {}, businesses = []) {
  const userBusinessId = String(user.businessId || "").trim();
  if (!userBusinessId) return null;
  return businesses.find((business) => String(business.businessId || "") === userBusinessId) || null;
}

function fmtDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function fmtDateOnly(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function businessBilling(row = {}) {
  return row.billing && typeof row.billing === "object" ? row.billing : {};
}

function businessPaymentDueValue(row = {}) {
  const billing = businessBilling(row);
  return billing.nextPaymentDueAt || billing.currentPeriodEnd || billing.trialEndsAt || row.nextPaymentDueAt || row.currentPeriodEnd || "";
}

function businessPaymentDueInput(row = {}) {
  return toDateInputValue(businessPaymentDueValue(row));
}

function businessLastPaymentLabel(row = {}) {
  const billing = businessBilling(row);
  return fmtDate(billing.lastPaymentAt || row.lastPaymentAt || null);
}

function businessInternalNote(row = {}) {
  return firstText(row.internalNote, row.adminNote, row.commercialNote, row.notes?.internal, row.admin?.note, "");
}

function accessLabel(status) {
  const map = {
    active: "Activo",
    trial: "Prueba",
    suspended: "Suspendido",
    disabled: "Bloqueado"
  };
  return map[status] || status || "—";
}

function paymentLabel(status) {
  const key = String(status || "active").toLowerCase();
  const map = {
    active: "Al día",
    paid: "Al día",
    pending: "Pendiente",
    overdue: "Vencido",
    suspended: "Suspendido",
    manual: "Bonificado / manual",
    bonus: "Bonificado / manual",
    bonificado: "Bonificado / manual"
  };
  return map[key] || status || "—";
}

function statusBadge(status) {
  const map = {
    active: ["#e9f8ef", "#16703a", "Activo"],
    trial: ["#fff8df", "#8a6200", "Prueba"],
    disabled: ["#eeeeee", "#555555", "Bloqueado"],
    suspended: ["#fff1f0", "#b42318", "Suspendido"]
  };
  const [bg, color, label] = map[status] || ["#f2f2f2", "#555", status || "—"];
  return `<span class="admin-status-badge" style="background:${bg};color:${color};">${escapeHtml(label)}</span>`;
}

function billingBadge(status) {
  const key = String(status || "active").toLowerCase();
  const map = {
    active: ["#e9f8ef", "#16703a", "Al día"],
    paid: ["#e9f8ef", "#16703a", "Al día"],
    pending: ["#fff8df", "#8a6200", "Pendiente"],
    overdue: ["#fff4e5", "#b54708", "Vencido"],
    suspended: ["#fff1f0", "#b42318", "Suspendido"],
    manual: ["#eef2ff", "#1d3b7a", "Bonificado / manual"]
  };
  const [bg, color, label] = map[key] || ["#f2f2f2", "#555", status || "—"];
  return `<span class="admin-status-badge" style="background:${bg};color:${color};">${escapeHtml(label)}</span>`;
}

function commercialBadge(summary = {}) {
  const toneMap = {
    ok: ["#e9f8ef", "#16703a", "✅"],
    trial: ["#fff8df", "#8a6200", "⏳"],
    warn: ["#fff4e5", "#b54708", "⚠️"],
    danger: ["#fff1f0", "#b42318", "⛔"]
  };
  const [bg, color, icon] = toneMap[summary.tone] || ["#f2f2f2", "#555", "ℹ️"];
  return `
    <div class="admin-commercial-card" style="background:${bg};color:${color};border-color:${color}22;">
      <div class="admin-commercial-title">${icon} ${escapeHtml(summary.label || "Estado")}</div>
      <div class="admin-commercial-desc">${escapeHtml(summary.description || "Sin descripción")}</div>
      <div class="admin-commercial-grid">
        <span>Acceso: <strong>${escapeHtml(summary.access || "—")}</strong></span>
        <span>Guardado: <strong>${escapeHtml(summary.write || "—")}</strong></span>
      </div>
      <div class="admin-commercial-action">${escapeHtml(summary.suggestedAction || "—")}</div>
    </div>
  `;
}


const STATE_TONES = {
  ok: { bg: "#e9f8ef", color: "#16703a", border: "#bde8cb" },
  trial: { bg: "#fff8df", color: "#8a6200", border: "#f2d47b" },
  warn: { bg: "#fff4e5", color: "#b54708", border: "#ffd0a0" },
  danger: { bg: "#fff1f0", color: "#b42318", border: "#f0b4ae" },
  neutral: { bg: "#f5f1eb", color: "#5f5147", border: "#e7e1d8" },
  admin: { bg: "#eef2ff", color: "#1d3b7a", border: "#c7d2fe" }
};

function toneStyle(tone = "neutral") {
  return STATE_TONES[tone] || STATE_TONES.neutral;
}

function planLabel(plan = "trial") {
  const key = String(plan || "trial").toLowerCase();
  const map = {
    trial: "Prueba gratis",
    basic: "ARRANQUE",
    arranque: "ARRANQUE",
    salvador: "SALVADOR",
    pro: "SALVADOR",
    dueno: "DUEÑO",
    dueño: "DUEÑO",
    owner: "DUEÑO"
  };
  return map[key] || String(plan || "Sin plan").toUpperCase();
}

function getAccessAdminState(row = {}) {
  if (isArchivedBusiness(row)) {
    return {
      label: "Archivada",
      tone: "neutral",
      help: "Empresa guardada fuera del uso normal. No está eliminada.",
      action: "Restaurar si vuelve a operar."
    };
  }

  const status = String(row.status || "active").toLowerCase();
  const map = {
    active: {
      label: "Activo",
      tone: "ok",
      help: "Puede entrar y usar la app normalmente.",
      action: "Mantener seguimiento comercial."
    },
    trial: {
      label: "Prueba activa",
      tone: "trial",
      help: "Está probando AppPromos con acceso completo.",
      action: "Acompañar y convertir antes del vencimiento."
    },
    suspended: {
      label: "Suspendido",
      tone: "danger",
      help: "El acceso está pausado o limitado. No confundir con archivado.",
      action: "Revisar pago/acceso y escribir por WhatsApp."
    },
    disabled: {
      label: "Bloqueado",
      tone: "danger",
      help: "No debería operar la app hasta revisión administrativa.",
      action: "Reactivar solo si corresponde."
    },
    overdue: {
      label: "Limitado",
      tone: "warn",
      help: "Puede consultar, pero conviene revisar guardados y pago.",
      action: "Contactar para regularizar."
    }
  };
  return map[status] || {
    label: row.status || "Sin definir",
    tone: "neutral",
    help: "Estado de acceso no reconocido por el panel.",
    action: "Revisar datos de la empresa."
  };
}

function getPaymentAdminState(row = {}) {
  const billing = row.billing || {};
  const status = String(billing.status || "active").toLowerCase();
  const plan = String(billing.plan || "trial").toLowerCase();
  if (plan === "trial" && status === "active") {
    return {
      label: "Prueba / sin pago",
      tone: "trial",
      help: "Todavía no es cliente pago. Está en etapa de conversión.",
      action: "Mirar vencimiento y escribir antes de que termine."
    };
  }

  const map = {
    active: {
      label: "Al día",
      tone: "ok",
      help: "Pago o situación comercial al día.",
      action: "Mantener activo y mirar próximo vencimiento."
    },
    paid: {
      label: "Al día",
      tone: "ok",
      help: "Pago registrado como recibido.",
      action: "Mantener activo y mirar próximo vencimiento."
    },
    pending: {
      label: "Pendiente",
      tone: "warn",
      help: "Hay un pago o definición comercial pendiente, pero no necesariamente vencido.",
      action: "Escribir por WhatsApp antes de pausar o limitar."
    },
    overdue: {
      label: "Vencido",
      tone: "warn",
      help: "Hay una situación de pago para resolver.",
      action: "Enviar WhatsApp de pago pendiente."
    },
    suspended: {
      label: "Suspendido por pago",
      tone: "danger",
      help: "La cuenta está pausada por cobranza.",
      action: "Resolver pago antes de reactivar."
    },
    manual: {
      label: "Bonificado / manual",
      tone: "admin",
      help: "Caso manejado manualmente por AppPromos.",
      action: "Revisar nota interna antes de cobrar o pausar."
    },
    bonus: {
      label: "Bonificado / manual",
      tone: "admin",
      help: "Caso manejado manualmente por AppPromos.",
      action: "Revisar nota interna antes de cobrar o pausar."
    }
  };
  return map[status] || {
    label: billing.status || "Sin definir",
    tone: "neutral",
    help: "No hay estado de pago claro.",
    action: "Completar situación de cobranza."
  };
}

function getPlanAdminState(row = {}) {
  const plan = String(row.billing?.plan || "trial").toLowerCase();
  const map = {
    trial: {
      label: "Prueba gratis",
      tone: "trial",
      help: "Acceso inicial sin costo. Objetivo: convertir a plan pago.",
      action: "Revisar uso y ofrecer ARRANQUE/SALVADOR."
    },
    basic: {
      label: "ARRANQUE",
      tone: "ok",
      help: "Plan de entrada para vender rápido por WhatsApp.",
      action: "Empujar uso frecuente."
    },
    arranque: {
      label: "ARRANQUE",
      tone: "ok",
      help: "Plan de entrada para vender rápido por WhatsApp.",
      action: "Empujar uso frecuente."
    },
    pro: {
      label: "SALVADOR",
      tone: "admin",
      help: "Plan core para anti-merma y venta urgente.",
      action: "Cuidar continuidad y uso de Vender urgente."
    },
    salvador: {
      label: "SALVADOR",
      tone: "admin",
      help: "Plan core para anti-merma y venta urgente.",
      action: "Cuidar continuidad y uso de Vender urgente."
    },
    dueno: {
      label: "DUEÑO",
      tone: "admin",
      help: "Plan superior con mirada de mercado y web personalizada.",
      action: "Acompañar como cliente de mayor valor."
    },
    dueño: {
      label: "DUEÑO",
      tone: "admin",
      help: "Plan superior con mirada de mercado y web personalizada.",
      action: "Acompañar como cliente de mayor valor."
    }
  };
  return map[plan] || {
    label: planLabel(plan),
    tone: "neutral",
    help: "Plan no reconocido en la lista comercial actual.",
    action: "Revisar pricing asignado."
  };
}

function getInternalAdminState(row = {}) {
  if (isArchivedBusiness(row)) {
    return {
      label: "Archivada",
      tone: "neutral",
      help: "Queda guardada, pero fuera del uso normal. No está borrada.",
      action: "Restaurar o eliminar solo si corresponde."
    };
  }
  if (row.isTestBusiness === true) {
    return {
      label: row.clonedFromBusinessId ? "Test / clon" : "Empresa test",
      tone: "warn",
      help: "Empresa para pruebas internas. Puede borrarse si ya no sirve.",
      action: "Usar para test; eliminar solo con confirmación."
    };
  }
  return {
    label: "Cliente real",
    tone: "ok",
    help: "Empresa real o potencial cliente dentro de AppPromos.",
    action: "No borrar. Archivar si deja de operar."
  };
}

function renderOperationalState(title, state = {}) {
  const tone = toneStyle(state.tone);
  return `
    <div class="admin-oper-state" style="background:${tone.bg};color:${tone.color};border-color:${tone.border};">
      <div class="admin-oper-title">${escapeHtml(title)}</div>
      <div class="admin-oper-label">${escapeHtml(state.label || "Sin definir")}</div>
      <div class="admin-oper-help">${escapeHtml(state.help || "Sin ayuda cargada.")}</div>
      <div class="admin-oper-action">${escapeHtml(state.action || "Revisar.")}</div>
    </div>
  `;
}

function renderCompactState(title, state = {}) {
  const tone = toneStyle(state.tone);
  return `
    <div class="admin-state-chip" style="background:${tone.bg};color:${tone.color};border-color:${tone.border};">
      <div class="admin-state-chip-title">${escapeHtml(title)}</div>
      <div class="admin-state-chip-label">${escapeHtml(state.label || "Sin definir")}</div>
      <div class="admin-state-chip-help">${escapeHtml(state.help || "Sin ayuda cargada.")}</div>
    </div>
  `;
}

function adminFilterLabel(value = "all") {
  const map = {
    all: "Todos",
    real: "Clientes reales",
    test: "Empresas TEST",
    archived: "Archivadas",
    clone: "Clones"
  };
  return map[value] || value;
}

function moduleToggleHtml(row, moduleKey) {
  const enabled = row.modules?.[moduleKey] === true;
  return `
    <button
      type="button"
      data-module-toggle="${escapeHtml(row.businessId)}"
      data-module-key="${escapeHtml(moduleKey)}"
      data-module-current="${enabled ? "true" : "false"}"
      title="${escapeHtml(MODULE_LABELS[moduleKey] || moduleKey)}"
      style="min-height:30px;padding:0 9px;border:none;border-radius:999px;background:${enabled ? "#17803a" : "#ece7df"};color:${enabled ? "#fff" : "#1f1f1f"};font-size:12px;font-weight:900;cursor:pointer;"
    >
      ${escapeHtml((MODULE_LABELS[moduleKey] || moduleKey).replace(" / Ofertas", ""))}: ${enabled ? "ON" : "OFF"}
    </button>
  `;
}

function moduleSummaryChip(row, moduleKey) {
  const enabled = row.modules?.[moduleKey] === true;
  const label = (MODULE_LABELS[moduleKey] || moduleKey).replace(" / Ofertas", "");
  return `<span class="admin-module-chip ${enabled ? "on" : "off"}" title="${escapeHtml(label)}">${escapeHtml(label)}: ${enabled ? "ON" : "OFF"}</span>`;
}

function renderMetrics(businesses) {
  const total = businesses.length;
  const archived = businesses.filter((b) => isArchivedBusiness(b)).length;
  const active = businesses.filter((b) => !isArchivedBusiness(b) && b.status === "active").length;
  const trial = businesses.filter((b) => !isArchivedBusiness(b) && (b.status === "trial" || b.billing?.plan === "trial")).length;
  const suspended = businesses.filter((b) => !isArchivedBusiness(b) && b.status === "suspended").length;
  const disabled = businesses.filter((b) => !isArchivedBusiness(b) && b.status === "disabled").length;
  const paymentOverdue = businesses.filter((b) => String(b.billing?.status || "active") === "overdue").length;
  const recent = [...businesses]
    .filter((b) => b.lastLoginAt)
    .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
    .slice(0, 8);
  const pending = businesses
    .filter((b) => isArchivedBusiness(b) || b.status === "suspended" || b.status === "disabled" || String(b.billing?.status || "active") !== "active")
    .slice(0, 8);

  const cardData = [
    ["Total", total],
    ["Activas", active],
    ["Prueba", trial],
    ["Pago pendiente", paymentOverdue],
    ["Suspendidas", suspended],
    ["Bloqueadas", disabled],
    ["Archivadas", archived]
  ];

  return `
    <div class="admin-help">
      <strong>Control operativo:</strong> esta vista no es solo informativa. Sirve para detectar clientes que requieren acción: pago, acceso, prueba, archivado o seguimiento.
    </div>

    <div class="admin-control-grid">
      ${cardData.map(([label, value]) => `
        <div class="admin-control-card">
          <div class="admin-control-label">${escapeHtml(label)}</div>
          <div class="admin-control-value">${escapeHtml(value)}</div>
        </div>
      `).join("")}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">
      <div style="padding:16px;border:1px solid #e7e1d8;border-radius:16px;background:#fff;">
        <h3 style="margin:0 0 10px;">Acciones pendientes</h3>
        ${pending.length ? `
          <div class="admin-control-list">
            ${pending.map((b) => {
              const access = getAccessAdminState(b);
              const payment = getPaymentAdminState(b);
              const admin = getInternalAdminState(b);
              return `
                <div class="admin-control-row">
                  <div>
                    <strong>${escapeHtml(businessHumanName(b))}</strong>
                    <div style="font-size:12px;color:#6e6e6e;margin-top:3px;">${escapeHtml(access.label)} · ${escapeHtml(payment.label)} · ${escapeHtml(admin.label)}</div>
                  </div>
                  <div class="admin-control-actions">
                    <button data-enter-business="${escapeHtml(b.businessId)}" type="button" class="admin-action-mini">Entrar</button>
                    <button data-manage-modules="${escapeHtml(b.businessId)}" type="button" class="admin-action-mini">Módulos</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<div style="color:#6e6e6e;">No hay acciones pendientes detectadas.</div>`}
      </div>

      <div style="padding:16px;border:1px solid #e7e1d8;border-radius:16px;background:#fff;">
        <h3 style="margin:0 0 10px;">Últimos accesos</h3>
        ${recent.length ? `
          <div class="admin-control-list">
            ${recent.map((b) => `
              <div class="admin-control-row">
                <div>
                  <strong>${escapeHtml(businessHumanName(b))}</strong>
                  <div style="font-size:12px;color:#6e6e6e;margin-top:3px;">${fmtDate(b.lastLoginAt)}</div>
                </div>
                <div class="admin-control-actions">
                  <button data-enter-business="${escapeHtml(b.businessId)}" type="button" class="admin-action-mini">Entrar</button>
                  <button data-manage-modules="${escapeHtml(b.businessId)}" type="button" class="admin-action-mini">Módulos</button>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<div style="color:#6e6e6e;">Todavía no hay accesos registrados.</div>`}
      </div>
    </div>
  `;
}

export async function renderAdminUsers(container, options = {}) {
  if (!container) return;
  const { onEnterAsBusiness = null } = options;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      <div>
        <h2 style="margin:0;">Panel Admin AppPromos</h2>
        <div style="color:#6e6e6e;font-size:14px;margin-top:4px;">
          Control de carnicerías, módulos, acceso, pago y acciones comerciales.
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button data-action-panel="dashboardPanel" type="button" style="min-height:40px;padding:0 14px;border:1px solid #e7e1d8;border-radius:10px;background:#fff;color:#1f1f1f;font-weight:900;cursor:pointer;">← Volver a la app</button>
        <button id="reloadAdminBtn" type="button" style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#b63b2b;color:#fff;font-weight:800;cursor:pointer;">Recargar</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
      <button class="admin-tab active" data-admin-tab="businesses" type="button">🏪 Carnicerías</button>
      <button class="admin-tab" data-admin-tab="users" type="button">👤 Usuarios</button>
      <button class="admin-tab" data-admin-tab="metrics" type="button">📌 Control</button>
    </div>

    <style>
      .admin-tab{min-height:38px;padding:0 12px;border:none;border-radius:999px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;}
      .admin-tab.active{background:#1f1f1f;color:#fff;}
      .admin-select{min-height:34px;border:1px solid #e7e1d8;border-radius:8px;background:#fff;padding:0 8px;font-weight:800;}
      .admin-status-badge{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:0 10px;border-radius:999px;font-weight:900;font-size:12px;white-space:nowrap;}
      .admin-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) repeat(4, minmax(125px, 145px));gap:10px;margin-bottom:12px;align-items:end;}
      .admin-client-list{display:grid;gap:12px;}
      .admin-client-card{border:1px solid #eee6dc;border-radius:18px;background:#fff;box-shadow:0 7px 20px rgba(0,0,0,.04);overflow:hidden;}
      .admin-client-card.archived{background:#fbfaf7;border-color:#ded6ca;}
      .admin-client-main{display:grid;grid-template-columns:minmax(260px,1.3fr) minmax(420px,2fr) auto;gap:12px;padding:13px 14px;align-items:start;}
      .admin-state-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}
      .admin-state-chip{border:1px solid;border-radius:13px;padding:8px 9px;min-height:68px;}
      .admin-state-chip-title{font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;opacity:.72;}
      .admin-state-chip-label{margin-top:3px;font-size:13px;font-weight:1000;line-height:1.1;}
      .admin-state-chip-help{margin-top:4px;font-size:11px;line-height:1.2;font-weight:800;opacity:.9;}
      .admin-client-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;max-width:260px;}
      .admin-whatsapp-action{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 11px;border:1px solid #0f8f3d;border-radius:10px;background:#ecfff2;color:#137333;font-weight:1000;cursor:pointer;white-space:nowrap;}
      .admin-whatsapp-action:hover{background:#dffbea;border-color:#137333;}
      .admin-whatsapp-action.test{border-color:#b7791f;background:#fff7db;color:#7a4b00;}
      .admin-whatsapp-action.test:hover{background:#fff1bd;border-color:#8a6200;}
      .admin-whatsapp-action.disabled{opacity:.45;cursor:not-allowed;background:#f3f3f3;color:#777;border-color:#ddd;}
      .admin-client-details{border-top:1px solid #f0ebe3;background:#fffaf5;padding:0;}
      .admin-client-details summary{cursor:pointer;padding:10px 14px;font-weight:1000;color:#5f5147;}
      .admin-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:0 14px 14px;}
      .admin-detail-box{border:1px solid #eee6dc;border-radius:14px;background:#fff;padding:10px;font-size:12px;line-height:1.35;}
      .admin-detail-box strong{display:block;margin-bottom:4px;color:#1f1f1f;}
      .admin-toolbar label{display:grid;gap:5px;font-size:12px;color:#6e6e6e;font-weight:900;text-transform:uppercase;}
      .admin-toolbar input,.admin-toolbar select{min-height:42px;border:1px solid #e7e1d8;border-radius:12px;background:#fff;padding:0 12px;font-weight:800;}
      .admin-human-card{display:grid;gap:4px;min-width:220px;}
      .admin-human-name{font-weight:1000;font-size:14px;color:#1f1f1f;}
      .admin-human-line{font-size:12px;color:#5f5147;line-height:1.28;}
      .admin-human-line strong{color:#1f1f1f;}
      .admin-tech-id{margin-top:5px;font-size:11px;color:#8a8178;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}
      .admin-user-card{display:grid;gap:4px;}
      .admin-user-email{font-weight:1000;color:#1f1f1f;}
                  .admin-business-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
      .admin-business-actions .admin-action-mini{margin-top:0;}
      .admin-action-mini{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:10px;padding:7px 10px;font-weight:900;cursor:pointer;background:#f0ebe3;color:#3a2a22;margin-top:6px;}
      .admin-action-mini.danger{background:#fff0f0;color:#a51616;}
      .admin-action-mini.success{background:#ecfff2;color:#137333;}
      .admin-status-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:1000;background:#eef2ff;color:#1d3b7a;}
      .admin-status-pill.danger{background:#fff0f0;color:#a51616;}
      .admin-status-pill.success{background:#ecfff2;color:#137333;}
      .admin-status-pill.warn{background:#fff7df;color:#8a6200;}
      .admin-help{margin-bottom:12px;padding:12px;border-radius:14px;background:#fff8f4;color:#6b4b3e;font-size:13px;line-height:1.35;}
      .admin-test-toolbox{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;padding:12px;border:1px solid #ecd7a8;border-radius:14px;background:#fffaf0;color:#5f3d00;}
      .admin-test-toolbox strong{display:block;color:#3a2a00;margin-bottom:3px;}
      .admin-test-toolbox small{display:block;line-height:1.35;color:#6d560c;}
      .admin-test-toolbox button{min-height:38px;padding:0 12px;border:0;border-radius:10px;background:#8a6200;color:#fff;font-weight:1000;cursor:pointer;}
      .admin-test-toolbox button:disabled{background:#d6ccb1;color:#756747;cursor:not-allowed;}
      .admin-status-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-bottom:12px;}
      .admin-status-legend div{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #eee6dc;font-size:12px;line-height:1.3;color:#5f5147;}
      .admin-status-legend strong{display:block;color:#1f1f1f;margin-bottom:2px;}
      .admin-commercial-card{display:grid;gap:5px;min-width:210px;padding:10px;border:1px solid;border-radius:14px;}
      .admin-commercial-title{font-weight:1000;font-size:13px;}
      .admin-commercial-desc{font-size:12px;line-height:1.25;font-weight:800;}
      .admin-commercial-grid{display:flex;gap:7px;flex-wrap:wrap;font-size:11px;}
      .admin-commercial-action{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.02em;opacity:.84;}
      .admin-oper-state{display:grid;gap:5px;min-width:180px;padding:10px;border:1px solid;border-radius:14px;background:#fff;}
      .admin-oper-title{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.03em;opacity:.78;}
      .admin-oper-label{font-size:13px;font-weight:1000;line-height:1.15;}
      .admin-oper-help{font-size:12px;line-height:1.28;font-weight:800;}
      .admin-oper-action{font-size:11px;line-height:1.25;font-weight:1000;text-transform:uppercase;letter-spacing:.02em;opacity:.86;}
      .admin-row-archived{background:#fbfaf7;}
      .admin-control-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px;}
      .admin-control-card{padding:14px;border:1px solid #e7e1d8;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.04);}
      .admin-control-label{font-size:12px;color:#6e6e6e;font-weight:900;text-transform:uppercase;}
      .admin-control-value{font-size:28px;font-weight:1000;margin-top:4px;}
      .admin-control-list{display:grid;gap:8px;}
      .admin-control-row{display:grid;grid-template-columns:minmax(200px,1fr) auto;gap:10px;align-items:center;border-bottom:1px solid #f0ebe3;padding:9px 0;}
      .admin-control-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
      .admin-table-wrap{overflow:auto;border:1px solid #eee6dc;border-radius:16px;}
      .admin-actions{position:relative;display:flex;gap:7px;flex-wrap:wrap;align-items:flex-start;}
      .admin-actions button{min-height:32px;padding:0 10px;border:none;border-radius:8px;font-weight:900;cursor:pointer;}
      .admin-primary-action{background:#b63b2b;color:#fff;}
      .admin-kebab-btn{background:#ece7df;color:#1f1f1f;min-width:36px;}
      .admin-action-menu{position:absolute;right:0;top:40px;z-index:20;width:220px;padding:8px;border:1px solid #e7e1d8;border-radius:14px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.16);display:none;}
      .admin-action-menu.open{display:block;}
      .admin-action-menu-title{padding:7px 9px;color:#6e6e6e;font-size:12px;font-weight:900;text-transform:uppercase;}
      .admin-action-menu button{width:100%;justify-content:flex-start;text-align:left;background:transparent;color:#1f1f1f;border-radius:10px;padding:9px 10px;min-height:36px;}
      .admin-action-menu button:hover{background:#fff8f4;}
      .admin-action-menu button.danger{color:#b42318;}
      .admin-danger-box{padding:14px;border:1px solid #f0b4ae;border-radius:14px;background:#fff1f0;color:#842029;line-height:1.4;}
      .admin-manage-modules{min-height:34px;padding:0 11px;border:1px solid #d8cfc2;border-radius:10px;background:#fff;color:#1f1f1f;font-weight:900;cursor:pointer;white-space:nowrap;}
      .admin-manage-modules:hover{border-color:#b63b2b;color:#b63b2b;background:#fff8f4;}
      .admin-modal-backdrop{position:fixed;inset:0;background:rgba(20,20,20,.46);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;}
      .admin-modal{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.26);border:1px solid #e7e1d8;}
      .admin-modal-header{position:sticky;top:0;background:#fff;border-bottom:1px solid #eee6dc;padding:18px 20px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;z-index:1;}
      .admin-modal-body{padding:16px 20px;display:grid;gap:10px;}
      .admin-modal-footer{position:sticky;bottom:0;background:#fff;border-top:1px solid #eee6dc;padding:14px 20px;display:flex;justify-content:flex-end;gap:10px;}
      .admin-module-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px;border:1px solid #eee6dc;border-radius:16px;background:#fffaf5;}
      .admin-module-row strong{display:block;margin-bottom:4px;}
      .admin-module-row p{margin:0;color:#6e6e6e;font-size:13px;line-height:1.35;}
      .admin-switch{position:relative;display:inline-flex;width:64px;height:36px;align-items:center;cursor:pointer;}
      .admin-switch input{display:none;}
      .admin-switch span{position:absolute;inset:0;border-radius:999px;background:#d9d2c9;transition:.2s;}
      .admin-switch span:before{content:"";position:absolute;width:28px;height:28px;left:4px;top:4px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:.2s;}
      .admin-switch input:checked + span{background:#17803a;}
      .admin-switch input:checked + span:before{transform:translateX(28px);}
      @media (max-width: 760px){
        .admin-toolbar{grid-template-columns:1fr;}
        #adminContent{padding:10px !important;}
        .admin-table-wrap{border-radius:14px;}
      }
    </style>

    <div id="adminContent" style="overflow:auto;border:1px solid #e7e1d8;border-radius:14px;background:#fff;padding:14px;">
      <div style="padding:18px;color:#6e6e6e;">Cargando panel admin...</div>
    </div>
  `;

  const content = container.querySelector("#adminContent");
  const reloadBtn = container.querySelector("#reloadAdminBtn");
  let activeTab = "businesses";
  let businesses = [];
  let users = [];
  let businessSearch = "";
  let businessStatusFilter = "all";
  let businessBillingFilter = "all";
  let businessPlanFilter = "all";
  let businessAdminFilter = "all";
  let businessSearchTimer = null;

  async function loadData() {
    content.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Cargando datos admin...</div>`;
    try {
      [businesses, users] = await Promise.all([listAdminBusinesses(), listAdminUsers()]);
  // APPPROMOS V12.10-B2-B FIX4 — Acciones admin visibles
  if (!content.dataset.safeAdminActionsBound) {
    content.dataset.safeAdminActionsBound = "true";

    content.addEventListener("click", async (event) => {
      const archiveButton = event.target.closest("[data-archive-business]");
      if (archiveButton) {
        event.preventDefault();
        event.stopPropagation();

        const businessId = archiveButton.dataset.archiveBusiness;
        const row = businesses.find((b) => String(b.businessId || "") === String(businessId || ""));
        const label = businessHumanName(row || { businessId });

        const ok = window.confirm(`Vas a archivar "${label}". La empresa queda guardada, pero fuera del uso normal. ¿Continuar?`);
        if (!ok) return;

        try {
          await archiveBusiness(businessId);
          window.alert("Empresa archivada.");
          await loadData();
        } catch (error) {
          console.error("No se pudo archivar empresa", error);
          window.alert("No se pudo archivar la empresa. Revisá permisos o consola.");
        }
        return;
      }

      const restoreButton = event.target.closest("[data-restore-business]");
      if (restoreButton) {
        event.preventDefault();
        event.stopPropagation();

        const businessId = restoreButton.dataset.restoreBusiness;
        const row = businesses.find((b) => String(b.businessId || "") === String(businessId || ""));
        const label = businessHumanName(row || { businessId });

        const ok = window.confirm(`Vas a restaurar "${label}". ¿Continuar?`);
        if (!ok) return;

        try {
          await restoreBusiness(businessId);
          window.alert("Empresa restaurada.");
          await loadData();
        } catch (error) {
          console.error("No se pudo restaurar empresa", error);
          window.alert("No se pudo restaurar la empresa. Revisá permisos o consola.");
        }
        return;
      }

      const disableUserButton = event.target.closest("[data-disable-user]");
      if (disableUserButton) {
        event.preventDefault();
        event.stopPropagation();

        const uid = disableUserButton.dataset.disableUser;
        const user = users.find((u) => String(u.uid || "") === String(uid || ""));
        const label = user?.email || shortUid(uid);

        const ok = window.confirm(`Vas a desactivar el usuario "${label}". No se borra de Auth; queda marcado como desactivado en AppPromos. ¿Continuar?`);
        if (!ok) return;

        try {
          await setUserDisabled(uid, true);
          window.alert("Usuario desactivado.");
          await loadData();
        } catch (error) {
          console.error("No se pudo desactivar usuario", error);
          window.alert("No se pudo desactivar el usuario. Revisá permisos o consola.");
        }
        return;
      }

      const enableUserButton = event.target.closest("[data-enable-user]");
      if (enableUserButton) {
        event.preventDefault();
        event.stopPropagation();

        const uid = enableUserButton.dataset.enableUser;
        const user = users.find((u) => String(u.uid || "") === String(uid || ""));
        const label = user?.email || shortUid(uid);

        const ok = window.confirm(`Vas a reactivar el usuario "${label}". ¿Continuar?`);
        if (!ok) return;

        try {
          await setUserDisabled(uid, false);
          window.alert("Usuario reactivado.");
          await loadData();
        } catch (error) {
          console.error("No se pudo reactivar usuario", error);
          window.alert("No se pudo reactivar el usuario. Revisá permisos o consola.");
        }
        return;
      }
    });
  }

      renderActiveTab();
    } catch (error) {
      console.error("Error cargando admin:", error);
      content.innerHTML = `<div style="padding:18px;color:#b42318;">Error cargando admin: ${escapeHtml(error?.message || "desconocido")}</div>`;
    }
  }

  function renderBusinesses(options = {}) {
    if (!businesses.length) {
      content.innerHTML = `<div style="padding:18px;color:#6e6e6e;">No hay carnicerías cargadas.</div>`;
      return;
    }

    const q = businessSearch.trim().toLowerCase();
    const testCount = businesses.filter((row) => row.isTestBusiness === true).length;
    const realCount = Math.max(0, businesses.length - testCount);
    const canMarkCurrentBaseAsTest = businesses.length > 0 && realCount > 0;
    const visibleBusinesses = businesses.filter((row) => {
      const haystack = [row.name, row.displayName, row.businessId, row.ownerEmail, row.email, row.owner?.email, row.responsable, row.responsibleName, row.telefono, row.phone, row.whatsapp, row.localidad, row.provincia, row.meta?.name, row.meta?.responsable, row.meta?.telefono, row.meta?.localidad, row.meta?.provincia]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const archived = isArchivedBusiness(row);
      const isTest = row.isTestBusiness === true;
      const isClone = Boolean(row.clonedFromBusinessId);
      const matchesStatus = businessStatusFilter === "all"
        || (businessStatusFilter === "archived" && archived)
        || (businessStatusFilter !== "archived" && !archived && String(row.status || "active") === businessStatusFilter);
      const matchesBilling = businessBillingFilter === "all" || String(row.billing?.status || "active") === businessBillingFilter;
      const matchesPlan = businessPlanFilter === "all" || String(row.billing?.plan || "trial") === businessPlanFilter;
      const matchesAdmin = businessAdminFilter === "all"
        || (businessAdminFilter === "archived" && archived)
        || (businessAdminFilter === "test" && isTest && !archived)
        || (businessAdminFilter === "real" && !isTest && !archived)
        || (businessAdminFilter === "clone" && isClone);
      return matchesSearch && matchesStatus && matchesBilling && matchesPlan && matchesAdmin;
    });

    content.innerHTML = `
      <div class="admin-help">
        <strong>Panel operativo:</strong> vista compacta para decidir rápido. La ayuda completa queda en “Ver detalle y acciones”, así la pantalla no se llena de datos todos juntos.
      </div>

      <div class="admin-test-toolbox">
        <div>
          <strong>Base actual: ${testCount} TEST · ${realCount} sin marca TEST</strong>
          <small>Usar antes del primer cliente real. Marca empresas, usuarios asociados e índices públicos como prueba. No borra nada ni libera WhatsApp/slug.</small>
        </div>
        <button data-mark-current-base-test type="button" ${canMarkCurrentBaseAsTest ? "" : "disabled"}>${canMarkCurrentBaseAsTest ? "Marcar base actual como TEST" : "Base actual marcada como TEST"}</button>
      </div>

      <div class="admin-toolbar">
        <label>
          Buscar carnicería
          <input id="adminBusinessSearch" type="search" placeholder="Nombre, responsable, email, teléfono o localidad..." value="${escapeHtml(businessSearch)}" />
        </label>
        <label>
          Acceso
          <select id="adminStatusFilter">
            ${["all","active","trial","suspended","disabled","archived"].map((s) => `<option value="${s}" ${businessStatusFilter === s ? "selected" : ""}>${s === "all" ? "Todos" : s === "archived" ? "Archivadas" : accessLabel(s)}</option>`).join("")}
          </select>
        </label>
        <label>
          Pago
          <select id="adminBillingFilter">
            ${["all", ...ADMIN_PAYMENT_STATUSES].map((s) => `<option value="${s}" ${businessBillingFilter === s ? "selected" : ""}>${s === "all" ? "Todos" : paymentLabel(s)}</option>`).join("")}
          </select>
        </label>
        <label>
          Plan
          <select id="adminPlanFilter">
            ${["all", ...ADMIN_BILLING_PLANS].map((p) => `<option value="${p}" ${businessPlanFilter === p ? "selected" : ""}>${p === "all" ? "Todos" : planLabel(p)}</option>`).join("")}
          </select>
        </label>
        <label>
          Admin
          <select id="adminAdminFilter">
            ${["all","real","test","archived","clone"].map((s) => `<option value="${s}" ${businessAdminFilter === s ? "selected" : ""}>${adminFilterLabel(s)}</option>`).join("")}
          </select>
        </label>
      </div>

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
        <div style="font-weight:900;">${visibleBusinesses.length} de ${businesses.length} carnicerías</div>
        <div style="color:#6e6e6e;font-size:13px;">Tip: el filtro <strong>Empresas TEST</strong> te permite limpiar pruebas sin mezclar clientes reales.</div>
      </div>

      ${visibleBusinesses.length ? `
        <div class="admin-client-list">
          ${visibleBusinesses.map((row) => {
            const commercial = getBusinessCommercialStatus(row);
            const accessState = getAccessAdminState(row);
            const paymentState = getPaymentAdminState(row);
            const planState = getPlanAdminState(row);
            const internalState = getInternalAdminState(row);
            const archived = isArchivedBusiness(row);
            return `
              <article class="admin-client-card ${archived ? "archived" : ""}">
                <div class="admin-client-main">
                  <div class="admin-human-card">
                    <div class="admin-human-name">${escapeHtml(businessHumanName(row))}</div>
                    <div class="admin-human-line"><strong>Responsable:</strong> ${escapeHtml(businessOwnerName(row))}</div>
                    <div class="admin-human-line"><strong>WhatsApp:</strong> ${escapeHtml(businessPhone(row))}</div>
                    <div class="admin-human-line"><strong>Email:</strong> ${escapeHtml(businessOwnerEmail(row))}</div>
                    <div class="admin-human-line"><strong>Ubicación:</strong> ${escapeHtml(businessLocation(row))}</div>
                    ${row.isTestBusiness ? `<div style="margin-top:6px;color:#8a6200;font-weight:1000;font-size:12px;">EMPRESA TEST</div>` : ""}
                    <div class="admin-tech-id">ID técnico: ${escapeHtml(shortUid(row.businessId))}</div>
                  </div>

                  <div class="admin-state-strip">
                    ${renderCompactState("Acceso", accessState)}
                    ${renderCompactState("Pago", paymentState)}
                    ${renderCompactState("Plan", planState)}
                    ${renderCompactState("Admin", internalState)}
                  </div>

                  <div class="admin-client-actions">
                    ${renderWhatsappAction(row, "📲 Escribir")}
                    <button data-enter-business="${escapeHtml(row.businessId)}" type="button" class="admin-primary-action">Entrar</button>
                    <button class="admin-manage-modules" data-manage-modules="${escapeHtml(row.businessId)}" type="button">Módulos</button>
                    ${archived
                      ? `<button class="admin-action-mini success" data-restore-business="${escapeHtml(row.businessId)}" type="button">Restaurar</button>`
                      : `<button class="admin-action-mini danger" data-archive-business="${escapeHtml(row.businessId)}" type="button">Archivar</button>`}
                  </div>
                </div>

                <details class="admin-client-details">
                  <summary>Ver detalle, herramientas y acciones</summary>
                  <div class="admin-detail-grid">
                    <div class="admin-detail-box">
                      <strong>Datos del cliente</strong>
                      <div>Responsable: ${escapeHtml(businessOwnerName(row))}</div>
                      <div>Email: ${escapeHtml(businessOwnerEmail(row))}</div>
                      <div>WhatsApp: ${escapeHtml(businessPhone(row))}</div>
                      <div>Ubicación: ${escapeHtml(businessLocation(row))}</div>
                      ${businessAddress(row) ? `<div>Dirección: ${escapeHtml(businessAddress(row))}</div>` : ""}
                      <div class="admin-tech-id">ID técnico completo: ${escapeHtml(row.businessId)}</div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Qué significa</strong>
                      <div><b>Acceso:</b> ${escapeHtml(accessState.action)}</div>
                      <div><b>Pago:</b> ${escapeHtml(paymentState.action)}</div>
                      <div><b>Plan:</b> ${escapeHtml(planState.action)}</div>
                      <div><b>Admin:</b> ${escapeHtml(internalState.action)}</div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Cambiar estados</strong>
                      <div style="display:grid;gap:8px;">
                        <label>Acceso<br><select class="admin-select" data-status-business="${escapeHtml(row.businessId)}">
                          ${["active","trial","suspended","disabled"].map((s) => `<option value="${s}" ${row.status === s ? "selected" : ""}>${accessLabel(s)}</option>`).join("")}
                        </select></label>
                        <label>Pago<br><select class="admin-select" data-billing-business="${escapeHtml(row.businessId)}">
                          ${ADMIN_PAYMENT_STATUSES.map((s) => `<option value="${s}" ${String(row.billing?.status || "active") === s ? "selected" : ""}>${paymentLabel(s)}</option>`).join("")}
                        </select></label>
                        <label>Plan<br><select class="admin-select" data-plan-business="${escapeHtml(row.businessId)}">
                          ${ADMIN_BILLING_PLANS.map((p) => `<option value="${p}" ${String(row.billing?.plan || "trial").toLowerCase() === p ? "selected" : ""}>${planLabel(p)}</option>`).join("")}
                        </select></label>
                      </div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Gestión comercial</strong>
                      <div style="display:grid;gap:8px;">
                        <div><b>Plan actual:</b> ${escapeHtml(planLabel(row.billing?.plan || "trial"))}</div>
                        <div><b>Pago:</b> ${escapeHtml(paymentLabel(row.billing?.status || "active"))}</div>
                        <label>Próximo vencimiento / fecha de pago
                          <input class="admin-input" type="date" data-payment-due-business="${escapeHtml(row.businessId)}" value="${escapeHtml(businessPaymentDueInput(row))}" />
                        </label>
                        <div><b>Último pago registrado:</b> ${escapeHtml(businessLastPaymentLabel(row))}</div>
                        <button data-payment-received-business="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini success">Marcar pago recibido</button>
                      </div>
                      <div style="margin-top:8px;color:#6e6e6e;font-size:12px;line-height:1.35;">
                        Usá esto para seguimiento comercial manual. La automatización de avisos 48/72 hs queda para otro bloque.
                      </div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Nota interna</strong>
                      <textarea data-internal-note-business="${escapeHtml(row.businessId)}" rows="4" placeholder="Ej: Lo contacté el 03/05. Quiere pasar a Salvador cuando termine la prueba." style="width:100%;box-sizing:border-box;border:1px solid #e7e1d8;border-radius:12px;padding:10px;font-family:inherit;resize:vertical;">${escapeHtml(businessInternalNote(row))}</textarea>
                      <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                        <button data-save-internal-note="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini">Guardar nota</button>
                      </div>
                      <div style="margin-top:8px;color:#6e6e6e;font-size:12px;line-height:1.35;">
                        Esta nota es solo para administración. No la ve el carnicero.
                      </div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Actividad y módulos</strong>
                      <div>Último login: ${fmtDate(row.lastLoginAt)}</div>
                      <div>Última actividad: ${fmtDate(row.lastActivityAt)}</div>
                      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                        ${Object.keys(DEFAULT_MODULES).map((key) => moduleSummaryChip(row, key)).join("")}
                      </div>
                      <div style="margin-top:10px;">${commercialBadge(commercial)}</div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Contacto rápido</strong>
                      <div>WhatsApp registrado: ${escapeHtml(businessPhone(row))}</div>
                      <div style="margin-top:8px;display:flex;gap:7px;flex-wrap:wrap;">
                        ${renderWhatsappAction(row, "📲 Escribir por WhatsApp")}
                      </div>
                      ${row.isTestBusiness ? `<div style="margin-top:8px;color:#7a4b00;font-size:12px;line-height:1.35;"><strong>Empresa TEST:</strong> verificá que este número sea de prueba antes de enviar.</div>` : ""}
                      <div style="margin-top:8px;color:#6e6e6e;font-size:12px;line-height:1.35;">
                        Abre WhatsApp con un mensaje base editable. Los mensajes por pago, prueba por vencer o cambio de plan van en el próximo bloque de Control operativo.
                      </div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Herramientas de administración</strong>
                      <div style="display:flex;gap:7px;flex-wrap:wrap;">
                        <button data-test-business="${escapeHtml(row.businessId)}" data-test-current="${row.isTestBusiness ? "true" : "false"}" type="button" class="admin-action-mini">${row.isTestBusiness ? "Quitar TEST" : "Marcar TEST"}</button>
                        <button data-logs-business="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini">Ver logs</button>
                        <button data-defaults-business="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini">Reparar configuración base</button>
                        ${row.isTestBusiness
                          ? `<button data-clone-test-business="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini">Clonar como TEST</button>`
                          : `<button type="button" class="admin-action-mini" disabled title="Solo disponible para empresas TEST">Clonar solo TEST</button>`}
                      </div>
                      <div style="margin-top:8px;color:#6e6e6e;font-size:12px;line-height:1.35;">
                        “Reparar configuración base” se usa solo si una empresa vieja o de prueba no muestra bien módulos, acceso o datos básicos. No es una acción diaria.
                      </div>
                      <div style="margin-top:8px;color:#7a4b00;font-size:12px;line-height:1.35;">
                        <strong>Empresas TEST:</strong> sirven para probar, clonar escenarios y limpiar datos sin tocar clientes reales. Ver documentación en <code>public/docs/EMPRESAS_TEST_APPPROMOS.md</code>.
                      </div>
                    </div>

                    <div class="admin-detail-box">
                      <strong>Zona peligrosa</strong>
                      <div style="display:flex;gap:7px;flex-wrap:wrap;">
                        ${row.isTestBusiness
                          ? `<button data-delete-test-business="${escapeHtml(row.businessId)}" type="button" class="admin-action-mini danger">Eliminar TEST</button>`
                          : `<button type="button" class="admin-action-mini danger" disabled title="Los clientes reales se archivan. No se eliminan desde acá.">Eliminar solo TEST</button>`}
                      </div>
                      <div style="margin-top:8px;color:#6e6e6e;font-size:12px;line-height:1.35;">
                        Eliminar TEST borra datos de prueba conocidos y libera índices TEST. No borra usuarios de Firebase Auth. Para clientes reales, usar Archivar.
                      </div>
                    </div>
                  </div>
                </details>
              </article>
            `;
          }).join("")}
        </div>
      ` : `<div style="padding:18px;border:1px dashed #e7e1d8;border-radius:14px;color:#6e6e6e;background:#fff;">No hay carnicerías que coincidan con los filtros.</div>`}
    `;

    const searchInput = content.querySelector("#adminBusinessSearch");
    searchInput?.addEventListener("input", (event) => {
      businessSearch = event.target.value || "";
      if (businessSearchTimer) window.clearTimeout(businessSearchTimer);
      businessSearchTimer = window.setTimeout(() => {
        renderBusinesses({ focusSearch: true });
      }, 250);
    });
    if (options.focusSearch && searchInput) {
      window.requestAnimationFrame(() => {
        const nextInput = content.querySelector("#adminBusinessSearch");
        if (!nextInput) return;
        nextInput.focus();
        const end = nextInput.value.length;
        try { nextInput.setSelectionRange(end, end); } catch (_) {}
      });
    }
    content.querySelector("#adminStatusFilter")?.addEventListener("change", (event) => {
      businessStatusFilter = event.target.value || "all";
      renderBusinesses();
    });
    content.querySelector("#adminBillingFilter")?.addEventListener("change", (event) => {
      businessBillingFilter = event.target.value || "all";
      renderBusinesses();
    });
    content.querySelector("#adminPlanFilter")?.addEventListener("change", (event) => {
      businessPlanFilter = event.target.value || "all";
      renderBusinesses();
    });
    content.querySelector("#adminAdminFilter")?.addEventListener("change", (event) => {
      businessAdminFilter = event.target.value || "all";
      renderBusinesses();
    });
    bindBusinessActions();
  }

  function renderUsers() {
    content.innerHTML = `
      <div class="admin-help">
        <strong>Usuarios:</strong> acá se ve quién entra a AppPromos, con qué email, qué rol tiene y a qué carnicería pertenece. Las contraseñas no se muestran por seguridad.
      </div>

      <div class="admin-table-wrap">
        <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:920px;">
          <thead><tr style="background:#f8f5f0;">
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Usuario</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Rol</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Carnicería</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Acceso</th>
          </tr></thead>
          <tbody>
            ${users.map((u) => {
              const linkedBusiness = findBusinessForUser(u, businesses);
              const disabledUser = isDisabledUser(u);
              return `
                <tr>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <div class="admin-user-card">
                      <div class="admin-user-email">${escapeHtml(u.email || "Sin email")}</div>
                      ${u.displayName ? `<div class="admin-human-line"><strong>Nombre:</strong> ${escapeHtml(u.displayName)}</div>` : ""}
                      <div class="admin-tech-id">UID técnico: ${escapeHtml(shortUid(u.uid))}</div>
                    </div>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">${escapeHtml(u.role || "client")}</td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    ${linkedBusiness ? `
                      <div class="admin-human-name">${escapeHtml(businessHumanName(linkedBusiness))}</div>
                      <div class="admin-human-line"><strong>Responsable:</strong> ${escapeHtml(businessOwnerName(linkedBusiness))}</div>
                      <div class="admin-human-line"><strong>WhatsApp:</strong> ${escapeHtml(businessPhone(linkedBusiness))}</div>
                      <div class="admin-tech-id">ID técnico: ${escapeHtml(u.businessId || "—")}</div>
                    ` : `
                      <div class="admin-human-line">Sin carnicería asociada</div>
                      <div class="admin-tech-id">${escapeHtml(u.businessId || "—")}</div>
                    `}
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <div class="admin-status-pill ${disabledUser ? "danger" : "success"}">${escapeHtml(userStatusLabel(u))}</div>
                    <div>
                      ${disabledUser
                        ? `<button class="admin-action-mini success" data-enable-user="${escapeHtml(u.uid)}" type="button">Reactivar usuario</button>`
                        : `<button class="admin-action-mini danger" data-disable-user="${escapeHtml(u.uid)}" type="button">Desactivar usuario</button>`}
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

  function renderActiveTab() {
    if (activeTab === "businesses") renderBusinesses();
    if (activeTab === "users") renderUsers();
    if (activeTab === "metrics") {
      content.innerHTML = renderMetrics(businesses);
      bindBusinessActions();
    }
  }

  function openModulesModal(row) {
    const businessId = row.businessId;
    const draftModules = { ...DEFAULT_MODULES, ...(row.modules || {}) };

    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Gestionar módulos">
        <div class="admin-modal-header">
          <div>
            <h3 style="margin:0;font-size:22px;">Gestionar módulos</h3>
            <div style="margin-top:5px;color:#6e6e6e;font-size:14px;">
              ${escapeHtml(row.name || businessId)} · los cambios se aplican recién al guardar.
            </div>
          </div>
          <button type="button" data-close-modules-modal style="min-width:38px;min-height:38px;border:none;border-radius:999px;background:#ece7df;font-weight:900;cursor:pointer;">✕</button>
        </div>

        <div class="admin-modal-body">
          ${Object.keys(DEFAULT_MODULES).map((key) => `
            <div class="admin-module-row">
              <div>
                <strong>${escapeHtml(MODULE_LABELS[key] || key)}</strong>
                <p>${escapeHtml(MODULE_DESCRIPTIONS[key] || "Módulo comercial de AppPromos.")}</p>
              </div>
              <label class="admin-switch" title="Activar o desactivar ${escapeHtml(MODULE_LABELS[key] || key)}">
                <input type="checkbox" data-module-draft="${escapeHtml(key)}" ${draftModules[key] ? "checked" : ""} />
                <span></span>
              </label>
            </div>
          `).join("")}
        </div>

        <div class="admin-modal-footer">
          <button type="button" data-close-modules-modal style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;">Cancelar</button>
          <button type="button" data-save-modules-modal style="min-height:40px;padding:0 16px;border:none;border-radius:10px;background:#b63b2b;color:#fff;font-weight:900;cursor:pointer;">Guardar cambios</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelectorAll("[data-close-modules-modal]").forEach((button) => button.addEventListener("click", close));

    backdrop.querySelector("[data-save-modules-modal]")?.addEventListener("click", async () => {
      const saveButton = backdrop.querySelector("[data-save-modules-modal]");
      saveButton.disabled = true;
      saveButton.textContent = "Guardando...";

      const nextModules = { ...draftModules };
      backdrop.querySelectorAll("[data-module-draft]").forEach((input) => {
        nextModules[input.dataset.moduleDraft] = input.checked;
      });

      try {
        const changes = Object.keys(DEFAULT_MODULES).filter((key) => nextModules[key] !== (row.modules?.[key] === true));
        if (changes.length) {
          await updateBusinessModules(businessId, nextModules);
        }
        close();
        await loadData();
      } catch (error) {
        alert(error?.message || "No se pudieron guardar los módulos");
        saveButton.disabled = false;
        saveButton.textContent = "Guardar cambios";
      }
    });

    document.body.appendChild(backdrop);
  }

  function closeAllActionMenus(exceptBusinessId = null) {
    content.querySelectorAll("[data-action-menu]").forEach((menu) => {
      menu.classList.toggle("open", Boolean(exceptBusinessId && menu.dataset.actionMenu === exceptBusinessId));
    });
  }

  async function openLogsModal(row) {
    const businessId = row.businessId;
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Logs admin">
        <div class="admin-modal-header">
          <div>
            <h3 style="margin:0;font-size:22px;">Logs admin</h3>
            <div style="margin-top:5px;color:#6e6e6e;font-size:14px;">
              ${escapeHtml(row.name || businessId)} · últimas acciones registradas.
            </div>
          </div>
          <button type="button" data-close-logs-modal style="min-width:38px;min-height:38px;border:none;border-radius:999px;background:#ece7df;font-weight:900;cursor:pointer;">✕</button>
        </div>
        <div class="admin-modal-body" data-logs-body>
          <div style="padding:14px;color:#6e6e6e;">Cargando logs...</div>
        </div>
        <div class="admin-modal-footer">
          <button type="button" data-close-logs-modal style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#1f1f1f;color:#fff;font-weight:900;cursor:pointer;">Cerrar</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelectorAll("[data-close-logs-modal]").forEach((button) => button.addEventListener("click", close));
    document.body.appendChild(backdrop);

    const body = backdrop.querySelector("[data-logs-body]");
    try {
      const logs = await listAdminActionsForBusiness(businessId, 20);
      body.innerHTML = logs.length ? `
        <div style="display:grid;gap:10px;">
          ${logs.map((log) => `
            <div style="padding:12px;border:1px solid #eee6dc;border-radius:14px;background:#fffaf5;">
              <div style="font-weight:900;">${escapeHtml(log.action || "acción")}</div>
              <div style="font-size:12px;color:#6e6e6e;margin-top:3px;">
                ${escapeHtml(log.adminEmail || "admin")} · ${fmtDate(log.createdAtIso || log.createdAt)}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `<div style="padding:14px;color:#6e6e6e;">No hay logs para esta carnicería todavía.</div>`;
    } catch (error) {
      body.innerHTML = `<div style="padding:14px;color:#b42318;">No se pudieron cargar los logs: ${escapeHtml(error?.message || "error desconocido")}</div>`;
    }
  }

  function openCloneTestModal(row) {
    const businessId = row.businessId;
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Clonar empresa como TEST">
        <div class="admin-modal-header">
          <div>
            <h3 style="margin:0;font-size:22px;">Clonar como TEST</h3>
            <div style="margin-top:5px;color:#6e6e6e;font-size:14px;">
              ${escapeHtml(businessHumanName(row))}
            </div>
          </div>
          <button type="button" data-close-clone-modal style="min-width:38px;min-height:38px;border:none;border-radius:999px;background:#ece7df;font-weight:900;cursor:pointer;">✕</button>
        </div>

        <div class="admin-modal-body">
          <div class="admin-help" style="margin:0;">
            <strong>Esto crea una copia de prueba.</strong><br>
            Copia catálogo/precios y configuración conocida, pero no crea usuario Auth, no duplica WhatsApp como índice real, no publica web y no convierte la copia en cliente real.
          </div>
          <div style="margin-top:12px;padding:12px;border:1px solid #f1d79a;border-radius:14px;background:#fff8e7;color:#7a4b00;font-size:13px;line-height:1.35;">
            Usá esta acción para probar cambios, reproducir bugs o armar escenarios de demo sin tocar clientes reales.
          </div>
        </div>

        <div class="admin-modal-footer">
          <button type="button" data-close-clone-modal style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;">Cancelar</button>
          <button type="button" data-confirm-clone-test style="min-height:40px;padding:0 16px;border:none;border-radius:10px;background:#1f1f1f;color:#fff;font-weight:900;cursor:pointer;">Crear copia TEST</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelectorAll("[data-close-clone-modal]").forEach((button) => button.addEventListener("click", close));

    backdrop.querySelector("[data-confirm-clone-test]")?.addEventListener("click", async () => {
      const button = backdrop.querySelector("[data-confirm-clone-test]");
      button.disabled = true;
      button.textContent = "Clonando...";
      try {
        const result = await cloneBusinessAsTest(businessId);
        close();
        await loadData();
        alert(
          `Copia TEST creada.\n\n` +
          `Nueva empresa: ${result.name || "Copia TEST"}\n` +
          `ID: ${result.newBusinessId}\n\n` +
          `No se creó usuario Auth, no se publicó web y no se duplicó WhatsApp como índice real.`
        );
      } catch (error) {
        alert(error?.message || "No se pudo clonar la empresa TEST");
        button.disabled = false;
        button.textContent = "Crear copia TEST";
      }
    });

    document.body.appendChild(backdrop);
  }

  function openDeleteTestModal(row) {
    const businessId = row.businessId;
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Eliminar empresa TEST">
        <div class="admin-modal-header">
          <div>
            <h3 style="margin:0;font-size:22px;color:#b42318;">Eliminar empresa TEST</h3>
            <div style="margin-top:5px;color:#6e6e6e;font-size:14px;">
              ${escapeHtml(businessHumanName(row))}
            </div>
          </div>
          <button type="button" data-close-delete-modal style="min-width:38px;min-height:38px;border:none;border-radius:999px;background:#ece7df;font-weight:900;cursor:pointer;">✕</button>
        </div>

        <div class="admin-modal-body">
          <div class="admin-danger-box">
            <strong>Esta acción es irreversible.</strong><br>
            Solo se permite para empresas marcadas como TEST. Borra datos de prueba conocidos y puede liberar índices TEST de WhatsApp/web. No borra usuarios de Firebase Auth.
          </div>
          <label style="display:grid;gap:6px;font-weight:900;">
            Confirmación
            <input data-delete-confirm-input type="text" placeholder="Escribí ELIMINAR TEST" style="min-height:42px;border:1px solid #e7e1d8;border-radius:12px;padding:0 12px;font-weight:900;" />
          </label>
          <div style="margin-top:10px;color:#6e6e6e;font-size:12px;line-height:1.35;">
            Para clientes reales, usá Archivar. No elimines empresas reales desde el frontend.
          </div>
        </div>

        <div class="admin-modal-footer">
          <button type="button" data-close-delete-modal style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;">Cancelar</button>
          <button type="button" data-confirm-delete-test disabled style="min-height:40px;padding:0 16px;border:none;border-radius:10px;background:#b42318;color:#fff;font-weight:900;cursor:pointer;opacity:.45;">Eliminar TEST</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    const input = backdrop.querySelector("[data-delete-confirm-input]");
    const deleteButton = backdrop.querySelector("[data-confirm-delete-test]");

    input?.addEventListener("input", () => {
      const enabled = input.value.trim() === "ELIMINAR TEST";
      deleteButton.disabled = !enabled;
      deleteButton.style.opacity = enabled ? "1" : ".45";
    });

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelectorAll("[data-close-delete-modal]").forEach((button) => button.addEventListener("click", close));

    deleteButton?.addEventListener("click", async () => {
      if (input?.value.trim() !== "ELIMINAR TEST") return;
      deleteButton.disabled = true;
      deleteButton.textContent = "Eliminando...";
      try {
        const result = await deleteTestBusiness(businessId);
        close();
        await loadData();
        alert(
          `Empresa TEST eliminada.\n\n` +
          `Subcolecciones limpiadas: ${Object.values(result.deletedCollections || {}).reduce((total, value) => total + Number(value || 0), 0)} documentos\n` +
          `WhatsApps/index liberados: ${result.phoneKeysDeleted || 0}\n` +
          `Slugs web liberados: ${result.slugsDeleted || 0}\n\n` +
          `No se borró ningún usuario de Firebase Auth.`
        );
      } catch (error) {
        alert(error?.message || "No se pudo eliminar empresa TEST");
        deleteButton.disabled = false;
        deleteButton.textContent = "Eliminar TEST";
      }
    });

    document.body.appendChild(backdrop);
    setTimeout(() => input?.focus(), 50);
  }


  function bindBusinessActions() {
    content.querySelectorAll("[data-action-menu-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const businessId = button.dataset.actionMenuToggle;
        const menu = content.querySelector(`[data-action-menu="${CSS.escape(businessId)}"]`);
        const wasOpen = menu?.classList.contains("open");
        closeAllActionMenus();
        if (menu && !wasOpen) menu.classList.add("open");
      });
    });

    content.addEventListener("click", (event) => {
      if (!event.target.closest(".admin-action-menu") && !event.target.closest("[data-action-menu-toggle]")) {
        closeAllActionMenus();
      }
    }, { once: true });

    content.querySelector("[data-mark-current-base-test]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (!button || button.disabled) return;

      const typed = window.prompt(
        `Esta acción marcará las ${businesses.length} carnicerías actuales como EMPRESAS TEST.\n\nNo borra nada. No toca Auth. No libera WhatsApp ni slug.\n\nPara confirmar escribí: MARCAR TEST`
      );

      if (typed !== "MARCAR TEST") {
        alert("Acción cancelada. No se marcó la base como TEST.");
        return;
      }

      const previousText = button.textContent;
      button.disabled = true;
      button.textContent = "Marcando base...";

      try {
        const result = await markExistingBusinessesAsTest({
          reason: "Base actual marcada como TEST desde Panel Admin antes del primer cliente real"
        });
        alert(
          `Base actual marcada como TEST.\n\n` +
          `Empresas: ${result.businessCount}\n` +
          `Usuarios asociados: ${result.userCount}\n` +
          `WhatsApps/index phoneKey: ${result.phoneKeyCount}\n` +
          `Slugs web: ${result.slugCount}`
        );
        await loadData();
      } catch (error) {
        console.error("No se pudo marcar base como TEST", error);
        alert(error?.message || "No se pudo marcar la base como TEST.");
        button.disabled = false;
        button.textContent = previousText || "Marcar base actual como TEST";
      }
    });

    content.querySelectorAll("[data-status-business]").forEach((select) => {
      select.addEventListener("change", async () => {
        try { await updateBusinessStatus(select.dataset.statusBusiness, select.value); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo cambiar estado"); await loadData(); }
      });
    });

    content.querySelectorAll("[data-billing-business]").forEach((select) => {
      select.addEventListener("change", async () => {
        try { await updateBusinessBillingStatus(select.dataset.billingBusiness, select.value); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo cambiar billing"); await loadData(); }
      });
    });

    content.querySelectorAll("[data-plan-business]").forEach((input) => {
      input.addEventListener("change", async () => {
        try { await updateBusinessBillingPlan(input.dataset.planBusiness, input.value || "trial"); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo cambiar plan"); await loadData(); }
      });
    });

    content.querySelectorAll("[data-payment-due-business]").forEach((input) => {
      input.addEventListener("change", async () => {
        try { await updateBusinessPaymentDueDate(input.dataset.paymentDueBusiness, input.value || null); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo guardar el vencimiento"); await loadData(); }
      });
    });

    content.querySelectorAll("[data-payment-received-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        const businessId = button.dataset.paymentReceivedBusiness;
        const row = businesses.find((b) => b.businessId === businessId);
        const label = businessHumanName(row || { businessId });
        const input = content.querySelector(`[data-payment-due-business="${CSS.escape(businessId)}"]`);
        const nextDue = input?.value || businessPaymentDueInput(row || {});
        const ok = window.confirm(`Vas a marcar pago recibido para "${label}".\n\nEl estado de pago pasará a Al día y se guardará la fecha de hoy como último pago. ¿Continuar?`);
        if (!ok) return;
        try { await markBusinessPaymentReceived(businessId, { nextPaymentDueAt: nextDue || null }); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo marcar el pago recibido"); await loadData(); }
      });
    });

    content.querySelectorAll("[data-save-internal-note]").forEach((button) => {
      button.addEventListener("click", async () => {
        const businessId = button.dataset.saveInternalNote;
        const textarea = content.querySelector(`[data-internal-note-business="${CSS.escape(businessId)}"]`);
        const previousText = button.textContent;
        button.disabled = true;
        button.textContent = "Guardando...";
        try {
          await updateBusinessInternalNote(businessId, textarea?.value || "");
          await loadData();
        } catch (error) {
          alert(error?.message || "No se pudo guardar la nota interna");
          button.disabled = false;
          button.textContent = previousText || "Guardar nota";
        }
      });
    });

    content.querySelectorAll("[data-manage-modules]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = businesses.find((b) => b.businessId === button.dataset.manageModules);
        if (!row) return alert("No se encontró la carnicería para gestionar módulos");
        openModulesModal(row);
      });
    });

    content.querySelectorAll("[data-whatsapp-business]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = businesses.find((b) => b.businessId === button.dataset.whatsappBusiness);
        if (!row) return alert("No se encontró la carnicería para escribir por WhatsApp");
        const url = buildAdminWhatsappUrl(row);
        if (!url) return alert("Esta carnicería no tiene un WhatsApp válido para contactar.");
        window.open(url, "_blank", "noopener,noreferrer");
      });
    });

    content.querySelectorAll("[data-enter-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (typeof onEnterAsBusiness === "function") await onEnterAsBusiness(button.dataset.enterBusiness);
      });
    });

    content.querySelectorAll("[data-defaults-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        const row = businesses.find((b) => b.businessId === button.dataset.defaultsBusiness);
        const label = businessHumanName(row || { businessId: button.dataset.defaultsBusiness });
        const ok = window.confirm(`Vas a reparar la configuración base de "${label}". Usalo solo si una empresa vieja o test no muestra bien módulos, acceso o datos básicos. ¿Continuar?`);
        if (!ok) return;
        try { await ensureBusinessAdminDefaults(button.dataset.defaultsBusiness); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo reparar la configuración base"); }
      });
    });

    content.querySelectorAll("[data-test-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        try { await setBusinessTestFlag(button.dataset.testBusiness, button.dataset.testCurrent !== "true"); await loadData(); }
        catch (error) { alert(error?.message || "No se pudo cambiar marca test"); }
      });
    });

    content.querySelectorAll("[data-logs-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        closeAllActionMenus();
        const row = businesses.find((b) => b.businessId === button.dataset.logsBusiness);
        if (!row) return alert("No se encontró la carnicería para ver logs");
        await openLogsModal(row);
      });
    });

    content.querySelectorAll("[data-clone-test-business]").forEach((button) => {
      button.addEventListener("click", () => {
        closeAllActionMenus();
        const row = businesses.find((b) => b.businessId === button.dataset.cloneTestBusiness);
        if (!row) return alert("No se encontró la carnicería para clonar");
        openCloneTestModal(row);
      });
    });

    content.querySelectorAll("[data-delete-test-business]").forEach((button) => {
      button.addEventListener("click", () => {
        closeAllActionMenus();
        const row = businesses.find((b) => b.businessId === button.dataset.deleteTestBusiness);
        if (!row) return alert("No se encontró la carnicería para eliminar");
        openDeleteTestModal(row);
      });
    });
  }

  container.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.adminTab;
      container.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("active", b === button));
      renderActiveTab();
    });
  });

  reloadBtn?.addEventListener("click", loadData);
  await loadData();
}






