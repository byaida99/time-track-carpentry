// Server-only session handling for the PIN based operario login.
// The browser never talks to the database directly: it holds a signed token
// that is verified here on every server function call.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Rol = "operario" | "area_tecnica" | "administracion";

export type Actor = {
  id: string;
  roles: Rol[];
  esAdmin: boolean;
  puedeGestionarDatos: boolean;
};

const DURACION_MS = 1000 * 60 * 60 * 12; // 12 h
const codificador = new TextEncoder();

function aBase64Url(bytes: Uint8Array) {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function desdeBase64Url(valor: string) {
  const normal = valor.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = normal + "=".repeat((4 - (normal.length % 4)) % 4);
  const binario = atob(relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function firmar(datos: string) {
  const secreto = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!secreto) throw new Error("Configuración del servidor incompleta");
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, codificador.encode(datos));
  return aBase64Url(new Uint8Array(firma));
}

export async function crearToken(operarioId: string) {
  const cuerpo = aBase64Url(
    codificador.encode(JSON.stringify({ sub: operarioId, exp: Date.now() + DURACION_MS })),
  );
  return `${cuerpo}.${await firmar(cuerpo)}`;
}

async function operarioDesdeToken(token: string | null | undefined) {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  if ((await firmar(cuerpo)) !== firma) return null;
  try {
    const datos = JSON.parse(new TextDecoder().decode(desdeBase64Url(cuerpo))) as {
      sub?: string;
      exp?: number;
    };
    if (!datos.sub || !datos.exp || datos.exp < Date.now()) return null;
    return datos.sub;
  } catch {
    return null;
  }
}

export async function actorOpcional(token: string | null | undefined): Promise<Actor | null> {
  const id = await operarioDesdeToken(token);
  if (!id) return null;

  const { data: operario } = await supabaseAdmin
    .from("operarios")
    .select("id, activo")
    .eq("id", id)
    .maybeSingle();
  if (!operario || !operario.activo) return null;

  const { data: filas } = await supabaseAdmin
    .from("operario_roles")
    .select("role")
    .eq("operario_id", id);

  const roles = ((filas ?? []).map((f) => f.role) as Rol[]);
  const esAdmin = roles.includes("administracion");
  return {
    id,
    roles: roles.length > 0 ? roles : ["operario"],
    esAdmin,
    puedeGestionarDatos: esAdmin || roles.includes("area_tecnica"),
  };
}

export async function requiereActor(token: string | null | undefined): Promise<Actor> {
  const actor = await actorOpcional(token);
  if (!actor) throw new Error("Sesión no válida. Vuelve a introducir tu PIN.");
  return actor;
}

export function requiereAdmin(actor: Actor) {
  if (!actor.esAdmin) throw new Error("No tienes permisos para esta acción");
  return actor;
}

export function requiereGestionDatos(actor: Actor) {
  if (!actor.puedeGestionarDatos) throw new Error("No tienes permisos para esta acción");
  return actor;
}
