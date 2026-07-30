import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Pencil, Trash2, X } from "lucide-react";

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
  actualizarParte,
  borrarParte,
  clientesQuery,
  crearParte,
  formatoHoras,
  hhmm,
  hoy,
  operariosQuery,
  partesQuery,
  proyectosQuery,
  verificarPin,
  type Operario,
} from "@/lib/api";
import { guardarSesion, useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Partes de Taller — Control de horas de carpintería" },
      {
        name: "description",
        content:
          "Cada operario accede con su PIN y registra sus horas por cliente, proyecto y tarea.",
      },
      { property: "og:title", content: "Partes de Taller — Control de horas" },
      {
        property: "og:description",
        content: "Parte de horas por operario, cliente y proyecto para carpinterías.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { sesion, cargando, salir } = useSesion();

  if (cargando) return <AppShell title="Partes de Taller">{null}</AppShell>;
  if (!sesion) return <Acceso />;
  return <Fichar sesion={sesion} salir={salir} />;
}

/* ---------------- Acceso con PIN ---------------- */

function Acceso() {
  const operarios = useQuery(operariosQuery);
  const [elegido, setElegido] = useState<Operario | null>(null);
  const [pin, setPin] = useState("");
  const [verificando, setVerificando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) return;
    setVerificando(true);
    try {
      const ok = await verificarPin(elegido.id, pin);
      if (!ok) {
        toast.error("PIN incorrecto");
        setPin("");
        return;
      }
      guardarSesion({ id: elegido.id, nombre: elegido.nombre, area: elegido.area });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setVerificando(false);
    }
  }

  return (
    <AppShell
      title="¿Quién eres?"
      subtitle="Selecciona tu nombre e introduce tu PIN para acceder a tus partes."
    >
      {!elegido ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(operarios.data ?? [])
            .filter((o) => o.activo)
            .map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setElegido(o)}
                className="flex items-center justify-between rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-secondary"
              >
                <span className="font-display text-base font-semibold">{o.nombre}</span>
                <span className="label-caps text-muted-foreground">{o.area}</span>
              </button>
            ))}
          {(operarios.data ?? []).filter((o) => o.activo).length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-2">
              No hay operarios dados de alta. Créalos en «Clientes y proyectos».
            </p>
          ) : null}
        </div>
      ) : (
        <Card className="mx-auto max-w-sm shadow-plank">
          <CardContent className="pt-6">
            <form onSubmit={entrar} className="grid gap-4">
              <div>
                <p className="font-display text-lg font-bold">{elegido.nombre}</p>
                <p className="text-sm text-muted-foreground">{elegido.area}</p>
              </div>
              <div className="grid gap-2">
                <Label className="label-caps" htmlFor="pin">
                  PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="text-center font-display text-xl tracking-[0.5em]"
                />
              </div>
              <Button type="submit" size="lg" disabled={pin.length < 4 || verificando}>
                {verificando ? "Comprobando..." : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setElegido(null);
                  setPin("");
                }}
              >
                Cambiar de operario
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

/* ---------------- Parte de horas ---------------- */

function Fichar({
  sesion,
  salir,
}: {
  sesion: { id: string; nombre: string; area: string };
  salir: () => void;
}) {
  const qc = useQueryClient();
  const clientes = useQuery(clientesQuery);
  const proyectos = useQuery(proyectosQuery);
  const partes = useQuery(partesQuery);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("14:00");
  const [descripcion, setDescripcion] = useState("");

  const mios = useMemo(
    () => (partes.data ?? []).filter((p) => p.operario_id === sesion.id),
    [partes.data, sesion.id],
  );

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

  function limpiar() {
    setEditandoId(null);
    setDescripcion("");
    setHoraInicio("08:00");
    setHoraFin("14:00");
  }

  const crear = useMutation({
    mutationFn: crearParte,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes"] });
      limpiar();
      toast.success("Parte registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editar = useMutation({
    mutationFn: actualizarParte,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partes"] });
      limpiar();
      toast.success("Parte actualizado");
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

  // Comprobación local de solapes (el servidor también lo valida)
  function haySolape() {
    const inicio = horaInicio;
    const fin = horaFin;
    return mios.some(
      (p) =>
        p.id !== editandoId &&
        p.fecha === fecha &&
        inicio < hhmm(p.hora_fin) &&
        fin > hhmm(p.hora_inicio),
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !proyectoId) {
      toast.error("Selecciona cliente y proyecto");
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
    if (haySolape()) {
      toast.error("Ese tramo se solapa con otro parte tuyo del mismo día");
      return;
    }
    const base = {
      fecha,
      cliente_id: clienteId,
      proyecto_id: proyectoId,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      descripcion: descripcion.trim().slice(0, 500),
    };
    if (editandoId) editar.mutate({ id: editandoId, ...base });
    else crear.mutate({ ...base, operario_id: sesion.id });
  }

  function cargarParaEditar(p: (typeof mios)[number]) {
    setEditandoId(p.id);
    setFecha(p.fecha);
    setClienteId(p.cliente_id);
    setProyectoId(p.proyecto_id);
    setHoraInicio(hhmm(p.hora_inicio));
    setHoraFin(hhmm(p.hora_fin));
    setDescripcion(p.descripcion);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const delDia = mios.filter((p) => p.fecha === fecha);
  const totalDia = delDia.reduce((acc, p) => acc + p.minutos, 0);
  const guardando = crear.isPending || editar.isPending;

  return (
    <AppShell
      title={editandoId ? "Editar parte" : "Parte de horas"}
      subtitle="Introduce el tramo trabajado, el cliente, el proyecto y qué se ha hecho."
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-4 py-3">
        <p className="text-sm">
          Sesión de <span className="font-display font-semibold">{sesion.nombre}</span>{" "}
          <span className="text-muted-foreground">· {sesion.area}</span>
        </p>
        <Button variant="outline" size="sm" onClick={salir}>
          <LogOut className="mr-2 size-4" /> Salir
        </Button>
      </div>

      <Card className="border-border shadow-plank">
        <CardContent className="pt-6">
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <span className="label-caps">Operario</span>
                <div className="flex h-9 items-center rounded-md border border-border bg-secondary px-3 text-sm font-medium">
                  {sesion.nombre}
                </div>
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="lg" disabled={guardando} className="sm:flex-1">
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar parte"}
              </Button>
              {editandoId ? (
                <Button type="button" variant="outline" size="lg" onClick={limpiar}>
                  <X className="mr-2 size-4" /> Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Mis partes del {fecha}</h2>
          <span className="font-display text-sm font-semibold text-muted-foreground">
            Total: {formatoHoras(totalDia)}
          </span>
        </div>

        {delDia.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no hay partes tuyos en esta fecha.
          </p>
        ) : (
          <ul className="grid gap-2">
            {delDia.map((p) => (
              <li
                key={p.id}
                className={`flex items-start justify-between gap-4 rounded-md border bg-card p-4 ${
                  editandoId === p.id ? "border-primary" : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold">
                    {hhmm(p.hora_inicio)}–{hhmm(p.hora_fin)} · {formatoHoras(p.minutos)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {p.cliente?.codigo} / {p.proyecto?.codigo} — {p.proyecto?.nombre}
                  </p>
                  <p className="mt-1 text-sm">{p.descripcion}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar parte"
                    onClick={() => cargarParaEditar(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar parte"
                    onClick={() => eliminar.mutate(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
