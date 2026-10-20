import { apiError } from "@/lib/api";
import type { SessionContext } from "@/lib/auth/session";
import { canConfigure } from "@/lib/auth/roles";
import { PeriodError } from "@/server/analytics/period";
import { salonDisabledResponse, salonEnabled } from "@/server/business/flag";

/**
 * Módulo SALON — lo común a sus route handlers.
 *
 * `route.ts` solo exporta handlers (Next lo exige), así que el guardia y la
 * traducción de errores viven aquí.
 */

/** Error esperado del dominio: lleva el código HTTP y un mensaje para la persona. */
export class SalonError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 404 | 409 | 422,
    message: string
  ) {
    super(message);
    this.name = "SalonError";
  }
}

/**
 * Guardia de entrada. Devuelve la `Response` que corta la petición, o `null`
 * si puede seguir.
 *
 * - Módulo apagado → 404.
 * - `manager`: lo que mueve dinero o configura (catálogo, equipo, reportes) es
 *   solo del dueño/administrador, como el resto de Ajustes. Un miembro del
 *   equipo recibe 403.
 */
export function salonGate(
  session: SessionContext,
  access: "manager" | "member"
): Response | null {
  if (!salonEnabled()) return salonDisabledResponse();
  if (access === "manager" && !canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo el dueño o un administrador puede hacer esto");
  }
  return null;
}

/** Postgres: ¿este error (o su `cause`, que es donde Drizzle lo envuelve) trae ese SQLSTATE? */
export function isPgError(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  if ((err as { code?: unknown }).code === code) return true;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === code
  );
}

export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";

/** Errores esperados → respuesta con el contrato `{ error: { code, message } }`. Lo demás se relanza (500). */
export function salonErrorResponse(err: unknown): Response {
  if (err instanceof SalonError) return apiError(err.status, err.code, err.message);
  if (err instanceof PeriodError) return apiError(422, "invalid_range", err.message);
  throw err;
}
