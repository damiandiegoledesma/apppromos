# Auditoría adversarial AppPromos V12.29 RC5

Auditar este ZIP como candidato pre-producción. No asumir que una corrección es válida porque está documentada.

Prioridad P0:
1. Probar billing legado antes y después del cutoff 2026-10-15. Una cuenta legado vencida no debe conservar acceso indefinido; una cuenta legítima pre-migración debe poder operar durante la ventana. El cliente no debe poder fabricar el estado legado.
2. Probar aliases A→B→C, cadenas de 4 saltos, >4 saltos, ciclos A→B→A, huérfanos, businessId distinto y alias RC3. Alias y canónico deben mostrar siempre el mismo precio vivo.
3. Intentar secuestrar el slug de otro negocio mediante create/update/delete directo en publicWebSlugs. Informar request exacto y regla que lo permite si se reproduce. No marcarlo vulnerable solo por inspección superficial.
4. Verificar superadmin: admins/{uid} debe ser única autoridad. No existe bootstrap cliente ni email hardcodeado. Auditar el preflight operacional y cualquier posible lockout.
5. Tracking: ejecutar prueba dinámica si es posible. Entrar por alias y canónico y determinar cuántos publicSignals/eventos se intentan crear. Distinguir intento, create exitoso y update rechazado. No inferir duplicación solo porque existe alias.
6. Confirmar que landing/como-vender/Carniza NO dependen de carnis.app antes de DNS. Los generadores internos de nuevos links comerciales sí pueden preparar carnis.app, pero no deben romper la landing productiva actual.
7. El slug hardcodeado de A La Estaca no está confirmado contra producción. Señalar cualquier lugar que lo trate como verdad productiva.

Regresión: Auth, Firestore Rules, BusinessStore, precios, promos, carrito, WhatsApp, web pública, Centro de Control, PWA.

Veredicto obligatorio: GO o NO-GO. Clasificar P0/P1/P2/P3 con archivo, líneas, reproducción, impacto y corrección mínima. Separar hallazgos reproducidos de hipótesis no reproducidas.
