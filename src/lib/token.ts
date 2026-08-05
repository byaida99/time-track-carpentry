const CLAVE_TOKEN = "operario-token";

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
}
