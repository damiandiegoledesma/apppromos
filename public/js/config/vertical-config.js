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
      label: "Vender urgente",
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
      urgentOfferLabel: "Vender urgente"
    }
  }
};

export function getVerticalConfig(verticalId = DEFAULT_VERTICAL_ID) {
  return VERTICAL_CONFIGS[verticalId] || VERTICAL_CONFIGS[DEFAULT_VERTICAL_ID];
}

export function getDefaultVerticalConfig() {
  return getVerticalConfig(DEFAULT_VERTICAL_ID);
}
