import * as core from './core/firebase-core.js';
import { buildSeedData } from './data/seed-data.js';

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
      `Lista activa detectada: ${activeList?.name || 'N/D'} · Productos: ${BASE_PRODUCTS.length} · Combos: ${Array.isArray(DEMO_BUSINESS_STATE?.savedCombos) ? DEMO_BUSINESS_STATE.savedCombos.length : 0}`
    );

    const { db, docFn, writeBatchFn } = getFirestoreTools();
    const batch = writeBatchFn(db);

    // 1) Catálogo base global
    for (const p of BASE_PRODUCTS) {
      batch.set(docFn(db, 'catalogs', 'baseProducts', 'items', p.productKey), p);
    }

    // 2) Meta demo
    batch.set(docFn(db, 'businesses', 'demo', 'core', 'meta'), DEMO_BUSINESS_META);

    // 3) State demo
    batch.set(docFn(db, 'businesses', 'demo', 'core', 'state'), DEMO_BUSINESS_STATE);

    // 4) Lista versionada demo
    batch.set(
      docFn(db, 'businesses', 'demo', 'priceLists', INITIAL_PRICE_LIST_VERSION.versionId),
      INITIAL_PRICE_LIST_VERSION
    );

    await batch.commit();

    setLog(`Seeder ejecutado correctamente. Demo actualizada con ${Array.isArray(DEMO_BUSINESS_STATE?.savedCombos) ? DEMO_BUSINESS_STATE.savedCombos.length : 0} combos.`);
    alert('Seeder ejecutado correctamente. Demo + combos actualizados.');
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
  if (button) button.textContent = 'Cargar demo + combos';
  setLog('Seeder listo. Botón conectado correctamente. Usá “Cargar demo + combos”.');
}

window.addEventListener('DOMContentLoaded', bindSeederButton);