export function createDemoSession() {
  return {
    appMode: "client",        // 👈 AGREGAR ESTA LÍNEA
    isDemo: true,

    businessId: "demo-carniza",
    businessName: "Carnicería de Carniza",

    user: {
      email: "demo@app.com"
    }
  };
}