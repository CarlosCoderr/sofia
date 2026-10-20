import nodemailer from "nodemailer";
import { consoleMailerAllowed, smtpConfig } from "@/server/email/config";

/**
 * Adaptador del correo saliente (contrato público: `sendMail`). Detrás de él
 * vive nodemailer hablando SMTP con el servidor del negocio; cambiar de
 * transporte no toca a nadie más.
 *
 * Degradación: sin SMTP en producción, `sendMail` lanza `EmailNotConfiguredError`
 * y quien llama decide (el restablecimiento ya lo evita antes, con
 * `passwordResetAvailable`). Fuera de producción imprime en consola.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("El correo saliente no está configurado (SMTP_HOST y SMTP_FROM)");
    this.name = "EmailNotConfiguredError";
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  const config = smtpConfig();
  if (!config) {
    if (consoleMailerAllowed()) {
      // Solo desarrollo: ver el código sin montar un servidor de correo.
      console.log(
        `[correo:desarrollo] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}`
      );
      return;
    }
    throw new EmailNotConfiguredError();
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user ? { auth: { user: config.user, pass: config.pass ?? "" } } : {}),
    // Un servidor de correo caído no debe colgar la petición.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transport.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
  } finally {
    transport.close();
  }
}
