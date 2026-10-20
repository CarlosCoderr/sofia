import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { salonHomePath } from "@/lib/nav";
import { agendaEnabled } from "@/server/agenda/flag";
import { salonEnabled } from "@/server/business/flag";
import { guideFirst } from "@/server/onboarding/guide";

export const dynamic = "force-dynamic";

/**
 * La raíz decide a dónde se entra (issue #86): mientras falte un paso de la
 * guía de inicio o el agente siga apagado, a `/guia-de-inicio`; con todo listo,
 * a la Bandeja como siempre. Sin sesión, `/bandeja` manda al login.
 *
 * Con el módulo SALON encendido (la v1.0) se entra directo al Panel: la guía y
 * la Bandeja no están en el menú, y así «Panel» queda activo al entrar.
 */
export default async function Home() {
  const session = await getSessionOrNull();
  if (session && salonEnabled()) {
    redirect(salonHomePath({ agenda: agendaEnabled(), role: session.role }));
  }
  if (session && (await guideFirst(session))) redirect("/guia-de-inicio");
  redirect("/bandeja");
}
