"use client";

import { useEffect, useState } from "react";
import { apiFetch, describeError } from "@/components/negocio/api";
import { Modal } from "@/components/negocio/modal";
import { dateNumeric, money } from "@/lib/salon/format";
import { PAYMENT_LABELS } from "@/lib/salon/schemas";
import type { SalonClientDetailDto } from "@/lib/salon/types";

/**
 * Módulo SALON — la línea de tiempo de un cliente: cada atención con su fecha
 * (DD/MM/AAAA, sin hora), lo que se hizo, quién atendió, cómo pagó y cuánto. Se
 * abre desde el número de «Visitas» de la lista; es solo lectura.
 */
export function ClientHistoryDialog({
  clientId,
  currency,
  timezone,
  onClose,
}: {
  clientId: string;
  currency: string;
  timezone: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SalonClientDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<SalonClientDetailDto>(`/api/negocio/clientes/${clientId}`)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(describeError(err)));
    return () => {
      alive = false;
    };
  }, [clientId]);

  const client = detail?.client;
  return (
    <Modal
      title={client ? `Historial de ${client.name}` : "Historial"}
      description={
        client
          ? `${client.visits} visita${client.visits === 1 ? "" : "s"} · ${money(client.totalCents, currency)} invertidos`
          : undefined
      }
      onClose={onClose}
      size="lg"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-tint px-3 py-2 text-sm text-danger-text"
        >
          {error}
        </p>
      ) : !detail ? (
        <div className="space-y-2" aria-busy aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-subtle" />
          ))}
        </div>
      ) : detail.history.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-text-2">
          Todavía no tiene atenciones registradas.
        </p>
      ) : (
        <div className="relative max-h-[60vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-subtle text-left text-xs font-semibold text-text-2">
                <th scope="col" className="px-3 py-2">
                  Fecha de atención
                </th>
                <th scope="col" className="px-2 py-2">
                  Servicio / oferta
                </th>
                <th scope="col" className="px-2 py-2">
                  Atendió
                </th>
                <th scope="col" className="px-2 py-2">
                  Método de pago
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-text-2">
                    {dateNumeric(h.createdAt, timezone)}
                  </td>
                  <td className="px-2 py-2">
                    {h.itemName}
                    {h.itemKind === "combo" && (
                      <span className="ml-1.5 text-[11px] text-text-3">oferta</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">{h.staffName}</td>
                  <td className="whitespace-nowrap px-2 py-2">{PAYMENT_LABELS[h.paymentMethod]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">
                    {money(h.amountCents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
