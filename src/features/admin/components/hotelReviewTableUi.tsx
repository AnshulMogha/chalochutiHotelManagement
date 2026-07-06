import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewRemark } from "../services/adminService";

export function HotelReviewColumnHeader({
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

export function HotelReviewBadge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function getRemarkTone(remark?: ReviewRemark | null): {
  className: string;
  dotClass: string;
} {
  const action = (remark?.reviewAction || "").toUpperCase();
  const text = (remark?.remark || "").toLowerCase();

  if (
    action.includes("APPROVED") ||
    (text.includes("approved") && !text.includes("reject"))
  ) {
    return {
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }
  if (action.includes("REJECT") || text.includes("reject")) {
    return {
      className: "bg-rose-50 text-rose-700 ring-rose-200",
      dotClass: "bg-rose-500",
    };
  }
  if (action.includes("PENDING") || text.includes("pending")) {
    return {
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      dotClass: "bg-amber-500",
    };
  }
  return {
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    dotClass: "bg-slate-400",
  };
}

/** Layout-only overrides for data rows; header/footer use default DataTable styles. */
export const hotelReviewTableGridSx = {
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  "& .MuiDataGrid-cell[data-field='actions']": {
    overflow: "visible",
  },
  "& .MuiDataGrid-cell[data-field='qcRemarks']": {
    alignItems: "flex-start",
  },
};
