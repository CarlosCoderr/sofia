import Link from "next/link";
import { RecuperarContrasenaForm } from "@/components/auth/recuperar-contrasena-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { passwordResetAvailable } from "@/server/email/config";

// La disponibilidad depende del entorno (SMTP): se lee en cada petición.
export const dynamic = "force-dynamic";

/**
 * Restablecer la contraseña con un código por correo. Sin servidor de correo
 * configurado no hay a dónde mandarlo: se dice con claridad y se explica cómo
 * habilitarlo, en vez de dejar un formulario que no llega a ningún lado.
 */
export default function RecuperarContrasenaPage() {
  if (!passwordResetAvailable()) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            Esta instancia todavía no tiene el correo configurado, así que no puede enviar el
            código.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-2">
            Quien administra el servidor debe definir <code>SMTP_HOST</code> y{" "}
            <code>SMTP_FROM</code> (y, si su servidor lo pide, <code>SMTP_USER</code> y{" "}
            <code>SMTP_PASS</code>) y reiniciar la aplicación.
          </p>
          <Link href="/iniciar-sesion" className="text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    );
  }
  return <RecuperarContrasenaForm />;
}
