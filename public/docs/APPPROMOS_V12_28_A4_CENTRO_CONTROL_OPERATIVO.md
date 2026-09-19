# AppPromos V12.28-A4 — Centro de Control operativo

## Objetivo

Transformar el panel administrativo en una herramienta diaria simple: abrir, identificar quién necesita ayuda y actuar en pocos segundos.

## Navegación principal

Se reducen seis pestañas a cuatro destinos:

- **Hoy**: cola priorizada de carnicerías que necesitan ayuda.
- **Carnicerías**: buscador y directorio completo.
- **Cobranzas**: operación de pagos separada del seguimiento comercial.
- **Más**: tracking, usuarios y herramientas poco frecuentes.

La navegación queda fija en la parte inferior. En el detalle de una carnicería cambia a:

- Volver;
- WhatsApp;
- Seguimiento;
- Más.

La navegación general de AppPromos permanece oculta mientras el módulo administrador está activo, evitando superposiciones.

Desde A4-FIX1 la navegación superior se elimina también en desktop para evitar duplicaciones. La barra inferior es la única navegación principal.

### A4-FIX2

- separa el montaje de la navegación general del montaje de acciones del detalle;
- garantiza **Hoy / Carnicerías / Cobranzas / Más** en la pantalla principal;
- conserva **Volver / WhatsApp / Seguimiento / Más** dentro de una carnicería;
- apila Seguimiento y Mensaje para WhatsApp a ancho completo;
- limita todos los contenedores operativos al ancho disponible para eliminar el desplazamiento horizontal.

### A4-FIX3

- monta la barra flotante directamente sobre `document.body`, fuera de los contenedores transformados de AppPromos;
- mantiene siempre visible la navegación principal y la reemplaza por acciones contextuales al abrir una carnicería;
- restaura **Salir del Centro de Control** y vuelve al Inicio de AppPromos;
- elimina la barra flotante al salir o entrar como una carnicería;
- evita que el posicionamiento de la navegación genere desbordamiento horizontal.

### A4-FIX4

- corrige la colisión con estilos globales que dejaba los botones del menú con altura efectiva cero;
- fuerza visibilidad, altura e interacción de los cuatro botones solo dentro de la navegación del Centro de Control;
- bloquea el desbordamiento horizontal mientras `module-focus-admin` está activo.

### A4-FIX5

- reemplaza los botones de la barra por controles propios que no participan de las reglas globales de navegación de AppPromos;
- aplica el layout crítico directamente sobre la barra y sus cuatro acciones para que el render final no pueda ocultarlas;
- conserva los mismos eventos, navegación, accesibilidad y estado activo.

## Pantalla Hoy

La tabla horizontal se reemplaza por tarjetas operativas. Cada tarjeta muestra únicamente:

- carnicería y responsable;
- estado de salud;
- problema detectado;
- acción recomendada;
- última señal comercial;
- botones **Ayudar** y **WhatsApp**.

El filtro inicial es **Necesitan ayuda**. También pueden verse todas o solamente las activas.

En QA, cuando no existen carnicerías reales, se muestran las empresas TEST con una advertencia explícita. Esto evita una pantalla inicial en cero después del reseed.

## Directorio de carnicerías

Se elimina la tabla de ocho columnas. Cada carnicería aparece en una tarjeta compacta con estado, plan, pago y tres acciones:

- Ver;
- WhatsApp;
- Entrar.

Los filtros avanzados quedan plegados.

## Detalle operativo

Quedan abiertos solamente:

1. próximo paso recomendado;
2. seguimiento manual;
3. mensaje sugerido para WhatsApp.

La información secundaria queda plegada en:

- Actividad y datos de la carnicería;
- Historial;
- Cobranzas;
- Herramientas técnicas.

No se modifica la lógica ni la persistencia de A1, A2 o A3.

## Resultados de la vidriera

A4-FIX1 incorpora un resumen visible en el detalle:

- visitas registradas durante los últimos 7 días;
- total de visitas registradas desde A2;
- pedidos iniciados por WhatsApp, totales y de los últimos 7 días;
- fecha de la última visita;
- conversión aproximada entre pedidos iniciados y visitas.

Los valores se calculan sobre la colección completa de señales públicas de la carnicería, no sobre los 40 eventos visibles en el historial. Una visita registrada representa una señal anónima deduplicada por navegador, carnicería y día; no es una medición de páginas vistas de Google Analytics.

## QA esperado

### Desktop

- La pantalla Hoy no requiere desplazamiento horizontal.
- Las empresas prioritarias se comprenden sin abrir el detalle.
- Tracking y Usuarios siguen disponibles desde Más.
- El detalle mantiene operativas todas las funciones anteriores.

### Mobile

- La navegación inferior permanece visible.
- No se superpone con la navegación general de AppPromos.
- Las tarjetas se muestran en una columna.
- Los botones principales se pueden pulsar sin ampliar la pantalla.
- Las secciones plegadas reducen el desplazamiento inicial.
