export const STOREFRONT_THEMES = Object.freeze([
  {
    id: "directo_al_grano",
    label: "Directo al grano",
    caption: "Rápido",
    description: "Todo el catálogo a la vista, sin vueltas.",
    colors: ["#FFFCFB", "#E52223", "#0A2E5B"]
  },
  {
    id: "oferta_primero",
    label: "Oferta primero",
    caption: "Comercial",
    description: "La promo del día abre la vidriera.",
    colors: ["#0A2E5B", "#E52223", "#FFFCFB"]
  },
  {
    id: "catalogo_vidriera",
    label: "Catálogo tipo vidriera",
    caption: "Prolijo",
    description: "Cortes bien presentados, como en el mostrador.",
    colors: ["#FFFCFB", "#0A2E5B", "#E52223"]
  },
  {
    id: "combos_pedido_directo",
    label: "Combos + pedido directo",
    caption: "Práctico",
    description: "Combos armados para pedir en un toque.",
    colors: ["#E52223", "#0A2E5B", "#FFFCFB"]
  }
]);

const THEME_IDS = new Set(STOREFRONT_THEMES.map((theme) => theme.id));

export function normalizeStorefrontTheme(value = "directo_al_grano") {
  const clean = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  return THEME_IDS.has(clean) ? clean : "directo_al_grano";
}

export function getStorefrontTheme(value = "directo_al_grano") {
  const id = normalizeStorefrontTheme(value);
  return STOREFRONT_THEMES.find((theme) => theme.id === id) || STOREFRONT_THEMES[0];
}

// Mini-esquema visual de cada layout (no una foto real): muestra la
// ESTRUCTURA de la página (grilla / banner+lista / fotos con caption /
// tarjetas apiladas), no una carnicería de ejemplo. A diferencia de una
// captura de pantalla, nunca queda desactualizado cuando cambian fotos
// o productos reales - y la vista previa en vivo (el iframe que ya existe
// al elegir un estilo) sigue siendo la forma de ver el resultado real.
export function renderThemeSchematicHtml(value = "directo_al_grano") {
  const id = normalizeStorefrontTheme(value);
  const cardCell = () => `<div style="display:flex;flex-direction:column;gap:2px;"><div style="flex:1;background:#FFF1F0;border-radius:3px 3px 0 0;"></div><div style="height:3px;background:#cbd5e1;border-radius:2px;width:75%;"></div><div style="height:3px;background:#E52223;border-radius:2px;width:45%;"></div></div>`;
  const tileCell = () => `<div style="position:relative;background:#FFF1F0;border-radius:4px;overflow:hidden;"><div style="position:absolute;left:0;right:0;bottom:0;height:8px;background:#0A2E5B;opacity:.85;"></div></div>`;
  const comboRow = () => `<div style="flex:1;display:flex;flex-direction:column;gap:2px;"><div style="flex:1;background:#FFF1F0;border-radius:4px 4px 0 0;"></div><div style="height:6px;background:#22c55e;border-radius:0 0 4px 4px;"></div></div>`;
  if (id === "oferta_primero") {
    return `<div style="height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:3px;padding:4px;">
      <div style="height:46%;background:#0A2E5B;border-radius:5px;position:relative;overflow:hidden;flex:0 0 auto;">
        <div style="position:absolute;left:5px;top:5px;width:20px;height:4px;background:#FFB4B4;border-radius:2px;"></div>
        <div style="position:absolute;left:5px;bottom:5px;width:26px;height:5px;background:#22c55e;border-radius:2px;"></div>
      </div>
      <div style="height:4px;background:#e2e8f0;border-radius:2px;width:88%;"></div>
      <div style="height:4px;background:#e2e8f0;border-radius:2px;width:88%;"></div>
      <div style="height:4px;background:#e2e8f0;border-radius:2px;width:55%;"></div>
    </div>`;
  }
  if (id === "catalogo_vidriera") {
    return `<div style="height:100%;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;">${tileCell()}${tileCell()}${tileCell()}${tileCell()}</div>`;
  }
  if (id === "combos_pedido_directo") {
    return `<div style="height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:5px;padding:4px;">${comboRow()}${comboRow()}</div>`;
  }
  return `<div style="height:100%;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;">${cardCell()}${cardCell()}${cardCell()}${cardCell()}</div>`;
}
