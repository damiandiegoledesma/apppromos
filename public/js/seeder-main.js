import * as core from './core/firebase-core.js';
import { buildSeedData } from './data/seed-data.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

function getLogElement() {
  return (
    document.getElementById('seedLog') ||
    document.getElementById('statusBox') ||
    document.querySelector('pre') ||
    document.querySelector('textarea')
  );
}

function setLog(message) {
  const el = getLogElement();
  if (el) el.textContent = message;
  console.log(message);
}

function getFirestoreTools() {
  const db = core.db || core.firestore || core.database;
  const docFn = core.doc;
  const writeBatchFn = core.writeBatch;

  if (!db) {
    throw new Error('firebase-core.js no está exportando "db".');
  }

  if (!docFn || !writeBatchFn) {
    throw new Error(
      'firebase-core.js debe exportar también "doc" y "writeBatch" desde el mismo SDK que creó "db".'
    );
  }

  return { db, docFn, writeBatchFn };
}


function normalizeSlug(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function reindexAllPublicSlugs() {
  try {
    setLog('Reindexando slugs Web Premium...');
    const { db, docFn, writeBatchFn } = getFirestoreTools();
    const businessesSnap = await getDocs(collection(db, 'businesses'));
    const batch = writeBatchFn(db);
    let count = 0;

    for (const bizDoc of businessesSnap.docs) {
      const state = await core.readPath(`businesses/${bizDoc.id}/core/state`);
      const meta = await core.readPath(`businesses/${bizDoc.id}/core/meta`);
      const slug = normalizeSlug(state?.web?.slug || '');
      if (!slug) continue;

      batch.set(docFn(db, 'publicWebSlugs', slug), {
        businessId: bizDoc.id,
        slug,
        businessName: meta?.name || meta?.nombre || '',
        active: Boolean(state?.web?.enabled),
        plan: 'web_premium',
        updatedAt: new Date().toISOString()
      });
      count++;
    }

    await batch.commit();
    setLog(`Reindexación lista. Slugs actualizados: ${count}.`);
    alert(`Reindexación lista. Slugs actualizados: ${count}.`);
  } catch (err) {
    console.error(err);
    setLog(`Error reindexando slugs: ${err.message}`);
    alert(`Error reindexando slugs: ${err.message}`);
  }
}

async function reindexAllPhoneKeys() {
  try {
    setLog("Reindexando teléfonos únicos...");
    const { db, docFn, writeBatchFn } = getFirestoreTools();
    const { getPhoneKey, buildBusinessSlug } = await import("./services/web-premium-service.js");
    const businessesSnap = await getDocs(collection(db, "businesses"));
    const batch = writeBatchFn(db);
    const seen = new Map();
    const conflicts = [];
    let count = 0;

    for (const bizDoc of businessesSnap.docs) {
      if (bizDoc.id === "demo") continue;
      const meta = await core.readPath(`businesses/${bizDoc.id}/core/meta`);
      const state = await core.readPath(`businesses/${bizDoc.id}/core/state`).catch(() => null);
      const phoneKey = getPhoneKey(meta?.telefono || meta?.phone || "");
      if (!phoneKey || phoneKey.length < 8) continue;

      const existingBusiness = seen.get(phoneKey);
      if (existingBusiness && existingBusiness !== bizDoc.id) {
        conflicts.push(`${phoneKey}: ${existingBusiness} / ${bizDoc.id}`);
        continue;
      }
      seen.set(phoneKey, bizDoc.id);

      const slug = state?.web?.slug || buildBusinessSlug(meta || {}, bizDoc.id);
      batch.set(docFn(db, "publicPhoneKeys", phoneKey), {
        businessId: bizDoc.id,
        phoneKey,
        slug,
        businessName: meta?.name || meta?.nombre || "",
        ownerUid: meta?.ownerUid || null,
        updatedAt: new Date().toISOString()
      });
      count++;
    }

    await batch.commit();
    const conflictMsg = conflicts.length ? `\nConflictos detectados:\n${conflicts.join("\n")}` : "";
    setLog(`Reindexación de teléfonos lista. Teléfonos actualizados: ${count}.${conflictMsg}`);
    alert(`Reindexación de teléfonos lista. Teléfonos actualizados: ${count}.` + conflictMsg);
  } catch (err) {
    console.error(err);
    setLog(`Error reindexando teléfonos: ${err.message}`);
    alert(`Error reindexando teléfonos: ${err.message}`);
  }
}

async function runSeeder() {
  try {
    setLog('Preparando seed...');

    const {
      activeList,
      BASE_PRODUCTS,
      INITIAL_PRICE_LIST_VERSION,
      DEMO_BUSINESS_META,
      DEMO_BUSINESS_STATE
    } = await buildSeedData();

    setLog(
      `Lista activa detectada: ${activeList?.name || 'N/D'} · Productos: ${BASE_PRODUCTS.length}`
    );

    const { db, docFn, writeBatchFn } = getFirestoreTools();
    const batch = writeBatchFn(db);

    // 1) Catálogo base global
    for (const p of BASE_PRODUCTS) {
      batch.set(docFn(db, 'catalogs', 'baseProducts', 'items', p.productKey), p);
    }

    // 2) Resumen root demo (compatibilidad admin / listados)
    batch.set(docFn(db, 'businesses', 'demo'), {
      name: DEMO_BUSINESS_META.name,
      direccion: DEMO_BUSINESS_META.direccion || '',
      ciudad: DEMO_BUSINESS_META.ciudad || '',
      telefono: DEMO_BUSINESS_META.telefono || '',
      status: 'active',
      createdAt: DEMO_BUSINESS_META.createdAt,
      updatedAt: DEMO_BUSINESS_META.createdAt
    });

    // 3) Meta demo
    batch.set(docFn(db, 'businesses', 'demo', 'core', 'meta'), DEMO_BUSINESS_META);

    // 4) State demo
    batch.set(docFn(db, 'businesses', 'demo', 'core', 'state'), DEMO_BUSINESS_STATE);

    // 5) Lista versionada demo
    batch.set(
      docFn(db, 'businesses', 'demo', 'priceLists', INITIAL_PRICE_LIST_VERSION.versionId),
      INITIAL_PRICE_LIST_VERSION
    );

    await batch.commit();

    setLog('Seeder ejecutado correctamente.');
    alert('Seeder ejecutado correctamente');
  } catch (err) {
    console.error(err);
    setLog(`Error: ${err.message}`);
    alert(`Error: ${err.message}`);
  }
}

function bindSeederButton() {
  const candidates = [
    document.getElementById('runSeederBtn'),
    document.getElementById('seedBtn'),
    ...Array.from(document.querySelectorAll('button'))
  ].filter(Boolean);

  if (!candidates.length) {
    setLog('No se encontró ningún botón para ejecutar el seeder.');
    return;
  }

  const button =
    candidates.find((btn) => /seed|cargar/i.test(btn.id || '')) ||
    candidates.find((btn) => /cargar seed|seed mínimo/i.test(btn.textContent || '')) ||
    candidates[0];

  button.addEventListener('click', runSeeder);

  const reindexButton = document.getElementById('btnReindexSlugs');
  const reindexPhonesButton = document.getElementById('btnReindexPhones');
  reindexPhonesButton?.addEventListener('click', reindexAllPhoneKeys);
  reindexButton?.addEventListener('click', reindexAllPublicSlugs);

  setLog('Seeder listo. Botones conectados correctamente.');
}

window.addEventListener('DOMContentLoaded', bindSeederButton);
