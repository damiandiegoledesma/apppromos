# AppPromos V12.13-C6-FIX2 — Cambiar Precios / Uso-No uso claro y reversible

## Objetivo

Que el carnicero pueda manejar precios y visibilidad de productos sin miedo.

## Cambios

- Agrega filtro: Usados / No usados / Todos.
- El botón No uso deja de sentirse irreversible.
- Los productos No usados se pueden recuperar con Volver a usar.
- Aclara que No uso no borra el producto.
- Mantiene la regla de Web Arranque:
  - producto sin precio válido no aparece;
  - producto No usado no aparece;
  - producto activo con precio válido puede aparecer.

## Archivos tocados

- public/js/modules/prices-module.js

## No tocado

- public/web.html
- Crear oferta
- Vender urgente
- WhatsApp
- Firebase/Auth profundo
- Landing

## QA mínimo

1. Abrir Cambiar Precios.
2. Ver filtros Usados / No usados / Todos.
3. Marcar un producto como No uso.
4. Confirmar que desaparece de Usados.
5. Entrar a No usados.
6. Confirmar que aparece.
7. Tocar Usar.
8. Confirmar que vuelve a Usados.
9. Verificar que guardar precios sigue funcionando.
10. Verificar Web Arranque: No usado no aparece; precio 0 no aparece.
