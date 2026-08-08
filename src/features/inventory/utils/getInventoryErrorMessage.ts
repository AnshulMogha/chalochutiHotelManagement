import { formatApiClientError } from "@/services/api/formatApiClientError";

/**
 * Build a user-facing message for inventory update failures.
 *
 * The API returns field-level validation details under `data` (e.g.
 * `data.totalRooms: "Inventory allotment (200) cannot exceed the room type's
 * total rooms (50)."`). Prefer showing that specific message instead of the
 * generic top-level message ("One or more fields are invalid.").
 */
export function getInventoryErrorMessage(
  error: unknown,
  fallback = "Failed to update inventory",
): string {
  const data = (error as { data?: unknown } | null)?.data;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const messages = Object.values(data as Record<string, unknown>).filter(
      (value): value is string =>
        typeof value === "string" && value.trim() !== "",
    );
    if (messages.length) return messages.join("\n");
  }

  const formatted = formatApiClientError(error);
  if (formatted && formatted.trim()) return formatted;

  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
