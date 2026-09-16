import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  connectStorageEmulator
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5e2yOOdP9QnN3751RdoSHEWZUDHUUbJU",
  authDomain: "apppromos.firebaseapp.com",
  projectId: "apppromos",
  storageBucket: "apppromos.firebasestorage.app",
  messagingSenderId: "449601412282",
  appId: "1:449601412282:web:2a50257ba816c0ea32b683",
  measurementId: "G-EBJM7TQRSN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const host = String(globalThis.location?.hostname || "").toLowerCase();
const isLocalQa =
  host === "127.0.0.1" ||
  host === "localhost" ||
  host === "::1";

if (isLocalQa) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);

  globalThis.__APPPROMOS_ENV__ = Object.freeze({
    mode: "qa-local",
    firebase: "emulators",
    auth: "127.0.0.1:9099",
    firestore: "127.0.0.1:8080",
    storage: "127.0.0.1:9199"
  });

  const mountQaBanner = () => {
    if (!globalThis.document || document.getElementById("apppromosQaLocalBanner")) return;

    const banner = document.createElement("div");
    banner.id = "apppromosQaLocalBanner";
    banner.setAttribute("role", "status");
    banner.textContent = "🧪 ENTORNO QA LOCAL — FIREBASE EMULATORS — NO PRODUCCIÓN";
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "padding:6px 12px",
      "background:#7f1d1d",
      "color:#fff",
      "font:900 12px/1.2 system-ui,sans-serif",
      "letter-spacing:.03em",
      "text-align:center",
      "box-shadow:0 2px 8px rgba(0,0,0,.18)"
    ].join(";");

    document.body.appendChild(banner);
    document.documentElement.style.scrollPaddingTop = "34px";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountQaBanner, { once: true });
  } else {
    mountQaBanner();
  }

  console.info("[AppPromos] QA LOCAL: Auth, Firestore y Storage conectados a emulators.");
} else {
  globalThis.__APPPROMOS_ENV__ = Object.freeze({
    mode: "production",
    firebase: "production"
  });
}

export { app, auth, db, storage, isLocalQa, doc, writeBatch, collection };

export const LOCAL_ACTIVE_BUSINESS_KEY = "apppromos_active_business_id";

/**
 * SOLO cache local para demo o superadmin.
 * NO usar como fuente principal para clientes.
 */
export function getActiveBusinessId() {
  return localStorage.getItem(LOCAL_ACTIVE_BUSINESS_KEY) || null;
}

export function setActiveBusinessId(businessId) {
  localStorage.setItem(LOCAL_ACTIVE_BUSINESS_KEY, businessId);
  return businessId;
}

function pathToDocRef(path) {
  const segments = path.split("/").filter(Boolean);

  if (segments.length % 2 !== 0) {
    throw new Error(
      `Ruta inválida para Firestore: "${path}". Debe apuntar a un documento.`
    );
  }

  return doc(db, ...segments);
}

export function getBusinessMetaPath(businessId) {
  return `businesses/${businessId}/core/meta`;
}

export function getBusinessStatePath(businessId) {
  return `businesses/${businessId}/core/state`;
}

export function getBaseProductsPath() {
  return "catalogs/baseProducts";
}

function incrementReadCounter(path, count = 1) {
  try {
    const cleanPath = String(path || "unknown");
    const cleanCount = Math.max(0, Number(count || 0));
    window.__APPPROMOS_READ_DEBUG__ = window.__APPPROMOS_READ_DEBUG__ || { total: 0, byPath: {} };
    window.__APPPROMOS_READ_DEBUG__.total += cleanCount;
    window.__APPPROMOS_READ_DEBUG__.byPath[cleanPath] = (window.__APPPROMOS_READ_DEBUG__.byPath[cleanPath] || 0) + cleanCount;
    window.AppPromosReadDebug = window.__APPPROMOS_READ_DEBUG__;
  } catch (error) {}
}

function refToPath(ref, fallback = "unknown") {
  return ref?.path || fallback;
}

export function getReadDebug() {
  try { return window.__APPPROMOS_READ_DEBUG__ || { total: 0, byPath: {} }; }
  catch (error) { return { total: 0, byPath: {} }; }
}

export function resetReadDebug() {
  try {
    window.__APPPROMOS_READ_DEBUG__ = { total: 0, byPath: {} };
    window.AppPromosReadDebug = window.__APPPROMOS_READ_DEBUG__;
    return window.__APPPROMOS_READ_DEBUG__;
  } catch (error) { return { total: 0, byPath: {} }; }
}

export async function trackedGetDoc(docRef, label = null) {
  incrementReadCounter(label || refToPath(docRef), 1);
  return getDoc(docRef);
}

export async function trackedGetDocs(queryRef, label = null) {
  const snapshot = await getDocs(queryRef);
  incrementReadCounter(label || refToPath(queryRef, "collection/query"), snapshot.size || 0);
  return snapshot;
}

export async function readPath(path) {
  const snapshot = await trackedGetDoc(pathToDocRef(path), path);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function readCollection(path) {
  const snapshot = await trackedGetDocs(collection(db, ...String(path).split("/").filter(Boolean)), path);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {}, ref: docSnap.ref }));
}

export async function writePath(path, value) {
  await setDoc(pathToDocRef(path), value);
}

export async function patchPath(path, value) {
  await updateDoc(pathToDocRef(path), value);
}
