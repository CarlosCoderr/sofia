"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetailOption = { id: string; name: string; active: boolean };

/** Minúsculas y sin tildes: «jose» encuentra «José». */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Casilla «Detallar … (Opcional)» con una lista para marcar cuáles.
 *
 * Casilla apagada (lo normal): no se detalla y el sistema asume que se aplica a
 * TODOS — es lo que se guarda (lista vacía). Casilla encendida: se despliega la
 * lista, con buscador (regla del sistema para cualquier selección) y botones para
 * marcar todos o ninguno.
 *
 * Sirve para los dos lados de la relación profesional ↔ servicio: «qué
 * profesionales dan este servicio» y «qué servicios hace este profesional». La
 * lista deja ver, ya marcados, los elementos que se desactivaron después: quitarlos
 * es decisión de quien edita, no algo que se haga a escondidas.
 */
export function DetailSelect({
  options: all,
  enabled,
  onEnabledChange,
  selected,
  onChange,
  disabled,
  error,
  checkboxLabel,
  offHint,
  emptyNote,
  groupLabel,
  searchLabel,
}: {
  options: DetailOption[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string;
  /** El texto de la casilla. */
  checkboxLabel: string;
  /** Lo que se asume con la casilla apagada. */
  offHint: string;
  /** Lo que se dice si no hay nada que elegir. */
  emptyNote: string;
  groupLabel: string;
  searchLabel: string;
}) {
  const uid = useId();
  const [query, setQuery] = useState("");

  // Los activos, más los inactivos que ya estaban marcados.
  const options = useMemo(
    () => all.filter((s) => s.active || selected.includes(s.id)),
    [all, selected]
  );
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return q ? options.filter((o) => fold(o.name).includes(q)) : options;
  }, [options, query]);

  const nothingToPick = options.length === 0;
  const chosen = new Set(selected);

  function toggle(id: string) {
    onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          disabled={disabled || nothingToPick}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>{checkboxLabel}</span>
      </label>

      {nothingToPick && <p className="pl-6 text-xs text-text-3">{emptyNote}</p>}
      {!enabled && !nothingToPick && <p className="pl-6 text-xs text-text-3">{offHint}</p>}

      {enabled && !nothingToPick && (
        <div
          role="group"
          aria-label={groupLabel}
          className={cn("ml-6 rounded-md border bg-background", error && "border-danger")}
        >
          <div className="relative border-b">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${searchLabel}…`}
              aria-label={searchLabel}
              autoComplete="off"
              disabled={disabled}
              // Enter en el buscador no debe enviar el formulario.
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm focus:outline-none"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-text-3">Sin resultados</li>
            ) : (
              visible.map((o) => {
                const id = `${uid}-${o.id}`;
                return (
                  <li key={o.id}>
                    <label
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={chosen.has(o.id)}
                        onChange={() => toggle(o.id)}
                        disabled={disabled}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="truncate">{o.name}</span>
                      {!o.active && <span className="text-xs text-text-3">(inactivo)</span>}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-1.5 text-xs text-text-3">
            <span aria-live="polite">
              {selected.length === 0
                ? "Ninguno elegido"
                : `${selected.length} de ${options.length} elegido${selected.length === 1 ? "" : "s"}`}
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(options.map((o) => o.id))}
                className="font-semibold hover:text-foreground focus-visible:outline-none focus-visible:underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange([])}
                className="font-semibold hover:text-foreground focus-visible:outline-none focus-visible:underline"
              >
                Ninguno
              </button>
            </span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="pl-6 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lo que se manda a la API: casilla apagada → `[]` (todos); encendida → los
 * elegidos. `error` si se encendió sin elegir a nadie (no hay un «ninguno»: eso
 * sería algo que nadie puede dar o hacer).
 */
export function detailIdsToSend(
  enabled: boolean,
  selected: string[],
  emptyError: string
): { ids: string[]; error?: string } {
  if (!enabled) return { ids: [] };
  if (selected.length === 0) return { ids: [], error: emptyError };
  return { ids: selected };
}
