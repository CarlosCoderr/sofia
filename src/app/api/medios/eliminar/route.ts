import { z } from "zod";
import { parseBody, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { borrarMedios } from "@/server/medios/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ids: z
    .array(z.string().regex(/^med_[a-z0-9]{20}$/, "Id de archivo no válido"))
    .min(1, "Elige al menos un archivo")
    .max(200, "Máximo 200 archivos a la vez"),
});

/**
 * Borra varios archivos de la biblioteca de una vez. Cada uno sigue la regla de
 * siempre (quien lo subió, el dueño o un administrador); los que no se pueden
 * borrar vuelven en `omitidos` con su motivo y no frenan a los demás.
 */
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  return Response.json(
    await borrarMedios({
      organizationId: session.organizationId,
      userId: session.userId,
      puedeAdministrar: canConfigure(session.role),
      ids: body.data.ids,
    })
  );
});
