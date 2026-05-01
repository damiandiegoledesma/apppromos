const DEMO_PRODUCTS = [
  { id: "demo-asado", productKey: "demo-asado", nombre: "Asado", rubro: "Novillo", subrubro: "", precio: 15990, unidad: "kg", active: true },
  { id: "demo-vacio", productKey: "demo-vacio", nombre: "Vacío", rubro: "Novillo", subrubro: "", precio: 18990, unidad: "kg", active: true },
  { id: "demo-chorizo", productKey: "demo-chorizo", nombre: "Chorizo", rubro: "Cerdo", subrubro: "", precio: 5990, unidad: "kg", active: true },
  { id: "demo-pollo-entero", productKey: "demo-pollo-entero", nombre: "Pollo entero", rubro: "Pollo", subrubro: "", precio: 3999, unidad: "kg", active: true },
  { id: "demo-picada-comun", productKey: "demo-picada-comun", nombre: "Picada común", rubro: "Novillo", subrubro: "", precio: 8999, unidad: "kg", active: true }
];

const DEMO_SAVED_COMBOS = [
  {
    id: "demo-combo-parrillero",
    name: "🔥 Combo Parrillero",
    nombre: "🔥 Combo Parrillero",
    createdAt: "2026-04-28T00:00:00.000Z",
    total: 62950,
    total_final: 62950,
    peso_total: 5,
    items: [
      { id: "demo-asado", nombre: "Asado", rubro: "Novillo", cantidad: 2, unidad: "kg", precio_unitario: 15990, precio_unitario_actual: 15990, snapshot_precio_unitario: 15990 },
      { id: "demo-vacio", nombre: "Vacío", rubro: "Novillo", cantidad: 1, unidad: "kg", precio_unitario: 18990, precio_unitario_actual: 18990, snapshot_precio_unitario: 18990 },
      { id: "demo-chorizo", nombre: "Chorizo", rubro: "Cerdo", cantidad: 2, unidad: "kg", precio_unitario: 5990, precio_unitario_actual: 5990, snapshot_precio_unitario: 5990 }
    ],
    computed: {
      bruto: 62950,
      descuento_total: 0,
      subtotal: 62950,
      total_final: 62950,
      peso_total: 5,
      precio_por_kg: 12590
    }
  }
];

export function createDemoBusinessPayload() {
  const now = new Date().toISOString();
  return {
    businessId: "demo-carniza",
    meta: {
      id: "demo-carniza",
      businessId: "demo-carniza",
      name: "Carnicería de Carniza",
      nombre: "Carnicería de Carniza",
      telefono: "3462662053",
      ciudad: "Venado Tuerto",
      provincia: "Santa Fe",
      demo: true,
      status: "trial",
      plan: "demo",
      updatedAt: now
    },
    state: {
      activePriceListId: "demo",
      products: DEMO_PRODUCTS.map((item) => ({ ...item })),
      savedCombos: DEMO_SAVED_COMBOS.map((combo) => ({
        ...combo,
        items: combo.items.map((item) => ({ ...item })),
        computed: { ...(combo.computed || {}) }
      })),
      updatedAt: now,
      demo: true
    }
  };
}

export function getDemoWhatsappText() {
  return `Hola! Te paso esta oferta de la Carnicería de Carniza 👇

🔥 Combo Parrillero
• 2 kg Asado
• 1 kg Vacío
• 2 kg Chorizo

TOTAL: $ 62.950

AppPromos me ayuda a armar ofertas en 1 minuto.`;
}
