/** Devuelve la URL normalizada si es http(s) válida; si no, null. */
export function parseHttpUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
