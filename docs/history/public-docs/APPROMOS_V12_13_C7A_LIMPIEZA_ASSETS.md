# AppPromos V12.13-C7-A — Limpieza segura de assets

## Objetivo

Reducir peso del repo y de la carpeta publica servida sin tocar logica productiva.

## Base

- Rama de trabajo: maintenance/repo-cleanup-v12-13
- Base productiva: V12.13-C6-FIX3 web arranque limpia
- Commit base: cbd7cf9

## Cambios realizados

Se eliminaron de public assets pesados no referenciados por produccion:

- public/assets/marketing/**
- public/assets/personajes/**
- public/assets/characters/carniza/carniza-base-final.png

Antes de eliminar, se genero un backup externo fuera del repo en C:\apppromos_cleanup_backups.

## Que NO se toco

- Crear oferta
- Vender urgente
- WhatsApp
- Cambiar precios
- Web Arranque
- Firebase/Auth
- BusinessStore
- Landing logica
- Assets productivos webp utilizados

## Criterio

Lo que no usa produccion, no debe vivir dentro de public.

## QA recomendado

- Landing carga.
- Probar demo funciona.
- App/demo abre.
- Carniza aparece.
- Web Arranque carga.
- Logo AppPromos se ve.
- WhatsApp abre.
- Consola sin errores rojos nuevos relacionados a assets.
