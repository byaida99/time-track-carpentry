import {
  fnActualizarOperario,
  fnActualizarProducto,
  fnActualizarParte,
  fnAsignarRol,
  fnBorrarDia,
  fnBorrarParte,
  fnCrearCliente,
  fnCrearDias,
  fnCrearOperario,
  fnCrearParte,
  fnCrearPedido,
  fnCrearProyecto,
  fnEstablecerPin,
  fnEstadoCliente,
  fnEstadoOperario,
  fnEstadoProyecto,
  fnListarCalendario,
  fnListarClientes,
  fnListarOperarios,
  fnListarPartes,
  fnListarPedidos,
  fnListarProductos,
  fnListarProyectos,
  fnListarRoles,
  fnLogin,
  fnEstadoPedido,
  fnHistorialPedido,
  fnQuitarRol,
  fnTienePin,
} from "@/lib/api.functions";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { guardarSesion } from "@/lib/sesion";

import { guardarToken, leerToken, useToken } from "@/lib/token";


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
  activo: boolean;
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

function token() {
  return leerToken();
}

/**
 * Consulta protegida: solo se lanza cuando el navegador ya tiene un token de
 * sesión. Así se evita el error «Sesión no válida» durante el SSR o antes de
 * introducir el PIN.
 */
export function useDatos<T>(q: { queryKey: unknown[]; queryFn: () => Promise<T> }) {
  const t = useToken();
  const res = useQuery({
    ...q,
    queryKey: [...q.queryKey, Boolean(t)],
    enabled: Boolean(t),
    retry: false,
    throwOnError: false,
  });

  useEffect(() => {
    const msg = res.error instanceof Error ? res.error.message : "";
    if (msg.includes("Sesión no válida")) guardarSesion(null);
  }, [res.error]);

  return res;
}


export const operariosQuery = {
  queryKey: ["operarios"],
  queryFn: async () =>
    (await fnListarOperarios({ data: { token: token() } })) as Operario[],
};

export const clientesQuery = {
  queryKey: ["clientes"],
  queryFn: async () => (await fnListarClientes({ data: { token: token() } })) as Cliente[],
};

export const proyectosQuery = {
  queryKey: ["proyectos"],
  queryFn: async () => (await fnListarProyectos({ data: { token: token() } })) as Proyecto[],
};

export const partesQuery = {
  queryKey: ["partes"],
  queryFn: async () =>
    (await fnListarPartes({ data: { token: token() } })) as unknown as ParteCompleto[],
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
  await fnCrearParte({ data: { ...input, token: token() } });
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
  await fnActualizarParte({ data: { ...input, token: token() } });
}

export async function borrarParte(id: string) {
  await fnBorrarParte({ data: { id, token: token() } });
}

export async function verificarPin(operarioId: string, pin: string) {
  const res = await fnLogin({ data: { operario_id: operarioId, pin } });
  if (!res.ok) {
    guardarToken(null);
    return false;
  }
  guardarToken(res.token);
  return true;
}

export async function establecerPin(operarioId: string, pin: string) {
  await fnEstablecerPin({ data: { operario_id: operarioId, pin, token: token() } });
}

export async function tienePin(operarioId: string) {
  return (await fnTienePin({ data: { operario_id: operarioId, token: token() } })) === true;
}

export async function crearOperario(input: {
  nombre: string;
  area: string;
  pin: string;
  jornada_minutos?: number;
  hora_entrada?: string;
}) {
  await fnCrearOperario({ data: { ...input, token: token() } });
}

export async function actualizarOperario(input: {
  id: string;
  jornada_minutos: number;
  hora_entrada: string;
  desayuno_minutos: number;
  comida_minutos: number;
}) {
  await fnActualizarOperario({ data: { ...input, token: token() } });
}

export async function cambiarEstadoOperario(input: { id: string; activo: boolean }) {
  await fnEstadoOperario({ data: { ...input, token: token() } });
}

export async function crearCliente(input: { codigo: string; nombre: string }) {
  await fnCrearCliente({ data: { ...input, token: token() } });
}

export async function cambiarEstadoCliente(input: { id: string; activo: boolean }) {
  await fnEstadoCliente({ data: { ...input, token: token() } });
}

export async function crearProyecto(input: {
  cliente_id: string;
  codigo: string;
  nombre: string;
}) {
  await fnCrearProyecto({ data: { ...input, token: token() } });
}

export async function cambiarEstadoProyecto(input: { id: string; activo: boolean }) {
  await fnEstadoProyecto({ data: { ...input, token: token() } });
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
  queryFn: async () => (await fnListarRoles({ data: { token: token() } })) as OperarioRol[],
};

export async function asignarRol(input: { operario_id: string; role: Rol }) {
  await fnAsignarRol({ data: { ...input, token: token() } });
}

export async function quitarRol(input: { operario_id: string; role: Rol }) {
  await fnQuitarRol({ data: { ...input, token: token() } });
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
    (await fnListarCalendario({ data: { token: token() } })) as DiaCalendario[],
};

export async function crearDias(input: {
  desde: string;
  hasta: string;
  tipo: TipoDia;
  operario_id: string | null;
  descripcion: string;
}) {
  await fnCrearDias({ data: { ...input, token: token() } });
}

export async function borrarDia(id: string) {
  await fnBorrarDia({ data: { id, token: token() } });
}

/* ---------------- Productos y pedidos ---------------- */

export type Producto = {
  id: string;
  nombre: string;
  referencia: string;
  proveedor: string;
  unidad: string;
  precio_estimado: number | null;
  descripcion: string;
  ficha_completa: boolean;
  activo: boolean;
  created_at: string;
  foto: string | null;
};

export type EstadoPedido = "pendiente" | "confirmado" | "entregado" | "cancelado";

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "entregado",
  "cancelado",
];

export const ETIQUETA_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Pedido confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export type Pedido = {
  id: string;
  producto_id: string;
  operario_id: string;
  cantidad: number;
  notas: string;
  estado: string;
  estado_at: string | null;
  pedido_at: string | null;
  created_at: string;
  foto: string | null;
  producto: {
    nombre: string;
    referencia: string;
    proveedor: string;
    unidad: string;
    ficha_completa: boolean;
  } | null;
  operario: { nombre: string; area: string } | null;
};

export type HistorialPedido = {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  nota: string;
  created_at: string;
  operario: { nombre: string } | null;
};

export const productosQuery = {
  queryKey: ["productos"],
  queryFn: async () =>
    (await fnListarProductos({ data: { token: token() } })) as unknown as Producto[],
};

export const pedidosQuery = {
  queryKey: ["pedidos"],
  queryFn: async () =>
    (await fnListarPedidos({ data: { token: token() } })) as unknown as Pedido[],
};

export function historialPedidoQuery(pedidoId: string) {
  return {
    queryKey: ["pedido_historial", pedidoId],
    queryFn: async () =>
      (await fnHistorialPedido({
        data: { pedido_id: pedidoId, token: token() },
      })) as unknown as HistorialPedido[],
  };
}

export async function crearPedido(input: {
  producto_id: string | null;
  producto_nuevo: string;
  cantidad: number;
  notas: string;
  foto: string | null;
}) {
  await fnCrearPedido({ data: { ...input, token: token() } });
}

export async function cambiarEstadoPedido(input: {
  id: string;
  estado: EstadoPedido;
  nota: string;
}) {
  await fnEstadoPedido({ data: { ...input, token: token() } });
}

export async function actualizarProducto(input: {
  id: string;
  nombre: string;
  referencia: string;
  proveedor: string;
  unidad: string;
  precio_estimado: number | null;
  descripcion: string;
  ficha_completa: boolean;
  activo: boolean;
  foto: string | null;
}) {
  await fnActualizarProducto({ data: { ...input, token: token() } });
}

export async function leerFotoComoBase64(file: File) {
  if (file.size > 4_000_000) throw new Error("La foto es demasiado grande (máx. 4 MB)");
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se ha podido leer la foto"));
    lector.readAsDataURL(file);
  });
}
