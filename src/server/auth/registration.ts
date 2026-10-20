/**
 * El registro por HTTP (`POST /api/auth/sign-up/email`) está CERRADO: la app
 * no tiene pantalla de registro y las cuentas se crean por backend, con
 * `pnpm crear-usuario` (ver scripts/crear-usuario.ts) o, las del equipo, el
 * propietario desde Ajustes → Equipo (bypass interno del gate).
 *
 * La única apertura es la variable de despliegue ALLOW_SIGNUP=true, pensada
 * SOLO para los arneses de prueba: deja de ser una instancia con el registro
 * cerrado. Cualquier otro valor ("1", "yes"…) no la abre.
 */
export async function isPublicSignupAllowed(): Promise<boolean> {
  return process.env.ALLOW_SIGNUP === "true";
}
