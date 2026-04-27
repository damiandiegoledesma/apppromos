# V11.4.2 — Header Inteligente Unificado

**Proyecto:** AppPromos  
**Estado:** Especificación funcional previa al patch  
**Base estable:** V11.4.1B FULL  
**Diseño base aprobado:** Propuesta 1  
**Objetivo:** convertir el header del usuario final en una botonera de venta rápida, simple y mobile-first.

---

## 1. Principio central

AppPromos no debe sentirse como un sistema administrativo para el carnicero.

Debe sentirse como:

> **Toco y vendo.**

El usuario final no entra a revisar datos técnicos ni configuraciones. Entra a vender desde el celular, rápido, mientras atiende, cobra, corta carne o responde mensajes.

Por eso, el header del usuario final debe priorizar el corazón comercial visible de la app:

```txt
Precios → Ofertas → WhatsApp
```

Todo lo demás existe, pero debe ocupar el menor espacio posible.

---

## 2. Diferencia entre vista cliente y vista Admin

### 2.1 Usuario final / carnicero

La interfaz debe ser simple, directa y vendedora.

Prioridad visual:

```txt
1. Precios
2. Ofertas
3. WhatsApp
```

Elementos secundarios:

```txt
- Inicio
- Más
- Estado comercial
- Usuario
- Empresa activa
- Salir
```

Regla:

> Todo lo que no ayuda a vender en ese momento debe ocupar el menor espacio posible.

### 2.2 Admin

La vista Admin no tiene que seguir la misma lógica visual que el cliente.

Admin debe sentirse más como:

```txt
Planilla / tabla / filtros / control
```

El Admin necesita entender:

```txt
- empresa
- localidad
- plan
- estado
- acceso
- guardado
- trial
- acción sugerida
```

Por eso, los estados en Admin deben tener ayuda visual y explicación.

---

## 3. Header usuario final — estructura propuesta

### 3.1 Nivel 1 — Contexto mínimo

Debe mostrar:

```txt
AppPromos
Vendé más rápido
Carnicería activa
Estado comercial simple
```

Ejemplo:

```txt
AppPromos
Vendé más rápido

Carnicería Norte
✅ Al día
```

Este nivel informa, pero no debe competir con las acciones principales.

---

### 3.2 Nivel 2 — Botonera de venta rápida

Este es el corazón del header.

Botones principales:

```txt
⚡ Precios
🔥 Ofertas
📲 WhatsApp
```

Estos botones deben sentirse más importantes que el resto.

Objetivo:

```txt
Cambiar precio
↓
Armar oferta
↓
Mandar WhatsApp
↓
Vender
```

### 3.3 Acciones secundarias

```txt
🏠 Inicio
⋯ Más
```

Inicio debe estar disponible, pero no ser protagonista comercial.

Más debe agrupar funciones secundarias.

---

## 4. Acciones rápidas visibles

### Botones visibles recomendados

```txt
Inicio
Precios
Ofertas
WhatsApp
Más
```

### Jerarquía visual

Más importantes:

```txt
Precios
Ofertas
WhatsApp
```

Secundarios:

```txt
Inicio
Más
```

### Texto final recomendado

```txt
⚡ Precios
🔥 Ofertas
📲 WhatsApp
```

Se evita usar lenguaje técnico o nombres internos de módulos.

---

## 5. Contenido de “Más”

Propuesta inicial:

```txt
- Guardados
- Competencia
- Mi Web
- Admin
```

A futuro puede incluir también:

```txt
- Carniza
```

Aunque la opción aprobada para Carniza es botón flotante abajo a la derecha, también puede tener acceso secundario desde “Más” si conviene.

---

## 6. Estados visibles para usuario final

Los estados deben mostrarse con etiquetas simples, cortas y comerciales.

### Estados aprobados

```txt
✅ Al día
🎁 Prueba
⏳ Por vencer
⚠️ Pendiente
🔒 Pausado
```

---

### 6.1 ✅ Al día

Significa:

```txt
La empresa tiene acceso habilitado y el pago regularizado.
Puede entrar, consultar y guardar normalmente.
```

Texto usuario final:

```txt
Todo listo para vender.
```

Admin debe mostrar:

```txt
Estado: Al día
Acceso: habilitado
Consulta: sí
Guardado: sí
Acción sugerida: ninguna
```

---

### 6.2 🎁 Prueba

Significa:

```txt
La carnicería está usando el período de prueba.
Todavía puede usar todo normalmente.
```

Texto usuario final:

```txt
Estás probando AppPromos.
```

Admin debe mostrar:

```txt
Estado: Prueba
Acceso: habilitado
Consulta: sí
Guardado: sí
Acción sugerida: seguimiento comercial
```

---

### 6.3 ⏳ Por vencer

Significa:

```txt
La prueba está cerca de terminar.
Todavía puede usar todo, pero conviene avisar.
```

Texto usuario final:

```txt
Tu prueba termina pronto.
```

Admin debe mostrar:

```txt
Estado: Por vencer
Acceso: habilitado
Consulta: sí
Guardado: sí
Acción sugerida: contactar / ofrecer plan
```

---

### 6.4 ⚠️ Pendiente

Significa:

```txt
Hay pago pendiente o la prueba venció.
Puede entrar y consultar, pero no puede guardar cambios.
```

Texto usuario final:

```txt
Podés mirar, pero para guardar necesitás regularizar.
```

Admin debe mostrar:

```txt
Estado: Pendiente
Acceso: habilitado
Consulta: sí
Guardado: no
Acción sugerida: cobranza / regularizar pago
```

---

### 6.5 🔒 Pausado

Significa:

```txt
El acceso operativo está pausado.
No puede operar módulos, pero debe tener salida clara y WhatsApp.
```

Texto usuario final:

```txt
Escribinos y te ayudamos a reactivar.
```

Admin debe mostrar:

```txt
Estado: Pausado
Acceso: limitado
Consulta: limitada
Guardado: no
Acción sugerida: revisar / reactivar
```

---

## 7. Regla global de estados

### Usuario final

```txt
Etiqueta corta + mensaje simple orientado a vender.
```

### Admin

```txt
Etiqueta + explicación + qué permite + acción sugerida.
```

Esta regla debe aplicarse globalmente en AppPromos.

---

## 8. Modos visuales comerciales

V11.4.2 puede dejar preparada la base visual para estados.

### 8.1 Normal / Al día

```txt
Tema claro
badge verde suave
mensaje mínimo
```

### 8.2 Prueba

```txt
tono cálido suave
badge de prueba
sin urgencia
```

### 8.3 Por vencer

```txt
amarillo / naranja suave
aviso visible pero amable
```

### 8.4 Pendiente

```txt
naranja / ámbar
botón WhatsApp visible
sin tono punitivo
```

### 8.5 Pausado

```txt
rojo suave / bordo controlado
mensaje claro
botón WhatsApp
botón Volver a Inicio
```

### 8.6 Modo nocturno

Queda como future posterior.

Regla futura:

```txt
Si hay estado comercial crítico, gana el estado comercial sobre el modo nocturno.
```

Prioridad futura:

```txt
1. Pausado
2. Pendiente / prueba vencida
3. Por vencer
4. Nocturno
5. Normal
```

---

## 9. Scroll del header

### Comportamiento aprobado

```txt
Arriba de todo:
header completo.

Al bajar:
header se oculta o compacta para liberar pantalla.

Al subir:
header vuelve a aparecer.

En módulos bloqueados:
siempre debe existir salida clara a Inicio.
```

### Recomendación

Para V11.4.2:

```txt
Ocultar al bajar
Mostrar al subir
Transición suave
No bloquear navegación
```

---

## 10. Mobile first

El diseño debe priorizar celular.

Reglas:

```txt
- botones grandes
- etiquetas cortas
- poco texto
- nada técnico
- no ocupar media pantalla
- fácil de tocar con el pulgar
- Precios / Ofertas / WhatsApp como acciones centrales
```

La app debe sentirse usable en mostrador, no en escritorio de oficina.

---

## 11. Desktop

En desktop puede verse más completo, pero debe mantener la misma jerarquía:

```txt
Precios
Ofertas
WhatsApp
```

No convertirlo en un panel administrativo.

Admin sí puede tener estructura tipo planilla.

---

## 12. Reserva para Carniza

Carniza queda reservado como future.

Definición aprobada:

```txt
Carniza = vendedor interno de AppPromos dentro de la app.
```

No es chatbot técnico ni IA protagonista.

### Ubicación futura aprobada

```txt
Botón flotante abajo a la derecha.
```

Reglas:

```txt
- visible pero discreto
- no tapa botones de guardar
- no compite con Precios / Ofertas / WhatsApp
- no se activa en V11.4.2 salvo decisión expresa
```

Texto futuro sugerido:

```txt
¿Qué querés vender hoy?
```

Acciones futuras:

```txt
- Vender rápido
- Crear oferta
- Cambiar precios
- Mandar WhatsApp
- No puedo guardar
```

---

## 13. Qué NO debe aparecer al usuario final

Prohibido en UI cliente:

```txt
Firestore
backend
SaaS
tenant
billing
status técnico
core/state
businessId
write guard
session
deploy
hosting
API
Gemini
FastAPI
```

Estos términos quedan solo para documentación interna o desarrollo.

---

## 14. Qué NO debe tocar el patch V11.4.2

El patch del header no debe tocar:

```txt
- Firebase Rules
- resolveSession
- BusinessStore
- WriteGuardService salvo necesidad mínima
- backend_python
- .venv
- .sixth
- modelo DEMO/template
- catálogo base
- billing profundo
```

Debe ser un patch visual/controlado.

---

## 15. Criterio de aprobación del patch

Para aprobar V11.4.2:

### Cliente active / Al día

```txt
- ve header nuevo
- puede guardar precios
- puede guardar ofertas
- WhatsApp sigue funcionando
```

### Prueba

```txt
- ve estado simple
- puede operar normal
```

### Por vencer

```txt
- ve aviso suave
- puede operar normal
```

### Pendiente

```txt
- ve estado Pendiente
- puede consultar
- no puede guardar
- WhatsApp AppPromos visible
```

### Pausado

```txt
- ve estado Pausado
- módulos bloqueados
- no queda encerrado
- tiene Volver a Inicio
- tiene WhatsApp AppPromos
```

### Superadmin

```txt
- inicia en DEMO
- Admin sigue funcionando
- si entra como cliente ve la misma lógica comercial
```

---

## 16. Decisión final

Queda aprobado como criterio funcional:

```txt
V11.4.2 = Header Inteligente Unificado
Diseño base = Propuesta 1
Header cliente = botonera de venta rápida
Core visible = Precios → Ofertas → WhatsApp
Carniza = reservado como botón flotante futuro
Admin = camino futuro hacia tabla tipo planilla
```

---

## 17. Frase guía

> **El carnicero no entra a usar módulos. Entra a vender.**
