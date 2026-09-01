/** Allow only same-origin relative paths (prevents open redirects). */
export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  return decoded;
}

export function appendReturnToQuery(
  params: URLSearchParams,
  returnTo: string | null | undefined,
): void {
  const safe = sanitizeReturnTo(returnTo);
  if (safe) params.set("returnTo", safe);
}
