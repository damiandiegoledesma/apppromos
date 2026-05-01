import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { app } from "../core/firebase-core.js";
import { registerClientAndBusiness } from "../services/auth-service.js";
import { setActiveBusinessId } from "../services/business-service.js";

const auth = getAuth(app);

/* =========================
   TABS
========================= */

const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegistroBtn = document.getElementById("tabRegistroBtn");

const tabLogin = document.getElementById("tabLogin");
const tabRegistro = document.getElementById("tabRegistro");

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

/* =========================
   LOGIN
========================= */

const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

loginBtn.onclick = async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    loginStatus.textContent = "Ingresando...";
    await signInWithEmailAndPassword(auth, email, password);

    window.location.href = "./app.html";

  } catch (e) {
    loginStatus.textContent = e.message;
  }
};

/* =========================
   REGISTRO NUEVO
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
  registroStatus.textContent = detail.provinciaNombre
    ? `Localidad validada: ${detail.nombre}, ${detail.provinciaNombre}`
    : "";
});

registroBtn.onclick = async () => {

  const data = {
    businessName: document.getElementById("businessName").value,
    ownerName: document.getElementById("ownerName").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
    direccion: document.getElementById("direccion").value,
    telefono: document.getElementById("telefono").value,
    ciudad: document.getElementById("ciudad").value,
    locality: document.getElementById("ciudad").value,
    province: document.getElementById("provincia")?.value || document.getElementById("ciudad")?.dataset?.provinciaNombre || "",
    provinceId: document.getElementById("provinceId")?.value || document.getElementById("ciudad")?.dataset?.provinciaId || ""
  };

  try {
    registroStatus.textContent = "Creando carnicería...";

    const result = await registerClientAndBusiness(data);

    await setActiveBusinessId(result.businessId);

    registroStatus.textContent = "Listo, entrando...";

    setTimeout(() => {
      window.location.href = "./app.html";
    }, 800);

  } catch (e) {
    console.error(e);
    registroStatus.textContent = e.message;
  }
};

/* =========================
   DEMO
========================= */

const demoBtn = document.getElementById("demoBtn");

if (demoBtn) {
  demoBtn.onclick = async () => {
    window.location.href = "./app.html?demo=1";
  };
}