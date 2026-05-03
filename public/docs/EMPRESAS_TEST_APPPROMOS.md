# Empresas TEST AppPromos

## Objetivo

Las empresas TEST son carnicerías de prueba usadas para desarrollar, validar y demostrar AppPromos sin tocar clientes reales.

Sirven para probar el Panel Admin, módulos, estados de acceso/pago, catálogos, precios, ofertas, Web futura, migraciones y escenarios comerciales.

## Regla principal

```txt
Empresa TEST = laboratorio controlado.
Cliente real = negocio real, no se elimina desde el frontend.
```

Una empresa TEST debe verse siempre como prueba dentro del Panel Admin y no debe confundirse con un cliente real.

## Campos esperados

Una empresa TEST debería tener, como mínimo:

```js
{
  isTestBusiness: true,
  adminStatus: "test",
  testMarkedAt: "...",
  testReason: "..."
}
```

Si fue clonada desde otra empresa:

```js
{
  isTestBusiness: true,
  adminStatus: "test",
  clonedFromBusinessId: "biz_...",
  clonedAt: "...",
  clonedReason: "Copia TEST creada desde Panel Admin"
}
```

## Usos permitidos

Las empresas TEST se pueden usar para:

- probar módulos sin tocar clientes reales;
- probar cambios de plan, acceso y pago;
- probar archivado/restauración;
- probar Web automática futura;
- reproducir bugs;
- crear escenarios de demo;
- validar migraciones de datos;
- limpiar pruebas con eliminación controlada;
- clonar una empresa de prueba como nueva copia TEST.

## Acciones permitidas desde Panel Admin

### Clonar como TEST

Crea una copia de prueba de una empresa marcada como TEST.

La copia puede tomar catálogo, precios, combos/ofertas y configuración conocida, pero debe nacer como empresa de prueba.

La copia NO debe crear:

- usuario nuevo en Firebase Auth;
- cliente real;
- teléfono/WhatsApp como índice real activo;
- `publicPhoneKey` real;
- `publicWebSlug` activo;
- web pública publicada;
- pagos reales;
- historial real como si fuera actual.

### Eliminar TEST

Borra una empresa marcada como TEST y sus datos de prueba conocidos.

Debe pedir confirmación fuerte:

```txt
ELIMINAR TEST
```

Al eliminar una empresa TEST se puede limpiar:

- documento principal de `businesses/{businessId}`;
- documentos conocidos de subcolecciones de prueba;
- `core/meta` y `core/state` si existen;
- índices `publicPhoneKeys` asociados;
- índices `publicWebSlugs` asociados.

No borra usuarios de Firebase Auth.

## Qué NO corresponde hacer con empresas TEST

No usar empresas TEST para:

- clientes reales;
- facturación real;
- soporte real;
- publicar webs como si fueran clientes reales;
- bloquear teléfonos reales;
- alimentar directamente el promedio de Mercado/Competencia;
- duplicar `phoneKey` real;
- crear usuarios Auth innecesarios;
- ocultar o mezclar información con clientes reales.

## WhatsApp en empresas TEST

Si una empresa TEST tiene WhatsApp válido, el Panel Admin puede permitir escribir, pero debe mostrarlo como acción de prueba.

Texto recomendado:

```txt
📲 Escribir TEST
```

Advertencia:

```txt
Empresa TEST: verificá que este número sea de prueba antes de enviar.
```

Si no hay número válido, el botón debe quedar deshabilitado.

## Diferencia con clientes reales

Para clientes reales:

- no eliminar directo;
- archivar/restaurar;
- no liberar WhatsApp ni slug automáticamente;
- no borrar Auth desde frontend;
- usar acciones con mayor protección.

Regla:

```txt
Cliente real se archiva.
Empresa TEST se puede eliminar con confirmación fuerte.
```

## Diferencia con referencias de Mercado

Una empresa TEST no es una referencia de Mercado.

Para alimentar Mercado/Competencia no se deben clonar clientes ni empresas TEST como carnicerías falsas dentro del panel principal.

La idea futura correcta es crear referencias controladas separadas, documentadas en:

```txt
public/docs/FUTURE_MERCADO_REFERENCIAS_CONTROLADAS.md
```

## Criterio de UI

El Panel Admin debe mostrar claramente:

- `EMPRESA TEST`;
- acciones de prueba separadas;
- `Clonar como TEST`;
- `Eliminar TEST` dentro de zona peligrosa;
- advertencias cuando corresponda.

No mostrar una empresa TEST como cliente real.
