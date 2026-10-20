import { X } from "lucide-react";

/**
 * Regla del sistema: toda ventana emergente se cierra con una X (arriba a la
 * derecha) o tocando fuera de ella. El panel que la contiene debe ser
 * `relative` y su título llevar `pr-8` para no quedar debajo de la X.
 */
export function DialogCloseButton({
  onClick,
  disabled,
  label = "Cerrar",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="absolute right-3 top-3 rounded-sm p-1 text-text-3 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
