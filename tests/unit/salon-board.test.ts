import { describe, expect, it } from "vitest";
import { buildBoardSlots, type StaffShift } from "@/server/business/board";

/**
 * Módulo SALON — los cupos del tablero por sillas (la regla multicupo).
 * Zona de Lima (UTC−5, sin horario de verano): 09:00 local = 14:00 UTC.
 */

const TZ = "America/Lima";
const DATE = "2026-10-19";
const NOW_BEFORE = new Date("2026-10-19T12:00:00Z"); // 07:00 local: nada ha pasado

/** Franja de 30 min a partir de una hora local de ese día. */
function slot(localHour: number, localMin = 0, minutes = 30) {
  const start = Date.UTC(2026, 9, 19, localHour + 5, localMin);
  return {
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(start + minutes * 60_000).toISOString(),
  };
}

const SLOTS = [slot(9), slot(9, 30), slot(10), slot(10, 30)];
const A = { id: "stf_a" };
const B = { id: "stf_b" };
const C = { id: "stf_c" };

function build(over: Partial<Parameters<typeof buildBoardSlots>[0]> = {}) {
  return buildBoardSlots({
    candidates: SLOTS,
    members: [A, B, C],
    shifts: new Map<string, StaffShift>(),
    sessions: [],
    blocks: [],
    date: DATE,
    timezone: TZ,
    now: NOW_BEFORE,
    ...over,
  });
}

describe("buildBoardSlots", () => {
  it("sin citas: todas las sillas libres", () => {
    const [first] = build();
    expect(first).toMatchObject({ capacity: 3, booked: 0, free: 3, blocked: false, past: false });
    expect(first!.time).toBe("09:00");
    expect(first!.workingStaffIds).toEqual(["stf_a", "stf_b", "stf_c"]);
  });

  it("multicupo: la franja se llena cuando las citas igualan a las sillas", () => {
    const at9 = SLOTS[0]!;
    const rows = (n: number) => Array.from({ length: n }, () => ({ ...at9 }));
    expect(build({ sessions: rows(1) })[0]!.free).toBe(2);
    expect(build({ sessions: rows(2) })[0]!.free).toBe(1);
    expect(build({ sessions: rows(3) })[0]!.free).toBe(0);
    // Las demás franjas no se tocan.
    expect(build({ sessions: rows(3) })[1]!.free).toBe(3);
  });

  it("nunca baja de 0 cupos aunque haya más citas que sillas", () => {
    const at9 = SLOTS[0]!;
    expect(build({ sessions: Array.from({ length: 5 }, () => ({ ...at9 })) })[0]!.free).toBe(0);
  });

  it("una cita de 60 min ocupa las dos franjas de 30 que toca", () => {
    const long = { startUtc: SLOTS[0]!.startUtc, endUtc: SLOTS[1]!.endUtc };
    const out = build({ sessions: [long] });
    expect(out.map((s) => s.booked)).toEqual([1, 1, 0, 0]);
  });

  it("un día libre quita al profesional de la franja", () => {
    const shifts = new Map<string, StaffShift>([
      ["stf_b", { isOff: true, startTime: "09:00", endTime: "18:00" }],
    ]);
    const [first] = build({ shifts });
    expect(first!.workingStaffIds).toEqual(["stf_a", "stf_c"]);
    expect(first!.capacity).toBe(2);
    expect(first!.free).toBe(2);
  });

  it("un horario propio solo cubre las franjas que CABEN completas dentro", () => {
    const shifts = new Map<string, StaffShift>([
      ["stf_c", { isOff: false, startTime: "10:00", endTime: "11:00" }],
    ]);
    const out = build({ shifts });
    // 09:00 y 09:30 antes de que entre; 10:00 y 10:30 ya dentro.
    expect(out.map((s) => s.workingStaffIds.includes("stf_c"))).toEqual([false, false, true, true]);
    expect(out.map((s) => s.capacity)).toEqual([2, 2, 3, 3]);
  });

  it("una franja que se pasa de la hora de salida no cuenta", () => {
    const shifts = new Map<string, StaffShift>([
      ["stf_a", { isOff: false, startTime: "09:00", endTime: "10:15" }],
    ]);
    const out = build({ shifts });
    expect(out[2]!.workingStaffIds).not.toContain("stf_a"); // 10:00–10:30 no cabe en …10:15
    expect(out[1]!.workingStaffIds).toContain("stf_a");
  });

  it("un bloqueo apaga la franja: 0 cupos y marcada", () => {
    const [first, second] = build({ blocks: [SLOTS[0]!] });
    expect(first).toMatchObject({ blocked: true, free: 0 });
    expect(second).toMatchObject({ blocked: false, free: 3 });
  });

  it("sin equipo dado de alta hay UNA silla, como el motor de disponibilidad", () => {
    const [first] = build({ members: [] });
    expect(first).toMatchObject({ capacity: 1, free: 1, workingStaffIds: [] });
    expect(build({ members: [], sessions: [SLOTS[0]!] })[0]!.free).toBe(0);
  });

  it("con equipo pero nadie de turno, capacidad 0", () => {
    const shifts = new Map<string, StaffShift>(
      [A, B, C].map((m) => [m.id, { isOff: true, startTime: "09:00", endTime: "18:00" }])
    );
    const [first] = build({ shifts });
    expect(first).toMatchObject({ capacity: 0, free: 0 });
  });

  it("marca como pasadas las franjas que ya terminaron", () => {
    const now = new Date("2026-10-19T14:45:00Z"); // 09:45 local
    expect(build({ now }).map((s) => s.past)).toEqual([true, false, false, false]);
  });
});
