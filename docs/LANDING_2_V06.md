# Landing 2 V0.6 — Carnis.app

**Estado:** implementada en laboratorio a partir de la maqueta V0.6 aprobada. Pendiente: aplicarla y probarla en el repo real, y el deploy.
**Base:** V12.29 RC5.6 + parches Carnis (V2.2, rebranding mínimo, Capturas Maestras V1) + Tracking Comercial V1.

## Decisión

`public/index.html` pasa a ser Landing 2 y es la única landing principal de carnis.app. No se deja ninguna landing vieja en paralelo ni un `index-old.html`: la versión anterior se recupera desde Git.

## Contenido

El copy y las secciones son los de la maqueta V0.6, sin agregados:

1. Hero
2. Tres pasos
3. Carniza / vender, con el recálculo de promos
4. Mirá una carnicería funcionando (A La Estaca)
5. Precio
6. Cierre y pie
7. Botón fijo

**Botón fijo:** se ve solo cuando no hay en pantalla ningún botón principal (hero, pasos, precio o cierre) y el usuario ya pasó el hero.

**Diseño:** es mobile first. En pantallas anchas se muestra la misma columna, centrada, con un ancho máximo de 480 px. La maqueta era solo mobile.

## Assets

Todos son reales y salen del repo:

| Uso | Archivo |
|---|---|
| Logo del hero y del pie | `assets/brand/carnis/svg/carnis-compacto-color.svg` / `carnis-compacto-blanco.svg` |
| Ícono del botón fijo | `assets/brand/carnis/svg/carnis-icono-color.svg` |
| Pasos 1–3 y recálculo | `assets/screenshots/carnis/landing/*` (Capturas Maestras V1) |
| Carniza | `assets/characters/carniza/onboarding/carniza-onboarding-identidad.webp` y `carniza-onboarding-compartir.webp` |
| A La Estaca **(PENDIENTE)** | `assets/product/landing/a-la-estaca-vidriera-landing2.jpg` y `a-la-estaca-carrito-landing2.jpg` |

**Pendiente de reemplazo antes del cierre final:** las dos capturas de A La Estaca todavía muestran AppPromos. Son los mismos recortes que usa la maqueta V0.6 (las capturas v1221 sin la barra del navegador).
- En el HTML están marcadas con `data-pending-asset="a-la-estaca-post-rebranding"` y con un comentario.
- Se reemplazan por capturas nuevas cuando el rebranding esté en producción, **con los mismos nombres de archivo**, así no hay que tocar la landing.
- Los carteles amarillos "reemplazar post-rebranding" de la maqueta eran notas de diseño y no se muestran al público.

## Enlaces

| Elemento | Destino |
|---|---|
| Crear (hero, pasos, precio, cierre, botón fijo) | `/crear-carniceria.html` |
| Ver A La Estaca online | `/carniceria-a-la-estaca-3462-543210`, relativo: funciona en carnis.app y en apppromos.web.app. Hay que verificar el slug real antes del deploy (control de RC3) |
| Contacto | WhatsApp de soporte que ya usa la app (`5493462662053`) |
| Privacidad / Términos | **No incluidos:** esas páginas no existen todavía |
| `/#signup` | Redirige a `/crear-carniceria.html` y conserva las UTM. Lo usan `app-main.js` (demo) y `como-vender.html` |
| `/#login` | Redirige a `/app.html`, que muestra el login |

## Tracking

- **Firestore:** `attachLandingFunnel()` registra `landing_view` y `cta_create_clicked` con `cta_position` (`hero`, `how_it_works`, `pricing`, `final`, `sticky`). `FUNNEL_BUILD = "V12.29-RC5.6+T1+L2"`.
- **GA4 en paralelo:** los mismos nombres de evento que la landing anterior:
  - `ap_landing_cta_click` y `ap_signup_click` en los botones de crear;
  - `ap_landing_cta_click` y `ap_demo_click` en "Ver A La Estaca". Este botón no es un paso del embudo.

## Qué se deja de mostrar de la landing anterior

- Formularios de login y registro embebidos.
- Burbuja de Carniza, video y aviso para instalar la PWA.
- Links a Facebook e Instagram.

Los archivos que quedan sin uso **no se borraron**: `js/modules/carniza-landing-module.js`, `styles/carniza-landing.css`, `styles/landing-video.css` y los assets viejos de `assets/product/landing/`. Se pueden limpiar más adelante en un cambio aparte.
