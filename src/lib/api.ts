import { supabase } from "@/integrations/supabase/client";

export type Operario = {
  id: string;
  nombre: string;
  area: string;
  activo: boolean;
};

export type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
};

export type Proyecto = {
  id: string;
  cliente_id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export type Parte = {
  id: string;
  fecha: string;
  operario_id: string;
  cliente_id: string;
  proyecto_id: string;
  hora_inicio: string;
  hora_fin: string;
  minutos: number;
  descripcion: string;
  created_at: string;
};

export type ParteCompleto = Parte & {
  operario: { nombre: string; area: string } | null;
  cliente: { codigo: string; nombre: string } | null;
  proyecto: { codigo: string; nombre: string } | null;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const operariosQuery = {
  queryKey: ["operarios"],
  queryFn: async () =>
    unwrap<Operario[]>(
      await supabase.from("operarios").select("id, nombre, area, activo").order("nombre"),
    ),
};

export const clientesQuery = {
  queryKey: ["clientes"],
  queryFn: async () =>
    unwrap<Cliente[]>(
      await supabase.from("clientes").select("id, codigo, nombre").order("codigo"),
    ),
};

export const proyectosQuery = {
  queryKey: ["proyectos"],
  queryFn: async () =>
    unwrap<Proyecto[]>(
      await supabase
        .from("proyectos")
        .select("id, cliente_id, codigo, nombre, activo")
        .order("codigo"),
    ),
};

export const partesQuery = {
  queryKey: ["partes"],
  queryFn: async () =>
    unwrap<ParteCompleto[]>(
      await supabase
        .from("partes")
        .select(
          "*, operario:operarios(nombre, area), cliente:clientes(codigo, nombre), proyecto:proyectos(codigo, nombre)",
        )
        .order("fecha", { ascending: false })
        .order("hora_inicio", { ascending: false })
        .limit(500),
    ),
};

export async function crearParte(input: {
  fecha: string;
  operario_id: string;
  cliente_id: string;
  proyecto_id: string;
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
}) {
  const { error } = await supabase.from("partes").insert(input);
  if (error) throw new Error(error.message);
}

export async function borrarParte(id: string) {
  const { error } = await supabase.from("partes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crearOperario(input: { nombre: string; area: string }) {
  const { error } = await supabase.from("operarios").insert(input);
  if (error) throw new Error(error.message);
}

export async function borrarOperario(id: string) {
  const { error } = await supabase.from("operarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crearCliente(input: { codigo: string; nombre: string }) {
  const { error } = await supabase.from("clientes").insert(input);
  if (error) throw new Error(error.message);
}

export async function borrarCliente(id: string) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function crearProyecto(input: {
  cliente_id: string;
  codigo: string;
  nombre: string;
}) {
  const { error } = await supabase.from("proyectos").insert(input);
  if (error) throw new Error(error.message);
}

export async function borrarProyecto(id: string) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function formatoHoras(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function horasDecimal(minutos: number) {
  return (minutos / 60).toFixed(2);
}

export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hhmm(valor: string) {
  return valor.slice(0, 5);
}
