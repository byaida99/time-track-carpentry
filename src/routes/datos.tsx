import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  borrarCliente,
  borrarOperario,
  borrarProyecto,
  clientesQuery,
  crearCliente,
  crearOperario,
  crearProyecto,
  operariosQuery,
  proyectosQuery,
} from "@/lib/api";

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
  return (
    <AppShell
      title="Clientes y proyectos"
      subtitle="Mantén al día los listados que los operarios seleccionan al fichar."
    >
      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          <TabsTrigger value="operarios">Operarios</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes" className="mt-6">
          <Clientes />
        </TabsContent>
        <TabsContent value="proyectos" className="mt-6">
          <Proyectos />
        </TabsContent>
        <TabsContent value="operarios" className="mt-6">
          <Operarios />
        </TabsContent>
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
  const clientes = useQuery(clientesQuery);
  const opts = useCrud("clientes");
  const crear = useMutation(opts(crearCliente as never, "Cliente guardado"));
  const borrar = useMutation(opts(borrarCliente as never, "Cliente eliminado"));
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
          }))}
          onBorrar={(id) => borrar.mutate(id as never)}
        />
      </CardContent>
    </Card>
  );
}

function Proyectos() {
  const clientes = useQuery(clientesQuery);
  const proyectos = useQuery(proyectosQuery);
  const opts = useCrud("proyectos");
  const crear = useMutation(opts(crearProyecto as never, "Proyecto guardado"));
  const borrar = useMutation(opts(borrarProyecto as never, "Proyecto eliminado"));
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
            };
          })}
          onBorrar={(id) => borrar.mutate(id as never)}
        />
      </CardContent>
    </Card>
  );
}

function Operarios() {
  const operarios = useQuery(operariosQuery);
  const opts = useCrud("operarios");
  const crear = useMutation(opts(crearOperario as never, "Operario guardado"));
  const borrar = useMutation(opts(borrarOperario as never, "Operario eliminado"));
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("taller");
  const [pin, setPin] = useState("");
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [nuevoPin, setNuevoPin] = useState("");

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
            crear.mutate({ nombre: nombre.trim().slice(0, 120), area, pin } as never, {
              onSuccess: () => (setNombre(""), setPin("")),
            });
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
                <SelectItem value="taller">Taller</SelectItem>
                <SelectItem value="oficina">Oficina</SelectItem>
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
                  <p className="text-sm font-medium">{o.nombre}</p>
                  <p className="text-xs text-muted-foreground">{o.area}</p>
                </div>
                <div className="flex items-center gap-1">
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
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar"
                    onClick={() => borrar.mutate(o.id as never)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
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
  onBorrar,
}: {
  items: { id: string; titulo: string; detalle?: string }[];
  onBorrar: (id: string) => void;
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
            <p className="text-sm font-medium">{i.titulo}</p>
            {i.detalle ? <p className="text-xs text-muted-foreground">{i.detalle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => onBorrar(i.id)}>
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
