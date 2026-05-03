# PATCH V12.10-B2-C1-FIX2 — WhatsApp + herramientas + switcher admin

## Objetivo
Cerrar el bloque operativo corto del Panel Admin sin abrir Web automática, backend ni flujos comerciales.

## Archivos incluidos

```txt
public/js/modules/admin-users-module.js
public/js/app-main.js
```

## Qué cambia

1. Agrega botón **📲 Escribir** en cada ficha de carnicería.
   - Usa el WhatsApp registrado.
   - Abre WhatsApp Web/App con mensaje base editable.
   - Mensaje base:
     "Hola, soy Damian de AppPromos.\n\nTe escribo por [Carnicería] en AppPromos."

2. Agrega bloque **Contacto rápido** dentro de `Ver detalle, herramientas y acciones`.
   - Repite WhatsApp registrado.
   - Permite abrir WhatsApp desde el detalle.
   - Aclara que los mensajes contextuales por pago/prueba/cambio de plan van en el próximo bloque de Control operativo.

3. Hace más visible **Reparar configuración base**.
   - Queda dentro de **Herramientas de administración**.
   - Texto de ayuda: usar solo si una empresa vieja o de prueba no muestra bien módulos, acceso o datos básicos.

4. Mejora el modo administrador al entrar como cliente.
   - En Inicio aparece una banda clara:
     "Modo administrador — Estás viendo esta carnicería como administrador."
   - Incluye botón **Volver al Panel Admin**.

## Qué NO toca

```txt
Registro
Login
Web automática
Crear oferta
Vender urgente
WhatsApp del cliente final
Backend Python
SQLite
Borrado real de Auth
Clonar / eliminar empresas
Control operativo 72/48 hs
```

## Test mínimo

```txt
1. Panel Admin abre.
2. Carnicerías carga.
3. Cada ficha muestra botón 📲 Escribir.
4. El botón abre WhatsApp con el número correcto.
5. El mensaje aparece precargado y editable.
6. Ver detalle, herramientas y acciones abre.
7. Contacto rápido aparece dentro del detalle.
8. Herramientas de administración muestra Reparar configuración base.
9. Entrar como cliente funciona.
10. En Inicio aparece la banda Modo administrador.
11. Volver al Panel Admin lleva al panel admin.
12. Módulos sigue guardando y cerrando.
13. Archivar / Restaurar sigue funcionando.
14. Desactivar / Reactivar usuario sigue funcionando.
15. Consola sin errores rojos nuevos.
```
