import { describe, expect, it } from "vitest";
import {
  centsToInput,
  csvCell,
  currencySymbol,
  dateTimeLabel,
  durationLabel,
  money,
  scheduleSummary,
} from "@/lib/salon/format";
import { parseMoneyToCents } from "@/lib/money";

/** Intl separa el símbolo del número con un espacio duro (U+00A0). */
const plain = (text: string) => text.split(String.fromCharCode(160)).join(" ");

describe("dinero", () => {
  it("escribe soles como en Perú y pesos como en México", () => {
    expect(plain(money(2500, "PEN"))).toBe("S/ 25.00");
    expect(plain(money(2500, "MXN"))).toBe("$25.00");
    expect(money(null, "PEN")).toBe("—");
  });

  it("el símbolo suelto acompaña al campo de monto", () => {
    expect(currencySymbol("PEN")).toBe("S/");
    expect(currencySymbol("MXN")).toBe("$");
  });

  it("ida y vuelta: centavos → texto del campo → centavos", () => {
    for (const cents of [0, 5, 250, 2500, 123_456]) {
      expect(parseMoneyToCents(centsToInput(cents))).toBe(cents);
    }
  });
});

describe("duración y fechas", () => {
  it("duración legible", () => {
    expect(durationLabel(30)).toBe("30 min");
    expect(durationLabel(60)).toBe("1 h");
    expect(durationLabel(90)).toBe("1 h 30 min");
  });

  it("la hora de una venta es la del NEGOCIO, no la del navegador", () => {
    // 2026-10-17 02:30 UTC es el 16 a las 21:30 en Lima y el 17 a las 04:30 en Madrid.
    const iso = "2026-10-17T02:30:00.000Z";
    expect(dateTimeLabel(iso, "America/Lima")).toBe("16 oct, 21:30");
    expect(dateTimeLabel(iso, "Europe/Madrid")).toBe("17 oct, 04:30");
    expect(dateTimeLabel("no es una fecha", "America/Lima")).toBe("—");
  });
});

describe("csvCell", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(csvCell('Juan "el Rápido"')).toBe('"Juan ""el Rápido"""');
    expect(csvCell("Pérez, Ana")).toBe('"Pérez, Ana"');
    expect(csvCell("línea1\nlínea2")).toBe('"línea1\nlínea2"');
    expect(csvCell("normal")).toBe("normal");
  });

  it("neutraliza las fórmulas que Excel ejecutaría (un nombre de cliente es input externo)", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toMatch(/^"'=/);
    expect(csvCell("+52 999")).toBe("'+52 999");
    expect(csvCell("@usuario")).toBe("'@usuario");
    expect(csvCell("-cmd")).toBe("'-cmd");
  });

  it("un número negativo NO se toca (no es texto)", () => {
    expect(csvCell(-12.5)).toBe("-12.5");
  });
});

describe("scheduleSummary", () => {
  const d = (dayOfWeek: number, isOff: boolean, startTime = "10:00", endTime = "20:00") => ({
    dayOfWeek,
    isOff,
    startTime,
    endTime,
  });

  it("sin filas sigue al negocio", () => {
    expect(scheduleSummary([])).toBe("Sigue el horario del negocio");
  });

  it("lista los días libres de lunes a domingo", () => {
    expect(scheduleSummary([d(0, true), d(1, true)])).toBe("Libre: Lun, Dom");
  });

  it("un día con horas propias se dice completo; varios se cuentan", () => {
    expect(scheduleSummary([d(6, false, "08:00", "14:00")])).toBe("Sáb 08:00–14:00");
    expect(scheduleSummary([d(5, false), d(6, false)])).toBe("2 días con horario propio");
    expect(scheduleSummary([d(0, true), d(6, false, "08:00", "14:00")])).toBe(
      "Libre: Dom · Sáb 08:00–14:00"
    );
  });
});
