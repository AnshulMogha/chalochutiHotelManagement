/**
 * Readable message from apiClient interceptor rejection:
 * `{ message, data? }` where `data` may hold field-level validation details.
 */
export function formatApiClientError(err: unknown): string {
  if (err == null) return "Something went wrong.";

  const e = err as {
    message?: string;
    data?: unknown;
  };

  let detailPayload = e.data;

  if (
    detailPayload &&
    typeof detailPayload === "object" &&
    !Array.isArray(detailPayload) &&
    "data" in detailPayload &&
    (detailPayload as { data: unknown }).data != null
  ) {
    const inner = (detailPayload as { data: unknown }).data;
    if (typeof inner === "object" || typeof inner === "string") {
      detailPayload = inner;
    }
  }

  const base =
    (e.message && String(e.message).trim()) || "Something went wrong.";

  if (detailPayload == null) return base;

  if (typeof detailPayload === "string" && detailPayload.trim()) {
    const d = detailPayload.trim();
    return d === base ? base : `${base}\n${d}`;
  }

  if (Array.isArray(detailPayload)) {
    const parts = detailPayload
      .map((p) =>
        typeof p === "object" && p != null && "message" in p
          ? String((p as { message: unknown }).message)
          : String(p),
      )
      .filter((s) => s && s !== "undefined");
    if (parts.length) return `${base}\n${parts.join("\n")}`;
    return base;
  }

  if (typeof detailPayload === "object") {
    const lines = Object.entries(detailPayload as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${String(v)}`);
    if (lines.length) return `${base}\n${lines.join("\n")}`;
  }

  return base;
}
