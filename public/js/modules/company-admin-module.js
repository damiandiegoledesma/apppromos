import {
  createCompanyFromBase,
  cloneCompany,
  listAllCompanies,
  validateCompanyName
} from "../services/company-admin-service.js";

import { setActiveBusinessId } from "../services/business-service.js";
import { resolveSession } from "../services/auth-service.js";

export async function renderCompanyAdmin(container) {
  if (!container) return;

  const session = await resolveSession();

  if (session.appMode !== "superadmin") {
    container.innerHTML = `
      <div style="padding:16px; color:#721c24; background:#f8d7da; border-radius:8px;">
        Acceso denegado. Solo superadmin.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="max-width:600px; margin:0 auto; padding:20px; font-family:Arial,sans-serif;">
      <h2 style="margin-top:0; color:#333;">Gestión de Empresas</h2>

      <div style="display:grid; gap:16px;">
        <div style="border:1px solid #ddd; padding:16px; border-radius:8px; background:#f9f9f9;">
          <h3 style="margin-top:0; color:#333; font-size:18px;">➕ Crear empresa nueva</h3>
          <input id="createNombre" type="text" placeholder="Nombre de la carnicería *" style="width:100%; padding:10px; margin-bottom:10px;" />
          <input id="createDireccion" type="text" placeholder="Dirección" style="width:100%; padding:10px; margin-bottom:10px;" />
          <input id="createCiudad" type="text" placeholder="Localidad" data-localidad-ar style="width:100%; padding:10px; margin-bottom:10px;" />
          <input id="createProvincia" type="text" placeholder="Provincia" data-provincia-ar readonly style="width:100%; padding:10px; margin-bottom:10px; background:#f3f3f3;" />
          <input id="createProvinceId" type="hidden" data-provincia-id-ar />
          <input id="createTelefono" type="text" placeholder="Teléfono" style="width:100%; padding:10px; margin-bottom:12px;" />
          <button id="createBtn" style="width:100%; padding:12px;">Crear empresa</button>
        </div>

        <div style="border:1px solid #ddd; padding:16px; border-radius:8px; background:#f9f9f9;">
          <h3 style="margin-top:0; color:#333; font-size:18px;">📋 Clonar empresa existente</h3>
          <select id="cloneSource" style="width:100%; padding:10px; margin-bottom:12px;">
            <option value="">Cargando empresas...</option>
          </select>
          <input id="cloneName" type="text" placeholder="Nuevo nombre *" style="width:100%; padding:10px; margin-bottom:8px;" />
          <input id="cloneDir" type="text" placeholder="Dirección" style="width:100%; padding:10px; margin-bottom:8px;" />
          <input id="cloneCity" type="text" placeholder="Localidad" data-localidad-ar style="width:100%; padding:10px; margin-bottom:8px;" />
          <input id="cloneProvince" type="text" placeholder="Provincia" data-provincia-ar readonly style="width:100%; padding:10px; margin-bottom:8px; background:#f3f3f3;" />
          <input id="cloneProvinceId" type="hidden" data-provincia-id-ar />
          <input id="clonePhone" type="text" placeholder="Teléfono" style="width:100%; padding:10px; margin-bottom:12px;" />
          <button id="cloneBtn" style="width:100%; padding:12px;">Clonar empresa</button>
        </div>
      </div>

      <div id="resultPanel" style="margin-top:20px; min-height:40px;"></div>
    </div>
  `;

  const resultEl = container.querySelector("#resultPanel");
  const createNombreInput = container.querySelector("#createNombre");
  const createDireccionInput = container.querySelector("#createDireccion");
  const createCiudadInput = container.querySelector("#createCiudad");
  const createProvinciaInput = container.querySelector("#createProvincia");
  const createProvinceIdInput = container.querySelector("#createProvinceId");
  const createTelefonoInput = container.querySelector("#createTelefono");
  const createBtn = container.querySelector("#createBtn");

  const cloneSourceSelect = container.querySelector("#cloneSource");
  const cloneNameInput = container.querySelector("#cloneName");
  const cloneDirInput = container.querySelector("#cloneDir");
  const cloneCityInput = container.querySelector("#cloneCity");
  const cloneProvinceInput = container.querySelector("#cloneProvince");
  const cloneProvinceIdInput = container.querySelector("#cloneProvinceId");
  const clonePhoneInput = container.querySelector("#clonePhone");
  const cloneBtn = container.querySelector("#cloneBtn");

  window.LocalidadesAR?.autoInit?.();

  function bindGeo(input, provinceInput, provinceIdInput) {
    input?.addEventListener("localidad-ar:change", (event) => {
      const detail = event.detail || {};
      if (provinceInput) provinceInput.value = detail.provinciaNombre || "";
      if (provinceIdInput) provinceIdInput.value = detail.provinciaId || "";
    });
  }

  bindGeo(createCiudadInput, createProvinciaInput, createProvinceIdInput);
  bindGeo(cloneCityInput, cloneProvinceInput, cloneProvinceIdInput);

  function setStatus(message, type = "info", actionBusinessId = null) {
    const bgColor = {
      success: "#d4edda",
      error: "#f8d7da",
      info: "#d1ecf1"
    }[type] || "#d1ecf1";

    const textColor = {
      success: "#155724",
      error: "#721c24",
      info: "#0c5460"
    }[type] || "#0c5460";

    const openButton = actionBusinessId
      ? `<div style="margin-top:10px;"><button id="openCreatedBusinessBtn" style="padding:8px 12px;">Abrir empresa</button></div>`
      : "";

    resultEl.innerHTML = `
      <div style="background:${bgColor}; color:${textColor}; padding:12px; border-radius:4px;">
        ${message}
        ${openButton}
      </div>
    `;

    if (actionBusinessId) {
      resultEl.querySelector("#openCreatedBusinessBtn")?.addEventListener("click", async () => {
        await setActiveBusinessId(actionBusinessId);
        window.location.href = "./app.html";
      });
    }
  }

  async function loadCompanies() {
    try {
      const companies = await listAllCompanies();

      if (!companies.length) {
        cloneSourceSelect.innerHTML = `<option value="">No hay empresas para clonar</option>`;
        cloneBtn.disabled = true;
        return;
      }

      cloneSourceSelect.innerHTML = `
        <option value="">Selecciona una empresa...</option>
        ${companies.map(c => `<option value="${c.businessId}">${c.name}</option>`).join("")}
      `;
      cloneBtn.disabled = false;
    } catch (error) {
      console.error("Error cargando empresas:", error);
      cloneSourceSelect.innerHTML = `<option value="">Error al cargar empresas</option>`;
    }
  }

  createBtn.addEventListener("click", async () => {
    const nombre = createNombreInput.value.trim();
    const direccion = createDireccionInput.value.trim();
    const ciudad = createCiudadInput.value.trim();
    const telefono = createTelefonoInput.value.trim();

    if (!validateCompanyName(nombre)) {
      setStatus("❌ Nombre inválido", "error");
      return;
    }

    try {
      setStatus("⏳ Creando empresa...", "info");

      const result = await createCompanyFromBase({
        nombre,
        direccion,
        ciudad,
        locality: ciudad,
        province: createProvinciaInput?.value || createCiudadInput?.dataset?.provinciaNombre || "",
        provinceId: createProvinceIdInput?.value || createCiudadInput?.dataset?.provinciaId || "",
        telefono
      });

      setStatus(`✅ Empresa creada: ${result.meta.name}<br><small>ID: ${result.businessId}</small>`, "success", result.businessId);
      await loadCompanies();
    } catch (error) {
      console.error(error);
      setStatus(`❌ ${error.message}`, "error");
    }
  });

  cloneBtn.addEventListener("click", async () => {
    const originId = cloneSourceSelect.value;
    const nombre = cloneNameInput.value.trim();
    const direccion = cloneDirInput.value.trim();
    const ciudad = cloneCityInput.value.trim();
    const telefono = clonePhoneInput.value.trim();

    if (!originId) {
      setStatus("❌ Selecciona una empresa origen", "error");
      return;
    }

    if (!validateCompanyName(nombre)) {
      setStatus("❌ Nombre inválido", "error");
      return;
    }

    try {
      setStatus("⏳ Clonando empresa...", "info");

      const result = await cloneCompany(originId, {
        nombre,
        direccion,
        ciudad,
        locality: ciudad,
        province: cloneProvinceInput?.value || cloneCityInput?.dataset?.provinciaNombre || "",
        provinceId: cloneProvinceIdInput?.value || cloneCityInput?.dataset?.provinciaId || "",
        telefono
      });

      setStatus(`✅ Empresa clonada: ${result.meta.name}<br><small>ID: ${result.businessId}</small>`, "success", result.businessId);
      await loadCompanies();
    } catch (error) {
      console.error(error);
      setStatus(`❌ ${error.message}`, "error");
    }
  });

  loadCompanies();
}
