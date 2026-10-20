import { FORMATOS_MEDIO, type FormatoMedio } from "@/lib/medios";

/**
 * Módulo Medios — qué es DE VERDAD un archivo, mirando sus primeros bytes.
 *
 * El nombre y el `Content-Type` los pone quien sube: un `.jpg` puede ser un
 * HTML. Lo que se guarda y se sirve desde nuestro origen se decide por la firma
 * del contenido, no por lo que el archivo dice ser. Módulo puro, sin disco.
 */

/** Cuántos bytes hacen falta para reconocer cualquier formato de la lista. */
export const BYTES_PARA_RECONOCER = 32;

const MARCAS_MP4 = new Set([
  "isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "m4v ", "msnv", "f4v ",
]);

function ascii(buf: Uint8Array, desde: number, hasta: number): string {
  let s = "";
  for (let i = desde; i < hasta && i < buf.length; i++) s += String.fromCharCode(buf[i]!);
  return s;
}

function formato(ext: string): FormatoMedio {
  return FORMATOS_MEDIO.find((f) => f.ext === ext)!;
}

/** El formato que dicen los bytes, o `null` si no es ninguno de los admitidos. */
export function detectarFormato(buf: Uint8Array): FormatoMedio | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return formato("jpg");
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return formato("png");
  }
  if (buf.length >= 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") {
    return formato("webp");
  }
  if (buf.length >= 12 && ascii(buf, 4, 8) === "ftyp") {
    const marca = ascii(buf, 8, 12).toLowerCase();
    if (marca === "avif" || marca === "avis") return formato("avif");
    if (MARCAS_MP4.has(marca)) return formato("mp4");
  }
  return null;
}
