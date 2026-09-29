import {
  resolveSession,
  logoutUser
} from "../services/auth-service.js";

export async function renderAccessGate(container, options = {}) {
  if (!container) return false;

  const {
    redirectIfGuest = true,
    loginUrl = "./index.html"
  } = options;

  try {
    const session = await resolveSession();

    if (session.appMode === "guest") {
      if (redirectIfGuest) {
        window.location.replace(loginUrl);
      } else {
        container.innerHTML = "";
      }
      return false;
    }

    const email = session?.isDemo ? "Carnicería de Carniza" : (session?.firebaseUser?.email || "-");
    container.innerHTML = `
      <div class="access-gate-bar">
        <div class="access-gate-card">
          <div class="access-gate-email">${email}</div>
          ${session?.isDemo ? `<div class="access-gate-demo">Demo sin registro</div>` : ""}
        </div>

        <button
          id="status-chip"
          class="status-chip status-chip--loading"
          type="button"
          title="Ver estado de la cuenta"
          aria-label="Ver estado de la cuenta"
        >
          Listo para vender
        </button>

        <button
          id="logoutBtn"
          type="button"
          class="access-gate-logout"
        >
          Salir
        </button>
      </div>
    `;

    const logoutBtn = container.querySelector("#logoutBtn");
    logoutBtn?.addEventListener("click", async () => {
      try {
        if (session?.isDemo) {
          window.location.replace(loginUrl);
          return;
        }
        await logoutUser();
        window.location.replace(loginUrl);
      } catch (error) {
        console.error("Error logout:", error);
        alert(error?.message || "No se pudo cerrar sesión");
      }
    });

    return true;
  } catch (error) {
    console.error("Error renderAccessGate:", error);
    if (redirectIfGuest) {
      window.location.replace(loginUrl);
    } else {
      container.innerHTML = "";
    }
    return false;
  }
}