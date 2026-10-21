"use client";

import type { Range } from "@/components/results/range-picker";
import { addDaysISO } from "@/lib/time/slots";

/**
 * Módulo SALON — lo que comparten Caja y el Panel del selector de fechas: los
 * atajos de periodo.
 */

/** Atajos del selector de fechas: el día y el mes son lo que un dueño mira. */
export function presets(today: string): { label: string; range: Range }[] {
  const ayer = addDaysISO(today, -1);
  const primeroDeMes = `${today.slice(0, 8)}01`;
  const finMesPasado = addDaysISO(primeroDeMes, -1);
  return [
    { label: "Hoy", range: { from: today, to: today } },
    { label: "Ayer", range: { from: ayer, to: ayer } },
    { label: "7 días", range: { from: addDaysISO(today, -6), to: today } },
    { label: "Este mes", range: { from: primeroDeMes, to: today } },
    { label: "Mes pasado", range: { from: `${finMesPasado.slice(0, 8)}01`, to: finMesPasado } },
  ];
}
