# AppPromos V12.28-A1 - Eventos y linea de tiempo comercial

## Objetivo

Agregar una historia comercial entendible por carniceria sin reemplazar los
contadores de `metrics` incorporados en V12.27.

## Modelo

Los eventos se guardan en:

`businesses/{businessId}/commercialEvents/{eventId}`

Contrato V1:

- `businessId`
- `type`
- `occurredAt`
- `createdAt`
- `origin`
- `actorType`
- `source`
- `metadata`
- `schemaVersion: 1`

Los documentos son inmutables. Las reglas permiten crearlos al propietario de
la carniceria o a un administrador, pero nunca modificarlos o eliminarlos.

## Eventos iniciales

- alta del negocio;
- primer ingreso;
- guardado de precios;
- hitos de 5, 12 y 15 precios;
- apertura y compartido de la vidriera;
- promo creada y publicada;
- apertura de WhatsApp del vendedor;
- Promo del dia publicada;
- tema ofrecido, previsualizado, elegido o postergado.

`app_open` conserva su contador y ultima fecha en `metrics`, pero no genera un
documento por cada apertura para evitar ruido en la linea de tiempo.

## Centro de Control

La ficha del negocio carga bajo demanda los ultimos 40 eventos y los presenta
del mas reciente al mas antiguo. Los negocios anteriores a A1 conservan sus
contadores historicos aunque inicialmente no tengan eventos individuales.

## Privacidad

La coleccion no guarda nombre, telefono, direccion, contenido del pedido ni
conversaciones del comprador final. A1 registra solamente acciones del negocio.

## QA local

El seeder mantiene los escenarios `qa-05`, `qa-12`, `qa-15`, `qa-promo`,
`qa-publicada`, `qa-completa` y `qa-reactivacion`. Cada escenario recibe una
linea de tiempo coherente y el seeder verifica la existencia del alta y de los
hitos de precios correspondientes.

No se escriben datos de produccion y no se despliega sin aprobacion explicita.
