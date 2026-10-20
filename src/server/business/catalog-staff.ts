import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

/**
 * Módulo SALON — qué profesionales dan cada servicio y oferta.
 *
 * SIN filas = lo da TODO el equipo (el valor por defecto); con filas, solo los
 * listados. Vive aparte de `catalog.ts` a propósito: lo consultan el contexto
 * del agente de IA y la caja, y `catalog.ts` arrastra los route handlers (la
 * sesión de Better Auth), que el camino del agente no debe cargar.
 */

type Tx = Pick<ReturnType<typeof getDb>, "select">;

function groupBy(rows: { id: string; staffId: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.id, [...(map.get(r.id) ?? []), r.staffId]);
  return map;
}

export async function serviceStaffMap(organizationId: string): Promise<Map<string, string[]>> {
  return groupBy(
    await getDb()
      .select({ id: schema.serviceStaff.serviceId, staffId: schema.serviceStaff.staffId })
      .from(schema.serviceStaff)
      .where(scoped(schema.serviceStaff.organizationId, organizationId))
  );
}

export async function comboStaffMap(organizationId: string): Promise<Map<string, string[]>> {
  return groupBy(
    await getDb()
      .select({ id: schema.comboStaff.comboId, staffId: schema.comboStaff.staffId })
      .from(schema.comboStaff)
      .where(scoped(schema.comboStaff.organizationId, organizationId))
  );
}

/**
 * Los profesionales de cada servicio y oferta, para la caja y el agente: quién
 * puede dar qué. Sin entrada en el mapa (o lista vacía) = todo el equipo.
 */
export async function catalogStaffMaps(organizationId: string) {
  const [services, combos] = await Promise.all([
    serviceStaffMap(organizationId),
    comboStaffMap(organizationId),
  ]);
  return { services, combos };
}

/**
 * ¿Puede este profesional dar este servicio u oferta? Manda la lista del servicio
 * u oferta (quiénes lo dan); sin filas, cualquiera. Lo usa la caja para no aceptar
 * por API lo que la pantalla ya no ofrece.
 */
export async function staffGivesItem(
  tx: Tx,
  organizationId: string,
  item: { kind: "service" | "combo"; id: string },
  staffId: string
): Promise<boolean> {
  const rows =
    item.kind === "combo"
      ? await tx
          .select({ staffId: schema.comboStaff.staffId })
          .from(schema.comboStaff)
          .where(
            scoped(schema.comboStaff.organizationId, organizationId, eq(schema.comboStaff.comboId, item.id))
          )
      : await tx
          .select({ staffId: schema.serviceStaff.staffId })
          .from(schema.serviceStaff)
          .where(
            scoped(
              schema.serviceStaff.organizationId,
              organizationId,
              eq(schema.serviceStaff.serviceId, item.id)
            )
          );
  return rows.length === 0 || rows.some((r) => r.staffId === staffId);
}
