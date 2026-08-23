import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/features/reports/components/reportUiHelpers";
import type { HelpdeskTicketPriority, HelpdeskTicketStatus } from "../services/helpdeskTicketTypes";

export function ticketStatusTone(status?: string | null): string {
  const value = String(status || "").toUpperCase();
  if (value === "OPEN" || value === "REOPENED") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }
  if (value === "ASSIGNED" || value === "IN_PROGRESS") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }
  if (value.startsWith("WAITING_")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (value === "RESOLVED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (value === "CLOSED") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function ticketPriorityTone(priority?: string | null): string {
  const value = String(priority || "").toUpperCase();
  if (value === "CRITICAL") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (value === "HIGH") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (value === "MEDIUM") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "LOW") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function TicketBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function formatTicketStatus(status?: string | null): string {
  return formatStatusLabel(status);
}

export function formatTicketPriority(
  priority?: HelpdeskTicketPriority | string | null,
): string {
  return formatStatusLabel(priority);
}

export function isWaitingStatus(status?: HelpdeskTicketStatus | string | null): boolean {
  return String(status || "").toUpperCase().startsWith("WAITING_");
}
