# AppPromos V12.13-C6-FIX2A — Precios limpio sin filtros duplicados

## Objetivo

Limpiar la pantalla **Cambiar precios** después del ajuste UX C6-FIX2.

## Decisión UX

Como ya existe selector de rubro, las pastillas de rubros son redundantes y ocupan lugar en mobile.

También se retiran de la vista los controles de ordenamiento:

- Nombre
- Precio

No aportan valor práctico para el flujo de mostrador.

## Qué queda visible

- Buscar producto.
- Selector de rubro.
- Estado de cambios + Guardar.
- Ajustar rubro seleccionado.
- Lista editable de productos.

## Ajustes rápidos

Los ajustes rápidos quedan explícitos como acción sobre el rubro seleccionado:

```txt
Ajustar rubro seleccionado
+5%   +10%   -5%
```

No se implementa selección múltiple de productos en esta versión.

## Regla UX

```txt
Precios = buscar / filtrar rubro / tocar precio / guardar.
```

Menos botones. Más mostrador.

## Archivos tocados

- `public/js/modules/prices-module.js`

## Archivos no tocados

- `public/js/app-main.js`
- `public/js/modules/dashboard-module.js`
- `public/web.html`
- Crear oferta
- Vender urgente
- WhatsApp
- Firebase/Auth
- Web Arranque

## Checklist local

- [ ] Cambiar precios carga.
- [ ] No aparecen pastillas de rubros.
- [ ] No aparecen botones Nombre / Precio.
- [ ] Selector de rubro funciona.
- [ ] Buscador funciona.
- [ ] Ajustes rápidos abre/cierra.
- [ ] +5%, +10%, -5% impactan sobre el rubro seleccionado.
- [ ] Guardar cambios funciona.
- [ ] Precio 0 sigue ocultando producto en Web Arranque.
- [ ] Consola sin errores rojos nuevos.
