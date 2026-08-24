import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Flag,
  Inbox,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReportPageHeader,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import type { ReviewStatus } from "../services/reviewModerationTypes";

const STAT_TONE: Record<
  "navy" | "amber" | "rose" | "emerald" | "slate",
  string
> = {
  navy: "bg-[#2f3d95]",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-600",
  slate: "bg-slate-500",
};

export function ReviewModerationPageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <ReportPageHeader
          icon={Star}
          iconClassName="bg-linear-to-br from-amber-500 to-orange-600"
          title={title}
          description={subtitle}
          descriptionClassName="text-xs text-slate-500"
          borderClassName="border-amber-100"
          actions={actions}
        />
        {children}
      </div>
    </div>
  );
}

export function ReviewModerationStatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </div>
          {sub ? (
            <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            STAT_TONE[tone],
          )}
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function ReviewModerationFlowStrip() {
  const steps = [
    { label: "Pending", tone: "bg-amber-100 text-amber-800 ring-amber-200" },
    { label: "Flagged", tone: "bg-rose-100 text-rose-800 ring-rose-200" },
    { label: "Approve → Published", tone: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    { label: "Reject", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  ];

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Moderation flow
        </span>
        <span className="hidden text-slate-300 sm:inline">·</span>
        {steps.map((step, index) => (
          <span key={step.label} className="inline-flex items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                step.tone,
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="text-slate-300" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReviewModerationEmptyState({
  title = "Queue is clear",
  description = "No reviews are waiting for moderation right now. Check back later or refresh to pull the latest queue.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
        <Inbox className="h-7 w-7 text-amber-600" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ReviewModerationActionIcon({
  action,
}: {
  action: "approve" | "reject" | "flag" | "unflag";
}) {
  const map = {
    approve: { icon: CheckCircle2, className: "text-emerald-600" },
    reject: { icon: XCircle, className: "text-rose-600" },
    flag: { icon: Flag, className: "text-amber-600" },
    unflag: { icon: ShieldCheck, className: "text-slate-600" },
  };
  const { icon: Icon, className } = map[action];
  return <Icon className={cn("h-4 w-4", className)} />;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const styles: Record<string, string> = {
    REVIEW_PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    REVIEW_PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    REVIEW_FLAGGED: "bg-rose-50 text-rose-800 ring-rose-200",
    REVIEW_REJECTED: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const labels: Record<string, string> = {
    REVIEW_PENDING: "Pending",
    REVIEW_PUBLISHED: "Published",
    REVIEW_FLAGGED: "Flagged",
    REVIEW_REJECTED: "Rejected",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[normalized] ?? "bg-slate-50 text-slate-700 ring-slate-200",
      )}
    >
      {labels[normalized] ?? formatStatusLabel(status)}
    </span>
  );
}

export function ReviewRatingStars({ rating }: { rating: number | null }) {
  if (rating == null || Number.isNaN(rating)) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
      {rating.toFixed(1)}
      <span className="text-amber-500">★</span>
    </span>
  );
}

export function canApproveReview(status: string): boolean {
  const s = status.toUpperCase();
  return s === "REVIEW_PENDING" || s === "REVIEW_FLAGGED";
}

export function canRejectReview(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "REVIEW_PENDING" ||
    s === "REVIEW_FLAGGED" ||
    s === "REVIEW_PUBLISHED"
  );
}

export function canFlagReview(status: string): boolean {
  const s = status.toUpperCase();
  return s !== "REVIEW_FLAGGED" && s !== "REVIEW_REJECTED";
}

export function canUnflagReview(status: string): boolean {
  return status.toUpperCase() === "REVIEW_FLAGGED";
}

export function reviewStatusLabel(status: ReviewStatus | string): string {
  const map: Record<string, string> = {
    REVIEW_PENDING: "Pending",
    REVIEW_PUBLISHED: "Published",
    REVIEW_FLAGGED: "Flagged",
    REVIEW_REJECTED: "Rejected",
  };
  return map[String(status).toUpperCase()] ?? formatStatusLabel(status);
}
