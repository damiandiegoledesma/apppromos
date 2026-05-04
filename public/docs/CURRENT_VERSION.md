# AppPromos — Versión actual

## V12.13-A — Web pública autogenerada mobile-first

Base de trabajo:

- V12.12 dejó la app interna mobile-first con botonera inferior, header compacto, Inicio limpio y Ofertas mobile.
- V12.13-B compactó Oferta con descuentos y fue deployado.
- La Web de Arranque ya se crea desde el registro, pero necesitaba verse mejor en celular y funcionar como vidriera pública real.

## Objetivo

Mejorar la estética y experiencia mobile-first de `public/web.html`, para que la web autogenerada de cada carnicería se vea profesional aunque todavía esté en modo arranque.

## Incluye

- Rediseño visual de la web pública con estética AppPromos/carnicería.
- Hero mobile-first con nombre de carnicería, ubicación, teléfono y CTA WhatsApp.
- Ofertas activas más claras y legibles en celular.
- Lista de precios en cards compactas y responsive.
- Estado “Lista de precios en preparación” más humano y comercial.
- Botón fijo inferior de WhatsApp adaptado a safe-area mobile.
- Protección de ancho para evitar scroll horizontal.
- FIX1: lectura pública segura por slug desde `publicWebSlugs/{slug}` sin depender de `businesses/...` para visitantes anónimos.
- FIX2: cambio seguro de nombre/teléfono en **Mi cuenta**, recalculando slug y phoneKey sin intentar borrar índices inexistentes.

## Reglas mantenidas

- No mostrar precios demo como si fueran propios.
- No publicar productos sin precio válido.
- La app interna sigue usando el catálogo amplio; la web pública solo muestra lo publicable.
- Si la web está en modo starter o con precios pendientes, muestra preparación y CTA WhatsApp.

## No toca

- Registro/Login.
- Firebase/Auth profundo.
- Web premium service profundo; solo se agrega payload público sanitizado para la vidriera.
- Precios internos.
- Crear oferta.
- Oferta rápida.
- Oferta con descuentos.
- Vender urgente.
- WhatsApp interno.
- Panel Admin.
- Firestore rules.
