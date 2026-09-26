// Carnis.app — Tracking Comercial V1: cálculo del embudo para el Centro de Control.
// Funciones puras (sin Firebase) para poder probarlas en Node.

export const FUNNEL_STEPS = Object.freeze([
  { key: "landing_view", label: "Vio la landing" },
  { key: "cta_create_clicked", label: "Tocó Crear" },
  { key: "onboarding_started", label: "Empezó el onboarding" },
  { key: "rubros_completed", label: "Eligió rubros" },
  { key: "prices_started", label: "Empezó precios" },
  { key: "prices_completed", label: "Completó precios" },
  { key: "name_completed", label: "Puso nombre y localidad" },
  { key: "storefront_previewed", label: "Vio la vista previa" },
  { key: "signup_started", label: "Empezó el registro" },
  { key: "account_created", label: "Cuenta creada" },
  { key: "business_created", label: "Carnicería creada" },
  { key: "share_whatsapp_clicked", label: "Tocó Compartir" }
]);

export const NO_ATTRIBUTION = "__none__";
const DIRECT_SOURCE = "(direct)";
const MIN_VISITORS_FOR_DROP = 5;
const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina: UTC-3 todo el año

/** Inicio del día (hora Argentina) de un instante, en ms UTC. */
export function startOfArgentinaDay(ms) {
  const local = ms - AR_OFFSET_MS;
  const dayStartLocal = Math.floor(local / 86400000) * 86400000;
  return dayStartLocal + AR_OFFSET_MS;
}

/** Rango [from, to) para "today" | "7d" | "30d" o fechas "YYYY-MM-DD" (hora Argentina). */
export function resolveFunnelRange(period = "30d", { fromDate = "", toDate = "", now = Date.now() } = {}) {
  const today = startOfArgentinaDay(now);
  if (period === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    const from = Date.parse(`${fromDate}T00:00:00-03:00`);
    const to = Date.parse(`${toDate}T00:00:00-03:00`) + 86400000;
    if (Number.isFinite(from) && Number.isFinite(to) && to > from) return { from, to };
  }
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
  return { from: today - (days - 1) * 86400000, to: now + 1 };
}

function touchKey(touch) {
  if (!touch || !touch.source || touch.source === DIRECT_SOURCE) return { campaign: NO_ATTRIBUTION, content: NO_ATTRIBUTION };
  return {
    campaign: touch.campaign || NO_ATTRIBUTION,
    content: touch.content || NO_ATTRIBUTION
  };
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

/**
 * @param {Array} events   docs de funnelEvents con occurred_ms (número)
 * @param {object} options includeInternal, attribution ("last"|"first"), campaign, content
 */
export function computeFunnel(events = [], options = {}) {
  const includeInternal = Boolean(options.includeInternal);
  const attribution = options.attribution === "first" ? "first" : "last";
  const campaignFilter = String(options.campaign || "");
  const contentFilter = String(options.content || "");

  const considered = events.filter((event) => event && event.visitor_id && (includeInternal || event.is_internal !== true));
  const internalExcluded = events.length - considered.length;

  const visitors = new Map();
  considered.forEach((event) => {
    if (!visitors.has(event.visitor_id)) visitors.set(event.visitor_id, []);
    visitors.get(event.visitor_id).push(event);
  });

  const campaigns = new Map();
  const perVisitor = [];

  visitors.forEach((list, visitorId) => {
    list.sort((a, b) => Number(a.occurred_ms || 0) - Number(b.occurred_ms || 0));
    const touch = attribution === "first" ? list[0].first_touch : list[list.length - 1].last_touch;
    const key = touchKey(touch);
    const campaignEntry = campaigns.get(key.campaign) || { campaign: key.campaign, contents: new Set(), visitors: 0 };
    campaignEntry.contents.add(key.content);
    campaignEntry.visitors += 1;
    campaigns.set(key.campaign, campaignEntry);
    perVisitor.push({ visitorId, key, names: new Set(list.map((event) => event.event_name)) });
  });

  const filtered = perVisitor.filter((visitor) =>
    (!campaignFilter || visitor.key.campaign === campaignFilter)
    && (!contentFilter || visitor.key.content === contentFilter)
  );

  const counts = FUNNEL_STEPS.map((step) => filtered.filter((visitor) => visitor.names.has(step.key)).length);
  const startIndex = counts.findIndex((count) => count > 0);
  const startCount = startIndex >= 0 ? counts[startIndex] : 0;

  const steps = FUNNEL_STEPS.map((step, index) => ({
    ...step,
    visitors: counts[index],
    fromPrevious: index === 0 ? null : ratio(counts[index], counts[index - 1]),
    fromStart: startIndex >= 0 && index >= startIndex ? ratio(counts[index], startCount) : null
  }));

  let biggestDrop = null;
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1].visitors;
    if (previous < MIN_VISITORS_FOR_DROP) continue;
    const conversion = steps[index].fromPrevious;
    if (conversion === null) continue;
    if (!biggestDrop || conversion < biggestDrop.conversion) {
      biggestDrop = { from: steps[index - 1], to: steps[index], conversion, lost: previous - steps[index].visitors };
    }
  }

  const count = (key) => steps.find((step) => step.key === key)?.visitors || 0;
  const directOnboardingEntries = filtered.filter((visitor) =>
    visitor.names.has("onboarding_started") && !visitor.names.has("landing_view")
  ).length;

  const consideredVisitorIds = new Set(filtered.map((visitor) => visitor.visitorId));
  const storageFailedEvents = considered.filter((event) =>
    consideredVisitorIds.has(event.visitor_id) && event.storage_ok === false
  ).length;

  return {
    steps,
    visitors: filtered.length,
    totalFromLanding: ratio(count("business_created"), count("landing_view")),
    totalFromOnboarding: ratio(count("business_created"), count("onboarding_started")),
    biggestDrop,
    directOnboardingEntries,
    storageFailedEvents,
    internalExcluded,
    campaigns: Array.from(campaigns.values())
      .map((entry) => ({ campaign: entry.campaign, contents: Array.from(entry.contents).sort(), visitors: entry.visitors }))
      .sort((a, b) => b.visitors - a.visitors)
  };
}
