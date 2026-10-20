"use client";

import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { apiFetch } from "@/components/negocio/api";
import { formatPeruPhone } from "@/lib/salon/format";
import type { ContactMatchDto } from "@/lib/salon/types";

/**
 * Autocompletado de Caja y del alta de clientes: mientras se escribe el celular
 * (3 o más dígitos) o, si no, el nombre (2 o más letras), busca entre todos los
 * contactos de WhatsApp —clientes o no— y devuelve las coincidencias. Es una
 * ayuda: si falla la consulta, el formulario sigue igual, sin sugerencias.
 *
 * `enabled` en falso (p. ej. ya se eligió a alguien) vacía la lista y no consulta.
 */
export function useContactMatches({
  enabled,
  name,
  phone,
}: {
  enabled: boolean;
  name: string;
  /** Solo los dígitos que se han escrito (sin el +51). */
  phone: string;
}): ContactMatchDto[] {
  const [matches, setMatches] = useState<ContactMatchDto[]>([]);
  const q = phone.length >= 3 ? phone : name.trim().length >= 2 ? name.trim() : "";

  useEffect(() => {
    if (!enabled || !q) {
      setMatches([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      apiFetch<{ matches: ContactMatchDto[] }>(
        `/api/negocio/contactos/buscar?limit=5&q=${encodeURIComponent(q)}`,
        { signal: ctrl.signal }
      )
        .then((res) => !ctrl.signal.aborted && setMatches(res.matches))
        .catch(() => !ctrl.signal.aborted && setMatches([]));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [enabled, q]);

  return matches;
}

/** La lista de sugerencias bajo los campos de nombre y celular. */
export function ContactMatchPanel({
  matches,
  onPick,
}: {
  matches: ContactMatchDto[];
  onPick: (match: ContactMatchDto) => void;
}) {
  if (matches.length === 0) return null;
  const clients = matches.filter((m) => m.salonClient).length;
  const many = matches.length > 1;
  const title =
    clients === matches.length
      ? many
        ? "Clientes registrados encontrados:"
        : "Cliente registrado encontrado:"
      : clients === 0
        ? many
          ? "Contactos de WhatsApp encontrados:"
          : "Contacto de WhatsApp encontrado:"
        : "Coincidencias encontradas:";

  return (
    <div role="status" className="rounded-md border border-brand-soft bg-brand-tint px-3 py-2 text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-text">
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        {title}
      </p>
      <ul className="space-y-1">
        {matches.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onPick(m)}
              className="flex w-full flex-wrap items-center justify-between gap-x-3 rounded-sm px-2 py-1.5 text-left hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium">{m.name}</span>
              <span className="flex items-center gap-2 text-xs tabular-nums text-text-2">
                {formatPeruPhone(m.phone)}
                <span className="rounded-full border bg-background px-1.5 py-0.5 text-[11px] font-medium">
                  {m.salonClient
                    ? `Cliente · ${m.visits} visita${m.visits === 1 ? "" : "s"}`
                    : "Contacto de WhatsApp"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
