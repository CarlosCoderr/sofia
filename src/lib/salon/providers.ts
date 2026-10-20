/**
 * Módulo SALON — quién puede dar qué.
 *
 * Solo hay UNA lista, la del servicio u oferta (`staffIds`): qué profesionales lo
 * dan. Vacía significa «todos» (el valor por defecto). El perfil del profesional
 * no restringe nada: todo profesional activo se puede elegir en cualquier servicio.
 *
 * Módulo puro (sin BD ni React): lo usan la previsualización, la caja y el
 * agente, así que lo que se ve y lo que se hace valer es siempre lo mismo.
 */

export type ProviderItem = {
  kind: "service" | "combo";
  id: string;
  /** Profesionales detallados en el servicio u oferta; vacío = todos. */
  staffIds: string[];
};

export type ProviderStaff = {
  id: string;
  active: boolean;
};

/** ¿Puede este profesional dar este servicio u oferta? (sin mirar si está activo) */
export function staffCanGive(item: ProviderItem, m: ProviderStaff): boolean {
  return item.staffIds.length === 0 || item.staffIds.includes(m.id);
}

/** Los profesionales ACTIVOS que pueden darlo. */
export function activeProviders<T extends ProviderStaff>(item: ProviderItem, staff: T[]): T[] {
  return staff.filter((m) => m.active && staffCanGive(item, m));
}

/** ¿Lo da todo el equipo activo, sin que nadie lo excluya? */
export function isOpenToAll(item: ProviderItem, staff: ProviderStaff[]): boolean {
  const active = staff.filter((m) => m.active);
  return activeProviders(item, active).length === active.length;
}
