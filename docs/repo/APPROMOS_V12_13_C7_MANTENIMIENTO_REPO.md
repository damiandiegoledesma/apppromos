# AppPromos V12.13-C7 — Mantenimiento repo assets docs

## Objetivo

Este documento resume el hito V12.13-C7 de mantenimiento del repositorio AppPromos.

El objetivo fue dejar el repo más liviano, más claro y más fácil de mantener, sin agregar funcionalidad comercial nueva y sin romper producción.

## Estado final

- Commit final: cf4e6d6 — V12.13-C7-C2 orden docs internos
- main = origin/main = origin/dev = origin/HEAD
- Producción funcionando
- QA OK
- Deploy no necesario para C7-C2 porque solo modificó docs internos fuera de public

## C7-A — Limpieza segura de assets

Se eliminaron assets pesados no usados por producción:

- public/assets/marketing
- public/assets/personajes
- public/assets/characters/carniza/carniza-base-final.png

Antes de borrar se generó backup externo en:

- C:\apppromos_cleanup_backups

Resultado:

- repo más liviano
- sin referencias rotas
- sin 404 nuevos de assets
- landing, demo, app, Web Arranque y WhatsApp OK

Commit:

- 7c83c20 — V12.13-C7-A limpieza segura de assets

## C7-B — Logo liviano en login/registro

Se reemplazó el logo pesado del login/registro por el logo liviano usado por app, landing y Web Arranque.

Cambio principal:

- de /assets/images/logo.png
- a /assets/logo/apppromos-square-transparent.png

También se eliminaron:

- public/assets/images/logo.png
- public/assets/brand/logo/apppromos-square-transparent.png

Cuidado importante:

En un primer intento PowerShell regrabó public-auth-module.js con problemas de codificación en acentos. Se corrigió restaurando desde HEAD y aplicando solo el cambio de ruta del logo con UTF-8 correcto.

Commit:

- fc42e60 — V12.13-C7-B logo liviano en login registro

## C7-C1 — Orden mínimo de public/docs

Se ordenó la raíz de public/docs.

Criterio:

- public/docs queda para documentación pública, servida o referenciada desde la app
- históricos de versiones se movieron a public/docs/archive/v12-historico
- duplicados de Carniza/personajes se eliminaron de raíz conservando los de public/docs/marketing
- EMPRESAS_TEST_APPPROMOS.md quedó en raíz porque está referenciado desde código

Commits:

- f05a0f7 — V12.13-C7-C1 orden minimo de docs
- 118a49d — V12.13-C7 mantenimiento repo assets docs

## C7-C2 — Orden docs internos raíz

Se aclaró la diferencia entre docs y public/docs.

Criterio final:

- docs = documentación interna del repositorio
- public/docs = documentación pública, servida o referenciada desde la app

Cambios:

- se creó docs/README.md
- se movieron V12.7.2_PATCH_*.md a docs/archive/v12-7-2
- se conservaron docs/repo y docs/futures

Commits:

- 3527962 — V12.13-C7-C2 orden docs internos
- cf4e6d6 — V12.13-C7-C2 orden docs internos

## Estructura final de documentación

docs:

- documentación interna del repo
- inventarios
- mantenimiento
- futures técnicos
- históricos internos

public/docs:

- documentación pública o servida
- documentación referenciada desde la app
- documentos vigentes del producto

## QA realizado

Validado durante el hito:

- Landing carga
- Probar demo funciona
- App/demo abre
- Carniza aparece
- Login/registro muestra logo
- Cambiar precios abre
- Web Arranque carga
- Logo AppPromos se ve
- WhatsApp abre
- Panel Admin abre
- Consola sin 404 nuevos de assets/docs

## Regla futura

Antes de agregar documentación nueva:

- si es interna del repo, va en docs
- si es pública, servida o referenciada desde la app, va en public/docs
- si es histórica, va a archive
- si es future, va a futures según corresponda

## Nota final

Este hito no buscó hacer AppPromos más grande.

Buscó dejar la mesa limpia para seguir construyendo sin arrastrar peso, duplicados ni confusión.
