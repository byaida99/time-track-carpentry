import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  borrarParte,
  clientesQuery,
  crearParte,
  formatoHoras,
  hhmm,
  hoy,
  operariosQuery,
  partesQuery,
  proyectosQuery,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Partes de Taller — Control de horas de carpintería" },
      {
        name: "description",
        content:
          "Registra las horas de operarios de taller y oficina por cliente, proyecto y tarea en segundos.",
      },
      { property: "og:title", content: "Partes de Taller — Control de horas" },
      {
        property: "og:description",
        content: "Parte de horas por operario, cliente y proyecto para carpinterías.",
      },
    ],
  }),
  component: Fichar,
});

function Fichar() {
  const qc = useQueryClient();
  const operarios = useQuery(operariosQuery);
  const clientes = useQuery(clientesQuery);
  const proyectos = useQuery(proyectosQuery);
  const partes = useQuery(partesQuery);

  const [fecha, setFecha] = useState(hoy());
  const [operarioId, setOperarioId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("14:00");
  const [descripcion, setDescripcion] = useState("");

  const proyectosCliente = useMemo(
    () => (proyectos.data ?? []).filter((p) => p.cliente_id === clienteId),
    [proyectos.data, clienteId],
  );

  const duracion = useMemo(() => {
    const [hi, mi] = horaInicio.split(":").map(Number);
    const [hf, mf] = horaFin.split(":").map(Number);
    const total = hf * 60 + mf - (hi * 60 + mi);
    return Number.isFinite(total) ? total : 0;
  }, [horaInicio, horaFin]);

  const crear = useMutation({
    mutationFn: crearParte,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes"] });
      setDescripcion("");
      toast.success("Parte registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: borrarParte,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes"] });
      toast.success("Parte eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!operarioId || !clienteId || !proyectoId) {
      toast.error("Selecciona operario, cliente y proyecto");
      return;
    }
    if (duracion <= 0) {
      toast.error("La hora de fin debe ser posterior a la de inicio");
      return;
    }
    if (descripcion.trim().length === 0) {
      toast.error("Añade una descripción del trabajo");
      return;
    }
    crear.mutate({
      fecha,
      operario_id: operarioId,
      cliente_id: clienteId,
      proyecto_id: proyectoId,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      descripcion: descripcion.trim().slice(0, 500),
    });
  }

  const delDia = (partes.data ?? []).filter((p) => p.fecha === fecha);
  const totalDia = delDia.reduce((acc, p) => acc + p.minutos, 0);

  return (
    <AppShell
      title="Parte de horas"
      subtitle="Introduce el tramo trabajado, el cliente, el proyecto y qué se ha hecho."
    >
      <Card className="border-border shadow-plank">
        <CardContent className="pt-6">
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="operario">
                  Operario
                </Label>
                <Select value={operarioId} onValueChange={setOperarioId}>
                  <SelectTrigger id="operario">
                    <SelectValue placeholder="Selecciona operario" />
                  </SelectTrigger>
                  <SelectContent>
                    {(operarios.data ?? [])
                      .filter((o) => o.activo)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nombre} · {o.area}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="fecha">
                  Fecha
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="cliente">
                  Cliente
                </Label>
                <Select
                  value={clienteId}
                  onValueChange={(v) => {
                    setClienteId(v);
                    setProyectoId("");
                  }}
                >
                  <SelectTrigger id="cliente">
                    <SelectValue placeholder="Código de cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientes.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo} — {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="proyecto">
                  Proyecto
                </Label>
                <Select value={proyectoId} onValueChange={setProyectoId} disabled={!clienteId}>
                  <SelectTrigger id="proyecto">
                    <SelectValue
                      placeholder={clienteId ? "Código de proyecto" : "Elige antes un cliente"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectosCliente.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo} — {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="inicio">
                  Hora inicio
                </Label>
                <Input
                  id="inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="fin">
                  Hora fin
                </Label>
                <Input
                  id="fin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <span className="label-caps">Duración</span>
                <div className="flex h-9 items-center rounded-md border border-border bg-secondary px-3 font-display text-sm font-semibold">
                  {duracion > 0 ? formatoHoras(duracion) : "—"}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="label-caps" htmlFor="descripcion">
                Descripción del trabajo
              </Label>
              <Textarea
                id="descripcion"
                maxLength={500}
                rows={3}
                placeholder="Montaje de armazón, lijado de puertas, visita a obra..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" disabled={crear.isPending}>
              {crear.isPending ? "Guardando..." : "Guardar parte"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Partes del {fecha}</h2>
          <span className="font-display text-sm font-semibold text-muted-foreground">
            Total: {formatoHoras(totalDia)}
          </span>
        </div>

        {delDia.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no hay partes registrados en esta fecha.
          </p>
        ) : (
          <ul className="grid gap-2">
            {delDia.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold">
                    {p.operario?.nombre} · {hhmm(p.hora_inicio)}–{hhmm(p.hora_fin)} ·{" "}
                    {formatoHoras(p.minutos)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {p.cliente?.codigo} / {p.proyecto?.codigo} — {p.proyecto?.nombre}
                  </p>
                  <p className="mt-1 text-sm">{p.descripcion}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar parte"
                  onClick={() => eliminar.mutate(p.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
