import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { app } from "../core/firebase-core.js";
import { registerClientAndBusiness } from "../services/auth-service.js";
import { setActiveBusinessId } from "../services/business-service.js";
import { trackTrialRegistered } from "../services/tracking-service.js";

const auth = getAuth(app);

function safeValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function rawValue(id) {
  return document.getElementById(id)?.value || "";
}

function setStatus(element, message) {
  if (element) element.textContent = message || "";
}

function humanLoginError() {
  return "Volvé a intentar. Revisá si ingresaste bien tu mail y contraseña.";
}

function humanRegisterError(error) {
  const text = String(error?.code || error?.message || "").toLowerCase();
  if (
    text.includes("phone-already-used") ||
    text.includes("phone_already_used") ||
    text.includes("teléfono / whatsapp") ||
    text.includes("telefono / whatsapp") ||
    text.includes("whatsapp ya está usado") ||
    text.includes("whatsapp ya esta usado")
  ) {
    return "Ese teléfono / WhatsApp ya está registrado en otra carnicería. Probá con otro número o iniciá sesión si esa carnicería es tuya.";
  }


  if (text.includes("email-already-in-use")) {
    return "Ese email ya está registrado. Probá iniciar sesión.";
  }

  if (text.includes("invalid-email")) {
    return "Revisá que el email esté bien escrito.";
  }

  if (text.includes("weak-password") || text.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (text.includes("network")) {
    return "No pudimos conectar. Revisá internet y volvé a intentar.";
  }

  return "No pudimos crear la cuenta. Revisá los datos y volvé a intentar.";
}

/* =========================
   TABS
========================= */

const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegistroBtn = document.getElementById("tabRegistroBtn");

const tabLogin = document.getElementById("tabLogin");
const tabRegistro = document.getElementById("tabRegistro");

if (tabLoginBtn && tabRegistroBtn && tabLogin && tabRegistro) {
  tabLoginBtn.onclick = () => {
    tabLoginBtn.classList.add("active");
    tabRegistroBtn.classList.remove("active");
    tabLogin.classList.add("active");
    tabRegistro.classList.remove("active");
  };

  tabRegistroBtn.onclick = () => {
    tabRegistroBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    tabRegistro.classList.add("active");
    tabLogin.classList.remove("active");
  };
}

/* =========================
   LOGIN
========================= */

const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

if (loginBtn) {
  loginBtn.onclick = async () => {
    const email = safeValue("loginEmail");
    const password = rawValue("loginPassword");

    if (!email || !password) {
      setStatus(loginStatus, "Completá tu email y contraseña para entrar.");
      return;
    }

    try {
      setStatus(loginStatus, "Ingresando...");
      await signInWithEmailAndPassword(auth, email, password);

      window.location.href = "./app.html";

    } catch (e) {
      console.warn("Login no completado:", e?.code || e?.message || e);
      setStatus(loginStatus, humanLoginError());
    }
  };
}

/* =========================
   REGISTRO
========================= */

const registroBtn = document.getElementById("registroBtn");
const registroStatus = document.getElementById("registroStatus");
const ciudadInput = document.getElementById("ciudad");
const provinciaInput = document.getElementById("provincia");
const provinceIdInput = document.getElementById("provinceId");

ciudadInput?.addEventListener("localidad-ar:change", (event) => {
  const detail = event.detail || {};
  if (provinciaInput) provinciaInput.value = detail.provinciaNombre || "";
  if (provinceIdInput) provinceIdInput.value = detail.provinciaId || "";
  setStatus(
    registroStatus,
    detail.provinciaNombre ? `Localidad validada: ${detail.nombre}, ${detail.provinciaNombre}` : ""
  );
});

if (registroBtn) {
  registroBtn.onclick = async () => {
    const password = rawValue("password");
    const passwordRepeat = rawValue("passwordRepeat");

    if (password !== passwordRepeat) {
      setStatus(registroStatus, "Las contraseñas no coinciden. Revisalas y volvé a intentar.");
      return;
    }

    if (password.length < 6) {
      setStatus(registroStatus, "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const data = {
      businessName: safeValue("businessName"),
      ownerName: safeValue("ownerName"),
      email: safeValue("email"),
      password,
      direccion: safeValue("direccion"),
      telefono: safeValue("telefono"),
      ciudad: safeValue("ciudad"),
      provincia: safeValue("provincia"),
      provinceId: safeValue("provinceId")
    };

    if (!data.businessName || !data.ownerName || !data.email || !data.telefono || !data.ciudad) {
      setStatus(registroStatus, "Completá los datos principales para crear tu carnicería.");
      return;
    }

    try {
      setStatus(registroStatus, "Creando tu carnicería...");

      const result = await registerClientAndBusiness(data);
      trackTrialRegistered({
        source: "landing_register",
        business_id: result?.businessId || null
      });

      await setActiveBusinessId(result.businessId);

      setStatus(
        registroStatus,
        "Cuenta creada. Para volver a entrar a AppPromos, usá tu email y la contraseña que acabás de crear."
      );

      setTimeout(() => {
        window.location.href = "./app.html";
      }, 1800);

    } catch (e) {
      console.error("Registro no completado:", e);
      setStatus(registroStatus, humanRegisterError(e));
    }
  };
}
