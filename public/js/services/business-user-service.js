import {
  getFirestore,
  doc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { app, trackedGetDoc } from "../core/firebase-core.js";

const db = getFirestore(app);

export async function getUserProfile(uid) {
  const snap = await trackedGetDoc(doc(db, "users", uid), "users/" + uid);

  if (!snap.exists()) {
    throw new Error("Usuario no encontrado");
  }

  return snap.data();
}

export async function createClientProfile(uid, data = {}) {
  await setDoc(doc(db, "users", uid), {
    email: data.email || "",
    displayName: data.displayName || "",
    role: "client",
    businessId: data.businessId || null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function createSuperadminProfile(uid, data = {}) {
  await setDoc(doc(db, "users", uid), {
    email: data.email || "",
    displayName: data.displayName || "",
    role: "superadmin",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function assignBusinessToClient(uid, businessId) {
  await updateDoc(doc(db, "users", uid), {
    businessId,
    updatedAt: new Date().toISOString()
  });
}

/* Compatibilidad temporal */

export async function linkUserToBusiness(uid, businessId) {
  return assignBusinessToClient(uid, businessId);
}

export async function getUserBusinesses(uid) {
  try {
    const data = await getUserProfile(uid);
    return data.businessId ? [data.businessId] : [];
  } catch {
    return [];
  }
}

export async function getPrimaryBusiness(uid) {
  try {
    const data = await getUserProfile(uid);
    return data.businessId || null;
  } catch {
    return null;
  }
}

export async function setPrimaryBusiness(uid, businessId) {
  return assignBusinessToClient(uid, businessId);
}

export async function canUserAccessBusiness(uid, businessId) {
  try {
    const data = await getUserProfile(uid);

    if (data.role === "superadmin") return true;
    if (businessId === "demo") return true;

    return data.businessId === businessId;
  } catch {
    return false;
  }
}

export async function getUserBusinessesData(uid) {
  try {
    const data = await getUserProfile(uid);
    if (!data.businessId) return [];

    return [
      {
        businessId: data.businessId,
        name: data.displayName || data.businessId
      }
    ];
  } catch {
    return [];
  }
}
