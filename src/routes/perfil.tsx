import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import {
  calendarioQuery,
  ETIQUETA_DIA,
  ETIQUETA_ROL,
  formatoHoras,
  hhmm,
  hoy,
  operariosQuery,
  partesQuery,
} from "@/lib/api";
import { usePermisos } from "@/lib/permisos";
import { useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Partes de Taller" },
      {
        name: "description",
        content: "Consulta tu jornada, tus descansos, tus permisos y tus horas registradas.",
      },
      { property: "og:title", content: "Mi perfil de operario" },
      {
        property: "og:description",
        content: "Jornada, descansos, permisos y resumen de horas del operario.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { sesion } = useSesion();
  const { roles } = usePermisos();
  const operarios = useQuery(operariosQuery);
  const partes = useQuery(partesQuery);
  const calendario = useQuery(calendarioQuery);

  const yo = (operarios.data ?? []).find((o) => o.id === sesion?.id);

  const mios = useMemo(
    () => (partes.data ?? []).filter((p) => p.operario_id === sesion?.id),
    [partes.data, sesion?.id],
  );

  const mesActual = hoy().slice(0, 7);
  const minutosMes = mios
    .filter((p) => p.fecha.startsWith(mesActual) && p.tipo === "trabajo")
    .reduce((acc, p) => acc + p.minutos, 0);

  const proximos = (calendario.data ?? [])
    .filter((d) => d.fecha >= hoy() && (d.operario_id === null || d.operario_id === sesion?.id))
    .slice(0, 6);

  if (!sesion) {
    return (
      <AppShell title="Mi perfil">
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Accede con tu PIN en «Fichar» para ver tu perfil.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mi perfil" subtitle="Tus datos de jornada, permisos y horas registradas.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-plank">
          <CardContent className="grid gap-2 pt-6 text-sm">
            <p className="font-display text-lg font-bold">{sesion.nombre}</p>
            <p className="text-muted-foreground">Área: {sesion.area}</p>
            <p className="text-muted-foreground">
              Permisos: {roles.map((r) => ETIQUETA_ROL[r]).join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-plank">
          <CardContent className="grid gap-2 pt-6 text-sm">
            <p className="label-caps text-muted-foreground">Jornada</p>
            <p>{formatoHoras(yo?.jornada_minutos ?? 480)} al día</p>
            <p className="text-muted-foreground">
              Entrada {hhmm(yo?.hora_entrada ?? "07:00")} · desayuno {yo?.desayuno_minutos ?? 30} min
              · comida {yo?.comida_minutos ?? 60} min
            </p>
            <p className="mt-2 font-display font-semibold">
              Este mes: {formatoHoras(minutosMes)} trabajadas
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Próximos festivos y vacaciones</h2>
        {proximos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay días marcados próximamente.
          </p>
        ) : (
          <ul className="grid gap-2">
            {proximos.map((d) => (
              <li key={d.id} className="rounded-md border border-border bg-card p-3 text-sm">
                <span className="font-display font-semibold">{d.fecha}</span>{" "}
                <span className="text-muted-foreground">
                  · {ETIQUETA_DIA[d.tipo]}
                  {d.operario_id ? " (tú)" : " (empresa)"}
                  {d.descripcion ? ` · ${d.descripcion}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
