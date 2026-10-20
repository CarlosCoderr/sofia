import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regla del sistema: todo desplegable lleva buscador. El único desplegable
 * permitido es `SearchSelect` (src/components/ui/search-select.tsx); un
 * `<select>` nativo no tiene buscador y se queda fuera.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

describe("desplegables", () => {
  it("ningún componente usa <select> nativo", () => {
    const culpables = tsxFiles(join(process.cwd(), "src"))
      // El propio componente menciona `<select>` en su documentación.
      .filter((f) => !f.endsWith("search-select.tsx"))
      .filter((f) => /<select[\s>]/.test(readFileSync(f, "utf8")));
    expect(culpables).toEqual([]);
  });
});
