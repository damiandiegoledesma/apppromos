# AppPromos V12.18-D1 — Datos + identidad visual de la empresa

## Objetivo

Permitir que cada carnicería guarde su identidad real sin modificar todavía el render de la web pública.

D1 agrega:

- responsable editable;
- logo oficial por empresa;
- foto real del frente del local por empresa;
- Firebase Storage con reglas multiempresa;
- compresión/redimensionado de imágenes en el navegador;
- persistencia de identidad en `businesses/{businessId}/core/meta.brand`;
- fallback seguro para empresas existentes sin identidad cargada.

## Modelo de datos

```js
brand: {
  logoUrl: "...",
  logoPath: "businesses/{businessId}/brand/logo.webp",
  frontPhotoUrl: "...",
  frontPhotoPath: "businesses/{businessId}/brand/front.webp",
  updatedAt: "..."
}
```

El campo canónico nuevo para la persona responsable es:

```txt
responsable
```

La lectura mantiene compatibilidad con `ownerName`, `contactName` y `titular`.

## Storage

Rutas fijas por empresa:

```txt
businesses/{businessId}/brand/logo.webp
businesses/{businessId}/brand/front.webp
```

No se conserva historial de imágenes en esta etapa. Al cambiar una imagen se reemplaza la actual.

### Seguridad

- lectura pública únicamente de `logo.webp` y `front.webp`;
- escritura/borrado solo para el dueño de la empresa o administrador;
- solo se almacenan WEBP generados por AppPromos;
- logo almacenado: menos de 2 MB;
- foto del frente almacenada: menos de 8 MB.

Los archivos originales aceptados por la UI son JPG, PNG o WEBP. Antes de subirlos se optimizan en el navegador.

## Límites de entrada

Logo:

```txt
máximo 5 MB
máximo 512 x 512 de salida
WEBP
```

Foto del frente:

```txt
máximo 8 MB
máximo 1600 x 1200 de salida
WEBP
```

## UX

La identidad se completa desde:

```txt
Más → Mi cuenta → Editar datos
```

El registro inicial V12.18 sigue corto. No se agregan responsable, dirección ni imágenes como obligación de alta.

## Fuera de alcance D1

D1 NO modifica:

- `web.html`;
- hero de la web pública;
- carrito;
- ofertas;
- Centro de Promos;
- Carniza;
- WhatsApp;
- precios;
- slug salvo el comportamiento ya existente al editar datos básicos;
- tracking;
- PWA;
- planes.

La conexión visual de logo/foto con la web pública corresponde a V12.18-D2.

## QA mínimo

1. Editar responsable y confirmar persistencia.
2. Cargar logo JPG/PNG/WEBP y confirmar preview + persistencia.
3. Cargar foto del frente y confirmar preview + persistencia.
4. Recargar AppPromos y confirmar que ambas imágenes continúan visibles en Mi cuenta.
5. Cambiar logo y confirmar que reemplaza al anterior.
6. Quitar logo/foto y confirmar borrado de metadata + Storage.
7. Empresa B no puede escribir en `businesses/{empresaA}/brand/**`.
8. Archivo inválido o demasiado pesado muestra error humano.
9. Empresa sin `brand` sigue funcionando sin errores.
10. Crear oferta, Vender urgente, precios y WhatsApp siguen funcionando igual.

## Deploy

D1 incorpora `storage.rules`, por lo tanto al momento de probar en Firebase real se deben desplegar las reglas de Storage además del Hosting correspondiente.

No desplegar a producción sin QA previo en entorno controlado.
