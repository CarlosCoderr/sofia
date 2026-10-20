import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { tabIconHref } from "@/lib/favicon-default";
import { getBranding } from "@/server/branding";
import { enabledChannels } from "@/server/channels/enabled";
import { productName } from "@/lib/channels";
import "./globals.css";

// Las tres voces de la marca, las mismas de vocerocrm.com. next/font las
// descarga en BUILD y las sirve self-hosted (sin CDN en runtime: soberanía).
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const producto = productName([...enabledChannels()]);
  return {
    title: `${branding.name} | ${producto}`,
    description: `${producto} con agente de IA y Laboratorio de auto-evaluación`,
    // Sin logo propio, el icono de Agencia Luvo; con uno subido en Ajustes → Marca,
    // ese. El `?v=` cambia con la marca: los navegadores guardan el favicon con
    // una insistencia notable y, sin eso, el logo nuevo tarda días en aparecer.
    icons: { icon: tabIconHref(branding) },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${instrumentSerif.variable} ${plexMono.variable}`}
    >
      {/* El acento personalizado NO se inyecta aquí: inicio de sesión y
          recuperación llevan siempre los colores de la agencia (los de
          globals.css). Lo aplica `(app)/layout.tsx`, ya dentro del sistema. */}
      <body className="font-sans">{children}</body>
    </html>
  );
}
