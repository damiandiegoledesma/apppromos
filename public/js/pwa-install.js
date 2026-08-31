let deferredInstallPrompt = null;
let authenticatedAccessRecorded = false;

const ACCESS_COUNT_KEY = "apppromos_pwa_authenticated_access_count_v1";
const INSTALLED_KEY = "apppromos_pwa_installed_on_device_v1";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  const userAgent = window.navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(userAgent)
    || (/macintosh/i.test(userAgent) && window.navigator.maxTouchPoints > 1);
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent || "") || isIos();
}

function readLocalNumber(key) {
  try {
    const value = Number(window.localStorage.getItem(key) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (_) {
    return 0;
  }
}

function writeLocalValue(key, value) {
  try { window.localStorage.setItem(key, String(value)); } catch (_) {}
}

function isMarkedInstalled() {
  try { return window.localStorage.getItem(INSTALLED_KEY) === "true"; } catch (_) { return false; }
}

function markInstalled(installed = true) {
  writeLocalValue(INSTALLED_KEY, installed ? "true" : "false");
}

function installButtons() {
  return Array.from(document.querySelectorAll("[data-install-apppromos]"));
}

function keepInstallButtonsAvailable() {
  installButtons().forEach((button) => {
    button.hidden = false;
  });
}

function trackInstall(action) {
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", "ap_pwa_install", {
        action,
        page_path: window.location.pathname
      });
    }
  } catch (_) {}
}

function getHelpText() {
  if (isIos()) {
    return "En Safari, tocá Compartir y después Agregar a pantalla de inicio.";
  }
  if (/android/i.test(window.navigator.userAgent || "")) {
    return "Abrí el menú del navegador y elegí Instalar app o Agregar a pantalla principal.";
  }
  return "Buscá el icono Instalar AppPromos en la barra de direcciones de tu navegador.";
}

function ensureInstallDialog() {
  let dialog = document.querySelector("[data-pwa-install-dialog]");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.className = "pwa-install-dialog";
  dialog.dataset.pwaInstallDialog = "true";
  dialog.innerHTML = `
    <div class="pwa-install-card">
      <div class="pwa-install-head">
        <img src="/assets/pwa/apppromos-192.png" alt="" />
        <div><strong data-pwa-install-title>Instalar AppPromos</strong><span data-pwa-install-subtitle>Entrá más rápido desde tu pantalla de inicio.</span></div>
      </div>
      <p class="pwa-install-copy"></p>
      <div class="pwa-install-actions">
        <button type="button" class="pwa-install-close">Ahora no</button>
        <button type="button" class="pwa-install-confirm">Instalar ahora</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector(".pwa-install-close")?.addEventListener("click", () => dialog.close());
  dialog.querySelector(".pwa-install-confirm")?.addEventListener("click", async () => {
    dialog.close();
    await requestInstall();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

function openInstallDialog({ installed = false, automatic = false } = {}) {
  const dialog = ensureInstallDialog();
  const title = dialog.querySelector("[data-pwa-install-title]");
  const subtitle = dialog.querySelector("[data-pwa-install-subtitle]");
  const copy = dialog.querySelector(".pwa-install-copy");
  const close = dialog.querySelector(".pwa-install-close");
  const confirm = dialog.querySelector(".pwa-install-confirm");

  if (installed) {
    if (title) title.textContent = "AppPromos ya está instalada";
    if (subtitle) subtitle.textContent = "Abrila desde el icono de tu pantalla.";
    if (copy) copy.textContent = "La instalación es independiente en cada celular o computadora.";
    if (close) close.textContent = "Entendido";
    if (confirm) confirm.hidden = true;
  } else {
    if (title) title.textContent = "Instalar AppPromos";
    if (subtitle) subtitle.textContent = "Entrá más rápido desde tu pantalla de inicio.";
    if (copy) copy.textContent = deferredInstallPrompt
      ? "Instalala en este dispositivo y entrá con un solo toque."
      : getHelpText();
    if (close) close.textContent = deferredInstallPrompt
      ? (automatic ? "Ahora no" : "Cerrar")
      : "Entendido";
    if (confirm) {
      confirm.hidden = !deferredInstallPrompt;
      confirm.textContent = "Instalar ahora";
    }
  }

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    window.alert(copy?.textContent || getHelpText());
  }
  trackInstall(installed ? "already_installed" : automatic ? "automatic_invitation" : "instructions");
}

async function requestInstall() {
  if (isStandalone() || (isMarkedInstalled() && !deferredInstallPrompt)) {
    openInstallDialog({ installed: true });
    return;
  }

  if (!deferredInstallPrompt) {
    openInstallDialog();
    return;
  }

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice.catch(() => null);
  if (choice?.outcome === "accepted") markInstalled(true);
  trackInstall(choice?.outcome || "prompt_closed");
}

function bindInstallButtons() {
  installButtons().forEach((button) => {
    if (button.dataset.pwaBound === "true") return;
    button.dataset.pwaBound = "true";
    button.addEventListener("click", requestInstall);
  });
  keepInstallButtonsAvailable();
}

function recordAuthenticatedAccess() {
  if (authenticatedAccessRecorded) return;
  authenticatedAccessRecorded = true;

  if (isStandalone()) {
    markInstalled(true);
    return;
  }

  const nextAccessCount = readLocalNumber(ACCESS_COUNT_KEY) + 1;
  writeLocalValue(ACCESS_COUNT_KEY, nextAccessCount);

  if (isMobileDevice() && nextAccessCount >= 2 && !isMarkedInstalled()) {
    window.setTimeout(() => openInstallDialog({ automatic: true }), 650);
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  markInstalled(false);
  bindInstallButtons();
  trackInstall("available");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  markInstalled(true);
  keepInstallButtonsAvailable();
  trackInstall("installed");
});

window.addEventListener("apppromos:authenticated-session", recordAuthenticatedAccess);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("AppPromos: no se pudo registrar la instalación de la app", error);
    });
  });
}

function initializePwaInstall() {
  bindInstallButtons();
  if (window.__APPPROMOS_AUTHENTICATED_SESSION__ === true) recordAuthenticatedAccess();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePwaInstall, { once: true });
} else {
  initializePwaInstall();
}
