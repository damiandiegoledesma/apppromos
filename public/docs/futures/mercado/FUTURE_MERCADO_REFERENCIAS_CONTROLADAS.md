# Future — Mercado con referencias controladas

## Estado

```txt
Future importante
No implementar ahora
Documentar para no contaminar arquitectura
```

## Problema

El módulo Mercado/Competencia puede romperse si usa precios absurdos cargados por usuarios reales o TEST.

Ejemplos:

```txt
Asado $ 2.000
Vacío $ 99.999
Picada $ 500
```

Eso rompe cualquier promedio simple.

## Decisión

No clonar empresas cliente para alimentar Mercado.

Crear referencias controladas separadas.

```txt
marketSnapshots/ref_mercado_001
marketSnapshots/ref_mercado_002
...
```

## Objetivo

```txt
Promedio de mercado limpio.
```

## Estructura sugerida

```js
{
  type: "market_reference",
  source: "admin_seed",
  isMarketReference: true,
  verified: true,
  locked: true,

  name: "Referencia Mercado Centro",
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

## Reglas clave

Las referencias Mercado:

```txt
no son clientes
no son usuarios
no tienen Auth
no tienen login
no tienen WhatsApp
no tienen phoneKey
no tienen slug
no tienen web
no aparecen como clientes reales
no bloquean teléfono
```

## Generación futura

Desde una empresa TEST base:

```txt
Crear referencias Mercado
Cantidad: 20
Localidad: Venado Tuerto
Provincia: Santa Fe
Variación: realista automática
```

Variaciones:

```txt
por rubro
por referencia
con límites suaves
sin precios absurdos
```

## Cálculo recomendado

No usar promedio simple de todo.

Preferir:

```txt
mediana
promedio recortado
exclusión de extremos
referencias verified + clientes reales válidos
```

## Qué NO hacer

- clonar empresas reales;
- contaminar Panel Admin;
- usar TEST como mercado real;
- crear usuarios Auth;
- usar WhatsApp/slug/phoneKey;
- mezclar referencias con clientes.

## Frase guía

```txt
Mercado necesita datos limpios.
No más carnicerías falsas disfrazadas de clientes.
```
