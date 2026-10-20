/**
 * Módulo SALON — el marco de cada pantalla propia (Servicios, Equipo, Caja,
 * Agenda por sillas): un título arriba y el contenido que se desplaza debajo.
 */
export function NegocioPage({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
      </header>
      <div className="relative min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
