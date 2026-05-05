# AppPromos — Catálogo de futures documentados

Fecha de armado: 2026-05-05

Este directorio funciona como **biblioteca de futures** de AppPromos.

La regla de este paquete es simple:

```txt
No toca producción.
No se deploya.
No modifica main salvo decisión explícita.
Sirve para no perder ideas, prototipos y criterios.
```

## Base de producción al momento de documentar

```txt
main / origin/main / origin/dev
aa2818c — V12.13-C6-FIX precios e inicio mobile
```

## Ramas / materias future

### Ya documentado en rama propia

```txt
future/desposte-rentabilidad
```

Materia:
- rentabilidad de media res;
- rendimiento;
- merma;
- margen;
- histórico;
- resumen;
- plan DUEÑO futuro.

### Este paquete documental agrega / ordena

```txt
future/catalogo-futures-apppromos
```

Contiene:

```txt
origen-a-la-estaca/
impresion/
ofertas-publicaciones/
whatsapp/
material-redes/
mobile-first/
web-dueno/
admin-cobranzas/
mercado/
```

## Regla de uso

Este catálogo NO implica implementar todo.

Cada carpeta debe leerse como:

```txt
idea guardada
criterio de producto
material de consulta
semilla para futura rama de desarrollo
```

Cuando un future se despierte, crear una rama específica desde `main` o desde la base estable que corresponda, por ejemplo:

```txt
future/impresion-listas-volantes
future/ofertas-publicaciones-hitos
future/whatsapp-clientes-difusion
future/material-redes-ia
future/mobile-first-navegacion
future/web-dueno-carrito
future/admin-tracking-cobranzas
future/mercado-referencias-controladas
```

## Filosofía común

```txt
AppPromos no necesita ser más grande.
Necesita ser más claro.
```

Todo future debe respetar:

- mobile-first real para el carnicero;
- lenguaje humano;
- cero tecnicismos visibles;
- foco en vender;
- no romper el flujo sagrado;
- no convertir la app en un tablero de la NASA.

## Flujo sagrado

```txt
Landing
↓
Probar demo
↓
App/demo
↓
Crear oferta / Vender urgente
↓
Oferta lista
↓
WhatsApp
```
