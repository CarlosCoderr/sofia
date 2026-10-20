import { chatCompletionsUrl, modelsUrl } from "@/lib/ai/presets";

/**
 * Sonda del proveedor para Ajustes → IA: «Probar conexión» y «Traer modelos».
 *
 * Vive en `lib/ai` porque es la única frontera con el LLM (Constitución II).
 * Nunca lanza: todo fallo vuelve tipado, con el código HTTP cuando lo hubo,
 * para que la pantalla diga QUÉ pasó («llave rechazada», «sin saldo», «ese
 * modelo no existe») en vez de «error». Y nada se guarda desde aquí: probar
 * es probar.
 */

export type ProbeErrorCode =
  | "invalid_token"
  | "no_credit"
  | "model_not_found"
  | "rate_limited"
  | "provider_error"
  | "unreachable"
  | "timeout"
  | "bad_url";

export type ProbeResult =
  | { ok: true; latencyMs: number }
  | {
      ok: false;
      code: ProbeErrorCode;
      httpStatus: number | null;
      message: string;
    };

const PROBE_TIMEOUT_MS = 20_000;
const MAX_BODY = 2000;

/**
 * SSRF: la base URL la escribe quien configura la IA (ya protegido por
 * `canConfigure`), pero sigue siendo el servidor el que hace la petición. Sin
 * esto, un `owner` malicioso o una cuenta comprometida podría usar «Probar
 * conexión» para tocar la red interna del contenedor/host (otro servicio en
 * `localhost`, el endpoint de metadata de la nube en `169.254.169.254`) desde
 * dentro, con las credenciales de red del servidor. Es una lista negra de IP
 * literal, no resuelve DNS: no detiene DNS rebinding, pero cierra el caso
 * común (localhost, rangos privados, link-local) con costo cero.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  // IPv4 literal (incluye las representaciones que algunos parsers normalizan).
  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // privada
    if (a === 169 && b === 254) return true; // link-local, incluye metadata de nube
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true; // privada
    if (a === 192 && b === 168) return true; // privada
    if (a === 0) return true; // "esta red"
  }
  // IPv6 loopback/link-local/ULA.
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) {
    return true;
  }
  return false;
}

function validateExternalUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "La base URL no es una dirección http(s) válida";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "La base URL no es una dirección http(s) válida";
  }
  if (isBlockedHost(parsed.hostname)) {
    return "La base URL no puede apuntar a una red interna o local";
  }
  return null;
}

/** Una llamada mínima: un turno de pocos tokens con el modelo elegido. */
export async function probeProvider(input: {
  baseUrl: string;
  model: string;
  token: string;
  timeoutMs?: number;
  /** Solo para tests. */
  fetchImpl?: typeof fetch;
}): Promise<ProbeResult> {
  const url = chatCompletionsUrl(input.baseUrl);
  const urlError = validateExternalUrl(url);
  if (urlError) {
    return { ok: false, code: "bad_url", httpStatus: null, message: urlError };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? PROBE_TIMEOUT_MS
  );
  const inicio = Date.now();
  try {
    const res = await (input.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: {
        // El token jamás se loguea; solo viaja en este header.
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: "user", content: "Responde solo: ok" }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
      } | null;
      if (!json?.choices?.length) {
        return {
          ok: false,
          code: "provider_error",
          httpStatus: res.status,
          message:
            "El proveedor contestó, pero no con el formato de la API de OpenAI (sin `choices`)",
        };
      }
      return { ok: true, latencyMs: Date.now() - inicio };
    }
    const text = await res.text().catch(() => "");
    return clasificarFallo(res.status, text);
  } catch {
    return controller.signal.aborted
      ? {
          ok: false,
          code: "timeout",
          httpStatus: null,
          message: "El proveedor no contestó a tiempo",
        }
      : {
          ok: false,
          code: "unreachable",
          httpStatus: null,
          message:
            "No se pudo conectar con el proveedor: revisa la base URL y la red del servidor",
        };
  } finally {
    clearTimeout(timer);
  }
}

/** Qué significa un código del proveedor, en el idioma del dueño. */
export function clasificarFallo(
  status: number,
  body: string
): Extract<ProbeResult, { ok: false }> {
  const detalle = resumenDelCuerpo(body);
  if (status === 401 || status === 403) {
    return {
      ok: false,
      code: "invalid_token",
      httpStatus: status,
      message: `El proveedor rechazó la llave (${status})${detalle}`,
    };
  }
  if (status === 402) {
    return {
      ok: false,
      code: "no_credit",
      httpStatus: status,
      message: `La cuenta no tiene saldo (402)${detalle}`,
    };
  }
  if (status === 404 || (status === 400 && /model/i.test(body))) {
    return {
      ok: false,
      code: "model_not_found",
      httpStatus: status,
      message: `El proveedor no reconoce ese modelo (${status})${detalle}`,
    };
  }
  if (status === 429) {
    return {
      ok: false,
      code: "rate_limited",
      httpStatus: status,
      message: `El proveedor pide esperar (429): la llave sirve, vuelve a probar en un momento${detalle}`,
    };
  }
  return {
    ok: false,
    code: "provider_error",
    httpStatus: status,
    message: `El proveedor respondió ${status}${detalle}`,
  };
}

/** El `error.message` del cuerpo si lo trae, truncado; si no, nada. */
function resumenDelCuerpo(body: string): string {
  if (!body) return "";
  let texto = body;
  try {
    const json = JSON.parse(body) as { error?: { message?: unknown } | string };
    if (typeof json?.error === "string") texto = json.error;
    else if (typeof json?.error?.message === "string") texto = json.error.message;
  } catch {
    // no era JSON: se usa el texto tal cual
  }
  texto = texto.replace(/\s+/g, " ").trim();
  if (!texto) return "";
  return `: ${texto.length > MAX_BODY ? `${texto.slice(0, MAX_BODY)}…` : texto}`;
}

export type ModelsResult =
  | { ok: true; modelos: { id: string; nombre: string | null }[] }
  | {
      ok: false;
      code: "unsupported" | "invalid_token" | "unreachable" | "timeout" | "bad_url" | "provider_error";
      httpStatus: number | null;
      message: string;
    };

const MAX_MODELS = 1000;

/**
 * `GET {base}/v1/models` con la llave. OpenRouter y OpenAI lo publican con la
 * misma forma (`{ data: [{ id, name? }] }`); un proveedor que no lo tenga
 * contesta 404 o algo que no es esa lista, y aquí se dice sin romper: el
 * modelo se puede escribir a mano.
 */
export async function listModels(input: {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  /** Solo para tests. */
  fetchImpl?: typeof fetch;
}): Promise<ModelsResult> {
  const url = modelsUrl(input.baseUrl);
  const urlError = validateExternalUrl(url);
  if (urlError) {
    return { ok: false, code: "bad_url", httpStatus: null, message: urlError };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? PROBE_TIMEOUT_MS
  );
  try {
    const res = await (input.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "invalid_token",
        httpStatus: res.status,
        message: `El proveedor rechazó la llave (${res.status})`,
      };
    }
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      return noSoportado(res.status);
    }
    if (!res.ok) {
      return {
        ok: false,
        code: "provider_error",
        httpStatus: res.status,
        message: `El proveedor respondió ${res.status} al pedir la lista de modelos`,
      };
    }
    const json = (await res.json().catch(() => null)) as {
      data?: unknown;
    } | null;
    if (!json || !Array.isArray(json.data)) return noSoportado(res.status);
    const modelos = json.data
      .map((m) => {
        if (!m || typeof m !== "object") return null;
        const r = m as { id?: unknown; name?: unknown };
        if (typeof r.id !== "string" || !r.id.trim()) return null;
        return {
          id: r.id.trim(),
          nombre: typeof r.name === "string" && r.name.trim() ? r.name.trim() : null,
        };
      })
      .filter((m): m is { id: string; nombre: string | null } => m !== null)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, MAX_MODELS);
    return { ok: true, modelos };
  } catch {
    return controller.signal.aborted
      ? {
          ok: false,
          code: "timeout",
          httpStatus: null,
          message: "El proveedor no contestó a tiempo",
        }
      : {
          ok: false,
          code: "unreachable",
          httpStatus: null,
          message:
            "No se pudo conectar con el proveedor: revisa la base URL y la red del servidor",
        };
  } finally {
    clearTimeout(timer);
  }
}

function noSoportado(status: number): Extract<ModelsResult, { ok: false }> {
  return {
    ok: false,
    code: "unsupported",
    httpStatus: status,
    message:
      "Este proveedor no publica su lista de modelos: escribe el nombre del modelo a mano",
  };
}
