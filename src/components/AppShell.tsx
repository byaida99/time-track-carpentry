import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Hammer } from "lucide-react";

import { usePermisos } from "@/lib/permisos";
import { useSesion } from "@/lib/sesion";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { sesion } = useSesion();
  const { puedeGestionarDatos, puedeVerInformes } = usePermisos();

  const nav = [
    { to: "/", label: "Fichar", ver: true },
    { to: "/calendario", label: "Calendario", ver: Boolean(sesion) },
    { to: "/perfil", label: "Mi perfil", ver: Boolean(sesion) },
    { to: "/informes", label: "Informes", ver: puedeVerInformes },
    { to: "/datos", label: "Clientes y proyectos", ver: puedeGestionarDatos },
  ].filter((item) => item.ver);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Hammer className="size-5" />
            </span>
            <span className="font-display text-lg font-bold leading-none tracking-tight">
              Partes de Taller
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
