import { cn } from "@/lib/utils";
import {
  formatFinanceMoney,
  formatReportDate,
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  StatusBadge,
  bookingStatusTone,
  paymentStatusTone,
  refundStatusTone,
} from "@/features/reports/components/hotelFinancialMisUi";
import type {
  HelpdeskBreakupLine,
  HelpdeskFinancialBreakup,
  HelpdeskPaymentAttempt,
  HelpdeskTimelineEvent,
} from "../services/helpdeskBookingService";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  RefreshCw,
  type LucideProps,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export function HelpdeskPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-full bg-[#f4f6f9]", className)}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export function HelpdeskPanel({
  title,
  subtitle,
  action,
  icon: Icon,
  accent,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                  accent ?? "bg-[#2f3d95]",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function HelpdeskMetric({
  label,
  value,
  icon: Icon,
  tone = "slate",
  compact = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose";
  compact?: boolean;
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    rose: "border-rose-100 bg-rose-50/70 text-rose-700",
  };

  return (
    <div
      className={cn(
        "rounded-lg border",
        compact ? "px-2.5 py-2" : "rounded-xl px-4 py-3.5",
        tones[tone],
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "shrink-0 opacity-80",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <p
          className={cn(
            "font-semibold uppercase tracking-wide opacity-80",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "font-bold tabular-nums text-slate-900",
          compact ? "mt-0.5 text-sm" : "mt-2 text-lg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function HelpdeskInfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
  full = false,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {label}
          </p>
          <div
            className={cn(
              "mt-1 text-sm font-medium text-slate-900 break-words [overflow-wrap:anywhere]",
              mono && "font-mono text-[13px]",
            )}
          >
            {value ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpdeskMetaGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

export function HelpdeskStatusGroup({
  bookingStatus,
  paymentStatus,
  refundStatus,
}: {
  bookingStatus: string;
  paymentStatus: string;
  refundStatus?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge
        status={bookingStatus}
        tone={bookingStatusTone(bookingStatus)}
      />
      <StatusBadge
        status={paymentStatus}
        tone={paymentStatusTone(paymentStatus)}
      />
      {refundStatus && refundStatus !== "NOT_APPLICABLE" ? (
        <StatusBadge
          status={refundStatus}
          tone={refundStatusTone(refundStatus)}
        />
      ) : null}
    </div>
  );
}

const TIMELINE_CONFIG: Record<
  string,
  { icon: LucideIcon; tone: string; label: string }
> = {
  BOOKED: {
    icon: CalendarDays,
    tone: "bg-sky-100 text-sky-700 ring-sky-200",
    label: "Booking created",
  },
  PAID: {
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    label: "Payment received",
  },
  LAST_UPDATED: {
    icon: RefreshCw,
    tone: "bg-slate-100 text-slate-600 ring-slate-200",
    label: "Last updated",
  },
  CANCELLED: {
    icon: Ban,
    tone: "bg-rose-100 text-rose-700 ring-rose-200",
    label: "Booking cancelled",
  },
  REFUNDED: {
    icon: RefreshCw,
    tone: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    label: "Refund completed",
  },
};

function timelineConfig(event: string) {
  const key = event.trim().toUpperCase();
  return (
    TIMELINE_CONFIG[key] || {
      icon: Clock3,
      tone: "bg-slate-100 text-slate-600 ring-slate-200",
      label: formatStatusLabel(event),
    }
  );
}

export function HelpdeskTimeline({
  events,
}: {
  events: HelpdeskTimelineEvent[];
}) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-500">No timeline events recorded.</p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {events.map((item, index) => {
        const config = timelineConfig(item.event);
        const Icon = config.icon;
        const isLast = index === events.length - 1;

        return (
          <li key={`${item.event}-${item.at}-${index}`} className="relative flex gap-3 pb-5">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-4 top-8 h-[calc(100%-12px)] w-px bg-slate-200"
              />
            ) : null}
            <div
              className={cn(
                "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                config.tone,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-slate-900">{config.label}</p>
              <p className="text-xs text-slate-500">
                {formatReportDateTime(item.at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function paymentAttemptTone(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("SUCCESS") || normalized.includes("PAID")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (
    normalized.includes("CANCEL") ||
    normalized.includes("FAIL") ||
    normalized.includes("ERROR")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function HelpdeskPaymentAttemptsTable({
  attempts,
}: {
  attempts: HelpdeskPaymentAttempt[];
}) {
  if (!attempts.length) {
    return <p className="text-sm text-slate-500">No payment attempts found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Method
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Transaction
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Time
            </th>
            <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {attempts.map((attempt, index) => (
            <tr key={`${attempt.paymentTransactionId || "attempt"}-${index}`}>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                    paymentAttemptTone(attempt.status),
                  )}
                >
                  {formatStatusLabel(attempt.status)}
                </span>
              </td>
              <td className="px-3 py-3 text-slate-700">
                {formatStatusLabel(attempt.paymentMethod)}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-slate-600">
                {attempt.paymentTransactionId || "—"}
              </td>
              <td className="px-3 py-3 text-slate-600">
                {formatReportDateTime(attempt.paymentTime)}
              </td>
              <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                {formatFinanceMoney(attempt.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreakupAmount({ line }: { line: HelpdeskBreakupLine }) {
  const amount = line.amount;
  const hasRateLabel = "rateLabel" in amount && amount.rateLabel;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 text-sm",
        line.emphasis && "border-t border-slate-200 pt-3 font-semibold",
      )}
    >
      <span className={cn("text-slate-600", line.emphasis && "text-slate-900")}>
        {hasRateLabel ? amount.rateLabel : line.label}
      </span>
      <span className="tabular-nums text-slate-900">
        {formatFinanceMoney(amount)}
      </span>
    </div>
  );
}

export function HelpdeskBreakupAccordion({
  title,
  breakup,
  defaultOpen = false,
}: {
  title: string;
  breakup: HelpdeskFinancialBreakup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!breakup.lines.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-200 px-4 pb-3 pt-1">
          {breakup.lines.map((line) => (
            <BreakupAmount key={line.key} line={line} />
          ))}
          {breakup.formula ? (
            <p className="mt-2 rounded-md bg-white px-3 py-2 font-mono text-[11px] text-slate-500">
              {breakup.formula}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HelpdeskActionButton({
  icon: Icon,
  children,
  onClick,
  variant = "secondary",
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
        variant === "primary"
          ? "bg-[#2f3d95] text-white hover:bg-[#252d73]"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export function formatStayLabel(
  checkIn?: string | null,
  checkOut?: string | null,
  nights?: number | null,
): string {
  if (!checkIn && !checkOut) return "—";
  const range = `${formatReportDate(checkIn)} → ${formatReportDate(checkOut)}`;
  if (nights != null && nights > 0) {
    return `${range} · ${nights} night${nights === 1 ? "" : "s"}`;
  }
  return range;
}

export function formatGuestCount(
  adult?: number | null,
  children?: number | null,
): string {
  const parts: string[] = [];
  if (adult != null) parts.push(`${adult} adult${adult === 1 ? "" : "s"}`);
  if (children != null && children > 0) {
    parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  }
  return parts.length ? parts.join(", ") : "—";
}

export function HelpdeskTag({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: React.ComponentType<LucideProps>;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function HelpdeskCopyChip({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="block truncate font-mono text-xs text-slate-800">
          {value}
        </span>
      </span>
    </button>
  );
}
