# Future — Impresión de listas de precios y volantes

## Estado

```txt
Future importante
Cercanía: media
Valor comercial: alto
Implementar ahora: no
Guardar como documentación: sí
```

## Origen

Este future nace del antecesor **A La Estaca**, que ya tenía lógica de impresión, selección de combos, listas compactas, volantes por hoja y estilos `@media print`.

## Problema que resuelve

La carnicería no vende solo por WhatsApp o web.

También vende con:

```txt
lista pegada en mostrador
cartel en heladera
volante en mano
papel dentro de la bolsa
combo impreso en vidriera
lista compacta para empleados
```

## Objetivo

Permitir que el carnicero use los precios y ofertas cargadas en AppPromos para generar material físico simple.

```txt
Cargás precios una vez.
AppPromos te arma la lista, la promo y el volante.
```

## Alcance futuro

### 1. Lista de precios imprimible

Opciones:

```txt
Lista completa
Lista por rubro
Solo productos con precio
Solo productos que uso
Lista compacta
```

Regla pública:

```txt
Producto sin precio real o marcado como No uso no debe aparecer en material público.
```

### 2. Lista compacta de mostrador

Ejemplo:

```txt
CARNICERÍA LA ESTACA

ASADO ........... $ 15.900
VACÍO ........... $ 18.900
PICADA .......... $ 7.500
CHORIZOS ........ $ 6.900
```

Usos:

- caja;
- mostrador;
- empleados;
- heladera;
- referencia diaria.

### 3. Volantes de combos

Formatos posibles:

```txt
4 volantes por hoja
8 volantes por hoja
12 volantes por hoja
```

Uso real:

```txt
meter en la bolsa
entregar en mano
dejar en mostrador
pegar en heladera
mandar a imprimir rápido
```

### 4. Logo y datos de la carnicería

Cada pieza debería poder incluir:

```txt
logo
nombre de carnicería
dirección
WhatsApp
localidad
leyenda corta
QR a la web, en planes altos
```

### 5. Selector de qué imprimir

No imprimir todo siempre.

Debe permitir elegir:

```txt
productos específicos
rubros completos
combos guardados
ofertas activas
ofertas del día
```

## Flujo ideal

```txt
Elegir qué imprimir
↓
Elegir formato
↓
Ver vista previa
↓
Imprimir / Guardar PDF
```

## Ubicación futura en AppPromos

No debe competir con Inicio.

Opciones:

```txt
Más → Imprimir
Precios → Imprimir lista
Ofertas guardadas → Imprimir volantes
```

Carniza podría sugerirlo contextualmente:

```txt
¿Querés imprimir esta promo para el mostrador?
```

## Planes posibles

```txt
ARRANQUE:
lista de precios simple

SALVADOR:
lista compacta + volantes de combos/ofertas

DUEÑO:
plantillas más lindas, logo avanzado, QR a web, formatos premium
```

## Qué NO incluye por ahora

- editor gráfico complejo;
- diseño tipo Canva;
- impresión automática;
- gestión de imprenta;
- carga de imágenes propias salvo plan DUEÑO;
- promesa inmediata en landing.

## Riesgos

- puede agrandar la app si aparece demasiado pronto;
- debe funcionar bien en impresoras comunes;
- debe respetar precios reales;
- no debe publicar productos incompletos;
- no debe transformarse en módulo gráfico pesado.

## Frase guía

```txt
AppPromos no solo manda ofertas por WhatsApp.
También te arma lo que pegás en el mostrador.
```
