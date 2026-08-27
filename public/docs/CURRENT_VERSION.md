# AppPromos — Versión actual

## V12.20 — Vender urgente de punta a punta

V12.20 convierte **Vender urgente** en un flujo completo para sacar mercadería hoy:

- el carnicero busca y elige únicamente los productos que necesita vender;
- ajusta cantidades y descuento con un resumen económico en vivo;
- AppPromos calcula localmente sobre precios reales, sin depender del backend opcional;
- la oferta puede enviarse por WhatsApp o publicarse como **Promo del día**;
- las Promos del día aparecen destacadas en la web pública, admiten carrito y pedido por WhatsApp;
- vencen al terminar el día en Argentina o pueden finalizarse anticipadamente desde **Publicadas hoy**.

Las publicaciones diarias se almacenan en `state.dailyPromos`, separadas de `savedCombos`. El snapshot público expone solamente `dailyOffers` sanitizadas. Finalizar una oferta la conserva internamente con estado `ended`, pero la retira inmediatamente de la web.

La alternativa V12.20-B de armar complementos urgentes fue descartada: si el carnicero necesita sacar mercadería de inmediato, el flujo debe ser corto y directo.

QA integral local: **OK**. Sin errores rojos. Base de desarrollo: V12.19-A en `bbe1f73`.

## V12.19-A — Tres maneras de vender

AppPromos diferencia claramente tres trabajos comerciales:

- **Responder una consulta:** respuesta puntual por WhatsApp; no se guarda.
- **Vender urgente:** salida excepcional de mercadería en riesgo; no se guarda como combo permanente.
- **Crear promo o combo:** estrategia reutilizable que se guarda, publica y comparte.

Esta etapa actualiza UX, copy y CTA sin modificar modelos, persistencia, Firebase, BusinessStore, snapshot público, carrito ni WhatsApp.

FIX1 incorpora Vender urgente como tercera opción del selector y deja la navegación inferior mobile en: **Inicio · Precios · Vender · Promos · Más**. El panel general de WhatsApp continúa disponible dentro de “Más”.

FIX1-A conecta esa tarjeta directamente con el flujo de Vender urgente, sin volver a mostrar el menú general de Carniza. El avatar de Carniza conserva su menú completo.

Base estable: V12.18 cerrada en `83d0b2d`.

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
