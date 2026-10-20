import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  DEFAULT_BRANDING,
  resolveAccentSet,
} from "@/lib/branding";

/**
 * Pisos de contraste de la interfaz (solo tema claro + la barra lateral azul
 * marino), medidos sobre los tokens REALES de globals.css, no sobre una copia.
 * Un retoque de color que rompa un par que importa truena en `pnpm test` y no
 * en una captura.
 *
 * Pisos: texto de lectura ≥ 4.5:1 (WCAG AA); iconos, rellenos y anillo de
 * foco ≥ 3:1 (1.4.11).
 */

type Vars = Record<string, string>;

function luminancia(hex: string): number {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Variables de un bloque de globals.css, con el valor sin saltos de línea. */
function bloque(css: string, selector: string): Vars {
  const inicio = css.indexOf(selector);
  expect(inicio, `no está el bloque ${selector}`).toBeGreaterThanOrEqual(0);
  const cuerpo = css
    .slice(css.indexOf("{", inicio) + 1, css.indexOf("\n  }", inicio))
    .replace(/\/\*[\s\S]*?\*\//g, ""); // un comentario puede nombrar un token
  return Object.fromEntries(
    [...cuerpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1]!,
      m[2]!.replace(/\s+/g, " ").trim(),
    ])
  );
}

const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
const claro = bloque(css, ":root {");
const nav = bloque(css, ".nav-panel {");

/** Resuelve `var(--x)` contra el mismo bloque (un nivel alcanza aquí). */
function hex(vars: Vars, nombre: string): string {
  const v = vars[nombre];
  expect(v, `falta ${nombre}`).toBeDefined();
  const ref = /^var\((--[\w-]+)\)$/.exec(v!)?.[1];
  const valor = ref ? vars[ref] : v;
  expect(valor, `${nombre} no es un hex`).toMatch(/^#[0-9a-f]{6}$/i);
  return valor!.toLowerCase();
}

/** Afirma un piso con un mensaje que dice el par y su valor. */
function piso(vars: Vars, a: string, b: string, min: number) {
  const c = contraste(hex(vars, a), hex(vars, b));
  expect(c, `${a} sobre ${b}: ${c.toFixed(2)} (piso ${min})`).toBeGreaterThanOrEqual(min);
}

describe("no hay tema oscuro de la página", () => {
  it("globals.css no define ni selecciona un tema oscuro", () => {
    expect(css).not.toContain('data-theme="dark"');
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("la barra lateral también es clara (fondo blanco)", () => {
    expect(hex(nav, "--bg-subtle")).toBe("#ffffff");
  });
});

describe("tema claro: texto", () => {
  const superficies = ["--bg-subtle", "--bg", "--bg-raised", "--bg-panel", "--chip-bg", "--bg-hover", "--accent-tint"];

  it("texto, secundario y terciario pasan AA sobre TODA superficie", () => {
    // `text-3` incluido: es el de la `.kicker` (10.5px) y de las horas.
    for (const s of superficies) {
      piso(claro, "--text", s, 7);
      piso(claro, "--text-2", s, 4.5);
      piso(claro, "--text-3", s, 2.7); // el gris original: horas y etiquetas, no lectura larga
    }
  });

  it("las tríadas de estado se leen sobre su propio fondo", () => {
    for (const e of ["success", "warning", "danger", "info"]) {
      piso(claro, `--${e}-text`, `--${e}-tint`, 4.5);
      piso(claro, `--${e}-text`, "--bg", 4.5);
    }
  });

  it("lo que flota y los chips son los de siempre", () => {
    expect(claro["--bg-raised"]).toBe(claro["--bg"]);
    expect(claro["--chip-bg"]).toBe(claro["--bg"]);
    expect(claro["--row-hover"]).toBe(claro["--bg-subtle"]);
    expect(claro["--accent-ink"]).toBe("var(--accent)");
    expect(claro["--ring"]).toBe("var(--accent)");
  });
});

describe("tinta de texto y de títulos", () => {
  it("el texto es #202020 y los títulos #0a0f2c", () => {
    expect(hex(claro, "--text")).toBe("#202020");
    expect(hex(claro, "--heading")).toBe("#0a0f2c");
  });

  it("ambas se leen sobre toda superficie clara (≥ 7:1)", () => {
    for (const s of ["--bg-subtle", "--bg", "--bg-raised", "--bg-panel", "--chip-bg", "--bg-hover", "--accent-tint"]) {
      piso(claro, "--heading", s, 7);
      piso(claro, "--text", s, 7);
    }
  });

  it("los títulos de la barra también son #0a0f2c sobre blanco", () => {
    expect(hex(nav, "--heading")).toBe("#0a0f2c");
    piso(nav, "--heading", "--bg-subtle", 7);
  });

  it("los h1-h6 usan la tinta de títulos", () => {
    expect(css).toMatch(/h6 \{\s*color: var\(--heading\);/);
  });
});

describe("acento de la página", () => {
  it("rellena (≥ 3:1) y su tinta se lee (≥ 4.5:1)", () => {
    piso(claro, "--accent", "--bg", 3);
    piso(claro, "--accent-fg", "--accent", 4.5);
    for (const s of ["--bg", "--bg-raised", "--accent-tint", "--bg-subtle"]) {
      piso(claro, "--accent-text", s, 4.5);
    }
  });

  it("el anillo de foco se ve donde hay algo enfocable (≥ 3:1)", () => {
    for (const s of ["--bg-subtle", "--bg", "--bg-raised", "--bg-panel", "--accent-tint"]) {
      piso(claro, "--ring", s, 3);
    }
  });
});

describe("barra lateral clara", () => {
  it("conserva los valores pedidos", () => {
    expect(nav).toMatchObject({
      "--bg": "#ffffff",
      "--bg-subtle": "#ffffff",
      "--text": "#0a0f2c",
      "--text-2": "#0a0f2c",
      "--border": "#e4e7f0",
      "--border-strong": "#e4e7f0",
    });
    expect(css).not.toContain(".nav-dark");
  });

  it("dentro de la barra el texto se lee", () => {
    piso(nav, "--text", "--bg-subtle", 7);
    piso(nav, "--text-2", "--bg-hover", 7);
    piso(nav, "--text-3", "--bg-subtle", 4.5);
  });

  it("el ítem activo (texto blanco sobre el acento) se lee", () => {
    piso(claro, "--accent-fg", "--accent", 4.5);
  });
});

describe("tinta sobre el acento: blanca solo si pasa AA (≥ 4.5:1)", () => {
  // Presets + colores que un negocio sí elige: un verde, un amarillo, un rojo,
  // un morado, un gris y un azul profundo.
  const acentos = [
    ...Object.keys(ACCENT_PRESETS),
    "#16a34a",
    "#f59e0b",
    "#e11d48",
    "#7c3aed",
    "#6b7280",
    "#12305a",
    "#ffee88",
  ];

  it("para cualquier acento elegido", () => {
    for (const a of acentos) {
      const s = resolveAccentSet(a);
      const c = contraste(s.fg, s.accent);
      expect(c, `${a}: ${c.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("un acento claro lleva tinta oscura en vez de oscurecerse más", () => {
    const verde = resolveAccentSet("#16a34a");
    expect(verde.accent).toBe("#16a34a");
    expect(verde.fg).not.toBe("#ffffff");
  });

  it("el acento por defecto es el azul Vocero #0328ba", () => {
    expect(DEFAULT_BRANDING.accent).toBe("#0328ba");
    expect(hex(claro, "--accent")).toBe("#0328ba");
  });
});
