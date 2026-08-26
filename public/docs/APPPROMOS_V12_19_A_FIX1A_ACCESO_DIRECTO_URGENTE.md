# AppPromos V12.19-A FIX1-A — Acceso directo a Vender urgente

## Decisión UX

Cuando el carnicero toca la tarjeta **Vender urgente**, ya eligió qué necesita hacer. La aplicación abre directamente el flujo urgente y evita repetir el menú general de Carniza.

## Alcance

- La tarjeta de Vender urgente abre `openCarnizaUrgentFlowDirect()`.
- El avatar de Carniza conserva el menú unificado completo.
- No cambia el cálculo urgente, los productos sugeridos, los descuentos, WhatsApp ni la persistencia.

## QA breve

1. Abrir Inicio → Vender o crear promo.
2. Tocar Vender urgente.
3. Confirmar que aparece directamente la selección de mercadería.
4. Confirmar que no aparece antes el menú general de Carniza.
5. Abrir el avatar de Carniza y confirmar que su menú general sigue disponible.
6. Verificar consola sin errores rojos.

## Próximo hito

**V12.20 — Vender urgente de punta a punta**: uno o varios productos urgentes, venta solos o con complementos elegidos por el carnicero a precio normal, y publicación web temporal solo por hoy.
