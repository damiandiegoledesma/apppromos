import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { app } from "../core/firebase-core.js";
import { registerClientAndBusiness } from "../services/auth-service.js";
import { setActiveBusinessId } from "../services/business-service.js";
import { trackRegistrationStarted, trackTrialRegistered } from "../services/tracking-service.js";

const auth = getAuth(app);

function getRequestedMode() {
  const params = new URLSearchParams(window.location.search || "");
  if (params.get("register") === "1") return "register";
  return "login";
}

function showTab(mode) {
  const isRegister = mode === "register";
  document.getElementById("tabLoginBtn")?.classList.toggle("active", !isRegister);
  document.getElementById("tabRegistroBtn")?.classList.toggle("active", isRegister);
  document.getElementById("tabLogin")?.classList.toggle("active", !isRegister);
  document.getElementById("tabRegistro")?.classList.toggle("active", isRegister);
}

function setStatus(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function buildAuthHTML() {
  return `
    <main class="public-auth-page">
      <section class="public-auth-card">
        <a class="public-auth-logo" href="/" aria-label="Volver a Carnis.app">
          <img src="/assets/brand/carnis/svg/carnis-compacto-color.svg" alt="Carnis.app" />
        </a>

        <div class="public-auth-title">
          <h1>Ingresá a Carnis</h1>
          <p>Entrá a tu carnicería para actualizar precios, crear promos y vender.</p>
        </div>

        <div id="tabLogin" class="public-auth-tab active">
          <label for="loginEmail">Email</label>
          <input id="loginEmail" type="email" placeholder="tu@email.com" autocomplete="email" />

          <label for="loginPassword">Contraseña</label>
          <input id="loginPassword" type="password" placeholder="Tu contraseña" autocomplete="current-password" />

          <button id="loginBtn" class="public-auth-submit" type="button">Ingresar a mi carnicería</button>
          <div id="loginStatus" class="public-auth-status"></div>
        </div>

        <div class="public-auth-new">
          <span>¿Todavía no tenés cuenta?</span>
          <a href="/crear-carniceria.html">Crear mi carnicería gratis →</a>
        </div>
      </section>
    </main>
  `;
}

function ensureStyles() {
  if (document.getElementById("publicAuthStyles")) return;
  const style = document.createElement("style");
  style.id = "publicAuthStyles";
  style.textContent = `
    body.public-auth-open {
      margin:0;
      background:#FFF7F5;
    }

    body.public-auth-open .app,
    body.public-auth-open .footer-frame,
    body.public-auth-open .footer,
    body.public-auth-open .app-mobile-bottom-nav,
    body.public-auth-open .app-mobile-bottom-menu {
      display:none !important;
    }

    .public-auth-page {
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:
        radial-gradient(circle at top, rgba(229,34,35,.10), transparent 42%),
        linear-gradient(180deg,#FFF7F5 0%,#FFFFFF 100%);
      font-family:Poppins,Arial,sans-serif;
      color:#182238;
    }

    .public-auth-card {
      width:min(100%,460px);
      background:#FFFFFF;
      border-radius:24px;
      padding:32px;
      box-shadow:0 24px 70px rgba(24,34,56,.12);
      border:1px solid #EADBD8;
    }

    .public-auth-logo {
      display:flex;
      align-items:center;
      text-decoration:none;
      margin-bottom:28px;
    }

    .public-auth-logo img {
      width:auto;
      height:42px;
      display:block;
    }

    .public-auth-title h1 {
      margin:0 0 9px;
      font-size:32px;
      line-height:1.08;
      letter-spacing:-.03em;
      color:#182238;
    }

    .public-auth-title p {
      margin:0 0 26px;
      color:#4B5563;
      font-weight:500;
      line-height:1.5;
      font-size:15px;
    }

    .public-auth-tab {
      display:grid;
      gap:9px;
    }

    .public-auth-tab label {
      font-size:13px;
      font-weight:700;
      color:#374151;
      margin-top:3px;
    }

    .public-auth-tab input {
      min-height:50px;
      border:1px solid #D7D9DE;
      border-radius:13px;
      padding:0 14px;
      font-size:16px;
      outline:none;
      background:#FFFFFF;
      color:#182238;
    }

    .public-auth-tab input:focus {
      border-color:#E52223;
      box-shadow:0 0 0 4px rgba(229,34,35,.10);
    }

    .public-auth-submit {
      min-height:54px;
      border:0;
      border-radius:14px;
      background:#E52223;
      color:#FFFFFF;
      font-size:17px;
      font-weight:800;
      cursor:pointer;
      margin-top:10px;
      box-shadow:0 10px 24px rgba(229,34,35,.22);
    }

    .public-auth-submit:hover {
      background:#D11C1D;
    }

    .public-auth-status {
      min-height:20px;
      color:#B3161A;
      font-weight:700;
      font-size:14px;
    }

    .public-auth-new {
      margin-top:20px;
      padding-top:20px;
      border-top:1px solid #EADBD8;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:5px;
      text-align:center;
      font-size:14px;
      color:#6B7280;
    }

    .public-auth-new a {
      color:#B3161A;
      font-weight:800;
      text-decoration:none;
    }

    .public-auth-new a:hover {
      text-decoration:underline;
    }

    @media (max-width:560px) {
      .public-auth-page {
        padding:16px;
        align-items:flex-start;
        padding-top:40px;
      }

      .public-auth-card {
        padding:26px 22px;
        border-radius:20px;
      }

      .public-auth-logo img {
        height:38px;
      }

      .public-auth-title h1 {
        font-size:28px;
      }
    }
  `;
  document.head.appendChild(style);
}
function bindEvents() {
  document.getElementById("tabLoginBtn")?.addEventListener("click", () => showTab("login"));
  document.getElementById("tabRegistroBtn")?.addEventListener("click", () => showTab("register"));

  document.getElementById("ciudad")?.addEventListener("localidad-ar:change", (event) => {
    const detail = event.detail || {};
    const provinciaInput = document.getElementById("provincia");
    const provinceIdInput = document.getElementById("provinceId");
    if (provinciaInput) provinciaInput.value = detail.provinciaNombre || "";
    if (provinceIdInput) provinceIdInput.value = detail.provinciaId || "";
    if (detail.provinciaNombre) {
      setStatus("registroStatus", `Localidad validada: ${detail.nombre}, ${detail.provinciaNombre}`);
    }
  });

  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("loginPassword")?.value || "";
    try {
      setStatus("loginStatus", "Ingresando...");
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "./app.html";
    } catch (error) {
      setStatus("loginStatus", error?.message || "No se pudo iniciar sesión");
    }
  });

  document.getElementById("registroBtn")?.addEventListener("click", async () => {
    const data = {
      businessName: document.getElementById("businessName")?.value?.trim(),
      ownerName: document.getElementById("businessName")?.value?.trim(),
      email: document.getElementById("email")?.value?.trim(),
      password: document.getElementById("password")?.value || "",
      direccion: "",
      telefono: document.getElementById("telefono")?.value?.trim(),
      ciudad: document.getElementById("ciudad")?.value?.trim(),
      locality: document.getElementById("ciudad")?.value?.trim(),
      province: document.getElementById("provincia")?.value || document.getElementById("ciudad")?.dataset?.provinciaNombre || "",
      provinceId: document.getElementById("provinceId")?.value || document.getElementById("ciudad")?.dataset?.provinciaId || ""
    };

    try {
      trackRegistrationStarted({ source: "public_auth_register" });
      setStatus("registroStatus", "Creando tu carnicería online...");
      const result = await registerClientAndBusiness(data);
      trackTrialRegistered({
        source: "public_auth_register",
        business_id: result?.businessId || null
      });
      await setActiveBusinessId(result.businessId);
      setStatus("registroStatus", "¡Listo! Tu carnicería ya está creada.");
      window.location.href = "./app.html?onboarding=1";
    } catch (error) {
      console.error(error);
      setStatus("registroStatus", error?.message || "No se pudo crear la carnicería");
    }
  });
}

export function renderPublicAuth() {
  ensureStyles();
  document.body.classList.add("public-auth-open");
  document.body.insertAdjacentHTML("beforeend", buildAuthHTML());
  bindEvents();
  showTab(getRequestedMode());

  if (window.LocalidadesAr?.init) {
    try { window.LocalidadesAr.init(); } catch (_) {}
  }
}
