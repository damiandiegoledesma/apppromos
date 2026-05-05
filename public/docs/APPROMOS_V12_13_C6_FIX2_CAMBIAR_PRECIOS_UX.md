# AppPromos V12.13-C6-FIX2 — Cambiar Precios UX

## Objetivo

Mejorar la pantalla **Cambiar precios** para que se sienta menos apretada en mobile y más orientada a mostrador.

## Problema detectado

La lógica de precios estaba sana, pero la pantalla acumulaba demasiados bloques antes de llegar a editar:

- título;
- tip;
- estado de guardado;
- resumen;
- rubros;
- búsqueda;
- selector;
- ordenamientos;
- ajustes masivos;
- lista.

Eso hacía que el carnicero viera más controles que productos.

## Cambios aplicados

- Header más corto.
- Tip para web más compacto.
- Buscador primero.
- Rubros en scroll horizontal.
- Estado + guardar en barra compacta.
- Ajustes rápidos dentro de un bloque desplegable.
- Lista con más presencia visual.

## Regla UX

Cambiar precios debe empujar rápido a:

```txt
buscar → tocar precio → guardar
```

No debe parecer una planilla ni un tablero técnico.

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
- [ ] Buscador funciona.
- [ ] Filtro por rubro funciona.
- [ ] Rubros se desplazan horizontalmente en mobile.
- [ ] Guardar individual funciona.
- [ ] Guardar cambios masivos funciona.
- [ ] Ajustes rápidos abren/cierra.
- [ ] +5%, +10%, -5% siguen funcionando.
- [ ] Precio 0 sigue ocultando producto en Web Arranque.
- [ ] Consola sin errores rojos nuevos.
