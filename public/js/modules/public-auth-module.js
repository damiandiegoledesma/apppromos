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
        <a class="public-auth-logo" href="./index.html" aria-label="Volver a AppPromos">
          <img src="/assets/logo/apppromos-square-transparent.png" alt="AppPromos" />
          <span>App<b>Promos</b></span>
        </a>

        <div class="public-auth-title">
          <h1>Entrá a vender más rápido</h1>
          <p>Creá tu carnicería online. Tenés 90 días sin cargo y no necesitás tarjeta.</p>
        </div>

        <div class="public-auth-tabs">
          <button id="tabLoginBtn" type="button">Iniciar sesión</button>
          <button id="tabRegistroBtn" type="button">Empezar gratis</button>
        </div>

        <div id="tabLogin" class="public-auth-tab">
          <label>Email</label>
          <input id="loginEmail" type="email" placeholder="tu@email.com" autocomplete="email" />
          <label>Contraseña</label>
          <input id="loginPassword" type="password" placeholder="Tu contraseña" autocomplete="current-password" />
          <button id="loginBtn" class="public-auth-submit" type="button">Ingresar</button>
          <div id="loginStatus" class="public-auth-status"></div>
        </div>

        <div id="tabRegistro" class="public-auth-tab">
          <label>Nombre de la carnicería</label>
          <input id="businessName" placeholder="Ej: Carnicería El Buen Corte" />
          <label>Email</label>
          <input id="email" type="email" placeholder="tu@email.com" autocomplete="email" />
          <label>Contraseña</label>
          <input id="password" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
          <label>Teléfono / WhatsApp</label>
          <input id="telefono" placeholder="Ej: 3462 555555" />
          <label>Localidad</label>
          <input id="ciudad" placeholder="Localidad" data-localidad-ar autocomplete="off" />
          <label>Provincia</label>
          <input id="provincia" placeholder="Provincia" data-provincia-ar readonly />
          <input id="provinceId" type="hidden" data-provincia-id-ar />
          <button id="registroBtn" class="public-auth-submit" type="button">Crear mi carnicería gratis</button>
          <div id="registroStatus" class="public-auth-status"></div>
        </div>

        <div class="public-auth-demo">
          <span>¿Querés mirar primero?</span>
          <a href="./app.html?demo=1">Probar demo sin registro</a>
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
    body.public-auth-open { margin:0; background:#080b12; }
    body.public-auth-open .app,
    body.public-auth-open .footer-frame,
    body.public-auth-open .footer { display:none !important; }
    .public-auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:radial-gradient(circle at top, rgba(4,119,242,.28), rgba(2,8,23,1) 48%); font-family:Arial, sans-serif; color:#fff; }
    .public-auth-card { width:min(100%, 520px); background:rgba(255,255,255,.96); color:#111827; border-radius:28px; padding:26px; box-shadow:0 30px 90px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.35); }
    .public-auth-logo { display:flex; align-items:center; gap:12px; color:#111827; text-decoration:none; font-size:24px; font-weight:1000; margin-bottom:18px; }
    .public-auth-logo img { width:54px; height:54px; object-fit:contain; border-radius:14px; background:#fff; }
    .public-auth-title h1 { margin:0 0 8px; font-size:30px; line-height:1; letter-spacing:-.04em; }
    .public-auth-title p { margin:0 0 18px; color:#4b5563; font-weight:700; line-height:1.35; }
    .public-auth-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#eef2f7; border-radius:16px; padding:6px; margin-bottom:16px; }
    .public-auth-tabs button { border:0; min-height:46px; border-radius:13px; background:transparent; color:#4b5563; font-weight:1000; cursor:pointer; }
    .public-auth-tabs button.active { background:#0477f2; color:white; box-shadow:0 8px 20px rgba(4,119,242,.28); }
    .public-auth-tab { display:none; }
    .public-auth-tab.active { display:grid; gap:9px; }
    .public-auth-tab label { font-size:13px; font-weight:1000; color:#374151; margin-top:2px; }
    .public-auth-tab input { min-height:46px; border:1px solid #d1d5db; border-radius:14px; padding:0 13px; font-size:16px; outline:none; background:#fff; }
    .public-auth-tab input:focus { border-color:#0477f2; box-shadow:0 0 0 4px rgba(4,119,242,.12); }
    .public-auth-submit { min-height:52px; border:0; border-radius:16px; background:#16a34a; color:white; font-size:17px; font-weight:1000; cursor:pointer; margin-top:8px; box-shadow:0 12px 25px rgba(22,163,74,.22); }
    .public-auth-status { min-height:20px; color:#b91c1c; font-weight:800; font-size:14px; }
    .public-auth-demo { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; border-top:1px solid #e5e7eb; margin-top:14px; padding-top:14px; font-weight:800; color:#4b5563; }
    .public-auth-demo a { color:#0477f2; text-decoration:none; font-weight:1000; }
    @media (max-width:560px){ .public-auth-page{padding:14px;} .public-auth-card{padding:20px;border-radius:22px;} .public-auth-title h1{font-size:25px;} }
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
