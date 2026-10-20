import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  accentCssVariables,
  DEFAULT_BRANDING,
  isValidHex,
  normalizeBranding,
  resolveAccentSet,
} from "@/lib/branding";


/** Variables de un bloque de globals.css, con el valor sin saltos de línea. */
function variables(css: string, selector: string): Record<string, string> {
  const inicio = css.indexOf(selector);
  expect(inicio, `no está el bloque ${selector}`).toBeGreaterThanOrEqual(0);
  const cuerpo = css
    .slice(css.indexOf("{", inicio) + 1, css.indexOf("}", inicio))
    .replace(/\/\*[\s\S]*?\*\//g, ""); // un comentario puede nombrar un token
  return Object.fromEntries(
    [...cuerpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1]!,
      m[2]!.replace(/\s+/g, " ").trim(),
    ])
  );
}

describe("white-label: acento", () => {
  it("preset devuelve el set exacto del handoff", () => {
    expect(resolveAccentSet("#3f5972")).toEqual(ACCENT_PRESETS["#3f5972"]!.set);
    expect(resolveAccentSet("#5f5470").soft).toBe("#e6e1ec");
  });

  it("color personalizado deriva hover/soft/tint/text", () => {
    const s = resolveAccentSet("#7a3b5e");
    expect(isValidHex(s.hover)).toBe(true);
    expect(isValidHex(s.soft)).toBe(true);
    expect(isValidHex(s.tint)).toBe(true);
    expect(s.hover).not.toBe(s.accent);
  });

  it("color demasiado claro se oscurece para contraste con texto blanco", () => {
    const s = resolveAccentSet("#ffee88"); // amarillo pálido, ilegible con blanco
    expect(s.accent).not.toBe("#ffee88");
    // el resultado debe ser notablemente más oscuro
    const lum = parseInt(s.accent.slice(1, 3), 16);
    expect(lum).toBeLessThan(0xd0);
  });

  it("hex inválido cae al default (el azul Vocero)", () => {
    expect(resolveAccentSet("rojo")).toEqual(ACCENT_PRESETS["#0328ba"]!.set);
  });

  it("el azul Vocero es el default y trae sus valores exactos", () => {
    expect(DEFAULT_BRANDING.accent).toBe("#0328ba");
    expect(resolveAccentSet(DEFAULT_BRANDING.accent)).toEqual({
      accent: "#0328ba",
      hover: "#02229b",
      soft: "#cfd7f6",
      tint: "#eef1fc",
      text: "#02239c",
      fg: "#ffffff",
    });
  });
});

describe("white-label: CSS inyectado (solo tema claro)", () => {
  it("emite un único bloque (:root:root) con el acento calculado, sin tema oscuro", () => {
    const css = accentCssVariables("#3f5972");
    expect(css).toContain(":root:root{");
    expect(css).not.toContain(".nav-dark");
    expect(css).not.toContain(".nav-panel");
    expect(css).toContain(resolveAccentSet("#3f5972").accent);
    expect(css).not.toContain("data-theme");
  });

  it("el respaldo de globals.css es el set del azul Vocero", () => {
    // Si alguien retoca la receta y no el respaldo (o al revés), el primer
    // pintado sin white-label sale de otro color que el resto.
    const raiz = variables(readFileSync("src/app/globals.css", "utf8"), ":root {");
    const set = resolveAccentSet(DEFAULT_BRANDING.accent);
    expect(raiz["--accent"]?.toLowerCase()).toBe(set.accent);
    expect(raiz["--accent-hover"]?.toLowerCase()).toBe(set.hover);
    expect(raiz["--accent-soft"]?.toLowerCase()).toBe(set.soft);
    expect(raiz["--accent-tint"]?.toLowerCase()).toBe(set.tint);
    expect(raiz["--accent-text"]?.toLowerCase()).toBe(set.text);
  });

  it("no queda un tema oscuro de la página", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain('data-theme="dark"');
  });
});

describe("barra lateral clara (.nav-panel)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const nav = variables(css, ".nav-panel {");

  it("fondo blanco, texto #0a0f2c, bordes y separadores #e4e7f0", () => {
    expect(nav["--bg-subtle"]?.toLowerCase()).toBe("#ffffff");
    expect(nav["--text"]?.toLowerCase()).toBe("#0a0f2c");
    expect(nav["--text-2"]?.toLowerCase()).toBe("#0a0f2c");
    expect(nav["--border"]?.toLowerCase()).toBe("#e4e7f0");
    expect(nav["--border-strong"]?.toLowerCase()).toBe("#e4e7f0");
  });

  it("no hay rastro de la barra azul marino", () => {
    expect(css).not.toContain(".nav-dark");
    expect(css).not.toMatch(/color-scheme:\s*dark/);
  });

  it("el ítem activo es acento sólido con texto blanco (ver navItemClass)", () => {
    const nav = readFileSync("src/components/app-nav.tsx", "utf8");
    expect(nav).toContain('"bg-brand text-brand-fg"');
  });
});

describe("white-label: normalización", () => {
  it("nombre vacío o nulo → el de la marca por defecto (DEFAULT_BRANDING); se recorta a 30", () => {
    expect(normalizeBranding(null).name).toBe(DEFAULT_BRANDING.name);
    expect(normalizeBranding({ name: "   " }).name).toBe(DEFAULT_BRANDING.name);
    expect(normalizeBranding({ name: "x".repeat(50) }).name).toHaveLength(30);
  });

  it("acento inválido → default", () => {
    expect(normalizeBranding({ accent: "azul" }).accent).toBe("#0328ba");
    expect(normalizeBranding({ accent: "#3F6B66" }).accent).toBe("#3f6b66");
  });
});
