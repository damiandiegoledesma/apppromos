# Future — Referencias controladas para Mercado

## Objetivo

Cuando se revise integralmente el módulo Mercado/Competencia, AppPromos debe poder proteger el promedio de mercado frente a precios absurdos cargados por usuarios reales o de prueba.

Ejemplos de precios que no deberían romper el promedio:

```txt
Asado $ 2.000
Vacío $ 99.999
Picada $ 500
```

## Decisión de arquitectura

No clonar empresas como clientes para alimentar Mercado.

La idea correcta es crear referencias de mercado controladas en una estructura separada, por ejemplo:

```txt
marketSnapshots/ref_mercado_001
marketSnapshots/ref_mercado_002
marketSnapshots/ref_mercado_003
```

Estas referencias son datos comparativos, no clientes.

## Regla principal

```txt
No clonamos empresas para inflar el panel.
Creamos referencias de mercado para proteger el promedio.
```

## Campos sugeridos

```js
{
  type: "market_reference",
  source: "admin_seed",
  isMarketReference: true,
  isTestMarketSnapshot: true,
  verified: true,
  locked: true,

  name: "Carnicería Mercado Centro",
  province: "Santa Fe",
  city: "Venado Tuerto",

  sourceBusinessId: "biz_...",
  createdByAdmin: true,

  products: {
    asado: 15900,
    vacio: 18900,
    chorizo: 5990
  },

  createdAt: "...",
  updatedAt: "..."
}
```

## Reglas obligatorias

Una referencia de Mercado:

- no es cliente;
- no tiene usuario Auth;
- no tiene login;
- no tiene WhatsApp;
- no tiene `phoneKey`;
- no tiene `publicWebSlug`;
- no tiene web pública;
- no bloquea teléfonos;
- no aparece como cliente real en Panel Admin;
- no participa en billing;
- no debe confundirse con empresas TEST.

## Uso esperado

Desde una empresa TEST buena, con catálogo y precios razonables, se podría generar una base de referencias:

```txt
Cantidad: 20
Localidad: Venado Tuerto
Provincia: Santa Fe
Variación: automática realista
```

Ejemplos:

```txt
Carnicería Mercado Centro
Carnicería Mercado Norte
Carnicería Mercado Sur
Carnicería Mercado Premium
Carnicería Mercado Económica
```

## Variación realista de precios

No conviene duplicar 20 veces el mismo precio.

Las referencias deberían aplicar variaciones suaves:

```txt
Referencia 1: precios base
Referencia 2: +3%
Referencia 3: -4%
Referencia 4: +7%
Referencia 5: -6%
Referencia 6: +10%
Referencia 7: -8%
```

También puede variar por rubro:

```txt
Novillo +5%
Cerdo -3%
Pollo +2%
Elaborados +8%
```

## Promedio limpio

Cuando el módulo Mercado se revise, conviene evaluar:

- priorizar referencias `verified`;
- excluir extremos absurdos;
- usar mediana o promedio recortado;
- marcar precios sospechosos;
- separar clientes reales de referencias controladas.

## Lo que NO se debe hacer

No usar:

- clones de empresas cliente;
- empresas TEST comunes;
- datos demo disfrazados de mercado;
- teléfonos o slugs falsos;
- usuarios Auth falsos.

## Roadmap sugerido

Este future no entra en B2-C3B.

Queda para un hito posterior del módulo Mercado/Competencia:

```txt
V12.x — Mercado con referencias controladas y promedio robusto
```
