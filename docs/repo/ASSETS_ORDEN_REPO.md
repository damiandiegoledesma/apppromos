# Orden de assets — AppPromos

## Objetivo
Separar imágenes de producto y marketing para que el repo sea fácil de entender y no se vuelva pesado/confuso.

## Estructura recomendada

```txt
public/assets/
  brand/
    logo/
  characters/
    carniza/
    la-nelly/
  product/
    landing/
    icons/
    ui/
  marketing/
    pricing/
    social/
    landing/
```

## Producto
Assets que carga la app o landing:

```txt
public/assets/brand/
public/assets/characters/
public/assets/product/
```

Ejemplos:

```txt
carniza-avatar.webp
la-nelly-avatar.webp
hero-app-promos.webp
```

## Marketing
Piezas para redes, flyers, pricing, campañas o material comercial:

```txt
public/assets/marketing/
```

Ejemplos:

```txt
plan-salvador-dark-dorado.png
post-instagram-1.png
historia-prueba-gratis.png
```

## Regla práctica
- Lo que carga la app/landing debe ser liviano.
- Lo que es folleto/redes puede pesar más, pero debe vivir en marketing.
- No duplicar nombres ni tener `characters`, `personajes`, `images`, `imagenes` mezclados sin criterio.
- Antes de borrar carpetas viejas, revisar referencias en HTML/JS/CSS.

## En este ordenamiento
Se agregan versiones WEBP livianas para uso de app/landing y se conservan los PNG originales para no perder material fuente.
