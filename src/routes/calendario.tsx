import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  borrarDia,
  calendarioQuery,
  crearDias,
  ETIQUETA_DIA,
  ETIQUETA_TIPO,
  formatoHoras,
  hhmm,
  hoy,
  operariosQuery,
  partesQuery,
  type TipoDia,
} from "@/lib/api";
import { usePermisos } from "@/lib/permisos";
import { useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario laboral — Partes de Taller" },
      {
        name: "description",
        content:
          "Festivos, vacaciones y partes diarios de cada operario en un calendario mensual.",
      },
      { property: "og:title", content: "Calendario laboral de la carpintería" },
      {
        property: "og:description",
        content: "Consulta festivos, vacaciones y tus horas registradas día a día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagina,
});

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Pagina() {
  const { sesion } = useSesion();
  const { esAdmin } = usePermisos();
  const qc = useQueryClient();

  const calendario = useQuery(calendarioQuery);
  const partes = useQuery(partesQuery);
  const operarios = useQuery(operariosQuery);

  const inicial = new Date();
  const [mes, setMes] = useState({ anio: inicial.getFullYear(), mes: inicial.getMonth() });
  const [diaSel, setDiaSel] = useState<string>(hoy());

  const [form, setForm] = useState({
    desde: hoy(),
    hasta: hoy(),
    tipo: "festivo" as TipoDia,
    operario: "todos",
    descripcion: "",
  });

  const crear = useMutation({
    mutationFn: crearDias,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario"] });
      setForm((f) => ({ ...f, descripcion: "" }));
      toast.success("Calendario actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: borrarDia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario"] });
      toast.success("Día eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Días que me afectan: festivos/vacaciones de empresa (sin operario) o míos.
  const diasVisibles = useMemo(
    () =>
      (calendario.data ?? []).filter(
        (d) => esAdmin || d.operario_id === null || d.operario_id === sesion?.id,
      ),
    [calendario.data, esAdmin, sesion?.id],
  );

  const misPartes = useMemo(
    () => (partes.data ?? []).filter((p) => p.operario_id === sesion?.id),
    [partes.data, sesion?.id],
  );

  const celdas = useMemo(() => {
    const primero = new Date(mes.anio, mes.mes, 1);
    const offset = (primero.getDay() + 6) % 7; // lunes primero
    const total = new Date(mes.anio, mes.mes + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= total; i++) out.push(iso(new Date(mes.anio, mes.mes, i)));
    return out;
  }, [mes]);

  function moverMes(delta: number) {
    const d = new Date(mes.anio, mes.mes + delta, 1);
    setMes({ anio: d.getFullYear(), mes: d.getMonth() });
  }

  const delDia = diasVisibles.filter((d) => d.fecha === diaSel);
  const partesDia = misPartes
    .filter((p) => p.fecha === diaSel)
    .slice()
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const trabajadoDia = partesDia
    .filter((p) => p.tipo === "trabajo")
    .reduce((acc, p) => acc + p.minutos, 0);

  if (!sesion) {
    return (
      <AppShell title="Calendario laboral">
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Accede con tu PIN en «Fichar» para ver el calendario.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Calendario laboral"
      subtitle="Festivos, vacaciones y tus partes de cada día."
    >
      <Card className="shadow-plank">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => moverMes(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-display text-lg font-bold capitalize">
              {MESES[mes.mes]} {mes.anio}
            </p>
            <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => moverMes(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DIAS.map((d) => (
              <span key={d} className="label-caps py-1 text-muted-foreground">
                {d}
              </span>
            ))}
            {celdas.map((fecha, i) => {
              if (!fecha) return <span key={`v${i}`} />;
              const marcas = diasVisibles.filter((d) => d.fecha === fecha);
              const festivo = marcas.some((m) => m.tipo === "festivo");
              const vacaciones = marcas.some((m) => m.tipo === "vacaciones");
              const minutos = misPartes
                .filter((p) => p.fecha === fecha && p.tipo === "trabajo")
                .reduce((acc, p) => acc + p.minutos, 0);
              return (
                <button
                  key={fecha}
                  type="button"
                  onClick={() => setDiaSel(fecha)}
                  className={`flex min-h-16 flex-col items-center gap-1 rounded-md border p-1 text-xs transition-colors ${
                    diaSel === fecha ? "border-primary bg-secondary" : "border-border hover:bg-secondary"
                  } ${festivo ? "bg-destructive/10" : vacaciones ? "bg-primary/10" : ""}`}
                >
                  <span className="font-display font-semibold">{Number(fecha.slice(8))}</span>
                  {festivo ? <span className="text-[10px] text-destructive">Festivo</span> : null}
                  {vacaciones ? <span className="text-[10px] text-primary">Vacac.</span> : null}
                  {minutos > 0 ? (
                    <span className="text-[10px] text-muted-foreground">{formatoHoras(minutos)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Día {diaSel}</h2>
        <div className="grid gap-2">
          {delDia.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 text-sm"
            >
              <span>
                <span className="font-display font-semibold">{ETIQUETA_DIA[d.tipo]}</span>
                {d.operario_id ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {(operarios.data ?? []).find((o) => o.id === d.operario_id)?.nombre ?? "operario"}
                  </span>
                ) : (
                  <span className="text-muted-foreground"> · toda la empresa</span>
                )}
                {d.descripcion ? <span className="text-muted-foreground"> · {d.descripcion}</span> : null}
              </span>
              {esAdmin ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar día"
                  onClick={() => borrar.mutate(d.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}

          {partesDia.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No tienes partes registrados este día.
            </p>
          ) : (
            <>
              {partesDia.map((p) => (
                <div key={p.id} className="rounded-md border border-border bg-card p-3">
                  <p className="font-display text-sm font-semibold">
                    {hhmm(p.hora_inicio)}–{hhmm(p.hora_fin)} · {formatoHoras(p.minutos)}
                    {p.tipo !== "trabajo" ? (
                      <span className="ml-2 rounded-sm bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {ETIQUETA_TIPO[p.tipo] ?? p.tipo}
                      </span>
                    ) : null}
                  </p>
                  {p.tipo === "trabajo" ? (
                    <p className="text-sm text-muted-foreground">
                      {p.cliente?.codigo} / {p.proyecto?.codigo} — {p.descripcion}
                    </p>
                  ) : null}
                </div>
              ))}
              <p className="text-sm font-semibold">Total trabajado: {formatoHoras(trabajadoDia)}</p>
            </>
          )}
        </div>
      </section>

      {esAdmin ? (
        <Card className="mt-8 shadow-plank">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-lg font-bold">Añadir festivos o vacaciones</h2>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (form.tipo === "vacaciones" && form.operario === "todos") {
                  // permitido: vacaciones colectivas (cierre)
                }
                crear.mutate({
                  desde: form.desde,
                  hasta: form.hasta,
                  tipo: form.tipo,
                  operario_id: form.operario === "todos" ? null : form.operario,
                  descripcion: form.descripcion.trim().slice(0, 200),
                });
              }}
            >
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="desde">
                  Desde
                </Label>
                <Input
                  id="desde"
                  type="date"
                  value={form.desde}
                  onChange={(e) => setForm({ ...form, desde: e.target.value, hasta: e.target.value > form.hasta ? e.target.value : form.hasta })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="hasta">
                  Hasta
                </Label>
                <Input
                  id="hasta"
                  type="date"
                  value={form.hasta}
                  onChange={(e) => setForm({ ...form, hasta: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="tipo-dia">
                  Tipo
                </Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as TipoDia })}
                >
                  <SelectTrigger id="tipo-dia">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festivo">Festivo</SelectItem>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="op-dia">
                  Operario
                </Label>
                <Select
                  value={form.operario}
                  onValueChange={(v) => setForm({ ...form, operario: v })}
                >
                  <SelectTrigger id="op-dia">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Toda la empresa</SelectItem>
                    {(operarios.data ?? []).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label className="label-caps" htmlFor="desc-dia">
                  Descripción
                </Label>
                <Input
                  id="desc-dia"
                  maxLength={200}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Fiesta local, vacaciones de verano..."
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={crear.isPending}>
                  {crear.isPending ? "Guardando..." : "Añadir al calendario"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
