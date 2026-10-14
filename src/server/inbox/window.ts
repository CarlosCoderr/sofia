/**
 * Ventana de servicio: solo se puede enviar texto libre dentro de cierto
 * tiempo tras el último mensaje ENTRANTE. Una conversación sin entrantes
 * (p. ej. iniciada por plantilla) tiene la ventana cerrada.
 *
 * 022 — La duración es del canal: 24 horas en WhatsApp, Instagram y Messenger,
 * 48 en TikTok. Sale de `windowMsFor(channel)`
 * (`src/server/channels/capabilities.ts`); el valor por defecto de aquí es la
 * de WhatsApp, para quien no tiene una conversación a mano.
 */

export const WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWindowOpen(
  lastInboundAt: Date | null,
  now: Date = new Date(),
  windowMs: number = WINDOW_MS
): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - lastInboundAt.getTime() < windowMs;
}

/** Milisegundos restantes de ventana (0 si está cerrada). */
export function windowRemainingMs(
  lastInboundAt: Date | null,
  now: Date = new Date(),
  windowMs: number = WINDOW_MS
): number {
  if (!lastInboundAt) return 0;
  // Un canal sin ventana no se cierra nunca: no hay «restante» que contar.
  if (!Number.isFinite(windowMs)) return Number.MAX_SAFE_INTEGER;
  const remaining = windowMs - (now.getTime() - lastInboundAt.getTime());
  return Math.max(0, remaining);
}

/** Cuándo se cierra la ventana; null sin entrantes o en un canal sin ventana. */
export function windowExpiresAt(
  lastInboundAt: Date | null,
  windowMs: number = WINDOW_MS
): Date | null {
  if (!lastInboundAt || !Number.isFinite(windowMs)) return null;
  return new Date(lastInboundAt.getTime() + windowMs);
}
