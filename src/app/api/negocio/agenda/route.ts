import { apiError, withAuth } from "@/lib/api";
import { boardQuerySchema } from "@/lib/salon/schemas";
import { agendaDisabledResponse, agendaEnabled } from "@/server/agenda/flag";
import { getBoard } from "@/server/business/board";
import { salonErrorResponse, salonGate } from "@/server/business/http";

export const dynamic = "force-dynamic";

/**
 * Módulo SALON — el tablero de un día: sillas × franjas del motor de
 * disponibilidad, con las citas y los cupos libres. Existe solo con `SALON` y
 * `AGENDA` encendidas (es una vista del motor de citas).
 */
export const GET = withAuth(async (session, req: Request) => {
  const denied = salonGate(session, "member");
  if (denied) return denied;
  if (!agendaEnabled()) return agendaDisabledResponse();

  const url = new URL(req.url);
  const query = boardQuerySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!query.success) {
    return apiError(422, "invalid_date", query.error.issues[0]?.message ?? "Fecha no válida");
  }
  try {
    return Response.json(await getBoard(session.organizationId, query.data.date));
  } catch (err) {
    return salonErrorResponse(err);
  }
});
