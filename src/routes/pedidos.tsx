import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, ClipboardList, Package, RotateCcw, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actualizarProducto,
  cambiarEstadoPedido,
  crearPedido,
  ESTADOS_PEDIDO,
  ETIQUETA_ESTADO_PEDIDO,
  historialPedidoQuery,
  leerFotoComoBase64,
  pedidosQuery,
  productosQuery,
  useDatos,
  type EstadoPedido,
  type Pedido,
  type Producto,
} from "@/lib/api";
import { usePermisos } from "@/lib/permisos";
import { useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos de material — Partes de Taller" },
      {
        name: "description",
        content:
          "Los operarios piden material del catálogo o dan de alta productos nuevos con foto; área técnica y administración marcan lo ya pedido.",
      },
      { property: "og:title", content: "Pedidos de material — Partes de Taller" },
      {
        property: "og:description",
        content: "Peticiones de material del taller con catálogo de productos y fichas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagina,
});

const NUEVO = "__nuevo__";

function Pagina() {
  const { sesion, cargando } = useSesion();

  if (cargando) return <AppShell title="Pedidos">{null}</AppShell>;
  if (!sesion) {
    return (
      <AppShell title="Pedidos" subtitle="Accede con tu PIN para pedir material.">
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Vuelve a la pantalla de inicio e introduce tu PIN.
        </p>
      </AppShell>
    );
  }
  return <Pedidos />;
}

function Pedidos() {
  const { puedeGestionarDatos } = usePermisos();
  const productos = useDatos(productosQuery);
  const pedidos = useDatos(pedidosQuery);
  const cliente = useQueryClient();

  const [productoId, setProductoId] = useState(NUEVO);
  const [nuevo, setNuevo] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Producto | null>(null);
  const [historial, setHistorial] = useState<Pedido | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const disponibles = useMemo(
    () => (productos.data ?? []).filter((p) => p.activo),
    [productos.data],
  );

  const enviar = useMutation({
    mutationFn: crearPedido,
    onSuccess: async () => {
      toast.success("Pedido añadido a la lista");
      setProductoId(NUEVO);
      setNuevo("");
      setCantidad("1");
      setNotas("");
      setFoto(null);
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["pedidos"] }),
        cliente.invalidateQueries({ queryKey: ["productos"] }),
      ]);
      listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiar = useMutation({
    mutationFn: cambiarEstadoPedido,
    onSuccess: (_d, v) => {
      toast.success(`Estado: ${ETIQUETA_ESTADO_PEDIDO[v.estado]}`);
      cliente.invalidateQueries({ queryKey: ["pedidos"] });
      cliente.invalidateQueries({ queryKey: ["pedido_historial"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function elegirFoto(file: File | undefined) {
    if (!file) return;
    try {
      setFoto(await leerFotoComoBase64(file));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cant = Number(cantidad.replace(",", "."));
    if (!Number.isFinite(cant) || cant <= 0) {
      toast.error("Indica una cantidad válida");
      return;
    }
    if (productoId === NUEVO && !nuevo.trim()) {
      toast.error("Escribe el producto que necesitas");
      return;
    }
    enviar.mutate({
      producto_id: productoId === NUEVO ? null : productoId,
      producto_nuevo: productoId === NUEVO ? nuevo.trim() : "",
      cantidad: cant,
      notas,
      foto,
    });
  }

  const porEstado = (estado: EstadoPedido) =>
    (pedidos.data ?? []).filter((p) => p.estado === estado);

  return (
    <AppShell
      title="Pedidos de material"
      subtitle="Pide material del catálogo o da de alta un producto nuevo con foto."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardContent className="pt-6">
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label>Producto</Label>
                <Select value={productoId} onValueChange={setProductoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NUEVO}>➕ No está en la lista</SelectItem>
                    {disponibles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                        {p.referencia ? ` — ${p.referencia}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {productoId === NUEVO ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="nuevo">Producto nuevo</Label>
                  <Input
                    id="nuevo"
                    value={nuevo}
                    onChange={(e) => setNuevo(e.target.value)}
                    placeholder="Ej. Bisagra recta 35 mm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se añadirá al catálogo para que área técnica complete su ficha.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notas">Detalles</Label>
                <Textarea
                  id="notas"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Medidas, color, urgencia…"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="foto">Foto del producto (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Button asChild variant="secondary" type="button">
                    <label htmlFor="foto" className="cursor-pointer">
                      <Camera className="mr-2 size-4" /> Hacer foto
                    </label>
                  </Button>
                  {foto ? (
                    <>
                      <img
                        src={foto}
                        alt="Foto del producto a pedir"
                        className="size-14 rounded-md border border-border object-cover"
                      />
                      <Button type="button" variant="ghost" onClick={() => setFoto(null)}>
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
                <input
                  id="foto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => elegirFoto(e.target.files?.[0])}
                />
              </div>

              <Button type="submit" disabled={enviar.isPending}>
                <ClipboardList className="mr-2 size-4" /> Añadir al pedido
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Lista
            titulo="Pendientes de pedir"
            filas={pendientes}
            puedeGestionar={puedeGestionarDatos}
            onMarcar={(id, pedido) => marcar.mutate({ id, pedido })}
            productos={productos.data ?? []}
            onFicha={setFicha}
          />
          <Lista
            titulo="Ya pedidos"
            filas={hechos}
            puedeGestionar={puedeGestionarDatos}
            onMarcar={(id, pedido) => marcar.mutate({ id, pedido })}
            productos={productos.data ?? []}
            onFicha={setFicha}
          />
        </div>
      </div>

      {puedeGestionarDatos ? (
        <Catalogo productos={productos.data ?? []} onFicha={setFicha} />
      ) : null}

      {ficha ? (
        <FichaProducto
          producto={ficha}
          onCerrar={() => setFicha(null)}
          onGuardado={() => {
            setFicha(null);
            cliente.invalidateQueries({ queryKey: ["productos"] });
            cliente.invalidateQueries({ queryKey: ["pedidos"] });
          }}
        />
      ) : null}
    </AppShell>
  );
}

function Lista({
  titulo,
  filas,
  puedeGestionar,
  onMarcar,
  productos,
  onFicha,
}: {
  titulo: string;
  filas: Pedido[];
  puedeGestionar: boolean;
  onMarcar: (id: string, pedido: boolean) => void;
  productos: Producto[];
  onFicha: (p: Producto) => void;
}) {
  return (
    <section>
      <h2 className="label-caps mb-2 text-muted-foreground">
        {titulo} ({filas.length})
      </h2>
      <div className="grid gap-2">
        {filas.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nada por aquí.
          </p>
        ) : null}
        {filas.map((p) => {
          const producto = productos.find((x) => x.id === p.producto_id);
          return (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
            >
              {p.foto ? (
                <img
                  src={p.foto}
                  alt={`Foto de ${p.producto?.nombre ?? "producto"}`}
                  className="size-12 rounded-md border border-border object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <Package className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">
                  {p.cantidad} {p.producto?.unidad ?? "ud"} · {p.producto?.nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.operario?.nombre ?? ""}
                  {p.notas ? ` · ${p.notas}` : ""}
                </p>
                {producto && !producto.ficha_completa ? (
                  <p className="mt-1 text-xs text-primary">Ficha sin completar</p>
                ) : null}
              </div>
              {puedeGestionar ? (
                <div className="flex flex-col gap-1">
                  {p.estado === "pendiente" ? (
                    <Button size="sm" onClick={() => onMarcar(p.id, true)}>
                      <Check className="mr-1 size-4" /> Pedido
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onMarcar(p.id, false)}>
                      <RotateCcw className="mr-1 size-4" /> Reabrir
                    </Button>
                  )}
                  {producto ? (
                    <Button size="sm" variant="ghost" onClick={() => onFicha(producto)}>
                      Ficha
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Catalogo({
  productos,
  onFicha,
}: {
  productos: Producto[];
  onFicha: (p: Producto) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-bold tracking-tight">Catálogo de productos</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {productos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onFicha(p)}
            className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary"
          >
            {p.foto ? (
              <img
                src={p.foto}
                alt={`Foto de ${p.nombre}`}
                className="size-12 rounded-md border border-border object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Package className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-display text-sm font-semibold">{p.nombre}</span>
              <span className="block text-xs text-muted-foreground">
                {[p.referencia, p.proveedor].filter(Boolean).join(" · ") || "Sin datos de ficha"}
              </span>
            </span>
            {!p.activo ? (
              <span className="label-caps text-muted-foreground">Inactivo</span>
            ) : p.ficha_completa ? (
              <Check className="size-4 text-primary" />
            ) : null}
          </button>
        ))}
        {productos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground sm:col-span-2">
            Todavía no hay productos.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FichaProducto({
  producto,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { puedeGestionarDatos } = usePermisos();
  const [form, setForm] = useState({
    nombre: producto.nombre,
    referencia: producto.referencia,
    proveedor: producto.proveedor,
    unidad: producto.unidad,
    precio: producto.precio_estimado === null ? "" : String(producto.precio_estimado),
    descripcion: producto.descripcion,
    ficha_completa: producto.ficha_completa,
    activo: producto.activo,
  });
  const [foto, setFoto] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: actualizarProducto,
    onSuccess: () => {
      toast.success("Ficha guardada");
      onGuardado();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const precio = form.precio.trim() === "" ? null : Number(form.precio.replace(",", "."));
    if (precio !== null && !Number.isFinite(precio)) {
      toast.error("El precio no es válido");
      return;
    }
    guardar.mutate({
      id: producto.id,
      nombre: form.nombre,
      referencia: form.referencia,
      proveedor: form.proveedor,
      unidad: form.unidad,
      precio_estimado: precio,
      descripcion: form.descripcion,
      ficha_completa: form.ficha_completa,
      activo: form.activo,
      foto,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Ficha del producto</h2>
            <Button variant="ghost" size="sm" onClick={onCerrar}>
              <X className="size-4" />
            </Button>
          </div>

          {!puedeGestionarDatos ? (
            <p className="text-sm text-muted-foreground">
              Solo área técnica y administración pueden editar las fichas.
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="f-nombre">Nombre</Label>
                <Input
                  id="f-nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="f-ref">Referencia</Label>
                  <Input
                    id="f-ref"
                    value={form.referencia}
                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="f-prov">Proveedor</Label>
                  <Input
                    id="f-prov"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="f-uni">Unidad</Label>
                  <Input
                    id="f-uni"
                    value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="f-precio">Precio estimado (€)</Label>
                  <Input
                    id="f-precio"
                    inputMode="decimal"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-desc">Descripción y notas</Label>
                <Textarea
                  id="f-desc"
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button asChild variant="secondary" type="button">
                  <label htmlFor="f-foto" className="cursor-pointer">
                    <Camera className="mr-2 size-4" /> Cambiar foto
                  </label>
                </Button>
                {(foto ?? producto.foto) ? (
                  <img
                    src={foto ?? producto.foto ?? ""}
                    alt={`Foto de ${producto.nombre}`}
                    className="size-14 rounded-md border border-border object-cover"
                  />
                ) : null}
                <input
                  id="f-foto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setFoto(await leerFotoComoBase64(file));
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="f-completa">Ficha completa</Label>
                <Switch
                  id="f-completa"
                  checked={form.ficha_completa}
                  onCheckedChange={(v) => setForm({ ...form, ficha_completa: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="f-activo">Disponible para pedir</Label>
                <Switch
                  id="f-activo"
                  checked={form.activo}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })}
                />
              </div>

              <Button type="submit" disabled={guardar.isPending}>
                Guardar ficha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
