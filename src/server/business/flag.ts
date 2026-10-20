import { parseAgendaFlag } from "@/server/agenda/flag";

/**
 * Módulo SALON — barberías, salones y manicure: catálogo de servicios y
 * combos, equipo con comisiones y horarios, caja y agenda por sillas.
 *
 * Misma decisión que la agenda y los canales opcionales (ADR-001): el código
 * viaja siempre en main y lo que decide si EXISTE para el usuario es una
 * variable de despliegue, apagada por defecto. Una instancia que no es una
 * barbería no ve nada de esto: ni menú, ni pantallas, ni rutas. La migración
 * se aplica igual (unas tablas vacías son inertes).
 *
 * Se lee de `process.env` directo, como `agendaEnabled()`: preguntar si una
 * feature existe no puede depender de que TODO el entorno valide.
 */

/** Mismos valores de "encendida" que `AGENDA`: una sola manera de decir que sí. */
export const parseSalonFlag = parseAgendaFlag;

export function salonEnabled(): boolean {
  return parseSalonFlag(process.env.SALON);
}

/**
 * Respuesta para una superficie apagada. 404 y no 403: si el módulo no está
 * encendido, ese endpoint no existe en esta instancia.
 */
export function salonDisabledResponse(): Response {
  return new Response(null, { status: 404 });
}
