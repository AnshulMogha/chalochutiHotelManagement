import { Link, useLocation, useSearchParams } from "react-router";
import type { GridColDef } from "@mui/x-data-grid";
import { DataTable, formatListCount } from "@/components/ui";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import { appendReturnToQuery } from "@/lib/navigationReturn";
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

function payoutBookingUrl(
  variant: "hotel" | "transport",
  bookingId?: string | null,
  bookingReference?: string | null,
  returnTo?: string,
): string | null {
  const id = String(bookingId ?? "").trim();
  const reference = String(bookingReference ?? "").trim();

  if (variant === "transport") {
    const raw = reference || id;
    const requestId = raw.match(/TRN-(\d+)/i)?.[1] || (/^\d+$/.test(raw) ? raw : "");
    return requestId
      ? `${ROUTES.ADMIN.TRANSPORT_BOOKING_MIS}?requestId=${encodeURIComponent(requestId)}`
      : null;
  }

  const params = new URLSearchParams();
  const hotelId = getStoredSelectedHotelId();
  if (hotelId) params.set("hotelId", hotelId);
  appendReturnToQuery(params, returnTo);

  if (/^\d+$/.test(id)) {
    const query = params.toString();
    return `${ROUTES.BOOKINGS.DETAIL(id)}${query ? `?${query}` : ""}`;
  }

  const lookup = reference || id;
  if (!lookup) return null;
  params.set("bookingId", lookup);
  return `${ROUTES.BOOKINGS.LIST}?${params.toString()}`;
}

export function PaymentsTabNav({
  active,
  showNetEarnings,
  showPayouts = true,
  hotelId,
}: {
  active: "net-earnings" | "payouts";
  showNetEarnings?: boolean;
  /** When false, hide Payouts (e.g. Hotel Accountant with Payment Report only). */
  showPayouts?: boolean;
  hotelId?: string | null;
}) {
  if (!showNetEarnings && !showPayouts) return null;

  const netEarningsPath = hotelScopedPath(ROUTES.REPORTS.NET_EARNINGS, hotelId);
  const payoutsPath = hotelScopedPath(ROUTES.REPORTS.HOTEL_PAYOUTS, hotelId);

  return (
    <div className="flex items-center gap-1">
      {showNetEarnings ? (
        <Link
          to={netEarningsPath}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
            active === "net-earnings"
              ? "bg-[#2f3d95] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          Net Earnings
        </Link>
      ) : null}
      {showPayouts ? (
        <Link
          to={payoutsPath}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
            active === "payouts"
              ? "bg-[#2f3d95] text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          Payouts
        </Link>
      ) : null}
    </div>
  );
}

export function PayoutSummaryStrip({ summary }: { summary: PayoutMisSummary }) {
  const cards = [
    {
      label: "Payments Made",
      value: summary.paymentsMade,
      sub: null as string | null,
      card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
      labelTone: "text-sky-700",
    },
    {
      label: "Bookings Count",
      value: summary.bookingsCount,
      sub: null as string | null,
      card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
      labelTone: "text-indigo-700",
    },
    {
      label: "Payment Settled",
      value: formatReportMoney(summary.paymentSettled),
      sub: `Transferred ${formatReportMoney(summary.amountTransferred)} + Adjusted ${formatReportMoney(summary.amountAdjusted)}`,
      card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
      labelTone: "text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {cards.map((item) => (
        <div
          key={item.label}
          className={cn("rounded-lg border px-3 py-2 shadow-sm", item.card)}
        >
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              item.labelTone,
            )}
          >
            {item.label}
          </p>
          <p className="text-xl font-extrabold tabular-nums text-slate-900">
            {item.value}
          </p>
          {item.sub ? (
            <p className="text-[11px] text-slate-500">{item.sub}</p>
          ) : null}
        </div>
      ))}
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

function paymentStatusBadge(status?: string | null) {
  if (!status) return <span className="text-slate-400">—</span>;
  const normalized = status.trim().toUpperCase();
  const tone =
    normalized === "PAID" || normalized.includes("SETTLED") || normalized.includes("CREDIT")
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : normalized.includes("PENDING") || normalized.includes("PROCESS")
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : normalized.includes("FAIL") || normalized.includes("REJECT")
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        tone,
      )}
    >
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
  const location = useLocation();
  if (!open) return null;

  const dateColumnLabel = variant === "hotel" ? "Stay Duration" : "Trip Dates";
  const returnTo = `${location.pathname}${location.search}`;

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
                  <DetailItem
                    label="Settlement No"
                    value={detail.settlementNo}
                    mono
                  />
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
                <DataTable
                  rows={detail.bookings.map((row) => ({
                    ...row,
                    id: `${row.bookingId}-${row.bookingReference}`,
                  }))}
                  columns={
                    [
                      {
                        field: "bookingReference",
                        headerName: "Booking ID (PNR)",
                        flex: 1.1,
                        minWidth: 160,
                        sortable: false,
                        renderCell: (params) => {
                          const bookingHref = payoutBookingUrl(
                            variant,
                            params.row.bookingId,
                            params.row.bookingReference,
                            returnTo,
                          );
                          const label =
                            params.row.bookingReference || params.row.bookingId;
                          return bookingHref ? (
                            <Link
                              to={bookingHref}
                              state={{ returnTo }}
                              className="truncate font-mono text-xs font-semibold text-blue-700 hover:underline"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className="truncate font-mono text-xs text-slate-600">
                              {label}
                            </span>
                          );
                        },
                      },
                      {
                        field: "dates",
                        headerName: dateColumnLabel,
                        flex: 1,
                        minWidth: 150,
                        sortable: false,
                        renderCell: (params) =>
                          formatStayOrTripDates(
                            params.row.checkIn,
                            params.row.checkOut,
                            params.row.startDate,
                            params.row.endDate,
                          ),
                      },
                      {
                        field: "bookingAmount",
                        headerName: "Booking Amount",
                        width: 140,
                        sortable: false,
                        renderCell: (params) => (
                          <span className="tabular-nums">
                            {formatFinanceMoney(params.row.bookingAmount)}
                          </span>
                        ),
                      },
                      {
                        field: "amountTransferred",
                        headerName: "Amount Transferred",
                        width: 160,
                        sortable: false,
                        renderCell: (params) => (
                          <span className="tabular-nums">
                            {formatFinanceMoney(params.row.amountTransferred)}
                          </span>
                        ),
                      },
                      {
                        field: "amountAdjusted",
                        headerName: "Amount Adjusted",
                        width: 150,
                        sortable: false,
                        renderCell: (params) => (
                          <span className="tabular-nums">
                            {formatFinanceMoney(params.row.amountAdjusted)}
                          </span>
                        ),
                      },
                      {
                        field: "adjustmentReason",
                        headerName: "Adjustment Reason",
                        flex: 1,
                        minWidth: 160,
                        sortable: false,
                        renderCell: (params) =>
                          params.row.adjustmentReason?.trim() || "—",
                      },
                    ] satisfies GridColDef<(typeof detail.bookings)[number] & { id: string }>[]
                  }
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  disableColumnFilter
                  showToolbar={false}
                  showExport={false}
                  allowHorizontalScroll
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 20 } },
                  }}
                  className="rounded-none border-0 shadow-none"
                  localeText={{ noRowsLabel: "No bookings in this settlement." }}
                />
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
  page,
  pageSize,
  rowCount,
  onPageChange,
}: {
  rows: PayoutMisPaymentRow[];
  sortField: PayoutMisSortField;
  sortDir: "asc" | "desc";
  onSort: (field: PayoutMisSortField) => void;
  onOpenDetail: (paymentReference: string) => void;
  onRowExport: (paymentReference: string) => void;
  rowExportingRef?: string | null;
  loading?: boolean;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
}) {
  const columns: GridColDef<PayoutMisPaymentRow>[] = [
    {
      field: "paymentReferenceNumber",
      headerName: "Payment Ref",
      width: 180,
      sortable: false,
      renderHeader: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Payment Ref
          <Info className="h-3 w-3 text-slate-400" aria-hidden />
        </span>
      ),
      renderCell: (params) => (
        <button
          type="button"
          onClick={() => onOpenDetail(params.row.paymentReferenceNumber)}
          className="font-mono text-xs font-semibold text-[#2f3d95] hover:underline"
        >
          {params.row.paymentReferenceNumber}
        </button>
      ),
    },
    {
      field: "settlementNo",
      headerName: "Settlement No",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <span className="font-mono text-xs text-slate-700">
          {params.row.settlementNo || "—"}
        </span>
      ),
    },
    {
      field: "hotelName",
      headerName: "Hotel Name",
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <span className="truncate text-slate-700" title={params.row.hotelName || undefined}>
          {params.row.hotelName || "—"}
        </span>
      ),
    },
    {
      field: "paymentDate",
      headerName: "Payment Date",
      width: 150,
      sortable: false,
      renderHeader: () => (
        <SortableHeader
          label="Payment Date"
          field="PAYMENT_DATE"
          activeField={sortField}
          activeDir={sortDir}
          onSort={onSort}
        />
      ),
      renderCell: (params) => formatPayoutShortDate(params.row.paymentDate),
    },
    {
      field: "bookingCount",
      headerName: "Bookings",
      width: 120,
      sortable: false,
      renderHeader: () => (
        <SortableHeader
          label="Bookings"
          field="BOOKING_COUNT"
          activeField={sortField}
          activeDir={sortDir}
          onSort={onSort}
        />
      ),
      renderCell: (params) => (
        <span className="tabular-nums text-slate-800">{params.row.bookingCount}</span>
      ),
    },
    {
      field: "paymentsSettled",
      headerName: "Settled",
      width: 140,
      sortable: false,
      renderHeader: () => (
        <SortableHeader
          label="Settled"
          field="PAYMENTS_SETTLED"
          activeField={sortField}
          activeDir={sortDir}
          onSort={onSort}
        />
      ),
      renderCell: (params) => (
        <span className="tabular-nums font-medium text-slate-900">
          {formatReportMoney(params.row.paymentsSettled)}
        </span>
      ),
    },
    {
      field: "amountTransferred",
      headerName: "Transferred",
      width: 140,
      sortable: false,
      renderHeader: () => (
        <SortableHeader
          label="Transferred"
          field="AMOUNT_TRANSFERRED"
          activeField={sortField}
          activeDir={sortDir}
          onSort={onSort}
        />
      ),
      renderCell: (params) => (
        <span className="tabular-nums text-slate-800">
          {formatReportMoney(params.row.amountTransferred)}
        </span>
      ),
    },
    {
      field: "amountAdjusted",
      headerName: "Adjusted",
      width: 130,
      sortable: false,
      renderHeader: () => (
        <SortableHeader
          label="Adjusted"
          field="AMOUNT_ADJUSTED"
          activeField={sortField}
          activeDir={sortDir}
          onSort={onSort}
        />
      ),
      renderCell: (params) => (
        <span className="tabular-nums text-slate-800">
          {formatReportMoney(params.row.amountAdjusted)}
        </span>
      ),
    },
    {
      field: "paymentStatus",
      headerName: "Status",
      width: 130,
      sortable: false,
      renderCell: (params) => paymentStatusBadge(params.row.paymentStatus),
    },
    {
      field: "export",
      headerName: "Export",
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <button
          type="button"
          onClick={() => onRowExport(params.row.paymentReferenceNumber)}
          disabled={rowExportingRef === params.row.paymentReferenceNumber}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
        >
          {rowExportingRef === params.row.paymentReferenceNumber ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download
        </button>
      ),
    },
  ];

  return (
    <DataTable
      title="Payment Settlement Details"
      subtitle={
        <span className="text-slate-500">
          {formatListCount(rowCount, "payment")} · Page {page + 1} of{" "}
          {Math.max(Math.ceil(rowCount / pageSize) || 1, 1)}
        </span>
      }
      rows={rows}
      columns={columns}
      getRowId={(row) => row.paymentReferenceNumber}
      loading={loading}
      paginationMode="server"
      rowCount={rowCount}
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={(model) => {
        if (model.page !== page) onPageChange(model.page);
      }}
      pageSizeOptions={[pageSize]}
      disableRowSelectionOnClick
      disableColumnFilter
      showToolbar
      showExport={false}
      allowHorizontalScroll
      localeText={{
        noRowsLabel: "No payout records found for the selected filters.",
      }}
    />
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
