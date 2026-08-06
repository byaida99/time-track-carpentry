import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actualizarOperario,
  asignarRol,
  cambiarEstadoCliente,
  formatoHoras,

  cambiarEstadoOperario,
  cambiarEstadoProyecto,
  clientesQuery,
  crearCliente,
  crearOperario,
  crearProyecto,
  establecerPin,
  ETIQUETA_ROL,
  quitarRol,
  rolesQuery,
  operariosQuery,
  proyectosQuery,
  type Rol,
  useDatos,
} from "@/lib/api";
import { usePermisos } from "@/lib/permisos";


export const Route = createFileRoute("/datos")({
  head: () => ({
    meta: [
      { title: "Clientes, proyectos y operarios — Partes de Taller" },
      {
        name: "description",
        content:
          "Da de alta operarios de taller y oficina, códigos de cliente y códigos de proyecto de la carpintería.",
      },
      { property: "og:title", content: "Clientes, proyectos y operarios" },
      {
        property: "og:description",
        content: "Mantenimiento de los listados que usan los partes de horas.",
      },
    ],
  }),
  component: Datos,
});

function Datos() {
  const { esAdmin, puedeGestionarDatos, cargando } = usePermisos();

  if (cargando) return <AppShell title="Clientes y proyectos">{null}</AppShell>;

  if (!puedeGestionarDatos) {
    return (
      <AppShell title="Clientes y proyectos">
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No tienes permisos para esta sección. Solo el área técnica y administración pueden
          gestionar clientes, proyectos y operarios.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Clientes y proyectos"
      subtitle="Mantén al día los listados que los operarios seleccionan al fichar."
    >
      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          {esAdmin ? <TabsTrigger value="operarios">Operarios y permisos</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="clientes" className="mt-6">
          <Clientes />
        </TabsContent>
        <TabsContent value="proyectos" className="mt-6">
          <Proyectos />
        </TabsContent>
        {esAdmin ? (
          <TabsContent value="operarios" className="mt-6">
            <Operarios />
          </TabsContent>
        ) : null}
      </Tabs>
    </AppShell>
  );
}


function useCrud(key: string) {
  const qc = useQueryClient();
  return (fn: (v: never) => Promise<void>, mensaje: string) => ({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      qc.invalidateQueries({ queryKey: ["partes"] });
      toast.success(mensaje);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function Clientes() {
  const clientes = useDatos(clientesQuery);
  const opts = useCrud("clientes");
  const crear = useMutation(opts(crearCliente as never, "Cliente guardado"));
  const estado = useMutation(opts(cambiarEstadoCliente as never, "Cliente actualizado"));
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  return (
    <Card className="shadow-plank">
      <CardContent className="pt-6">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!codigo.trim() || !nombre.trim()) return toast.error("Completa código y nombre");
            crear.mutate(
              { codigo: codigo.trim().slice(0, 30), nombre: nombre.trim().slice(0, 120) } as never,
              { onSuccess: () => (setCodigo(""), setNombre("")) },
            );
          }}
        >
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="cod-cli">
              Código
            </Label>
            <Input
              id="cod-cli"
              maxLength={30}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="CL-004"
            />
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="nom-cli">
              Nombre
            </Label>
            <Input
              id="nom-cli"
              maxLength={120}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Carpintería del Sur"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Añadir</Button>
          </div>
        </form>

        <Lista
          items={(clientes.data ?? []).map((c) => ({
            id: c.id,
            titulo: `${c.codigo} — ${c.nombre}`,
            activo: c.activo,
          }))}
          onCambiarEstado={(id, activo) => estado.mutate({ id, activo } as never)}
        />
      </CardContent>
    </Card>
  );
}

function Proyectos() {
  const clientes = useDatos(clientesQuery);
  const proyectos = useDatos(proyectosQuery);
  const opts = useCrud("proyectos");
  const crear = useMutation(opts(crearProyecto as never, "Proyecto guardado"));
  const estado = useMutation(opts(cambiarEstadoProyecto as never, "Proyecto actualizado"));
  const [clienteId, setClienteId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");

  return (
    <Card className="shadow-plank">
      <CardContent className="pt-6">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clienteId || !codigo.trim() || !nombre.trim())
              return toast.error("Completa cliente, código y nombre");
            crear.mutate(
              {
                cliente_id: clienteId,
                codigo: codigo.trim().slice(0, 30),
                nombre: nombre.trim().slice(0, 120),
              } as never,
              { onSuccess: () => (setCodigo(""), setNombre("")) },
            );
          }}
        >
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="cli-pro">
              Cliente
            </Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="cli-pro">
                <SelectValue placeholder="Selecciona cliente" />
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
            <Label className="label-caps" htmlFor="cod-pro">
              Código de proyecto
            </Label>
            <Input
              id="cod-pro"
              maxLength={30}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="PR-401"
            />
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="nom-pro">
              Nombre
            </Label>
            <Input
              id="nom-pro"
              maxLength={120}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Cocina a medida"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Añadir</Button>
          </div>
        </form>

        <Lista
          items={(proyectos.data ?? []).map((p) => {
            const cli = (clientes.data ?? []).find((c) => c.id === p.cliente_id);
            return {
              id: p.id,
              titulo: `${p.codigo} — ${p.nombre}`,
              detalle: cli ? `${cli.codigo} · ${cli.nombre}` : undefined,
              activo: p.activo,
            };
          })}
          onCambiarEstado={(id, activo) => estado.mutate({ id, activo } as never)}
        />
      </CardContent>
    </Card>
  );
}

function Operarios() {
  const operarios = useDatos(operariosQuery);
  const roles = useDatos(rolesQuery);
  const opts = useCrud("operarios");
  const optsRoles = useCrud("operario_roles");
  const crear = useMutation(opts(crearOperario as never, "Operario guardado"));
  const estado = useMutation(opts(cambiarEstadoOperario as never, "Operario actualizado"));
  const guardarJornada = useMutation(opts(actualizarOperario as never, "Jornada actualizada"));
  const dar = useMutation(optsRoles(asignarRol as never, "Permiso concedido"));
  const quitar = useMutation(optsRoles(quitarRol as never, "Permiso retirado"));

  const TODOS_ROLES: Rol[] = ["operario", "area_tecnica", "administracion"];
  function tieneRol(operarioId: string, rol: Rol) {
    return (roles.data ?? []).some((r) => r.operario_id === operarioId && r.role === rol);
  }

  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("taller");
  const [pin, setPin] = useState("");
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [nuevoPin, setNuevoPin] = useState("");
  const [jornadaDe, setJornadaDe] = useState<string | null>(null);
  const [form, setForm] = useState({
    horas: "8",
    entrada: "07:00",
    desayuno: "30",
    comida: "60",
  });

  function abrirJornada(o: {
    id: string;
    jornada_minutos: number;
    hora_entrada: string;
    desayuno_minutos: number;
    comida_minutos: number;
  }) {
    if (jornadaDe === o.id) return setJornadaDe(null);
    setJornadaDe(o.id);
    setForm({
      horas: String((o.jornada_minutos ?? 480) / 60),
      entrada: (o.hora_entrada ?? "07:00").slice(0, 5),
      desayuno: String(o.desayuno_minutos ?? 30),
      comida: String(o.comida_minutos ?? 60),
    });
  }

  function enviarJornada(id: string) {
    const horas = Number(form.horas.replace(",", "."));
    const desayuno = Number(form.desayuno);
    const comida = Number(form.comida);
    if (!Number.isFinite(horas) || horas <= 0 || horas > 24)
      return toast.error("La jornada debe estar entre 0 y 24 horas");
    if (!/^\d{2}:\d{2}$/.test(form.entrada)) return toast.error("Hora de entrada no válida");
    if (!Number.isFinite(desayuno) || desayuno < 0 || desayuno > 240)
      return toast.error("Desayuno entre 0 y 240 minutos");
    if (!Number.isFinite(comida) || comida < 0 || comida > 240)
      return toast.error("Comida entre 0 y 240 minutos");
    guardarJornada.mutate(
      {
        id,
        jornada_minutos: Math.round(horas * 60),
        hora_entrada: form.entrada,
        desayuno_minutos: Math.round(desayuno),
        comida_minutos: Math.round(comida),
      } as never,
      { onSuccess: () => setJornadaDe(null) },
    );
  }

  async function guardarNuevoPin(id: string) {
    if (nuevoPin.length < 4) return toast.error("El PIN debe tener al menos 4 dígitos");
    try {
      await establecerPin(id, nuevoPin);
      setCambiando(null);
      setNuevoPin("");
      toast.success("PIN actualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="shadow-plank">
      <CardContent className="pt-6">
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nombre.trim()) return toast.error("Escribe el nombre del operario");
            if (pin.length < 4) return toast.error("Asigna un PIN de 4 a 8 dígitos");
            crear.mutate(
              {
                nombre: nombre.trim().slice(0, 120),
                area,
                pin,
                hora_entrada: area === "oficina" ? "08:00" : "07:00",
              } as never,
              {
                onSuccess: () => (setNombre(""), setPin("")),
              },
            );
          }}
        >
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="nom-op">
              Nombre
            </Label>
            <Input
              id="nom-op"
              maxLength={120}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Pedro Gil"
            />
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="area-op">
              Área
            </Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger id="area-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="taller">Taller (entra a las 7:00)</SelectItem>
                <SelectItem value="oficina">Oficina (entra a las 8:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="pin-op">
              PIN
            </Label>
            <Input
              id="pin-op"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4 a 8 dígitos"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Añadir</Button>
          </div>
        </form>

        <ul className="mt-6 grid gap-2">
          {(operarios.data ?? []).map((o) => (
            <li key={o.id} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {o.nombre}
                    {o.activo ? null : (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        De baja
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.area} · entrada {(o.hora_entrada ?? "07:00").slice(0, 5)} ·{" "}
                    {formatoHoras(o.jornada_minutos ?? 480)}/día · desayuno{" "}
                    {o.desayuno_minutos ?? 30} min · comida {o.comida_minutos ?? 60} min
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => abrirJornada(o)}>
                    Jornada
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCambiando(cambiando === o.id ? null : o.id);
                      setNuevoPin("");
                    }}
                  >
                    Cambiar PIN
                  </Button>
                  <Button
                    variant={o.activo ? "outline" : "default"}
                    size="sm"
                    disabled={estado.isPending}
                    onClick={() => estado.mutate({ id: o.id, activo: !o.activo } as never)}
                  >
                    {o.activo ? "Dar de baja" : "Reactivar"}
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="label-caps text-muted-foreground">Permisos</span>
                {TODOS_ROLES.map((rol) => {
                  const activo = tieneRol(o.id, rol);
                  return (
                    <Button
                      key={rol}
                      type="button"
                      size="sm"
                      variant={activo ? "default" : "outline"}
                      disabled={dar.isPending || quitar.isPending}
                      onClick={() =>
                        activo
                          ? quitar.mutate({ operario_id: o.id, role: rol } as never)
                          : dar.mutate({ operario_id: o.id, role: rol } as never)
                      }
                    >
                      {ETIQUETA_ROL[rol]}
                    </Button>
                  );
                })}
              </div>

              {jornadaDe === o.id ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <div className="grid gap-1">
                    <Label className="label-caps">Horas/día</Label>
                    <Input
                      inputMode="decimal"
                      value={form.horas}
                      onChange={(e) => setForm({ ...form, horas: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="label-caps">Entrada</Label>
                    <Input
                      type="time"
                      value={form.entrada}
                      onChange={(e) => setForm({ ...form, entrada: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="label-caps">Desayuno (min)</Label>
                    <Input
                      inputMode="numeric"
                      value={form.desayuno}
                      onChange={(e) => setForm({ ...form, desayuno: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="label-caps">Comida (min)</Label>
                    <Input
                      inputMode="numeric"
                      value={form.comida}
                      onChange={(e) => setForm({ ...form, comida: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => enviarJornada(o.id)} disabled={guardarJornada.isPending}>
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : null}
              {cambiando === o.id ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    value={nuevoPin}
                    onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Nuevo PIN"
                  />
                  <Button onClick={() => guardarNuevoPin(o.id)}>Guardar</Button>
                </div>
              ) : null}
            </li>
          ))}
          {(operarios.data ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Todavía no hay operarios.
            </p>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}



function Lista({
  items,
  onCambiarEstado,
}: {
  items: { id: string; titulo: string; detalle?: string; activo: boolean }[];
  onCambiarEstado: (id: string, activo: boolean) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Todavía no hay registros.
      </p>
    );
  }
  return (
    <ul className="mt-6 grid gap-2">
      {items.map((i) => (
        <li
          key={i.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">
              {i.titulo}
              {i.activo ? null : (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  Deshabilitado
                </span>
              )}
            </p>
            {i.detalle ? <p className="text-xs text-muted-foreground">{i.detalle}</p> : null}
          </div>
          <Button
            variant={i.activo ? "outline" : "default"}
            size="sm"
            onClick={() => onCambiarEstado(i.id, !i.activo)}
          >
            {i.activo ? "Deshabilitar" : "Reactivar"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
