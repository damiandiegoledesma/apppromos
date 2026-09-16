import { createStarterProducts } from "../data/starter-products.js";
import {
  createEmptyActivationDraft,
  loadActivationDraft,
  saveActivationDraft,
  patchActivationDraft,
  setActivationDraftStep,
  setActivationDraftRubros,
  setActivationDraftPrice,
  setActivationDraftIdentity,
  setActivationDraftPublishData,
  activationDraftPricedCount,
  hasRecoverableActivationDraft,
  clearActivationDraft
} from "../services/activation-draft-service.js";
import { registerClientAndBusiness } from "../services/auth-service.js";
import { setActiveBusinessId } from "../services/business-service.js";
import {
  trackRegistrationStarted,
  trackTrialRegistered
} from "../services/tracking-service.js";

const root = document.getElementById("activationRoot");
const params = new URLSearchParams(location.search);

const STEP_INDEX = {
  welcome: 0,
  rubros: 1,
  prices: 2,
  identity: 3,
  publish: 3,
  done: 3
};

const ASSET = {
  welcome: "/assets/characters/carniza/onboarding/carniza-onboarding-bienvenida.webp",
  rubros: "/assets/characters/carniza/onboarding/carniza-onboarding-rubros.webp",
  prices: "/assets/characters/carniza/onboarding/carniza-onboarding-precios.webp",
  progress: "/assets/characters/carniza/onboarding/carniza-onboarding-progreso.webp",
  identity: "/assets/characters/carniza/onboarding/carniza-onboarding-identidad.webp",
  publish: "/assets/characters/carniza/onboarding/carniza-onboarding-publicar.webp",
  online: "/assets/characters/carniza/onboarding/carniza-onboarding-online.webp",
  resume: "/assets/characters/carniza/onboarding/carniza-onboarding-retomar.webp"
};

const RUBRO_LABELS = {
  Novillo: "Ternera/Vaca",
  Cerdo: "Cerdo",
  Pollo: "Pollo",
  Elaborados: "Elaborados",
  Menudencias: "Achuras / Menudencias",
  Costillares: "Costillares",
  Subproductos: "Subproductos",
  Otros: "Otros"
};

const RUBRO_EMOJI = {
  Novillo: "🐄",
  Cerdo: "🐖",
  Pollo: "🐔",
  Elaborados: "🌭",
  Menudencias: "🥩",
  Costillares: "🔥",
  Subproductos: "🧺",
  Otros: "➕"
};

const catalog = createStarterProducts();
const availableRubros = [...new Set(catalog.map((p) => String(p.rubro || "").trim()).filter(Boolean))];

function esc(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function normalizeSearchText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function moneyInputValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

function productKey(product = {}) {
  return String(product.productKey || product.id || "").trim();
}

function currentDraft() {
  return loadActivationDraft({ createIfMissing: true }) || createEmptyActivationDraft();
}

function setProgress(step) {
  const index = STEP_INDEX[step] ?? 0;
  document.querySelectorAll("[data-progress]").forEach((el, i) => {
    el.classList.toggle("is-on", i <= index);
  });
}

function scene({ image, eyebrow, title, lead, body = "", actions = "" }) {
  root.innerHTML = `
    <div class="scene">
      <div class="carniza-wrap">
        <img src="${esc(image)}" alt="Carniza">
      </div>
      <div class="copy">
        <div class="eyebrow">${esc(eyebrow)}</div>
        <h1>${title}</h1>
        <p class="lead">${lead}</p>
        ${body}
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </div>
    </div>
  `;
}

function renderWelcome({ showResume = false } = {}) {
  setProgress("welcome");
  const draft = loadActivationDraft();
  const resumeHtml = showResume && draft ? `
    <div class="resume-box">
      <strong>Tu carnicería quedó empezada.</strong>
      <span class="hint">Podés seguir exactamente donde la dejaste.</span>
      <div class="actions">
        <button class="btn btn-primary" type="button" data-action="resume">Continuar mi carnicería</button>
        <button class="btn btn-light" type="button" data-action="restart">Empezar de nuevo</button>
      </div>
    </div>` : "";

  scene({
    image: showResume ? ASSET.resume : ASSET.welcome,
    eyebrow: "Carniza te acompaña",
    title: showResume ? "Seguimos donde lo dejaste." : "Creá tu carnicería online.",
    lead: showResume
      ? "Ya guardamos lo que venías cargando en esta sesión."
      : "Elegí qué vendés, cargá algunos precios y mirá cómo la van a ver tus clientes. Sin registrarte primero.",
    body: resumeHtml,
    actions: showResume ? "" : `<button class="btn btn-primary" type="button" data-action="start">Empezar</button>`
  });

  root.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    saveActivationDraft(createEmptyActivationDraft());
    setActivationDraftStep("rubros");
    renderRubros();
  });

  root.querySelector('[data-action="resume"]')?.addEventListener("click", resumeDraft);
  root.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
    clearActivationDraft();
    saveActivationDraft(createEmptyActivationDraft());
    setActivationDraftStep("rubros");
    renderRubros();
  });
}

function renderRubros() {
  const draft = currentDraft();
  setActivationDraftStep("rubros");
  setProgress("rubros");

  const selected = new Set(draft.selectedRubros || []);
  const body = `
    <div class="rubros">
      ${availableRubros.map((rubro) => `
        <button type="button" class="rubro${selected.has(rubro) ? " is-selected" : ""}" data-rubro="${esc(rubro)}">
          <span>${RUBRO_EMOJI[rubro] || "🥩"} ${esc(RUBRO_LABELS[rubro] || rubro)}</span>
          <span class="mark">${selected.has(rubro) ? "✓" : ""}</span>
        </button>
      `).join("")}
    </div>
    <div class="notice" data-notice>Elegí al menos un rubro para continuar.</div>
    <p class="hint">Después te muestro solamente los productos de los rubros que elijas.</p>
  `;

  scene({
    image: ASSET.rubros,
    eyebrow: "Paso 1 de 4",
    title: "¿Qué vendés?",
    lead: "Decime qué trabajás y te preparo la lista.",
    body,
    actions: `
      <button class="btn btn-light" type="button" data-action="back">← Atrás</button>
      <button class="btn btn-primary" type="button" data-action="next">Continuar</button>
    `
  });

  root.querySelectorAll("[data-rubro]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rubro = btn.dataset.rubro;
      const next = new Set(currentDraft().selectedRubros || []);
      next.has(rubro) ? next.delete(rubro) : next.add(rubro);
      setActivationDraftRubros([...next]);
      renderRubros();
    });
  });

  root.querySelector('[data-action="back"]')?.addEventListener("click", () => renderWelcome());
  root.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    const nextDraft = currentDraft();
    if (!nextDraft.selectedRubros?.length) {
      root.querySelector("[data-notice]")?.classList.add("is-on");
      return;
    }
    setActivationDraftStep("prices");
    renderPrices();
  });
}

function groupedSelectedProducts(draft) {
  const selected = new Set(draft.selectedRubros || []);
  const products = catalog.filter((p) => selected.has(String(p.rubro || "").trim()));
  return products.reduce((acc, p) => {
    const rubro = String(p.rubro || "Otros").trim() || "Otros";
    (acc[rubro] ||= []).push(p);
    return acc;
  }, {});
}

function renderPrices() {
  const draft = currentDraft();
  if (!draft.selectedRubros?.length) {
    renderRubros();
    return;
  }

  setActivationDraftStep("prices");
  setProgress("prices");

  const grouped = groupedSelectedProducts(draft);
  const count = activationDraftPricedCount(draft);

  const groupsHtml = Object.entries(grouped).map(([rubro, products]) => `
    <section class="price-group" data-price-group>
      <h3>${RUBRO_EMOJI[rubro] || "🥩"} ${esc(RUBRO_LABELS[rubro] || rubro)}</h3>
      ${products.map((p) => {
        const key = productKey(p);
        return `
          <label
            class="price-row"
            data-price-row
            data-price-search="${esc(`${p.nombre || p.name || "Producto"} ${RUBRO_LABELS[rubro] || rubro}`)}"
          >
            <span>
              <strong>${esc(p.nombre || p.name || "Producto")}</strong>
              <small>${esc(p.unidad === "unidad" ? "por unidad" : "por kg")}</small>
            </span>
            <input
              class="price-input"
              type="number"
              inputmode="decimal"
              min="0"
              step="100"
              placeholder="Ej. 18.900"
              aria-label="Precio de ${esc(p.nombre || p.name || "Producto")}"
              data-price-key="${esc(key)}"
              value="${esc(moneyInputValue(draft.prices?.[key]))}"
            >
          </label>`;
      }).join("")}
    </section>
  `).join("");

  scene({
    image: count >= 5 ? ASSET.progress : ASSET.prices,
    eyebrow: "Paso 2 de 4",
    title: count >= 5 ? "¡Bien! Ya se empieza a ver." : "Cargá tus precios.",
    lead: count >= 5
      ? "Ya tenemos suficiente para armar una vidriera. Podés seguir cargando o avanzar."
      : "Poné los precios que tengas a mano. Lo que dejes vacío no se publica.",
    body: `
      <div class="field" style="margin-top:0;">
        <label for="priceSearch">Buscar corte o producto</label>
        <input
          id="priceSearch"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="Ej. Costilla, Vacío, Milanesa..."
          aria-label="Buscar corte o producto"
        >
      </div>
      <div class="price-toolbar">
        <span class="counter" data-price-count>${count} producto${count === 1 ? "" : "s"} con precio</span>
        <span class="hint">Guardado automático</span>
      </div>
      <div class="price-list">${groupsHtml}</div>
      <div class="notice" data-search-empty>No encontramos productos con ese nombre.</div>
      <div class="notice" data-notice>Cargá al menos un precio para continuar.</div>
    `,
    actions: `
      <button class="btn btn-light" type="button" data-action="back">← Rubros</button>
      <button class="btn ${count >= 5 ? "btn-green" : "btn-primary"}" type="button" data-action="next">
        ${count >= 5 ? "Seguir →" : "Continuar"}
      </button>
    `
  });

  const searchInput = root.querySelector("#priceSearch");
  const searchEmpty = root.querySelector("[data-search-empty]");

  const applyPriceSearch = () => {
    const query = normalizeSearchText(searchInput?.value || "");
    let visibleRows = 0;

    root.querySelectorAll("[data-price-group]").forEach((group) => {
      let visibleInGroup = 0;

      group.querySelectorAll("[data-price-row]").forEach((row) => {
        const haystack = normalizeSearchText(row.dataset.priceSearch || row.textContent || "");
        const visible = !query || haystack.includes(query);
        row.style.display = visible ? "" : "none";
        if (visible) {
          visibleRows += 1;
          visibleInGroup += 1;
        }
      });

      group.style.display = visibleInGroup === 0 ? "none" : "";
    });

    if (searchEmpty) {
      searchEmpty.classList.toggle("is-on", Boolean(query) && visibleRows === 0);
    }
  };

  searchInput?.addEventListener("input", applyPriceSearch);
  searchInput?.addEventListener("search", applyPriceSearch);

  root.querySelectorAll("[data-price-key]").forEach((input) => {
    const save = () => {
      setActivationDraftPrice(input.dataset.priceKey, input.value);
      const newCount = activationDraftPricedCount();
      const countEl = root.querySelector("[data-price-count]");
      if (countEl) countEl.textContent = `${newCount} producto${newCount === 1 ? "" : "s"} con precio`;
    };
    input.addEventListener("change", save);
    input.addEventListener("blur", save);
  });

  root.querySelector('[data-action="back"]')?.addEventListener("click", renderRubros);
  root.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    root.querySelectorAll("[data-price-key]").forEach((input) => {
      setActivationDraftPrice(input.dataset.priceKey, input.value);
    });
    if (activationDraftPricedCount() < 1) {
      root.querySelector("[data-notice]")?.classList.add("is-on");
      return;
    }
    setActivationDraftStep("identity");
    renderIdentity();
  });
}

function renderIdentity() {
  const draft = currentDraft();
  if (activationDraftPricedCount(draft) < 1) {
    renderPrices();
    return;
  }

  setActivationDraftStep("identity");
  setProgress("identity");

  scene({
    image: ASSET.identity,
    eyebrow: "Paso 3 de 4",
    title: "Ahora pongámosle nombre.",
    lead: "Con esto ya puedo mostrarte una vista previa de tu propia carnicería.",
    body: `
      <div data-localidad-ar-scope>
        <div class="field">
          <label for="businessName">Nombre de la carnicería</label>
          <input id="businessName" maxlength="120" autocomplete="organization" placeholder="Ej. Carnicería El Buen Corte" value="${esc(draft.identity?.businessName || "")}">
        </div>
        <div class="field">
          <label for="locality">Localidad</label>
          <input
            id="locality"
            maxlength="120"
            autocomplete="off"
            placeholder="Escribí y elegí tu localidad"
            data-localidad-ar
            value="${esc(draft.identity?.locality || "")}"
            data-localidad-validada="${draft.identity?.locality && draft.identity?.provinceId ? "true" : "false"}"
            data-provincia-id="${esc(draft.identity?.provinceId || "")}"
            data-provincia-nombre="${esc(draft.identity?.province || "")}"
          >
        </div>
        <div class="field">
          <label for="province">Provincia</label>
          <input
            id="province"
            maxlength="120"
            readonly
            data-provincia-ar
            placeholder="Se completa al elegir la localidad"
            value="${esc(draft.identity?.province || "")}"
          >
          <input id="provinceId" type="hidden" data-provincia-id-ar value="${esc(draft.identity?.provinceId || "")}">
        </div>
      </div>
      <div class="notice" data-notice>Completá el nombre y elegí una localidad válida de la lista.</div>
      <p class="hint">La provincia se completa automáticamente. Todavía no te pedimos email, contraseña ni tarjeta.</p>
    `,
    actions: `
      <button class="btn btn-light" type="button" data-action="back">← Precios</button>
      <button class="btn btn-green" type="button" data-action="preview">👀 Ver mi carnicería</button>
    `
  });

  const localityInput = root.querySelector("#locality");
  const provinceInput = root.querySelector("#province");
  const provinceIdInput = root.querySelector("#provinceId");

  const saveIdentity = () => {
    setActivationDraftIdentity({
      businessName: root.querySelector("#businessName")?.value || "",
      locality: localityInput?.value || "",
      province: provinceInput?.value || localityInput?.dataset?.provinciaNombre || "",
      provinceId: provinceIdInput?.value || localityInput?.dataset?.provinciaId || ""
    });
  };

  root.querySelector("#businessName")?.addEventListener("blur", saveIdentity);
  localityInput?.addEventListener("localidad-ar:change", (event) => {
    const detail = event.detail || {};
    if (provinceInput) provinceInput.value = detail.provinciaNombre || "";
    if (provinceIdInput) provinceIdInput.value = detail.provinciaId || "";
    saveIdentity();
  });
  localityInput?.addEventListener("input", () => {
    if (provinceInput) provinceInput.value = "";
    if (provinceIdInput) provinceIdInput.value = "";
  });

  try {
    window.LocalidadesAR?.attach?.(localityInput);
  } catch (_) {}

  root.querySelector('[data-action="back"]')?.addEventListener("click", () => {
    saveIdentity();
    renderPrices();
  });

  root.querySelector('[data-action="preview"]')?.addEventListener("click", () => {
    saveIdentity();
    const next = currentDraft();
    const localityIsValid = Boolean(
      next.identity?.locality &&
      next.identity?.province &&
      next.identity?.provinceId
    );
    if (!next.identity?.businessName || !localityIsValid) {
      root.querySelector("[data-notice]")?.classList.add("is-on");
      localityInput?.focus();
      return;
    }
    setActivationDraftStep("preview");
    location.href = "/web.html?preview=activation";
  });
}


function friendlyRegistrationError(error) {
  const text = String(error?.code || error?.message || error || "").toLowerCase();

  if (text.includes("phone-already-used") || text.includes("phone_already_used") || text.includes("whatsapp ya")) {
    return "Ese WhatsApp ya está asociado a una carnicería en AppPromos.";
  }
  if (text.includes("email-already-in-use")) {
    return "Ese email ya está registrado. Probá ingresar con tu cuenta.";
  }
  if (text.includes("invalid-email")) {
    return "Revisá que el email esté bien escrito.";
  }
  if (text.includes("weak-password")) {
    return "La contraseña necesita al menos 6 caracteres.";
  }
  if (text.includes("teléfono / whatsapp") || text.includes("telefono / whatsapp")) {
    return "Ingresá un WhatsApp válido.";
  }

  return error?.message || "No pudimos publicar tu carnicería. Tus datos siguen guardados para que puedas reintentar.";
}

function renderPublish() {
  const draft = currentDraft();

  if (!draft.identity?.businessName || !draft.identity?.locality || !draft.identity?.province || !draft.identity?.provinceId) {
    renderIdentity();
    return;
  }
  if (activationDraftPricedCount(draft) < 1) {
    renderPrices();
    return;
  }

  setActivationDraftStep("publish");
  setProgress("publish");

  scene({
    image: ASSET.publish,
    eyebrow: "Último paso",
    title: "¡Ya la tenés armada!",
    lead: "Creá tu acceso y publico esta carnicería con los mismos precios que acabás de cargar.",
    body: `
      <div class="field">
        <label for="publishPhone">WhatsApp de la carnicería</label>
        <input id="publishPhone" inputmode="tel" autocomplete="tel" maxlength="40" placeholder="Ej. 3462 555555" value="${esc(draft.publish?.telefono || "")}">
      </div>
      <div class="field">
        <label for="publishEmail">Email para volver a entrar</label>
        <input id="publishEmail" type="email" autocomplete="email" maxlength="160" placeholder="tu@email.com" value="${esc(draft.publish?.email || "")}">
      </div>
      <div class="field">
        <label for="publishPassword">Creá una contraseña</label>
        <input id="publishPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Mínimo 6 caracteres">
      </div>
      <div class="field">
        <label for="publishPasswordRepeat">Repetí la contraseña</label>
        <input id="publishPasswordRepeat" type="password" autocomplete="new-password" minlength="6" placeholder="Repetí la contraseña">
      </div>
      <div class="notice" data-notice></div>
      <p class="hint"><strong>90 días gratis · sin tarjeta.</strong> Tus precios ya están listos y no vas a tener que cargarlos otra vez.</p>
    `,
    actions: `
      <button class="btn btn-light" type="button" data-action="back-preview">← Ver otra vez</button>
      <button class="btn btn-green" type="button" data-action="publish">Publicar mi carnicería</button>
    `
  });

  const phoneInput = root.querySelector("#publishPhone");
  const emailInput = root.querySelector("#publishEmail");
  const passwordInput = root.querySelector("#publishPassword");
  const passwordRepeatInput = root.querySelector("#publishPasswordRepeat");
  const publishBtn = root.querySelector('[data-action="publish"]');
  const notice = root.querySelector("[data-notice]");

  const savePublishData = () => {
    setActivationDraftPublishData({
      telefono: phoneInput?.value || "",
      email: emailInput?.value || ""
    });
  };

  phoneInput?.addEventListener("blur", savePublishData);
  emailInput?.addEventListener("blur", savePublishData);

  root.querySelector('[data-action="back-preview"]')?.addEventListener("click", () => {
    savePublishData();
    setActivationDraftStep("preview");
    location.href = "/web.html?preview=activation";
  });

  publishBtn?.addEventListener("click", async () => {
    savePublishData();

    const current = currentDraft();
    const telefono = String(phoneInput?.value || "").trim();
    const email = String(emailInput?.value || "").trim();
    const password = passwordInput?.value || "";
    const passwordRepeat = passwordRepeatInput?.value || "";

    notice?.classList.remove("is-on");

    if (!telefono || !email || !password || !passwordRepeat) {
      if (notice) {
        notice.textContent = "Completá WhatsApp, email y contraseña.";
        notice.classList.add("is-on");
      }
      return;
    }

    if (password.length < 6) {
      if (notice) {
        notice.textContent = "La contraseña necesita al menos 6 caracteres.";
        notice.classList.add("is-on");
      }
      passwordInput?.focus();
      return;
    }

    if (password !== passwordRepeat) {
      if (notice) {
        notice.textContent = "Las contraseñas no coinciden.";
        notice.classList.add("is-on");
      }
      passwordRepeatInput?.focus();
      return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = "Publicando...";
    if (notice) {
      notice.textContent = "Estoy creando tu cuenta, guardando tus precios y publicando la web...";
      notice.classList.add("is-on");
    }

    try {
      trackRegistrationStarted({ source: "activation_onboarding" });

      const result = await registerClientAndBusiness({
        businessName: current.identity.businessName,
        ownerName: current.identity.businessName,
        email,
        password,
        direccion: "",
        telefono,
        ciudad: current.identity.locality,
        locality: current.identity.locality,
        province: current.identity.province,
        provinceId: current.identity.provinceId,
        activationPrices: current.prices,
        activationRubros: current.selectedRubros || []
      });

      trackTrialRegistered({
        source: "activation_onboarding",
        business_id: result?.businessId || null
      });

      await setActiveBusinessId(result.businessId);
      setActivationDraftStep("done");

      const success = {
        businessName: current.identity.businessName,
        locality: current.identity.locality,
        province: current.identity.province,
        telefono,
        businessId: result.businessId,
        publicUrl: result.publicUrl || "",
        pricedCount: result.pricedCount || activationDraftPricedCount(current)
      };

      clearActivationDraft();
      renderPublishedSuccess(success);
    } catch (error) {
      console.error(error);
      if (notice) {
        notice.textContent = friendlyRegistrationError(error);
        notice.classList.add("is-on");
      }
      publishBtn.disabled = false;
      publishBtn.textContent = "Publicar mi carnicería";
    }
  });
}

function renderPublishedSuccess(result = {}) {
  setProgress("done");

  const publicUrl = String(result.publicUrl || "").trim();
  const shareText = `🥩 ¡Ya podés ver nuestra carnicería online!\\n\\nMirá nuestros precios y promociones acá 👇\\n${publicUrl}`;
  const shareHref = publicUrl
    ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
    : "";

  scene({
    image: ASSET.online,
    eyebrow: "¡Publicada!",
    title: "Tu carnicería ya está online.",
    lead: `${esc(result.businessName || "Tu carnicería")} · ${esc(result.locality || "")}${result.province ? ` · ${esc(result.province)}` : ""}`,
    body: `
      <div class="resume-box">
        <strong>✓ ${Number(result.pricedCount || 0)} precio${Number(result.pricedCount || 0) === 1 ? "" : "s"} guardado${Number(result.pricedCount || 0) === 1 ? "" : "s"}</strong>
        <span class="hint">Esos son los mismos precios que cargaste antes de registrarte.</span>
      </div>
      <p class="hint" style="margin-top:14px;">Ahora viene lo importante: hacela conocer entre tus clientes.</p>
    `,
    actions: `
      ${publicUrl ? `<a class="btn btn-primary" href="${esc(publicUrl)}" target="_blank" rel="noopener">🌐 Ver mi carnicería</a>` : ""}
      ${shareHref ? `<a class="btn btn-green" href="${esc(shareHref)}" target="_blank" rel="noopener">📲 Compartir por WhatsApp</a>` : ""}
      <a class="btn btn-light" href="/app.html?onboarding=1">Entrar a AppPromos</a>
    `
  });
}

function resumeDraft() {
  const draft = currentDraft();
  const step = draft.step;

  if (step === "rubros") return renderRubros();
  if (step === "prices") return renderPrices();
  if (step === "identity" || step === "preview") return renderIdentity();
  if (step === "publish") return renderPublish();

  renderWelcome();
}

function boot() {
  const recoverable = hasRecoverableActivationDraft();

  if (params.get("publish") === "1" && recoverable) {
    renderPublish();
    return;
  }

  if (params.get("resume") === "1" && recoverable) {
    resumeDraft();
    return;
  }

  if (recoverable) {
    renderWelcome({ showResume: true });
    return;
  }

  renderWelcome();
}

boot();
