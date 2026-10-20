import { describe, expect, it } from "vitest";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { faviconHref } from "@/lib/favicon";
import { DEFAULT_FAVICON_SRC, tabIconHref } from "@/lib/favicon-default";

describe("icono de la pestaña por defecto", () => {
  it("sin logo propio es el de Agencia Luvo, no el generado", () => {
    expect(DEFAULT_FAVICON_SRC).toMatch(/favicon-agencia-luvo/);
    expect(tabIconHref(DEFAULT_BRANDING)).toBe(DEFAULT_FAVICON_SRC);
    // Cambiar nombre o color NO cambia el icono: solo subir un logo propio.
    expect(tabIconHref({ ...DEFAULT_BRANDING, name: "Acme", accent: "#ff0000" })).toBe(
      DEFAULT_FAVICON_SRC
    );
  });

  it("con un logo propio subido manda el suyo", () => {
    const propio = { ...DEFAULT_BRANDING, favicon: { mime: "image/png", version: 3 } };
    expect(tabIconHref(propio)).toBe(faviconHref(propio));
    expect(tabIconHref(propio)).toContain("/api/branding/favicon?v=u3");
  });

  it("al quitar el logo propio vuelve al de la agencia", () => {
    expect(tabIconHref({ ...DEFAULT_BRANDING, favicon: null })).toBe(DEFAULT_FAVICON_SRC);
  });
});
