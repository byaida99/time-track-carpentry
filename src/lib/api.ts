import { supabase } from "@/integrations/supabase/client";

export type Operario = {
  id: string;
  nombre: string;
  area: string;
  activo: boolean;
  jornada_minutos: number;
  hora_entrada: string;
  desayuno_minutos: number;
  comida_minutos: number;
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

export type TipoParte = "trabajo" | "desayuno" | "comida";

export type Parte = {
  id: string;
  fecha: string;
  operario_id: string;
  cliente_id: string | null;
  proyecto_id: string | null;
  hora_inicio: string;
  hora_fin: string;
  minutos: number;
  descripcion: string;
  tipo: string;
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
      await supabase
        .from("operarios")
        .select(
          "id, nombre, area, activo, jornada_minutos, hora_entrada, desayuno_minutos, comida_minutos",
        )
        .order("nombre") as never,
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
  cliente_id: string | null;
  proyecto_id: string | null;
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
  tipo: TipoParte;
}) {
  const { error } = await supabase.from("partes").insert(input);
  if (error) throw new Error(error.message);
}

export async function actualizarParte(input: {
  id: string;
  fecha: string;
  cliente_id: string | null;
  proyecto_id: string | null;
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
  tipo: TipoParte;
}) {
  const { id, ...cambios } = input;
  const { error } = await supabase.from("partes").update(cambios).eq("id", id);
  if (error) throw new Error(error.message);
}


export async function borrarParte(id: string) {
  const { error } = await supabase.from("partes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function verificarPin(operarioId: string, pin: string) {
  const { data, error } = await supabase.rpc("verificar_pin", {
    _operario_id: operarioId,
    _pin: pin,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function establecerPin(operarioId: string, pin: string) {
  const { error } = await supabase.rpc("establecer_pin", {
    _operario_id: operarioId,
    _pin: pin,
  });
  if (error) throw new Error(error.message);
}

export async function tienePin(operarioId: string) {
  const { data, error } = await supabase.rpc("operario_tiene_pin", {
    _operario_id: operarioId,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function crearOperario(input: {
  nombre: string;
  area: string;
  pin: string;
  jornada_minutos?: number;
  hora_entrada?: string;
}) {
  const { data, error } = await supabase
    .from("operarios")
    .insert({
      nombre: input.nombre,
      area: input.area,
      ...(input.jornada_minutos ? { jornada_minutos: input.jornada_minutos } : {}),
      ...(input.hora_entrada ? { hora_entrada: input.hora_entrada } : {}),
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await establecerPin(data.id, input.pin);
}

export async function actualizarOperario(input: {
  id: string;
  jornada_minutos: number;
  hora_entrada: string;
  desayuno_minutos: number;
  comida_minutos: number;
}) {
  const { id, ...cambios } = input;
  const { error } = await supabase
    .from("operarios")
    .update(cambios as never)
    .eq("id", id);
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

export function aMinutos(hora: string) {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function aHora(minutos: number) {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutos)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const ETIQUETA_TIPO: Record<string, string> = {
  trabajo: "Trabajo",
  desayuno: "Desayuno",
  comida: "Comida",
};

/* ---------------- Roles ---------------- */

export type Rol = "operario" | "area_tecnica" | "administracion";

export const ETIQUETA_ROL: Record<Rol, string> = {
  operario: "Operario",
  area_tecnica: "Área técnica",
  administracion: "Administración",
};

export type OperarioRol = { id: string; operario_id: string; role: Rol };

export const rolesQuery = {
  queryKey: ["operario_roles"],
  queryFn: async () =>
    unwrap<OperarioRol[]>(
      await supabase.from("operario_roles").select("id, operario_id, role") as never,
    ),
};

export async function asignarRol(input: { operario_id: string; role: Rol }) {
  const { error } = await supabase.from("operario_roles").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function quitarRol(input: { operario_id: string; role: Rol }) {
  const { error } = await supabase
    .from("operario_roles")
    .delete()
    .eq("operario_id", input.operario_id)
    .eq("role", input.role);
  if (error) throw new Error(error.message);
}

/* ---------------- Calendario laboral ---------------- */

export type TipoDia = "festivo" | "vacaciones";

export type DiaCalendario = {
  id: string;
  fecha: string;
  tipo: TipoDia;
  operario_id: string | null;
  descripcion: string;
};

export const ETIQUETA_DIA: Record<TipoDia, string> = {
  festivo: "Festivo",
  vacaciones: "Vacaciones",
};

export const calendarioQuery = {
  queryKey: ["calendario"],
  queryFn: async () =>
    unwrap<DiaCalendario[]>(
      await supabase
        .from("calendario")
        .select("id, fecha, tipo, operario_id, descripcion")
        .order("fecha") as never,
    ),
};

export async function crearDias(input: {
  desde: string;
  hasta: string;
  tipo: TipoDia;
  operario_id: string | null;
  descripcion: string;
}) {
  const filas: Omit<DiaCalendario, "id">[] = [];
  const fin = new Date(`${input.hasta}T00:00:00`);
  for (const d = new Date(`${input.desde}T00:00:00`); d <= fin; d.setDate(d.getDate() + 1)) {
    filas.push({
      fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      tipo: input.tipo,
      operario_id: input.operario_id,
      descripcion: input.descripcion,
    });
  }
  if (filas.length === 0) throw new Error("El rango de fechas no es válido");
  if (filas.length > 400) throw new Error("El rango es demasiado largo");
  const { error } = await supabase.from("calendario").insert(filas as never);
  if (error) throw new Error(error.message);
}

export async function borrarDia(id: string) {
  const { error } = await supabase.from("calendario").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
