import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { usePermisos } from "@/lib/permisos";
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
  clientesQuery,
  formatoHoras,
  hhmm,
  horasDecimal,
  operariosQuery,
  partesQuery,
  proyectosQuery,
  useDatos,
} from "@/lib/api";

export const Route = createFileRoute("/informes")({
  head: () => ({
    meta: [
      { title: "Informes de horas — Partes de Taller" },
      {
        name: "description",
        content:
          "Filtra las horas por fecha, operario, cliente y proyecto, revisa totales y exporta a CSV.",
      },
      { property: "og:title", content: "Informes de horas — Partes de Taller" },
      {
        property: "og:description",
        content: "Totales por operario y proyecto con exportación CSV para oficina.",
      },
    ],
  }),
  component: Informes,
});

const TODOS = "todos";

function Informes() {
  const permisos = usePermisos();
  const partes = useDatos(partesQuery);
  const operarios = useDatos(operariosQuery);
  const clientes = useDatos(clientesQuery);
  const proyectos = useDatos(proyectosQuery);


  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [operarioId, setOperarioId] = useState(TODOS);
  const [clienteId, setClienteId] = useState(TODOS);
  const [proyectoId, setProyectoId] = useState(TODOS);

  const filtrados = useMemo(() => {
    return (partes.data ?? []).filter((p) => {
      if (p.tipo !== "trabajo") return false;
      if (desde && p.fecha < desde) return false;

      if (hasta && p.fecha > hasta) return false;
      if (operarioId !== TODOS && p.operario_id !== operarioId) return false;
      if (clienteId !== TODOS && p.cliente_id !== clienteId) return false;
      if (proyectoId !== TODOS && p.proyecto_id !== proyectoId) return false;
      return true;
    });
  }, [partes.data, desde, hasta, operarioId, clienteId, proyectoId]);

  const total = filtrados.reduce((acc, p) => acc + p.minutos, 0);

  const porOperario = agrupar(filtrados, (p) => p.operario?.nombre ?? "—");
  const porProyecto = agrupar(
    filtrados,
    (p) => `${p.cliente?.codigo ?? "—"} / ${p.proyecto?.codigo ?? "—"} ${p.proyecto?.nombre ?? ""}`,
  );

  function exportar() {
    const cabecera = [
      "Fecha",
      "Operario",
      "Area",
      "Cliente",
      "Proyecto",
      "Inicio",
      "Fin",
      "Horas",
      "Descripcion",
    ];
    const filas = filtrados.map((p) => [
      p.fecha,
      p.operario?.nombre ?? "",
      p.operario?.area ?? "",
      `${p.cliente?.codigo ?? ""} ${p.cliente?.nombre ?? ""}`,
      `${p.proyecto?.codigo ?? ""} ${p.proyecto?.nombre ?? ""}`,
      hhmm(p.hora_inicio),
      hhmm(p.hora_fin),
      horasDecimal(p.minutos),
      p.descripcion,
    ]);
    const csv = [cabecera, ...filas]
      .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "partes-horas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportarExcel(modo: "proyectos" | "operarios") {
    const XLSX = await import("xlsx");
    const libro = XLSX.utils.book_new();
    const cabecera = [
      "Fecha",
      "Operario",
      "Área",
      "Cliente",
      "Proyecto",
      "Inicio",
      "Fin",
      "Horas",
      "Descripción",
    ];
    const fila = (p: (typeof filtrados)[number]) => [
      p.fecha,
      p.operario?.nombre ?? "",
      p.operario?.area ?? "",
      `${p.cliente?.codigo ?? ""} ${p.cliente?.nombre ?? ""}`.trim(),
      `${p.proyecto?.codigo ?? ""} ${p.proyecto?.nombre ?? ""}`.trim(),
      hhmm(p.hora_inicio),
      hhmm(p.hora_fin),
      Number(horasDecimal(p.minutos)),
      p.descripcion,
    ];

    if (modo === "proyectos") {
      const grupos = new Map<string, typeof filtrados>();
      for (const p of filtrados) {
        const clave = `${p.cliente?.codigo ?? "—"} / ${p.proyecto?.codigo ?? "—"}`;
        grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
      }
      const filas: (string | number)[][] = [];
      for (const [clave, items] of [...grupos.entries()].sort()) {
        filas.push([clave]);
        filas.push(cabecera);
        for (const p of items) filas.push(fila(p));
        filas.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "Total",
          Number(horasDecimal(items.reduce((a, p) => a + p.minutos, 0))),
        ]);
        filas.push([]);
      }
      const hoja = XLSX.utils.aoa_to_sheet(filas.length ? filas : [cabecera]);
      hoja["!cols"] = cabecera.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(libro, hoja, "Por proyecto");
      XLSX.writeFile(libro, "partes-por-proyecto.xlsx");
      return;
    }

    const grupos = new Map<string, typeof filtrados>();
    for (const p of filtrados) {
      const clave = p.operario?.nombre ?? "Sin operario";
      grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
    }
    const usados = new Set<string>();
    for (const [nombre, items] of [...grupos.entries()].sort()) {
      const filas: (string | number)[][] = [cabecera, ...items.map(fila)];
      filas.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "Total",
        Number(horasDecimal(items.reduce((a, p) => a + p.minutos, 0))),
      ]);
      const hoja = XLSX.utils.aoa_to_sheet(filas);
      hoja["!cols"] = cabecera.map(() => ({ wch: 16 }));
      let titulo = nombre.replace(/[\\/?*[\]:]/g, " ").slice(0, 28) || "Operario";
      let n = 2;
      while (usados.has(titulo)) titulo = `${titulo.slice(0, 25)} ${n++}`;
      usados.add(titulo);
      XLSX.utils.book_append_sheet(libro, hoja, titulo);
    }
    if (!usados.size) {
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([cabecera]), "Sin datos");
    }
    XLSX.writeFile(libro, "partes-por-operario.xlsx");
  }

  if (permisos.cargando) return <AppShell title="Informes">{null}</AppShell>;

  if (!permisos.puedeVerInformes) {
    return (
      <AppShell title="Informes">
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No tienes permisos para ver los informes globales. Consulta tus horas en «Mi perfil» o en
          el calendario.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Informes" subtitle="Filtra, revisa totales y exporta las horas registradas.">

      <Card className="border-border shadow-plank">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="desde">
              Desde
            </Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="hasta">
              Hasta
            </Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="f-operario">
              Operario
            </Label>
            <Select value={operarioId} onValueChange={setOperarioId}>
              <SelectTrigger id="f-operario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {(operarios.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="f-cliente">
              Cliente
            </Label>
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                setProyectoId(TODOS);
              }}
            >
              <SelectTrigger id="f-cliente">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {(clientes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="label-caps" htmlFor="f-proyecto">
              Proyecto
            </Label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger id="f-proyecto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {(proyectos.data ?? [])
                  .filter((p) => clienteId === TODOS || p.cliente_id === clienteId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} — {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-3">
            <Label className="label-caps">Exportar</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={exportar} variant="secondary" disabled={!filtrados.length}>
                <Download className="mr-2 size-4" /> CSV detalle
              </Button>
              <Button
                onClick={() => exportarExcel("proyectos")}
                variant="secondary"
                disabled={!filtrados.length}
              >
                <Download className="mr-2 size-4" /> Excel por proyecto
              </Button>
              <Button
                onClick={() => exportarExcel("operarios")}
                variant="secondary"
                disabled={!filtrados.length}
              >
                <Download className="mr-2 size-4" /> Excel por operario
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Resumen etiqueta="Partes" valor={String(filtrados.length)} />
        <Resumen etiqueta="Horas totales" valor={formatoHoras(total)} />
        <Resumen etiqueta="Horas decimales" valor={horasDecimal(total)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Agrupado titulo="Por operario" datos={porOperario} />
        <Agrupado titulo="Por proyecto" datos={porProyecto} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">Detalle</h2>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps px-3 py-2">Fecha</th>
                <th className="label-caps px-3 py-2">Operario</th>
                <th className="label-caps px-3 py-2">Cliente / Proyecto</th>
                <th className="label-caps px-3 py-2">Tramo</th>
                <th className="label-caps px-3 py-2">Horas</th>
                <th className="label-caps px-3 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">{p.fecha}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.operario?.nombre}</td>
                  <td className="px-3 py-2">
                    {p.cliente?.codigo} / {p.proyecto?.codigo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {hhmm(p.hora_inicio)}–{hhmm(p.hora_fin)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatoHoras(p.minutos)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.descripcion}</td>
                </tr>
              ))}
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No hay partes con estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function agrupar<T extends { minutos: number }>(items: T[], clave: (i: T) => string) {
  const mapa = new Map<string, number>();
  for (const i of items) mapa.set(clave(i), (mapa.get(clave(i)) ?? 0) + i.minutos);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="label-caps">{etiqueta}</p>
      <p className="mt-1 font-display text-2xl font-bold">{valor}</p>
    </div>
  );
}

function Agrupado({ titulo, datos }: { titulo: string; datos: [string, number][] }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-base font-bold">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="grid gap-2">
          {datos.map(([nombre, minutos]) => (
            <li key={nombre} className="flex justify-between gap-4 text-sm">
              <span className="truncate">{nombre}</span>
              <span className="font-display font-semibold">{formatoHoras(minutos)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
