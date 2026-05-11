# AppPromos V12.15-A2 — Mapa de textos hardcodeados por rubro

## Objetivo

Identificar dónde AppPromos todavía está escrito como si solo pudiera existir para carnicerías.

Este documento no cambia código. Sirve como mapa para una migración futura hacia AppPromos Core + capas por rubro.

## Criterio

No se debe borrar la identidad carnicera actual.

La carnicería sigue siendo la primera vertical validada.

Lo que buscamos es separar:

- textos y reglas del Core;
- textos y reglas de la Capa Carnicería;
- futuros textos parametrizables por rubro.

## Prioridad 1 — Textos visibles al usuario

Son los más importantes porque afectan directamente la percepción del producto.

Ejemplos detectados:

- Crear mi carnicería gratis.
- Creá tu carnicería gratis.
- Datos de tu carnicería.
- Mi carnicería.
- Tu carnicería.
- Carnicería de Carniza.
- Esta carnicería.
- No se encontró la carnicería.

Riesgo:

Si AppPromos se abre a otros rubros, estos textos harían que una verdulería, fiambrería o rotisería sienta que la app no es para ellos.

Tratamiento futuro:

Reemplazar por helper parametrizado según vertical.

Ejemplo conceptual:

- vertical.businessLabel
- vertical.businessDisplayName
- vertical.createBusinessCopy

## Prioridad 2 — Demo, onboarding y registro

El diagnóstico marca varios textos de demo y conversión pegados a carnicería.

Ejemplos:

- Esta es una demo. Podés armar ofertas y probar WhatsApp. Para guardar tus datos reales, creá tu carnicería gratis.
- Para seguir vendiendo, creá tu carnicería gratis.
- Estás probando la Carnicería de Carniza.
- Crear mi carnicería gratis.

Riesgo:

El flujo demo → registro es una de las puertas de conversión. Si en el futuro se testea otro rubro, este bloque tiene que adaptarse rápido.

Tratamiento futuro:

Crear textos de demo por vertical.

Ejemplo:

- demo.title
- demo.businessName
- demo.signupCTA
- demo.conversionMessage

## Prioridad 3 — Carniza y venta urgente

Carniza hoy está muy asociado a carnicerías, carne y venta urgente de productos cárnicos.

Ejemplos detectados:

- rubro cerdo / chancho.
- rubro pollo / ave.
- rubro novillo / vaca / ternera / res.
- íconos 🐖 🐔 🐄.
- Promo parrillera de hoy.
- asado, vacío, chorizo, morcilla, entraña, matambre, costilla, tira.
- Elegí productos atrasados y sacalos hoy.

Riesgo:

Carniza funciona muy bien como vendedor carnicero, pero en otros rubros tal vez necesita otro contexto o modo.

Tratamiento futuro:

Separar Carniza Core de Carniza Capa Carnicería.

Core:

- sugerir oferta;
- vender urgente;
- guiar próximo paso;
- armar mensaje WhatsApp;
- ayudar a liquidar stock.

Capa Carnicería:

- lenguaje de carne;
- combos parrilleros;
- cortes;
- merma cárnica;
- estética carnicera.

## Prioridad 4 — Catálogo, precios, rubros y unidades

El diagnóstico muestra uso fuerte de rubro, kg, categoría y productos cárnicos.

Ejemplos:

- unidad default kg.
- product.rubro.
- category / categoria.
- cortes.
- rubros que corresponden a carne.

Riesgo:

Otros rubros pueden necesitar unidad por pieza, docena, bandeja, unidad, kilo, litro, porción o combo.

Tratamiento futuro:

Crear configuración de unidades por vertical.

Ejemplo conceptual:

- defaultUnit: kg.
- allowedUnits: kg, unidad, bandeja, docena.
- categoryLabel: rubro / categoría / familia.
- productLabel: corte / producto / artículo.

## Prioridad 5 — Web pública / Web Arranque

La web pública actual está orientada a carnicería.

Ejemplos:

- nombre de carnicería.
- estética carnicera.
- lista de precios de carnicería.
- WhatsApp de carnicería.

Riesgo:

La web propia es una promesa central de AppPromos. Para otros rubros debe adaptar textos sin duplicar toda la lógica.

Tratamiento futuro:

Web Core + copy por vertical.

Core:

- mostrar negocio;
- mostrar precios;
- mostrar ofertas;
- botón WhatsApp;
- estado web;
- contacto;
- ubicación.

Capa vertical:

- título;
- subtítulo;
- nombres de secciones;
- productos demo;
- imágenes genéricas;
- tono comercial.

## Prioridad 6 — Mercado / Competencia

Mercado hoy tiene sentido como comparación entre carnicerías.

Ejemplos:

- comparación con carnicerías cargadas.
- referencias de mercado carnicero.
- rubros novillo, cerdo, pollo.

Riesgo:

Mercado no se puede mezclar entre rubros. Comparar carnicería contra verdulería no sirve.

Tratamiento futuro:

Mercado debe ser vertical-aware.

Ejemplo:

- market.verticalId = carniceria.
- marketSnapshots por vertical.
- referencias controladas por rubro.
- filtros provincia / localidad / vertical.

## Prioridad 7 — Panel Admin y Cobranzas

Panel Admin, Mercado Pago, cuenta corriente y cobranzas son bastante Core.

Pero todavía aparecen textos como carnicería / carnicerías en listados y mensajes.

Ejemplos:

- clientes/carnicerías.
- no hay carnicerías para mostrar.
- no se encontró la carnicería.
- esta carnicería no tiene WhatsApp válido.

Tratamiento futuro:

Panel Admin debería hablar de clientes, comercios o negocios en la vista Core, y usar carnicería solo cuando la vertical sea carnicería.

## Prioridad 8 — Docs internos

Hay muchos documentos históricos y futures con lenguaje de carnicería.

No hace falta corregir docs viejos.

Sí conviene que los nuevos docs desde V12.15 hablen de:

- Core;
- Vertical;
- Capa Carnicería;
- rubros futuros;
- configuración por vertical.

## Propuesta de helpers futuros

Crear helpers de copy por vertical.

Ejemplo conceptual:

- getVerticalLabel(verticalId).
- getBusinessLabel(verticalId).
- getProductLabel(verticalId).
- getDefaultUnit(verticalId).
- getDemoBusinessName(verticalId).
- getUrgentModeCopy(verticalId).
- getWhatsappCopy(verticalId).

## Primeros textos candidatos a parametrizar

Alta prioridad:

- carnicería.
- carnicerías.
- Crear mi carnicería gratis.
- Carnicería de Carniza.
- Datos de tu carnicería.
- Mi carnicería.
- corte.
- cortes.
- kg.
- Promo parrillera.
- asado.

## Qué NO tocar todavía

No tocar de golpe:

- app-main.js.
- builder-module.js.
- prices-module.js.
- market-module.js.
- data-service.js.
- demo-business-data.js.
- seed-data.js.
- web.html.
- app.html.
- index.html.

Motivo:

Son archivos sensibles y mezclan lógica comercial, demo, oferta, UI, web y onboarding.

## Roadmap de migración

V12.15-A2:
Mapa de textos hardcodeados por rubro.

V12.15-A3:
Documento de configuración vertical futura.

V12.15-B:
Crear vertical-config.js con carnicería como única vertical activa, sin cambiar comportamiento visible.

V12.15-C:
Primeros helpers de texto sin modificar flujos.

V12.15-D:
Parametrizar demo y onboarding.

V12.15-E:
Parametrizar catálogo/unidades/rubros.

V12.15-F:
Preparar vertical futura experimental sin mostrar al usuario final.

## Regla final

Primero parametrizar.
Después refactorizar.
Después recién abrir nuevos rubros.

AppPromos no debe volverse genérico.
Debe seguir siendo simple, comercial y rápido.
