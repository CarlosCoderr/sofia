import { apiError, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";
import { isDomainEmpty, seedDemo } from "@/server/seed/demo";

export const dynamic = "force-dynamic";

/**
 * Carga el negocio demo (FR-075). Solo con la BD de dominio vacía — la
 * versión por script (`pnpm seed:demo`) permite recargar con --force.
 */
export const POST = withAuth(async (session) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo el dueño o un administrador puede hacer esto");
  }
  const db = getDb();
  const empty = await isDomainEmpty(db, session.organizationId);
  if (!empty) {
    return apiError(
      409,
      "not_empty",
      "Ya hay datos en la organización; la demo solo se carga con la base vacía"
    );
  }
  const result = await seedDemo(db, session.organizationId);
  return Response.json({ ok: true, ...result });
});
