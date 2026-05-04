# Web Arranque — Assets visuales V1

Estas imágenes son genéricas y se usan automáticamente en la web pública de cada carnicería.

La carnicería no necesita subir fotos para que su web se vea bien.

## Regla comercial

- Prueba gratis / ARRANQUE / SALVADOR: web propia simple con imágenes genéricas automáticas.
- DUEÑO: web personalizada, imágenes propias y carrito de compras.

## Regla de publicación

La web pública no debe mostrar productos sin precio real.

- Producto con precio válido mayor a 0: se puede publicar.
- Producto sin precio, con precio 0 o inválido: no se publica.

## Estructura

```txt
public/assets/web-arranque/
  headers/
    header-mostrador-carniceria.webp
  combo-covers/
    combo-parrilla.webp
    combo-familiar.webp
    combo-milanesas.webp
    combo-achuras.webp
    combo-oferta-dia.webp
    combo-novillo.webp
    combo-cerdo.webp
    combo-pollo.webp
    combo-picada.webp
    combo-default.webp
  branding/
    powered-by-apppromos.svg
  patterns/
    apppromos-soft-pattern.svg
```

## Uso sugerido

La app debe asignar imagen por palabras clave del título de la oferta.

Ejemplos:

- `parrilla`, `asado`, `parrillero` → `combo-parrilla.webp`
- `familia`, `familiar` → `combo-familiar.webp`
- `mila`, `milanesa`, `milanesas` → `combo-milanesas.webp`
- `achura`, `chinchulin`, `morcilla`, `riñon`, `rinon` → `combo-achuras.webp`
- `novillo`, `vacio`, `entraña`, `entrana`, `matambre` → `combo-novillo.webp`
- `cerdo`, `bondiola`, `matambrito` → `combo-cerdo.webp`
- `pollo`, `suprema`, `pata muslo`, `alita` → `combo-pollo.webp`
- `picada`, `molida` → `combo-picada.webp`
- `oferta`, `promo`, `dia`, `día`, `especial` → `combo-oferta-dia.webp`
- sin coincidencia → `combo-default.webp`

## No borrar ni renombrar

No borrar ni renombrar estos archivos sin actualizar la lógica de `web.html` / módulo de web pública.
