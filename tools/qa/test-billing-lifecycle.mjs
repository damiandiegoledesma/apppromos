import assert from "node:assert/strict";
import {
  TRIAL_DAYS,
  createTrialEndsAt,
  getAccessState,
  getTrialStage
} from "../../public/js/services/access-control-service.js";

const isoDaysFromNow = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

assert.equal(TRIAL_DAYS, 14, "la prueba estándar debe durar 14 días");
const trialEnd = new Date(createTrialEndsAt());
const trialDuration = (trialEnd.getTime() - Date.now()) / 86400000;
assert.ok(trialDuration > 13.9 && trialDuration <= 14.1, "el alta debe crear 14 días reales");

const paidWithLegacyTrialStatus = getAccessState({
  status: "trial",
  billing: { plan: "basic", status: "active", nextPaymentDueAt: isoDaysFromNow(20) }
});
assert.equal(paidWithLegacyTrialStatus.commercialKey, "active", "un plan pago no debe seguir tratado como prueba");
assert.equal(paidWithLegacyTrialStatus.canEdit, true);

const expiredTrial = getAccessState({
  status: "trial",
  billing: { plan: "trial", status: "active", trialEndsAt: isoDaysFromNow(-1) }
});
assert.equal(expiredTrial.commercialKey, "trial_expired");
assert.equal(expiredTrial.canEnterApp, true);
assert.equal(expiredTrial.canEdit, false);
assert.equal(getTrialStage({ plan: "trial", trialEndsAt: isoDaysFromNow(-1) }), "expired");
assert.equal(getTrialStage({ plan: "trial", trialEndsAt: isoDaysFromNow(7) }), "midpoint");
assert.equal(getTrialStage({ plan: "trial", trialEndsAt: isoDaysFromNow(4) }), "conversion");
assert.equal(getTrialStage({ plan: "trial", trialEndsAt: isoDaysFromNow(1) }), "last_day");

const grace = getAccessState({
  status: "active",
  billing: { plan: "basic", status: "pending", nextPaymentDueAt: isoDaysFromNow(-2) }
});
assert.equal(grace.commercialKey, "payment_grace");
assert.equal(grace.canEdit, true, "durante la gracia debe poder seguir trabajando");

const overdue = getAccessState({
  status: "active",
  billing: { plan: "basic", status: "pending", nextPaymentDueAt: isoDaysFromNow(-5) }
});
assert.equal(overdue.commercialKey, "payment_overdue");
assert.equal(overdue.canEdit, false, "desde el día 6 operativo deben pausarse los guardados");

const suspended = getAccessState({
  status: "active",
  billing: { plan: "basic", status: "pending", nextPaymentDueAt: isoDaysFromNow(-6) }
});
assert.equal(suspended.commercialKey, "payment_suspended");
assert.equal(suspended.canUseModules, false);

const bonus = getAccessState({
  status: "active",
  billing: { plan: "basic", status: "manual", nextPaymentDueAt: isoDaysFromNow(-30) }
});
assert.equal(bonus.commercialKey, "active", "una cuenta bonificada no debe pausarse por una fecha vieja");
assert.equal(bonus.canEdit, true);

console.log("OK V12.29-A2: ciclo trial, gracia, mora, pausa y plan pago.");
