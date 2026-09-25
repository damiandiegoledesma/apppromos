# Auditoría V12.29 RC4

Auditar este ZIP como candidato previo a producción. Base RC3 ya había cerrado 12/14 desvíos; los dos `publicSignals` restantes están aceptados para próximo ciclo.

Foco P0:
1. Confirmar que el fallback `legacyActive` permite guardar a un negocio legado activo sin `billing.writeAccessUntil`, sin permitir que el dueño modifique billing o se autoextienda.
2. Confirmar que trial vencido, negocio suspendido/inactivo y estados no habilitados siguen bloqueados.
3. Confirmar que NO se reintrodujo autorización admin por `users.role`; el superadmin productivo requiere `admins/{uid}` y el procedimiento de preflight impide desplegar antes de crearlo/verificarlo.
4. Confirmar que alias nuevo es puntero `aliasOf`, no snapshot.
5. Confirmar que un alias RC4 y un alias legado RC3 terminan leyendo el snapshot canónico vigente.
6. Confirmar que alias y canónico validan mismo `businessId` y que no existe fuga cross-tenant.
7. Cambiar un precio/promoción en canónico y comprobar que URL histórica muestra el mismo dato sin resincronizar el alias.
8. Confirmar que tracking de visita/inicio WhatsApp ocurre una sola vez por navegación/acción y se atribuye al business correcto.
9. Regresión de los seis puntos RC1/RC3, teléfono 27 casos, ausencia de admin.html y doble escape.

Clasificar hallazgos BLOCKER / ALTO / MEDIO / BAJO. No aprobar DNS si existe BLOCKER o ALTO relacionado con acceso superadmin, billing, tenant isolation, alias o carrito/precios.
