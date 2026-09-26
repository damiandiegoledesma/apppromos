# Carnis.app — Capturas Maestras V1

Biblioteca oficial de capturas del producto real. Para representar Carnis en la landing, anuncios,
ayuda o tutoriales se usan **solo** estas capturas. No se generan interfaces ficticias.

## Regla
Estas capturas no se editan para inventar producto. Se permite recortar, encuadrar, ocultar datos
personales, convertir y optimizar. No se cambian botones, textos, precios, funciones ni interfaces.

## Origen
- **Fecha:** 26/09/2026.
- **Código:** V12.29 RC5.6 + pack de marca Carnis V2.2 + rebranding mínimo V1.
- **Entorno:** el código real corriendo en un navegador de celular contra los emuladores de Firebase
  (auth, Firestore, storage). No es producción. Se aprobó usarlas como maestras porque muestran la
  interfaz exacta que genera el código, sin cambios.
- **Viewport:** 390 × 844 CSS px a densidad 3 (archivos de 1170 × 2532 px).
- **Única intervención:** se ocultó el cartel "ENTORNO QA LOCAL" que la app agrega sola en localhost.
- **Datos de prueba:** "Carnicería de Carniza", Venado Tuerto. Cuenta solo del emulador. Cliente del
  carrito "Juan", 3462 555555. No hay datos de personas reales.

## Contenido

### onboarding/
| Archivo | Muestra |
|---|---|
| carnis-onboarding-precios.webp | Paso 2: carga de precios vacía |
| carnis-onboarding-lista.webp | Paso 2: 11 precios cargados, búsqueda "asado" |
| carnis-onboarding-nombre.webp | Paso 3: nombre y localidad |
| carnis-vidriera-creada.webp | Vista previa de la vidriera al terminar el onboarding |
| carnis-onboarding-publicada.webp | "Tu carnicería ya está online" |

### storefront/
| Archivo | Muestra |
|---|---|
| carnis-vidriera-inicio.webp | Vidriera publicada: inicio |
| carnis-vidriera-promos.webp | Vidriera publicada: promos, con el combo ya recalculado |
| carnis-vidriera-productos.webp | Productos, con 3 agregados al pedido |
| carnis-carrito.webp | Carrito con 3 ítems, total $63.000 |

### selling/
| Archivo | Muestra |
|---|---|
| carnis-app-inicio.webp | Inicio del carnicero |
| carnis-vender-opciones.webp | Menú Vender: responder consulta, crear promo o combo, Promo del día |
| carnis-crear-promo.webp | Armado de "Combo parrillero": resumen y mensaje |
| carnis-promo-guardada.webp | Promo guardada y publicada: $78.400 |
| carnis-precio-cambiado.webp | Asado del Medio de $23.500 a $25.000: "Guardado · 1 promo actualizada" |
| carnis-promo-recalculada.webp | La misma promo recalculada: $81.200 |

La secuencia guardada → precio cambiado → recalculada es una sola prueba real, hecha en ese orden.

### whatsapp/
- carnis-pedido-whatsapp.txt: texto exacto que genera el carrito de `carnis-carrito.webp`.
  La pantalla de WhatsApp no está incluida: tiene que salir de un celular real.

### landing/
Recortes de las capturas de arriba que usa la Landing 2 (780 px de ancho).

## Pendiente
- Vidriera de A La Estaca: las capturas actuales todavía muestran AppPromos. Se reemplazan cuando
  el rebranding esté en producción.
- Entraña aparece sin foto porque falta `assets/cortes/novillo/entraña.webp` en el repo.
