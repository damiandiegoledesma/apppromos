import { storage, getBusinessMetaPath, readPath, patchPath } from "../core/firebase-core.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { assertBusinessCanWrite } from "./write-guard-service.js";
import { getBusinessStore, patchBusinessStore } from "./business-store.js";
import { saveBusinessCache } from "./cache-service.js";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_FRONT_INPUT_BYTES = 8 * 1024 * 1024;


const STORAGE_STALL_TIMEOUT_MS = 30000;

function humanStorageError(error) {
  const code = String(error?.code || "");
  if (code === "storage/unauthorized") {
    return new Error("No tenemos permiso para guardar esta imagen. Revisá las reglas de Firebase Storage.");
  }
  if (code === "storage/canceled") {
    return new Error("La carga de la imagen se canceló. Probá nuevamente.");
  }
  if (code === "storage/retry-limit-exceeded") {
    return new Error("La conexión tardó demasiado. Probá nuevamente con una conexión estable.");
  }
  if (code === "storage/bucket-not-found" || code === "storage/project-not-found") {
    return new Error("Firebase Storage todavía no está disponible para este proyecto.");
  }
  if (code === "storage/unknown") {
    return new Error("Firebase Storage no pudo guardar la imagen. Probá nuevamente.");
  }
  return error instanceof Error ? error : new Error("No pudimos guardar la imagen.");
}

function uploadBlobWithProgress(storageRef, blob, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, metadata);
    let stallTimer = null;

    const armTimeout = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        try { task.cancel(); } catch (error) {}
        reject(new Error("La carga tardó demasiado y se canceló. Probá nuevamente."));
      }, STORAGE_STALL_TIMEOUT_MS);
    };

    armTimeout();

    task.on(
      "state_changed",
      (snapshot) => {
        armTimeout();
        const total = Number(snapshot?.totalBytes || 0);
        const sent = Number(snapshot?.bytesTransferred || 0);
        const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
        try { onProgress?.(percent); } catch (error) {}
      },
      (error) => {
        if (stallTimer) clearTimeout(stallTimer);
        reject(humanStorageError(error));
      },
      () => {
        if (stallTimer) clearTimeout(stallTimer);
        resolve(task.snapshot);
      }
    );
  });
}

function cleanFileType(file) {
  return String(file?.type || "").toLowerCase();
}

function assertValidImageFile(file, maxBytes, label) {
  if (!file) throw new Error(`Elegí ${label}.`);
  const type = cleanFileType(file);
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    throw new Error("Usá una imagen JPG, PNG o WEBP.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("La imagen elegida no es válida.");
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`La imagen es demasiado pesada. Elegí una de hasta ${maxMb} MB.`);
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No pudimos leer la imagen elegida."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type = "image/webp", quality = 0.86) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No pudimos preparar la imagen para guardar."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function resizeImage(file, { maxWidth, maxHeight, quality }) {
  const image = await loadImageFromFile(file);
  const naturalWidth = Number(image.naturalWidth || image.width || 0);
  const naturalHeight = Number(image.naturalHeight || image.height || 0);
  if (!naturalWidth || !naturalHeight) throw new Error("La imagen elegida no tiene un tamaño válido.");

  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("No pudimos preparar la imagen en este dispositivo.");
  ctx.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, "image/webp", quality);
}

async function readCurrentMeta(businessId) {
  return (await readPath(getBusinessMetaPath(businessId))) || {};
}

async function persistBrandPatch(businessId, brandPatch) {
  const currentMeta = await readCurrentMeta(businessId);
  const nextBrand = {
    ...(currentMeta.brand || {}),
    ...brandPatch,
    updatedAt: new Date().toISOString()
  };
  const nextMeta = {
    ...currentMeta,
    brand: nextBrand,
    updatedAt: new Date().toISOString()
  };
  await patchPath(getBusinessMetaPath(businessId), {
    brand: nextBrand,
    updatedAt: nextMeta.updatedAt
  });
  patchBusinessStore(businessId, { meta: nextMeta });
  const store = getBusinessStore(businessId);
  saveBusinessCache(businessId, {
    meta: nextMeta,
    state: store?.state || {},
    products: Array.isArray(store?.products) ? store.products : []
  });
  return nextMeta;
}

async function uploadBrandImage(businessId, file, options) {
  if (!businessId) throw new Error("No encontramos la carnicería activa.");
  await assertBusinessCanWrite(businessId, options.writeAction);
  assertValidImageFile(file, options.maxInputBytes, options.label);

  const blob = await resizeImage(file, options.resize);
  const storagePath = `businesses/${businessId}/brand/${options.fileName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBlobWithProgress(
    storageRef,
    blob,
    {
      contentType: "image/webp",
      cacheControl: "public,max-age=3600"
    },
    options.onProgress
  );
  const downloadUrl = await getDownloadURL(snapshot.ref);

  const nextMeta = await persistBrandPatch(businessId, {
    [options.urlKey]: downloadUrl,
    [options.pathKey]: storagePath
  });

  return {
    meta: nextMeta,
    url: downloadUrl,
    path: storagePath
  };
}

export async function uploadBusinessLogo(businessId, file, { onProgress } = {}) {
  return uploadBrandImage(businessId, file, {
    label: "el logo de tu carnicería",
    writeAction: "guardar el logo de la carnicería",
    maxInputBytes: MAX_LOGO_INPUT_BYTES,
    fileName: "logo.webp",
    urlKey: "logoUrl",
    pathKey: "logoPath",
    resize: { maxWidth: 512, maxHeight: 512, quality: 0.9 },
    onProgress
  });
}

export async function uploadBusinessFrontPhoto(businessId, file, { onProgress } = {}) {
  return uploadBrandImage(businessId, file, {
    label: "la foto del frente de tu local",
    writeAction: "guardar la foto del frente de la carnicería",
    maxInputBytes: MAX_FRONT_INPUT_BYTES,
    fileName: "front.webp",
    urlKey: "frontPhotoUrl",
    pathKey: "frontPhotoPath",
    resize: { maxWidth: 1600, maxHeight: 1200, quality: 0.84 },
    onProgress
  });
}

async function deleteBrandImage(businessId, { pathKey, urlKey, defaultFileName }) {
  if (!businessId) throw new Error("No encontramos la carnicería activa.");
  await assertBusinessCanWrite(businessId, "quitar una imagen de la carnicería");
  const currentMeta = await readCurrentMeta(businessId);
  const currentBrand = currentMeta.brand || {};
  const storagePath = currentBrand[pathKey] || `businesses/${businessId}/brand/${defaultFileName}`;

  try {
    await deleteObject(ref(storage, storagePath));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }

  const nextBrand = { ...currentBrand };
  delete nextBrand[pathKey];
  delete nextBrand[urlKey];
  nextBrand.updatedAt = new Date().toISOString();
  const nextMeta = { ...currentMeta, brand: nextBrand, updatedAt: new Date().toISOString() };
  await patchPath(getBusinessMetaPath(businessId), { brand: nextBrand, updatedAt: nextMeta.updatedAt });
  patchBusinessStore(businessId, { meta: nextMeta });
  const store = getBusinessStore(businessId);
  saveBusinessCache(businessId, {
    meta: nextMeta,
    state: store?.state || {},
    products: Array.isArray(store?.products) ? store.products : []
  });
  return { meta: nextMeta };
}

export function deleteBusinessLogo(businessId) {
  return deleteBrandImage(businessId, {
    pathKey: "logoPath",
    urlKey: "logoUrl",
    defaultFileName: "logo.webp"
  });
}

export function deleteBusinessFrontPhoto(businessId) {
  return deleteBrandImage(businessId, {
    pathKey: "frontPhotoPath",
    urlKey: "frontPhotoUrl",
    defaultFileName: "front.webp"
  });
}
