# Future — Desposte / Rentabilidad de Media Res

**Proyecto:** AppPromos  
**Estado:** Future documentado, no productivo  
**Fecha:** 2026-05-05  
**Base estable actual:** `V12.13-C6-FIX precios e inicio mobile`  
**Commit base:** `aa2818c`  
**Rama sugerida:** `future/desposte-rentabilidad`  
**Archivo prototipo:** `desposte_v1.0_completo.html`

---

## 1. Decisión ejecutiva

Este future queda documentado como una evolución posible de AppPromos, pero **no se integra a producción ahora**.

La idea tiene valor real, pero abre un módulo nuevo de gestión/rentabilidad. AppPromos, en su etapa actual, debe seguir enfocada en:

```txt
Precios → Ofertas → Vender urgente → WhatsApp → Web propia simple
```

El módulo Desposte puede despertarse cuando el producto ya tenga uso real y aparezca una necesidad concreta de mirar margen por media res, rendimiento y rentabilidad.

---

## 2. Frase guía del future

```txt
AppPromos vende rápido.
Desposte te dice si vender te dejó plata.
```

O más carnicero:

```txt
¿Cuánto dejó esta media res?
```

---

## 3. Objetivo del módulo

Crear una herramienta para que el dueño o encargado de la carnicería pueda calcular la rentabilidad de una media res o desposte completo.

Debe ayudar a responder:

```txt
¿Cuánto pesó la media res?
¿Cuánto costó?
Qué cortes salieron.
Cuántos kilos se cargaron.
Cuánto se vende por corte.
Cuánto ingresaría en total.
Cuánta ganancia deja.
Qué margen real queda.
Qué historial tengo de despostes anteriores.
```

---

## 4. Problema que resuelve

En carnicería, vender mucho no siempre significa ganar bien.

El carnicero puede:

- comprar una media res;
- sacar cortes buenos;
- perder kilos en merma, grasa, hueso o evaporación;
- vender algunos cortes con buen margen;
- vender otros muy finos;
- no saber si el desposte cerró bien hasta mucho después.

Este módulo busca convertir ese cálculo en una herramienta simple.

---

## 5. Valor comercial para AppPromos

El módulo Desposte no es una herramienta para el mostrador rápido. Es una herramienta para dueño, gestión y rentabilidad.

Puede darle valor especialmente a planes altos:

```txt
SALVADOR:
- alertas simples de margen bajo;
- ayuda para vender antes de perder valor;
- vínculo con Vender urgente.

DUEÑO:
- desposte completo;
- histórico;
- estadísticas;
- rentabilidad por media res;
- conexión futura con precios, mercado y web.
```

También puede reforzar la promesa comercial de AppPromos:

```txt
No solo te ayudo a vender.
Te ayudo a entender si esa venta te dejó plata.
```

---

## 6. Encaje dentro de AppPromos

No debe vivir en Inicio como acción principal.

Ubicación futura sugerida:

```txt
Más
└─ Gestión / Herramientas del dueño
   └─ Cuenta del desposte
```

También podría aparecer dentro de un futuro panel de dueño o dentro del plan DUEÑO.

No debe competir con:

```txt
Cambiar precios
Crear oferta
Vender urgente
WhatsApp
```

---

## 7. Qué trae el prototipo V1.0

El prototipo actual `desposte_v1.0_completo.html` contiene:

### Pestañas

```txt
Nuevo
Histórico
Stats
```

### Pantalla Nuevo

```txt
Datos de la Media Res
Monitor de Peso
Desposte por rubros/cortes
Resumen Financiero
Guardar
Cancelar
```

### Monitor de peso

Incluye:

```txt
Kg ingresados
Kg disponible
Porcentaje de cobertura
Barra de progreso
Alerta al 80%
Alerta si excede el peso neto
```

Este punto es especialmente valioso porque evita cargar kilos imposibles o inconsistentes.

### Rubros/cortes incluidos

```txt
Gran Costillar
Mocho
Pulpas Delanteras
Costeletero
Osobucos
Pucheros
Mermas
```

### Mermas incluidas

```txt
Grasa de Pella
Hueso Blanco/Limpieza
Oreo / Evaporación
```

Incluir mermas es importante porque hace que el cálculo sea más realista.

---

## 8. Qué NO incluye por ahora

Este future no debe incluir ahora:

```txt
Integración con Firebase
Integración con Auth
Integración con BusinessStore
Reglas de seguridad Firestore
Publicación en producción
Navegación real dentro de app.html
Plan gating real
Reportes avanzados
Exportación PDF/Excel
IA/Carniza real
Backend Python
SQLite
```

El prototipo queda guardado como material conceptual, no como código productivo.

---

## 9. Riesgos si se implementa antes de tiempo

### Riesgo 1 — Agrandar AppPromos demasiado pronto

AppPromos todavía necesita consolidar el flujo principal:

```txt
Cambiar precios → Crear oferta → WhatsApp → Web propia
```

Agregar Desposte ahora puede abrir un frente grande y distraer.

### Riesgo 2 — Carga de datos más pesada

El módulo requiere cargar peso, costo, cortes, kilos y precios. Eso no es flujo de 3 toques.

Debe ser tratado como herramienta de gestión, no como venta rápida.

### Riesgo 3 — Mobile complejo

La pantalla actual muestra muchos cortes. Para celular real de carnicero argentino, una integración productiva debería ser más guiada.

### Riesgo 4 — Prototipo standalone

El archivo actual es HTML único con CSS y JS embebidos. Para producción debería modularizarse.

---

## 10. Ajustes conceptuales recomendados para una versión AppPromos real

### Nombre de módulo

Evitar nombres técnicos tipo `Stats`.

Opciones:

```txt
Cuenta del desposte
¿Cuánto dejó la media res?
Rentabilidad del desposte
Resumen del desposte
```

### Pestañas sugeridas

En lugar de:

```txt
Nuevo / Histórico / Stats
```

Usar:

```txt
Nuevo
Historial
Resumen
```

### Flujo más guiado

Para producción, conviene dividir en pasos:

```txt
1. Cargá peso y costo
2. Cargá cortes principales
3. Cargá mermas
4. Revisá margen
5. Guardar desposte
```

### Conexión con AppPromos

En una versión futura debería poder leer:

```txt
catálogo real de la carnicería
precios actuales
productos activos/no uso
rubros actuales
histórico de precios
```

Y luego sugerir acciones:

```txt
Actualizar precio
Armar oferta
Vender urgente
Revisar margen
```

---

## 11. Modelo de datos futuro sugerido

No implementar ahora. Solo referencia futura.

```js
businesses/{businessId}/despostes/{desposteId} = {
  businessId,
  createdByUid,
  createdAt,
  updatedAt,
  status: "draft" | "saved" | "archived",

  animalType: "novillo" | "vaca" | "ternera" | "otro",
  label: "Media res 05/05",

  input: {
    pesoKg: 100,
    costoKg: 18000,
    costoTotal: 1800000
  },

  totals: {
    kgIngresados: 96.5,
    kgDisponible: 3.5,
    coberturaPct: 96.5,
    ingresoTotal: 2400000,
    ganancia: 600000,
    margenPct: 25
  },

  cortes: [
    {
      rubro: "Gran Costillar",
      nombre: "Asado (Tira)",
      productoId: "optional_catalog_item_id",
      rendimientoEsperadoPct: 10,
      kg: 10,
      precioKg: 18000,
      ingreso: 180000,
      tipo: "venta"
    },
    {
      rubro: "Mermas",
      nombre: "Hueso Blanco/Limpieza",
      kg: 7.5,
      precioKg: 0,
      ingreso: 0,
      tipo: "merma"
    }
  ]
}
```

---

## 12. Reglas futuras de negocio

### Guardado

No guardar si:

```txt
kg ingresados = 0
kg ingresados supera peso neto sin confirmación fuerte
costo total inválido
```

### Alertas

```txt
80% del peso cargado = advertencia
100% = completo
más de 100% = error o confirmación fuerte
margen negativo = alerta
margen bajo = advertencia
```

### Planes

```txt
ARRANQUE:
No incluir.

SALVADOR:
Podría incluir lectura simple o alertas básicas.

DUEÑO:
Módulo completo con histórico y estadísticas.
```

---

## 13. Criterios para despertar este future

Despertar este future recién cuando se cumplan varias de estas condiciones:

```txt
1. AppPromos ya tiene usuarios reales usando precios/ofertas/WhatsApp.
2. Hay feedback real de dueños pidiendo entender margen o rendimiento.
3. Web Arranque y flujo de precios están estables.
4. Navegación mobile-first ya está más ordenada.
5. Pricing DUEÑO necesita un diferencial fuerte adicional.
6. El catálogo de productos/rubros está más estable.
```

No despertarlo por entusiasmo interno únicamente.

---

## 14. Roadmap futuro posible

### Fase 0 — Documentación

```txt
Guardar prototipo.
Guardar análisis.
No integrar.
```

### Fase 1 — Prototipo AppPromos no productivo

```txt
Convertir HTML standalone en módulo aislado.
Sin Firestore real.
Visible solo para superadmin/demo interna.
```

### Fase 2 — MVP del módulo

```txt
Guardar desposte por businessId.
Historial simple.
Resumen simple.
Sin reportes avanzados.
```

### Fase 3 — Conexión comercial

```txt
Leer precios actuales.
Detectar margen bajo.
Sugerir actualizar precio.
Sugerir Vender urgente para cortes complicados.
```

### Fase 4 — Plan DUEÑO

```txt
Histórico avanzado.
Comparativas.
Exportación.
Reportes de rentabilidad.
Conexión con Mercado/Competencia.
```

---

## 15. Archivos impactados si algún día se implementa

Posibles archivos/módulos futuros:

```txt
public/app.html
public/js/modules/desposte-module.js
public/js/services/desposte-service.js
public/styles/desposte.css
public/js/services/access-control-service.js
public/js/services/business-store.js
firestore.rules
public/docs/...
```

No tocar estos archivos ahora por este future.

---

## 16. Criterios de aceptación futura

Una primera versión integrada debería cumplir:

```txt
1. Solo aparece para plan habilitado o superadmin.
2. No rompe Inicio, Precios, Crear oferta ni WhatsApp.
3. Permite cargar peso/costo.
4. Permite cargar cortes y mermas.
5. Valida kg ingresados contra peso neto.
6. Calcula ingreso, ganancia y margen.
7. Guarda por businessId.
8. Muestra historial por carnicería.
9. Usa lenguaje carnicero, no técnico.
10. Funciona bien en celular, aunque sea un módulo de dueño.
```

---

## 17. Estado del prototipo adjunto

El archivo `desposte_v1.0_completo.html` queda guardado como prototipo standalone.

Reglas:

```txt
No es producción.
No se referencia desde index.html.
No se referencia desde app.html.
No se deploya como feature visible.
No se mezcla con main.
```

Uso recomendado:

```txt
Abrirlo localmente para revisar idea, flujo y cálculo.
Tomarlo como maqueta funcional.
Reescribir/adaptar si algún día entra al producto real.
```

---

## 18. Comandos sugeridos para rama future

```powershell
cd C:\apppromos

git status --short

git checkout -b future/desposte-rentabilidad

mkdir public\docs\futures\desposte -Force

# Copiar dentro de esa carpeta:
# FUTURE_DESPOSTE_RENTABILIDAD.md
# desposte_v1.0_completo.html

git status --short

git add public/docs/futures/desposte/FUTURE_DESPOSTE_RENTABILIDAD.md public/docs/futures/desposte/desposte_v1.0_completo.html

git commit -m "Future desposte rentabilidad documentado"
```

Para volver a producción estable:

```powershell
git checkout main
```

---

## 19. Conclusión

Este future tiene alto potencial, especialmente para plan DUEÑO, pero debe quedar dormido hasta que AppPromos esté más maduro comercialmente.

La decisión correcta ahora:

```txt
Documentar.
Guardar prototipo.
Crear rama future.
No integrar.
No deployar.
```
