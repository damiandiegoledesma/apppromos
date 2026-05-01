import { readPath } from "../core/firebase-core.js";
import { resolveSession, validateUserCanAccessBusiness } from "./auth-service.js";
import { assertBusinessCanWriteBySnapshot } from "./access-control-service.js";

/**
 * Guarda central de escritura SaaS.
 *
 * Objetivo UX/comercial:
 * - El cliente puede entrar y consultar su información aunque esté vencido/suspendido.
 * - Si la cuenta no está habilitada, se bloquea el GUARDADO con un mensaje claro.
 * - Superadmin administra billing/estados desde Admin SaaS, pero dentro de la app cliente
 *   respeta el mismo estado comercial que ve el carnicero.
 *
 * Importante: esta capa NO reemplaza las Firestore Rules. Es la primera barrera
 * centralizada para que todos los módulos usen la misma lógica antes de escribir.
 */
export async function assertBusinessCanWrite(businessId, action = "guardar cambios") {
  if (!businessId || typeof businessId !== "string") {
    throw new Error("Empresa no disponible para " + action + ".");
  }

  const session = await resolveSession().catch(() => ({ appMode: "guest" }));

  if (session?.isDemo) {
    throw new Error("Esta es una demo. Podés armar la oferta completa, pero para guardar tus precios y mandarla por WhatsApp necesitás crear tu carnicería gratis.");
  }

  // V11.4.1B: el superadmin NO saltea reglas comerciales dentro de la app cliente.
  // La corrección de estados/planes se hace desde Admin SaaS, no desde los módulos operativos.

  const hasAccess = await validateUserCanAccessBusiness(businessId);
  if (!hasAccess) {
    throw new Error("No tenés permisos para modificar esta carnicería.");
  }

  const rootBusiness = await readPath(`businesses/${businessId}`);
  if (!rootBusiness) {
    throw new Error("No se encontró la carnicería activa.");
  }

  assertBusinessCanWriteBySnapshot({ ...rootBusiness, businessId });
  return true;
}
