# AppPromos V12.15-A3 — Configuración vertical futura

## Objetivo

Definir cómo debería verse una futura configuración por rubro/vertical para que AppPromos pueda crecer sin dejar de ser fuerte en carnicerías.

Este documento no implementa código.

Sirve como puente entre:

- V12.15-A1 — Arquitectura Core + Rubros.
- V12.15-A2 — Mapa de textos hardcodeados por rubro.
- V12.15-B — futura configuración real de verticales.

## Principio central

AppPromos no debe volverse genérico.

La carnicería sigue siendo la primera vertical validada.

Pero el core debe prepararse para que mañana puedan existir otras capas como verdulería, rotisería, fiambrería, chanchería, pollería, almacén perecedero o comida rápida.

## Concepto

La configuración vertical debería permitir que el mismo motor AppPromos adapte:

- textos visibles;
- catálogo base;
- categorías;
- unidades;
- demo;
- WhatsApp;
- web pública;
- modo vender urgente;
- mensajes de Carniza;
- imágenes genéricas;
- onboarding.

## Archivo futuro posible

Ubicación sugerida:

public/js/config/vertical-config.js

## Estructura conceptual

Cada vertical podría tener una configuración como:

verticalId
label
businessLabel
businessPluralLabel
productLabel
productPluralLabel
defaultUnit
allowedUnits
categories
demoBusinessName
demoProducts
demoCombos
urgentModeLabel
urgentModeInternalCopy
urgentModeExternalCopy
whatsappCopy
webCopy
onboardingCopy
carnizaCopy

## Vertical inicial: carnicería

Ejemplo conceptual:

verticalId: carniceria
label: Carnicería
businessLabel: carnicería
businessPluralLabel: carnicerías
productLabel: corte
productPluralLabel: cortes
defaultUnit: kg
allowedUnits: kg, unidad

Categorías principales:

- Novillo
- Cerdo
- Pollo
- Achuras
- Elaborados

Demo:

- demoBusinessName: Carnicería de Carniza
- combos parrilleros
- productos claros para venta por kilo
- sin productos confusos por pieza/kilo en demo inicial

Modo urgente:

- nombre interno: Vender urgente
- lenguaje interno: mover mercadería, vender hoy, sacar stock
- lenguaje externo: oferta del día, promo especial, combo de hoy

Regla comercial:

Internamente: urgencia.
Externamente: oportunidad.

## Futuras verticales posibles

### Verdulería

Podría adaptar:

- productos por kilo, unidad, cajón o bolsa;
- frutas y verduras;
- combos de feria;
- mensaje: vendé antes de que se pase;
- ofertas del día;
- WhatsApp simple para pedidos.

### Rotisería

Podría adaptar:

- menú del día;
- combos familiares;
- porciones;
- bandejas;
- sobrante de producción;
- mensaje: vendé lo que sale hoy, hoy.

### Fiambrería

Podría adaptar:

- fiambres por kilo o por 100 gramos;
- picadas;
- combos para reuniones;
- promociones por bandeja;
- productos de vencimiento cercano.

### Chanchería

Podría compartir mucho con carnicería:

- cortes de cerdo;
- combos parrilleros;
- kilos;
- venta urgente;
- web y WhatsApp similares.

### Almacén perecedero

Podría adaptar:

- productos frescos;
- lácteos;
- combos rápidos;
- vencimientos;
- ofertas por stock.

## Qué debe quedar en Core

El Core no debería decir carnicería, corte, asado, parrilla o kg de forma obligatoria.

El Core debería hablar en términos generales:

- negocio;
- producto;
- categoría;
- unidad;
- oferta;
- precio;
- WhatsApp;
- web;
- cliente;
- plan;
- cuenta.

## Qué debe quedar en capa Carnicería

Debe quedar en la vertical carnicería:

- Carnicería;
- cortes;
- kg como unidad principal;
- novillo;
- cerdo;
- pollo;
- achuras;
- asado;
- parrilla;
- combos parrilleros;
- mensaje carnicero;
- Carniza vendedor carnicero.

## Helpers futuros posibles

Más adelante podrían existir helpers como:

getVerticalConfig(verticalId)
getBusinessLabel(verticalId)
getProductLabel(verticalId)
getDefaultUnit(verticalId)
getCategories(verticalId)
getDemoBusinessName(verticalId)
getUrgentModeCopy(verticalId)
getWhatsappCopy(verticalId)
getWebCopy(verticalId)

## Reglas de seguridad

1. No cambiar comportamiento visible todavía.
2. No tocar Crear oferta todavía.
3. No tocar Cambiar precios todavía.
4. No tocar Web Arranque todavía.
5. No tocar Mercado todavía.
6. No tocar Demo todavía.
7. Primero documentar.
8. Después crear configuración carnicería.
9. Después reemplazar textos simples.
10. Recién después pensar en otra vertical experimental.

## Roadmap sugerido

V12.15-A3:
Documento de configuración vertical futura.

V12.15-B:
Crear vertical-config.js con carnicería como única vertical activa, sin cambiar comportamiento visible.

V12.15-C:
Primeros helpers de texto para labels simples.

V12.15-D:
Parametrizar demo y onboarding.

V12.15-E:
Parametrizar unidades/categorías/productLabel.

V12.15-F:
Crear vertical experimental no visible al usuario final.

## Frase guía

Comercialmente, AppPromos sigue siendo fuerte para carnicerías.
Técnicamente, empieza a preparar un core capaz de sostener más rubros.
