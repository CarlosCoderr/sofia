"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, describeError } from "@/components/negocio/api";
import { Field } from "@/components/negocio/fields";
import { Modal, ModalFooter } from "@/components/negocio/modal";
import { newBoardBookingSchema } from "@/lib/salon/schemas";
import type { BoardDto } from "@/lib/salon/types";
import { longDayLabel } from "@/lib/time/calendar";
import { overlaps } from "@/lib/time/slots";
import { SearchSelect } from "@/components/ui/search-select";

type ContactHit = { id: string; name: string; phone: string | null };

/**
 * Módulo SALON — «Agendar cita» desde la agenda por sillas: cliente, hora y
 * profesional, contra el mismo tablero que se está viendo.
 *
 * Solo ofrece lo que cabe: horas futuras, sin bloqueo y con cupo; y, para la
 * hora elegida, los profesionales que están de turno y no tienen otra cita
 * entonces. El servidor vuelve a validar todo (dos personas pueden agendar el
 * mismo hueco a la vez) y su mensaje se muestra tal cual.
 */
export function NewBookingDialog({
  board,
  initialStartUtc,
  initialStaffId,
  onClose,
  onSaved,
}: {
  board: BoardDto;
  /** Al tocar una celda libre llegan la hora y la silla ya elegidas. */
  initialStartUtc?: string;
  initialStaffId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const bookable = useMemo(
    () => board.slots.filter((s) => !s.past && !s.blocked && s.free > 0),
    [board.slots]
  );

  const [customerText, setCustomerText] = useState("");
  const [contact, setContact] = useState<{ id: string; name: string } | null>(null);
  const [hits, setHits] = useState<ContactHit[]>([]);
  const [startUtc, setStartUtc] = useState(
    initialStartUtc && bookable.some((s) => s.startUtc === initialStartUtc)
      ? initialStartUtc
      : (bookable[0]?.startUtc ?? "")
  );
  const [staffId, setStaffId] = useState(initialStaffId ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slot = bookable.find((s) => s.startUtc === startUtc) ?? null;

  // Los profesionales que sí pueden atender a la hora elegida.
  const availableChairs = useMemo(() => {
    if (!slot) return [];
    return board.chairs.filter(
      (c) =>
        slot.workingStaffIds.includes(c.id) &&
        !board.bookings.some(
          (b) =>
            b.kind === "session" &&
            b.staffId === c.id &&
            overlaps(slot.startUtc, slot.endUtc, b.startUtc, b.endUtc)
        )
    );
  }, [board.chairs, board.bookings, slot]);

  // Si cambiar la hora deja sin cupo al profesional elegido, se suelta.
  useEffect(() => {
    if (staffId && !availableChairs.some((c) => c.id === staffId)) setStaffId("");
  }, [availableChairs, staffId]);

  // Búsqueda de contactos mientras se escribe (si no hay uno elegido).
  useEffect(() => {
    const q = customerText.trim();
    if (contact || q.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      apiFetch<{ contacts: ContactHit[] }>(`/api/contacts?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => setHits(r.contacts.slice(0, 6)))
        .catch(() => {
          // Sin sugerencias no se rompe nada: se puede escribir de nuevo.
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [customerText, contact]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = newBoardBookingSchema.safeParse({
      contactId: contact?.id ?? "",
      startUtc,
      staffId: staffId || null,
      notes,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await apiFetch("/api/negocio/agenda/citas", { method: "POST", json: parsed.data });
      const chair = board.chairs.find((c) => c.id === staffId);
      onSaved(
        `Cita agendada: ${contact?.name ?? "cliente"} · ${slot?.time ?? ""}${chair ? ` con ${chair.name}` : ""}.`
      );
    } catch (err) {
      setFormError(describeError(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Agendar cita"
      description={longDayLabel(board.date)}
      onClose={onClose}
      busy={busy}
    >
      {bookable.length === 0 ? (
        <>
          <p className="rounded-md border border-warning-soft bg-warning-tint px-3 py-2.5 text-sm text-warning-text">
            No quedan horas libres este día. Elige otro día para agendar.
          </p>
          <ModalFooter>
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field
            label="Cliente"
            htmlFor="nb-customer"
            error={errors.contactId}
            hint={contact ? undefined : "Busca por nombre o teléfono."}
          >
            {contact ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-subtle px-3 py-1.5">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
                  <span className="truncate font-medium">{contact.name}</span>
                </span>
                <button
                  type="button"
                  aria-label="Quitar el cliente"
                  onClick={() => {
                    setContact(null);
                    setCustomerText("");
                  }}
                  disabled={busy}
                  className="rounded-sm p-1 text-text-3 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="nb-customer"
                  value={customerText}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Nombre o teléfono"
                  onChange={(e) => setCustomerText(e.target.value)}
                  disabled={busy}
                />
                {hits.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Contactos encontrados"
                    className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-pop"
                  >
                    {hits.map((h) => (
                      <li key={h.id} role="option" aria-selected={false}>
                        <button
                          type="button"
                          onClick={() => {
                            setContact({ id: h.id, name: h.name });
                            setHits([]);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        >
                          <span className="truncate">{h.name}</span>
                          {h.phone && <span className="shrink-0 text-xs text-text-3">{h.phone}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!contact && (
              <p className="mt-1 text-xs text-text-3">
                ¿No está?{" "}
                <Link href="/contactos" className="font-semibold text-primary hover:underline">
                  Créalo en Contactos
                </Link>
                .
              </p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora" htmlFor="nb-time" error={errors.startUtc}>
              <SearchSelect
                id="nb-time"
                value={startUtc}
                onChange={setStartUtc}
                options={bookable.map((s) => ({
                  value: s.startUtc,
                  label: `${s.time} · ${s.free} ${s.free === 1 ? "cupo" : "cupos"}`,
                }))}
                searchPlaceholder="Buscar hora…"
                disabled={busy}
              />
            </Field>

            {board.chairs.length > 0 && (
              <Field
                label="Profesional"
                htmlFor="nb-staff"
                error={errors.staffId}
                hint={
                  availableChairs.length === 0
                    ? "Nadie está libre a esta hora: queda sin asignar."
                    : undefined
                }
              >
                <SearchSelect
                  id="nb-staff"
                  value={staffId}
                  onChange={setStaffId}
                  options={availableChairs.map((c) => ({ value: c.id, label: c.name }))}
                  emptyLabel="Sin asignar (elegir después)"
                  searchPlaceholder="Buscar profesional…"
                  disabled={busy}
                />
              </Field>
            )}
          </div>

          <Field label="Notas" htmlFor="nb-notes" error={errors.notes} hint="Opcional. Ej.: corte y barba.">
            <Input
              id="nb-notes"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </Field>

          <ModalFooter error={formError}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Agendando…" : "Agendar cita"}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
