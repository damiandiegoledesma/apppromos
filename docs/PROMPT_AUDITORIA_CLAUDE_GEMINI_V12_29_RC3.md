# Prompt de auditoría externa — AppPromos V12.29 RC3

Auditá este ZIP como release candidate previo a producción. No propongas features nuevas salvo que corrijan un riesgo real de RC3.

## Objetivo de RC3
`https://carnis.app/{slug}` debe convertirse en la URL comercial canónica generada por AppPromos, mientras `https://apppromos.web.app/{slug}` debe seguir funcionando indefinidamente. Ambos dominios servirán el mismo Firebase Hosting y el mismo `publicWebSlugs/{slug}`.

El slug productivo de A La Estaca NO debe reconstruirse ni modificarse. El código contiene actualmente `carniceria-a-la-estaca-3462-543210` como referencia estática, pero antes del deploy se verificará contra Firestore producción. DNS y custom domain se conectarán sólo después de aprobar esta auditoría.

## Revisar especialmente
1. ¿Existe algún flujo que todavía genere/comparta una URL pública con `window.location.origin`, `apppromos.web.app` o un `publicUrl` legacy persistido en vez de `carnis.app`?
2. ¿Un guardado normal de Mi Web podría cambiar accidentalmente un slug existente?
3. ¿Al cambiar nombre/teléfono se conserva de verdad el slug anterior como alias funcional y actualizado, sin romper reglas Firestore?
4. ¿Los aliases pueden colisionar o ser tomados por otro negocio en el futuro?
5. ¿La web pública resuelve correctamente tanto la ruta canónica como la histórica usando el mismo `publicWebSlugs/{slug}`?
6. ¿WhatsApp, Carniza, onboarding, Mi Web, dashboard, QR y Centro de Impresiones terminan usando la URL canónica?
7. ¿Hay riesgo de doble registro de `external_storefront_visit` o `public_order_whatsapp_started` por el cambio de dominio?
8. ¿Se introdujo alguna regresión en carrito, ofertas, precios, publicación, Firebase Auth/Firestore/Hosting o seguridad?
9. ¿El `firebase.json` permite que el mismo slug funcione con ambos dominios una vez asociados al mismo Hosting?
10. ¿Hay algún blocker real para conectar DNS después de verificar el slug productivo?

## Entrega esperada
Separá hallazgos en BLOCKER / ALTO / MEDIO / BAJO. Para cada hallazgo indicá archivo, función/línea aproximada, escenario de reproducción y corrección mínima. Cerrá con una lista de QA manual imprescindible. No cambies archivos: sólo auditoría.
