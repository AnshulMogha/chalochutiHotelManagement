import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIP_THEMES = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export type BookingChipTheme = keyof typeof CHIP_THEMES;

export function BookingCellChip({
  icon: Icon,
  theme = "blue",
  className,
}: {
  icon: LucideIcon;
  theme?: BookingChipTheme;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
        CHIP_THEMES[theme],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

export function BookingColumnHeader({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-white">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" strokeWidth={2.25} />
      {label}
    </span>
  );
}

export function getStatusConfig(status: string | undefined): {
  className: string;
  dotClass: string;
} {
  const s = (status || "").toUpperCase();
  if (s === "CONFIRMED" || s === "COMPLETED") {
    return {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }
  if (s === "RESERVED" || s === "PENDING" || s === "PROCESSING") {
    return {
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
    };
  }
  if (s === "CANCELLED" || s === "CANCELED") {
    return {
      className: "bg-red-50 text-red-700 border-red-200",
      dotClass: "bg-red-500",
    };
  }
  if (s === "CHECKED_IN" || s === "CHECKED_OUT") {
    return {
      className: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
    };
  }
  return {
    className: "bg-gray-100 text-gray-700 border-gray-200",
    dotClass: "bg-gray-400",
  };
}

export const bookingTableGridSx = {
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
