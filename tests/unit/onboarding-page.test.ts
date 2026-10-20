import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * #86 — Quién entra a la guía y a dónde manda la raíz. Las dos páginas se
 * prueban con sus dependencias falsas: solo interesa la decisión.
 */

const getSessionOrNull = vi.hoisted(() => vi.fn());
const guideStatus = vi.hoisted(() => vi.fn());
const guideFirst = vi.hoisted(() => vi.fn());

// La raíz depende de la bandera SALON: se fija aquí, no se hereda del entorno.
const salon = vi.hoisted(() => ({ on: false, agenda: true }));

vi.mock("@/server/business/flag", () => ({ salonEnabled: () => salon.on }));
vi.mock("@/server/agenda/flag", () => ({ agendaEnabled: () => salon.agenda }));
vi.mock("@/lib/auth/session", () => ({ getSessionOrNull }));
vi.mock("@/server/onboarding/guide", () => ({ guideStatus, guideFirst }));
vi.mock("@/components/onboarding/onboarding-client", () => ({
  OnboardingClient: () => null,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ name: "Sofi" }]) }),
      }),
    }),
  }),
  schema: { agentProfile: { organizationId: "organization_id", name: "name" } },
}));

import OnboardingPage from "@/app/(app)/guia-de-inicio/page";
import Home from "@/app/page";
import { canConfigure } from "@/lib/auth/roles";

const owner = { userId: "usr_1", organizationId: "org_1", role: "owner" };
const member = { userId: "usr_2", organizationId: "org_1", role: "member" };

beforeEach(() => {
  getSessionOrNull.mockReset();
  guideStatus.mockReset();
  guideFirst.mockReset();
  salon.on = false;
  salon.agenda = true;
});

describe("quién configura", () => {
  it("el propietario y un admin; un miembro del equipo no", () => {
    expect(canConfigure("owner")).toBe(true);
    expect(canConfigure("admin")).toBe(true);
    expect(canConfigure("member")).toBe(false);
    expect(canConfigure(undefined)).toBe(false);
  });
});

describe("/guia-de-inicio", () => {
  it("sin sesión manda al login", async () => {
    getSessionOrNull.mockResolvedValue(null);
    await expect(OnboardingPage()).rejects.toThrow("redirect:/iniciar-sesion");
  });

  it("un miembro del equipo va a la Bandeja: no puede hacer ningún paso", async () => {
    getSessionOrNull.mockResolvedValue(member);
    await expect(OnboardingPage()).rejects.toThrow("redirect:/bandeja");
    expect(guideStatus).not.toHaveBeenCalled();
  });

  it("el propietario ve la guía resuelta en el servidor", async () => {
    getSessionOrNull.mockResolvedValue(owner);
    guideStatus.mockResolvedValue({ steps: [], complete: false, enabled: false });
    const page = (await OnboardingPage()) as { props: { agentName: string | null } };
    expect(guideStatus).toHaveBeenCalledWith("org_1");
    expect(page.props.agentName).toBe("Sofi");
  });
});

describe("la raíz", () => {
  it("sin sesión sigue yendo a la Bandeja (que manda al login)", async () => {
    getSessionOrNull.mockResolvedValue(null);
    await expect(Home()).rejects.toThrow("redirect:/bandeja");
    expect(guideFirst).not.toHaveBeenCalled();
  });

  it("al dueño con pasos pendientes lo manda a la guía", async () => {
    getSessionOrNull.mockResolvedValue(owner);
    guideFirst.mockResolvedValue(true);
    await expect(Home()).rejects.toThrow("redirect:/guia-de-inicio");
    expect(guideFirst).toHaveBeenCalledWith(owner);
  });

  it("con todo listo y el agente encendido, a la Bandeja como siempre", async () => {
    getSessionOrNull.mockResolvedValue(owner);
    guideFirst.mockResolvedValue(false);
    await expect(Home()).rejects.toThrow("redirect:/bandeja");
  });

  it("con SALON encendido, el dueño entra al Panel sin pasar por la guía", async () => {
    salon.on = true;
    getSessionOrNull.mockResolvedValue(owner);
    guideFirst.mockResolvedValue(true);
    await expect(Home()).rejects.toThrow("redirect:/panel");
    expect(guideFirst).not.toHaveBeenCalled();
  });

  it("con SALON encendido, un miembro del equipo va a Citas (o a Contactos sin agenda)", async () => {
    salon.on = true;
    getSessionOrNull.mockResolvedValue(member);
    await expect(Home()).rejects.toThrow("redirect:/citas");
    salon.agenda = false;
    await expect(Home()).rejects.toThrow("redirect:/contactos");
  });

  it("con SALON encendido y sin sesión, nada cambia: la Bandeja manda al login", async () => {
    salon.on = true;
    getSessionOrNull.mockResolvedValue(null);
    await expect(Home()).rejects.toThrow("redirect:/bandeja");
  });
});
