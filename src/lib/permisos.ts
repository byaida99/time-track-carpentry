import { useQuery } from "@tanstack/react-query";

import { rolesQuery, type Rol } from "@/lib/api";
import { useSesion } from "@/lib/sesion";

export type Permisos = {
  roles: Rol[];
  esAdmin: boolean;
  puedeGestionarDatos: boolean; // clientes y proyectos
  puedeVerInformes: boolean;
  cargando: boolean;
};

export function usePermisos(): Permisos {
  const { sesion, cargando } = useSesion();
  const roles = useQuery(rolesQuery);

  const propios = (roles.data ?? [])
    .filter((r) => r.operario_id === sesion?.id)
    .map((r) => r.role);

  const esAdmin = propios.includes("administracion");
  const esTecnica = esAdmin || propios.includes("area_tecnica");

  return {
    roles: propios.length > 0 ? propios : sesion ? ["operario"] : [],
    esAdmin,
    puedeGestionarDatos: esTecnica,
    puedeVerInformes: esTecnica,
    cargando: cargando || roles.isLoading,
  };
}
