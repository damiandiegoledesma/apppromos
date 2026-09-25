# DATA MODEL CORE — AppPromos

## Propósito

Definir el modelo central de datos de AppPromos para que el SaaS pueda escalar con altas limpias, multi-tenant estable, billing consistente y mantenimiento futuro.

## Decisión actual V11.4.1

Actualmente AppPromos usa:

```txt
DEMO = template operativo real
catalogs/baseProducts/items = catálogo formal futuro, pero hoy incompleto
```

Por lo tanto, hasta completar y validar el catálogo formal, las nuevas carnicerías deben inicializarse desde:

```txt
businesses/demo/core/state
```

## Business válido

Un negocio válido debe tener como mínimo:

```txt
businesses/{businessId}
  businessId
  name / businessName / displayName
  ownerUid
  ownerEmail / email
  phone / phoneE164
  phoneKey
  rawPhone
  address / direccion
  locality / ciudad
  localityKey
  province / provincia
  provinceId
  active
  isTestBusiness
  isTemplateBusiness
  createdBy
  createdAt
  updatedAt
  plan
  status
  billing
  modules
```

## Relación users ↔ businesses

```txt
users/{uid}.businessId = businessId
businesses/{businessId}.ownerUid = uid
```

Esta relación no debe quedar inconsistente.

## Root business

El documento root del business es control SaaS:

- identidad base;
- billing;
- módulos;
- owner;
- flags operativos;
- geografía normalizada;
- trazabilidad.

## core/meta

`businesses/{businessId}/core/meta` contiene identidad comercial pública y operativa:

```txt
businessName
name
displayName
phone
phoneE164
phoneKey
address
locality
localityKey
province
provinceId
activePriceListId
sourceType
clonedFrom
createdBy
```

No debe ser el lugar principal de billing.

## core/state

`businesses/{businessId}/core/state` contiene datos editables del negocio:

```txt
products
savedCombos
dashboard
web
activePriceListId
updatedAt
```

En V11.4.1 se sigue clonando desde DEMO.

## Billing

Modelo base:

```txt
billing: {
  plan: "trial" | "basic" | "pro",
  status: "active" | "overdue" | "suspended",
  trialStartedAt,
  trialEndsAt,
  graceEndsAt,
  updatedAt,
  updatedBy
}
```

Compatibilidad actual:

```txt
plan
status
```

también pueden existir en root.

## Geografía normalizada

El alta nueva debe guardar:

```txt
address
locality
localityKey
province
provinceId
```

Ejemplo:

```txt
locality: "Venado Tuerto"
province: "Santa Fe"
provinceId: "82"
localityKey: "venado-tuerto-santa-fe"
```

## Teléfono normalizado

Se guarda:

```txt
rawPhone: dato escrito por el usuario
phone: formato normalizado, preferentemente +549...
phoneE164: igual a phone
phoneKey: clave canónica para unicidad
```

## Índice de teléfono

```txt
publicPhoneKeys/{phoneKey}
  businessId
  phoneKey
  active
  updatedAt
```

Debe mantenerse mínimo porque permite lectura pública para validar duplicados antes del registro.

## DEMO como template

DEMO no es cliente real.

Debe ser tratado como:

```txt
isTemplateBusiness: true
isTestBusiness: true
```

No debe participar en competencia real ni métricas comerciales reales.

## Catálogo formal futuro

`catalogs/baseProducts/items` queda como objetivo futuro:

- completar productos reales;
- validar rubros;
- agregar `baseProductId`;
- normalizar unidades;
- preparar comparación limpia entre carnicerías.

No usar como única fuente de inicialización hasta que esté completo y validado.
