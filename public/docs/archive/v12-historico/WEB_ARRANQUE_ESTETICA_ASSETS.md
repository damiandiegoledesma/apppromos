# Web Arranque — Estética y assets V1

## Objetivo

Que la web pública de cada carnicería se vea más real, cálida y comercial sin obligar al carnicero a subir imágenes.

## Decisión de producto

La Web Arranque usa imágenes genéricas automáticas según el nombre/título de la oferta.

No hay generador automático por IA en producción.
No se obliga al carnicero a subir fotos.

El plan DUEÑO queda diferenciado por:

- web personalizada;
- imágenes propias;
- carrito de compras;
- pedido armado por WhatsApp.

## Estética base

- Header con imagen realista de mostrador/carnicería.
- Degradé rojo/bordó AppPromos para legibilidad.
- Fondo claro crema/beige.
- Tarjetas limpias para ofertas.
- Botón verde WhatsApp.
- Sello pasivo: “Sitio desarrollado por AppPromos”.

## Reglas públicas

- Mostrar solo productos con precio real.
- Ocultar productos con precio 0, vacío o inválido.
- Usar imagen fallback si el título de la oferta no coincide con ninguna categoría.

## Carpeta

`public/assets/web-arranque/`

## Criterio de integración

Primero integrar assets sin tocar la lógica comercial.
Después sumar asignación automática por título.
No tocar Crear oferta, Vender urgente, WhatsApp ni Auth para este cambio visual.
