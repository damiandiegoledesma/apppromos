# FUTURE — Database Maintenance & Sanitization

## Objetivo

Preparar AppPromos para crecer sin acumular datos sucios, duplicados, huérfanos o inconsistentes.

## Principio

Los datos nuevos deben nacer limpios desde el registro. El PromosDepurador futuro debe reparar datos existentes, no compensar un alta defectuosa.

## PromosDepurador futuro

Herramienta interna solo para superadmin.

Fases sugeridas:

### V11.5 — Salud de Base

Solo diagnóstico, sin escritura.

Detectar:

- empresas sin usuario;
- usuarios sin empresa;
- empresas sin billing;
- empresas sin `core/meta`;
- empresas sin `core/state`;
- empresas sin provincia/localidad;
- teléfonos duplicados;
- empresas test/template;
- status/plan inválidos;
- productos huérfanos;
- combos rotos;
- catálogo demo incompleto.

### V11.6 — PromosDepurador operativo

Con:

- dry-run;
- preview;
- backup;
- rollback;
- auditoría;
- confirmación manual.

Operaciones posibles:

- normalizar teléfonos;
- normalizar localidad/provincia;
- convertir precios string a number;
- detectar duplicados;
- marcar test/template;
- archivar datos legacy.

## Geonormalizador

El plugin `localidades-ar.plugin.js` se incorpora primero al registro y CompanyAdmin.

Futuro:

- usarlo para limpiar empresas viejas;
- usarlo para clientes/contactos;
- usarlo para Competencia por zona;
- usarlo para segmentación comercial.

## Reglas de seguridad

- Nunca borrar automáticamente.
- Siempre simular antes de aplicar.
- Backup antes de escribir.
- Rollback disponible.
- Superadmin solamente.
- No tocar `resolveSession` ni `BusinessStore` sin diagnóstico previo.
