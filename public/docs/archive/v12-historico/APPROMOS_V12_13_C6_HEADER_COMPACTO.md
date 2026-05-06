# AppPromos V12.13-C6 — Inicio liviano / header compacto

## Objetivo

Reducir el peso visual del header en mobile para que Inicio quede enfocado en vender.

Regla de producto:

```txt
Inicio = vender
Mi Cuenta = administrar
```

## Cambio principal

En mobile, el header pasa de mostrar marca + datos de sesión a una línea compacta:

```txt
[logo] Carnicería Sur · Prueba activa
```

Variantes posibles:

```txt
[logo] Carnicería Sur · ARRANQUE
[logo] Carnicería Sur · SALVADOR
[logo] Carnicería Sur · DUEÑO
[logo] Carnicería Sur · Pago pendiente
```

## Qué queda arriba

- Logo chico de AppPromos.
- Nombre corto de la carnicería.
- Estado/plan compacto.

## Qué se manda a Más / Mi cuenta

- Email.
- Botón salir.
- Plan detallado.
- Dirección / localidad.
- Mi web / vidriera.
- Datos administrativos.

## Archivos tocados

```txt
public/js/app-main.js
```

## Qué NO toca

```txt
public/web.html
Web Arranque
precios vivos
precio 0 oculta producto
Crear oferta
Vender urgente
WhatsApp
Firebase/Auth
Mi cuenta / Mi Web
```

## Test mínimo

1. Abrir app en mobile o DevTools 360x640.
2. Inicio debe mostrar header compacto.
3. Debe verse logo chico + carnicería + estado.
4. No debe verse email ni selector grande en el header mobile.
5. Más / Mi cuenta sigue mostrando los datos completos.
6. Botonera inferior sigue funcionando.
7. Crear oferta, Precios, WhatsApp y Vender urgente siguen funcionando.
