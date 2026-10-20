/**
 * Correo saliente — conector OPCIONAL (constitución II, endurecida).
 *
 * El núcleo del CRM no depende de ningún servicio de correo. Esto solo existe
 * para el restablecimiento de contraseña por código, y solo si el negocio
 * apunta a SU servidor SMTP (el del hosting, Gmail con contraseña de
 * aplicación, Brevo, Mailgun…). Sin `SMTP_HOST` y `SMTP_FROM` no hay conector:
 * la función se apaga (la pantalla lo explica) y todo lo demás funciona igual.
 *
 * Se lee de `process.env` directo, como las banderas (`agendaEnabled()`):
 * preguntar si algo existe no puede depender de que TODO el entorno valide.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  /** TLS directo (puerto 465). Con 587 se negocia STARTTLS solo. */
  secure: boolean;
  user?: string;
  pass?: string;
  /** El remitente que ve quien recibe: `Nombre <correo@dominio>` o solo el correo. */
  from: string;
};

type EnvLike = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "true", "on", "yes", "si", "sí"]);

/** `null` si el correo no está configurado. */
export function smtpConfig(env: EnvLike = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) return null;

  const port = Number.parseInt(env.SMTP_PORT ?? "", 10);
  const secure =
    env.SMTP_SECURE !== undefined
      ? TRUE_VALUES.has(env.SMTP_SECURE.trim().toLowerCase())
      : port === 465;
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : secure ? 465 : 587,
    secure,
    ...(user ? { user } : {}),
    ...(pass ? { pass } : {}),
    from,
  };
}

/** ¿Hay un servidor SMTP al que mandarle el correo? */
export function emailConfigured(env: EnvLike = process.env): boolean {
  return smtpConfig(env) !== null;
}

/**
 * Fuera de producción, sin SMTP, el código se imprime en la consola del
 * servidor: así se puede probar el flujo completo en local sin montar un
 * correo. En producción nunca: un código en un log es una puerta abierta.
 */
export function consoleMailerAllowed(env: EnvLike = process.env): boolean {
  return !emailConfigured(env) && (env.NODE_ENV ?? "development") !== "production";
}

/**
 * ¿Se puede restablecer la contraseña por correo en esta instancia? Con SMTP
 * configurado, sí; en desarrollo, también (código por consola).
 */
export function passwordResetAvailable(env: EnvLike = process.env): boolean {
  return emailConfigured(env) || consoleMailerAllowed(env);
}
