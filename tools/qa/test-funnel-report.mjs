// Tracking Comercial V1 — pruebas del cálculo del embudo (sin emulador).
// Uso: node tools/qa/test-funnel-report.mjs

import { readFile } from "node:fs/promises";

// Se carga como data URL para no depender de package.json ni de la versión de Node (18+).
const source = await readFile(new URL("../../public/js/services/funnel-report-service.js", import.meta.url), "utf8");
const {
  computeFunnel,
  resolveFunnelRange,
  startOfArgentinaDay,
  NO_ATTRIBUTION
} = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);

let failed = 0;
function check(label, condition, detail = "") {
  console.log(`${condition ? "OK  " : "FAIL"} ${label}${condition ? "" : ` ${detail}`}`);
  if (!condition) failed += 1;
}

const meta = (content) => ({ source: "meta", medium: "paid_social", campaign: "lanz", content, term: "", path: "/", at: "" });
const direct = { source: "(direct)", medium: "", campaign: "", content: "", term: "", path: "/", at: "" };
let t = 1_000_000;
const ev = (visitor, name, extra = {}) => ({
  visitor_id: visitor,
  event_name: name,
  occurred_ms: (t += 1000),
  is_internal: false,
  storage_ok: true,
  first_touch: meta("video"),
  last_touch: meta("video"),
  ...extra
});
const steps = (report) => Object.fromEntries(report.steps.map((step) => [step.key, step.visitors]));

// Únicos aunque el evento se repita
{
  const events = [
    ev("v1", "onboarding_started"), ev("v1", "onboarding_started"), ev("v1", "onboarding_started"),
    ev("v2", "onboarding_started"), ev("v2", "rubros_completed")
  ];
  const r = computeFunnel(events);
  check("3 repeticiones del mismo visitante cuentan 1", steps(r).onboarding_started === 2, JSON.stringify(steps(r)));
  check("conversión rubros/onboarding = 50%", r.steps.find((s) => s.key === "rubros_completed").fromPrevious === 0.5);
}

// Internos excluidos por defecto
{
  const events = [ev("v1", "onboarding_started"), ev("vi", "onboarding_started", { is_internal: true })];
  check("internos excluidos por defecto", steps(computeFunnel(events)).onboarding_started === 1);
  check("internos incluidos con el interruptor", steps(computeFunnel(events, { includeInternal: true })).onboarding_started === 2);
  check("cuenta de internos excluidos", computeFunnel(events).internalExcluded === 1);
}

// Atribución last vs first y filtros
{
  const events = [
    ev("a", "landing_view", { first_touch: meta("video"), last_touch: meta("video") }),
    ev("a", "business_created", { first_touch: meta("video"), last_touch: meta("carrusel") }),
    ev("b", "landing_view", { first_touch: direct, last_touch: direct })
  ];
  const last = computeFunnel(events, { content: "carrusel" });
  check("last_touch: 'a' atribuido a carrusel", last.visitors === 1 && steps(last).business_created === 1);
  const first = computeFunnel(events, { attribution: "first", content: "video" });
  check("first_touch: 'a' atribuido a video", first.visitors === 1);
  const none = computeFunnel(events, { campaign: NO_ATTRIBUTION });
  check("directo agrupado como Sin atribución", none.visitors === 1 && steps(none).landing_view === 1);
  check("lista de campañas", computeFunnel(events).campaigns.length === 2);
}

// Mayor caída con mínimo de 5 visitantes
{
  const events = [];
  for (let i = 0; i < 10; i += 1) events.push(ev(`v${i}`, "onboarding_started"));
  for (let i = 0; i < 8; i += 1) events.push(ev(`v${i}`, "rubros_completed"));
  for (let i = 0; i < 6; i += 1) events.push(ev(`v${i}`, "prices_started"));
  for (let i = 0; i < 2; i += 1) events.push(ev(`v${i}`, "prices_completed"));
  events.push(ev("v0", "name_completed"));
  const r = computeFunnel(events);
  check("mayor caída = prices_started -> prices_completed", r.biggestDrop?.to.key === "prices_completed", JSON.stringify(r.biggestDrop?.to));
  check("pérdida de 4 visitantes", r.biggestDrop?.lost === 4);
  check("paso con <5 visitantes no se elige como caída", r.biggestDrop?.from.key !== "prices_completed");
  check("% vs inicio arranca en el primer paso con datos", r.steps.find((s) => s.key === "rubros_completed").fromStart === 0.8);
  check("entradas directas (sin landing_view)", r.directOnboardingEntries === 10);
  check("conversión total desde landing sin landing = null", r.totalFromLanding === null);
}

// storage_ok
{
  const r = computeFunnel([ev("v1", "onboarding_started", { storage_ok: false })]);
  check("eventos sin almacenamiento local contados", r.storageFailedEvents === 1);
}

// Rango en hora Argentina
{
  const now = Date.parse("2026-09-26T02:30:00Z"); // 25/09 23:30 en Argentina
  check("inicio del día AR", startOfArgentinaDay(now) === Date.parse("2026-09-25T03:00:00Z"));
  const today = resolveFunnelRange("today", { now });
  check("Hoy empieza a las 00:00 AR", today.from === Date.parse("2026-09-25T03:00:00Z"));
  const week = resolveFunnelRange("7d", { now });
  check("7 días = hoy + 6 anteriores", week.from === Date.parse("2026-09-19T03:00:00Z"));
  const custom = resolveFunnelRange("custom", { fromDate: "2026-09-01", toDate: "2026-09-02", now });
  check("fechas incluyen el día final completo", custom.from === Date.parse("2026-09-01T03:00:00Z") && custom.to === Date.parse("2026-09-03T03:00:00Z"));
}

console.log(failed ? `\n${failed} FAIL` : "\nCálculo del embudo aprobado.");
process.exit(failed ? 1 : 0);
