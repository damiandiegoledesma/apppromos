import fs from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const rules = fs.readFileSync("process.argv[2] || "./firestore.rules"", "utf8");
const env = await initializeTestEnvironment({ projectId: "rc4-billing", firestore: { host: "127.0.0.1", port: 8080, rules } });
await env.clearFirestore();
const d = (n) => new Date(Date.now() + n * 86400000);
const iso = (n) => d(n).toISOString();

// Los 10 estados del pliego + los casos de abuso del fallback legado
const casos = [
  ["1. nueva, prueba vigente",                 "active", { plan:"trial", status:"active", trialEndsAt:iso(10), writeAccessUntil:d(10) }, "PERMITIDO"],
  ["2. nueva, plan pago vigente",              "active", { plan:"basic", status:"active", nextPaymentDueAt:iso(20), writeAccessUntil:d(20) }, "PERMITIDO"],
  ["3. prueba vencida",                        "active", { plan:"trial", status:"active", trialEndsAt:iso(-1), writeAccessUntil:d(-1) }, "DENEGADO"],
  ["4. cuenta suspendida",                     "suspended", { plan:"basic", status:"active", writeAccessUntil:d(20) }, "DENEGADO"],
  ["5. LEGADO sin writeAccessUntil, al dia",   "active", { plan:"trial", status:"active", trialEndsAt:iso(10) }, "PERMITIDO"],
  ["6. LEGADO parcial (status pending)",       "active", { plan:"trial", status:"pending", trialEndsAt:iso(10) }, "?"],
  ["7. bonificado real (plan pago + manual)",  "active", { plan:"dueno", status:"manual" }, "PERMITIDO"],
  ["8. bonificado sobre trial",                "active", { plan:"trial", status:"manual", trialEndsAt:iso(-30) }, "?"],
  // --- LOS QUE IMPORTAN: el fallback como puerta trasera ---
  ["9. LEGADO con prueba VENCIDA hace 5 meses","active", { plan:"trial", status:"active", trialEndsAt:iso(-150) }, "DENEGADO"],
  ["10. LEGADO pago VENCIDO hace 90 dias",     "active", { plan:"basic", status:"active", nextPaymentDueAt:iso(-90) }, "DENEGADO"],
  ["11. LEGADO status overdue",                "active", { plan:"basic", status:"overdue", nextPaymentDueAt:iso(-90) }, "DENEGADO"],
  ["12. LEGADO status suspended",              "active", { plan:"basic", status:"suspended" }, "DENEGADO"],
  ["13. writeAccessUntil como STRING (tipo malo)","active", { plan:"trial", status:"active", writeAccessUntil:iso(10) }, "DENEGADO"],
  ["14. writeAccessUntil = null",              "active", { plan:"trial", status:"active", writeAccessUntil:null }, "DENEGADO"]
];

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (let i = 0; i < casos.length; i++) {
    const [, estado, billing] = casos[i];
    await setDoc(doc(db, `users/u${i}`), { uid:`u${i}`, role:"client", businessId:`b${i}`, status:"active" });
    await setDoc(doc(db, `businesses/b${i}`), { businessId:`b${i}`, ownerUid:`u${i}`, status:estado, ...(billing?{billing}:{}) });
    await setDoc(doc(db, `businesses/b${i}/core/state`), { products:[{nombre:"Asado",precio:100}] });
  }
});

console.log("PUEDE EL DUEÑO GUARDAR SUS PRECIOS?\n");
console.log("caso".padEnd(46), "| esperado ", "| real     ", "|");
let criticos = 0;
for (let i = 0; i < casos.length; i++) {
  const [label, , , esp] = casos[i];
  const db = env.authenticatedContext(`u${i}`).firestore();
  let ok = false;
  try { await setDoc(doc(db, `businesses/b${i}/core/state`), { products:[{nombre:"Asado",precio:200}] }); ok = true; } catch {}
  const real = ok ? "PERMITIDO" : "DENEGADO ";
  let marca = "";
  if (esp !== "?") {
    const bien = (ok ? "PERMITIDO" : "DENEGADO") === esp;
    marca = bien ? "ok" : "*** DESVIO ***";
    if (!bien && esp === "DENEGADO") criticos++;
  } else marca = "(informativo)";
  console.log(label.padEnd(46), "|", esp.padEnd(9), "|", real, "|", marca);
}

console.log("\nEl cliente puede fabricarse el estado legado borrando writeAccessUntil?");
const atac = env.authenticatedContext("u3").firestore();
let fab = false;
try { await updateDoc(doc(atac, "businesses/b3"), { billing: { plan:"trial", status:"active", trialEndsAt:iso(-1) } }); fab = true; } catch {}
console.log("  borrar writeAccessUntil de su propio billing:", fab ? "*** PERMITIDO — puerta trasera ***" : "DENEGADO ok");
if (fab) criticos++;

console.log(`\nDesvios que PERMITEN escribir a quien no debe: ${criticos}`);
await env.cleanup();
