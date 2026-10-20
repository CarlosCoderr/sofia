import Image from "next/image";
import logoAgencia from "@/medios/agencia-luvo.png";

/**
 * Pantalla de entrada con la escenografía del hero de vocerocrm.com: papel
 * frío, rejilla difuminada y dos resplandores (azul y cian) detrás del
 * formulario.
 *
 * El logo (`src/medios/agencia-luvo.png`) y el titular son siempre los de la
 * agencia, no los de Ajustes → Marca. El titular se muestra tal cual está
 * escrito, sin partirlo ni adornarlo.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fcbd] p-4">
      <div className="brand-grid absolute inset-0" aria-hidden />
      <div className="brand-glow brand-glow-a" aria-hidden />
      <div className="brand-glow brand-glow-b" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <Image
            src={logoAgencia}
            alt="Agencia Luvo"
            priority
            unoptimized
            className="h-auto w-40"
          />
          <h1 className="text-[20px] leading-tight tracking-[-0.03em]">
            Partners de escalabilidad operativa y crecimiento de ventas
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}
