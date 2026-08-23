import { cn } from "@/lib/utils";
import {
  formatFinanceMoney,
  formatReportDate,
  formatReportDateTime,
  formatStatusLabel,
  ReportPageHeader,
  SummaryCard,
} from "@/features/reports/components/reportUiHelpers";
import { ReportJsonPanel } from "@/features/reports/components/ReportJsonPanel";
import type {
  PreviewBookingLine,
  SettlementDetail,
  SettlementPeriod,
} from "../services/settlementTypes";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  IndianRupee,
  ListOrdered,
  Loader2,
  Percent,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";

function hotelMisBookingUrl(
  bookingId?: string | number | null,
  bookingRef?: string | null,
): string | null {
  const id = bookingId ?? bookingRef;
  if (id == null || String(id).trim() === "") return null;
  return `${ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS}?bookingId=${encodeURIComponent(String(id))}`;
}

export type SettlementApiDebugState = {
  loading?: boolean;
  error?: string | null;
  responses: Record<string, unknown>;
};

export function settlementStatusTone(status?: string | null): string {
  const value = String(status || "").toUpperCase();
  if (value === "PENDING") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  if (value === "APPROVED") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (value === "REJECTED") {
    return "bg-rose-50 text-rose-800 ring-rose-200";
  }
  if (value === "PAYMENT_QUEUED" || value === "PAYMENT_PROCESSING") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }
  if (value === "PAID") {
    return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  }
  if (value === "FAILED") {
    return "bg-rose-100 text-rose-900 ring-rose-300";
  }
  if (value === "REVERSED") {
    return "bg-violet-50 text-violet-800 ring-violet-200";
  }
  if (value === "DISPUTED" || value === "UNDER_REVIEW") {
    return "bg-orange-50 text-orange-800 ring-orange-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function SettlementStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        settlementStatusTone(status),
        className,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function formatSettlementPeriod(period?: SettlementPeriod | null): string {
  if (!period?.from && !period?.to) return "—";
  if (period.from && period.to) {
    return `${formatReportDate(period.from)} – ${formatReportDate(period.to)}`;
  }
  return formatReportDate(period.from || period.to);
}

export function formatBlockedReason(code?: string | null): string {
  if (!code) return "—";
  return formatStatusLabel(code);
}

export function SettlementBankBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        verified
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-rose-50 text-rose-800 ring-rose-200",
      )}
    >
      {verified ? "Verified" : "Not verified"}
    </span>
  );
}

export function WorkbenchReadinessBadge({
  settlementReady,
  existingDraft,
  blockedReason,
}: {
  settlementReady: boolean;
  existingDraft: boolean;
  blockedReason?: string | null;
}) {
  if (existingDraft) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
        Pending exists
      </span>
    );
  }
  if (settlementReady) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
        Ready
      </span>
    );
  }
  return (
    <div className="space-y-0.5">
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
        Blocked
      </span>
      {blockedReason ? (
        <p className="text-[10px] leading-snug text-rose-600">
          {formatBlockedReason(blockedReason)}
        </p>
      ) : null}
    </div>
  );
}

export function WorkbenchItemsBreakdown({
  totalEligibleItems,
  completedItems,
  cancellationItems,
  partialCancellationItems,
}: {
  totalEligibleItems: number;
  completedItems: number;
  cancellationItems: number;
  partialCancellationItems: number;
}) {
  return (
    <div className="text-xs tabular-nums text-slate-700">
      <p className="font-semibold">{totalEligibleItems} eligible</p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {completedItems} completed
        {cancellationItems > 0 ? ` · ${cancellationItems} cancelled` : ""}
        {partialCancellationItems > 0
          ? ` · ${partialCancellationItems} partial`
          : ""}
      </p>
    </div>
  );
}

export function SettlementMoney({
  value,
  className,
}: {
  value?: { amount?: number | null; currency?: string } | null;
  className?: string;
}) {
  return (
    <span className={cn("font-sans font-semibold tabular-nums text-slate-900", className)}>
      {formatFinanceMoney(value)}
    </span>
  );
}

export function SettlementRefreshButton({
  onClick,
  loading,
  label = "Refresh",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

export function SettlementApiDebugPanel({
  apiDebug,
}: {
  apiDebug?: SettlementApiDebugState;
}) {
  if (!apiDebug) return null;
  const hasData = Object.keys(apiDebug.responses).length > 0;
  return (
    <div className="mt-4">
      <ReportJsonPanel
        title="API response (debug — copy and share for data mapping)"
        loading={apiDebug.loading}
        error={apiDebug.error}
        data={hasData ? apiDebug.responses : null}
      />
    </div>
  );
}

export function SettlementPageShell({
  title,
  subtitle,
  icon: Icon = FileText,
  iconClassName = "bg-gradient-to-br from-indigo-500 to-violet-600",
  actions,
  children,
  apiDebug,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  actions?: ReactNode;
  children: ReactNode;
  apiDebug?: SettlementApiDebugState;
}) {
  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
        <ReportPageHeader
          icon={Icon}
          iconClassName={iconClassName}
          title={title}
          description={subtitle}
          descriptionClassName="text-xs text-slate-500"
          borderClassName="border-indigo-100"
          actions={actions}
        />
        {children}
        <SettlementApiDebugPanel apiDebug={apiDebug} />
      </div>
    </div>
  );
}

export function SettlementKpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const displayValue =
    typeof value === "string" || typeof value === "number" ? value : "…";
  if (typeof value === "string" || typeof value === "number") {
    return <SummaryCard label={label} value={displayValue} tone={tone} />;
  }
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 shadow-sm",
        tone === "success" && "border-emerald-200 bg-emerald-50",
        tone === "warning" && "border-amber-200 bg-amber-50",
        tone === "danger" && "border-rose-200 bg-rose-50",
        tone === "default" && "border-slate-200 bg-white",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

export function SettlementPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="px-4 py-3.5 sm:px-5">{children}</div>
    </section>
  );
}

const SETTLEMENT_STAT_TONE: Record<
  "navy" | "emerald" | "amber" | "sky" | "violet" | "rose" | "slate",
  string
> = {
  navy: "bg-[#2f3d95]",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  sky: "bg-sky-600",
  violet: "bg-violet-600",
  rose: "bg-rose-600",
  slate: "bg-slate-500",
};

export function SettlementReportStatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "navy",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: LucideIcon;
  tone?: keyof typeof SETTLEMENT_STAT_TONE;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-0.5 font-sans text-lg font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </div>
          {sub ? (
            <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            SETTLEMENT_STAT_TONE[tone],
          )}
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function SettlementReportSection({
  title,
  description,
  children,
  action,
  flush,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export function SettlementMetaChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "brand" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone === "brand" && "bg-[#eef2ff] text-[#2f3d95] ring-[#2f3d95]/20",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tone === "default" && "bg-slate-100 text-slate-600 ring-slate-200/80",
      )}
    >
      {children}
    </span>
  );
}

export function SettlementDetailMeta({
  detail,
}: {
  detail: Pick<
    SettlementDetail,
    "supplierName" | "supplierType" | "component" | "period" | "cycle"
  >;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {detail.supplierName ? (
        <SettlementMetaChip tone="brand">{detail.supplierName}</SettlementMetaChip>
      ) : null}
      {detail.supplierType ? (
        <SettlementMetaChip>
          {formatStatusLabel(detail.supplierType)}
        </SettlementMetaChip>
      ) : null}
      {detail.component ? (
        <SettlementMetaChip>{formatStatusLabel(detail.component)}</SettlementMetaChip>
      ) : null}
      {detail.period ? (
        <SettlementMetaChip>
          {formatSettlementPeriod(detail.period)}
        </SettlementMetaChip>
      ) : null}
      {detail.cycle ? (
        <SettlementMetaChip>{formatStatusLabel(detail.cycle)}</SettlementMetaChip>
      ) : null}
    </div>
  );
}

export function SettlementDetailSummary({
  detail,
}: {
  detail: Pick<
    SettlementDetail,
    | "payableAmount"
    | "grossAmount"
    | "commission"
    | "tds"
    | "tcs"
    | "gst"
    | "adjustments"
    | "financialItemCount"
    | "lineItems"
  >;
}) {
  const lineCount =
    detail.financialItemCount ?? detail.lineItems?.length ?? 0;

  return (
    <div className="mb-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SettlementReportStatCard
          label="Payable"
          value={
            <span className="text-[#2f3d95]">
              <SettlementMoney value={detail.payableAmount} />
            </span>
          }
          icon={IndianRupee}
          tone="emerald"
        />
        <SettlementReportStatCard
          label="Gross"
          value={<SettlementMoney value={detail.grossAmount} />}
          icon={TrendingUp}
          tone="navy"
        />
        <SettlementReportStatCard
          label="Commission"
          value={<SettlementMoney value={detail.commission} />}
          icon={Percent}
          tone="violet"
        />
        <SettlementReportStatCard
          label="Line items"
          value={lineCount.toLocaleString("en-IN")}
          icon={ListOrdered}
          tone="sky"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs shadow-sm">
        <span className="text-slate-500">
          TDS{" "}
          <strong className="font-semibold text-slate-800">
            {formatFinanceMoney(detail.tds)}
          </strong>
        </span>
        <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
        <span className="text-slate-500">
          TCS{" "}
          <strong className="font-semibold text-slate-800">
            {formatFinanceMoney(detail.tcs)}
          </strong>
        </span>
        <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
        <span className="text-slate-500">
          GST{" "}
          <strong className="font-semibold text-slate-800">
            {formatFinanceMoney(detail.gst)}
          </strong>
        </span>
        <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
        <span className="text-slate-500">
          Adjustments{" "}
          <strong className="font-semibold text-slate-800">
            {formatFinanceMoney(detail.adjustments)}
          </strong>
        </span>
      </div>
    </div>
  );
}

export function SettlementMetaRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2f3d95]">
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <div
          className={cn(
            "mt-0.5 text-sm font-medium text-slate-900",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function SettlementWarningBanner({
  warnings,
}: {
  warnings: { code: string; message: string }[];
}) {
  if (!warnings.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {warnings.map((warning) => (
        <div
          key={`${warning.code}:${warning.message}`}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <span className="font-semibold">{warning.code}</span>
          {warning.message ? ` — ${warning.message}` : null}
        </div>
      ))}
    </div>
  );
}

export function captureSettlementApiError(err: unknown): Record<string, unknown> {
  if (err && typeof err === "object") {
    return err as Record<string, unknown>;
  }
  return { message: String(err || "Request failed") };
}

export function SettlementPreviewBookingsTable({
  bookings,
  limit,
  variant = "default",
}: {
  bookings: PreviewBookingLine[];
  limit?: number;
  variant?: "default" | "report";
}) {
  const visible = limit ? bookings.slice(0, limit) : bookings;
  const isReport = variant === "report";

  if (!visible.length) {
    return (
      <p
        className={cn(
          "px-3 py-8 text-center text-sm text-slate-500",
          !isReport && "rounded-lg border border-dashed border-slate-200 text-xs",
        )}
      >
        No booking line items in preview.
      </p>
    );
  }

  return (
    <div className={cn(!isReport && "overflow-hidden rounded-lg border border-slate-200")}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "min-w-full border-collapse",
            isReport ? "w-full text-sm" : "text-xs",
          )}
        >
          <thead>
            <tr
              className={cn(
                isReport
                  ? "border-b border-[#263578] bg-[#2f3d95] text-white"
                  : "bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500",
              )}
            >
              <th
                className={cn(
                  "text-left font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Booking
              </th>
              <th
                className={cn(
                  "text-left font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Reason
              </th>
              <th
                className={cn(
                  "text-left font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Service
              </th>
              <th
                className={cn(
                  "text-right font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Charge
              </th>
              <th
                className={cn(
                  "text-right font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Commission
              </th>
              <th
                className={cn(
                  "text-right font-semibold uppercase tracking-wide",
                  isReport ? "px-3 py-2.5 text-xs" : "px-2 py-2",
                )}
              >
                Payable
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map((line, idx) => {
              const bookingKey = String(
                line.bookingId || line.bookingRef || idx,
              );
              const bookingLabel = line.bookingRef || line.bookingId || "—";
              const bookingMisUrl = hotelMisBookingUrl(
                line.bookingId,
                line.bookingRef,
              );
              return (
                <tr
                  key={bookingKey}
                  className={cn(
                    "align-top",
                    isReport && "transition hover:bg-slate-50/80",
                  )}
                >
                  <td className={cn(isReport ? "px-3 py-3" : "px-2 py-2")}>
                    {bookingMisUrl ? (
                      <Link
                        to={bookingMisUrl}
                        className={cn(
                          "font-mono font-semibold text-[#2f3d95] hover:text-[#263578] hover:underline",
                          isReport ? "text-xs" : "text-[11px]",
                        )}
                      >
                        {bookingLabel}
                      </Link>
                    ) : (
                      <p
                        className={cn(
                          "font-mono font-semibold text-slate-800",
                          isReport ? "text-xs" : "text-[11px]",
                        )}
                      >
                        {bookingLabel}
                      </p>
                    )}
                    {line.cancelled ? (
                      <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        Cancelled
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(isReport ? "px-3 py-3" : "px-2 py-2")}>
                    <p className="font-medium text-slate-700">
                      {formatStatusLabel(line.settlementReason)}
                    </p>
                    {line.cancellationPolicyType &&
                    line.cancellationPolicyType !== "NOT_APPLICABLE" ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatStatusLabel(line.cancellationPolicyType)}
                      </p>
                    ) : null}
                    {line.commissionSource ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatStatusLabel(line.commissionSource)}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap text-slate-600",
                      isReport ? "px-3 py-3" : "px-2 py-2",
                    )}
                  >
                    {formatReportDate(
                      line.serviceDate || line.checkIn || line.checkOut,
                    )}
                  </td>
                  <td
                    className={cn(
                      "text-right",
                      isReport ? "px-3 py-3" : "px-2 py-2",
                    )}
                  >
                    <SettlementMoney
                      value={line.supplierCharge || line.grossAmount}
                    />
                    {line.customerPaid &&
                    line.supplierCharge &&
                    line.customerPaid.amount !== line.supplierCharge.amount ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Paid {formatFinanceMoney(line.customerPaid)}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      "text-right",
                      isReport ? "px-3 py-3" : "px-2 py-2",
                    )}
                  >
                    <SettlementMoney value={line.commission} />
                  </td>
                  <td
                    className={cn(
                      "text-right font-medium",
                      isReport ? "px-3 py-3" : "px-2 py-2",
                    )}
                  >
                    <SettlementMoney value={line.payableAmount} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {limit && bookings.length > limit ? (
        <p
          className={cn(
            "border-t border-slate-100 text-slate-400",
            isReport ? "px-4 py-2 text-xs" : "px-2 py-1.5 text-[11px]",
          )}
        >
          +{bookings.length - limit} more line items
        </p>
      ) : null}
    </div>
  );
}

export function SettlementFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SettlementFilterDrawer({
  open,
  onClose,
  onReset,
  onApply,
  applyDisabled,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-[120] bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-[130] flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-[11px] text-slate-500">
              Adjust criteria, then apply to refresh results
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {children}
        </div>
        <div className="flex gap-2 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}
