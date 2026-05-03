import {
  db,
  doc,
  collection,
  readCollection,
  readPath,
  patchPath,
  trackedGetDoc,
  trackedGetDocs
} from "../core/firebase-core.js";

import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { getCurrentAuthUser, resolveSession } from "./auth-service.js";
import { normalizeBusinessControl, DEFAULT_MODULES, BILLING_PLANS, createTrialEndsAt } from "./access-control-service.js";

export const ADMIN_ROLES = ["superadmin", "admin"];

export async function getAdminProfile(uid = null) {
  const cleanUid = uid || getCurrentAuthUser()?.uid;
  if (!cleanUid) return null;
  const snap = await trackedGetDoc(doc(db, "admins", cleanUid), `admins/${cleanUid}`);
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  if (data.active === false) return null;
  const role = String(data.role || "admin").toLowerCase();
  if (!ADMIN_ROLES.includes(role)) return null;
  return { uid: cleanUid, ...data, role };
}

export async function requireAdmin() {
  const session = await resolveSession();
  const profile = session?.adminProfile || await getAdminProfile(session?.firebaseUser?.uid);
  if (!profile) throw new Error("Acceso reservado a administradores");
  return { session, admin: profile };
}

export function buildBusinessDefaults(partial = {}) {
  const now = new Date().toISOString();
  return normalizeBusinessControl({
    status: "active",
    modules: { ...DEFAULT_MODULES },
    billing: {
      status: "active",
      plan: "trial",
      trialEndsAt: createTrialEndsAt(),
      graceEndsAt: null
    },
    isTestBusiness: false,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    ...partial
  });
}

export async function readBusinessRoot(businessId) {
  if (!businessId) return null;
  const snap = await trackedGetDoc(doc(db, "businesses", businessId), `businesses/${businessId}`);
  if (!snap.exists()) return null;
  return { businessId, id: businessId, ...(snap.data() || {}) };
}

export async function ensureBusinessAdminDefaults(businessId, currentRoot = null) {
  if (!businessId) throw new Error("businessId requerido");
  await requireAdmin();

  const root = currentRoot || await readBusinessRoot(businessId) || { businessId };
  const normalized = buildBusinessDefaults(root);
  const patch = {
    status: normalized.status,
    modules: normalized.modules,
    billing: normalized.billing,
    isTestBusiness: normalized.isTestBusiness,
    updatedAt: new Date().toISOString()
  };

  if (!root.createdAt && normalized.createdAt) patch.createdAt = normalized.createdAt;
  if (root.name) patch.name = root.name;
  if (root.ownerUid) patch.ownerUid = root.ownerUid;
  if (root.ownerEmail) patch.ownerEmail = root.ownerEmail;

  await setDoc(doc(db, "businesses", businessId), patch, { merge: true });
  return { ...root, ...patch };
}

export async function listAdminBusinesses() {
  await requireAdmin();
  const businessDocs = await readCollection("businesses");
  const usersSnap = await trackedGetDocs(collection(db, "users"), "users");
  const usersByBusiness = new Map();

  usersSnap.forEach((userSnap) => {
    const user = userSnap.data() || {};
    const businessId = user.businessId || user.primaryBusinessId || (Array.isArray(user.businesses) ? user.businesses[0] : null);
    if (businessId) usersByBusiness.set(String(businessId), { uid: userSnap.id, ...user });
  });

  const rows = await Promise.all(businessDocs.map(async (item) => {
    const businessId = item.id;
    const root = item.data || {};
    let meta = null;
    try { meta = await readPath(`businesses/${businessId}/core/meta`); }
    catch (error) { console.warn("No se pudo leer meta", businessId, error); }

    const owner = usersByBusiness.get(businessId) || null;
    const normalized = buildBusinessDefaults({
      ...root,
      businessId,
      name: root.name || meta?.name || businessId,
      ownerUid: root.ownerUid || owner?.uid || meta?.ownerUid || null,
      ownerEmail: root.ownerEmail || owner?.email || "",
      createdAt: root.createdAt || meta?.createdAt || null,
      updatedAt: root.updatedAt || meta?.updatedAt || null
    });

    return {
      ...normalized,
      businessId,
      id: businessId,
      name: root.name || meta?.name || normalized.name || businessId,
      displayName: root.displayName || meta?.displayName || root.name || meta?.name || normalized.name || businessId,
      responsable: root.responsable || root.responsibleName || root.ownerName || meta?.responsable || meta?.responsibleName || owner?.displayName || owner?.nombre || "",
      responsibleName: root.responsibleName || root.responsable || root.ownerName || meta?.responsibleName || meta?.responsable || owner?.displayName || owner?.nombre || "",
      email: root.email || root.ownerEmail || meta?.email || meta?.ownerEmail || owner?.email || "",
      ownerEmail: root.ownerEmail || root.email || owner?.email || meta?.ownerEmail || meta?.email || "",
      archived: root.archived === true,
      archivedAt: root.archivedAt || null,
      restoredAt: root.restoredAt || null,
      clonedFromBusinessId: root.clonedFromBusinessId || null,
      adminStatus: root.adminStatus || null,
      telefono: root.telefono || root.phone || root.whatsapp || meta?.telefono || meta?.phone || meta?.whatsapp || owner?.telefono || owner?.phone || "",
      phone: root.phone || root.telefono || root.whatsapp || meta?.phone || meta?.telefono || meta?.whatsapp || owner?.phone || owner?.telefono || "",
      whatsapp: root.whatsapp || root.telefono || root.phone || meta?.whatsapp || meta?.telefono || meta?.phone || "",
      localidad: root.localidad || root.city || meta?.localidad || meta?.city || "",
      provincia: root.provincia || root.province || meta?.provincia || meta?.province || "",
      direccion: root.direccion || root.address || meta?.direccion || meta?.address || "",
      owner,
      meta
    };
  }));

  return rows.sort((a, b) => String(a.name || a.businessId).localeCompare(String(b.name || b.businessId), "es"));
}

export async function listAdminUsers() {
  await requireAdmin();
  const snap = await trackedGetDocs(collection(db, "users"), "users");
  const rows = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    rows.push({
      uid: docSnap.id,
      email: data.email || "",
      displayName: data.displayName || data.nombre || "",
      role: data.role || "client",
      disabled: data.disabled === true,
      status: data.status || (data.disabled === true ? "disabled" : "active"),
      disabledAt: data.disabledAt || null,
      restoredAt: data.restoredAt || null,
      businessId: data.businessId || data.primaryBusinessId || (Array.isArray(data.businesses) ? data.businesses[0] : null),
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    });
  });
  return rows.sort((a, b) => String(a.email || a.displayName || a.uid).localeCompare(String(b.email || b.displayName || b.uid), "es"));
}

export async function logAdminAction(action = {}) {
  const { session, admin } = await requireAdmin();
  const user = session.firebaseUser;
  await addDoc(collection(db, "adminActions"), {
    adminUid: user?.uid || admin.uid,
    adminEmail: user?.email || admin.email || "",
    adminRole: admin.role || "admin",
    action: action.action || "unknown",
    targetBusinessId: action.targetBusinessId || null,
    before: action.before || null,
    after: action.after || null,
    createdAt: serverTimestamp(),
    createdAtIso: new Date().toISOString()
  });
}

export async function listAdminActionsForBusiness(businessId, maxItems = 20) {
  await requireAdmin();
  if (!businessId) return [];

  const rows = await readCollection("adminActions");
  return rows
    .map((item) => ({ id: item.id, ...(item.data || {}) }))
    .filter((item) => item.targetBusinessId === businessId)
    .sort((a, b) => {
      const bDate = new Date(b.createdAtIso || 0).getTime();
      const aDate = new Date(a.createdAtIso || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, Math.max(1, Number(maxItems || 20)));
}

export async function updateBusinessStatus(businessId, nextStatus) {
  await requireAdmin();
  const allowed = ["active", "trial", "disabled", "suspended"];
  if (!allowed.includes(nextStatus)) throw new Error("Estado inválido");
  const before = await readBusinessRoot(businessId);
  await setDoc(doc(db, "businesses", businessId), {
    status: nextStatus,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_status_changed", targetBusinessId: businessId, before: { status: before?.status || null }, after: { status: nextStatus } });
}

export async function updateBusinessBillingPlan(businessId, nextPlan) {
  await requireAdmin();
  const cleanPlan = String(nextPlan || "trial").toLowerCase();
  if (!BILLING_PLANS.includes(cleanPlan)) throw new Error("Plan inválido");
  const before = await readBusinessRoot(businessId);
  const billing = { ...(before?.billing || {}), plan: cleanPlan, status: before?.billing?.status || "active" };
  await setDoc(doc(db, "businesses", businessId), {
    billing,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_plan_changed", targetBusinessId: businessId, before: { billing: before?.billing || null }, after: { billing } });
}

export async function updateBusinessBillingStatus(businessId, nextBillingStatus) {
  await requireAdmin();
  const allowed = ["active", "overdue", "suspended"];
  if (!allowed.includes(nextBillingStatus)) throw new Error("Estado de billing inválido");
  const before = await readBusinessRoot(businessId);
  const billing = { ...(before?.billing || {}), status: nextBillingStatus, plan: before?.billing?.plan || "trial" };
  await setDoc(doc(db, "businesses", businessId), {
    billing,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_billing_status_changed", targetBusinessId: businessId, before: { billing: before?.billing || null }, after: { billing } });
}

export async function updateBusinessModule(businessId, moduleKey, enabled) {
  await requireAdmin();
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_MODULES, moduleKey)) throw new Error("Módulo inválido");
  const before = await readBusinessRoot(businessId);
  const modules = { ...DEFAULT_MODULES, ...(before?.modules || {}), [moduleKey]: enabled === true };
  await setDoc(doc(db, "businesses", businessId), {
    modules,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_module_changed", targetBusinessId: businessId, before: { modules: before?.modules || null }, after: { moduleKey, enabled: enabled === true, modules } });
}

export async function updateBusinessModules(businessId, nextModules = {}) {
  await requireAdmin();
  if (!businessId) throw new Error("businessId requerido");

  const before = await readBusinessRoot(businessId);
  const modules = { ...DEFAULT_MODULES, ...(before?.modules || {}) };

  Object.keys(DEFAULT_MODULES).forEach((key) => {
    modules[key] = nextModules[key] === true;
  });

  await setDoc(doc(db, "businesses", businessId), {
    modules,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await logAdminAction({
    action: "business_modules_bulk_changed",
    targetBusinessId: businessId,
    before: { modules: before?.modules || null },
    after: { modules }
  });
}

export async function setBusinessTestFlag(businessId, isTestBusiness) {
  await requireAdmin();
  const before = await readBusinessRoot(businessId);
  await setDoc(doc(db, "businesses", businessId), {
    isTestBusiness: isTestBusiness === true,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_test_flag_changed", targetBusinessId: businessId, before: { isTestBusiness: before?.isTestBusiness === true }, after: { isTestBusiness: isTestBusiness === true } });
}


export async function archiveBusiness(businessId) {
  if (!businessId) throw new Error("businessId requerido");
  const before = await readBusinessRoot(businessId);

  await setDoc(doc(db, "businesses", businessId), {
    archived: true,
    archivedAt: new Date().toISOString(),
    status: "suspended",
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await logAdminAction({
    action: "business_archived",
    targetBusinessId: businessId,
    before: {
      archived: before?.archived === true,
      status: before?.status || null
    },
    after: {
      archived: true,
      status: "suspended"
    }
  });
}

export async function restoreBusiness(businessId) {
  if (!businessId) throw new Error("businessId requerido");
  const before = await readBusinessRoot(businessId);
  const nextStatus = before?.status === "suspended" || before?.status === "archived"
    ? "active"
    : (before?.status || "active");

  await setDoc(doc(db, "businesses", businessId), {
    archived: false,
    restoredAt: new Date().toISOString(),
    status: nextStatus,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await logAdminAction({
    action: "business_restored",
    targetBusinessId: businessId,
    before: {
      archived: before?.archived === true,
      status: before?.status || null
    },
    after: {
      archived: false,
      status: nextStatus
    }
  });
}

export async function setUserDisabled(uid, disabled = true) {
  if (!uid) throw new Error("uid requerido");

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const before = snap.exists() ? { uid, ...(snap.data() || {}) } : { uid };
  const isDisabled = disabled === true;

  await setDoc(userRef, {
    disabled: isDisabled,
    status: isDisabled ? "disabled" : "active",
    disabledAt: isDisabled ? new Date().toISOString() : null,
    restoredAt: isDisabled ? null : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await logAdminAction({
    action: isDisabled ? "user_disabled" : "user_restored",
    targetUserId: uid,
    targetBusinessId: before.businessId || before.primaryBusinessId || null,
    before: {
      disabled: before.disabled === true,
      status: before.status || null
    },
    after: {
      disabled: isDisabled,
      status: isDisabled ? "disabled" : "active"
    }
  });
}

export async function deleteTestBusiness(businessId) {
  await requireAdmin();
  const before = await readBusinessRoot(businessId);
  if (!before?.isTestBusiness) throw new Error("Solo se pueden borrar físicamente empresas marcadas como prueba");
  await deleteDoc(doc(db, "businesses", businessId));
  await logAdminAction({ action: "test_business_deleted", targetBusinessId: businessId, before, after: null });
}

export async function trackBusinessLogin(businessId) {
  if (!businessId || businessId === "demo") return;
  try {
    await setDoc(doc(db, "businesses", businessId), {
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn("No se pudo actualizar lastLoginAt", error);
  }
}

export async function trackBusinessActivityThrottled(businessId, minMinutes = 60) {
  if (!businessId || businessId === "demo") return;
  const key = `apppromos_last_activity_write:${businessId}`;
  const nowMs = Date.now();
  try {
    const last = Number(localStorage.getItem(key) || 0);
    if (last && nowMs - last < minMinutes * 60 * 1000) return;
    localStorage.setItem(key, String(nowMs));
  } catch (error) {}

  try {
    await setDoc(doc(db, "businesses", businessId), {
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn("No se pudo actualizar lastActivityAt", error);
  }
}


export function subscribeBusinessControl(businessId, callback) {
  if (!businessId || typeof callback !== "function") return () => {};
  return onSnapshot(doc(db, "businesses", businessId), (snap) => {
    const data = snap.exists() ? { businessId, id: businessId, ...(snap.data() || {}) } : { businessId, id: businessId };
    callback(buildBusinessDefaults(data));
  }, (error) => {
    console.warn("Listener business control error", error);
  });
}



