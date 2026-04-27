# Roadmap — Futures aprobados post V11.4.1B

## V11.4.2 — Header inteligente unificado

Objetivo: mejorar la experiencia móvil y reducir ruido visual.

- Unificar marca, sesión, navegación rápida y estado comercial en un header superior.
- Integrar Inicio, Cambiar precios, Crear oferta, WhatsApp y Más.
- Integrar aviso de estado comercial dentro del header.
- Header compacto / colapsable al hacer scroll.
- Prioridad: que el carnicero tenga más pantalla útil para vender.

## V11.5 — Temas automáticos

Objetivo: adaptar la atmósfera visual de la app al contexto.

- Modo nocturno automático por horario.
- Opción manual: automático / claro / oscuro.
- Tema visual de atención para pago pendiente.
- Tema visual restringido para cuenta suspendida.
- Trial por vencer con aviso visual suave.
- Automatización según estado comercial, sin depender del superadmin.

## Admin > Salud de Base

Objetivo: diagnóstico de integridad de datos, sin modificar nada al principio.

- Empresas sin usuario.
- Usuarios sin empresa.
- Empresas sin billing.
- Empresas sin core/meta o core/state.
- Empresas sin provincia/localidad.
- Teléfonos duplicados.
- Empresas test / demo / legacy.
- Estados inválidos.

## PromosDepurador

Objetivo futuro: mantenimiento, normalización y sanitización de base.

- Dry-run.
- Preview.
- Backup.
- Rollback.
- Acciones manuales seguras.
- Solo superadmin.

## Catálogo formal completo

Objetivo: dejar de depender de DEMO como template operativo.

- Completar `catalogs/baseProducts/items`.
- Validar rubros, unidades y orden.
- Agregar `baseProductId` consistente.
- Preparar comparación limpia entre carnicerías.
