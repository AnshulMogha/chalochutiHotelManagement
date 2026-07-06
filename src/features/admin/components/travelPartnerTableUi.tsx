import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgencyTier } from "../services/adminService";

export function TravelPartnerColumnHeader({
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

export function TravelPartnerBadge({
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

export function getAgencyTierTone(tier?: AgencyTier): string {
  switch (tier) {
    case "DIAMOND":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "PLATINUM":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "GOLD":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "SILVER":
      return "bg-gray-100 text-gray-700 ring-gray-200";
    case "BRONZE":
      return "bg-orange-50 text-orange-800 ring-orange-200";
    default:
      return "bg-slate-100 text-slate-500 ring-slate-200";
  }
}

export function getTravelPartnerRemarkTone(status: string): string {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export const TRAVEL_PARTNER_TAB_STYLES = {
  PENDING: {
    active: "bg-amber-500 text-white shadow-sm",
    idle: "text-amber-800 hover:bg-amber-100/80",
    iconActive: "text-white",
    iconIdle: "text-amber-600",
  },
  APPROVED: {
    active: "bg-emerald-600 text-white shadow-sm",
    idle: "text-emerald-800 hover:bg-emerald-100/80",
    iconActive: "text-white",
    iconIdle: "text-emerald-600",
  },
  REJECTED: {
    active: "bg-rose-600 text-white shadow-sm",
    idle: "text-rose-800 hover:bg-rose-100/80",
    iconActive: "text-white",
    iconIdle: "text-rose-600",
  },
} as const;

/** Layout-only overrides; header/footer use default DataTable styles. */
export const travelPartnerTableGridSx = {
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  "& .MuiDataGrid-cell[data-field='actions']": {
    overflow: "visible",
  },
  "& .MuiDataGrid-cell[data-field='remarks']": {
    alignItems: "flex-start",
  },
};
