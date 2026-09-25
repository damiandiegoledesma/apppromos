# AppPromos V12.29 RC2 — Seguridad pre-lanzamiento

## Alcance

Este bloque corrige los hallazgos pre-lanzamiento confirmados después de las
auditorías externas de Gemini y Claude. No incluye despliegue ni cambios sobre
Firebase Producción.

## Correcciones

- Firestore ya no confía en `users/{uid}.role` para reconocer administradores.
- Un cliente no puede cambiar su rol, negocio, estado ni campos administrativos.
- El propietario no puede cambiar `billing`, plan, módulos o estado del negocio.
- Las escrituras comerciales consultan el billing raíz y `request.time`.
- Una prueba vencida o cuenta pausada conserva lectura pero no puede guardar.
- Los planes bonificados no-trial conservan acceso sin vencimiento automático.
- Storage aplica el mismo bloqueo a logo y foto del frente.
- Las altas nuevas crean una prueba segura de 14 días con `billing.writeAccessUntil`.
- Activación, cobro, reinicio y edición comercial actualizan esa fecha en forma coherente.
- La edición comercial de billing se guarda en una sola operación.
- Un plan pago sin vencimiento recibe un mes por defecto.
- Bonificar una cuenta que todavía figura como trial la convierte a plan `basic` manual.
- El teléfono editado en “Mis datos” se normaliza a formato móvil argentino `+549…`.
- La web pública también corrige formatos locales, con 0, 15 o código país.
- El primer mensaje para compartir usa saltos de línea reales.
- `public/admin.html` salió del Hosting y se conservó en
  `docs/history/legacy-hosting/admin.html`.

## Compatibilidad de cuentas existentes

Las cuentas creadas antes de RC2 pueden no tener `billing.writeAccessUntil`.
Por seguridad, las reglas nuevas no deben desplegarse hasta revisar esas cuentas.

Antes de un futuro despliegue:

1. Confirmar que el administrador real tiene un documento activo en `admins/{uid}`.
2. Abrir cada cuenta heredada desde el Centro de Control.
3. Si tiene fechas correctas, usar **Reparar base** para derivar la autorización.
4. Si es una prueba sin fecha, decidir individualmente entre **Reiniciar 14 días** o
   **Activar plan pago**.
5. Verificar que no quede visible el aviso “Falta preparar esta cuenta para las reglas RC2”.
6. Ejecutar emuladores y recién entonces solicitar aprobación de despliegue.

No se realiza una migración masiva ni se inventan vencimientos históricos.

## QA automatizado

- `tools/qa/test-security-billing-rules.mjs`
  - aislamiento entre negocios;
  - bloqueo de autoasignación de superadmin;
  - protección del billing;
  - trial activo y vencido;
  - plan bonificado;
  - permisos administrativos;
  - alta nueva con prueba segura de 14 días.
- `tools/qa/test-phone-normalization.mjs`
  - formatos argentinos locales, con 0, con 15 y con `+54 9`.
- `tools/qa/test-billing-lifecycle.mjs`
  - prueba, gracia, mora, pausa y plan pago.
- `tools/qa/test-public-signals-rules.mjs`
  - señales públicas anónimas sin PII.

## Decisiones fuera de alcance

- No se despliega Producción.
- No se modifica Firebase Producción.
- No se automatizan cobros ni WhatsApp.
- No se implementa una migración masiva.
- No se agregan mejoras generales que no pertenezcan al bloque auditado.
