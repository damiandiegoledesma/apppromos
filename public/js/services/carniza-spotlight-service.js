// carniza-spotlight-service.js
// Fuente única de verdad para el "bloque fuerte" de cada pantalla: un solo
// acento rojo por pantalla, acompañado de la pose de Carniza que corresponde
// a la acción principal de esa pantalla.
//
// Para sumar o cambiar una pantalla: se edita SOLO la tabla CARNIZA_SCREENS.
// El HTML/CSS del bloque vive una sola vez acá (renderCarnizaSpotlight) en
// vez de repetirse en cada módulo.

export const CARNIZA_SCREENS = Object.freeze({
  dashboardPanel: {
    pose: "assets/characters/carniza/onboarding/carniza-onboarding-compartir.webp",
    alt: "Carniza mostrando el QR de tu carnicería",
    heading: "Compartí tu carnicería online",
    copy: "Mandale a tus clientes el link o el QR de tu vidriera por WhatsApp."
  },
  pricesPanel: {
    pose: "assets/characters/carniza/onboarding/carniza-onboarding-precios.webp",
    alt: "Carniza señalando la lista de precios",
    heading: "Mantené tus precios al día",
    copy: "Un precio actualizado es una venta que no se pierde."
  },
  builderPanel: {
    pose: "assets/characters/carniza/onboarding/carniza-onboarding-publicar.webp",
    alt: "Carniza con el cartel de publicar",
    heading: "Vendé como lo necesites",
    copy: "Respondé una consulta, armá una promo o sacá una oferta del día en minutos."
  },
  webPanel: {
    pose: "assets/characters/carniza/onboarding/carniza-onboarding-online.webp",
    alt: "Carniza mostrando tu carnicería online en una tablet",
    heading: "Así ve tu carnicería un cliente",
    copy: "Revisá que el logo, la foto y los datos estén al día."
  },
  savedPanel: {
    pose: "assets/characters/carniza/spotlight/carniza-spotlight-saved.webp",
    alt: "Carniza mostrando su cuaderno de promos guardadas",
    heading: "Repetí lo que ya funciona",
    copy: "Reutilizá tus promos guardadas en vez de armarlas de nuevo cada vez."
  },
  marketPanel: {
    pose: "assets/characters/carniza/spotlight/carniza-spotlight-market.webp",
    alt: "Carniza mostrando una comparación de precios contra el mercado",
    heading: "Mirá cómo estás parado",
    copy: "Comparate con el mercado y ajustá tus precios con criterio."
  },
  printPanel: {
    pose: "assets/characters/carniza/spotlight/carniza-spotlight-print.webp",
    alt: "Carniza con la impresora y la lista de precios",
    heading: "Imprimí lo que necesites",
    copy: "Listas de precios, carteles, QR, folletos y comandas, todo listo para el mostrador."
  },
  whatsappPanel: {
    pose: "assets/characters/carniza/spotlight/carniza-spotlight-whatsapp.webp",
    alt: "Carniza mostrando un chat de WhatsApp con promos",
    heading: "Mandá tus promos por WhatsApp",
    copy: "Compartí lo que tenés hoy directo con tus clientes."
  }
});

export function getCarnizaScreen(panelKey) {
  return CARNIZA_SCREENS[panelKey] || null;
}

// Estilos del bloque — inclutir UNA vez en el <style> del módulo que lo usa
// (concatenar CARNIZA_SPOTLIGHT_STYLES al resto del bloque de estilos).
export const CARNIZA_SPOTLIGHT_STYLES = `
  .cz-spotlight { width:100%; border-radius:20px; padding:26px 22px 22px; background:#E52223; display:flex; align-items:center; gap:24px; }
  .cz-spotlight-copy { flex:1 1 auto; display:flex; flex-direction:column; gap:8px; min-width:0; }
  .cz-spotlight-copy h2 { margin:0; font-size:24px; line-height:1.08; color:#fff; font-weight:800; }
  .cz-spotlight-copy p { margin:0; font-size:14px; line-height:1.4; color:#fff; opacity:.92; }
  .cz-spotlight-actions { display:flex; flex-direction:column; gap:10px; align-items:flex-start; margin-top:4px; }
  .cz-spotlight-actions:empty { display:none; }
  .cz-spotlight-cta { height:50px; padding:0 24px; border-radius:999px; border:0; background:#fff; color:#E52223; font-weight:700; font-size:14.5px; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; white-space:nowrap; }
  .cz-spotlight-cta:disabled { opacity:.55; cursor:not-allowed; }
  .cz-spotlight-link { background:none; border:0; padding:0; color:#fff; text-decoration:underline; font-size:13px; font-weight:700; cursor:pointer; }
  .cz-spotlight-link:disabled { opacity:.55; cursor:not-allowed; text-decoration:none; }
  .cz-spotlight-avatar { width:104px; height:auto; flex-shrink:0; }
  @media (max-width: 640px) {
    .cz-spotlight { flex-direction:column; align-items:stretch; padding:22px 18px 18px; gap:14px; text-align:left; }
    .cz-spotlight-avatar { width:88px; align-self:flex-end; order:-1; margin-bottom:-18px; }
  }

  /* Variante compacta: para pantallas de trabajo/listado donde la acción
     principal no es el bloque en sí, sino lo que sigue debajo (ej. Precios). */
  .cz-spotlight--compact { padding:16px 18px 16px; border-radius:16px; gap:14px; }
  .cz-spotlight--compact .cz-spotlight-copy { gap:4px; }
  .cz-spotlight--compact .cz-spotlight-copy h2 { font-size:18px; }
  .cz-spotlight--compact .cz-spotlight-copy p { font-size:12.5px; }
  .cz-spotlight--compact .cz-spotlight-avatar { width:64px; }
  @media (max-width: 640px) {
    .cz-spotlight--compact { flex-direction:row; align-items:center; padding:14px 16px; gap:12px; }
    .cz-spotlight--compact .cz-spotlight-avatar { width:56px; order:0; margin-bottom:0; align-self:center; }
  }
`;

/**
 * Arma el HTML del bloque fuerte para una pantalla.
 * @param {string} panelKey - clave del panel (ver CARNIZA_SCREENS)
 * @param {object} opts
 * @param {string} opts.actionsHtml - HTML de los botones/links de acción (usar cz-spotlight-cta / cz-spotlight-link)
 * @param {string} [opts.heading] - pisa el heading por defecto de la tabla
 * @param {string} [opts.copy] - pisa el copy por defecto de la tabla
 */
export function renderCarnizaSpotlight(panelKey, opts = {}) {
  const screen = getCarnizaScreen(panelKey);
  if (!screen) return "";
  const heading = opts.heading || screen.heading;
  const copy = opts.copy || screen.copy;
  const sectionClass = opts.compact ? "cz-spotlight cz-spotlight--compact" : "cz-spotlight";
  return `
    <section class="${sectionClass}" data-carniza-spotlight="${panelKey}">
      <div class="cz-spotlight-copy">
        <h2>${heading}</h2>
        <p>${copy}</p>
        <div class="cz-spotlight-actions">${opts.actionsHtml || ""}</div>
      </div>
      <img class="cz-spotlight-avatar" src="${screen.pose}" alt="${screen.alt}" loading="lazy" />
    </section>
  `;
}
