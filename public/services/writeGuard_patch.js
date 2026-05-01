export function isWriteAllowed(session) {
  if (session?.isDemo) {
    alert("Estás en modo demo. Para guardar, registrate gratis.");
    return false;
  }
  return true;
}
