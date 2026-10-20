"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { MAX_RANGE_DAYS, type CalendarView } from "@/lib/time/calendar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/**
 * 215 — La barra del calendario, como la de Google Calendar: Hoy, ‹ ›, el
 * rango que se está viendo (tocarlo abre un selector para saltar a cualquier
 * fecha) y el cambio de vista. En la Lista, el rango se elige con Desde–Hasta,
 * como la lista de reuniones de Zoom.
 */

const VIEW_LABEL: Record<CalendarView, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
  lista: "Lista",
};

const PERIOD: Record<CalendarView, string> = {
  dia: "día",
  semana: "semana",
  mes: "mes",
  lista: "rango",
};

export function CalendarToolbar({
  view,
  anchor,
  listTo,
  label,
  loading,
  onToday,
  onShift,
  onJump,
  onView,
  onListRange,
  onBlock,
  showTitle = true,
  onNew,
}: {
  view: CalendarView;
  anchor: string;
  listTo: string;
  label: string;
  loading: boolean;
  onToday: () => void;
  onShift: (dir: 1 | -1) => void;
  onJump: (day: string) => void;
  onView: (view: CalendarView) => void;
  onListRange: (from: string, to: string) => void;
  onBlock: () => void;
  /** Falso cuando la pantalla ya tiene su propio título (Citas con pestañas). */
  showTitle?: boolean;
  /** «Agendar cita»: lleva a la vista por sillas, donde se elige profesional. */
  onNew?: () => void;
}) {

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-6">
      {showTitle && <h2 className="mr-1 text-[17px] font-bold tracking-tight">Citas</h2>}

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoy
        </Button>
        <NavButton label={`${PERIOD[view]} anterior`} onClick={() => onShift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </NavButton>
        <NavButton label={`${PERIOD[view]} siguiente`} onClick={() => onShift(1)}>
          <ChevronRight className="h-4 w-4" />
        </NavButton>
      </div>

      {view === "lista" ? (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <DatePicker
            compact
            ariaLabel="Desde"
            value={anchor}
            onChange={(day) => onListRange(day, listTo)}
            className="w-32"
          />
          <span className="text-text-3">al</span>
          <DatePicker
            compact
            ariaLabel={`Hasta (máximo ${MAX_RANGE_DAYS} días)`}
            value={listTo}
            min={anchor}
            onChange={(day) => onListRange(anchor, day)}
            className="w-32"
          />
        </div>
      ) : (
        <DatePicker
          value={anchor}
          onChange={onJump}
          ariaLabel={`${label}. Elegir otra fecha`}
          triggerClassName="flex items-center gap-1 rounded-md px-1.5 py-1 text-[17px] font-semibold tracking-tight hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
        >
          {label}
          <ChevronDown className="h-4 w-4 text-text-3" />
        </DatePicker>
      )}

      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-strong border-t-brand" aria-label="Cargando" />
      )}

      <div className="ml-auto flex items-center gap-2">
        <div role="group" aria-label="Vista" className="inline-flex rounded-full border bg-secondary p-0.5">
          {(Object.keys(VIEW_LABEL) as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => onView(v)}
              className={cn(
                "h-7 rounded-full px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
                view === v ? "bg-background text-foreground shadow-sm" : "text-text-3 hover:text-foreground"
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        {onNew && (
          <Button size="sm" onClick={onNew} aria-label="Agendar cita">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agendar cita</span>
          </Button>
        )}
        <Button
          size="sm"
          variant={onNew ? "outline" : "default"}
          onClick={onBlock}
          aria-label="Bloquear horario"
        >
          {!onNew && <Plus className="h-4 w-4" />}
          <span className={onNew ? undefined : "hidden sm:inline"}>Bloquear horario</span>
        </Button>
      </div>
    </header>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
      title={label.charAt(0).toUpperCase() + label.slice(1)}
      className="flex h-8 w-8 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
    >
      {children}
    </button>
  );
}
