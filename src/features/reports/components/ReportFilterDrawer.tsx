import type { ReactNode } from "react";
import { CalendarDays, ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RefreshToolbarButton,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/components/ui/reportToolbar";
import { formatReportDate } from "./reportUiHelpers";

export function ReportFilterButton({
  onClick,
  activeCount = 0,
  open = false,
  label = "Filter",
  className,
}: {
  onClick: () => void;
  activeCount?: number;
  open?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "relative",
        toolbarIconButtonClassName,
        open && toolbarIconButtonActiveClassName,
        className,
      )}
    >
      <ListFilter
        className={cn("h-4 w-4", open ? "text-white" : "text-[#3344A5]")}
        strokeWidth={2.25}
      />
      {activeCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

export type ReportAppliedFilterItem = {
  label: string;
  value: string;
};

export function ReportAppliedFilters({
  items,
  className,
}: {
  items: Array<ReportAppliedFilterItem | null | false | undefined>;
  className?: string;
}) {
  const visible = items.filter(
    (item): item is ReportAppliedFilterItem =>
      Boolean(item && item.label && item.value.trim()),
  );
  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((item) => (
        <span
          key={item.label}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F7F8FC] px-2.5 py-1 text-[12px] font-medium text-[#64748B]"
        >
          <span className="shrink-0">{item.label}</span>
          <span className="truncate font-semibold text-[#3344A5]">
            {item.value}
          </span>
        </span>
      ))}
    </div>
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
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#3344A5]/20 bg-[#EEF2FF] px-2.5 py-1 text-[12px] font-medium text-[#3344A5]">
      <CalendarDays className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      {range ? <span className="truncate tabular-nums">{range}</span> : null}
      {detail ? (
        <span className="truncate opacity-90">
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
    <RefreshToolbarButton onClick={onClick} busy={loading} disabled={disabled} />
  );
}

export const filterResetButtonClass =
  "cursor-pointer text-sm font-semibold text-[#2f3d95] hover:underline";

export const filterApplyButtonClass =
  "cursor-pointer rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#26317a] disabled:cursor-not-allowed disabled:opacity-50";

export function ReportFilterActions({
  onReset,
  onApply,
  applyDisabled,
  resetLabel = "Reset",
  applyLabel = "Apply",
}: {
  onReset: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  resetLabel?: string;
  applyLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
      <button type="button" onClick={onReset} className={filterResetButtonClass}>
        {resetLabel}
      </button>
      <button
        type="button"
        onClick={onApply}
        disabled={applyDisabled}
        className={filterApplyButtonClass}
      >
        {applyLabel}
      </button>
    </div>
  );
}

export function ReportFilterDrawer({
  open,
  onClose,
  onReset,
  onApply,
  applyDisabled,
  title = "Filter",
  resetLabel = "Reset",
  applyLabel = "Apply",
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

        <ReportFilterActions
          onReset={onReset}
          onApply={onApply}
          applyDisabled={applyDisabled}
          resetLabel={resetLabel}
          applyLabel={applyLabel}
        />
      </div>
    </div>
  );
}
