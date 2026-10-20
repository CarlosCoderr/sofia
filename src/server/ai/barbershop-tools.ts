import { getDb } from "@/lib/db";
import { booking } from "@/lib/db/schema";
import { newId } from "@/lib/db/ids";
import { computeAvailability } from "@/server/agenda/availability";

/**
 * Herramienta 1: El agente la llama para consultar la disponibilidad en una fecha (ej. "2026-10-18")
 */
export async function toolCheckAvailability(input: {
  organizationId: string;
  date: string; // Formato YYYY-MM-DD
}) {
  try {
    const slots = await computeAvailability(input.organizationId, {
      fromISO: input.date,
      toISO: input.date,
    });

    if (slots.length === 0) {
      return { ok: false, message: "No hay horarios disponibles para esta fecha." };
    }

    // Retornamos las horas de inicio disponibles para que el LLM se las muestre al cliente
    const availableTimes = slots.map((s) => s.label);
    return { ok: true, availableTimes };
  } catch {
    return { ok: false, message: "Error al consultar la agenda." };
  }
}

/**
 * Herramienta 2: El agente la llama cuando el cliente confirma la hora exacta para agendar.
 */
export async function toolCreateBooking(input: {
  organizationId: string;
  contactId: string;
  conversationId: string;
  scheduledAtIso: string; // "2026-10-18T16:00:00Z"
  durationMinutes?: number;
  notes?: string;
}) {
  const db = getDb();

  try {
    const bookingId = newId("booking");

    await db.insert(booking).values({
      id: bookingId,
      organizationId: input.organizationId,
      contactId: input.contactId,
      conversationId: input.conversationId,
      kind: "session",
      status: "agendada",
      source: "ai",
      scheduledAt: new Date(input.scheduledAtIso),
      durationMinutes: input.durationMinutes ?? 30,
      connector: "enlace-fijo",
      notes: input.notes || "Agendado automáticamente por el Agente de IA",
    });

    return {
      ok: true,
      message: "¡Cita agendada con éxito!",
      bookingId,
    };
  } catch (error: unknown) {
    // Si choca con el unique index de doble booking, Postgres arroja error de duplicidad
    if ((error as { code?: string } | null)?.code === "23505") {
      return {
        ok: false,
        error: "slot_taken",
        message: "Lo siento, ese horario acaba de ser ocupado por otro cliente. Por favor elige otro.",
      };
    }
    return {
      ok: false,
      error: "server_error",
      message: "No se pudo completar la reserva debido a un error técnico.",
    };
  }
}