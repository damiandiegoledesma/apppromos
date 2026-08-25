# V12.18-D1-FIX3 — Diagnóstico y alineación de reglas de Firebase Storage

## Síntoma observado

El bucket ya estaba creado y las reglas D1 se desplegaron correctamente, pero la carga de logo devolvía:

`storage/unauthorized`

Por lo tanto, el problema no estaba en:
- Blaze;
- creación del bucket;
- API de Storage;
- uploader;
- conversión a WEBP;
- timeout;
- deploy de reglas.

El rechazo ocurría en la autorización.

## Causa encontrada

Las reglas D1 originales autorizaban escritura únicamente si:

1. existía `admins/{uid}` activo con role `admin/superadmin`; o
2. `users/{uid}.businessId == businessId`.

Pero el modelo real de sesión de AppPromos (`auth-service.js`) admite más variantes:

- `admins/{uid}` como perfil administrativo canónico;
- compatibilidad legada con `users/{uid}.role == "superadmin"`;
- empresa del cliente por:
  - `businessId`;
  - `primaryBusinessId`;
  - primer valor válido en `businesses[]`.
- además, la empresa raíz conserva `ownerUid`, que es una relación fuerte de propiedad.

Esto provocaba una diferencia importante:

`resolveSession()` podía considerar válido al usuario/admin,
pero Storage podía negarle la escritura.

## Corrección FIX3

`storage.rules` ahora autoriza la identidad de una empresa si se cumple al menos uno:

- perfil `admins/{uid}` activo con role admin/superadmin;
- compatibilidad legada `users/{uid}.role == superadmin`;
- `businesses/{businessId}.ownerUid == request.auth.uid`;
- `users/{uid}.businessId == businessId`;
- `users/{uid}.primaryBusinessId == businessId`;
- `businessId` pertenece a `users/{uid}.businesses[]`.

Se mantienen las restricciones:

- sólo rutas `businesses/{businessId}/brand/...`;
- sólo `logo.webp` y `front.webp`;
- sólo `image/webp`;
- logo < 2 MB;
- frente < 8 MB;
- lectura pública únicamente de esos dos recursos comerciales.

## Qué NO cambia

- Firestore rules;
- Auth;
- resolveSession;
- uploader;
- BusinessStore;
- web.html;
- carrito;
- ofertas;
- precios;
- WhatsApp;
- slug.

## QA

1. Aplicar `storage.rules`.
2. Ejecutar:
   `firebase deploy --only storage`
3. Ctrl+F5.
4. Como superadmin, abrir A La Estaca y subir logo.
5. Debe completar la carga.
6. Probar foto del frente.
7. Probar luego con un usuario cliente real de su propia empresa.
8. Confirmar que un cliente no pueda escribir en otra empresa.
