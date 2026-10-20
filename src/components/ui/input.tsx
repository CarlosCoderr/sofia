"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow] placeholder:text-text-3 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Campo de texto. Si es de contraseña (`type="password"`) lleva a la derecha un
 * ojo para mostrarla u ocultarla: sirve en TODA pantalla que ya usaba `Input`
 * (login, registro, llaves y tokens de Ajustes) sin tocarlas una por una.
 */
export function Input({ className, type, ...props }: React.ComponentPropsWithRef<"input">) {
  if (type === "password") return <PasswordInput className={className} {...props} />;
  return <input type={type} className={cn(FIELD, className)} {...props} />;
}

function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentPropsWithRef<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div className="relative w-full">
      <input
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn(FIELD, "pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        // tabIndex normal: quien navega con teclado también puede mostrarla.
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-text-3 transition-colors hover:text-foreground focus-visible:text-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}
