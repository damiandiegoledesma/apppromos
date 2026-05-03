export const MODULE_LABELS = {
  prices: "Precios",
  competition: "Competencia",
  combos: "Combos / Ofertas",
  offers: "Ofertas",
  webPremium: "Web Premium",
  whatsapp: "WhatsApp"
};

export const DEFAULT_MODULES = {
  prices: true,
  competition: true,
  combos: true,
  offers: true,
  webPremium: true,
  whatsapp: true
};

export const APPPROMOS_SUPPORT_PHONE_DISPLAY = "+54 9 3462 662053";
export const APPPROMOS_SUPPORT_PHONE_WA = "5493462662053";

export function buildAppPromosWhatsAppUrl(message = "Hola AppPromos, necesito ayuda con mi cuenta.") {
  const text = encodeURIComponent(String(message || "Hola AppPromos, necesito ayuda con mi cuenta."));
  return `https://wa.me/${APPPROMOS_SUPPORT_PHONE_WA}?text=${text}`;
}

export function normalizeModules(modules = {}) {
  return {
    ...DEFAULT_MODULES,
    ...(modules && typeof modules === "object" ? modules : {})
  };
}

export const BILLING_STATUSES = ["active", "overdue", "suspended"];
export const BILLING_PLANS = ["trial", "basic", "pro", "dueno"];
export const TRIAL_DAYS = 30;
export const TRIAL_WARNING_DAYS = 5;

export function createTrialEndsAt(days = TRIAL_DAYS) {
  const end = new Date();
  end.setDate(end.getDate() + Number(days || TRIAL_DAYS));
  return end.toISOString();
}

export function parseBillingDate(value = null) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return null;
}

export function normalizeBilling(billing = {}) {
  const rawStatus = String(billing?.status || "active").toLowerCase();
  const rawPlan = String(billing?.plan || "trial").toLowerCase();

  return {
    status: BILLING_STATUSES.includes(rawStatus) ? rawStatus : "active",
    plan: BILLING_PLANS.includes(rawPlan) ? rawPlan : "trial",
    trialEndsAt: billing?.trialEndsAt || null,
    graceEndsAt: billing?.graceEndsAt || null,
    currentPeriodEnd: billing?.currentPeriodEnd || null,
    updatedAt: billing?.updatedAt || null,
    updatedBy: billing?.updatedBy || null
  };
}

export function isTrialExpired(billing = {}) {
  const normalized = normalizeBilling(billing);
  if (normalized.plan !== "trial" || !normalized.trialEndsAt) return false;
  const endDate = parseBillingDate(normalized.trialEndsAt);
  if (!endDate || Number.isNaN(endDate.getTime())) return false;
  return endDate.getTime() < Date.now();
}

export function getTrialDaysLeft(business = {}) {
  const billing = normalizeBilling(business?.billing || {});
  if (billing.plan !== "trial" || !billing.trialEndsAt) return null;

  const endDate = parseBillingDate(billing.trialEndsAt);
  if (!endDate || Number.isNaN(endDate.getTime())) return null;

  const diffMs = endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function normalizeBusinessControl(business = {}) {
  const billing = normalizeBilling(business?.billing || {});
  return {
    businessId: business?.businessId || business?.id || null,
    name: business?.name || business?.businessName || business?.displayName || "Carnicería",
    status: business?.status || "active",
    ownerUid: business?.ownerUid || null,
    ownerEmail: business?.ownerEmail || "",
    isTestBusiness: business?.isTestBusiness === true,
    isTemplateBusiness: business?.isTemplateBusiness === true,
    modules: normalizeModules(business?.modules || {}),
    billing,
    createdAt: business?.createdAt || null,
    updatedAt: business?.updatedAt || null,
    lastLoginAt: business?.lastLoginAt || null,
    lastActivityAt: business?.lastActivityAt || null
  };
}

// V11.4.1A: pago vencido/trial vencido no oculta módulos.
// El cliente puede consultar; WriteGuard bloquea guardados/acciones de escritura.
export const PAYMENT_LIMITED_MODULES = [];

function formatShortDate(value) {
  const date = parseBillingDate(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  try {
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (_) {
    return null;
  }
}

export function getAccessState(business = {}) {
  const control = normalizeBusinessControl(business);
  const status = String(control.status || "active").toLowerCase();
  const billingStatus = String(control.billing?.status || "active").toLowerCase();

  const businessBlocked = status === "disabled" || status === "suspended" || status === "inactive";
  const paymentSuspended = billingStatus === "suspended";
  const trialExpired = isTrialExpired(control.billing || {});
  const restricted = businessBlocked || paymentSuspended;
  const paymentOverdue = billingStatus === "overdue" || trialExpired;
  const trial = !trialExpired && (status === "trial" || control.billing?.plan === "trial");
  const trialDaysLeft = getTrialDaysLeft(control);
  const trialEndingSoon = trial && trialDaysLeft !== null && trialDaysLeft <= TRIAL_WARNING_DAYS;

  if (restricted) {
    const suspendedByPayment = paymentSuspended && !businessBlocked;
    return {
      level: "blocked",
      commercialKey: suspendedByPayment ? "payment_suspended" : "access_suspended",
      canEnterApp: true,
      canUseModules: false,
      canEdit: false,
      canUseCommerceActions: false,
      limitedModules: Object.keys(DEFAULT_MODULES),
      showWarning: true,
      title: suspendedByPayment ? "La Nelly te cuida" : "Acceso pausado",
      message: suspendedByPayment
        ? "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp y seguís vendiendo tranquilo."
        : "La Nelly te cuida y nos cuida. Revisamos el acceso por WhatsApp y lo dejamos claro.",
      ctaLabel: "Resolver por WhatsApp",
      ctaUrl: buildAppPromosWhatsAppUrl("Hola AppPromos, quiero reactivar mi cuenta de AppPromos.")
    };
  }

  if (paymentOverdue) {
    return {
      level: "warning",
      commercialKey: trialExpired ? "trial_expired" : "payment_overdue",
      canEnterApp: true,
      canUseModules: true,
      canEdit: false,
      canUseCommerceActions: false,
      limitedModules: PAYMENT_LIMITED_MODULES,
      showWarning: true,
      title: "La Nelly te cuida",
      message: "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.",
      ctaLabel: trialExpired ? "Activar por WhatsApp" : "Resolver por WhatsApp",
      ctaUrl: buildAppPromosWhatsAppUrl(trialExpired
        ? "Hola AppPromos, terminó mi prueba y quiero activar un plan."
        : "Hola AppPromos, quiero regularizar mi pago y reactivar los guardados."
      )
    };
  }

  if (trial) {
    const title = trialEndingSoon ? "Tu prueba está por vencer" : "Prueba activa";
    const trialDate = formatShortDate(control.billing?.trialEndsAt);
    return {
      level: "trial",
      commercialKey: trialEndingSoon ? "trial_ending_soon" : "trial_active",
      canEnterApp: true,
      canUseModules: true,
      canEdit: true,
      canUseCommerceActions: true,
      limitedModules: [],
      showWarning: true,
      title,
      message: trialDaysLeft === null
        ? "Estás probando AppPromos con acceso completo. Cuando quieras dejarlo activo para tu carnicería, escribinos y te ayudamos."
        : trialEndingSoon
          ? `Te quedan ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"} de prueba${trialDate ? `, hasta el ${trialDate}` : ""}. Activá tu plan para seguir sin interrupciones.`
          : `Estás probando AppPromos con acceso completo. Te quedan ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"} de prueba${trialDate ? `, hasta el ${trialDate}` : ""}.`,
      ctaLabel: trialEndingSoon ? "Consultar plan por WhatsApp" : "Consultar planes",
      ctaUrl: buildAppPromosWhatsAppUrl("Hola AppPromos, quiero consultar los planes para mi carnicería.")
    };
  }

  return {
    level: "active",
    commercialKey: "active",
    canEnterApp: true,
    canUseModules: true,
    canEdit: true,
    canUseCommerceActions: true,
    limitedModules: [],
    showWarning: false,
    title: "Cuenta activa",
    message: "Cuenta al día. El cliente puede entrar, consultar y guardar cambios.",
    ctaLabel: "",
    ctaUrl: ""
  };
}

export function getBusinessCommercialStatus(business = {}) {
  const control = normalizeBusinessControl(business);
  const access = getAccessState(control);
  const trialDaysLeft = getTrialDaysLeft(control);
  const billing = control.billing || {};

  const map = {
    active: {
      label: "Cliente activo",
      tone: "ok",
      description: "Cuenta al día. Puede operar normalmente.",
      access: "Entra",
      write: "Guarda",
      suggestedAction: "Seguimiento normal"
    },
    trial_active: {
      label: "Trial activo",
      tone: "trial",
      description: trialDaysLeft === null ? "Prueba activa con acceso completo." : `Prueba activa. Quedan ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"}.`,
      access: "Entra",
      write: "Guarda",
      suggestedAction: "Acompañar venta"
    },
    trial_ending_soon: {
      label: "Trial por vencer",
      tone: "warn",
      description: trialDaysLeft === null ? "La prueba está próxima a vencer." : `La prueba vence pronto. Quedan ${trialDaysLeft} día${trialDaysLeft === 1 ? "" : "s"}.`,
      access: "Entra",
      write: "Guarda",
      suggestedAction: "Contactar / ofrecer plan"
    },
    trial_expired: {
      label: "Trial vencido",
      tone: "warn",
      description: "Puede consultar, pero no guardar hasta activar un plan.",
      access: "Consulta",
      write: "No guarda",
      suggestedAction: "Activar plan"
    },
    payment_overdue: {
      label: "Pago pendiente",
      tone: "warn",
      description: "Puede consultar, pero no guardar hasta regularizar.",
      access: "Consulta",
      write: "No guarda",
      suggestedAction: "Cobranza amable"
    },
    payment_suspended: {
      label: "Suspendida por pago",
      tone: "danger",
      description: "Cuenta pausada. Requiere contacto para reactivar.",
      access: "Limitado",
      write: "No guarda",
      suggestedAction: "Reactivar por WhatsApp"
    },
    access_suspended: {
      label: "Acceso suspendido",
      tone: "danger",
      description: "Acceso operativo suspendido desde Administración.",
      access: "Limitado",
      write: "No guarda",
      suggestedAction: "Revisar caso"
    }
  };

  return {
    ...(map[access.commercialKey] || map.active),
    technicalStatus: control.status,
    billingStatus: billing.status,
    plan: billing.plan,
    trialEndsAt: billing.trialEndsAt || null,
    trialDaysLeft,
    canEnterApp: access.canEnterApp,
    canUseModules: access.canUseModules,
    canEdit: access.canEdit,
    ctaLabel: access.ctaLabel || "",
    ctaUrl: access.ctaUrl || ""
  };
}

export function isModuleEnabled(business = {}, moduleKey) {
  const control = normalizeBusinessControl(business);
  const access = getAccessState(control);
  if (!access.canUseModules) return false;
  if (access.limitedModules?.includes(moduleKey)) return false;
  return control.modules?.[moduleKey] === true;
}

export function renderAccessWarning(business = {}) {
  const access = getAccessState(business);

  // V12.4.7: el estado de prueba / cuenta al día vive en el header.
  // La alerta dentro de pantalla aparece solo cuando hay algo que resolver.
  if (access.level !== "warning" && access.level !== "blocked") return "";

  const isBlocked = access.level === "blocked";
  const color = isBlocked ? "#991b1b" : "#9a3412";
  const bg = isBlocked ? "#fef2f2" : "#fff7ed";
  const border = isBlocked ? "#fecaca" : "#fdba74";
  const icon = isBlocked ? "⛔" : "🔴";
  const text = isBlocked
    ? "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp."
    : "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp y seguís vendiendo.";

  return `
    <div data-access-warning="true" data-access-level="${escapeHtml(access.level)}" style="margin:0 0 12px;padding:10px 12px;border:1px solid ${border};border-radius:16px;background:${bg};color:${color};box-shadow:0 8px 18px rgba(0,0,0,.04);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div style="font-size:13px;line-height:1.3;font-weight:1000;">
        ${icon} ${escapeHtml(access.title)} · ${escapeHtml(text)}
      </div>
      ${access.ctaUrl ? `
        <a href="${escapeHtml(access.ctaUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 12px;border-radius:999px;background:#25D366;color:#10351f;text-decoration:none;font-weight:1000;white-space:nowrap;">
          💬 ${escapeHtml(access.ctaLabel || "Resolver ahora")}
        </a>
      ` : ""}
    </div>
  `;
}

export function renderModuleLocked(moduleKey, business = {}) {
  const label = MODULE_LABELS[moduleKey] || moduleKey || "Módulo";
  const access = getAccessState(business);
  const message = access.level === "blocked"
    ? access.message
    : access.limitedModules?.includes(moduleKey)
      ? "Este módulo queda disponible para consulta, pero las acciones de guardado están pausadas hasta regularizar la cuenta."
      : `Este módulo no está disponible para esta carnicería en este momento.`;

  return `
    <div style="padding:22px;border:1px solid #e7e1d8;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.04);">
      <div style="font-size:34px;margin-bottom:8px;">🔒</div>
      <h2 style="margin:0 0 8px;">${escapeHtml(label)} bloqueado</h2>
      <p style="margin:0 0 14px;color:#6e6e6e;line-height:1.4;">${escapeHtml(message)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button type="button" data-action-panel="dashboardPanel" style="display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;color:#374151;font-weight:1000;cursor:pointer;">
          ← Volver a Inicio
        </button>
        ${access.ctaUrl ? `
          <a href="${escapeHtml(access.ctaUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:999px;background:#25D366;color:#10351f;text-decoration:none;font-weight:1000;">
            💬 ${escapeHtml(access.ctaLabel || "Contactar AppPromos")}
          </a>
        ` : `
          <div style="padding:12px;border-radius:12px;background:#fff8f4;color:#6b4b3e;font-size:14px;">
            Este módulo puede activarse desde el Panel Admin según el plan comercial del cliente.
          </div>
        `}
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getBusinessWriteBlockReason(business = {}) {
  const access = getAccessState(business);
  if (access.canEdit === true) return null;

  if (access.level === "trial") return null;

  if (access.level === "blocked") {
    return access.message || "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.";
  }

  if (access.level === "warning") {
    return access.message || "La Nelly te cuida y nos cuida. Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.";
  }

  return "La cuenta no está habilitada para guardar cambios en este momento.";
}

export function assertBusinessCanWriteBySnapshot(business = {}) {
  const reason = getBusinessWriteBlockReason(business);
  if (reason) {
    throw new Error(reason);
  }
  return true;
}
