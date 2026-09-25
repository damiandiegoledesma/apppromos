# AppPromos V12.13-C7-C1 — Orden mínimo de docs

## Objetivo

Ordenar la carpeta de documentación sin tocar lógica productiva.

## Base

- Rama de trabajo: maintenance/repo-cleanup-v12-13
- Base productiva: V12.13-C6-FIX3 web arranque limpia
- C7-A aplicado: limpieza segura de assets
- C7-B aplicado: logo liviano en login/registro

## Diagnóstico

El diagnóstico C7-C mostró que los documentos Markdown no representan un problema de peso, pero sí de orden.

Se detectó:

- Muchos documentos históricos de versiones antiguas en public/docs raíz.
- Duplicados de documentos de Carniza/personajes entre raíz y public/docs/marketing.
- Un documento referenciado desde código: public/docs/EMPRESAS_TEST_APPPROMOS.md, que no fue movido.

## Cambios realizados

Se movieron a public/docs/archive/v12-historico/ documentos históricos de versiones anteriores:

- V12.8
- V12.9
- V12.11
- V12.12
- V12.13-A
- V12.13-B
- APPROMOS_V12_13_C5
- APPROMOS_V12_13_C6
- WEB_ARRANQUE_ESTETICA_ASSETS.md

Se eliminaron duplicados de raíz, conservando las versiones ubicadas en public/docs/marketing:

- public/docs/carniza-identidad-ia-comercial-v2.md
- public/docs/HITO_CARNIZA_LA_NELLY_V12.md
- public/docs/personajes-finales-mvp.md

Se removieron temporales de trabajo:

- diagnostico-c7c-docs.txt
- firestore-debug.log

## Qué NO se tocó

- Código productivo
- Firebase/Auth
- BusinessStore
- Crear oferta
- Vender urgente
- WhatsApp
- Cambiar precios
- Web Arranque
- CHANGELOG.md
- CURRENT_VERSION.md
- PROMPT_MAESTRO_APPPROMOS.md
- EMPRESAS_TEST_APPPROMOS.md
- PANEL_ADMIN_FUNCIONAMIENTO_V12_10_B2.md
- PANEL_ADMIN_PLANES_PAGOS.md
- public/docs/marketing
- public/docs/prompts
- public/docs/archive/docs_backup_260428
- docs

## Criterio

Los documentos históricos no deben ensuciar la raíz de documentación activa.

La raíz de public/docs debe quedar para documentos vivos, actuales o de referencia principal.

## QA recomendado

- App carga.
- Landing carga.
- Probar demo funciona.
- Admin sigue mostrando referencia a EMPRESAS_TEST_APPPROMOS.md sin cambios.
- No hay errores 404 nuevos relacionados a docs.
