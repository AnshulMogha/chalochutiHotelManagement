import { cn } from "@/lib/utils";
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

export function allocationStatusTone(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("full")) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (normalized.includes("low")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized.includes("no allocation")) {
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
