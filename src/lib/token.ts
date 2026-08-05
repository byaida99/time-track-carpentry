import { useSyncExternalStore } from "react";

const CLAVE_TOKEN = "operario-token";
const EVENTO_TOKEN = "operario-token-cambio";

export function leerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(CLAVE_TOKEN, token);
  else window.localStorage.removeItem(CLAVE_TOKEN);
  window.dispatchEvent(new Event(EVENTO_TOKEN));
}

/**
 * Token de sesión listo para usar en el cliente. Devuelve null durante SSR y
 * en el primer render, de modo que ninguna consulta protegida se lanza sin
 * sesión (lo que provocaría un error «Sesión no válida»).
 */
function suscribir(cb: () => void) {
  window.addEventListener(EVENTO_TOKEN, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO_TOKEN, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useToken(): string | null {
  return useSyncExternalStore(suscribir, leerToken, () => null);
}
