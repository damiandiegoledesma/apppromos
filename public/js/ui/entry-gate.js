import { openDemoBusiness } from "../services/business-service.js";
import { setActiveBusinessId } from "../services/business-service.js";
import { renderCompanyAdmin } from "../modules/company-admin-module.js";
import { resolveSession } from "../services/auth-service.js";

const statusEl = document.getElementById("entryStatus");
const btnIngresar = document.getElementById("btnIngresar");
const btnDemo = document.getElementById("btnDemo");
const btnQuieroMiCarniceria = document.getElementById("btnQuieroMiCarniceria");
const adminPanelEl = document.getElementById("adminPanel");

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

async function toggleAdminPanel(show = true) {
  if (!adminPanelEl) return;

  if (!show) {
    adminPanelEl.style.display = "none";
    adminPanelEl.innerHTML = "";
    return;
  }

  adminPanelEl.style.display = "block";
  adminPanelEl.style.marginTop = "20px";
  adminPanelEl.style.borderTop = "2px solid #ccc";
  adminPanelEl.style.paddingTop = "20px";

  try {
    await renderCompanyAdmin(adminPanelEl);
  } catch (error) {
    console.error("Error renderizando company-admin:", error);
    setStatus(`❌ Error: ${error.message}`);
  }
}

btnIngresar?.addEventListener("click", () => {
  setStatus("Abrí sesión desde la pestaña de login.");
  const loginTabBtn = document.querySelector('.tab-button[data-tab="login"]');
  loginTabBtn?.click();
});

btnDemo?.addEventListener("click", async () => {
  try {
    setStatus("Verificando demo en Firebase...");

    const result = await openDemoBusiness();

    if (!result?.meta || !result?.state) {
      setStatus("❌ La demo no existe en Firebase. Ejecutá el Seeder primero.");
      return;
    }

    await setActiveBusinessId("demo");
    setStatus("✅ Demo lista. Abriendo...");

    setTimeout(() => {
      window.location.href = "./app.html";
    }, 500);
  } catch (error) {
    console.error("Error demo:", error);
    setStatus(`❌ ${error.message}`);
  }
});

btnQuieroMiCarniceria?.addEventListener("click", async () => {
  try {
    const session = await resolveSession();

    if (session.appMode === "superadmin") {
      setStatus("Abriendo panel de administración...");
      await toggleAdminPanel(true);
      return;
    }

    setStatus("Creá tu cuenta desde Registro o ingresá para continuar.");
    const registroTabBtn = document.querySelector('.tab-button[data-tab="registro"]');
    registroTabBtn?.click();
  } catch (error) {
    console.error("Error en acceso:", error);
    setStatus(`❌ ${error.message}`);
  }
});

toggleAdminPanel(false);
