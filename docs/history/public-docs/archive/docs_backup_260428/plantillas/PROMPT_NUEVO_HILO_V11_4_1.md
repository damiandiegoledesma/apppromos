# PROMPT NUEVO HILO — AppPromos V11.4.1

Estoy desarrollando un SaaS llamado AppPromos orientado a carnicerías.

En el siguiente mensaje voy a subir el repositorio completo del proyecto en formato .zip.

VERSIÓN BASE ACTUAL APROBADA:
AppPromos V11.4.1 — Registro Normalizado + Modelo Central

ESTADO:
- Deploy realizado
- Probado
- Aprobado como nueva base estable

Contexto clave del sistema:

- Firebase Auth + Firestore
- Firebase Hosting
- Multi-tenant: 1 usuario cliente = 1 carnicería
- HTML + JS modular, sin frameworks
- Arquitectura basada en:
  - resolveSession
  - BusinessStore
  - BusinessService
  - AccessControlService
  - WriteGuardService
- Sistema SaaS con billing:
  - Trial real de 30 días
  - Planes actuales: trial / basic / pro
  - Estados actuales: active / overdue / suspended
  - Usuarios vencidos pueden entrar y consultar
  - Usuarios vencidos/suspendidos NO pueden guardar cambios
- Admin SaaS dentro de la app
- admin.html marcado como legacy/no usar
- Repo FULL: conservar estructura completa, incluyendo `.venv`, `.sixth` y `backend_python`

Cambios V11.4.1:

- Registro de nuevas carnicerías con teléfono normalizado
- Localidad con autocomplete usando Localidades AR
- Provincia y provinceId automáticos
- CompanyAdmin consistente con billing/módulos/geo
- DEMO sigue como template operativo actual
- catalogs/baseProducts/items queda como catálogo formal futuro, hoy incompleto
- Modelo central documentado en public/docs/modelo/DATA_MODEL_CORE.md
- PromosDepurador queda como future para diagnóstico/limpieza futura

Importante:

- NO romper Firebase
- NO romper resolveSession
- NO romper BusinessStore
- NO eliminar carpetas Python / backend / IA
- NO borrar carpetas legacy sin moverlas o documentarlas
- NO asumir que catalogs/baseProducts/items está completo
- Mantener DEMO como template operativo hasta definir migración formal
- Mantener experiencia móvil simple para carniceros

Necesito que:

1. Analices el código completo.
2. Verifiques que coincide con V11.4.1.
3. Detectes inconsistencias entre código, documentación, billing, módulos y control de acceso.
4. Evalúes riesgos antes de tocar nada.
5. Propongas el próximo avance incremental y seguro.

Esperá el archivo .zip en el próximo mensaje antes de responder.
