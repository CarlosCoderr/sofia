import { CashClient } from "@/components/negocio/cash-client";
import { NegocioPage } from "@/components/negocio/negocio-page";
import { todayInTz } from "@/lib/time/slots";
import { businessTimezone } from "@/server/analytics/period";
import { getBranding } from "@/server/branding";
import { requireSalonPage } from "@/server/business/page-guard";

export const dynamic = "force-dynamic";

/**
 * Módulo SALON — caja y cierres. Solo dueño/administrador: es dinero.
 *
 * Moneda (Ajustes → Marca, soles por defecto), zona y «hoy» se resuelven aquí y bajan como props, igual que en
 * Resultados: si los pidiera el navegador, «Hoy» sería el día de quien mira y
 * no el del negocio.
 */
export default async function CajaPage() {
  const session = await requireSalonPage({ manage: true });
  const [{ currency }, timezone] = await Promise.all([
    getBranding(session.organizationId),
    businessTimezone(session.organizationId),
  ]);
  return (
    <NegocioPage title="Caja">
      <CashClient
        currency={currency}
        timezone={timezone}
        today={todayInTz(new Date(), timezone)}
      />
    </NegocioPage>
  );
}
