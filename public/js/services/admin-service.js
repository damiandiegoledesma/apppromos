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
  const phoneKeyByBusiness = new Map();

  usersSnap.forEach((userSnap) => {
    const user = userSnap.data() || {};
    const businessId = user.businessId || user.primaryBusinessId || (Array.isArray(user.businesses) ? user.businesses[0] : null);
    if (businessId) usersByBusiness.set(String(businessId), { uid: userSnap.id, ...user });
  });

  const phoneKeysSnap = await safeAdminCollectionSnapshot("publicPhoneKeys");
  phoneKeysSnap?.forEach((phoneSnap) => {
    const data = phoneSnap.data() || {};
    const businessId = String(data.businessId || "").trim();
    const phoneKey = String(data.phoneKey || phoneSnap.id || "").trim();
    if (businessId && phoneKey) phoneKeyByBusiness.set(businessId, { id: phoneSnap.id, phoneKey, ...data });
  });

  const rows = await Promise.all(businessDocs.map(async (item) => {
    const businessId = item.id;
    const root = item.data || {};
    let meta = null;
    try { meta = await readPath(`businesses/${businessId}/core/meta`); }
    catch (error) { console.warn("No se pudo leer meta", businessId, error); }

    const owner = usersByBusiness.get(businessId) || null;
    const phoneIndex = phoneKeyByBusiness.get(businessId) || null;
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
      telefono: root.telefono || root.phone || root.whatsapp || meta?.telefono || meta?.phone || meta?.whatsapp || owner?.telefono || owner?.phone || phoneIndex?.phoneKey || "",
      phone: root.phone || root.telefono || root.whatsapp || meta?.phone || meta?.telefono || meta?.whatsapp || owner?.phone || owner?.telefono || phoneIndex?.phoneKey || "",
      whatsapp: root.whatsapp || root.telefono || root.phone || meta?.whatsapp || meta?.telefono || meta?.phone || phoneIndex?.phoneKey || "",
      phoneKey: root.phoneKey || meta?.phoneKey || phoneIndex?.phoneKey || "",
      publicPhoneKey: phoneIndex?.phoneKey || "",
      phoneIndex,
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
    adminStatus: isTestBusiness === true ? "test" : "real",
    testMarkedAt: isTestBusiness === true ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await logAdminAction({ action: "business_test_flag_changed", targetBusinessId: businessId, before: { isTestBusiness: before?.isTestBusiness === true, adminStatus: before?.adminStatus || null }, after: { isTestBusiness: isTestBusiness === true, adminStatus: isTestBusiness === true ? "test" : "real" } });
}

async function safeAdminCollectionSnapshot(collectionName) {
  try {
    return await trackedGetDocs(collection(db, collectionName), collectionName);
  } catch (error) {
    console.warn(`No se pudo leer ${collectionName} para marcar TEST`, error);
    return null;
  }
}

function userBelongsToAnyBusiness(user = {}, businessIds = new Set()) {
  const directIds = [user.businessId, user.primaryBusinessId].filter(Boolean).map(String);
  const arrayIds = Array.isArray(user.businesses) ? user.businesses.filter(Boolean).map(String) : [];
  return [...directIds, ...arrayIds].some((businessId) => businessIds.has(businessId));
}


const CLONE_SAFE_SUBCOLLECTIONS = [
  "items",
  "combos",
  "savedOffers",
  "offers",
  "promos"
];

const DELETE_TEST_SUBCOLLECTIONS = [
  ...CLONE_SAFE_SUBCOLLECTIONS,
  "metrics",
  "userMetrics",
  "activity",
  "logs"
];

function clonePlainData(value) {
  if (!value || typeof value !== "object") return value;
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); }
  catch (_) { return { ...value }; }
}

function cleanNullableText(value) {
  return String(value || "").trim();
}

function buildTestCloneName(source = {}) {
  const base = cleanNullableText(source.displayName || source.name || source.businessName || source.id || source.businessId || "Carnicería");
  const suffix = "— Copia TEST";
  return base.includes("Copia TEST") ? `${base} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : `${base} ${suffix}`;
}

function sanitizeBusinessRootForTestClone(source = {}, newBusinessId, now) {
  const copy = clonePlainData(source) || {};
  const cloneName = buildTestCloneName(source);

  [
    "id",
    "businessId",
    "ownerUid",
    "ownerEmail",
    "ownerName",
    "email",
    "phone",
    "telefono",
    "whatsapp",
    "phoneKey",
    "publicPhoneKey",
    "slug",
    "publicSlug",
    "publicUrl",
    "webSlug"
  ].forEach((key) => { delete copy[key]; });

  const nextWeb = copy.web && typeof copy.web === "object" ? { ...copy.web } : {};

  return {
    ...copy,
    businessId: newBusinessId,
    id: newBusinessId,
    name: cloneName,
    displayName: cloneName,
    status: "active",
    archived: false,
    restoredAt: null,
    isTestBusiness: true,
    adminStatus: "test",
    clonedFromBusinessId: source.businessId || source.id || null,
    clonedAt: now,
    clonedReason: "Copia TEST creada desde Panel Admin",
    testMarkedAt: now,
    testReason: "Empresa clonada como TEST desde Panel Admin",
    ownerUid: null,
    ownerEmail: "",
    email: "",
    phone: "",
    telefono: "",
    whatsapp: "",
    phoneKey: "",
    publicPhoneKey: "",
    web: {
      ...nextWeb,
      enabled: false,
      active: false,
      published: false,
      slug: null,
      publicUrl: null,
      clonedDisabled: true,
      updatedAt: now
    },
    billing: {
      ...(copy.billing || {}),
      status: "active",
      plan: copy.billing?.plan || "trial"
    },
    createdAt: now,
    updatedAt: now
  };
}

function sanitizeMetaForTestClone(meta = {}, cloneRoot = {}, now) {
  const copy = clonePlainData(meta) || {};
  ["ownerUid", "ownerEmail", "email", "phone", "telefono", "whatsapp", "phoneKey", "publicPhoneKey", "slug", "publicSlug", "publicUrl", "webSlug"].forEach((key) => { delete copy[key]; });
  return {
    ...copy,
    businessId: cloneRoot.businessId,
    name: cloneRoot.name,
    displayName: cloneRoot.displayName,
    ownerUid: null,
    ownerEmail: "",
    email: "",
    phone: "",
    telefono: "",
    whatsapp: "",
    phoneKey: "",
    isTestBusiness: true,
    adminStatus: "test",
    clonedFromBusinessId: cloneRoot.clonedFromBusinessId || null,
    clonedAt: now,
    testMarkedAt: now,
    testReason: "Empresa clonada como TEST desde Panel Admin",
    updatedAt: now
  };
}

async function copyKnownSubcollection(sourceBusinessId, targetBusinessId, collectionName, now) {
  const snap = await safeAdminCollectionSnapshot(`businesses/${sourceBusinessId}/${collectionName}`);
  if (!snap?.forEach) return 0;

  const writes = [];
  let count = 0;
  snap.forEach((itemDoc) => {
    const data = clonePlainData(itemDoc.data() || {});
    const cleanData = {
      ...data,
      businessId: targetBusinessId,
      clonedFromBusinessId: sourceBusinessId,
      clonedAt: now,
      isTestData: true,
      updatedAt: now
    };
    writes.push(setDoc(doc(db, "businesses", targetBusinessId, collectionName, itemDoc.id), cleanData, { merge: false }));
    count += 1;
  });

  await Promise.all(writes);
  return count;
}

async function deleteKnownSubcollectionDocs(businessId, collectionName) {
  const snap = await safeAdminCollectionSnapshot(`businesses/${businessId}/${collectionName}`);
  if (!snap?.forEach) return 0;

  const deletes = [];
  let count = 0;
  snap.forEach((itemDoc) => {
    deletes.push(deleteDoc(doc(db, "businesses", businessId, collectionName, itemDoc.id)));
    count += 1;
  });
  await Promise.all(deletes);
  return count;
}

async function deleteIndexesForTestBusiness(businessId, collectionName) {
  const snap = await safeAdminCollectionSnapshot(collectionName);
  if (!snap?.forEach) return 0;

  const deletes = [];
  let count = 0;
  snap.forEach((indexDoc) => {
    const data = indexDoc.data() || {};
    if (String(data.businessId || "") !== String(businessId)) return;
    deletes.push(deleteDoc(doc(db, collectionName, indexDoc.id)));
    count += 1;
  });
  await Promise.all(deletes);
  return count;
}

export async function markExistingBusinessesAsTest(options = {}) {
  await requireAdmin();
  const now = new Date().toISOString();
  const reason = String(options.reason || "Base actual marcada como TEST antes del primer cliente real").trim();

  const businessDocs = await readCollection("businesses");
  const businessIds = new Set(businessDocs.map((item) => String(item.id)).filter(Boolean));
  const updates = [];

  businessDocs.forEach((item) => {
    const businessId = String(item.id || "").trim();
    if (!businessId) return;

    const patch = {
      isTestBusiness: true,
      adminStatus: "test",
      testMarkedAt: now,
      testReason: reason,
      updatedAt: now
    };

    updates.push(setDoc(doc(db, "businesses", businessId), patch, { merge: true }));
    updates.push(setDoc(doc(db, "businesses", businessId, "core", "meta"), patch, { merge: true }));
  });

  let userCount = 0;
  const usersSnap = await safeAdminCollectionSnapshot("users");
  usersSnap?.forEach((userSnap) => {
    const data = userSnap.data() || {};
    if (!userBelongsToAnyBusiness(data, businessIds)) return;
    userCount += 1;
    updates.push(setDoc(doc(db, "users", userSnap.id), {
      isTestUser: true,
      testMarkedAt: now,
      testReason: reason,
      updatedAt: now
    }, { merge: true }));
  });

  let phoneKeyCount = 0;
  const phoneSnap = await safeAdminCollectionSnapshot("publicPhoneKeys");
  phoneSnap?.forEach((phoneDoc) => {
    const data = phoneDoc.data() || {};
    const businessId = String(data.businessId || "").trim();
    if (!businessIds.has(businessId)) return;
    phoneKeyCount += 1;
    updates.push(setDoc(doc(db, "publicPhoneKeys", phoneDoc.id), {
      isTestBusiness: true,
      adminStatus: "test",
      testMarkedAt: now,
      testReason: reason,
      updatedAt: now
    }, { merge: true }));
  });

  let slugCount = 0;
  const slugSnap = await safeAdminCollectionSnapshot("publicWebSlugs");
  slugSnap?.forEach((slugDoc) => {
    const data = slugDoc.data() || {};
    const businessId = String(data.businessId || "").trim();
    if (!businessIds.has(businessId)) return;
    slugCount += 1;
    updates.push(setDoc(doc(db, "publicWebSlugs", slugDoc.id), {
      isTestBusiness: true,
      adminStatus: "test",
      testMarkedAt: now,
      testReason: reason,
      updatedAt: now
    }, { merge: true }));
  });

  await Promise.all(updates);

  const result = {
    businessCount: businessDocs.length,
    userCount,
    phoneKeyCount,
    slugCount,
    markedAt: now
  };

  await logAdminAction({
    action: "current_base_marked_as_test",
    before: null,
    after: result
  });

  return result;
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

export async function cloneBusinessAsTest(businessId) {
  await requireAdmin();
  if (!businessId) throw new Error("businessId requerido");

  const sourceRoot = await readBusinessRoot(businessId);
  if (!sourceRoot) throw new Error("No se encontró la empresa de origen");
  if (sourceRoot.isTestBusiness !== true && sourceRoot.adminStatus !== "test") {
    throw new Error("Por seguridad, solo se clonan empresas marcadas como TEST");
  }

  const now = new Date().toISOString();
  const newBusinessRef = doc(collection(db, "businesses"));
  const newBusinessId = newBusinessRef.id;
  const cloneRoot = sanitizeBusinessRootForTestClone({ ...sourceRoot, businessId }, newBusinessId, now);

  await setDoc(newBusinessRef, cloneRoot, { merge: false });

  let metaCopied = false;
  let stateCopied = false;
  try {
    const sourceMeta = await readPath(`businesses/${businessId}/core/meta`);
    if (sourceMeta) {
      await setDoc(doc(db, "businesses", newBusinessId, "core", "meta"), sanitizeMetaForTestClone(sourceMeta, cloneRoot, now), { merge: false });
      metaCopied = true;
    }
  } catch (error) {
    console.warn("No se pudo copiar core/meta en clon TEST", error);
  }

  try {
    const sourceState = await readPath(`businesses/${businessId}/core/state`);
    if (sourceState) {
      const stateCopy = clonePlainData(sourceState) || {};
      await setDoc(doc(db, "businesses", newBusinessId, "core", "state"), {
        ...stateCopy,
        businessId: newBusinessId,
        status: "active",
        archived: false,
        isTestBusiness: true,
        adminStatus: "test",
        clonedFromBusinessId: businessId,
        clonedAt: now,
        updatedAt: now
      }, { merge: false });
      stateCopied = true;
    }
  } catch (error) {
    console.warn("No se pudo copiar core/state en clon TEST", error);
  }

  const copiedCollections = {};
  for (const collectionName of CLONE_SAFE_SUBCOLLECTIONS) {
    try {
      copiedCollections[collectionName] = await copyKnownSubcollection(businessId, newBusinessId, collectionName, now);
    } catch (error) {
      console.warn(`No se pudo copiar ${collectionName} en clon TEST`, error);
      copiedCollections[collectionName] = 0;
    }
  }

  const result = {
    sourceBusinessId: businessId,
    newBusinessId,
    name: cloneRoot.name,
    metaCopied,
    stateCopied,
    copiedCollections,
    createdAt: now
  };

  await logAdminAction({
    action: "test_business_cloned",
    targetBusinessId: businessId,
    before: { sourceBusinessId: businessId },
    after: result
  });

  await logAdminAction({
    action: "test_business_clone_created",
    targetBusinessId: newBusinessId,
    before: null,
    after: result
  });

  return result;
}

export async function deleteTestBusiness(businessId) {
  await requireAdmin();
  if (!businessId) throw new Error("businessId requerido");

  const before = await readBusinessRoot(businessId);
  if (!before) throw new Error("No se encontró la empresa TEST para eliminar");
  if (before.isTestBusiness !== true && before.adminStatus !== "test") {
    throw new Error("Solo se pueden eliminar empresas marcadas como TEST. Para clientes reales, usá Archivar.");
  }

  const deletedCollections = {};
  for (const collectionName of DELETE_TEST_SUBCOLLECTIONS) {
    try {
      deletedCollections[collectionName] = await deleteKnownSubcollectionDocs(businessId, collectionName);
    } catch (error) {
      console.warn(`No se pudo borrar ${collectionName} de empresa TEST`, error);
      deletedCollections[collectionName] = 0;
    }
  }

  let coreDeleted = 0;
  for (const coreDoc of ["meta", "state"]) {
    try {
      await deleteDoc(doc(db, "businesses", businessId, "core", coreDoc));
      coreDeleted += 1;
    } catch (error) {
      console.warn(`No se pudo borrar core/${coreDoc} de empresa TEST`, error);
    }
  }

  let phoneKeysDeleted = 0;
  let slugsDeleted = 0;
  try { phoneKeysDeleted = await deleteIndexesForTestBusiness(businessId, "publicPhoneKeys"); }
  catch (error) { console.warn("No se pudieron liberar publicPhoneKeys TEST", error); }
  try { slugsDeleted = await deleteIndexesForTestBusiness(businessId, "publicWebSlugs"); }
  catch (error) { console.warn("No se pudieron liberar publicWebSlugs TEST", error); }

  await deleteDoc(doc(db, "businesses", businessId));

  const result = {
    businessId,
    deletedCollections,
    coreDeleted,
    phoneKeysDeleted,
    slugsDeleted,
    authDeleted: false,
    deletedAt: new Date().toISOString()
  };

  await logAdminAction({
    action: "test_business_deleted",
    targetBusinessId: businessId,
    before,
    after: result
  });

  return result;
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



