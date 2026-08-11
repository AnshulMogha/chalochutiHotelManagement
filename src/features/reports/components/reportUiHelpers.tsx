import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { AlertTriangle, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function formatReportDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function formatReportCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatReportMoney(
  amount?: { amount?: number | null; currency?: string } | null,
): string {
  if (!amount || amount.amount == null || Number.isNaN(amount.amount)) {
    return "—";
  }
  return formatReportCurrency(amount.amount);
}

/** INR with 2 decimals for finance / accountant screens. */
export function formatFinanceCurrency(
  value: number | null | undefined,
  currency = "INR",
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFinanceMoney(
  amount?: { amount?: number | null; currency?: string } | null,
): string {
  if (!amount || amount.amount == null || Number.isNaN(amount.amount)) {
    return "—";
  }
  return formatFinanceCurrency(amount.amount, amount.currency || "INR");
}

export function formatChangePercent(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function agentStatusTone(
  color?: string | null,
  code?: string | null,
): string {
  const normalized = String(color || code || "")
    .trim()
    .toUpperCase();
  if (normalized === "GREEN" || normalized === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "RED" || normalized === "SUSPENDED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (normalized === "AMBER" || normalized === "INACTIVE") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function getSalesManagerActionLink(
  actionUrl?: string | null,
  onboardingId?: number | null,
): string {
  if (actionUrl) {
    const onboardingMatch = actionUrl.match(
      /\/travel-agents\/onboarding\/(\d+)/,
    );
    if (onboardingMatch) return ROUTES.AGENTS.EDIT(onboardingMatch[1]);
  }
  if (onboardingId) return ROUTES.AGENTS.EDIT(onboardingId);
  return ROUTES.AGENTS.LIST;
}

export function formatReportDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function severityTone(severity: string): string {
  const normalized = severity.trim().toUpperCase();
  if (normalized === "HIGH" || normalized === "CRITICAL") {
    return "border-rose-200 bg-rose-50";
  }
  if (normalized === "MEDIUM" || normalized === "WARNING") {
    return "border-amber-200 bg-amber-50";
  }
  if (normalized === "INFO" || normalized === "LOW") {
    return "border-sky-200 bg-sky-50";
  }
  return "border-slate-200 bg-slate-50";
}

export function healthStatusTone(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (
    normalized === "HEALTHY" ||
    normalized.includes("OK") ||
    normalized.includes("GOOD")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (
    normalized.includes("DISPARITY") ||
    normalized.includes("HIGH") ||
    normalized.includes("MISSING")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (
    normalized.includes("NO_INVENTORY") ||
    normalized.includes("NOT_SALEABLE")
  ) {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function hotelStatusTone(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "LIVE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (
    normalized.includes("REJECT") ||
    normalized === "QC_REJECTED" ||
    normalized === "ZONAL_REJECTED"
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (
    normalized.includes("QC") ||
    normalized.includes("ZONAL") ||
    normalized.includes("REVIEW")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized === "DRAFT" || normalized === "PIPELINE") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

/** Draft + rejected hotels can be edited; all other statuses open read-only. */
const EDITABLE_HOTEL_STATUSES = new Set([
  "DRAFT",
  "QC_REJECTED",
  "ZONAL_REJECTED",
  "REJECTED",
]);

export function isHotelOnboardingEditable(status?: string | null): boolean {
  if (!status) return false;
  return EDITABLE_HOTEL_STATUSES.has(status.trim().toUpperCase());
}

export function getHotelOnboardingLink(
  hotelId: string,
  status?: string | null,
): string {
  const base = ROUTES.PROPERTIES.EDIT(hotelId);
  return isHotelOnboardingEditable(status) ? base : `${base}&readOnly=true`;
}

export function allocationStatusTone(status: string): string {
  const normalized = status.trim().toUpperCase().replace(/_/g, " ");
  if (
    normalized.includes("FULL") ||
    normalized.includes("OVER") ||
    normalized.includes("CRITICAL")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (
    normalized.includes("UNDER UTILIZED") ||
    normalized.includes("LOW") ||
    normalized.includes("WARNING")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (
    normalized.includes("NO ALLOCATION") ||
    normalized.includes("NONE") ||
    normalized.includes("BLOCKED")
  ) {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div className={cn("rounded-lg border px-3 py-2 shadow-sm", tones[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function InsightList({
  insights,
}: {
  insights: Array<{
    code: string;
    severity: string;
    title: string;
    message: string;
    recommendation?: string | null;
  }>;
}) {
  if (!insights.length) return null;

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <div
          key={insight.code}
          className={cn(
            "rounded-xl border px-4 py-3",
            severityTone(insight.severity),
          )}
        >
          <div className="flex items-start gap-2">
            {insight.severity === "INFO" ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {insight.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">{insight.message}</p>
              {insight.recommendation ? (
                <p className="mt-2 text-xs text-slate-600">
                  {insight.recommendation}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function exportStatusLabel(
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | null,
): string {
  if (!status) return "";
  if (status === "QUEUED") return "Queued…";
  if (status === "RUNNING") return "Generating…";
  if (status === "COMPLETED") return "Downloading…";
  return status;
}

export function ReportPageHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  actions,
  borderClassName = "border-slate-200",
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  borderClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm",
        borderClassName,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
