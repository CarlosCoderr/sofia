"use client";

import { DetailSelect, detailIdsToSend } from "@/components/negocio/detail-select";
import type { ProviderItem } from "@/lib/salon/providers";

/** Un profesional para elegir o para calcular quién da qué. */
export type StaffOption = {
  id: string;
  name: string;
  active: boolean;
};

/**
 * «Detallar profesionales que dan el servicio (Opcional)».
 *
 * Casilla apagada (lo normal): no se detalla y lo dan TODOS los profesionales —
 * es lo que se guarda (`staffIds: []`). Encendida: una lista con buscador para
 * marcar cuáles. Igual en servicios y en ofertas.
 */
export function StaffSelect(props: {
  staff: StaffOption[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const { staff, ...rest } = props;
  return (
    <DetailSelect
      {...rest}
      options={staff}
      checkboxLabel="Detallar profesionales que dan el servicio (Opcional)"
      offHint="Sin detallar: lo dan todos los profesionales."
      emptyNote="Aún no hay profesionales. Agrégalos en «Equipo» para poder elegirlos aquí."
      groupLabel="Profesionales que lo dan"
      searchLabel="Buscar profesional"
    />
  );
}

/** Lo que se manda a la API para los profesionales de un servicio u oferta. */
export function staffIdsToSend(
  enabled: boolean,
  selected: string[]
): { staffIds: string[]; error?: string } {
  const r = detailIdsToSend(
    enabled,
    selected,
    "Elige al menos un profesional, o desactiva la casilla para que lo den todos."
  );
  return { staffIds: r.ids, error: r.error };
}

/** Lo que se lee cuando nadie queda excluido de un servicio u oferta. */
const TODOS_LOS_PROFESIONALES = "Todos los profesionales";

function label(names: string[]): string {
  return `${names.length === 1 ? "Profesional" : "Profesionales"}: ${names.join(", ")}`;
}

/**
 * Cómo se muestra quién da un servicio u oferta en su previsualización: sin
 * detallar, «Todos los profesionales»; con detallados, «Profesional: Cheo» (uno) o
 * «Profesionales: Cheo, Mari» (varios), en el orden del equipo.
 */
export function staffPreview(item: ProviderItem, staff: StaffOption[]): string {
  if (item.staffIds.length > 0) {
    // Los que nombra el servicio (aunque alguno esté inactivo: reactivarlo lo devuelve).
    const named = staff.filter((m) => item.staffIds.includes(m.id));
    return named.length > 0 ? label(named.map((m) => m.name)) : "Profesional: —";
  }
  return TODOS_LOS_PROFESIONALES;
}
