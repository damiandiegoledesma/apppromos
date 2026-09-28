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
  document.body.classList.add("public-auth-open");
  document.body.insertAdjacentHTML("beforeend", buildAuthHTML());
  bindEvents();
  showTab(getRequestedMode());

  if (window.LocalidadesAr?.init) {
    try { window.LocalidadesAr.init(); } catch (_) {}
  }
}
