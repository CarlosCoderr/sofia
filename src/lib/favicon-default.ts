import defaultFavicon from "@/medios/favicon-agencia-luvo.png";
import { faviconHref } from "./favicon";
import type { Branding } from "./branding";

/**
 * El icono de la pestaña por defecto: el de Agencia Luvo
 * (`src/medios/favicon-agencia-luvo.png`). Next lo publica con nombre con hash,
 * así que se puede cachear para siempre y no pasa por la API.
 *
 * Es el icono mientras la persona NO suba el suyo en Ajustes → Marca; en cuanto
 * lo sube, manda el suyo, y al quitarlo se vuelve a este.
 */
export const DEFAULT_FAVICON_SRC: string =
  typeof defaultFavicon === "string"
    ? defaultFavicon
    : (defaultFavicon as { src: string }).src;

/** Qué icono lleva la pestaña: el subido por el negocio, o si no, el de la agencia. */
export function tabIconHref(branding: Pick<Branding, "name" | "accent" | "favicon">): string {
  return branding.favicon ? faviconHref(branding) : DEFAULT_FAVICON_SRC;
}
