import { describe, expect, it } from "vitest";
import { buildBusyIntervals, filterFreeSlots, type BusyRow } from "@/server/agenda/availability";

/**
 * Multicupo (módulo SALON): con N sillas el negocio se llena cuando N citas
 * coinciden EN EL TIEMPO; un bloqueo, en cambio, siempre ocupa su intervalo.
 * Horas en UTC para no depender de la zona.
 */

const at = (hhmm: string) => `2026-10-19T${hhmm}:00.000Z`;
const session = (from: string, to: string): BusyRow => ({ kind: "session", startUtc: at(from), endUtc: at(to) });
const block = (from: string, to: string): BusyRow => ({ kind: "block", startUtc: at(from), endUtc: at(to) });
const span = (from: string, to: string) => ({ startUtc: at(from), endUtc: at(to) });

describe("buildBusyIntervals — una silla (el comportamiento de siempre)", () => {
  it("cada cita ocupa su intervalo", () => {
    expect(buildBusyIntervals([session("10:00", "10:30")], 1)).toEqual([span("10:00", "10:30")]);
  });

  it("citas pegadas quedan como tramos separados, sin solaparse", () => {
    const out = buildBusyIntervals([session("10:00", "10:30"), session("10:30", "11:00")], 1);
    // Terminan y empiezan en el mismo instante: nunca cuentan como simultáneas.
    expect(out).toEqual([span("10:00", "10:30"), span("10:30", "11:00")]);
  });

  it("una cita de 60 min ocupa los 60 (la duración real, no 30)", () => {
    expect(buildBusyIntervals([session("10:00", "11:00")], 1)).toEqual([span("10:00", "11:00")]);
  });

  it("sin sillas declaradas (0) se trata como una", () => {
    expect(buildBusyIntervals([session("10:00", "10:30")], 0)).toEqual([span("10:00", "10:30")]);
  });
});

describe("buildBusyIntervals — varias sillas", () => {
  it("con 3 sillas, 2 citas a la misma hora todavía dejan hueco", () => {
    expect(buildBusyIntervals([session("10:00", "10:30"), session("10:00", "10:30")], 3)).toEqual([]);
  });

  it("con 3 sillas, la tercera cita llena la franja", () => {
    const rows = [session("10:00", "10:30"), session("10:00", "10:30"), session("10:00", "10:30")];
    expect(buildBusyIntervals(rows, 3)).toEqual([span("10:00", "10:30")]);
  });

  it("solo está lleno el tramo donde coinciden las 3, aunque empiecen a distinta hora", () => {
    // A 10:00–10:30, B 10:15–10:45, C 10:20–10:50 → las tres a la vez de 10:20 a 10:30.
    const rows = [session("10:00", "10:30"), session("10:15", "10:45"), session("10:20", "10:50")];
    expect(buildBusyIntervals(rows, 3)).toEqual([span("10:20", "10:30")]);
  });

  it("una cita larga cuenta por TODA su duración (no solo en su hora de inicio)", () => {
    // La de 60 min empieza antes y sigue cuando entran las otras dos.
    const rows = [session("10:00", "11:00"), session("10:30", "11:00"), session("10:30", "11:00")];
    expect(buildBusyIntervals(rows, 3)).toEqual([span("10:30", "11:00")]);
  });

  it("citas que no coinciden nunca llenan la franja", () => {
    const rows = [session("10:00", "10:30"), session("10:30", "11:00"), session("11:00", "11:30")];
    expect(buildBusyIntervals(rows, 2)).toEqual([]);
  });

  it("datos corruptos (fin antes del inicio, fechas inválidas) se ignoran en vez de romper", () => {
    const rows: BusyRow[] = [
      session("11:00", "10:00"),
      { kind: "session", startUtc: "no-es-fecha", endUtc: at("10:30") },
      session("10:00", "10:30"),
    ];
    expect(buildBusyIntervals(rows, 1)).toEqual([span("10:00", "10:30")]);
  });
});

describe("buildBusyIntervals — bloqueos", () => {
  it("un bloqueo ocupa su intervalo completo aunque haya 3 sillas libres", () => {
    expect(buildBusyIntervals([block("15:00", "16:00")], 3)).toEqual([span("15:00", "16:00")]);
  });

  it("el bloqueo no se cuenta como «una cita más»: no ayuda a llenar las sillas", () => {
    const rows = [session("10:00", "10:30"), session("10:00", "10:30"), block("10:00", "10:30")];
    // 2 citas en 3 sillas → hueco; el bloqueo, aparte, sí cierra el tramo.
    expect(buildBusyIntervals(rows, 3)).toEqual([span("10:00", "10:30")]);
    expect(buildBusyIntervals(rows.slice(0, 2), 3)).toEqual([]);
  });
});

describe("integración con filterFreeSlots", () => {
  const candidates = [span("09:30", "10:00"), span("10:00", "10:30"), span("10:30", "11:00"), span("15:00", "15:30"), span("15:30", "16:00")];
  const opts = { now: new Date("2026-10-19T08:00:00Z"), minNoticeHours: 0, timezone: "UTC" };

  it("el bloqueo de 60 min quita las dos franjas que toca; el resto sigue libre", () => {
    const busy = buildBusyIntervals([block("15:00", "16:00")], 3);
    const free = filterFreeSlots(candidates, busy, opts).map((s) => s.startUtc);
    expect(free).toEqual([at("09:30"), at("10:00"), at("10:30")]);
  });

  it("con 3 sillas y 3 citas a las 10:00 solo esa franja desaparece", () => {
    const rows = [session("10:00", "10:30"), session("10:00", "10:30"), session("10:00", "10:30")];
    const free = filterFreeSlots(candidates, buildBusyIntervals(rows, 3), opts).map((s) => s.startUtc);
    expect(free).toEqual([at("09:30"), at("10:30"), at("15:00"), at("15:30")]);
  });
});
