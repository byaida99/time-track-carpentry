// Server-only data access. Every function enforces authentication (signed PIN
// session token) and role based authorization before touching the database.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  actorOpcional,
  crearToken,
  requiereActor,
  requiereAdmin,
  requiereGestionDatos,
  type Rol,
} from "@/lib/auth.server";

const CAMPOS_OPERARIO =
  "id, nombre, area, activo, protegido, jornada_minutos, hora_entrada, desayuno_minutos, comida_minutos";

// El perfil de administración protegido no se puede desactivar ni perder permisos.
async function esProtegido(operarioId: string) {
  const { data } = await supabaseAdmin
    .from("operarios")
    .select("protegido")
    .eq("id", operarioId)
    .single();
  return data?.protegido === true;
}

function comprobar<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown as T)) as T;
}

/* ---------------- Acceso ---------------- */

export async function login(operarioId: string, pin: string) {
  const { data: valido, error } = await supabaseAdmin.rpc("verificar_pin", {
    _operario_id: operarioId,
    _pin: pin,
  });
  if (error) throw new Error("No se ha podido comprobar el PIN");
  if (valido !== true) return { ok: false as const };

  const { data: operario } = await supabaseAdmin
    .from("operarios")
    .select("id, nombre, area, activo")
    .eq("id", operarioId)
    .maybeSingle();
  if (!operario || !operario.activo) return { ok: false as const };

  return {
    ok: true as const,
    token: await crearToken(operarioId),
    operario: { id: operario.id, nombre: operario.nombre, area: operario.area },
  };
}

// Login screen needs the list of names before any session exists, so this is
// deliberately public — but never exposes pin_hash or work-schedule settings.
export async function listarOperarios(token: string | null) {
  const actor = await actorOpcional(token);
  if (!actor) {
    const filas = comprobar(
      await supabaseAdmin.from("operarios").select("id, nombre, area, activo").order("nombre"),
    );
    return filas.map((o) => ({
      ...o,
      protegido: false,
      jornada_minutos: 0,
      hora_entrada: "07:00:00",
      desayuno_minutos: 0,
      comida_minutos: 0,
    }));
  }
  return comprobar(
    await supabaseAdmin.from("operarios").select(CAMPOS_OPERARIO).order("nombre"),
  );
}

export async function tienePin(token: string | null, operarioId: string) {
  const actor = await requiereActor(token);
  if (!actor.esAdmin && actor.id !== operarioId) {
    throw new Error("No tienes permisos para esta acción");
  }
  const { data, error } = await supabaseAdmin.rpc("operario_tiene_pin", {
    _operario_id: operarioId,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function establecerPin(token: string | null, operarioId: string, pin: string) {
  const actor = await requiereActor(token);
  if (!actor.esAdmin && actor.id !== operarioId) {
    throw new Error("No tienes permisos para esta acción");
  }
  const { error } = await supabaseAdmin.rpc("establecer_pin", {
    _operario_id: operarioId,
    _pin: pin,
  });
  if (error) throw new Error(error.message);
}

/* ---------------- Operarios ---------------- */

export async function crearOperario(
  token: string | null,
  input: {
    nombre: string;
    area: string;
    pin: string;
    jornada_minutos?: number;
    hora_entrada?: string;
  },
) {
  requiereAdmin(await requiereActor(token));
  const { data, error } = await supabaseAdmin
    .from("operarios")
    .insert({
      nombre: input.nombre,
      area: input.area,
      ...(input.jornada_minutos ? { jornada_minutos: input.jornada_minutos } : {}),
      ...(input.hora_entrada ? { hora_entrada: input.hora_entrada } : {}),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const pinError = await supabaseAdmin.rpc("establecer_pin", {
    _operario_id: data.id,
    _pin: input.pin,
  });
  if (pinError.error) throw new Error(pinError.error.message);

  const rolError = await supabaseAdmin
    .from("operario_roles")
    .insert({ operario_id: data.id, role: "operario" });
  if (rolError.error) throw new Error(rolError.error.message);
}

export async function actualizarOperario(
  token: string | null,
  input: {
    id: string;
    jornada_minutos: number;
    hora_entrada: string;
    desayuno_minutos: number;
    comida_minutos: number;
  },
) {
  requiereAdmin(await requiereActor(token));
  const { id, ...cambios } = input;
  const { error } = await supabaseAdmin.from("operarios").update(cambios).eq("id", id);
  if (error) throw new Error(error.message);
}

// Los operarios no se eliminan (sus partes deben conservarse): se dan de baja.
export async function cambiarEstadoOperario(
  token: string | null,
  id: string,
  activo: boolean,
) {
  requiereAdmin(await requiereActor(token));
  if (!activo && (await esProtegido(id))) {
    throw new Error("El perfil de administrador protegido no se puede dar de baja");
  }
  const { error } = await supabaseAdmin.from("operarios").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Clientes y proyectos ---------------- */

export async function listarClientes(token: string | null) {
  await requiereActor(token);
  return comprobar(
    await supabaseAdmin.from("clientes").select("id, codigo, nombre, activo").order("codigo"),
  );
}

export async function crearCliente(
  token: string | null,
  input: { codigo: string; nombre: string },
) {
  requiereGestionDatos(await requiereActor(token));
  const { error } = await supabaseAdmin.from("clientes").insert(input);
  if (error) throw new Error(error.message);
}

export async function cambiarEstadoCliente(
  token: string | null,
  id: string,
  activo: boolean,
) {
  requiereGestionDatos(await requiereActor(token));
  const { error } = await supabaseAdmin.from("clientes").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
  // Al deshabilitar un cliente se deshabilitan también sus proyectos.
  if (!activo) {
    const res = await supabaseAdmin
      .from("proyectos")
      .update({ activo: false })
      .eq("cliente_id", id);
    if (res.error) throw new Error(res.error.message);
  }
}

export async function listarProyectos(token: string | null) {
  await requiereActor(token);
  return comprobar(
    await supabaseAdmin
      .from("proyectos")
      .select("id, cliente_id, codigo, nombre, activo")
      .order("codigo"),
  );
}

export async function crearProyecto(
  token: string | null,
  input: { cliente_id: string; codigo: string; nombre: string },
) {
  requiereGestionDatos(await requiereActor(token));
  const { error } = await supabaseAdmin.from("proyectos").insert(input);
  if (error) throw new Error(error.message);
}

export async function cambiarEstadoProyecto(
  token: string | null,
  id: string,
  activo: boolean,
) {
  requiereGestionDatos(await requiereActor(token));
  const { error } = await supabaseAdmin.from("proyectos").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Partes ---------------- */

export async function listarPartes(token: string | null) {
  const actor = await requiereActor(token);
  let consulta = supabaseAdmin
    .from("partes")
    .select(
      "*, operario:operarios(nombre, area), cliente:clientes(codigo, nombre), proyecto:proyectos(codigo, nombre)",
    )
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(500);

  // A plain operario only ever sees their own work logs.
  if (!actor.puedeGestionarDatos) consulta = consulta.eq("operario_id", actor.id);

  return comprobar(await consulta);
}

export async function crearParte(
  token: string | null,
  input: {
    fecha: string;
    operario_id: string;
    cliente_id: string | null;
    proyecto_id: string | null;
    hora_inicio: string;
    hora_fin: string;
    descripcion: string;
    tipo: string;
  },
) {
  const actor = await requiereActor(token);
  // Ownership is taken from the verified session, never from the request.
  const operarioId = actor.esAdmin ? input.operario_id : actor.id;
  const { error } = await supabaseAdmin
    .from("partes")
    .insert({ ...input, operario_id: operarioId });
  if (error) throw new Error(error.message);
}

async function parteAccesible(actor: { id: string; esAdmin: boolean }, id: string) {
  const { data } = await supabaseAdmin
    .from("partes")
    .select("operario_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new Error("El parte no existe");
  if (!actor.esAdmin && data.operario_id !== actor.id) {
    throw new Error("No puedes modificar partes de otro operario");
  }
}

export async function actualizarParte(
  token: string | null,
  input: {
    id: string;
    fecha: string;
    cliente_id: string | null;
    proyecto_id: string | null;
    hora_inicio: string;
    hora_fin: string;
    descripcion: string;
    tipo: string;
  },
) {
  const actor = await requiereActor(token);
  await parteAccesible(actor, input.id);
  const { id, ...cambios } = input;
  const { error } = await supabaseAdmin.from("partes").update(cambios).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function borrarParte(token: string | null, id: string) {
  const actor = await requiereActor(token);
  await parteAccesible(actor, id);
  const { error } = await supabaseAdmin.from("partes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Roles ---------------- */

export async function listarRoles(token: string | null) {
  const actor = await requiereActor(token);
  let consulta = supabaseAdmin.from("operario_roles").select("id, operario_id, role");
  if (!actor.puedeGestionarDatos) consulta = consulta.eq("operario_id", actor.id);
  return comprobar(await consulta);
}

export async function asignarRol(
  token: string | null,
  input: { operario_id: string; role: Rol },
) {
  requiereAdmin(await requiereActor(token));
  const { error } = await supabaseAdmin.from("operario_roles").insert(input);
  if (error) throw new Error(error.message);
}

export async function quitarRol(
  token: string | null,
  input: { operario_id: string; role: Rol },
) {
  requiereAdmin(await requiereActor(token));
  const { error } = await supabaseAdmin
    .from("operario_roles")
    .delete()
    .eq("operario_id", input.operario_id)
    .eq("role", input.role);
  if (error) throw new Error(error.message);
}

/* ---------------- Calendario ---------------- */

export async function listarCalendario(token: string | null) {
  await requiereActor(token);
  return comprobar(
    await supabaseAdmin
      .from("calendario")
      .select("id, fecha, tipo, operario_id, descripcion")
      .order("fecha"),
  );
}

export async function crearDias(
  token: string | null,
  input: {
    desde: string;
    hasta: string;
    tipo: string;
    operario_id: string | null;
    descripcion: string;
  },
) {
  requiereAdmin(await requiereActor(token));
  const filas: {
    fecha: string;
    tipo: string;
    operario_id: string | null;
    descripcion: string;
  }[] = [];
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
  const { error } = await supabaseAdmin.from("calendario").insert(filas);
  if (error) throw new Error(error.message);
}

export async function borrarDia(token: string | null, id: string) {
  requiereAdmin(await requiereActor(token));
  const { error } = await supabaseAdmin.from("calendario").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Productos y pedidos ---------------- */

const BUCKET = "productos";

async function subirFoto(base64: string, carpeta: string) {
  const coincide = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(base64);
  if (!coincide) throw new Error("La foto no es válida");
  const tipo = coincide[1]!;
  const binario = Uint8Array.from(atob(coincide[2]!), (c) => c.charCodeAt(0));
  const ext = tipo.split("/")[1]!.replace("jpeg", "jpg");
  const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(ruta, binario, { contentType: tipo, upsert: false });
  if (error) throw new Error("No se ha podido guardar la foto");
  return ruta;
}

async function urlFoto(ruta: string | null) {
  if (!ruta) return null;
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(ruta, 3600);
  return data?.signedUrl ?? null;
}

export async function listarProductos(token: string | null) {
  await requiereActor(token);
  const filas = comprobar(
    await supabaseAdmin
      .from("productos")
      .select(
        "id, nombre, referencia, proveedor, unidad, precio_estimado, descripcion, ficha_completa, foto_url, activo, created_at",
      )
      .order("nombre"),
  );
  return Promise.all(
    filas.map(async (p) => ({ ...p, foto: await urlFoto(p.foto_url) })),
  );
}

export async function crearProducto(
  token: string | null,
  input: { nombre: string; foto: string | null },
) {
  const actor = await requiereActor(token);
  const ruta = input.foto ? await subirFoto(input.foto, "productos") : null;
  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert({ nombre: input.nombre, foto_url: ruta, creado_por: actor.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function actualizarProducto(
  token: string | null,
  input: {
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
  },
) {
  requiereGestionDatos(await requiereActor(token));
  const { id, foto, ...cambios } = input;
  const ruta = foto ? await subirFoto(foto, "productos") : null;
  const { error } = await supabaseAdmin
    .from("productos")
    .update({ ...cambios, ...(ruta ? { foto_url: ruta } : {}) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarPedidos(token: string | null) {
  const actor = await requiereActor(token);
  let consulta = supabaseAdmin
    .from("pedidos")
    .select(
      "id, producto_id, operario_id, cantidad, notas, foto_url, estado, estado_at, pedido_at, created_at, producto:productos(nombre, referencia, proveedor, unidad, ficha_completa), operario:operarios!pedidos_operario_id_fkey(nombre, area)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  // Un operario solo ve sus propias peticiones.
  if (!actor.puedeGestionarDatos) consulta = consulta.eq("operario_id", actor.id);

  const filas = comprobar(await consulta);
  return Promise.all(filas.map(async (p) => ({ ...p, foto: await urlFoto(p.foto_url) })));
}

async function registrarHistorial(input: {
  pedido_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  nota: string;
  operario_id: string;
}) {
  await supabaseAdmin.from("pedido_historial").insert(input);
}

export async function crearPedido(
  token: string | null,
  input: {
    producto_id: string | null;
    producto_nuevo: string;
    cantidad: number;
    notas: string;
    foto: string | null;
  },
) {
  const actor = await requiereActor(token);
  const ruta = input.foto ? await subirFoto(input.foto, "pedidos") : null;

  let productoId = input.producto_id;
  if (!productoId) {
    const nombre = input.producto_nuevo.trim();
    if (!nombre) throw new Error("Indica el producto que necesitas");
    const { data, error } = await supabaseAdmin
      .from("productos")
      .insert({ nombre, foto_url: ruta, creado_por: actor.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    productoId = data.id;
  }

  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .insert({
      producto_id: productoId,
      operario_id: actor.id,
      cantidad: input.cantidad,
      notas: input.notas,
      foto_url: ruta,
      estado: "pendiente",
      estado_at: new Date().toISOString(),
      estado_por: actor.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await registrarHistorial({
    pedido_id: data.id as string,
    estado_anterior: null,
    estado_nuevo: "pendiente",
    nota: input.notas,
    operario_id: actor.id,
  });

  return data.id as string;
}

export async function cambiarEstadoPedido(
  token: string | null,
  id: string,
  estado: "pendiente" | "confirmado" | "entregado" | "cancelado",
  nota: string,
) {
  const actor = await requiereActor(token);
  requiereGestionDatos(actor);

  const { data: previo, error: errorPrevio } = await supabaseAdmin
    .from("pedidos")
    .select("estado")
    .eq("id", id)
    .single();
  if (errorPrevio) throw new Error(errorPrevio.message);

  const ahora = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("pedidos")
    .update({
      estado,
      estado_at: ahora,
      estado_por: actor.id,
      pedido_at: estado === "pendiente" ? null : ahora,
      pedido_por: estado === "pendiente" ? null : actor.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await registrarHistorial({
    pedido_id: id,
    estado_anterior: (previo?.estado as string | null) ?? null,
    estado_nuevo: estado,
    nota,
    operario_id: actor.id,
  });
}

export async function listarHistorialPedido(token: string | null, pedidoId: string) {
  const actor = await requiereActor(token);
  const propietario = comprobar(
    await supabaseAdmin.from("pedidos").select("operario_id").eq("id", pedidoId),
  )[0];
  if (!propietario) throw new Error("El pedido no existe");
  if (!actor.puedeGestionarDatos && propietario.operario_id !== actor.id) {
    throw new Error("No tienes permiso para ver este historial");
  }
  return comprobar(
    await supabaseAdmin
      .from("pedido_historial")
      .select(
        "id, estado_anterior, estado_nuevo, nota, created_at, operario:operarios(nombre)",
      )
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: true }),
  );
}
