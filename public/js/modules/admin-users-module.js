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
  updateBusinessModule,
  updateBusinessBillingPlan,
  updateBusinessBillingStatus,
  setBusinessTestFlag,
  deleteTestBusiness,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
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
  const map = {
    active: "Al día",
    overdue: "Vencido",
    suspended: "Suspendido"
  };
  return map[status] || status || "—";
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
  const map = {
    active: ["#e9f8ef", "#16703a", "Al día"],
    overdue: ["#fff4e5", "#b54708", "Vencido"],
    suspended: ["#fff1f0", "#b42318", "Suspendido"]
  };
  const [bg, color, label] = map[status] || ["#f2f2f2", "#555", status || "—"];
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
  const active = businesses.filter((b) => b.status === "active").length;
  const trial = businesses.filter((b) => b.status === "trial").length;
  const suspended = businesses.filter((b) => b.status === "suspended").length;
  const disabled = businesses.filter((b) => b.status === "disabled").length;
  const recent = [...businesses]
    .filter((b) => b.lastLoginAt)
    .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
    .slice(0, 8);

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
      ${[
        ["Total", total], ["Activas", active], ["Prueba", trial], ["Suspendidas", suspended], ["Bloqueadas", disabled]
      ].map(([label, value]) => `
        <div style="padding:14px;border:1px solid #e7e1d8;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.04);">
          <div style="font-size:12px;color:#6e6e6e;font-weight:800;text-transform:uppercase;">${label}</div>
          <div style="font-size:28px;font-weight:900;margin-top:4px;">${value}</div>
        </div>
      `).join("")}
    </div>

    <div style="padding:16px;border:1px solid #e7e1d8;border-radius:16px;background:#fff;">
      <h3 style="margin:0 0 10px;">Últimos accesos</h3>
      ${recent.length ? `
        <div style="display:grid;gap:8px;">
          ${recent.map((b) => `
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #f0ebe3;padding-bottom:8px;">
              <strong>${escapeHtml(b.name || b.businessId)}</strong>
              <span style="color:#6e6e6e;font-size:13px;">${fmtDate(b.lastLoginAt)}</span>
            </div>
          `).join("")}
        </div>
      ` : `<div style="color:#6e6e6e;">Todavía no hay accesos registrados.</div>`}
    </div>
  `;
}

export async function renderAdminUsers(container, options = {}) {
  if (!container) return;
  const { onEnterAsBusiness = null } = options;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      <div>
        <h2 style="margin:0;">Panel Admin V11</h2>
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
      <button class="admin-tab" data-admin-tab="metrics" type="button">📊 Métricas</button>
    </div>

    <style>
      .admin-tab{min-height:38px;padding:0 12px;border:none;border-radius:999px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;}
      .admin-tab.active{background:#1f1f1f;color:#fff;}
      .admin-select{min-height:34px;border:1px solid #e7e1d8;border-radius:8px;background:#fff;padding:0 8px;font-weight:800;}
      .admin-status-badge{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:0 10px;border-radius:999px;font-weight:900;font-size:12px;white-space:nowrap;}
      .admin-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 140px 140px 140px;gap:10px;margin-bottom:12px;align-items:end;}
      .admin-toolbar label{display:grid;gap:5px;font-size:12px;color:#6e6e6e;font-weight:900;text-transform:uppercase;}
      .admin-toolbar input,.admin-toolbar select{min-height:42px;border:1px solid #e7e1d8;border-radius:12px;background:#fff;padding:0 12px;font-weight:800;}
      .admin-help{margin-bottom:12px;padding:12px;border-radius:14px;background:#fff8f4;color:#6b4b3e;font-size:13px;line-height:1.35;}
      .admin-status-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-bottom:12px;}
      .admin-status-legend div{padding:10px 12px;border-radius:14px;background:#fff;border:1px solid #eee6dc;font-size:12px;line-height:1.3;color:#5f5147;}
      .admin-status-legend strong{display:block;color:#1f1f1f;margin-bottom:2px;}
      .admin-commercial-card{display:grid;gap:5px;min-width:210px;padding:10px;border:1px solid;border-radius:14px;}
      .admin-commercial-title{font-weight:1000;font-size:13px;}
      .admin-commercial-desc{font-size:12px;line-height:1.25;font-weight:800;}
      .admin-commercial-grid{display:flex;gap:7px;flex-wrap:wrap;font-size:11px;}
      .admin-commercial-action{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.02em;opacity:.84;}
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
  let businessSearchTimer = null;

  async function loadData() {
    content.innerHTML = `<div style="padding:18px;color:#6e6e6e;">Cargando datos admin...</div>`;
    try {
      [businesses, users] = await Promise.all([listAdminBusinesses(), listAdminUsers()]);
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
    const visibleBusinesses = businesses.filter((row) => {
      const haystack = [row.name, row.businessId, row.ownerEmail, row.owner?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = businessStatusFilter === "all" || String(row.status || "active") === businessStatusFilter;
      const matchesBilling = businessBillingFilter === "all" || String(row.billing?.status || "active") === businessBillingFilter;
      const matchesPlan = businessPlanFilter === "all" || String(row.billing?.plan || "trial") === businessPlanFilter;
      return matchesSearch && matchesStatus && matchesBilling && matchesPlan;
    });

    content.innerHTML = `
      <div class="admin-help">
        <strong>Control SaaS:</strong> Acceso define si una carnicería puede operar la app. Pago define la situación de cobranza. El estado comercial traduce esos datos a una acción simple para administrar y vender mejor, no solo bloquear.
      </div>

      <div class="admin-status-legend">
        <div><strong>✅ Cliente activo</strong> Entra, consulta y guarda normalmente.</div>
        <div><strong>⏳ Trial / por vencer</strong> Tiene acceso completo. Es momento de acompañar la venta.</div>
        <div><strong>⚠️ Pago pendiente</strong> Consulta sí, guardado no. Contacto comercial amable.</div>
        <div><strong>⛔ Suspendida</strong> Experiencia limitada. Requiere reactivación o revisión.</div>
      </div>

      <div class="admin-toolbar">
        <label>
          Buscar carnicería
          <input id="adminBusinessSearch" type="search" placeholder="Nombre, ID o email..." value="${escapeHtml(businessSearch)}" />
        </label>
        <label>
          Acceso
          <select id="adminStatusFilter">
            ${["all","active","trial","suspended","disabled"].map((s) => `<option value="${s}" ${businessStatusFilter === s ? "selected" : ""}>${s === "all" ? "Todos" : accessLabel(s)}</option>`).join("")}
          </select>
        </label>
        <label>
          Pago
          <select id="adminBillingFilter">
            ${["all","active","overdue","suspended"].map((s) => `<option value="${s}" ${businessBillingFilter === s ? "selected" : ""}>${s === "all" ? "Todos" : paymentLabel(s)}</option>`).join("")}
          </select>
        </label>
        <label>
          Plan
          <select id="adminPlanFilter">
            ${["all", ...BILLING_PLANS].map((p) => `<option value="${p}" ${businessPlanFilter === p ? "selected" : ""}>${p === "all" ? "Todos" : p}</option>`).join("")}
          </select>
        </label>
      </div>

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
        <div style="font-weight:900;">${visibleBusinesses.length} de ${businesses.length} carnicerías</div>
        <div style="color:#6e6e6e;font-size:13px;">Tip: filtrá por <strong>Pago vencido</strong> para ver clientes con aviso 48 hs.</div>
      </div>

      ${visibleBusinesses.length ? `
        <div class="admin-table-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:1320px;">
            <thead>
              <tr style="background:#f8f5f0;position:sticky;top:0;z-index:1;">
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Carnicería</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Acceso</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Pago</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Plan</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Estado comercial</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Módulos</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Último acceso</th>
                <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${visibleBusinesses.map((row) => {
                const commercial = getBusinessCommercialStatus(row);
                return `
                <tr>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <div style="font-weight:900;">${escapeHtml(row.name || row.businessId)}</div>
                    <div style="font-size:12px;color:#6e6e6e;">${escapeHtml(row.businessId)}</div>
                    <div style="font-size:12px;color:#6e6e6e;">${escapeHtml(row.ownerEmail || row.owner?.email || "sin owner")}</div>
                    ${row.isTestBusiness ? `<div style="margin-top:4px;color:#8a6200;font-weight:900;font-size:12px;">TEST</div>` : ""}
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    ${statusBadge(row.status)}
                    <div style="margin-top:8px;">
                      <select class="admin-select" data-status-business="${escapeHtml(row.businessId)}">
                        ${["active","trial","suspended","disabled"].map((s) => `<option value="${s}" ${row.status === s ? "selected" : ""}>${accessLabel(s)}</option>`).join("")}
                      </select>
                    </div>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    ${billingBadge(row.billing?.status)}
                    <div style="margin-top:8px;">
                      <select class="admin-select" data-billing-business="${escapeHtml(row.businessId)}">
                        ${["active","overdue","suspended"].map((s) => `<option value="${s}" ${row.billing?.status === s ? "selected" : ""}>${paymentLabel(s)}</option>`).join("")}
                      </select>
                    </div>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <select class="admin-select" data-plan-business="${escapeHtml(row.businessId)}">
                      ${BILLING_PLANS.map((p) => `<option value="${p}" ${row.billing?.plan === p ? "selected" : ""}>${p}</option>`).join("")}
                    </select>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    ${commercialBadge(commercial)}
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <button class="admin-manage-modules" data-manage-modules="${escapeHtml(row.businessId)}" type="button">⚙️ Gestionar módulos</button>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;color:#6e6e6e;">
                    <div>Login: ${fmtDate(row.lastLoginAt)}</div>
                    <div>Actividad: ${fmtDate(row.lastActivityAt)}</div>
                  </td>
                  <td style="padding:10px;border-bottom:1px solid #f0ebe3;vertical-align:top;">
                    <div class="admin-actions">
                      <button data-enter-business="${escapeHtml(row.businessId)}" type="button" class="admin-primary-action">Entrar como cliente</button>
                      <button data-action-menu-toggle="${escapeHtml(row.businessId)}" type="button" class="admin-kebab-btn" title="Acciones avanzadas">⋮</button>
                      <div class="admin-action-menu" data-action-menu="${escapeHtml(row.businessId)}">
                        <div class="admin-action-menu-title">Acciones avanzadas</div>
                        <button data-test-business="${escapeHtml(row.businessId)}" data-test-current="${row.isTestBusiness ? "true" : "false"}" type="button">${row.isTestBusiness ? "Quitar marca test" : "Marcar como test"}</button>
                        <button data-logs-business="${escapeHtml(row.businessId)}" type="button">Ver logs</button>
                        <button data-defaults-business="${escapeHtml(row.businessId)}" type="button">Establecer defaults</button>
                        ${row.isTestBusiness ? `<button data-delete-test-business="${escapeHtml(row.businessId)}" type="button" class="danger">Borrar empresa test</button>` : ""}
                      </div>
                    </div>
                  </td>
                </tr>
              `; }).join("")}
            </tbody>
          </table>
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
    bindBusinessActions();
  }

  function renderUsers() {
    content.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:760px;">
        <thead><tr style="background:#f8f5f0;">
          <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Usuario</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Rol</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Carnicería</th>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #e7e1d8;">Acceso</th>
        </tr></thead>
        <tbody>
          ${users.map((u) => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #f0ebe3;"><strong>${escapeHtml(u.email || "Sin email")}</strong><div style="font-size:12px;color:#6e6e6e;">${escapeHtml(u.uid)}</div></td>
              <td style="padding:10px;border-bottom:1px solid #f0ebe3;">${escapeHtml(u.role || "client")}</td>
              <td style="padding:10px;border-bottom:1px solid #f0ebe3;">${escapeHtml(u.businessId || "—")}</td>
              <td style="padding:10px;border-bottom:1px solid #f0ebe3;">${escapeHtml(u.status || "active")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderActiveTab() {
    if (activeTab === "businesses") renderBusinesses();
    if (activeTab === "users") renderUsers();
    if (activeTab === "metrics") content.innerHTML = renderMetrics(businesses);
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
        for (const key of changes) {
          await updateBusinessModule(businessId, key, nextModules[key] === true);
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

  function openDeleteTestModal(row) {
    const businessId = row.businessId;
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Borrar empresa test">
        <div class="admin-modal-header">
          <div>
            <h3 style="margin:0;font-size:22px;color:#b42318;">Borrar empresa test</h3>
            <div style="margin-top:5px;color:#6e6e6e;font-size:14px;">
              ${escapeHtml(row.name || businessId)}
            </div>
          </div>
          <button type="button" data-close-delete-modal style="min-width:38px;min-height:38px;border:none;border-radius:999px;background:#ece7df;font-weight:900;cursor:pointer;">✕</button>
        </div>

        <div class="admin-modal-body">
          <div class="admin-danger-box">
            <strong>Esta acción es irreversible.</strong><br>
            Solo se permite para empresas marcadas como TEST. Para confirmar, escribí exactamente <strong>BORRAR</strong>.
          </div>
          <label style="display:grid;gap:6px;font-weight:900;">
            Confirmación
            <input data-delete-confirm-input type="text" placeholder="Escribí BORRAR" style="min-height:42px;border:1px solid #e7e1d8;border-radius:12px;padding:0 12px;font-weight:900;" />
          </label>
        </div>

        <div class="admin-modal-footer">
          <button type="button" data-close-delete-modal style="min-height:40px;padding:0 14px;border:none;border-radius:10px;background:#ece7df;color:#1f1f1f;font-weight:900;cursor:pointer;">Cancelar</button>
          <button type="button" data-confirm-delete-test disabled style="min-height:40px;padding:0 16px;border:none;border-radius:10px;background:#b42318;color:#fff;font-weight:900;cursor:pointer;opacity:.45;">Borrar definitivamente</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    const input = backdrop.querySelector("[data-delete-confirm-input]");
    const deleteButton = backdrop.querySelector("[data-confirm-delete-test]");

    input?.addEventListener("input", () => {
      const enabled = input.value.trim() === "BORRAR";
      deleteButton.disabled = !enabled;
      deleteButton.style.opacity = enabled ? "1" : ".45";
    });

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelectorAll("[data-close-delete-modal]").forEach((button) => button.addEventListener("click", close));

    deleteButton?.addEventListener("click", async () => {
      if (input?.value.trim() !== "BORRAR") return;
      deleteButton.disabled = true;
      deleteButton.textContent = "Borrando...";
      try {
        await deleteTestBusiness(businessId);
        close();
        await loadData();
      } catch (error) {
        alert(error?.message || "No se pudo borrar empresa test");
        deleteButton.disabled = false;
        deleteButton.textContent = "Borrar definitivamente";
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

    content.querySelectorAll("[data-manage-modules]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = businesses.find((b) => b.businessId === button.dataset.manageModules);
        if (!row) return alert("No se encontró la carnicería para gestionar módulos");
        openModulesModal(row);
      });
    });

    content.querySelectorAll("[data-enter-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (typeof onEnterAsBusiness === "function") await onEnterAsBusiness(button.dataset.enterBusiness);
      });
    });

    content.querySelectorAll("[data-defaults-business]").forEach((button) => {
      button.addEventListener("click", async () => {
        try { await ensureBusinessAdminDefaults(button.dataset.defaultsBusiness); await loadData(); }
        catch (error) { alert(error?.message || "No se pudieron aplicar defaults"); }
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

    content.querySelectorAll("[data-delete-test-business]").forEach((button) => {
      button.addEventListener("click", () => {
        closeAllActionMenus();
        const row = businesses.find((b) => b.businessId === button.dataset.deleteTestBusiness);
        if (!row) return alert("No se encontró la carnicería para borrar");
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
