import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const db = getFirestore(app);

export { app, db, doc, writeBatch, collection };

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
