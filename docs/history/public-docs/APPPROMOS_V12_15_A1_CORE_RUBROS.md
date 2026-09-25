# AppPromos V12.15-A1 — Arquitectura Core + Rubros

## Objetivo

Preparar AppPromos para crecer más allá de carnicerías sin romper el MVP actual.

La idea no es abandonar carnicerías. La idea es separar:

- AppPromos Core.
- Capa Carnicería.
- Futuras capas por rubro.

## Estado actual

AppPromos hoy está muy bien orientado a carnicerías argentinas.

Eso fue correcto para el MVP porque permitió foco, velocidad y claridad comercial.

Pero el diagnóstico V12.15-A muestra acoplamiento fuerte a términos como carnicería, carne, cortes, kg, parrilla, asado, novillo, cerdo, pollo y achuras.

Los archivos más sensibles detectados son:

- public/js/app-main.js
- public/js/modules/builder-module.js
- public/js/modules/prices-module.js
- public/js/modules/market-module.js
- public/js/data/demo-business-data.js
- public/js/data/seed-data.js

## Evolución deseada

Hoy:
AppPromos = Carnicerías

Próximo paso:
AppPromos Core + Capa Carnicería

Futuro:
AppPromos Core + múltiples capas por rubro

## AppPromos Core

Debe contener todo lo reutilizable para comercios perecederos o de venta rápida:

- autenticación;
- registro;
- usuarios;
- negocios;
- cambio de precios;
- catálogo editable;
- creación de ofertas;
- oferta rápida;
- oferta con descuentos;
- vender urgente;
- WhatsApp;
- web propia;
- demo;
- onboarding;
- Panel Admin;
- cobranzas SaaS;
- Mercado Pago;
- cuenta corriente;
- movimientos de cuenta;
- tracking comercial;
- planes;
- estados de acceso;
- estados de pago;
- configuración por rubro.

## Capa Carnicería

Debe contener lo específico del rubro actual:

- nombre comercial carnicería;
- catálogo base de cortes;
- rubros novillo, cerdo, pollo, achuras;
- unidad principal kg;
- combos parrilleros;
- promo parrillera;
- asado;
- lógica de merma cárnica;
- modo vender urgente aplicado a carne;
- Carniza como vendedor contextual para carniceros;
- Mercado / competencia entre carnicerías;
- demo Carnicería de Carniza;
- textos orientados a carniceros argentinos.

## Futuras capas por rubro

AppPromos podría preparar capas para:

- chanchería;
- fiambrería;
- verdulería;
- pollería;
- rotisería;
- almacén perecedero;
- casa de comida rápida;
- fábrica chica de alimentos.

Cada capa debería poder definir:

- nombre del rubro;
- nombre del comercio;
- catálogo base;
- unidades habituales;
- categorías;
- combos sugeridos;
- textos comerciales;
- modo urgente propio;
- imágenes genéricas;
- mensajes de WhatsApp;
- web pública adaptada.

## Configuración futura por rubro

En el futuro puede existir una configuración tipo:

public/js/config/vertical-config.js

Ejemplo conceptual:

- id: carniceria
- label: Carnicería
- businessLabel: carnicería
- productLabel: corte
- defaultUnit: kg
- categories: categorías propias
- demoProducts: productos demo
- demoCombos: combos demo
- whatsappTone: tono comercial
- urgentModeLabel: nombre del modo urgente
- webCopy: textos de web
- onboardingCopy: textos de onboarding

## Reglas de migración

1. No reemplazar textos de carnicería a lo bruto.
2. Primero identificar, después parametrizar.
3. No romper el MVP actual.
4. Carnicería sigue siendo la vertical principal.
5. No crear multi-rubro visible hasta que el core esté listo.
6. No tocar flujos sagrados sin test.
7. Primero documentación y configuración.
8. Después refactor gradual.

## Flujos sagrados que no se deben romper

- cambiar precios;
- crear oferta;
- vender urgente;
- WhatsApp;
- web pública;
- cobranzas;
- cuenta corriente;
- demo;
- registro.

## Roadmap recomendado

V12.15-A1 — Documento arquitectura Core + Rubros.
V12.15-A2 — Mapa de textos hardcodeados por rubro.
V12.15-A3 — Documento de configuración futura por vertical.
V12.15-B — Crear primera configuración carnicería sin cambiar comportamiento visible.
V12.15-C — Reemplazar textos simples por helpers parametrizados.
V12.15-D — Demo multi-rubro conceptual, no productiva.
V12.15-E — Workflow GitHub + VS Code + ChatGPT.

## Criterio comercial

AppPromos no debe volverse genérico, frío ni difícil.

El objetivo sigue siendo:

- vender rápido;
- evitar merma;
- mandar por WhatsApp;
- tener web propia;
- cobrar bien;
- trabajar simple.

## Frase guía

AppPromos no deja de ser para carnicerías.
AppPromos empieza a tener un Core capaz de sostener más rubros.
