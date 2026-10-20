"use client";

import { Section } from "@/components/results/section";
import type { Range } from "@/components/results/range-picker";
import { money } from "@/lib/salon/format";
import type { SalesReportDto } from "@/lib/salon/types";
import { addDaysISO } from "@/lib/time/slots";

/**
 * Módulo SALON — las secciones de reporte que comparten Caja y el Panel: el
 * rendimiento de cada profesional y el ranking de servicios y ofertas. Las dos
 * pantallas leen el mismo `SalesReportDto`, así que muestran los mismos números.
 */

/** Atajos del selector de fechas: el día y el mes son lo que un dueño mira. */
export function presets(today: string): { label: string; range: Range }[] {
  const ayer = addDaysISO(today, -1);
  const primeroDeMes = `${today.slice(0, 8)}01`;
  const finMesPasado = addDaysISO(primeroDeMes, -1);
  return [
    { label: "Hoy", range: { from: today, to: today } },
    { label: "Ayer", range: { from: ayer, to: ayer } },
    { label: "7 días", range: { from: addDaysISO(today, -6), to: today } },
    { label: "Este mes", range: { from: primeroDeMes, to: today } },
    { label: "Mes pasado", range: { from: `${finMesPasado.slice(0, 8)}01`, to: finMesPasado } },
  ];
}

export function TeamPerformance({
  report,
  currency,
  loading,
}: {
  report: SalesReportDto | null;
  currency: string;
  loading: boolean;
}) {
  return (
    <Section
      title="Rendimiento del equipo"
      hint="Qué vendió cada profesional, lo que le toca y lo que le deja al negocio."
      loading={loading}
      hasData={report !== null}
      empty={report?.byStaff.length === 0}
      emptyText="Sin ventas en este periodo."
    >
      {report && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {report.byStaff.map((m) => (
            <li key={m.staffId} className="rounded-lg border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">{m.staffName}</p>
                <p className="shrink-0 text-xs text-text-2">
                  {m.count} servicio{m.count === 1 ? "" : "s"}
                </p>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
                {money(m.revenueCents, currency)}
              </p>
              <p className="text-xs text-text-3">vendido</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div>
                  <dt className="text-text-3">Comisión</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {money(m.commissionCents, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-3">Neto negocio</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {money(m.netCents, currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-3">Ticket prom.</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {m.count > 0 ? money(Math.round(m.revenueCents / m.count), currency) : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function ItemRanking({
  report,
  currency,
  loading,
}: {
  report: SalesReportDto | null;
  currency: string;
  loading: boolean;
}) {
  return (
    <Section
      title="Servicios y ofertas más vendidos"
      hint="De los más pedidos a los menos, en el periodo."
      loading={loading}
      hasData={report !== null}
      empty={report?.byItem.length === 0}
      emptyText="Sin ventas en este periodo."
    >
      {report && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-text-3">
              <th scope="col" className="py-1.5 pr-2 font-medium">
                Servicio / oferta
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Veces vendido
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                Ingresos
              </th>
            </tr>
          </thead>
          <tbody>
            {report.byItem.map((it, i) => (
              <tr key={`${it.kind}:${it.itemId}`} className="border-b last:border-0">
                <td className="py-1.5 pr-2">
                  <span className="mr-2 text-xs tabular-nums text-text-3">{i + 1}</span>
                  {it.name}
                  {it.kind === "combo" && (
                    <span className="ml-1.5 text-[11px] text-text-3">oferta</span>
                  )}
                </td>
                <td className="py-1.5 text-right tabular-nums text-text-2">{it.count}</td>
                <td className="py-1.5 pl-2 text-right font-semibold tabular-nums">
                  {money(it.revenueCents, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
