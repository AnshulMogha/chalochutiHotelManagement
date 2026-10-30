import type { ReactNode } from "react";
import { CalendarDays, Filter, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatReportDate } from "./reportUiHelpers";

export function ReportFilterButton({
  onClick,
  activeCount = 0,
  label = "Filter",
  className,
}: {
  onClick: () => void;
  activeCount?: number;
  label?: string;
  className?: string;
}) {
  const hasActive = activeCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
        hasActive
          ? "border-violet-200 bg-violet-50 text-violet-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50",
        className,
      )}
    >
      <Filter className="h-4 w-4" />
      {label}
      {hasActive ? (
        <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

export function ReportAppliedRange({
  from,
  to,
  detail,
}: {
  from?: string | null;
  to?: string | null;
  detail?: string | null;
}) {
  const range =
    from && to
      ? `${formatReportDate(from)} – ${formatReportDate(to)}`
      : from
        ? formatReportDate(from)
        : to
          ? formatReportDate(to)
          : null;
  if (!range && !detail) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800 shadow-sm">
      <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
      {range ? <span>{range}</span> : null}
      {detail ? (
        <span className="font-semibold text-blue-600">
          {range ? `· ${detail}` : detail}
        </span>
      ) : null}
    </div>
  );
}

export function ReportRefreshButton({
  onClick,
  loading = false,
  disabled = false,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Refresh"
      title="Refresh"
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
    </button>
  );
}

export function ReportFilterDrawer({
  open,
  onClose,
  onReset,
  onApply,
  applyDisabled,
  title = "Filter",
  resetLabel = "Clear All",
  applyLabel = "Apply Filter",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  title?: string;
  resetLabel?: string;
  applyLabel?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-slate-900/40"
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {children}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer text-sm font-semibold text-[#2f3d95] hover:underline"
          >
            {resetLabel}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            className="cursor-pointer rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#26317a] disabled:opacity-50"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
