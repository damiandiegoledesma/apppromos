# CHANGELOG

## V12.23.3 — Instalación e identidad de la carnicería online

- Unifica el CTA de instalación como `INSTALAR` en landing, aplicación y menú mobile.
- Muestra `INSTALADA` cuando AppPromos se ejecuta como PWA o el navegador registró su instalación.
- Actualiza inmediatamente los accesos al completarse una instalación.
- Informa que AppPromos ya está instalada si el usuario vuelve a pulsar el acceso.
- Aplica una espera de siete días después de rechazar la invitación automática.
- Actualiza la identificación del service worker sin agregar caché offline.
- Agrega en Inicio un aviso no bloqueante cuando faltan logo, foto del frente o ambos.
- Abre directamente la edición de identidad desde `Completar ahora`.
- Oculta el aviso al completar ambas imágenes y lo excluye para superadmin y demo.
- Personaliza el título de la web pública con el nombre real de la carnicería.
- Utiliza el logo publicado como favicon y el icono de AppPromos como respaldo.
- No modifica Firebase, Firestore, autenticación, billing, BusinessStore ni estructuras de datos.
- QA local de los ajustes visibles: **OK**. Cooldown validado por código sin QA manual.

## V12.23.2 — Cierre mobile, carrito y retiro de demo pública

- Agrega Inicio a la navegación pública inferior y consolida seis accesos: Inicio, Buscar, Promos, Hoy, Carrito y WhatsApp.
- Conserva el carrito flotante y ajusta su convivencia con Carniza en tablet y escritorio.
- Evita superposiciones sobre el checkout y restaura ambos elementos al salir de esa sección.
- Permite mostrar públicamente Novillo como Novillo, Ternera, Vaca o un nombre personalizado, sin cambiar la categoría interna.
- Propaga el alias público al snapshot, filtros, títulos, carrito y pedido de WhatsApp.
- Agrega consentimiento para recordar solamente nombre y teléfono del comprador en el dispositivo.
- Incorpora `Olvidar mis datos` y mantiene fuera del almacenamiento dirección, entrega, pago, carrito y pedidos.
- Agrega `Ver productos` al carrito vacío y confirmación visual/accesible al incorporar artículos.
- Mantiene cantidades de productos en pasos de 0,5 kg y promociones en unidades enteras.
- Retira `Probar demo sin registro` y desactiva la sesión ficticia asociada a `app.html?demo=1`.
- Impide que invitados reciban o lean el tenant `demo`.
- Reserva el tenant técnico `demo` únicamente para el arranque y operación del superadmin.
- Evita que la navegación interna aparezca en la pantalla pública de ingreso o registro.
- Actualiza las reglas de Firestore para eliminar la lectura pública de `businesses/demo` y sus subdocumentos.
- Conserva Firebase Auth, BusinessStore, WriteGuard, billing, aislamiento multi-tenant y datos históricos.
- QA local de FIX E, F, G, H y retiro de DEMO pública: **OK**.

## V12.20 — Vender urgente de punta a punta

- Reemplaza las tarjetas completas de productos por búsqueda primero y lista completa opcional.
- Permite seleccionar uno o varios productos reales, ajustar cantidades de 0,5 en 0,5 y quitarlos antes de calcular.
- Agrega resumen económico en vivo con precio de lista, ahorro, total calculado y total comercial redondeado.
- Hace el cálculo urgente local y determinista, sin depender del backend Python opcional.
- Elimina la incorporación automática de productos gancho o complementarios no elegidos.
- Conserva en Python las cantidades indicadas por el usuario para mantener paridad de contrato.
- Agrega regreso desde el resultado para corregir la selección y el cálculo.
- Permite enviar o copiar la Oferta del día por WhatsApp sin guardarla como combo permanente.
- Agrega **Publicar por hoy en mi carnicería** y admite varias publicaciones diarias.
- Persiste publicaciones privadas en `state.dailyPromos`, sin modificar `savedCombos`.
- Agrega `dailyOffers` sanitizadas al snapshot público y coordina ambas escrituras mediante batch.
- Muestra **Promos del día** destacadas en la web pública, con detalle, precio, carrito y pedido por WhatsApp.
- Oculta publicaciones vencidas al finalizar el día en `America/Argentina/Buenos_Aires`.
- Agrega **Publicadas hoy** con acción **Finalizar** para errores o stock agotado.
- Al finalizar, cambia el estado a `ended`, registra fecha/motivo y retira la oferta inmediatamente del snapshot público.
- Mantiene Demo como simulación local y aplica `WriteGuardService` a escrituras reales.
- Descarta V12.20-B: no se agrega planificación de complementos al flujo urgente.
- QA A, C1, C2, C3 e integral: **OK**, sin errores rojos.

## V12.19-A — Tres maneras de vender

- Renombra **Oferta rápida** como **Responder una consulta** y aclara que es una acción puntual que no se guarda.
- Renombra **Oferta con descuentos** como **Crear promo o combo** y la presenta como estrategia reutilizable para guardar, publicar y compartir.
- Mantiene **Vender urgente** como acción excepcional y aclara que no se guarda como combo permanente.
- Actualiza accesos desktop/mobile, menú de Carniza, Inicio, CTA y ayudas contextuales.
- Conserva los modos internos `quick` y `discount` y toda la lógica existente.
- No modifica Firebase, Firestore rules, BusinessStore, billing, control de acceso, snapshot público, web pública, carrito ni modelos de datos.
- FIX1: agrega **Vender urgente** como tercera opción visible de “Tres maneras de vender”.
- FIX1: reemplaza el acceso inferior general de WhatsApp por **Promos** y mueve WhatsApp al menú “Más”.
- FIX1-A: la tarjeta **Vender urgente** abre directamente el flujo urgente, sin el menú intermedio de Carniza.

## V12.13-A — Web pública autogenerada mobile-first

- Rediseña `public/web.html` como vidriera pública mobile-first.
- Mejora la estética de la Web de Arranque creada desde el alta de carnicerías.
- Compacta el hero, CTA WhatsApp, ofertas activas y lista de precios para celulares Android gama media/entrada.
- Mejora el estado “Lista de precios en preparación” con mensaje humano y CTA a WhatsApp.
- Mantiene la regla: no publicar productos sin precio válido y no mostrar datos demo como propios.
- Mantiene compatibilidad con `web.html?slug=...`, `publicWebSlugs`, ofertas seleccionadas y lista de precios real cuando esté confirmada.
- No toca registro, Auth, precios, ofertas, Vender urgente, Panel Admin ni Firebase rules.
- FIX1: la web pública por slug renderiza desde `publicWebSlugs/{slug}` con datos sanitizados, sin leer `businesses/...` para visitantes anónimos.
- FIX1: `Mi Web` y el registro generan payload público seguro con ofertas/productos publicables y sin datos internos.
- FIX2: al cambiar nombre o teléfono desde **Mi cuenta**, se recalcula el slug/phoneKey y se regeneran los índices públicos seguros.
- FIX2: evita `Missing or insufficient permissions` por intentar borrar `publicWebSlugs` o `publicPhoneKeys` viejos inexistentes o desincronizados.

## V12.13-B-FIX1 — Resumen de descuentos sobre Carniza

- Corrige un solapamiento mobile donde Carniza podía tapar el total con descuento del resumen flotante.
- Eleva el resumen flotante de **Oferta con descuentos** para que el total final quede visible.
- Agrega más espacio inferior a la pantalla de ajuste de descuentos.
- No toca cálculo, redondeo, WhatsApp, Oferta rápida, Vender urgente, Registro, Web ni Panel Admin.


## V12.13-B — Oferta con descuentos mobile compacta

- Compacta la pantalla mobile de **Oferta con descuentos**.
- Reemplaza la grilla ancha de productos con descuento por cards mobile-first.
- Deja visibles cantidad, descuento individual, descuento aplicado y precio final por producto.
- Agrega botones `−` y `+` para descuento individual por producto.
- Agrega botones `−` y `+` al descuento general.
- Mantiene resumen vivo, cálculo, redondeo, guardado y WhatsApp sin cambios de lógica.
- No toca Oferta rápida, Vender urgente, Registro, Web ni Panel Admin.

# Changelog AppPromos

## V12.12-E-FIX2 — Vender urgente sobre resúmenes flotantes

- Corrige un problema mobile donde un resumen flotante podía quedar por encima del modal de Carniza.
- Eleva el overlay de Carniza para que Vender urgente no quede tapado por la botonera inferior ni por resúmenes de otros flujos.
- Al abrir Vender urgente directo desde la botonera, el modal se posiciona correctamente.
- Al armar oferta urgente, la pantalla final **Oferta lista** queda visible para llegar al botón WhatsApp.
- No toca Oferta rápida, Oferta con descuentos, cálculo, redondeo, guardado, registro, web ni Panel Admin.

# CHANGELOG AppPromos

## V12.12-E-FIX1 — Restaurar Vender urgente + buscadores fluidos

- Corrige el bloque V12.12-E antes de commit.
- Restaura **Vender urgente** desde la botonera mobile para que abra directo el flujo urgente de Carniza.
- Al generar oferta urgente, desplaza la vista hacia la pantalla final para llegar mejor a **Enviar por WhatsApp**.
- Evita que los buscadores de **Oferta rápida** y **Oferta con descuentos** pierdan foco al escribir en mobile.
- Mantiene buscador primero, selector de rubro compacto, Oferta rápida, Oferta con descuentos, redondeo, guardado y WhatsApp.
- No toca registro, Web de Arranque, Web pública, Precios ni Panel Admin profundo.


## V12.12-E — Ofertas mobile: búsqueda primero, rubros sin amontonar

- Mejora la selección de productos en **Oferta rápida** y **Oferta con descuentos** para celulares.
- Reemplaza los chips horizontales de rubro por un selector compacto de rubro opcional.
- Prioriza el buscador como camino principal para encontrar cortes/productos.
- Mantiene productos sugeridos para arrancar en Oferta rápida.
- Evita que los rubros se amontonen o empujen el ancho de pantalla en mobile.
- Mantiene intactos cálculo, redondeo, WhatsApp, guardado, Vender urgente, Mi cuenta, Web de Arranque y Panel Admin profundo.

## V12.12-D-FIX1 — Inicio autoresponsive mobile

- Corrige que al volver a **Inicio** en mobile el contenido pueda desbordar el ancho de pantalla.
- Ajusta app, paneles y body para evitar overflow horizontal en celulares.
- Limita la botonera inferior al ancho real del viewport para que no quede más ancha que la pantalla.
- Reubica Carniza dentro del área visible y arriba de la botonera inferior.
- Compacta Inicio en mobile: cards, acciones rápidas, recorrido sugerido y resumen operativo se adaptan sin empujar elementos fuera de pantalla.
- Mantiene intactos Mi cuenta, Precios, Crear oferta, Oferta rápida, Oferta con descuentos, Vender urgente, WhatsApp, Web de Arranque y Panel Admin profundo.

## V12.12-D — Inicio limpio + Mi cuenta en Más

- Saca la ficha grande de **Datos del negocio activo** del cuerpo de Inicio.
- Mantiene Inicio enfocado en vender: acciones rápidas, recorrido sugerido y resumen operativo.
- Agrega **Más → Mi cuenta** como lugar natural para datos del negocio y cuenta.
- Muestra en Mi cuenta datos humanos: carnicería, responsable, email, WhatsApp, dirección, localidad, plan, estado y web.
- Permite editar datos básicos del negocio desde Mi cuenta sin volver a ensuciar Inicio.
- Mantiene intactos botonera inferior, header compacto, Precios, Crear oferta, WhatsApp, Vender urgente, Web de Arranque y Panel Admin profundo.

## V12.12-C — Header compacto + modo foco mobile

- Compacta el header en mobile para teléfonos Android gama media/entrada.
- Mantiene la botonera inferior como navegación principal mobile.
- Oculta el header en pantallas de acción concreta: Cambiar precios, Crear oferta y WhatsApp.
- Libera espacio útil para que Oferta rápida, Oferta con descuentos y precios no queden aplastados por el encabezado.
- Mantiene Carniza arriba de la botonera inferior.
- No toca registro, Web de Arranque, Web pública, lógica de ofertas, lógica de WhatsApp, Panel Admin profundo ni Firebase/Auth.

## V12.12-B-FIX4 — Oferta rápida: acción visible arriba del listado

- Corrige que en mobile el resumen de Oferta rápida aparezca sin la acción principal visible.
- Ubica **Ver oferta lista** junto al resumen, antes del buscador y la grilla de productos.
- Evita que el carnicero tenga que scrollear o buscar el botón para avanzar.
- Mantiene intactos la botonera inferior, Carniza, Oferta con descuentos, Vender urgente y WhatsApp.
- No toca registro, Web de Arranque, Panel Admin ni Firebase/Auth.

## V12.12-B-FIX3 — Oferta rápida: resumen en flujo visible

- Corrige que el resumen de **Oferta rápida** siga quedando tapado por la botonera inferior mobile.
- Cambia el resumen de Oferta rápida de barra fija inferior a tarjeta sticky dentro del flujo.
- Deja **Ver oferta lista** visible y accesible sin competir con la botonera.
- Mantiene intactos la botonera inferior, Carniza, Oferta con descuentos, Vender urgente y WhatsApp.
- No toca registro, Web de Arranque, Panel Admin ni Firebase/Auth.

## V12.12-B-FIX2 — Oferta rápida sobre botonera mobile

- Corrige que la botonera inferior mobile tape el botón **Ver oferta lista** de Oferta rápida.
- Sube el resumen flotante de Oferta rápida por encima de la botonera inferior.
- Agrega variable mobile específica para separar el resumen rápido de la botonera.
- Aumenta el padding inferior del listado de Oferta rápida para que no quede contenido tapado.
- Agrega margen inferior a la pantalla final de Oferta rápida para que **Enviar por WhatsApp** quede accesible.
- Mantiene intactos Vender urgente, Oferta con descuentos, Web de Arranque, registro, Panel Admin y lógica de WhatsApp.

## V12.12-B-FIX1 — Ajuste solapamientos mobile

- Corrige que Carniza quede debajo de la botonera inferior mobile.
- Define variables mobile compartidas para la altura de la botonera, margen flotante y margen sticky.
- Aumenta el padding inferior de la app en mobile para que el contenido no quede tapado.
- Reubica los resúmenes flotantes de Oferta rápida y Oferta con descuentos por encima de la botonera.
- Ajusta barras sticky inferiores dentro de Crear oferta para respetar la navegación mobile.
- No toca registro, Web de Arranque, Web pública, lógica de ofertas, lógica de WhatsApp ni Panel Admin profundo.

## V12.12-B — Botonera inferior base

- Implementa la primera botonera inferior mobile-first: Inicio, Precios, Vender, WhatsApp y Más.
- En mobile, oculta la navegación superior de módulos para evitar duplicación y llevar la navegación al pulgar.
- Agrega menú **Vender** con Oferta rápida, Oferta con descuentos y Vender urgente.
- Permite abrir Crear oferta directamente en modo rápido o modo descuentos desde la botonera.
- Agrega menú **Más** con Mi cuenta, Mi web, Ofertas guardadas, Competencia, Ayuda, Panel Admin si corresponde y Salir/Cerrar sesión.
- Mantiene la navegación actual en desktop/tablet grande.
- No toca registro, Web de Arranque, Web pública, lógica de WhatsApp, Panel Admin profundo ni Firebase/Auth.


## V12.12-A — Especificación mobile-first AppPromos

- Agrega documento de especificación mobile-first integral.
- Define como referencia de diseño celulares Android gama media/entrada usados por carniceros argentinos.
- Define botonera inferior base: Inicio, Precios, Vender, WhatsApp y Más.
- Define que Vender debe abrir: Oferta rápida, Oferta con descuentos y Vender urgente.
- Define que Más agrupa: Mi cuenta, Mi web, Ofertas guardadas, Competencia, Ayuda, Panel Admin si corresponde y Cerrar sesión.
- Define la regla UX: “La botonera mueve. Carniza orienta. El cuerpo vende.”
- Define criterios de header compacto, modo foco, Carniza contextual y La Nelly sin competencia visual.
- No implementa código ni toca flujos existentes.

## V12.11-D3 — Landing mobile acceso visible

- Mejora la primera vista mobile de la landing.
- Mantiene visible **Iniciar sesión** en mobile.
- Oculta solo **Cómo funciona** en la barra superior mobile para ahorrar espacio.
- Compacta el header para celulares Android gama media/entrada.
- Agrega enlace bajo el hero: “¿Ya tenés cuenta? Iniciar sesión”.
- Mantiene **Probar demo** y **Empezá gratis ahora** como acciones principales.
- No toca app interna, Web de Arranque, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-D2 — Carniza navegación segura

- Agrega en el menú de Carniza la acción **Volver a Inicio**.
- Agrega salida segura desde Carniza:
  - **Salir de la demo** cuando el usuario está en modo demo.
  - **Cerrar sesión** cuando el usuario está logueado.
- Mantiene en Carniza las acciones comerciales:
  - Armar oferta.
  - Vender urgente.
  - Ir a WhatsApp.
- Refuerza el criterio UX: Carniza ayuda a vender, pero también debe evitar que el carnicero se pierda.
- No toca registro, Web de Arranque, Cambiar precios, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-D1 — Activación Web de Arranque: guía para precios

- Agrega un tip dentro de **Cambiar precios** para explicar que solo los productos con precio real se publican.
- Explica al carnicero: a los productos que no vendés, poneles 0; AppPromos no los muestra en tu web.
- Retira el aviso/card de Web de Arranque del cuerpo principal de Inicio para no tapar el foco de venta.
- Deja pendiente llevar ese aviso a Carniza como mensaje contextual seguro, sin overlay bloqueante.
- No toca registro, web pública, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-C2 — Card simple de Web de Arranque en Inicio

- Se agrega una card simple de Carniza en Inicio para empresas con Web de Arranque pendiente de precios reales.
- La card muestra el mensaje “Ya tenés tu web propia” sin usar overlay, modal ni capa oscura.
- Se agrega botón “Actualizar mis precios” hacia el módulo de precios.
- Se agrega botón “Ver mi web” para abrir la URL pública generada.
- Se agrega botón “Ocultar por ahora” para ocultar la card durante la sesión.
- No se toca registro, web pública, Crear oferta, Vender urgente, WhatsApp ni Panel Admin.

## V12.11-B — Web de Arranque desde registro

- Se documenta el diagnóstico V12.11-A para Web automática desde registro.
- El registro crea Web de Arranque en modo `starter`.
- La web nace publicada de forma segura con identidad real, WhatsApp y slug propio.
- `publicWebSlugs` queda activo desde el alta para permitir URL pública.
- La web pública no muestra productos sin precio válido o con precio 0.
- La web pública no muestra lista de precios cuando `priceListStatus` está en `pending_real_prices`.
- Se evita publicar precios/ofertas demo como si fueran datos reales de la carnicería.
- No se toca Crear oferta, Vender urgente, WhatsApp, backend ni SQLite.
