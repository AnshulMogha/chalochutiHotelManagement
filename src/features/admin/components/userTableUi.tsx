import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserColumnHeader({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-white">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" strokeWidth={2.25} />
      {label}
    </span>
  );
}

export function UserFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-2.5 py-2 shadow-sm">
      {children}
    </div>
  );
}

export function UserFilterLabel({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pr-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <Icon className="h-3.5 w-3.5 text-[#2f3d95]" strokeWidth={2.25} />
      {label}
    </div>
  );
}

const FILTER_THEMES = {
  emerald: {
    wrap: "border-emerald-200/80 bg-emerald-50/50",
    icon: "text-emerald-600",
  },
  indigo: {
    wrap: "border-indigo-200/80 bg-indigo-50/50",
    icon: "text-indigo-600",
  },
  sky: {
    wrap: "border-sky-200/80 bg-sky-50/50",
    icon: "text-sky-600",
  },
} as const;

type FilterTheme = keyof typeof FILTER_THEMES;

export function UserFilterGroup({
  icon: Icon,
  theme = "emerald",
  className,
  children,
}: {
  icon: LucideIcon;
  theme?: FilterTheme;
  className?: string;
  children: React.ReactNode;
}) {
  const styles = FILTER_THEMES[theme];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2 py-0.5",
        styles.wrap,
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", styles.icon)}
        strokeWidth={2.25}
      />
      {children}
    </div>
  );
}

export function UserSearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  embedded = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder: string;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-w-[140px] flex-1 border-0 bg-transparent py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
      />
    );
  }

  return (
    <div className="relative min-w-[180px] max-w-xs flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pr-2.5 pl-8 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
      />
    </div>
  );
}

const filterSelectClass =
  "h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20";

export function UserFilterSelect({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  embedded = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  "aria-label": string;
  embedded?: boolean;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(
        embedded
          ? "min-w-[108px] cursor-pointer border-0 bg-transparent py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-0"
          : cn(filterSelectClass, "min-w-[120px]"),
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value || "all"} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export const userTableGridSx = {
  "& .MuiDataGrid-row": {
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: "#eff6ff !important",
    },
    "&.Mui-selected": {
      backgroundColor: "#dbeafe !important",
    },
  },
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    py: "6px !important",
  },
  "& .MuiDataGrid-cell[data-field='actions']": {
    overflow: "visible",
  },
  "& .MuiDataGrid-cell[data-field='roles']": {
    alignItems: "flex-start",
    py: "8px !important",
  },
  "& .MuiDataGrid-footerContainer": {
    minHeight: 48,
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
  },
  "& .MuiTablePagination-root": {
    color: "#64748b",
    fontSize: "0.8125rem",
  },
  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
    fontSize: "0.8125rem",
    fontWeight: 500,
  },
  "& .MuiTablePagination-select": {
    borderRadius: "8px",
    fontSize: "0.8125rem",
  },
  "& .MuiIconButton-root": {
    color: "#475569",
    borderRadius: "8px",
    "&:hover": {
      backgroundColor: "#e2e8f0",
    },
    "&.Mui-disabled": {
      color: "#cbd5e1",
    },
  },
};
