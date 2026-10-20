import { withAuth } from "@/lib/api";
import { todayInTz } from "@/lib/time/slots";
import { periodFromRequest } from "@/server/analytics/period";
import { getDashboard } from "@/server/business/dashboard";
import { salonErrorResponse, salonGate } from "@/server/business/http";

export const dynamic = "force-dynamic";

/**
 * Módulo SALON — el panel ejecutivo del negocio. `?from=AAAA-MM-DD&to=AAAA-MM-DD`
 * (días del negocio, inclusivos; sin ellos, los últimos 30). Muestra dinero y
 * datos de clientes: solo dueño/administrador.
 */
export const GET = withAuth(async (session, req: Request) => {
  const denied = salonGate(session, "manager");
  if (denied) return denied;
  try {
    const period = await periodFromRequest(session.organizationId, new URL(req.url));
    const today = todayInTz(new Date(), period.timezone);
    // `?staffId=` acota el panel a un profesional (auditoría rápida).
    const staffId = new URL(req.url).searchParams.get("staffId")?.slice(0, 64) || null;
    return Response.json(await getDashboard(session.organizationId, period, today, staffId));
  } catch (err) {
    return salonErrorResponse(err);
  }
});
