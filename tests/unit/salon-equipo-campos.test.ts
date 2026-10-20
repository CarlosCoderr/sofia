import { describe, expect, it } from "vitest";
import { staffInputSchema, staffPatchSchema } from "@/lib/salon/schemas";
import { activeProviders, isOpenToAll, staffCanGive } from "@/lib/salon/providers";
import {
  formatStaffPhone,
  isPersonName,
  normalizeStaffPhone,
  phoneToDigits,
  sanitizePersonName,
  tidyPersonName,
} from "@/lib/salon/staff-fields";

/**
 * Equipo: nombre solo con letras, celular de 9 dígitos con +51, y los servicios
 * que hace cada profesional (la lista «espejo» de la de cada servicio).
 */

const MEDIA = "med_abcdefghij0123456789";
const S1 = "srv_aaaaaaaaaaaaaaaaaaaa";

describe("nombre: solo letras y espacios", () => {
  it("acepta nombres con tildes, ñ y varios espacios (que se ordenan solos)", () => {
    for (const n of ["Carlos", "María José", "Ñandú", "Óscar Núñez", "Zoë"]) {
      expect(isPersonName(n), n).toBe(true);
    }
    const r = staffInputSchema.safeParse({ name: "  María   José  " });
    expect(r.success && r.data.name).toBe("María José");
  });

  it("rechaza números y signos, con un mensaje claro", () => {
    for (const n of ["Carlos2", "Ana-María", "J@vier", "Mr. X", "Pedro_1", "Luis#", "123"]) {
      const r = staffInputSchema.safeParse({ name: n });
      expect(r.success, n).toBe(false);
      if (!r.success) expect(r.error.issues[0]!.message).toMatch(/solo admite letras y espacios/);
    }
  });

  it("rechaza vacío, de una letra o solo espacios", () => {
    for (const n of ["", "A", "   "]) expect(staffInputSchema.safeParse({ name: n }).success, n).toBe(false);
  });

  it("al teclear o pegar se quita lo que no es letra (no se puede escribir)", () => {
    expect(sanitizePersonName("Carlos123")).toBe("Carlos");
    expect(sanitizePersonName("Ana-María!")).toBe("AnaMaría");
    expect(sanitizePersonName("  Mi Nombre ")).toBe("  Mi Nombre ");
    expect(tidyPersonName("  a   b ")).toBe("a b");
  });
});

describe("celular: exactamente 9 dígitos, +51 fijo", () => {
  it("acepta 9 dígitos y lo guarda con el +51", () => {
    const r = staffInputSchema.safeParse({ name: "Ana Ruiz", phone: "987654321" });
    expect(r.success && r.data.phone).toBe("+51987654321");
  });

  it("acepta la forma que ya trae el +51 (espacios y guiones se ignoran)", () => {
    expect(normalizeStaffPhone("+51 987 654 321")).toBe("+51987654321");
    expect(normalizeStaffPhone("987-654-321")).toBe("+51987654321");
  });

  it("vacío o ausente: el celular es opcional", () => {
    const vacio = staffInputSchema.safeParse({ name: "Ana Ruiz", phone: "" });
    expect(vacio.success && vacio.data.phone).toBeNull();
    const ausente = staffInputSchema.safeParse({ name: "Ana Ruiz" });
    expect(ausente.success && ausente.data.phone).toBeUndefined();
  });

  it("rechaza menos o más de 9 dígitos, letras y otros prefijos", () => {
    for (const p of ["98765432", "9876543210", "98765432a", "abcdefghi", "+34987654321", "51987654321x", "9 8 7"]) {
      const r = staffInputSchema.safeParse({ name: "Ana Ruiz", phone: p });
      expect(r.success, p).toBe(false);
      if (!r.success) expect(r.error.issues[0]!.message).toMatch(/exactamente 9 dígitos/);
    }
  });

  it("un PATCH sin celular no lo toca; con celular lo valida", () => {
    const sin = staffPatchSchema.safeParse({ active: false });
    expect(sin.success && sin.data.phone).toBeUndefined();
    expect(staffPatchSchema.safeParse({ phone: "123" }).success).toBe(false);
  });

  it("lo guardado en otros formatos se lleva a sus 9 dígitos para editarlo", () => {
    expect(phoneToDigits("+51 987 654 321")).toBe("987654321");
    expect(phoneToDigits("987-654-321")).toBe("987654321");
    expect(phoneToDigits("51987654321")).toBe("987654321");
    expect(phoneToDigits(null)).toBe("");
    // Algo que no cabe en 9 se conserva para que la validación pida corregirlo.
    expect(phoneToDigits("12345")).toBe("12345");
  });

  it("se muestra con espacios", () => {
    expect(formatStaffPhone("+51987654321")).toBe("+51 987 654 321");
    expect(formatStaffPhone(null)).toBe("");
    expect(formatStaffPhone("raro")).toBe("raro");
  });
});

describe("contrato: foto del profesional", () => {
  it("es opcional", () => {
    const r = staffInputSchema.safeParse({ name: "Ana Ruiz" });
    expect(r.success && r.data.imageMediaId).toBeUndefined();
  });

  it("la foto es el id de un medio (null la quita), no una URL", () => {
    expect(staffInputSchema.safeParse({ name: "Ana Ruiz", imageMediaId: MEDIA }).success).toBe(true);
    expect(staffInputSchema.safeParse({ name: "Ana Ruiz", imageMediaId: null }).success).toBe(true);
    expect(staffInputSchema.safeParse({ name: "Ana Ruiz", imageMediaId: "https://x.com/a.jpg" }).success).toBe(false);
  });

  it("el perfil ya no guarda servicios: el campo se ignora", () => {
    const r = staffInputSchema.safeParse({ name: "Ana Ruiz", serviceIds: ["srv_aaaaaaaaaaaaaaaaaaaa"] });
    expect(r.success && "serviceIds" in r.data).toBe(false);
  });
});

describe("quién puede dar qué: solo manda la lista del servicio u oferta", () => {
  const staff = [
    { id: "a", active: true },
    { id: "b", active: true },
    { id: "d", active: false },
  ];
  const svc = (staffIds: string[] = []) => ({ kind: "service" as const, id: S1, staffIds });

  it("sin lista, lo da todo el equipo activo", () => {
    expect(activeProviders(svc(), staff).map((m) => m.id)).toEqual(["a", "b"]);
    expect(isOpenToAll(svc(), staff)).toBe(true);
  });

  it("con lista, solo los nombrados", () => {
    expect(activeProviders(svc(["b"]), staff).map((m) => m.id)).toEqual(["b"]);
    expect(staffCanGive(svc(["b"]), staff[0]!)).toBe(false);
    expect(isOpenToAll(svc(["b"]), staff)).toBe(false);
  });

  it("un inactivo no cuenta para decidir si está abierto a todos", () => {
    expect(isOpenToAll(svc(), staff)).toBe(true);
  });
});
