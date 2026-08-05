import { useEffect, useState } from "react";

import { guardarToken } from "@/lib/token";


export type SesionOperario = { id: string; nombre: string; area: string };

const CLAVE = "operario-sesion";
const EVENTO = "operario-sesion-cambio";

export function leerSesion(): SesionOperario | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as SesionOperario) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(s: SesionOperario | null) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(CLAVE, JSON.stringify(s));
  else {
    window.localStorage.removeItem(CLAVE);
    guardarToken(null);
  }
  window.dispatchEvent(new Event(EVENTO));
}


export function useSesion() {
  const [sesion, setSesion] = useState<SesionOperario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const sync = () => setSesion(leerSesion());
    sync();
    setCargando(false);
    window.addEventListener(EVENTO, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENTO, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { sesion, cargando, salir: () => guardarSesion(null) };
}
