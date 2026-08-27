export const DEFAULT_VERTICAL_ID = "carniceria";

export const VERTICAL_CONFIGS = {
  carniceria: {
    verticalId: "carniceria",
    label: "Carnicería",
    businessLabel: "carnicería",
    businessPluralLabel: "carnicerías",
    productLabel: "corte",
    productPluralLabel: "cortes",
    categoryLabel: "rubro",
    categoryPluralLabel: "rubros",
    defaultUnit: "kg",
    allowedUnits: ["kg", "unidad"],
    categories: ["Novillo", "Cerdo", "Pollo", "Achuras", "Elaborados"],
    demo: {
      businessName: "Carnicería de Carniza",
      description: "Demo principal de AppPromos para carnicerías."
    },
    urgentMode: {
      label: "Promo del día",
      internalCopy: "Mover mercadería, vender hoy y sacar stock sin perder tiempo.",
      externalCopy: "Oferta del día, promo especial o combo de hoy.",
      internalRule: "Internamente: urgencia.",
      externalRule: "Externamente: oportunidad."
    },
    web: {
      publicBusinessLabel: "carnicería",
      priceListTitle: "Lista de precios",
      offersTitle: "Ofertas de hoy",
      emptyPricesCopy: "Esta carnicería está preparando su lista de precios.",
      emptyOffersCopy: "Consultá por WhatsApp las promos disponibles."
    },
    whatsapp: {
      offerTitle: "OFERTA DEL DÍA",
      stockLimitCopy: "Hasta agotar stock.",
      avoidWords: ["liquidación", "producto atrasado", "descarte"]
    },
    carniza: {
      role: "vendedor comercial para carnicerías",
      defaultPrompt: "¿Qué querés vender hoy?",
      quickOfferLabel: "Armar oferta",
      urgentOfferLabel: "Promo del día"
    }
  }
};

function capitalizeFirst(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pickLabel(singular = "", plural = "", options = {}) {
  const label = options.plural ? (plural || singular) : singular;
  return options.capitalize ? capitalizeFirst(label) : label;
}

export function getVerticalConfig(verticalId = DEFAULT_VERTICAL_ID) {
  return VERTICAL_CONFIGS[verticalId] || VERTICAL_CONFIGS[DEFAULT_VERTICAL_ID];
}

export function getDefaultVerticalConfig() {
  return getVerticalConfig(DEFAULT_VERTICAL_ID);
}

export function getVerticalLabel(verticalId = DEFAULT_VERTICAL_ID) {
  return getVerticalConfig(verticalId).label;
}

export function getBusinessLabel(verticalId = DEFAULT_VERTICAL_ID, options = {}) {
  const config = getVerticalConfig(verticalId);
  return pickLabel(config.businessLabel, config.businessPluralLabel, options);
}

export function getProductLabel(verticalId = DEFAULT_VERTICAL_ID, options = {}) {
  const config = getVerticalConfig(verticalId);
  return pickLabel(config.productLabel, config.productPluralLabel, options);
}

export function getCategoryLabel(verticalId = DEFAULT_VERTICAL_ID, options = {}) {
  const config = getVerticalConfig(verticalId);
  return pickLabel(config.categoryLabel, config.categoryPluralLabel, options);
}

export function getDefaultUnit(verticalId = DEFAULT_VERTICAL_ID) {
  return getVerticalConfig(verticalId).defaultUnit || "kg";
}

export function getAllowedUnits(verticalId = DEFAULT_VERTICAL_ID) {
  const units = getVerticalConfig(verticalId).allowedUnits;
  return Array.isArray(units) ? [...units] : [];
}

export function getVerticalCategories(verticalId = DEFAULT_VERTICAL_ID) {
  const categories = getVerticalConfig(verticalId).categories;
  return Array.isArray(categories) ? [...categories] : [];
}

export function getVerticalDemoCopy(verticalId = DEFAULT_VERTICAL_ID) {
  return { ...(getVerticalConfig(verticalId).demo || {}) };
}

export function getVerticalUrgentModeCopy(verticalId = DEFAULT_VERTICAL_ID) {
  return { ...(getVerticalConfig(verticalId).urgentMode || {}) };
}

export function getVerticalWhatsappCopy(verticalId = DEFAULT_VERTICAL_ID) {
  return { ...(getVerticalConfig(verticalId).whatsapp || {}) };
}

export function getVerticalWebCopy(verticalId = DEFAULT_VERTICAL_ID) {
  return { ...(getVerticalConfig(verticalId).web || {}) };
}

export function getCarnizaVerticalCopy(verticalId = DEFAULT_VERTICAL_ID) {
  return { ...(getVerticalConfig(verticalId).carniza || {}) };
}
