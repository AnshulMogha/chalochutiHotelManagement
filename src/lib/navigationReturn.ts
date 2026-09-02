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

/** Human-readable Back label based on the source route. */
export function getReturnBackLabel(
  returnTo: string | null | undefined,
): string {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return "Back to Bookings";
  if (safe.includes("/finance/settlements/workbench")) return "Back to search list";
  if (safe.includes("/finance/settlements")) return "Back to Settlement";
  if (safe.includes("sales-manager-agents")) return "Back to Agent Portfolio";
  if (safe.includes("hotel-booking-financial-mis")) return "Back to Financial MIS";
  return "Back";
}

export function readReturnToFromLocation(
  searchParams: URLSearchParams,
  state: unknown,
): string | null {
  return (
    sanitizeReturnTo(searchParams.get("returnTo")) ??
    sanitizeReturnTo((state as { returnTo?: string } | null)?.returnTo)
  );
}
