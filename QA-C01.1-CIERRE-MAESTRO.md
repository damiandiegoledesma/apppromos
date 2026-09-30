# QA-C01.1 — CIERRE MAESTRO
## Mejora comercial de los 4 estilos de vidriera pública — Carnis

**Fecha de cierre:** 30/09/2026  
**Estado:** CERRADO EN LABORATORIO  
**Entorno:** `C:\apppromos-qa`  
**Rama:** `fix/branding-publico-login-pwa`  
**Commit final:** `a3eabd2`  
**Estado Git al cierre:** rama local `ahead 6` respecto de origin  
**Producción:** NO TOCADA  
**Push / deploy:** NO realizados

---

## 1. Objetivo

QA-C01.1 nació para responder una pregunta comercial, no meramente visual:

> **¿Los cuatro modelos de vidriera representan realmente cuatro maneras distintas y útiles de vender para una carnicería?**

El criterio de éxito era dejar de tener cuatro skins de una misma página y conseguir:

> **4 estilos = 4 estrategias comerciales.**

El trabajo se realizó sobre capacidades ya existentes de Carnis —productos, rubros, precios, fotos, promos, Promo del día, combos, carrito y WhatsApp— evitando crear funcionalidades grandes cuando una reorganización comercial de lo existente alcanzaba.

---

## 2. Resultado conceptual final

QA-C01.1 cierra con cuatro misiones diferenciadas:

| Estilo | Estrategia | Intención principal |
|---|---|---|
| **Directo al grano** | **ENCONTRAR** | Entrar, localizar rápido lo que quiero y agregarlo |
| **Oferta primero** | **APROVECHAR** | Ver qué conviene comprar y actuar |
| **Catálogo tipo vidriera** | **MIRAR / DESCUBRIR** | Recorrer visualmente qué tiene la carnicería |
| **Combos + pedido directo** | **RESOLVER** | Elegir una propuesta armada y resolver la compra |

La regla transversal resultante es:

> **Compartimos capacidades; no compartimos necesariamente jerarquías.**

Fotos, promociones, rubros, carrito, WhatsApp y vitrina pueden pertenecer al motor común. Cada estilo decide qué domina la experiencia y cómo lo presenta.

---

## 3. Cadena de checkpoints y commits

| CP | Resultado | Commit |
|---|---|---|
| **CP0** | Baseline y datos QA comparables | Sin commit de producto |
| **CP1** | Motor común de destacados + fixture + pruebas | `d77d5c2` |
| **CP2** | Directo al grano | `7107b3f` |
| **CP5** | Combos + pedido directo | `aff990f` |
| **CP3** | Oferta primero | `7efca11` |
| **CP4** | Catálogo + vitrina reutilizable | `e587d6e` |
| **CP6** | Cierre transversal | `a3eabd2` |

El orden real CP2 → CP5 → CP3 → CP4 fue deliberado para poder comparar composiciones y proteger la diferenciación visual entre estilos.

---

## 4. CP0 — Baseline

Se creó un baseline común con datos reales de Carnicería QA para comparar antes y después con la misma información.

Se cubrieron promos de uno, dos, tres y cuatro o más cortes, Promo del día y el caso testigo **Costeletas de Novillo vs Costeletas de Cerdo**.

El baseline permitió detectar, entre otras cosas:

- tarjetas que mostraban nombres genéricos como `Promo 1` / `Promo 2`;
- espacios visuales sin fotografía aun cuando existía una foto utilizable;
- etiquetas genéricas;
- ambigüedad entre cortes de distinto rubro;
- afirmaciones visuales no respaldadas, como “Más pedido”;
- oportunidades de mejorar la continuidad hasta carrito y WhatsApp.

Las carpetas `QA-C01.1-CP0/` a `QA-C01.1-CP5/` permanecen como evidencia local sin seguimiento Git.

---

## 5. CP1 — Motor común

**Commit:** `d77d5c2`

Se creó:

- `public/js/services/storefront-highlights-service.js`
- `tools/qa/test-storefront-highlights.mjs`
- `tools/qa/fixtures/cp0-carniceria-qa.json`

Principio arquitectónico:

> **El motor decide datos comerciales; cada estilo decide presentación.**

El motor centraliza, entre otras cosas:

- cruce producto por **nombre + rubro**;
- fotografías;
- composición y orden de cortes;
- nombres informativos vs nombres genéricos;
- precio de referencia;
- ahorro verificable;
- hasta 3 imágenes + `+N`;
- pool estable de candidatos.

No genera HTML.

Esto evitó implementar cuatro veces la misma lógica comercial.

---

## 6. CP2 — Directo al grano

**Commit:** `7107b3f`

### Misión
> **ENCONTRAR**

Se mantuvo una experiencia compacta y rápida.

Decisiones principales:

- la cinta principal sigue siendo pequeña y funcional;
- las promociones muestran fotografía real;
- en la vista Promos se permiten hasta 3 cortes superpuestos + `+N`;
- el contenido explica mejor qué se compra;
- el ahorro sólo aparece cuando el motor puede verificarlo;
- la acción reutiliza el mismo carrito.

La fotografía sirve para **reconocer**, no para convertir Directo en una vidriera visual protagonista.

---

## 7. CP5 — Combos + pedido directo

**Commit:** `aff990f`

### Misión
> **RESOLVER**

La jerarquía final es:

> **manda la lista de lo que incluye, no el precio.**

Decisiones principales:

- fotos reales de los cortes en el espacio visual de la tarjeta;
- lista completa con cantidad, corte y rubro;
- nombre comercial sólo cuando aporta;
- eliminación de “Más pedido” sin respaldo de datos;
- ahorro en segundo plano;
- `Pedir este combo` agrega y conduce al carrito;
- Costeletas de Novillo y Cerdo quedan diferenciadas.

Se amplió `lines[]` del motor para exponer `rubro`, evitando volver a leer datos crudos desde la UI.

---

## 8. CP3 — Oferta primero

**Commit:** `7efca11`

### Misión
> **APROVECHAR**

Principio de diferenciación:

> **Oferta vende la oportunidad; Combos vende la solución.**

Decisiones principales:

- hero navy conservado;
- precio pasa a ser el elemento dominante;
- foto real integrada al hero;
- ahorro sólo si es demostrable;
- `OFERTA DE HOY` sólo cuando realmente corresponde a una Promo del día;
- CTA pasa a `Agregar al pedido`;
- sección `Más oportunidades` con precio, foto, contenido, rubro y acción;
- vista Promos mantiene una lectura escaneable.

El hero se redujo respecto del baseline, adelantando precio y CTA dentro del primer viewport.

---

## 9. CP4 — Catálogo tipo vidriera + vitrina reutilizable

**Commit:** `e587d6e`

### Misión
> **MIRAR / DESCUBRIR**

Fue el checkpoint donde la fotografía adquirió mayor protagonismo.

Se creó la primera implementación de la **vitrina/carrusel reutilizable**.

Arquitectura en tres capas:

1. **Selección/datos:** `selectShowcase(...)` en el motor.
2. **Markup reutilizable:** componente genérico de vitrina.
3. **Comportamiento:** scroll/snap y autoavance desacoplados del look del estilo.

Reglas principales:

- prioriza oportunidades visualmente limpias;
- completa con productos normales;
- evita duplicados;
- promociones complejas de 3+ cortes no contaminan la vitrina;
- con menos de 4 candidatos válidos la vitrina desaparece;
- no rellena artificialmente;
- autoavance tranquilo y compatible con reducción de movimiento;
- grilla completa permanece disponible.

La vitrina se definió expresamente como **capacidad transversal**, no como propiedad exclusiva de Catálogo.

---

## 10. CP6 — Cierre transversal

**Commit:** `a3eabd2`

CP6 no volvió a diseñar los cuatro estilos. Integró pendientes comunes preservando las identidades conseguidas.

### Vitrina por estrategia

- **Directo:** `Para descubrir`, en posición secundaria y sin desplazar la compra rápida.
- **Oferta:** no recibe una segunda vitrina redundante; `Más oportunidades` ya cumple esa función comercial.
- **Catálogo:** conserva la vitrina protagonista.
- **Combos:** `Completá con` adopta el concepto visual complementario cuando corresponde.

Esto confirmó una decisión importante:

> **Transversal no significa idéntico.**

### Carrito y WhatsApp

Se corrigió la pérdida de información al final del recorrido.

Ejemplos finales:

- `2 kg Costeletas - Novillo`
- `1 kg Costeletas - Cerdo`

Los nombres genéricos dejan de ser la única descripción cuando existe contenido estructurado.

Los carritos anteriores mantienen compatibilidad.

### Completá con

Se incorporó una regla determinista para:

- alternar rubros de las soluciones;
- evitar repetir cortes;
- completar con otros rubros cuando corresponde;
- ignorar elementos sin foto para la pieza visual.

### Filtros

Los accesos por rubro de las piezas intervenidas pasan a abrir Productos con el rubro correspondiente aplicado.

### Catálogo

Se ajustó el primer CTA para quedar dentro del objetivo definido para el primer viewport.

---

## 11. Resultado funcional transversal

Al cierre, el recorrido comercial conserva información útil desde la vidriera hasta el pedido:

> **foto → corte → cantidad → rubro → precio/promoción → carrito → WhatsApp**

Especialmente importante:

> **Costeletas Novillo ≠ Costeletas Cerdo**

La distinción no depende únicamente de la imagen.

---

## 12. Arquitectura resultante

### Motor común
`storefront-highlights-service.js`

Responsable de datos comerciales y selección, no de diseño.

### Presentación
`public/web.html`

Cada estilo conserva sus clases, jerarquías y composición.

### Pruebas
`tools/qa/test-storefront-highlights.mjs`

La cobertura creció progresivamente con las nuevas capacidades.

### Fixture reproducible
`tools/qa/fixtures/cp0-carniceria-qa.json`

Permite probar contra el estado QA congelado sin depender de que los precios actuales cambien.

---

## 13. Validación final

El cierre Git de CP6 confirmó:

- **32/32 pruebas PASS**
- `git diff --check` limpio
- 3 archivos versionados en CP6
- `139 insertions / 17 deletions`
- commit final `a3eabd2`
- rama local `ahead 6`
- carpetas de evidencia fuera de los commits
- sin push
- sin deploy
- producción intacta

El estilo legado `standard` fue tratado como regresión y no como objetivo de rediseño.

---

## 14. Frases comerciales para el selector

La interfaz futura no debería pedirle al carnicero que entienda conceptos de diseño web.

Propuesta conceptual:

# Elegí cómo querés vender

**Directo al grano**  
> Para que tus clientes encuentren rápido lo que buscan.

**Oferta primero**  
> Para mostrar primero lo que más conviene comprar.

**Catálogo tipo vidriera**  
> Para que tus clientes recorran y descubran tus productos.

**Combos + pedido directo**  
> Para vender propuestas armadas y resolver la compra.

Estas frases deben validarse visualmente en el selector antes de considerarlas copy definitivo.

---

## 15. Decisiones comerciales consolidadas

1. Una promo debe explicar **qué contiene**; `Promo 1` / `Promo 2` no pueden dominar la comunicación.
2. Si existe foto real del corte, se usa en lugar de dejar espacios vacíos o depender de etiquetas genéricas.
3. Una promo de varios cortes puede usar composición visual, pero el texto conserva la lista completa cuando hace falta.
4. El rubro forma parte de la identificación comercial cuando evita ambigüedad.
5. El ahorro sólo se muestra si puede calcularse con seguridad.
6. No se inventan señales de demanda como “Más pedido” sin datos reales.
7. La Promo del día puede recibir jerarquía especial, pero una promo común no debe presentarse falsamente como “de hoy”.
8. La vitrina es una capacidad común, pero cada estrategia decide su jerarquía.
9. Carrito y WhatsApp deben conservar la claridad conseguida en la vidriera.
10. La mejora comercial se priorizó sobre crear cuatro diseños visualmente espectaculares pero equivalentes.

---

## 16. Pendientes deliberadamente fuera de QA-C01.1

Estos puntos NO impiden cerrar QA-C01.1.

### A. Set propio de iconos de rubros Carnis

Se considera valioso explorar un lenguaje visual propio para:

- Novillo;
- Cerdo;
- Pollo;
- otros rubros reales cuando corresponda.

Principio:

> si se usan iconos, evitar depender de emojis genéricos como identidad definitiva.

Debe tratarse como trabajo de assets/diseño separado. El texto de rubro actual sigue siendo la fuente inequívoca.

### B. Carniza Instant

Frente futuro:

> **Foto + Publicación + Venta**

No se integró y no se anticipó su modelo de datos.

Principio ya fijado para el futuro:

> **Carniza Instant debería ser una nueva fuente de contenido comercial para las cuatro estrategias, no una quinta estrategia de vidriera.**

Cuando Instant madure, revisar cómo una publicación nacida de una foto real se adapta a:

- Directo;
- Oferta;
- Catálogo;
- Combos.

### C. Mejoras visuales menores

Cualquier refinamiento residual de spacing, composiciones de varias fotos, badges o detalles equivalentes debe evaluarse como polish, no como reapertura automática de QA-C01.1.

---

## 17. Lo que QA-C01.1 NO hizo

Para proteger el alcance:

- no modificó producción;
- no hizo deploy;
- no hizo push;
- no cambió Firestore Rules;
- no rediseñó el panel;
- no cambió el modelo de datos de promociones;
- no realizó refactor general;
- no mezcló C6, QA-B01, QA-B02 ni Rotis;
- no integró Carniza Instant;
- no convirtió el trabajo en una reconstrucción completa de la web pública.

---

## 18. Estado de las evidencias

Las carpetas locales:

- `QA-C01.1-CP0/`
- `QA-C01.1-CP1/`
- `QA-C01.1-CP2/`
- `QA-C01.1-CP3/`
- `QA-C01.1-CP4/`
- `QA-C01.1-CP5/`

quedaron fuera de Git al cierre.

Contienen baseline, capturas, comparaciones, 4-up e informes de checkpoints.

No incorporarlas retroactivamente a los commits de producto.

Si se decide conservar evidencia dentro del repositorio, hacerlo posteriormente como una decisión documental separada.

---

## 19. Estado de promoción

### Laboratorio
**GO — CERRADO**

### Push de la rama
**PENDIENTE DE AUTORIZACIÓN**

### Deploy a Hosting QA
**PENDIENTE DE AUTORIZACIÓN**

### Merge / promoción
**NO AUTORIZADO TODAVÍA**

### Producción
**NO TOCAR**

El cierre de QA-C01.1 demuestra que la línea de trabajo está lista para una fase de promoción controlada; no autoriza por sí mismo producción.

---

## 20. Protocolo recomendado de promoción

Cuando se autorice avanzar:

1. verificar `git status` y hash final `a3eabd2`;
2. decidir qué hacer con las carpetas de evidencia locales;
3. push de la rama QA;
4. deploy exclusivamente a Hosting/Firebase QA si corresponde al protocolo maestro;
5. smoke real sobre QA;
6. comparar los cuatro estilos desde mobile;
7. probar carrito y WhatsApp;
8. verificar Promo del día vigente con datos del día;
9. registrar GO/NO-GO;
10. recién entonces decidir merge/promoción según el procedimiento QA→PROD.

No saltar directamente desde este cierre local a producción.

---

## 21. Criterio final de cierre

QA-C01.1 se considera exitoso porque permite sostener:

> **Una carnicería puede elegir entre cuatro maneras de vender online, no simplemente entre cuatro diseños.**

Y porque esas cuatro maneras comparten un motor comercial sin perder su intención:

> **Directo → ENCONTRAR**  
> **Oferta → APROVECHAR**  
> **Catálogo → MIRAR / DESCUBRIR**  
> **Combos → RESOLVER**

---

# VEREDICTO

## QA-C01.1 — CERRADO EN LABORATORIO

**Commit final:** `a3eabd2`

**Pruebas:** 32/32 PASS

**Push:** NO

**Deploy:** NO

**Producción:** INTACTA

**Próximo paso:** promoción controlada fuera del laboratorio, sólo con autorización explícita.
