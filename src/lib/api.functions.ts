import { createServerFn } from "@tanstack/react-start";

import * as S from "@/lib/api.schemas";

export const fnLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.loginSchema.parse(d))
  .handler(async ({ data }) => {
    const { login } = await import("@/lib/datos.server");
    return login(data.operario_id, data.pin);
  });

export const fnListarOperarios = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarOperarios } = await import("@/lib/datos.server");
    return listarOperarios(data.token);
  });

export const fnTienePin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenOperario.parse(d))
  .handler(async ({ data }) => {
    const { tienePin } = await import("@/lib/datos.server");
    return tienePin(data.token, data.operario_id);
  });

export const fnEstablecerPin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.establecerPinSchema.parse(d))
  .handler(async ({ data }) => {
    const { establecerPin } = await import("@/lib/datos.server");
    return establecerPin(data.token, data.operario_id, data.pin);
  });

export const fnCrearOperario = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.crearOperarioSchema.parse(d))
  .handler(async ({ data }) => {
    const { crearOperario } = await import("@/lib/datos.server");
    return crearOperario(data.token, data);
  });

export const fnActualizarOperario = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.actualizarOperarioSchema.parse(d))
  .handler(async ({ data }) => {
    const { actualizarOperario } = await import("@/lib/datos.server");
    return actualizarOperario(data.token, data);
  });

export const fnBorrarOperario = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenId.parse(d))
  .handler(async ({ data }) => {
    const { borrarOperario } = await import("@/lib/datos.server");
    return borrarOperario(data.token, data.id);
  });

export const fnListarClientes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarClientes } = await import("@/lib/datos.server");
    return listarClientes(data.token);
  });

export const fnCrearCliente = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.crearClienteSchema.parse(d))
  .handler(async ({ data }) => {
    const { crearCliente } = await import("@/lib/datos.server");
    return crearCliente(data.token, data);
  });

export const fnBorrarCliente = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenId.parse(d))
  .handler(async ({ data }) => {
    const { borrarCliente } = await import("@/lib/datos.server");
    return borrarCliente(data.token, data.id);
  });

export const fnListarProyectos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarProyectos } = await import("@/lib/datos.server");
    return listarProyectos(data.token);
  });

export const fnCrearProyecto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.crearProyectoSchema.parse(d))
  .handler(async ({ data }) => {
    const { crearProyecto } = await import("@/lib/datos.server");
    return crearProyecto(data.token, data);
  });

export const fnBorrarProyecto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenId.parse(d))
  .handler(async ({ data }) => {
    const { borrarProyecto } = await import("@/lib/datos.server");
    return borrarProyecto(data.token, data.id);
  });

export const fnListarPartes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarPartes } = await import("@/lib/datos.server");
    return listarPartes(data.token);
  });

export const fnCrearParte = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.crearParteSchema.parse(d))
  .handler(async ({ data }) => {
    const { crearParte } = await import("@/lib/datos.server");
    return crearParte(data.token, data);
  });

export const fnActualizarParte = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.actualizarParteSchema.parse(d))
  .handler(async ({ data }) => {
    const { actualizarParte } = await import("@/lib/datos.server");
    return actualizarParte(data.token, data);
  });

export const fnBorrarParte = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenId.parse(d))
  .handler(async ({ data }) => {
    const { borrarParte } = await import("@/lib/datos.server");
    return borrarParte(data.token, data.id);
  });

export const fnListarRoles = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarRoles } = await import("@/lib/datos.server");
    return listarRoles(data.token);
  });

export const fnAsignarRol = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.rolSchema.parse(d))
  .handler(async ({ data }) => {
    const { asignarRol } = await import("@/lib/datos.server");
    return asignarRol(data.token, { operario_id: data.operario_id, role: data.role });
  });

export const fnQuitarRol = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.rolSchema.parse(d))
  .handler(async ({ data }) => {
    const { quitarRol } = await import("@/lib/datos.server");
    return quitarRol(data.token, { operario_id: data.operario_id, role: data.role });
  });

export const fnListarCalendario = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.soloToken.parse(d))
  .handler(async ({ data }) => {
    const { listarCalendario } = await import("@/lib/datos.server");
    return listarCalendario(data.token);
  });

export const fnCrearDias = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.crearDiasSchema.parse(d))
  .handler(async ({ data }) => {
    const { crearDias } = await import("@/lib/datos.server");
    return crearDias(data.token, data);
  });

export const fnBorrarDia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => S.tokenId.parse(d))
  .handler(async ({ data }) => {
    const { borrarDia } = await import("@/lib/datos.server");
    return borrarDia(data.token, data.id);
  });
