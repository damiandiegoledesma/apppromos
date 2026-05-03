import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { app, trackedGetDoc } from "../core/firebase-core.js";
import { buildBusinessSlug, getPhoneKey } from "./web-premium-service.js";
import { createTrialEndsAt } from "./access-control-service.js";
import { buildBusinessIdentity } from "./normalization-service.js";

const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_BUSINESS_ID = "demo-carniza";

function isDemoRoute() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("demo") === "1";
  } catch (error) {
    return false;
  }
}

function createDemoSession() {
  return {
    firebaseUser: null,
    userDoc: null,
    adminProfile: null,
    adminRole: null,
    appMode: "client",
    businessId: DEMO_BUSINESS_ID,
    isDemo: true,
    businessName: "Carnicería de Carniza",
    user: {
      email: "demo@app.com"
    }
  };
}


let sessionCache = {
  firebaseUser: null,
  userDoc: null,
  adminProfile: null,
  adminRole: null,
  appMode: "guest",
  businessId: null
};

let initialized = false;
let authReadyPromise = null;

const USER_CACHE_PREFIX = "apppromos_userdoc_v1";
const USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function userCacheKey(uid) {
  return USER_CACHE_PREFIX + ":" + uid;
}

function loadCachedUserDoc(uid) {
  try {
    const raw = localStorage.getItem(userCacheKey(uid));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.userDoc || !cached.cachedAt) return null;
    if (Date.now() - Number(cached.cachedAt) > USER_CACHE_TTL_MS) return null;
    return cached.userDoc;
  } catch (error) {
    console.warn("userDoc cache load error", error);
    return null;
  }
}

function saveCachedUserDoc(uid, userDoc) {
  try {
    localStorage.setItem(userCacheKey(uid), JSON.stringify({ userDoc, cachedAt: Date.now() }));
  } catch (error) {
    console.warn("userDoc cache save error", error);
  }
}

function clearCachedUserDoc(uid) {
  try {
    if (uid) localStorage.removeItem(userCacheKey(uid));
  } catch (error) {
    console.warn("userDoc cache clear error", error);
  }
}

async function loadUserDoc(uid, options = {}) {
  const forceRemote = options.forceRemote === true;

  if (!forceRemote) {
    const cached = loadCachedUserDoc(uid);
    if (cached) return cached;
  }

  const snap = await trackedGetDoc(doc(db, "users", uid), "users/" + uid);
  if (!snap.exists()) return null;
  const userDoc = snap.data() || {};
  saveCachedUserDoc(uid, userDoc);
  return userDoc;
}

async function loadAdminProfile(uid) {
  try {
    const snap = await trackedGetDoc(doc(db, "admins", uid), "admins/" + uid);
    if (!snap.exists()) return null;
    const admin = snap.data() || {};
    const role = String(admin.role || "admin").trim().toLowerCase();
    if (admin.active === false) return null;
    if (role !== "superadmin" && role !== "admin") return null;
    return { uid, ...admin, role };
  } catch (error) {
    console.warn("No se pudo leer perfil admin", error);
    return null;
  }
}

function resetSessionCache() {
  sessionCache = {
    firebaseUser: null,
    userDoc: null,
    adminProfile: null,
    adminRole: null,
    appMode: "guest",
    businessId: null
  };
  initialized = false;
}

function waitForAuthReady() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        authReadyPromise = null;
        resolve(user);
      });
    });
  }

  return authReadyPromise;
}

function normalizeRole(userDoc = {}) {
  const raw = String(userDoc.role || "").trim().toLowerCase();

  if (raw === "superadmin") return "superadmin";
  if (raw === "admin") return "superadmin";
  if (raw === "client") return "client";
  if (raw === "carnicero") return "client";

  if (userDoc.businessId || userDoc.primaryBusinessId) return "client";

  if (Array.isArray(userDoc.businesses) && userDoc.businesses.length > 0) {
    return "client";
  }

  return null;
}

function resolveBusinessIdFromUserDoc(userDoc = {}) {
  if (typeof userDoc.businessId === "string" && userDoc.businessId.trim()) {
    return userDoc.businessId.trim();
  }

  if (
    typeof userDoc.primaryBusinessId === "string" &&
    userDoc.primaryBusinessId.trim()
  ) {
    return userDoc.primaryBusinessId.trim();
  }

  if (Array.isArray(userDoc.businesses) && userDoc.businesses.length > 0) {
    const first = userDoc.businesses.find((item) => typeof item === "string" && item.trim());
    if (first) return first.trim();
  }

  return null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTemplateProduct(product = {}, index = 0) {
  const id = String(product.id || product.productKey || `item_${index}`).trim();

  return {
    ...deepClone(product),
    id,
    productKey: String(product.productKey || id).trim(),
    nombre: String(product.nombre || product.name || "").trim(),
    rubro: String(product.rubro || product.category || "").trim(),
    subrubro: String(product.subrubro || "").trim(),
    unidad: String(product.unidad || "kg").trim(),
    precio: Number(product.precio ?? product.price ?? product.precioSugerido ?? 0),
    active: product.active !== false,
    activo: product.activo !== false
  };
}

async function loadDemoTemplate() {
  const [demoMetaSnap, demoStateSnap] = await Promise.all([
    trackedGetDoc(doc(db, "businesses", "demo", "core", "meta"), "businesses/demo/core/meta"),
    trackedGetDoc(doc(db, "businesses", "demo", "core", "state"), "businesses/demo/core/state")
  ]);

  if (!demoMetaSnap.exists() || !demoStateSnap.exists()) {
    throw new Error("La plantilla demo no existe o está incompleta");
  }

  const demoMeta = demoMetaSnap.data() || {};
  const demoState = demoStateSnap.data() || {};
  const templateProducts = Array.isArray(demoState.products)
    ? demoState.products.map((product, index) => normalizeTemplateProduct(product, index))
    : [];

  if (!templateProducts.length) {
    throw new Error("La plantilla demo no tiene productos para clonar");
  }

  return {
    demoMeta,
    demoState,
    templateProducts
  };
}

/* =========================
   SESIÓN
========================= */

export async function resolveSession() {
  if (isDemoRoute()) {
    sessionCache = createDemoSession();
    initialized = true;
    return sessionCache;
  }

  if (initialized) return sessionCache;

  const firebaseUser = await waitForAuthReady();

  if (!firebaseUser) {
    sessionCache = {
      firebaseUser: null,
      userDoc: null,
      adminProfile: null,
      adminRole: null,
      appMode: "guest",
      businessId: null
    };
    initialized = true;
    return sessionCache;
  }

  const [userDoc, adminProfile] = await Promise.all([
    loadUserDoc(firebaseUser.uid),
    loadAdminProfile(firebaseUser.uid)
  ]);

  // V11: el rol administrativo real vive en admins/{uid}.
  // Se mantiene compatibilidad con users.role = superadmin/admin para no romper versiones previas.
  if (adminProfile || normalizeRole(userDoc || {}) === "superadmin") {
    sessionCache = {
      firebaseUser,
      userDoc,
      adminProfile: adminProfile || {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: "superadmin",
        active: true,
        source: "legacy-users-role"
      },
      adminRole: adminProfile?.role || "superadmin",
      appMode: "superadmin",
      businessId: null
    };
    initialized = true;
    return sessionCache;
  }

  if (!userDoc) {
    throw new Error("Usuario sin perfil en Firestore");
  }

  const normalizedRole = normalizeRole(userDoc);

  if (normalizedRole === "client") {
    const businessId = resolveBusinessIdFromUserDoc(userDoc);

    if (!businessId) {
      throw new Error("Usuario cliente sin businessId / primaryBusinessId");
    }

    sessionCache = {
      firebaseUser,
      userDoc,
      adminProfile: null,
      adminRole: null,
      appMode: "client",
      businessId
    };
    initialized = true;
    return sessionCache;
  }

  throw new Error("Rol de usuario inválido");
}

export async function validateUserCanAccessBusiness(businessId) {
  const session = await resolveSession();

  if (businessId === DEMO_BUSINESS_ID) {
    return session?.isDemo === true;
  }

  if (businessId === "demo") {
    return session.appMode === "guest" || session.appMode === "superadmin";
  }

  if (session.appMode === "superadmin") return true;

  if (session.appMode === "client") {
    return session.businessId === businessId;
  }

  return false;
}

export function getSession() {
  return sessionCache;
}

export function getCurrentAuthUser() {
  return auth.currentUser;
}

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    resetSessionCache();
    callback(user);
  });
}

/* =========================
   LOGIN / LOGOUT
========================= */

export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error("Email y contraseña requeridos");
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);
  resetSessionCache();

  const [userData, adminProfile] = await Promise.all([
    loadUserDoc(cred.user.uid, { forceRemote: true }),
    loadAdminProfile(cred.user.uid)
  ]);

  if (!userData && !adminProfile) {
    throw new Error("Usuario sin perfil en Firestore");
  }
  const normalizedRole = adminProfile ? "superadmin" : normalizeRole(userData || {});
  const businessId = resolveBusinessIdFromUserDoc(userData || {});

  return {
    uid: cred.user.uid,
    email: cred.user.email,
    nombre: userData?.displayName || adminProfile?.email || cred.user.email || "Usuario",
    role: adminProfile?.role || normalizedRole || userData?.role || "client",
    businessId
  };
}

export async function logoutUser() {
  clearCachedUserDoc(auth.currentUser?.uid);
  await signOut(auth);
  resetSessionCache();
}

/* =========================
   REGISTRO COMPLETO
   NUEVA LÓGICA: CLONAR DEMO
========================= */

export async function registerClientAndBusiness(data) {
  const {
    businessName,
    ownerName,
    email,
    password
  } = data;

  const identity = buildBusinessIdentity(data);

  if (!businessName || !ownerName || !email || !password || !identity.address || !identity.rawPhone || !identity.locality) {
    throw new Error("Faltan datos obligatorios");
  }

  await assertPhoneKeyAvailable(identity.phoneKey);

  if (!identity.isValidPhone || identity.phoneKey.length < 8) {
    throw new Error("Teléfono / WhatsApp válido requerido");
  }

  if (!identity.province || !identity.provinceId) {
    throw new Error("Seleccioná una localidad válida para completar provincia automáticamente");
  }


  if (String(password).length < 6) {
    throw new Error("Contraseña mínimo 6 caracteres");
  }

  const now = new Date().toISOString();
  const trialEndsAt = createTrialEndsAt();

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const businessId = `biz_${Date.now()}`;
  const slug = buildBusinessSlug({ name: businessName, telefono: identity.phone }, businessId);

  try {
    const { demoMeta, demoState, templateProducts } = await loadDemoTemplate();
    const activePriceListId = demoState.activePriceListId || demoMeta.activePriceListId || "v1";
    const modules = {
      prices: true,
      competition: true,
      combos: true,
      offers: true,
      webPremium: true,
      whatsapp: true
    };
    const billing = {
      status: "active",
      plan: "trial",
      trialStartedAt: now,
      trialEndsAt,
      graceEndsAt: null,
      updatedAt: now,
      updatedBy: "system:self_register"
    };

    await setDoc(doc(db, "businesses", businessId), {
      businessId,
      name: businessName,
      businessName,
      displayName: businessName,
      ownerUid: uid,
      ownerEmail: email,
      email,
      direccion: identity.address,
      address: identity.address,
      ciudad: identity.locality,
      locality: identity.locality,
      localityKey: identity.localityKey,
      provincia: identity.province,
      province: identity.province,
      provinceId: identity.provinceId,
      telefono: identity.phone,
      phone: identity.phone,
      phoneE164: identity.phoneE164,
      phoneKey: identity.phoneKey,
      rawPhone: identity.rawPhone,
      status: "trial",
      plan: "trial",
      active: true,
      isTestBusiness: false,
      isTemplateBusiness: false,
      createdBy: "self_register",
      modules,
      billing,
      createdAt: now,
      updatedAt: now
    });

    await setDoc(doc(db, "businesses", businessId, "core", "meta"), {
      businessId,
      name: businessName,
      businessName,
      displayName: businessName,
      ownerUid: uid,
      email,
      direccion: identity.address,
      address: identity.address,
      telefono: identity.phone,
      phone: identity.phone,
      phoneE164: identity.phoneE164,
      phoneKey: identity.phoneKey,
      rawPhone: identity.rawPhone,
      ciudad: identity.locality,
      locality: identity.locality,
      localityKey: identity.localityKey,
      provincia: identity.province,
      province: identity.province,
      provinceId: identity.provinceId,
      createdAt: now,
      updatedAt: now,
      sourceType: "signup",
      createdBy: "self_register",
      clonedFrom: "demo",
      activePriceListId
    });

    await setDoc(doc(db, "businesses", businessId, "core", "state"), {
      businessId,
      ownerUid: uid,
      ownerEmail: email,
      businessName,
      createdAt: now,
      activePriceListId,
      products: templateProducts,
      savedCombos: [],
      dashboard: {},
      web: {
        enabled: false,
        slug,
        selectedOffers: [],
        showPriceList: false,
        visibleRubros: [],
        updatedAt: now
      },
      updatedAt: now
    });

    await setDoc(doc(db, "publicWebSlugs", slug), {
      businessId,
      slug,
      businessName,
      ownerUid: uid,
      phoneKey: identity.phoneKey,
      active: false,
      plan: "web_premium",
      updatedAt: now
    });

    await setDoc(doc(db, "publicPhoneKeys", identity.phoneKey), {
      businessId,
      phoneKey: identity.phoneKey,
      active: true,
      updatedAt: now
    });

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      displayName: ownerName,
      role: "client",
      businessId,
      status: "active",
      createdAt: now,
      updatedAt: now
    });

    resetSessionCache();

    return {
      uid,
      businessId
    };
  } catch (error) {
    await rollbackIncompleteRegistration(cred, businessId, error);

    if (isPhoneAlreadyUsedError(error)) {
      throw buildPhoneAlreadyUsedError();
    }

    throw new Error(`No se pudo crear la carnicería desde la plantilla demo: ${error.message}`);
  }
}
