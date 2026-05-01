import {
  getFirestore,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { app, trackedGetDoc } from "../core/firebase-core.js";

const db = getFirestore(app);

export async function getUserRole(uid) {
  try {
    const userDoc = await trackedGetDoc(doc(db, "users", uid), "users/" + uid);

    if (!userDoc.exists()) {
      return "client";
    }

    const role = userDoc.data().role || "client";
    return role;
  } catch (error) {
    console.error("Error en getUserRole:", error);
    return "client";
  }
}

export async function isSuperAdmin(uid) {
  const role = await getUserRole(uid);
  return role === "superadmin";
}

export async function promoteToSuperAdmin(uid) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      role: "superadmin",
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error en promoteToSuperAdmin:", error);
    throw error;
  }
}
