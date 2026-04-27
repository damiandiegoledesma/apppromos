# TESTING CHECKLIST — V11.4.1A

## 0. Instalación del patch

1. Renombrar archivos actuales indicados en `INSTALAR_PATCH_V11_4_1A.md`.
2. Copiar archivos nuevos del patch.
3. Correr app local o deploy de prueba.

## 1. Superadmin inicia en DEMO

1. Login como superadmin.
2. Confirmar que abre `demo` por defecto.
3. Confirmar que no abre la última carnicería usada.
4. Desde Admin, entrar explícitamente a una carnicería real.
5. Confirmar que cambia correctamente.
6. Cerrar sesión / recargar.
7. Confirmar que vuelve a iniciar en `demo`.

Resultado esperado: superadmin nunca cae accidentalmente en una empresa real al iniciar.

## 2. Admin — ayudas visuales

1. Entrar a Admin SaaS.
2. Revisar columna `Estado comercial`.
3. Confirmar que cada empresa muestra:
   - etiqueta clara;
   - descripción;
   - acceso;
   - guardado;
   - acción sugerida.
4. Cambiar billing a `overdue`.
5. Confirmar que muestra `Pago pendiente`.
6. Cambiar billing a `suspended`.
7. Confirmar que muestra `Suspendida por pago`.

Resultado esperado: el administrador entiende cada estado sin interpretar valores técnicos.

## 3. Cliente active / trial vigente

1. Login como cliente activo o trial vigente.
2. Confirmar que entra y ve sus datos.
3. Cambiar precio.
4. Guardar.
5. Crear oferta.
6. Guardar oferta.

Resultado esperado: opera normalmente.

## 4. Cliente overdue

1. Desde Admin, cambiar billing.status a `overdue`.
2. Login real como cliente, no como superadmin.
3. Confirmar que puede entrar y consultar.
4. Intentar guardar precio.
5. Intentar guardar oferta.
6. Intentar guardar Web Premium.
7. Confirmar que aparece aviso comercial con WhatsApp AppPromos.

Resultado esperado: consulta sí, guardado no.

## 5. Cliente suspended

1. Desde Admin, cambiar billing.status a `suspended`.
2. Login real como cliente.
3. Confirmar aviso de cuenta suspendida.
4. Confirmar que módulos operativos quedan bloqueados o limitados.
5. Confirmar botón WhatsApp AppPromos.

Resultado esperado: experiencia limitada clara, no pantalla confusa.

## 6. Superadmin soporte

1. Con empresa en `overdue`, entrar como superadmin a esa empresa.
2. Intentar corregir datos/precios.
3. Confirmar que el superadmin puede guardar.
4. Repetir con empresa `suspended`.

Resultado esperado: superadmin puede dar soporte aunque cliente no pueda guardar.

## 7. Rollback

Si falla algo:

1. Borrar archivos copiados del patch.
2. Restaurar backups renombrados.
3. Recargar app.
4. Confirmar que vuelve a V11.4.1.
