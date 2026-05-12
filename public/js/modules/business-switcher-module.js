import { getBusinessLabel } from "../config/vertical-config.js";
import { resolveSession } from "../services/auth-service.js";
import {
  listBusinesses,
  getResolvedBusinessId
} from "../services/business-service.js";
import { changeActiveBusiness } from "../app-main.js";

const BUSINESS_LABEL = getBusinessLabel();
const BUSINESS_LABEL_PLURAL = getBusinessLabel(undefined, { plural: true });
const BUSINESS_LABEL_CAPITALIZED = getBusinessLabel(undefined, { capitalize: true });

export async function renderBusinessSwitcher(container) {
  if (!container) return;

  try {
    const session = await resolveSession();

    if (session.appMode !== "superadmin") {
      container.innerHTML = "";
      return;
    }

    const businesses = await listBusinesses();
    const activeBusinessId = await getResolvedBusinessId();

    if (!businesses.length) {
      container.innerHTML = `
        <div class="admin-switcher-compact">
          <strong>Modo Admin</strong>
          <span style="font-size:12px;color:#666;">Sin ${BUSINESS_LABEL_PLURAL}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-switcher-compact" title="Eleg\u00ed qu\u00e9 ${BUSINESS_LABEL} est\u00e1s administrando">
        <strong>Modo Admin</strong>
        <select id="adminBusinessSelect" aria-label="${BUSINESS_LABEL_CAPITALIZED} activa">
          ${businesses.map((business) => `
            <option
              value="${business.businessId}"
              ${business.businessId === activeBusinessId ? "selected" : ""}
            >
              ${business.name || business.businessId}
            </option>
          `).join("")}
        </select>
      </div>
    `;

    const select = container.querySelector("#adminBusinessSelect");

    select?.addEventListener("change", async (event) => {
      const id = event.target.value?.trim();
      if (!id) return;

      try {
        await changeActiveBusiness(id);
      } catch (error) {
        console.error("Error cambiando empresa desde switcher:", error);
        alert(error?.message || `No se pudo cambiar la ${BUSINESS_LABEL} activa`);
      }
    });
  } catch (error) {
    console.error("Error switcher:", error);
    container.innerHTML = `<div>Error cargando switcher</div>`;
  }
}
