import { z } from "zod";

const uuid = z.string().uuid();
const token = z.string().min(1).nullable().optional().transform((v) => v ?? null);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
const hora = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora no válida");
const texto = (max: number) => z.string().trim().max(max);
const tipoParte = z.enum(["trabajo", "desayuno", "comida"]);
const tipoDia = z.enum(["festivo", "vacaciones"]);
const rol = z.enum(["operario", "area_tecnica", "administracion"]);
const pin = z.string().regex(/^\d{4,8}$/, "El PIN debe tener entre 4 y 8 dígitos");

export const soloToken = z.object({ token });
export const tokenId = z.object({ token, id: uuid });
export const estadoSchema = z.object({ token, id: uuid, activo: z.boolean() });
export const tokenOperario = z.object({ token, operario_id: uuid });

export const loginSchema = z.object({ operario_id: uuid, pin });

export const establecerPinSchema = z.object({ token, operario_id: uuid, pin });

export const crearOperarioSchema = z.object({
  token,
  nombre: texto(80).min(1, "El nombre es obligatorio"),
  area: texto(40).min(1),
  pin,
  jornada_minutos: z.number().int().min(1).max(1440).optional(),
  hora_entrada: hora.optional(),
});

export const actualizarOperarioSchema = z.object({
  token,
  id: uuid,
  jornada_minutos: z.number().int().min(1).max(1440),
  hora_entrada: hora,
  desayuno_minutos: z.number().int().min(0).max(240),
  comida_minutos: z.number().int().min(0).max(240),
});

export const crearClienteSchema = z.object({
  token,
  codigo: texto(30).min(1, "El código es obligatorio"),
  nombre: texto(120).min(1, "El nombre es obligatorio"),
});

export const crearProyectoSchema = z.object({
  token,
  cliente_id: uuid,
  codigo: texto(30).min(1, "El código es obligatorio"),
  nombre: texto(120).min(1, "El nombre es obligatorio"),
});

export const crearParteSchema = z.object({
  token,
  fecha,
  operario_id: uuid,
  cliente_id: uuid.nullable(),
  proyecto_id: uuid.nullable(),
  hora_inicio: hora,
  hora_fin: hora,
  descripcion: texto(500),
  tipo: tipoParte,
});

export const actualizarParteSchema = z.object({
  token,
  id: uuid,
  fecha,
  cliente_id: uuid.nullable(),
  proyecto_id: uuid.nullable(),
  hora_inicio: hora,
  hora_fin: hora,
  descripcion: texto(500),
  tipo: tipoParte,
});

export const rolSchema = z.object({ token, operario_id: uuid, role: rol });

export const crearDiasSchema = z.object({
  token,
  desde: fecha,
  hasta: fecha,
  tipo: tipoDia,
  operario_id: uuid.nullable(),
  descripcion: texto(200),
});
