const NOVILLO_ASSET_BASE = "/assets/cortes/novillo";
const CERDO_ASSET_BASE = "/assets/cortes/cerdo";
const POLLO_ASSET_BASE = "/assets/cortes/pollo";
const OTROS_ASSET_BASE = "/assets/cortes/otros";
const ELABORADOS_ASSET_BASE = "/assets/cortes/elaborados";
const COSTILLARES_ASSET_BASE = "/assets/cortes/costillares";
const MENUDENCIAS_ASSET_BASE = "/assets/cortes/menudencias";
const SUBPRODUCTOS_ASSET_BASE = "/assets/cortes/subproductos";

const NOVILLO_IMAGES_BY_ID = Object.freeze({
  novillo_aguja_comun: "aguja-comun",
  novillo_aguja_especial: "aguja-especial",
  novillo_asado_banderita: "banderita",
  novillo_asado_costilla: "costilla",
  novillo_asado_del_medio: "costilla",
  novillo_azotillo: "azotillo",
  novillo_bola_de_lomo: "bola-lomo",
  novillo_chingolito: "chingolito",
  novillo_colita_de_cuadril: "colita-cuadril",
  novillo_corte_mar_del_plata: "corte-mardelplata",
  novillo_costeletas: "costeleta",
  novillo_cuadrada: "cuadrada",
  novillo_cuadril: "cuadril",
  novillo_entrana: "entraña",
  novillo_entrecote: "entrecote",
  novillo_falda: "falda",
  novillo_falda_deshuesada: "cima",
  novillo_lomo: "lomo",
  novillo_marucha: "marucha",
  novillo_matambre: "matambre",
  novillo_milanesas_de_ternera: "milanesas",
  novillo_nalga: "nalga",
  novillo_osobuco: "osobuco",
  novillo_paleta: "paleta",
  novillo_palomita: "palomita",
  novillo_peceto: "peceto",
  novillo_puchero: "puchero",
  novillo_roast_beef: "roastbeef",
  novillo_tapa_de_asado: "tapa-asado",
  novillo_tapa_de_nalga: "tapa-nalga",
  novillo_tortuguita: "tortuguita",
  novillo_vacio: "vacio",
  novillo_vuelo_de_marucha: "vuelo-marucha"
});

const NOVILLO_IMAGES_BY_NAME = Object.freeze({
  "aguja comun": "aguja-comun",
  "aguja especial": "aguja-especial",
  americano: "americano",
  "asado banderita": "banderita",
  "asado costilla": "costilla",
  "asado del medio": "costilla",
  azotillo: "azotillo",
  "bife ancho": "bife-ancho",
  "bife angosto": "bife-angosto",
  "bola de lomo": "bola-lomo",
  chingolito: "chingolito",
  cima: "cima",
  "colita de cuadril": "colita-cuadril",
  "corte mar del plata": "corte-mardelplata",
  costeleta: "costeleta",
  costeletas: "costeleta",
  costilla: "costilla",
  cuadrada: "cuadrada",
  cuadril: "cuadril",
  entrana: "entraña",
  entrecote: "entrecote",
  falda: "falda",
  "falda deshuesada": "cima",
  lomo: "lomo",
  marucha: "marucha",
  matambre: "matambre",
  "milanesas de ternera": "milanesas",
  nalga: "nalga",
  osobuco: "osobuco",
  paleta: "paleta",
  palomita: "palomita",
  peceto: "peceto",
  puchero: "puchero",
  "roast beef": "roastbeef",
  roastbeef: "roastbeef",
  "tapa de asado": "tapa-asado",
  "tapa de nalga": "tapa-nalga",
  tortuguita: "tortuguita",
  vacio: "vacio",
  "vuelo de marucha": "vuelo-marucha"
});

const CERDO_IMAGES_BY_ID = Object.freeze({
  cerdo_bife_tocino: "bife-tocino",
  cerdo_bondiola: "bondiola",
  cerdo_costeletas: "costeletas",
  cerdo_huesitos: "huesitos",
  cerdo_marucha: "marucha",
  cerdo_matambre: "matambre",
  cerdo_osobuco: "osobuco",
  cerdo_patitas: "patitas",
  cerdo_pechito: "pechito",
  cerdo_pulpas: "pulpas",
  cerdo_rueda: "rueda",
  cerdo_solomillo: "solomillo",
  cerdo_tapita: "tapita",
  cerdo_vacio: "vacio",
  elaborados_chorizos: "chorizos",
  elaborados_milanesa_cerdo: "milanesa",
  elaborados_morcilla: "morcilla"
});

const CERDO_IMAGES_BY_NAME = Object.freeze({
  "bife tocino": "bife-tocino",
  bondiola: "bondiola",
  costeleta: "costeletas",
  costeletas: "costeletas",
  huesitos: "huesitos",
  marucha: "marucha",
  matambre: "matambre",
  osobuco: "osobuco",
  patitas: "patitas",
  pechito: "pechito",
  pulpa: "pulpas",
  pulpas: "pulpas",
  rueda: "rueda",
  solomillo: "solomillo",
  tapita: "tapita",
  vacio: "vacio"
});

const ELABORADOS_CERDO_IMAGES_BY_NAME = Object.freeze({
  chorizo: "chorizos",
  chorizos: "chorizos",
  "milanesa cerdo": "milanesa",
  "milanesas de cerdo": "milanesa",
  morcilla: "morcilla",
  morcillas: "morcilla"
});

const POLLO_IMAGES_BY_ID = Object.freeze({
  elaborados_milanesa_pollo: "milanesa-pechuga",
  pollo_alitas: "alitas",
  pollo_carcazas: "carcazas",
  pollo_filet_de_pechuga: "pechuga",
  pollo_menudos: "menudos",
  pollo_milanesas_de_pechuga: "milanesa-pechuga",
  pollo_pata_muslo_x_3_kgs: "pata-muslo",
  pollo_pata_y_muslo: "pata-muslo",
  pollo_pechuga_con_hueso: "pechuga-con-hueso",
  pollo_pollo_entero_congelado: "pollo-entero",
  pollo_pollo_entero_descongelado: "pollo-entero"
});

const POLLO_IMAGES_BY_NAME = Object.freeze({
  alitas: "alitas",
  carcaza: "carcazas",
  carcazas: "carcazas",
  "filet de pechuga": "pechuga",
  menudos: "menudos",
  "milanesa de pechuga": "milanesa-pechuga",
  "milanesas de pechuga": "milanesa-pechuga",
  "pata muslo": "pata-muslo",
  "pata muslo x 3 kgs": "pata-muslo",
  "pata y muslo": "pata-muslo",
  "pechuga con hueso": "pechuga-con-hueso",
  "pollo entero": "pollo-entero",
  "pollo entero congelado": "pollo-entero",
  "pollo entero descongelado": "pollo-entero"
});

const ELABORADOS_POLLO_IMAGES_BY_NAME = Object.freeze({
  "milanesa pollo": "milanesa-pechuga",
  "milanesas de pollo": "milanesa-pechuga"
});

const OTROS_IMAGES_BY_ID = Object.freeze({
  otros_carbon_x_3: "carbon",
  otros_carbon_x_5: "carbon",
  otros_lena: "lena"
});

const OTROS_IMAGES_BY_NAME = Object.freeze({
  carbon: "carbon",
  "carbon x 3": "carbon",
  "carbon x 3 kg": "carbon",
  "carbon x 3 kgs": "carbon",
  "carbon x 5": "carbon",
  "carbon x 5 kg": "carbon",
  "carbon x 5 kgs": "carbon",
  lena: "lena"
});

const ELABORADOS_IMAGES_BY_ID = Object.freeze({
  elaborados_carre_de_cerdo_arrollado: "carre-cerdo-arrollado",
  elaborados_hamburguesa_cerdo_unidad: "hamburguesa-cerdo",
  elaborados_hamburguesa_vaca_unidad: "hamburguesa-vaca",
  elaborados_matambre_arrollado: "matambre-arrollado",
  elaborados_milanesa_ternera: "milanesa-ternera",
  elaborados_picada_comun: "picada-comun",
  elaborados_picada_especial: "picada-especial",
  elaborados_pollo_arrollado: "pollo-arrollado",
  elaborados_salchicha_parrillera: "salchicha-parrillera"
});

const ELABORADOS_IMAGES_BY_NAME = Object.freeze({
  "carre de cerdo arrollado": "carre-cerdo-arrollado",
  "hamburguesa cerdo": "hamburguesa-cerdo",
  "hamburguesa cerdo unidad": "hamburguesa-cerdo",
  "hamburguesa vaca": "hamburguesa-vaca",
  "hamburguesa vaca unidad": "hamburguesa-vaca",
  "matambre arrollado": "matambre-arrollado",
  "milanesa ternera": "milanesa-ternera",
  "milanesas de ternera": "milanesa-ternera",
  "picada comun": "picada-comun",
  "picada especial": "picada-especial",
  "pollo arrollado": "pollo-arrollado",
  "salchicha parrillera": "salchicha-parrillera"
});

const COSTILLARES_IMAGES_BY_ID = Object.freeze({
  costillares_costillar_cerdo: "costillar-cerdo",
  costillares_costillar_exportacion: "costillar-novillo",
  costillares_costillar_novillo_b: "costillar-novillo",
  costillares_costillar_ternera_a: "costillar-novillo"
});

const COSTILLARES_IMAGES_BY_NAME = Object.freeze({
  "costillar cerdo": "costillar-cerdo",
  "costillar de cerdo": "costillar-cerdo",
  "costillar exportacion": "costillar-novillo",
  "costillar novillo": "costillar-novillo",
  "costillar novillo b": "costillar-novillo",
  "costillar ternera": "costillar-novillo",
  "costillar ternera a": "costillar-novillo"
});

const MENUDENCIAS_IMAGES_BY_ID = Object.freeze({
  menudencias_chinchulin: "chinchulin",
  menudencias_molleja: "molleja",
  menudencias_rinon: "rinon",
  menudencias_seso_unidad: "seso",
  menudencias_tripa_gorda: "tripa-gorda"
});

const MENUDENCIAS_IMAGES_BY_NAME = Object.freeze({
  chinchulin: "chinchulin",
  molleja: "molleja",
  rinon: "rinon",
  seso: "seso",
  "seso unidad": "seso",
  "tripa gorda": "tripa-gorda"
});

const SUBPRODUCTOS_REUSED_IMAGES_BY_ID = Object.freeze({
  subproductos_carcazas_pollo: `${POLLO_ASSET_BASE}/carcazas.webp`,
  subproductos_huesitos_cerdo: `${CERDO_ASSET_BASE}/huesitos.webp`,
  subproductos_menudos_pollo: `${POLLO_ASSET_BASE}/menudos.webp`
});

const SUBPRODUCTOS_IMAGES_BY_ID = Object.freeze({
  subproductos_cabeza_cerdo: "cabeza-cerdo",
  subproductos_grasa: "grasa",
  subproductos_huesitos_vaca: "huesitos-vaca"
});

const SUBPRODUCTOS_IMAGES_BY_NAME = Object.freeze({
  "cabeza cerdo": "cabeza-cerdo",
  "cabeza de cerdo": "cabeza-cerdo",
  grasa: "grasa",
  "huesitos vaca": "huesitos-vaca",
  "huesitos de vaca": "huesitos-vaca",
  "huesos vaca": "huesitos-vaca",
  "huesos de vaca": "huesitos-vaca"
});

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function getProductThumbnailPath(product = {}) {
  const rubro = normalizeText(product.rubro || product.category || product.categoria || "");
  const productId = String(product.id || product.productKey || product.key || "").trim();
  const name = normalizeText(product.nombre || product.name || product.label || "");
  const novilloSlug = NOVILLO_IMAGES_BY_ID[productId] || (rubro === "novillo" ? NOVILLO_IMAGES_BY_NAME[name] : null);
  if (novilloSlug) return `${NOVILLO_ASSET_BASE}/${novilloSlug}.webp`;

  const cerdoSlug = CERDO_IMAGES_BY_ID[productId]
    || (rubro === "cerdo" ? CERDO_IMAGES_BY_NAME[name] : null)
    || (rubro === "elaborados" ? ELABORADOS_CERDO_IMAGES_BY_NAME[name] : null);
  if (cerdoSlug) return `${CERDO_ASSET_BASE}/${cerdoSlug}.webp`;

  const polloSlug = POLLO_IMAGES_BY_ID[productId]
    || (rubro === "pollo" ? POLLO_IMAGES_BY_NAME[name] : null)
    || (rubro === "elaborados" ? ELABORADOS_POLLO_IMAGES_BY_NAME[name] : null);
  if (polloSlug) return `${POLLO_ASSET_BASE}/${polloSlug}.webp`;

  const otrosSlug = OTROS_IMAGES_BY_ID[productId] || (rubro === "otros" ? OTROS_IMAGES_BY_NAME[name] : null);
  if (otrosSlug) return `${OTROS_ASSET_BASE}/${otrosSlug}.webp`;

  const elaboradoSlug = ELABORADOS_IMAGES_BY_ID[productId]
    || (rubro === "elaborados" ? ELABORADOS_IMAGES_BY_NAME[name] : null);
  if (elaboradoSlug) return `${ELABORADOS_ASSET_BASE}/${elaboradoSlug}.webp`;

  const costillarSlug = COSTILLARES_IMAGES_BY_ID[productId]
    || (rubro === "costillares" ? COSTILLARES_IMAGES_BY_NAME[name] : null);
  if (costillarSlug) return `${COSTILLARES_ASSET_BASE}/${costillarSlug}.webp`;

  const menudenciaSlug = MENUDENCIAS_IMAGES_BY_ID[productId]
    || (rubro === "menudencias" ? MENUDENCIAS_IMAGES_BY_NAME[name] : null);
  if (menudenciaSlug) return `${MENUDENCIAS_ASSET_BASE}/${menudenciaSlug}.webp`;

  const subproductoSlug = SUBPRODUCTOS_IMAGES_BY_ID[productId]
    || (rubro === "subproductos" ? SUBPRODUCTOS_IMAGES_BY_NAME[name] : null);
  if (subproductoSlug) return `${SUBPRODUCTOS_ASSET_BASE}/${subproductoSlug}.webp`;

  return SUBPRODUCTOS_REUSED_IMAGES_BY_ID[productId] || "";
}
