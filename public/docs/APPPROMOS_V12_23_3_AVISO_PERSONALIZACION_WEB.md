# AppPromos V12.23.3 — Aviso de personalización

## Objetivo

Recordar al carnicero que complete la identidad visual de su carnicería online sin bloquear el uso de AppPromos.

## Comportamiento

- El aviso aparece en Inicio cuando falta el logo, la foto del frente o ambos.
- Informa exactamente qué elemento falta.
- `Completar ahora` abre directamente la edición de datos e imágenes de la carnicería.
- Al guardar ambas imágenes, el aviso desaparece automáticamente.
- Si posteriormente se elimina una imagen, el aviso vuelve a aparecer.
- No se muestra al superadmin ni dentro del tenant técnico demo.

## Persistencia

Utiliza los campos existentes:

- `meta.brand.logoUrl`
- `meta.brand.frontPhotoUrl`

No crea campos, colecciones ni estados nuevos.

## Archivos modificados

- `public/js/modules/dashboard-module.js`
- `public/js/app-main.js`

## QA requerido

1. Sin logo ni foto, comprobar que el aviso enumera ambos elementos.
2. Con logo solamente, comprobar que pide la foto del frente.
3. Con foto solamente, comprobar que pide el logo.
4. Pulsar `Completar ahora` y confirmar que abre el formulario correcto.
5. Guardar ambas imágenes y confirmar que el aviso desaparece.
6. Confirmar que no aparece para superadmin ni demo.
7. Revisar desktop y mobile sin superposiciones.
