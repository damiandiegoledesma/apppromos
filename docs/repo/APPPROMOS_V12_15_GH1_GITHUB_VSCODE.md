# AppPromos V12.15-GH1 - GitHub CLI y VS Code conectados

## Objetivo

Documentar el primer hito de trabajo con GitHub CLI desde la terminal de VS Code.

Este hito no toca codigo de producto, no cambia pantallas, no toca Firebase, no toca Hosting y no requiere deploy.

## Estado validado

- GitHub CLI instalado.
- GitHub CLI reconocido desde terminal de VS Code.
- Login en GitHub realizado desde navegador.
- Cuenta activa: damiandiegoledesma.
- Repo visible desde terminal: damiandiegoledesma/apppromos.
- gh pr list funcionando.
- gh repo view funcionando.
- gh repo view --web abre el repo en navegador.

## Version instalada

GitHub CLI: gh version 2.92.0

## Estado de ramas al momento del hito

- main local = d5b3b67
- origin/dev = d5b3b67
- origin/main = 8ae743d

Lectura:

- main local tiene el trabajo mas reciente hasta V12.15-D1.
- origin/dev tambien tiene V12.15-D1.
- origin/main remoto esta mas atras.
- Esto es intencional por ahora: se viene subiendo trabajo nuevo a dev, no a main.

## Comandos utiles

- gh auth status
- gh repo view
- gh repo view --web
- gh pr list
- gh pr status
- gh pr create

## Flujo recomendado

Seguir trabajando desde C:\apppromos con VS Code y terminal integrada.

Cuando un hito queda probado localmente, respaldar en dev con:

git push origin main:dev

No actualizar origin/main automaticamente.

Llevar cambios a main remoto solo cuando el hito este probado, dev este estable y se decida cerrar version o deployar.

## Reglas

- No subir a main remoto sin decidirlo.
- No hacer deploy por cambios documentales.
- No mezclar futures con producto real.
- No usar ramas future para cambios productivos.
- No arrastrar archivos manualmente a GitHub salvo emergencia.

## Estado del hito

V12.15-GH1 cerrado como hito de entorno.
Producto sin cambios.
Deploy no necesario.
