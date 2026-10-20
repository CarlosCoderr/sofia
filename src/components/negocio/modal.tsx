"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog-close";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Módulo SALON — diálogo modal accesible: `role="dialog"`, Escape cierra, el
 * foco entra al abrir, no se escapa con Tab y vuelve a donde estaba al cerrar.
 *
 * Mientras `busy` está activo no se puede cerrar (ni con Escape ni tocando
 * fuera): perder un formulario a medio guardar es peor que esperar un segundo.
 */
export function Modal({
  title,
  description,
  onClose,
  busy = false,
  size = "md",
  closeButton = true,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  busy?: boolean;
  size?: "sm" | "md" | "lg";
  /** La X arriba a la derecha (regla del sistema); Escape y el clic fuera también cierran. */
  closeButton?: boolean;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // El primer campo si lo hay; si no, el propio panel.
    const first = panel?.querySelector<HTMLElement>('input:not([type="file"]), select, textarea');
    (first ?? panel)?.focus();

    function onKey(e: KeyboardEvent) {
      // Con una ventana abierta encima de otra (el selector de imagen sobre un
      // formulario), solo la de arriba atiende el teclado.
      const abiertas = document.querySelectorAll('[role="dialog"]');
      if (abiertas[abiertas.length - 1] !== panel) return;
      if (e.key === "Escape" && !busyRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        // Solo si el clic EMPIEZA en el fondo: arrastrar una selección de texto
        // fuera del panel no debe cerrar el diálogo.
        if (e.target === e.currentTarget && !busyRef.current) closeRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-t-lg border bg-popover p-5 shadow-pop focus:outline-none sm:rounded-lg",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl"
        )}
      >
        {closeButton && (
          <DialogCloseButton onClick={onClose} disabled={busy} />
        )}
        <div className={cn("mb-4", closeButton && "pr-8")}>
          <h3 id={titleId} className="text-[16px] font-bold tracking-tight">
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-text-3">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Pie estándar de un formulario: error a la izquierda, acciones a la derecha. */
export function ModalFooter({
  error,
  children,
}: {
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-tint px-3 py-2 text-sm text-danger-text"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

/**
 * Confirmación de una acción que no se puede deshacer. Se cierra con la X, con
 * Escape o tocando fuera (no lleva botón «Cancelar»). `onConfirm` lanza si
 * falla: el mensaje se muestra dentro del diálogo, que se queda abierto.
 * `extra` permite ofrecer una alternativa (p. ej. «Desactivar») junto a la
 * acción destructiva.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  extra,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  extra?: (helpers: { close: () => void; setError: (m: string | null) => void }) => React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} busy={busy} size="sm" closeButton>
      <div className="text-sm text-text-2">{message}</div>
      <ModalFooter error={error}>
        {extra?.({ close: onClose, setError })}
        <Button type="button" variant="destructive" onClick={() => void run()} disabled={busy}>
          {busy ? "Un momento…" : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
