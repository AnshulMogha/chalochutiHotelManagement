import type { LucideIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";

const CHIP_THEMES = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  purple: "bg-purple-50 text-purple-600 ring-purple-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export type CommissionChipTheme = keyof typeof CHIP_THEMES;

export function CommissionCellChip({
  icon: Icon,
  theme = "blue",
}: {
  icon: LucideIcon;
  theme?: CommissionChipTheme;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
        CHIP_THEMES[theme],
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

export function CommissionTableHeader({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-normal text-slate-500">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2.25} />
      {label}
    </span>
  );
}

/** @deprecated Themes kept for call-site compatibility; panels use slate shell. */
export type CommissionPanelTheme = "blue" | "violet" | "green" | "purple";

export function CommissionPanelBody({
  theme: _theme = "blue",
  children,
}: {
  theme?: CommissionPanelTheme;
  children: React.ReactNode;
}) {
  void _theme;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function CommissionTabLoader({
  theme = "blue",
}: {
  theme?: CommissionPanelTheme;
}) {
  return (
    <CommissionPanelBody theme={theme}>
      <div className="flex min-h-0 flex-1 items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    </CommissionPanelBody>
  );
}

export function CommissionPanelShell({
  theme: _theme = "blue",
  icon: Icon,
  title,
  action,
  children,
}: {
  theme?: CommissionPanelTheme;
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  void _theme;
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function CommissionFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 sm:flex-nowrap">
      {children}
    </div>
  );
}

export function CommissionSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-[200px] max-w-sm flex-1">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

export function CommissionTableWrap({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80">
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}

export function CommissionTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
      {children}
    </thead>
  );
}

export function CommissionTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold first:pl-4 last:pr-4">
      {children}
    </th>
  );
}

export function CommissionPaginationFooter({
  pageLabel,
  pageSize,
  onPageSizeChange,
  pageSizeId,
  hasPrevious,
  hasNext,
  isLoading,
  onPrevious,
  onNext,
}: {
  pageLabel: string;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizeId: string;
  hasPrevious: boolean;
  hasNext: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-500">{pageLabel}</div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={pageSizeId} className="text-xs text-slate-500">
          Rows
        </label>
        <select
          id={pageSizeId}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <button
          type="button"
          disabled={!hasPrevious || isLoading}
          onClick={onPrevious}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={onNext}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function CommissionEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-10 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
        </div>
        <p className="mb-1 text-base font-medium text-slate-800">{title}</p>
        <p className="mb-3 text-sm text-slate-500">{description}</p>
        {action}
      </div>
    </div>
  );
}

const TAB_ACTIVE =
  "bg-[#2f3d95] text-white font-semibold shadow-sm";
const TAB_IDLE =
  "text-slate-600 hover:bg-white hover:text-slate-900";

export const COMMISSION_TAB_STYLES = {
  otaCommission: {
    active: TAB_ACTIVE,
    idle: TAB_IDLE,
    iconActive: "text-white",
    iconIdle: "text-slate-400 group-hover:text-slate-700",
  },
  agencyCommission: {
    active: TAB_ACTIVE,
    idle: TAB_IDLE,
    iconActive: "text-white",
    iconIdle: "text-slate-400 group-hover:text-slate-700",
  },
  tax: {
    active: TAB_ACTIVE,
    idle: TAB_IDLE,
    iconActive: "text-white",
    iconIdle: "text-slate-400 group-hover:text-slate-700",
  },
  serviceFee: {
    active: TAB_ACTIVE,
    idle: TAB_IDLE,
    iconActive: "text-white",
    iconIdle: "text-slate-400 group-hover:text-slate-700",
  },
} as const;
