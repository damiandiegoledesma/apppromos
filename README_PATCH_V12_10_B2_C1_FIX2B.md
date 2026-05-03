# AppPromos PATCH V12.10-B2-C1-FIX2B — Ocultar Carniza en Admin

## Objetivo

En el Panel Admin, Carniza no debe aparecer como asistente vendedor ni tapar información operativa.

Regla aplicada:

> En Admin, Carniza ayuda a administrar con contexto real o se oculta.

Para este patch se elige la opción segura: **ocultarlo en Administración**.

## Archivos incluidos

```txt
public/js/app-main.js
```

## Qué cambia

1. Cuando el usuario entra al panel de Administración (`usersPanel`), el body ya usa `module-focus-admin` y ahora esa clase oculta:
   - el chip flotante de Carniza;
   - el overlay/modal de Carniza si estuviera abierto;
   - bloques raíz de Carniza si existieran en pantalla.

2. Si Carniza estaba abierto y el admin entra a Administración, el overlay se cierra automáticamente.

3. Al salir de Administración hacia módulos comerciales, Carniza vuelve a estar disponible.

## Qué NO toca

```txt
Panel Admin datos/acciones
WhatsApp admin
Reparar configuración base
Switcher admin
Registro
Login
Web automática
Crear oferta
Vender urgente
WhatsApp cliente final
Backend
SQLite
```

## Test mínimo

```txt
1. Panel Admin abre.
2. En Panel Admin no se ve el chip flotante de Carniza.
3. Si Carniza estaba abierto, al entrar en Admin se cierra/oculta.
4. Volver a Inicio / Crear oferta / Vender urgente: Carniza vuelve a aparecer.
5. WhatsApp admin del panel sigue funcionando.
6. Entrar como cliente sigue funcionando.
7. Volver al Panel Admin sigue funcionando.
8. Consola sin errores rojos nuevos.
```
