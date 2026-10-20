import { notFound, redirect } from "next/navigation";
import { canConfigure } from "@/lib/auth/roles";
import { getSessionOrNull, type SessionContext } from "@/lib/auth/session";
import { agendaEnabled } from "@/server/agenda/flag";
import { salonEnabled } from "@/server/business/flag";

/**
 * Módulo SALON — la puerta de cada pantalla (Servicios, Equipo, Caja y Agenda
 * por sillas son páginas propias del menú, sin un layout «Negocio» que las
 * guarde a todas).
 *
 * - Sin la bandera `SALON` la pantalla no existe en la instancia: 404.
 * - Sin sesión: al inicio de sesión.
 * - `manage`: dueño o administrador. Un miembro del equipo que llega por un
 *   enlace va a Citas (donde está la agenda por sillas) si hay agenda; si no, 404.
 * - `needsAgenda`: la pantalla es una vista del motor de citas (`AGENDA`).
 */
export async function requireSalonPage(
  opts: { manage?: boolean; needsAgenda?: boolean } = {}
): Promise<SessionContext> {
  if (!salonEnabled()) notFound();
  if (opts.needsAgenda && !agendaEnabled()) notFound();
  const session = await getSessionOrNull();
  if (!session) redirect("/iniciar-sesion");
  if (opts.manage && !canConfigure(session.role)) {
    if (agendaEnabled()) redirect("/citas");
    notFound();
  }
  return session;
}
