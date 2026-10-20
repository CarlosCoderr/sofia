import { describe, expect, it } from "vitest";
import { resolvePeriod } from "@/server/analytics/period";
import { comparisonRange } from "@/server/business/dashboard";
import { percentChange } from "@/components/negocio/dashboard-widgets";

const TZ = "America/Lima";
const range = (from: string, to: string) => comparisonRange(resolvePeriod({ from, to, timezone: TZ }));

describe("panel: con qué se compara el periodo", () => {
  it("este mes (del 1 a hoy) se compara con el mismo tramo del mes anterior", () => {
    expect(range("2026-10-01", "2026-10-20")).toEqual({
      kind: "month",
      from: "2026-09-01",
      to: "2026-09-20",
    });
  });

  it("el tramo se recorta si el mes anterior es más corto", () => {
    expect(range("2026-03-01", "2026-03-31")).toEqual({
      kind: "month",
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("un mes completo ya pasado también se compara con el anterior", () => {
    expect(range("2026-09-01", "2026-09-30")).toEqual({
      kind: "month",
      from: "2026-08-01",
      to: "2026-08-30",
    });
  });

  it("cualquier otro rango se compara con el tramo anterior de igual duración", () => {
    expect(range("2026-10-14", "2026-10-20")).toEqual({
      kind: "previous",
      from: "2026-10-07",
      to: "2026-10-13",
    });
    expect(range("2026-10-20", "2026-10-20")).toEqual({
      kind: "previous",
      from: "2026-10-19",
      to: "2026-10-19",
    });
  });
});

describe("panel: variación", () => {
  it("porcentaje contra la referencia; sin base no hay variación", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(25, 150)).toBe(-83);
    expect(percentChange(0, 25)).toBe(-100);
    expect(percentChange(10, 0)).toBeNull();
  });
});
