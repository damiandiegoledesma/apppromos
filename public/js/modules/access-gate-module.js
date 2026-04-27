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

    const email = session?.firebaseUser?.email || "-";
    container.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        justify-content:flex-end;
      ">
        <div style="
          background:#fff;
          border:1px solid #e7e1d8;
          border-radius:12px;
          padding:10px 12px;
          min-width:250px;
          box-shadow:0 6px 18px rgba(0,0,0,.04);
        ">
          <div style="font-size:13px; font-weight:700; color:#1f1f1f;">${email}</div>
        </div>

        <button
          id="logoutBtn"
          type="button"
          style="
            min-height:42px;
            padding:0 14px;
            border:none;
            border-radius:12px;
            background:#222;
            color:#fff;
            font-weight:700;
            cursor:pointer;
          "
        >
          Salir
        </button>
      </div>
    `;

    const logoutBtn = container.querySelector("#logoutBtn");
    logoutBtn?.addEventListener("click", async () => {
      try {
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