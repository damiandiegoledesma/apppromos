# Future — Biblioteca de Carniza

## Estado

Documento de planificación.

- No productivo.
- No main.
- No dev todavía.
- No deploy.
- Pensado para rama future.

## Objetivo

Crear una biblioteca central de Carniza para que AppPromos tenga mensajes, ayudas y acciones comerciales coherentes en toda la app.

Carniza no debe ser un texto suelto en cada pantalla.

Carniza debe tener una biblioteca viva de:

- frases;
- ayudas contextuales;
- próximos pasos sugeridos;
- mensajes de venta;
- microcopys;
- acciones rápidas;
- criterios de aparición;
- reglas de tono;
- límites.

## Frase madre

```txt
Carniza vende.
La Nelly cuida.
AppPromos acompaña.
```

## Rol de Carniza

Carniza es el ayudante comercial vendedor de AppPromos.

No es:

- chatbot técnico;
- soporte;
- decoración;
- IA protagonista;
- tutorial largo;
- vendedor invasivo;
- mascota que tapa la app.

Carniza ayuda al carnicero a vender más rápido.

## Regla central

```txt
Carniza aparece para vender.
```

## Qué debe lograr Carniza

Carniza debe ayudar a que el carnicero haga una acción concreta:

- actualizar precios;
- armar una oferta;
- vender urgente;
- mandar por WhatsApp;
- guardar una promo;
- revisar una oferta lista;
- ver su web;
- registrarse después de probar la demo.

Si no empuja a una acción útil, no aparece.

---

# 1. Principios de tono

## Carniza debe sonar

- simple;
- carnicero;
- vendedor;
- directo;
- positivo;
- compañero;
- rápido;
- útil.

## Carniza no debe sonar

- técnico;
- corporativo;
- académico;
- robótico;
- demasiado gracioso;
- invasivo;
- vendedor de humo;
- tutorial largo;
- IA que se luce.

## Lenguaje permitido

- vendamos;
- salí vendiendo;
- armemos una promo;
- mandala por WhatsApp;
- mové esto hoy;
- oferta lista;
- combo de hoy;
- promo especial;
- hasta agotar stock;
- cuidá margen;
- antes de picar.

## Lenguaje a evitar

- Firebase;
- Firestore;
- backend;
- SaaS técnico;
- endpoint;
- error de sistema;
- IA generativa;
- algoritmo;
- conversión funnel;
- liquidación hacia el cliente final;
- producto atrasado hacia el cliente final;
- mercadería clavada hacia el cliente final.

---

# 2. Regla interna / externa

Carniza puede hablarle distinto al carnicero y al cliente final.

## Lenguaje interno para el carnicero

Puede decir:

- Vender urgente;
- mover mercadería;
- sacar hoy;
- producto que se está quedando;
- vender antes de picar;
- cuidá margen.

## Lenguaje externo para el cliente final

No debe decir:

- liquidación;
- producto atrasado;
- hay que sacarlo;
- mercadería clavada;
- descarte;
- viejo.

Debe decir:

- oferta del día;
- promo especial;
- combo de hoy;
- oferta hasta agotar stock;
- precio especial;
- ideal para compartir.

## Regla

```txt
Internamente: urgencia.
Externamente: oportunidad.
```

---

# 3. Contextos principales

## A. Landing

Objetivo de Carniza:

- empujar a probar demo;
- empujar a registro gratis;
- explicar valor en pocas palabras;
- no abrir WhatsApp;
- no distraer del CTA principal.

### Mensaje base

```txt
Soy Carniza. Te muestro cómo vender una oferta en 3 toques.
```

### Acción principal

```txt
Probar demo
```

### Acción secundaria

```txt
Crear mi carnicería gratis
```

### Mensajes posibles

```txt
Probá AppPromos sin registro.
```

```txt
Elegís productos, armás la promo y la mandás por WhatsApp.
```

```txt
Primero probá cómo se vende. Después la hacemos tuya.
```

## B. Demo

Objetivo de Carniza:

- hacer que el usuario llegue rápido al momento de valor;
- mostrar que AppPromos vende;
- guiar sin explicar de más;
- empujar registro después de probar.

### Mensaje inicial

```txt
Probá tranquilo. Esta demo no toca tus datos reales.
```

### Mensaje comercial

```txt
Elegí productos y armamos una promo para mandar por WhatsApp.
```

### Después de crear oferta

```txt
La oferta ya está lista. Falta venderla.
```

### Después de tocar WhatsApp

```txt
Ahí está el valor: armás y mandás sin perder tiempo.
```

### CTA post demo

```txt
¿Te gustó? Creá tu carnicería gratis, cargá tus precios y salí vendiendo.
```

## C. Inicio de app

Objetivo de Carniza:

- orientar al carnicero;
- no ocupar el centro si no hace falta;
- sugerir acción comercial inmediata.

### Mensaje base

```txt
¿Qué querés vender hoy?
```

### Acciones

- Crear oferta;
- Vender urgente;
- Actualizar precios.

### Mensajes posibles

```txt
Si ya tenés precios cargados, armamos una promo.
```

```txt
Si hay algo que se está quedando, lo movemos hoy.
```

```txt
Primero poné precio a lo que vendés. Lo que queda en 0 no aparece en tu web.
```

## D. Cambiar precios

Objetivo de Carniza:

- ayudar a entender la relación precios → ofertas → web;
- no tapar la edición;
- empujar a guardar cambios.

### Mensaje base

```txt
Poné precio a lo que vendés. Lo que queda en 0 no aparece en tu web.
```

### Si hay cambios pendientes

```txt
Tenés cambios sin guardar. Guardalos y seguimos vendiendo.
```

### Después de guardar

```txt
Listo. Con estos precios ya podés armar ofertas más claras.
```

### Acción sugerida

- Crear oferta;
- Ver mi web;
- Seguir cambiando precios.

## E. Crear oferta

Objetivo de Carniza:

- ayudar a elegir modo;
- empujar el siguiente paso;
- reducir dudas.

### Selector de modo

```txt
Rápida si querés mandar ya. Con descuentos si querés ajustar mejor el precio.
```

### Oferta rápida

```txt
Elegí productos y mandamos la promo en segundos.
```

### Oferta con descuentos

```txt
Ajustá precio sin perder de vista el total final.
```

### Oferta lista

```txt
La oferta ya está lista. Falta venderla.
```

### Acción principal

```txt
Enviar por WhatsApp
```

## F. Vender urgente

Objetivo de Carniza:

- ayudar a mover producto rápido;
- internamente hablar de urgencia;
- externamente generar oportunidad atractiva.

### Mensaje inicial

```txt
Elegí qué querés mover hoy.
```

### Mensaje durante el flujo

```txt
Bajamos un poco el precio y lo convertimos en una promo atractiva.
```

### Oferta lista

```txt
Oferta lista. Al cliente le llega como oportunidad, no como liquidación.
```

### Mensaje externo sugerido

```txt
OFERTA DEL DIA

- 1 kg Asado
- 1 kg Chorizos

Total: $ 35.900

Hasta agotar stock.
```

### Regla

No usar “Liquidación” en WhatsApp al cliente final.

## G. Promos guardadas

Objetivo de Carniza:

- ayudar a repetir ventas;
- recuperar promos dormidas;
- empujar WhatsApp.

### Mensaje base

```txt
Tenés promos guardadas para volver a vender rápido.
```

### Si hay promo lista sin enviar

```txt
Hay una promo lista. Falta mandarla.
```

### Acciones

- Enviar por WhatsApp;
- Repetir promo;
- Editar;
- Crear nueva.

## H. Web propia

Objetivo de Carniza:

- mostrar efecto wow;
- empujar actualización de precios;
- explicar sin tecnicismo que productos sin precio no aparecen.

### Primer ingreso después del registro

```txt
Ya tenés tu web propia.
```

```txt
Ahora cargá tus precios reales y salís vendiendo.
```

### Regla de publicación

```txt
Solo mostramos en tu web los productos que tienen precio.
```

### Acciones

- Ver mi web;
- Actualizar precios;
- Crear oferta.

## I. Admin

En Panel Admin, Carniza no debe aparecer como vendedor genérico.

Opciones:

- ocultarse;
- aparecer solo como ayuda contextual administrativa;
- no competir con datos, cobranzas ni acciones.

### Mensaje permitido en Admin

```txt
El Panel Admin es para mirar clientes, detectar riesgo y actuar rápido.
```

### Mensaje a evitar

```txt
¿Qué querés vender hoy?
```

En Admin, vender no es la intención principal.

---

# 4. Relación con La Nelly

Carniza y La Nelly no deben competir.

## Regla

```txt
Si aparece La Nelly, Carniza se guarda.
```

## Carniza

Aparece cuando el foco es:

- vender;
- crear oferta;
- mandar WhatsApp;
- mover mercadería;
- activar demo;
- actualizar precios;
- ver web.

## La Nelly

Aparece cuando el foco es:

- pago pendiente;
- acceso pausado;
- prueba vencida o por vencer;
- regularización;
- cuenta;
- continuidad.

## Mensaje de La Nelly

```txt
Lo resolvemos por WhatsApp y seguís vendiendo tranquilo.
```

---

# 5. Estados de Carniza

## Estado pasivo

Carniza está disponible, pero no invade.

Ejemplo:

```txt
Carniza
```

## Estado sugerente

Carniza propone una acción.

```txt
¿Armamos una promo?
```

## Estado urgente

Carniza empuja Vender urgente.

```txt
Movamos eso hoy.
```

## Estado oferta lista

Carniza detecta que falta enviar.

```txt
La oferta ya está lista. Falta mandarla.
```

## Estado onboarding

Carniza guía el primer uso.

```txt
Te muestro cómo vender en 3 toques.
```

## Estado demo conversión

Carniza empuja registro después del valor.

```txt
Si te gustó, la hacemos tuya.
```

---

# 6. Señales que puede leer Carniza

Primera etapa simple:

- pantalla actual;
- modo de oferta;
- productos seleccionados;
- oferta generada;
- WhatsApp enviado o no enviado;
- cambios de precio pendientes;
- demo o usuario real;
- estado de acceso;
- estado de pago;
- web disponible;
- usuario en registro;
- usuario en landing.

Futuro:

- última actividad;
- frecuencia de uso;
- ofertas creadas;
- WhatsApps enviados;
- Vender urgente usado;
- promociones guardadas;
- hitos;
- salud del cliente.

---

# 7. Biblioteca de mensajes

## Mensajes cortos generales

```txt
Vendamos algo.
```

```txt
Armemos una promo.
```

```txt
Movamos esto hoy.
```

```txt
La oferta ya está lista.
```

```txt
Falta mandarla por WhatsApp.
```

```txt
Cargá tus precios y salís vendiendo.
```

```txt
Lo que queda en 0 no aparece en tu web.
```

## Mensajes para acción

```txt
Crear oferta
```

```txt
Vender urgente
```

```txt
Enviar por WhatsApp
```

```txt
Actualizar precios
```

```txt
Ver mi web
```

```txt
Guardar promo
```

## Mensajes de cuidado comercial

```txt
No hace falta explicar todo. Primero vendé.
```

```txt
Menos vueltas. Más mostrador.
```

```txt
Si ya está lista, mandala.
```

```txt
Cuidá margen, pero no dejes que se quede.
```

## Mensajes para demo

```txt
Probá sin registro.
```

```txt
Estos datos son de demo.
```

```txt
Si te gustó, creá tu carnicería gratis.
```

```txt
Después cargás tus precios reales y salís vendiendo.
```

## Mensajes para web

```txt
Tu vidriera ya está activa.
```

```txt
Mostrá solo lo que tiene precio.
```

```txt
Poné precio a lo que vendés.
```

```txt
Lo demás queda guardado, pero no se publica.
```

## Mensajes para Vender urgente

```txt
Elegí qué querés mover hoy.
```

```txt
Lo convertimos en una promo atractiva.
```

```txt
Al cliente le llega como oportunidad.
```

```txt
Oferta lista para mandar.
```

---

# 8. Acciones sugeridas por contexto

## Landing

- Probar demo;
- Crear mi carnicería gratis.

## Demo

- Crear oferta;
- Vender urgente;
- Ver web demo;
- Crear mi carnicería gratis.

## Inicio

- Actualizar precios;
- Crear oferta;
- Vender urgente.

## Precios

- Guardar cambios;
- Crear oferta;
- Ver mi web.

## Oferta rápida

- Revisar oferta;
- Enviar por WhatsApp.

## Oferta con descuentos

- Ajustar total;
- Guardar promo;
- Enviar por WhatsApp.

## Vender urgente

- Elegir producto;
- Generar oferta;
- Enviar por WhatsApp.

## Web

- Ver mi web;
- Actualizar precios;
- Crear oferta.

## Admin

- No usar Carniza vendedor genérico;
- solo ayuda contextual si suma.

---

# 9. Reglas de implementación futura

## No hardcodear frases por todos lados

Evitar tener textos de Carniza dispersos en muchos módulos sin control.

Mejor futuro:

```js
CarnizaLibrary.getMessage(context, state)
CarnizaLibrary.getActions(context, state)
```

## Contextos posibles

```js
"landing"
"demo"
"dashboard"
"prices"
"offer_quick"
"offer_discount"
"urgent"
"saved_promos"
"web"
"admin"
"billing"
```

## Estados posibles

```js
"idle"
"first_use"
"editing"
"pending_changes"
"offer_ready"
"whatsapp_pending"
"trial"
"blocked"
"payment_pending"
"success"
```

## Salida esperada

```js
{
  title: "Carniza",
  message: "La oferta ya está lista. Falta mandarla.",
  primaryAction: {
    label: "Enviar por WhatsApp",
    action: "send_whatsapp"
  },
  secondaryAction: {
    label: "Ajustar",
    action: "edit_offer"
  }
}
```

---

# 10. Qué NO debe hacer Carniza

Carniza no debe:

- tapar botones importantes;
- tapar precios;
- tapar WhatsApp;
- aparecer si La Nelly está resolviendo cuenta;
- hablar en lenguaje técnico;
- explicar Firebase;
- prometer IA real si no existe;
- decir que vende solo si requiere acción del carnicero;
- transformar la app en chat;
- generar ruido en Admin;
- usar “liquidación” hacia el cliente final;
- inventar métricas;
- inventar clientes;
- hacer claims falsos.

---

# 11. Criterios de aceptación futura

La Biblioteca de Carniza será útil si:

- todos los módulos usan tono coherente;
- Carniza aparece menos, pero mejor;
- cada aparición tiene acción clara;
- no compite con La Nelly;
- no tapa el flujo sagrado;
- mejora demo → registro;
- mejora oferta → WhatsApp;
- mejora precios → web;
- ayuda a vender en menos pasos;
- no se vuelve soporte técnico.

---

# 12. Frase final

Carniza no está para hablar.

Carniza está para ayudar a vender.
