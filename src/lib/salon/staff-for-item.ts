import { activeProviders, staffCanGive, type ProviderItem } from "@/lib/salon/providers";
import type { SaleOptionsDto } from "@/lib/salon/types";

/**
 * Módulo SALON — qué profesionales pueden cobrar un servicio u oferta.
 *
 * Manda la lista del servicio u oferta (quiénes lo dan); sin detallar, todos. La
 * caja lo usa para ofrecer solo a quien corresponde (el servidor hace valer la misma regla:
 * `staff_not_assigned`).
 *
 * `itemValue` es el valor del desplegable: `service:<id>`, `combo:<id>` u
 * `other` («Otro» lo da cualquiera).
 */
function itemOf(options: SaleOptionsDto | null, itemValue: string): ProviderItem | null {
  if (!options) return null;
  const [kind, id] = itemValue.split(":");
  const list = kind === "service" ? options.services : kind === "combo" ? options.combos : [];
  const found = list.find((x) => x.id === id);
  return found && (kind === "service" || kind === "combo")
    ? { kind, id: found.id, staffIds: found.staffIds }
    : null;
}

/** Los profesionales activos que pueden dar el ítem elegido (todos si no hay restricción). */
export function staffForItem(
  options: SaleOptionsDto | null,
  itemValue: string
): SaleOptionsDto["staff"] {
  const staff = options?.staff ?? [];
  const item = itemOf(options, itemValue);
  if (!item) return staff;
  return activeProviders(
    item,
    staff.map((m) => ({ ...m, active: true }))
  );
}

/** ¿Hay alguien excluido para este ítem? (para avisarlo bajo el campo) */
export function itemIsRestricted(options: SaleOptionsDto | null, itemValue: string): boolean {
  return staffForItem(options, itemValue).length < (options?.staff.length ?? 0);
}

/**
 * El profesional a dejar elegido tras cambiar de ítem: el mismo si sigue
 * valiendo; si no, el único que queda (si queda uno solo); si no, ninguno.
 */
export function staffAfterItemChange(
  options: SaleOptionsDto | null,
  itemValue: string,
  currentStaffId: string
): string {
  const candidates = staffForItem(options, itemValue);
  if (currentStaffId && candidates.some((m) => m.id === currentStaffId)) return currentStaffId;
  return itemIsRestricted(options, itemValue) && candidates.length === 1 ? candidates[0]!.id : "";
}

/** Los profesionales que dan TODOS los ítems elegidos (un carrito con varios). */
export function staffForItems(
  options: SaleOptionsDto | null,
  itemValues: string[]
): SaleOptionsDto["staff"] {
  const staff = options?.staff ?? [];
  return staff.filter((m) => itemValues.every((v) => staffMayGive(options, v, m.id)));
}

/** ¿Hay alguien excluido por alguno de los ítems elegidos? */
export function itemsAreRestricted(options: SaleOptionsDto | null, itemValues: string[]): boolean {
  return staffForItems(options, itemValues).length < (options?.staff.length ?? 0);
}

/**
 * El profesional a dejar elegido tras cambiar el carrito: el mismo si sigue
 * valiendo para todos los ítems; si no, el único que queda (si queda uno solo
 * por una restricción); si no, ninguno.
 */
export function staffAfterItemsChange(
  options: SaleOptionsDto | null,
  itemValues: string[],
  currentStaffId: string
): string {
  const candidates = staffForItems(options, itemValues);
  if (currentStaffId && candidates.some((m) => m.id === currentStaffId)) return currentStaffId;
  return itemsAreRestricted(options, itemValues) && candidates.length === 1 ? candidates[0]!.id : "";
}

/** ¿Puede este profesional dar este ítem? (para validar antes de enviar) */
function staffMayGive(
  options: SaleOptionsDto | null,
  itemValue: string,
  staffId: string
): boolean {
  const item = itemOf(options, itemValue);
  const member = options?.staff.find((m) => m.id === staffId);
  if (!item || !member) return true;
  return staffCanGive(item, { ...member, active: true });
}
