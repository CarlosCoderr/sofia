/**
 * El correo con el código para restablecer la contraseña. Puro: sin red ni
 * base, para probarlo con tablas de casos.
 */

export type ResetCodeEmail = { subject: string; text: string; html: string };

/** Lo que escribió el dueño (el nombre de la marca) va al HTML: se escapa. */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resetCodeEmail(input: {
  code: string;
  /** Cuántos minutos vale el código. */
  minutes: number;
  /** El nombre del negocio (Ajustes → Marca). */
  productName: string;
}): ResetCodeEmail {
  const { code, minutes } = input;
  const nombre = input.productName.trim() || "tu cuenta";
  const subject = `Tu código para restablecer la contraseña: ${code}`;

  const text = [
    `Recibimos una solicitud para restablecer la contraseña de ${nombre}.`,
    "",
    `Tu código es: ${code}`,
    "",
    `Vale ${minutes} minutos y solo se puede usar una vez.`,
    "Si no fuiste tú, ignora este correo: tu contraseña no cambia.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#202020">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e4e7f0;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:18px;color:#0a0f2c">Restablecer contraseña</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5">
        Recibimos una solicitud para restablecer la contraseña de <strong>${escapeHtml(nombre)}</strong>.
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#42506b">Tu código es</p>
      <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0328ba">${escapeHtml(code)}</p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#42506b">
        Vale ${minutes} minutos y solo se puede usar una vez.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#42506b">
        Si no fuiste tú, ignora este correo: tu contraseña no cambia.
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
