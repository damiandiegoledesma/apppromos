# AppPromos V12.13-C5 — Mi Web humana

## Objetivo

Pulir la experiencia visible de **Mi cuenta / Mi Web** para que el carnicero no vea enlaces técnicos crudos ni lenguaje viejo de "Web Premium" como protagonista.

## Cambios

- En **Mi cuenta**, "Mi web" pasa a mostrar estado humano:
  - Vidriera activa
  - Todavía sin vidriera activa
- Se mantienen botones claros:
  - Ver mi web
  - Copiar enlace
- El módulo web baja el lenguaje técnico:
  - Mi Web / Vidriera online
  - Enlace de tu vidriera
- Se evita mostrar como dato principal una URL cruda tipo `web.html?slug=...`.

## No se tocó

- `public/web.html`
- Firebase/Auth
- Registro/Login
- Crear oferta
- Vender urgente
- WhatsApp
- Precios vivos
- Regla de precio 0 oculto en Web Arranque
- `publicWebSlugs`

## Test mínimo

1. Abrir app local.
2. Entrar a **Más / Mi cuenta**.
3. Confirmar que Mi web muestra **Vidriera activa**.
4. Tocar **Ver mi web**.
5. Tocar **Copiar enlace**.
6. Abrir **Mi Web** y confirmar que ya no se muestra "Mi Web Premium" como título principal.
7. Verificar que la Web Arranque pública sigue mostrando precios vivos y ocultando precio 0.
