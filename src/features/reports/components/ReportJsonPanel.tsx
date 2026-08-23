import { Loader2 } from "lucide-react";

export function ReportJsonPanel({
  title,
  loading,
  error,
  data,
}: {
  title: string;
  loading?: boolean;
  error?: string | null;
  data: unknown;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        ) : null}
      </div>
      <div className="max-h-[32rem] overflow-auto p-4">
        {error ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-rose-600">
            {error}
          </pre>
        ) : data == null ? (
          <p className="text-sm text-slate-400">
            No response yet. Click Load / Refresh to fetch.
          </p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-800">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function extractErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Request failed";

  const error = err as {
    message?: unknown;
    data?: unknown;
  };

  let detailPayload = error.data;

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

  const topMessage =
    error.message != null && String(error.message).trim()
      ? String(error.message).trim()
      : "";

  if (typeof detailPayload === "string" && detailPayload.trim()) {
    const detail = detailPayload.trim();
    return detail === topMessage ? detail : detail;
  }

  if (Array.isArray(detailPayload)) {
    const parts = detailPayload
      .map((part) =>
        typeof part === "object" && part != null && "message" in part
          ? String((part as { message: unknown }).message)
          : String(part),
      )
      .filter((part) => part && part !== "undefined");
    if (parts.length === 1) return parts[0];
    if (parts.length > 1) {
      return topMessage ? `${topMessage} ${parts.join(" ")}` : parts.join(" ");
    }
  }

  if (detailPayload && typeof detailPayload === "object") {
    const data = detailPayload as {
      message?: unknown;
      code?: unknown;
      [key: string]: unknown;
    };

    const nestedMessage =
      data.message != null && String(data.message).trim()
        ? String(data.message).trim()
        : "";
    const code =
      data.code != null && String(data.code).trim()
        ? String(data.code).trim()
        : "";

    if (code === "MAKER_CHECKER_VIOLATION") {
      return (
        nestedMessage ||
        topMessage ||
        "Settlement creator cannot approve or reject the same settlement."
      );
    }

    const fieldMessages = Object.entries(data)
      .filter(
        ([key, value]) =>
          key !== "message" &&
          key !== "code" &&
          value != null &&
          String(value).trim() !== "",
      )
      .map(([, value]) => String(value).trim());

    if (fieldMessages.length === 1) return fieldMessages[0];
    if (fieldMessages.length > 1) {
      return topMessage
        ? `${topMessage} ${fieldMessages.join(" ")}`
        : fieldMessages.join(" ");
    }

    if (nestedMessage) return nestedMessage;
  }

  return topMessage || "Request failed";
}

export function extractFieldErrors(err: unknown): Record<string, string> {
  if (!err || typeof err !== "object") return {};

  const error = err as { data?: unknown };
  let detailPayload = error.data;

  if (
    detailPayload &&
    typeof detailPayload === "object" &&
    !Array.isArray(detailPayload) &&
    "data" in detailPayload &&
    (detailPayload as { data: unknown }).data != null
  ) {
    const inner = (detailPayload as { data: unknown }).data;
    if (typeof inner === "object" && inner != null && !Array.isArray(inner)) {
      detailPayload = inner;
    }
  }

  if (!detailPayload || typeof detailPayload !== "object" || Array.isArray(detailPayload)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(detailPayload as Record<string, unknown>)
      .filter(
        ([key, value]) =>
          key !== "message" &&
          key !== "code" &&
          value != null &&
          String(value).trim() !== "",
      )
      .map(([key, value]) => [key, String(value).trim()]),
  );
}
