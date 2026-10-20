import { describe, expect, it } from "vitest";
import { allocateAmounts, splitAmount } from "@/lib/salon/commission";
import { PAYMENT_LABELS, PAYMENT_METHODS } from "@/lib/salon/schemas";

describe("carrito: el total se reparte entre los ítems sin perder un centavo", () => {
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it("si el total es la suma de los precios, cada ítem conserva el suyo", () => {
    expect(allocateAmounts([2500, 1500, 4000], 8000)).toEqual([2500, 1500, 4000]);
  });

  it("un solo ítem se queda con todo el total (aunque se haya editado)", () => {
    expect(allocateAmounts([2500], 2000)).toEqual([2000]);
  });

  it("si se edita el total, la diferencia se reparte proporcional y la suma es exacta", () => {
    const r = allocateAmounts([3000, 1000], 3200); // descuento de 800
    expect(r).toEqual([2400, 800]);
    expect(suma(r)).toBe(3200);
  });

  it("los redondeos nunca pierden ni inventan un centavo", () => {
    for (const [bases, total] of [
      [[1000, 1000, 1000], 1000],
      [[3333, 3333, 3334], 9999],
      [[1, 1, 1], 100],
      [[2500, 1500], 1],
      [[700, 300, 200], 1234],
    ] as [number[], number][]) {
      const r = allocateAmounts(bases, total);
      expect(suma(r), JSON.stringify([bases, total])).toBe(total);
      expect(r.every((x) => Number.isInteger(x) && x >= 0)).toBe(true);
    }
  });

  it("con precios en cero se reparte por partes iguales", () => {
    const r = allocateAmounts([0, 0, 0], 100);
    expect(suma(r)).toBe(100);
    expect(Math.max(...r) - Math.min(...r)).toBeLessThanOrEqual(1);
  });

  it("la comisión de la venta es la suma de la de cada ítem (cada uno con su porcentaje)", () => {
    const items = [
      { amount: 6000, pct: 50 },
      { amount: 4000, pct: 30 },
    ];
    const comision = items.reduce((a, i) => a + splitAmount(i.amount, i.pct).staffCommissionCents, 0);
    expect(comision).toBe(3000 + 1200);
  });
});

describe("métodos de pago", () => {
  it("Efectivo, Yape / Plin, Tarjeta y Otro", () => {
    expect(PAYMENT_METHODS.map((m) => PAYMENT_LABELS[m])).toEqual([
      "Efectivo",
      "Yape / Plin",
      "Tarjeta",
      "Otro",
    ]);
  });
});
