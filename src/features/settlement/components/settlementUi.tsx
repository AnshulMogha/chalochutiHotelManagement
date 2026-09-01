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
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { setStoredSelectedHotelId } from "@/lib/selectedHotelStorage";
import { appendReturnToQuery } from "@/lib/navigationReturn";

function settlementBookingUrl(
  bookingId?: string | number | null,
  bookingRef?: string | null,
  hotelId?: string | null,
  returnTo?: string | null,
): string | null {
  const params = new URLSearchParams();
  const hotel = hotelId?.trim();
  if (hotel) params.set("hotelId", hotel);
  appendReturnToQuery(params, returnTo);

  const numericId =
    bookingId != null && bookingId !== "" ? String(bookingId).trim() : "";
  if (/^\d+$/.test(numericId)) {
    const query = params.toString();
    return `${ROUTES.BOOKINGS.DETAIL(numericId)}${query ? `?${query}` : ""}`;
  }

  const searchBooking = String(bookingRef ?? bookingId ?? "").trim();
  if (!searchBooking) return null;
  params.set("bookingId", searchBooking);
  return `${ROUTES.BOOKINGS.LIST}?${params.toString()}`;
}

/** TRN-309 → 309 for transport booking MIS deep link. */
function extractTransportRequestId(
  bookingRef?: string | null,
  bookingId?: string | number | null,
): string | null {
  const raw = String(bookingRef ?? bookingId ?? "").trim();
  if (!raw) return null;
  const trnMatch = raw.match(/TRN-(\d+)/i);
  if (trnMatch?.[1]) return trnMatch[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
}

function transportBookingMisUrl(
  bookingId?: string | number | null,
  bookingRef?: string | null,
): string | null {
  const requestId = extractTransportRequestId(bookingRef, bookingId);
  if (!requestId) return null;
  return `${ROUTES.ADMIN.TRANSPORT}reports/booking-mis?requestId=${encodeURIComponent(requestId)}`;
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
  hotelId,
  component,
  limit,
  variant = "default",
  returnTo,
}: {
  bookings: PreviewBookingLine[];
  /** Hotel supplier id — required so Bookings top-bar selector has a hotel. */
  hotelId?: string | null;
  component?: string | null;
  limit?: number;
  variant?: "default" | "report";
  /** Where booking detail/list should return on Back (e.g. settlement detail URL). */
  returnTo?: string | null;
}) {
  const visible = limit ? bookings.slice(0, limit) : bookings;
  const isReport = variant === "report";
  const resolvedHotelId = hotelId?.trim() || null;
  const isTransport =
    String(component || "").toUpperCase() === "TRANSPORT";

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
              const bookingHref = isTransport
                ? transportBookingMisUrl(line.bookingId, line.bookingRef)
                : settlementBookingUrl(
                    line.bookingId,
                    line.bookingRef,
                    resolvedHotelId,
                    returnTo,
                  );
              const linkClassName = cn(
                "font-mono font-semibold text-[#2f3d95] hover:text-[#263578] hover:underline",
                isReport ? "text-xs" : "text-[11px]",
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
                    {bookingHref && isTransport ? (
                      <a
                        href={bookingHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClassName}
                      >
                        {bookingLabel}
                      </a>
                    ) : bookingHref ? (
                      <Link
                        to={bookingHref}
                        onClick={() => {
                          if (resolvedHotelId) {
                            setStoredSelectedHotelId(resolvedHotelId);
                          }
                        }}
                        className={linkClassName}
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

export type SettlementConfirmAction =
  | "generate"
  | "approve"
  | "release"
  | "retry";

const SETTLEMENT_CONFIRM_META: Record<
  SettlementConfirmAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    confirmClassName: string;
  }
> = {
  generate: {
    title: "Generate settlement?",
    description:
      "This creates a PENDING settlement. A different user must approve it before payout can be released.",
    confirmLabel: "Yes, generate settlement",
    confirmClassName: "bg-[#2f3d95] hover:bg-[#263578]",
  },
  approve: {
    title: "Approve settlement?",
    description:
      "You are approving this settlement for payout. Verify amounts and bookings before continuing.",
    confirmLabel: "Yes, approve settlement",
    confirmClassName: "bg-emerald-600 hover:bg-emerald-700",
  },
  release: {
    title: "Release payment?",
    description:
      "This queues payout to the supplier. This action cannot be undone from this screen.",
    confirmLabel: "Yes, release payment",
    confirmClassName: "bg-[#2f3d95] hover:bg-[#263578]",
  },
  retry: {
    title: "Retry payment?",
    description:
      "This re-queues a failed payout attempt. Confirm only if the underlying issue is resolved.",
    confirmLabel: "Yes, retry payment",
    confirmClassName: "bg-amber-600 hover:bg-amber-700",
  },
};

export function SettlementActionConfirmDialog({
  open,
  action,
  settlementNo,
  contextLines,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: SettlementConfirmAction;
  settlementNo?: string | null;
  contextLines?: string[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const meta = SETTLEMENT_CONFIRM_META[action];

  return (
    <>
      <button
        type="button"
        aria-label="Close confirmation"
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{meta.title}</h3>
          <button type="button" onClick={onClose} disabled={busy}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-600">{meta.description}</p>
        {settlementNo ? (
          <p className="mt-2 font-mono text-xs font-semibold text-slate-800">
            {settlementNo}
          </p>
        ) : null}
        {contextLines?.length ? (
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {contextLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs font-medium text-slate-500">
          Please confirm — this action will be submitted immediately.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50",
              meta.confirmClassName,
            )}
          >
            {busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </span>
            ) : (
              meta.confirmLabel
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export function SettlementRejectDialog({
  open,
  settlementNo,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  settlementNo: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [step, setStep] = useState<"reason" | "confirm">("reason");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("reason");
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  const trimmedReason = reason.trim();

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const proceedToConfirm = () => {
    if (!trimmedReason) return;
    setStep("confirm");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close reject dialog"
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={handleClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {step === "reason" ? "Reject settlement" : "Confirm rejection"}
          </h3>
          <button type="button" onClick={handleClose} disabled={busy}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {step === "reason" ? (
          <>
            <p className="mb-3 text-xs text-rose-700">
              You are about to reject {settlementNo}. The supplier will become
              eligible again in the workbench.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason (required)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!trimmedReason}
                onClick={proceedToConfirm}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Please confirm rejection of settlement{" "}
              <span className="font-mono font-semibold text-slate-900">
                {settlementNo}
              </span>
              .
            </p>
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-800">
              {trimmedReason}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              This cannot be undone from this screen.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("reason")}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm(trimmedReason)}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting…
                  </span>
                ) : (
                  "Yes, reject settlement"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
