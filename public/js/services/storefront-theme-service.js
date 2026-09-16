export const STOREFRONT_THEMES = Object.freeze([
  {
    id: "standard",
    label: "Estándar AppPromos",
    caption: "Actual",
    description: "Claro, directo y familiar.",
    colors: ["#7f1d1d", "#b63b2b", "#22c55e"]
  },
  {
    id: "minimal_light",
    label: "Minimal claro",
    caption: "Sereno",
    description: "Limpio y sobrio para que manden los precios.",
    colors: ["#ffffff", "#1f2937", "#287957"]
  },
  {
    id: "minimal_dark",
    label: "Minimal oscuro",
    caption: "Premium",
    description: "Oscuro, elegante y de alto contraste.",
    colors: ["#17191b", "#e7dfcc", "#d3a94c"]
  },
  {
    id: "butcher_red",
    label: "Rojo carnicero",
    caption: "De barrio",
    description: "Cálido, cercano y bien carnicero.",
    colors: ["#b82020", "#e45332", "#2b8b56"]
  },
  {
    id: "offer",
    label: "Oferta",
    caption: "Comercial",
    description: "Más energía para destacar promociones.",
    colors: ["#ffe600", "#2f74c0", "#198754"]
  }
]);

const THEME_IDS = new Set(STOREFRONT_THEMES.map((theme) => theme.id));

export function normalizeStorefrontTheme(value = "standard") {
  const clean = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  return THEME_IDS.has(clean) ? clean : "standard";
}

export function getStorefrontTheme(value = "standard") {
  const id = normalizeStorefrontTheme(value);
  return STOREFRONT_THEMES.find((theme) => theme.id === id) || STOREFRONT_THEMES[0];
}
