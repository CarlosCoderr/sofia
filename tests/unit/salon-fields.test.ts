import { describe, expect, it } from "vitest";
import { formatPhone9, minutesToTime, sanitizeDecimal, timeToMinutes } from "@/components/negocio/fields";

describe("campos del catálogo", () => {
  it("precio: solo dígitos y un punto, con 2 decimales", () => {
    expect(sanitizeDecimal("12,5")).toBe("12.5");
    expect(sanitizeDecimal("12.345")).toBe("12.34");
    expect(sanitizeDecimal("1.2.3")).toBe("1.23");
    expect(sanitizeDecimal("S/ 25abc")).toBe("25");
    expect(sanitizeDecimal("")).toBe("");
  });

  it("duración: minutos ⇄ hora HH:MM", () => {
    expect(minutesToTime("30")).toBe("00:30");
    expect(minutesToTime("90")).toBe("01:30");
    expect(minutesToTime("")).toBe("");
    expect(minutesToTime("abc")).toBe("");
    expect(timeToMinutes("00:45")).toBe("45");
    expect(timeToMinutes("02:00")).toBe("120");
    expect(timeToMinutes("")).toBe("");
  });

  it("celular: formato 999 999 999", () => {
    expect(formatPhone9("987654321")).toBe("987 654 321");
    expect(formatPhone9("98765")).toBe("987 65");
    expect(formatPhone9("987 654 3219999")).toBe("987 654 321");
    expect(formatPhone9("")).toBe("");
  });
});
