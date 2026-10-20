import { parseBody, withAuth } from "@/lib/api";
import { saleInputSchema } from "@/lib/salon/schemas";
import { periodFromRequest } from "@/server/analytics/period";
import { salonErrorResponse, salonGate } from "@/server/business/http";
import { getSalesReport, registerServiceSale } from "@/server/business/sales-service";

export const dynamic = "force-dynamic";

/**
 * Módulo SALON — caja. Con `?from=AAAA-MM-DD&to=AAAA-MM-DD` (días del negocio,
 * inclusivos; sin ellos, los últimos 30) responde el reporte: totales, lo que
 * toca a cada profesional, cuánto entró por método y las ventas. Es dinero, así
 * que es solo del dueño/administrador.
 * Con `?staffId=` todo el reporte (totales, desgloses y ventas) se acota a ese
 * profesional.
 */
export const GET = withAuth(async (session, req: Request) => {
  const denied = salonGate(session, "manager");
  if (denied) return denied;
  try {
    const period = await periodFromRequest(session.organizationId, new URL(req.url));
    // `?staffId=` acota el reporte a un profesional (auditoría rápida).
    const staffId = new URL(req.url).searchParams.get("staffId")?.slice(0, 64) || null;
    return Response.json(await getSalesReport(session.organizationId, period, staffId));
  } catch (err) {
    return salonErrorResponse(err);
  }
});

/** Cobrar: cualquiera del equipo puede registrar una venta en el mostrador. */
export const POST = withAuth(async (session, req: Request) => {
  const denied = salonGate(session, "member");
  if (denied) return denied;
  const body = await parseBody(req, saleInputSchema);
  if (!body.ok) return body.response;
  try {
    const result = await registerServiceSale(session.organizationId, body.data);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return salonErrorResponse(err);
  }
});
