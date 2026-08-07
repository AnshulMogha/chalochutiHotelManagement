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
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message || "Request failed");
  }
  return "Request failed";
}
