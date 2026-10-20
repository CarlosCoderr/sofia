import { parseBody, withAuth } from "@/lib/api";
import { newBoardBookingSchema } from "@/lib/salon/schemas";
import { agendaDisabledResponse, agendaEnabled } from "@/server/agenda/flag";
import { createBoardBooking } from "@/server/business/board";
import { salonErrorResponse, salonGate } from "@/server/business/http";

export const dynamic = "force-dynamic";

/**
 * Módulo SALON — agendar una cita desde la agenda por sillas: cliente, hora y
 * profesional. Todo el equipo puede agendar (es el trabajo del día), igual que
 * cobrar. Existe solo con `SALON` y `AGENDA` encendidas.
 */
export const POST = withAuth(async (session, req: Request) => {
  const denied = salonGate(session, "member");
  if (denied) return denied;
  if (!agendaEnabled()) return agendaDisabledResponse();

  const body = await parseBody(req, newBoardBookingSchema);
  if (!body.ok) return body.response;
  try {
    const { bookingId } = await createBoardBooking(session.organizationId, body.data);
    return Response.json({ booking: { id: bookingId } }, { status: 201 });
  } catch (err) {
    return salonErrorResponse(err);
  }
});
