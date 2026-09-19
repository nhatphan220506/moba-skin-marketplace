const SESSION_PREFIX = "moba-forge-session:";

export function apiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function storedSession(address?: string): string | null {
  if (!address || typeof window === "undefined") return null;
  const key = `${SESSION_PREFIX}${address.toLowerCase()}`;
  const token = window.sessionStorage.getItem(key);
  if (!token) return null;
  try {
    const encoded = token.split(".")[0].replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as { address?: string; expiresAt?: number };
    if (payload.address?.toLowerCase() !== address.toLowerCase() || Number(payload.expiresAt) <= Math.floor(Date.now() / 1000)) throw new Error("expired");
    return token;
  } catch { window.sessionStorage.removeItem(key); return null; }
}

export function hasPrototypeAccess(address?: string): boolean {
  const token = storedSession(address);
  if (!token) return false;
  try {
    const encoded = token.split(".")[0].replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as { prototypeAccess?: boolean };
    return payload.prototypeAccess === true;
  } catch { return false; }
}

export function storeSession(address: string, token: string) {
  window.sessionStorage.setItem(`${SESSION_PREFIX}${address.toLowerCase()}`, token);
}

export async function apiFetch(path: string, init: RequestInit = {}, address?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = storedSession(address);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers, cache: init.cache ?? "no-store" });
}

export function dynamicApiAvailable(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_HOSTING !== "true" || Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);
}
