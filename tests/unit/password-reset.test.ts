import { describe, expect, it } from "vitest";
import {
  consoleMailerAllowed,
  emailConfigured,
  passwordResetAvailable,
  smtpConfig,
} from "@/server/email/config";
import { resetCodeEmail } from "@/server/email/templates";
import {
  isBlockedEmailOtpPath,
  REQUEST_RESET_PATH,
  RESET_PASSWORD_PATH,
} from "@/server/auth/password-reset";

describe("correo saliente: configuración SMTP", () => {
  it("sin SMTP_HOST o sin SMTP_FROM no hay conector", () => {
    expect(smtpConfig({})).toBeNull();
    expect(smtpConfig({ SMTP_HOST: "smtp.x.com" })).toBeNull();
    expect(smtpConfig({ SMTP_FROM: "a@x.com" })).toBeNull();
    expect(smtpConfig({ SMTP_HOST: "  ", SMTP_FROM: "a@x.com" })).toBeNull();
    expect(emailConfigured({})).toBe(false);
  });

  it("con host y remitente: puerto 587 y STARTTLS por defecto", () => {
    expect(smtpConfig({ SMTP_HOST: "smtp.x.com", SMTP_FROM: "a@x.com" })).toEqual({
      host: "smtp.x.com",
      port: 587,
      secure: false,
      from: "a@x.com",
    });
  });

  it("el puerto 465 implica TLS directo, salvo que SMTP_SECURE diga lo contrario", () => {
    const base = { SMTP_HOST: "h", SMTP_FROM: "a@x.com" };
    expect(smtpConfig({ ...base, SMTP_PORT: "465" })?.secure).toBe(true);
    expect(smtpConfig({ ...base, SMTP_PORT: "465", SMTP_SECURE: "false" })?.secure).toBe(false);
    expect(smtpConfig({ ...base, SMTP_PORT: "2525", SMTP_SECURE: "true" })).toMatchObject({
      port: 2525,
      secure: true,
    });
  });

  it("usuario y contraseña solo si vienen; un puerto inválido cae al por defecto", () => {
    const c = smtpConfig({
      SMTP_HOST: "h",
      SMTP_FROM: "a@x.com",
      SMTP_PORT: "abc",
      SMTP_USER: " u ",
      SMTP_PASS: "p",
    });
    expect(c).toMatchObject({ port: 587, user: "u", pass: "p" });
    expect(smtpConfig({ SMTP_HOST: "h", SMTP_FROM: "a@x.com" })).not.toHaveProperty("user");
  });
});

describe("restablecer contraseña: ¿está disponible?", () => {
  const smtp = { SMTP_HOST: "h", SMTP_FROM: "a@x.com" };

  it("con SMTP configurado, sí (en producción también)", () => {
    expect(passwordResetAvailable({ ...smtp, NODE_ENV: "production" })).toBe(true);
    expect(consoleMailerAllowed({ ...smtp, NODE_ENV: "development" })).toBe(false);
  });

  it("sin SMTP en desarrollo, sí: el código sale por la consola", () => {
    expect(consoleMailerAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(passwordResetAvailable({ NODE_ENV: "development" })).toBe(true);
  });

  it("sin SMTP en producción, no: un código en un log sería una puerta abierta", () => {
    expect(consoleMailerAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(passwordResetAvailable({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("rutas del plugin de códigos", () => {
  it("solo se exponen pedir el código y restablecer", () => {
    expect(isBlockedEmailOtpPath(REQUEST_RESET_PATH)).toBe(false);
    expect(isBlockedEmailOtpPath(RESET_PASSWORD_PATH)).toBe(false);
  });

  it("entrar solo con un código, verificar o cambiar el correo responden 404", () => {
    for (const p of [
      "/sign-in/email-otp",
      "/email-otp/send-verification-otp",
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
      "/forget-password/email-otp",
    ]) {
      expect(isBlockedEmailOtpPath(p), p).toBe(true);
    }
  });

  it("no toca el resto de rutas de autenticación", () => {
    for (const p of ["/sign-in/email", "/sign-up/email", "/get-session", "/sign-out"]) {
      expect(isBlockedEmailOtpPath(p), p).toBe(false);
    }
  });
});

describe("correo con el código", () => {
  const mail = resetCodeEmail({ code: "482913", minutes: 10, productName: "Agencia Luvo" });

  it("trae el código en el asunto, en el texto y en el HTML", () => {
    expect(mail.subject).toContain("482913");
    expect(mail.text).toContain("482913");
    expect(mail.html).toContain("482913");
  });

  it("dice cuánto vale y que se ignore si no fue la persona", () => {
    expect(mail.text).toContain("10 minutos");
    expect(mail.text).toContain("ignora este correo");
    expect(mail.html).toContain("10 minutos");
  });

  it("el nombre del negocio va escapado en el HTML (lo escribió el dueño)", () => {
    const m = resetCodeEmail({ code: "111111", minutes: 10, productName: `<img src=x onerror="a()">` });
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;img");
    expect(m.html).toContain("&quot;");
  });

  it("sin nombre de marca usa un texto neutro", () => {
    expect(resetCodeEmail({ code: "111111", minutes: 10, productName: "  " }).text).toContain(
      "tu cuenta"
    );
  });
});
