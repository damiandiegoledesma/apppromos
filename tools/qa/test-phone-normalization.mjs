import { normalizePhoneAR } from "../../public/js/services/normalization-service.js";

const cases = [
  ["3462 543210", "+5493462543210"],
  ["03462 543210", "+5493462543210"],
  ["3462-15-543210", "+5493462543210"],
  ["+54 9 3462 543210", "+5493462543210"],
  ["5493462543210", "+5493462543210"],
  ["11 4567-8901", "+5491145678901"]
];

let failures = 0;
for (const [input, expected] of cases) {
  const result = normalizePhoneAR(input);
  const ok = result.phoneE164 === expected && result.isValid === true;
  console.log(`${ok ? "OK" : "ERROR"} ${input} -> ${result.phoneE164 || "inválido"}`);
  if (!ok) failures += 1;
}

if (failures) {
  console.error(`\nNormalización telefónica rechazada: ${failures} caso(s) fallaron.`);
  process.exitCode = 1;
} else {
  console.log("\nNormalización telefónica argentina aprobada.");
}
