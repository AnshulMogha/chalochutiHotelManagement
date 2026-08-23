import { Link, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  formatFinanceMoney,
  formatReportMoney,
  formatStatusLabel,
} from "./reportUiHelpers";
import type {
  PayoutMisDetailResponse,
  PayoutMisPaymentRow,
  PayoutMisSortField,
  PayoutMisSummary,
} from "../services/payoutMisTypes";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";

export function formatPayoutShortDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "short" });
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month} '${year}`;
  } catch {
    return value;
  }
}

export function formatStayOrTripDates(
  checkIn?: string | null,
  checkOut?: string | null,
  startDate?: string | null,
  endDate?: string | null,
): string {
  const from = checkIn ?? startDate;
  const to = checkOut ?? endDate;
  if (!from && !to) return "—";
  if (from && to) {
    return `${formatPayoutShortDate(from)} – ${formatPayoutShortDate(to)}`;
  }
  return formatPayoutShortDate(from ?? to);
}

function hotelScopedPath(path: string, hotelId?: string | null): string {
  const id = hotelId ?? getStoredSelectedHotelId();
  if (!id) return path;
  return `${path}?hotelId=${encodeURIComponent(id)}`;
}

export function PaymentsTabNav({
  active,
  showNetEarnings,
  hotelId,
}: {
  active: "net-earnings" | "payouts";
  showNetEarnings?: boolean;
  hotelId?: string | null;
}) {
  if (!showNetEarnings) return null;

  const netEarningsPath = hotelScopedPath(ROUTES.REPORTS.NET_EARNINGS, hotelId);
  const payoutsPath = hotelScopedPath(ROUTES.REPORTS.HOTEL_PAYOUTS, hotelId);

  return (
    <div className="mb-3 flex gap-5 border-b border-slate-200">
      <Link
        to={netEarningsPath}
        className={cn(
          "border-b-2 pb-2 text-sm font-semibold transition",
          active === "net-earnings"
            ? "border-blue-600 text-blue-700"
            : "border-transparent text-slate-500 hover:text-slate-800",
        )}
      >
        Net Earnings
      </Link>
      <Link
        to={payoutsPath}
        className={cn(
          "border-b-2 pb-2 text-sm font-semibold transition",
          active === "payouts"
            ? "border-blue-600 text-blue-700"
            : "border-transparent text-slate-500 hover:text-slate-800",
        )}
      >
        Payouts
      </Link>
    </div>
  );
}

export function PayoutSummaryStrip({ summary }: { summary: PayoutMisSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Payments Made
        </p>
        <p className="text-xl font-extrabold tabular-nums text-slate-900">
          {summary.paymentsMade}
        </p>
      </div>
      <div className="hidden h-9 w-px bg-slate-200 sm:block" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Bookings Count
        </p>
        <p className="text-xl font-extrabold tabular-nums text-slate-900">
          {summary.bookingsCount}
        </p>
      </div>
      <div className="hidden h-9 w-px bg-slate-200 md:block" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Payment Settled
        </p>
        <p className="text-xl font-extrabold tabular-nums text-slate-900">
          {formatReportMoney(summary.paymentSettled)}
        </p>
        <p className="text-[11px] text-slate-400">
          Transferred {formatReportMoney(summary.amountTransferred)} + Adjusted{" "}
          {formatReportMoney(summary.amountAdjusted)}
        </p>
      </div>
    </div>
  );
}

/** @deprecated Use PayoutSummaryStrip */
export function PayoutSummaryBanner({ summary }: { summary: PayoutMisSummary }) {
  return <PayoutSummaryStrip summary={summary} />;
}

export function SortableHeader({
  label,
  field,
  activeField,
  activeDir,
  onSort,
  info,
}: {
  label: string;
  field: PayoutMisSortField;
  activeField: PayoutMisSortField;
  activeDir: "asc" | "desc";
  onSort: (field: PayoutMisSortField) => void;
  info?: boolean;
}) {
  const isActive = activeField === field;
  const Icon = isActive
    ? activeDir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-left font-semibold text-slate-700 hover:text-slate-900"
    >
      <span>{label}</span>
      {info ? <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden /> : null}
      <Icon className={cn("h-3.5 w-3.5", isActive ? "text-blue-600" : "text-slate-400")} />
    </button>
  );
}

function creditStatusBadge(status?: string | null) {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  if (normalized.includes("CREDIT")) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        {formatStatusLabel(status)}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
      {formatStatusLabel(status)}
    </span>
  );
}

export function PayoutDetailDrawer({
  open,
  loading,
  detail,
  variant,
  onClose,
  onExport,
  exporting,
}: {
  open: boolean;
  loading: boolean;
  detail: PayoutMisDetailResponse | null;
  variant: "hotel" | "transport";
  onClose: () => void;
  onExport?: () => void;
  exporting?: boolean;
}) {
  if (!open) return null;

  const dateColumnLabel = variant === "hotel" ? "Stay Duration" : "Trip Dates";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="flex-1" onClick={onClose} aria-label="Close detail" />
      <div className="h-full w-full max-w-2xl overflow-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-lg font-bold text-slate-900">Payment Settlement Details</h2>
          <div className="flex items-center gap-2">
            {onExport ? (
              <button
                type="button"
                onClick={onExport}
                disabled={exporting || loading || !detail}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Statement
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : detail ? (
            <>
              <section className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Payment Transaction Details
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Payment status" value={formatStatusLabel(detail.paymentStatus)} />
                  <DetailItem
                    label="Payment reference number / UTR"
                    value={detail.paymentReferenceNumber}
                    mono
                  />
                  <DetailItem
                    label="Payment Date"
                    value={formatPayoutShortDate(detail.paymentDate)}
                  />
                  <DetailItem label="Payment Type" value={detail.paymentType} />
                  <DetailItem label="Number of bookings" value={String(detail.bookingCount)} />
                  <DetailItem
                    label="Bank account details"
                    value={
                      detail.bankAccountMasked
                        ? `Transferred to ${detail.bankAccountMasked}`
                        : "—"
                    }
                  />
                </dl>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Payment Settled Breakup
                </h3>
                <div className="space-y-2 text-sm">
                  <BreakupRow
                    label="(A) Net Earnings"
                    value={formatFinanceMoney(detail.netEarnings)}
                  />
                  <BreakupRow
                    label="(B) Amount adjusted"
                    value={formatFinanceMoney(detail.amountAdjusted)}
                  />
                  <BreakupRow
                    label="Amount Transferred (A-B)"
                    value={formatFinanceMoney(detail.amountTransferred)}
                    strong
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Payment Settlement Details from {detail.bookingCount} booking
                    {detail.bookingCount === 1 ? "" : "s"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {formatFinanceMoney(detail.amountTransferred)}
                    </span>
                    {creditStatusBadge("CREDITED")}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Booking ID (PNR)</th>
                        <th className="px-4 py-2.5 font-semibold">{dateColumnLabel}</th>
                        <th className="px-4 py-2.5 font-semibold">Booking Amount</th>
                        <th className="px-4 py-2.5 font-semibold">Amount Transferred</th>
                        <th className="px-4 py-2.5 font-semibold">Amount Adjusted</th>
                        <th className="px-4 py-2.5 font-semibold">Adjustment Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.bookings.map((row) => (
                        <tr key={`${row.bookingId}-${row.bookingReference}`}>
                          <td className="px-4 py-3 font-mono text-xs text-blue-700">
                            {row.bookingReference || row.bookingId}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatStayOrTripDates(
                              row.checkIn,
                              row.checkOut,
                              row.startDate,
                              row.endDate,
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatFinanceMoney(row.bookingAmount)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatFinanceMoney(row.amountTransferred)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatFinanceMoney(row.amountAdjusted)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.adjustmentReason?.trim() || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-slate-500">No payment details found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-semibold text-slate-900", mono && "font-mono")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function BreakupRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-slate-600", strong && "font-semibold text-slate-900")}>
        {label}
      </span>
      <span className={cn("tabular-nums text-slate-900", strong && "text-base font-bold")}>
        {value}
      </span>
    </div>
  );
}

export function PayoutPaymentsTable({
  rows,
  sortField,
  sortDir,
  onSort,
  onOpenDetail,
  onRowExport,
  rowExportingRef,
  loading,
}: {
  rows: PayoutMisPaymentRow[];
  sortField: PayoutMisSortField;
  sortDir: "asc" | "desc";
  onSort: (field: PayoutMisSortField) => void;
  onOpenDetail: (paymentReference: string) => void;
  onRowExport: (paymentReference: string) => void;
  rowExportingRef?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span className="inline-flex items-center gap-1">
                Payment Ref
                <Info className="h-3 w-3 text-slate-400" aria-hidden />
              </span>
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <SortableHeader
                label="Payment Date"
                field="PAYMENT_DATE"
                activeField={sortField}
                activeDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <SortableHeader
                label="Bookings"
                field="BOOKING_COUNT"
                activeField={sortField}
                activeDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <SortableHeader
                label="Settled"
                field="PAYMENTS_SETTLED"
                activeField={sortField}
                activeDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <SortableHeader
                label="Transferred"
                field="AMOUNT_TRANSFERRED"
                activeField={sortField}
                activeDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <SortableHeader
                label="Adjusted"
                field="AMOUNT_ADJUSTED"
                activeField={sortField}
                activeDir={sortDir}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Export
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                No payout records found for the selected filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.paymentReferenceNumber}
                className="border-b border-slate-50 hover:bg-slate-50/60"
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(row.paymentReferenceNumber)}
                    className="font-mono text-xs font-semibold text-[#2f3d95] hover:underline"
                  >
                    {row.paymentReferenceNumber}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-slate-700">
                  {formatPayoutShortDate(row.paymentDate)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                  {row.bookingCount}
                </td>
                <td className="px-3 py-2.5 tabular-nums font-medium text-slate-900">
                  {formatReportMoney(row.paymentsSettled)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                  {formatReportMoney(row.amountTransferred)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                  {formatReportMoney(row.amountAdjusted)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onRowExport(row.paymentReferenceNumber)}
                    disabled={rowExportingRef === row.paymentReferenceNumber}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
                  >
                    {rowExportingRef === row.paymentReferenceNumber ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function useHotelIdFromUrl(): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get("hotelId") ?? getStoredSelectedHotelId();
}

export function useVendorIdFromUrl(): number | null {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("vendorId");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
