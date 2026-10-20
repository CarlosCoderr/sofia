"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** AAAA-MM-DD → DD/MM/AAAA; `""` si no es una fecha. */
export function formatDay(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

type Placement = { top?: number; bottom?: number; left: number };

/**
 * Selector de fecha SIN hora: se ve y se elige como DD/MM/AAAA (el `<input
 * type="date">` nativo la muestra según el idioma del navegador). El valor que
 * entrega es AAAA-MM-DD. El calendario se pinta en el `body`, así que ninguna
 * ventana con scroll lo recorta; Escape lo cierra sin cerrar la ventana.
 */
export function DatePicker({
  id,
  value,
  onChange,
  max,
  min,
  disabled,
  invalid,
  ariaLabel,
  className,
  compact,
  triggerClassName,
  children,
}: {
  id?: string;
  /** AAAA-MM-DD, o `""` sin elegir. */
  value: string;
  onChange: (value: string) => void;
  /** Último día elegible (AAAA-MM-DD). */
  max?: string;
  min?: string;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Botón más bajo y de letra chica (filtros y barras de herramientas). */
  compact?: boolean;
  /**
   * Disparador propio (p. ej. un título): si se da, el botón no pinta el campo
   * con borde sino este contenido, con `triggerClassName`.
   */
  triggerClassName?: string;
  children?: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Placement | null>(null);
  const seed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : (max ?? "");
  const [view, setView] = useState(() => {
    const m = /^(\d{4})-(\d{2})/.exec(seed);
    const now = new Date();
    return m
      ? { y: Number(m[1]), m: Number(m[2]) }
      : { y: now.getFullYear(), m: now.getMonth() + 1 };
  });

  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 288 - 8));
      const below = window.innerHeight - r.bottom;
      setPlace(
        below < 320 && r.top > below
          ? { bottom: window.innerHeight - r.top + 4, left }
          : { top: r.bottom + 4, left }
      );
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      const m = /^(\d{4})-(\d{2})/.exec(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : (max ?? ""));
      if (m) setView({ y: Number(m[1]), m: Number(m[2]) });
    }
    setOpen((o) => !o);
  }

  function shift(delta: number) {
    setView((v) => {
      const idx = v.y * 12 + (v.m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });
  }

  // Lunes primero: 0 = lunes … 6 = domingo.
  const lead = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7;
  const days = new Date(view.y, view.m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const blocked = (d: string) => (!!max && d > max) || (!!min && d < min);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        className={
          children
            ? triggerClassName
            : cn(
                "flex w-full items-center justify-between gap-2 rounded-md border bg-background text-left shadow-sm",
                compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
                "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft",
                "disabled:cursor-not-allowed disabled:opacity-50",
                invalid ? "border-danger" : "border-input"
              )
        }
      >
        {children ?? (
          <>
            <span className={cn("tabular-nums", !value && "text-text-3")}>
              {formatDay(value) || "DD/MM/AAAA"}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
          </>
        )}
      </button>

      {open &&
        place &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Elegir fecha"
            style={{ position: "fixed", top: place.top, bottom: place.bottom, left: place.left }}
            className="z-[70] w-72 rounded-md border bg-popover p-3 shadow-pop"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => shift(-1)}
                className="rounded-sm p-1.5 text-text-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="text-sm font-semibold" aria-live="polite">
                {MONTHS[view.m - 1]} {view.y}
              </p>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => shift(1)}
                className="rounded-sm p-1.5 text-text-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 font-semibold text-text-3">
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const day = iso(view.y, view.m, d);
                const chosen = day === value;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={blocked(day)}
                    aria-label={formatDay(day)}
                    aria-pressed={chosen}
                    onClick={() => {
                      onChange(day);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={cn(
                      "h-8 rounded-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      chosen ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent",
                      "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
