# AppPromos V12.15-B — Vertical config base

## Objetivo

Crear la primera configuración técnica base de verticales para AppPromos.

Este hito crea únicamente la vertical carniceria como configuración disponible.

## Alcance

Archivos creados:

- public/js/config/vertical-config.js
- public/docs/APPPROMOS_V12_15_B_VERTICAL_CONFIG_BASE.md

## Regla principal

Este cambio no modifica comportamiento visible.

No se importa todavía en módulos productivos.

No toca Crear oferta, Cambiar precios, Vender urgente, WhatsApp, Web Arranque, Panel Admin, Firebase, Mercado Pago ni datos existentes.

## Qué contiene la configuración

La vertical carnicería define:

- etiquetas de negocio;
- etiquetas de producto;
- etiqueta de categoría/rubro;
- unidad principal;
- unidades permitidas;
- categorías base;
- nombre de demo;
- textos de vender urgente;
- textos de web;
- textos de WhatsApp;
- textos base de Carniza.

## Motivo

Preparar AppPromos para evolucionar desde AppPromos igual a Carnicerías hacia AppPromos Core + Capa Carnicería.

Más adelante permitirá pensar AppPromos Core + múltiples rubros.

## Estado

Configuración creada, pero todavía no conectada.

## Próximo paso futuro

V12.15-C debería evaluar helpers simples o primera lectura controlada de la configuración, sin reemplazar textos críticos todavía.
