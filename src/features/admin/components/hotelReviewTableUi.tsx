import { cn } from "@/lib/utils";
import type { ReviewRemark } from "../services/adminService";

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
        "inline-flex h-auto max-w-full items-center self-center truncate rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight ring-1",
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

/** Layout-only overrides; header and footer stay on the shared DataTable styles. */
export const hotelReviewTableGridSx = {
  "& .MuiDataGrid-columnHeader": {
    padding: "8px 10px !important",
  },
  "& .MuiDataGrid-columnHeader[data-field='actions']": {
    paddingRight: "12px !important",
  },
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    lineHeight: "1.25 !important",
    padding: "6px 10px !important",
  },
  "& .MuiDataGrid-cell[data-field='actions']": {
    overflow: "visible",
    justifyContent: "flex-end",
    paddingRight: "12px !important",
  },
};
