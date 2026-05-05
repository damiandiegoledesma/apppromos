================================================================================
GRÁFICOS — MÓDULO DE COBRANZAS V12.11
================================================================================

Contenido del archivo:
  1. diagrama_flujo_cobranzas.svg
  2. diagrama_bandeja_morosos.svg
  3. diagrama_nelly_bloqueadora.svg

================================================================================

DESCRIPCIÓN POR GRÁFICO:

1. DIAGRAMA_FLUJO_COBRANZAS.SVG
   └─ Flujo completo de cobranza en 6 pasos:
      • Admin entra al Panel → Ve bandeja de morosos
      • Selecciona empresa → Acciones pre-armadas
      • Carnicero recibe aviso → Abre link MP y paga
      • Admin confirma pago → Sistema actualiza estado
      • Ciclo se repite con otros morosos
   
   Propósito: Mostrar el flujo operativo de principio a fin

2. DIAGRAMA_BANDEJA_MOROSOS.SVG
   └─ Estructura visual del panel administrativo:
      • Filtro de empresas: "Pago = Vencido"
      • 3 ejemplos de filas:
        - Empresa vencida hace 7 días (rojo)
        - Empresa vencida hace 14 días (rojo)
        - Empresa por vencer en 7 días (amarillo)
      • Cada fila: datos humanos + estado + botones de acción
      • Botones: "💬 WhatsApp" y "✓ Marcar pago"
   
   Propósito: Mostrar cómo se ve la bandeja en la pantalla del admin

3. DIAGRAMA_NELLY_BLOQUEADORA.SVG
   └─ Aviso en la app del carnicero (lado izquierda):
      • Simulación de pantalla móvil
      • La Nelly aparece en rojo: "Tu cuota venció"
      • Botón prominente: "Pagar mi abono"
      • Función "Crear oferta" bloqueada
      
      • Flujo post-pago (lado derecha):
        1. Carnicero abre link MP y paga
        2. Pago confirmado en Mercado Pago
        3. Admin marca pago en el Panel
        4. La Nelly desaparece, recupera acceso
   
   Propósito: Mostrar la experiencia del carnicero con avisos y bloqueos

================================================================================

CÓMO USAR LOS GRÁFICOS:

• Formatos: SVG (escalable, abre en cualquier navegador)
• Uso: Documentación, presentaciones, especificaciones
• Edición: Abre con Inkscape, VS Code, o cualquier editor SVG
• Web: Incrustar en HTML con <img> o <embed>

Ejemplo en HTML:
  <img src="diagrama_flujo_cobranzas.svg" alt="Flujo de cobranzas">

================================================================================

DOCUMENTACIÓN RELACIONADA:

Busca también:
  • DATA_MODEL_COBRANZAS_V12_11.md — Estructura de datos en Firebase
  • SPEC_TECNICA_COBRANZAS_V12_11.md — Código y especificación técnica

================================================================================

VERSIÓN: V12.11
FECHA: 2026-05-04
ESTADO: Propuesta lista para implementación

================================================================================
