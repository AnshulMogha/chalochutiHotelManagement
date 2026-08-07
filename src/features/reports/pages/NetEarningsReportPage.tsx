import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  exportStatusLabel,
  formatReportCurrency,
  formatReportDate,
  formatStatusLabel,
  ReportPageHeader,
} from "../components/reportUiHelpers";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  netEarningsReportService,
  type NetEarningsBookingDetail,
  type NetEarningsBookingStatus,
  type NetEarningsBookingType,
  type NetEarningsDatePreset,
  type NetEarningsPaymentStatus,
  type NetEarningsReportResponse,
} from "../services/netEarningsReportService";
import type { ExportJobStatus } from "../services/reportExportService";
import {
  Building2,
  CalendarDays,
  Download,
  Filter,
  Loader2,
  Search,
  Wallet,
  X,
} from "lucide-react";

const DEFAULT_DATE_PRESET: NetEarningsDatePreset = "THIS_MONTH";
const DEFAULT_BOOKING_STATUS: NetEarningsBookingStatus = "CONFIRMED";
const DEFAULT_BOOKING_TYPE: NetEarningsBookingType = "ALL";
const DEFAULT_PAYMENT_STATUS: NetEarningsPaymentStatus = "ALL";

const DATE_PRESET_OPTIONS: { value: NetEarningsDatePreset; label: string }[] = [
  { value: "THIS_MONTH", label: "Month Till Date" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "CUSTOM", label: "Custom" },
];

const BOOKING_STATUS_OPTIONS: { value: NetEarningsBookingStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ALL", label: "All" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

const BOOKING_TYPE_OPTIONS: { value: NetEarningsBookingType; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "HOTEL", label: "Hotel" },
  { value: "PACKAGE", label: "Package" },
];

const PAYMENT_STATUS_OPTIONS: { value: NetEarningsPaymentStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SETTLED", label: "Settled" },
];

type FilterDraft = {
  datePreset: NetEarningsDatePreset;
  bookingStatus: NetEarningsBookingStatus;
  bookingType: NetEarningsBookingType;
  paymentStatus: NetEarningsPaymentStatus;
  search: string;
  fromDate: string;
  toDate: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  bookingStatus: DEFAULT_BOOKING_STATUS,
  bookingType: DEFAULT_BOOKING_TYPE,
  paymentStatus: DEFAULT_PAYMENT_STATUS,
  search: "",
  fromDate: "",
  toDate: "",
};

function paymentStatusTone(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized.includes("SETTLED")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (normalized.includes("PENDING")) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function BookingDetailDrawer({
  open,
  detail,
  loading,
  onClose,
}: {
  open: boolean;
  detail: NetEarningsBookingDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="flex-1" onClick={onClose} aria-label="Close detail" />
      <div className="h-full w-full max-w-xl overflow-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-900">Booking Details</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Booking ID</p>
                    <p className="font-semibold">{detail.bookingId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">PNR</p>
                    <p className="font-semibold">{detail.pnr ?? "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Guest</p>
                    <p className="font-semibold">{detail.guestName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Stay</p>
                    <p className="font-semibold">
                      {formatReportDate(detail.checkInDate)} – {formatReportDate(detail.checkOutDate)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Earnings Breakup</h3>
                <div className="space-y-2">
                  {detail.earningsLines.map((line) => (
                    <div
                      key={`${line.code}-${line.label}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">
                        ({line.code}) {line.label}
                      </span>
                      <span className="font-semibold">{formatReportCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold">
                    <span>Payable to Property</span>
                    <span>{formatReportCurrency(detail.netPayable)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NetEarningsReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] = useState<NetEarningsDatePreset>(DEFAULT_DATE_PRESET);
  const [bookingStatus, setBookingStatus] =
    useState<NetEarningsBookingStatus>(DEFAULT_BOOKING_STATUS);
  const [bookingType, setBookingType] = useState<NetEarningsBookingType>(DEFAULT_BOOKING_TYPE);
  const [paymentStatus, setPaymentStatus] =
    useState<NetEarningsPaymentStatus>(DEFAULT_PAYMENT_STATUS);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] = useState<NetEarningsReportResponse | null>(null);
  const [detail, setDetail] = useState<NetEarningsBookingDetail | null>(null);
  const [activeBookingRef, setActiveBookingRef] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customRangeInvalid = datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (bookingStatus !== DEFAULT_BOOKING_STATUS ? 1 : 0) +
    (bookingType !== DEFAULT_BOOKING_TYPE ? 1 : 0) +
    (paymentStatus !== DEFAULT_PAYMENT_STATUS ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const openFilters = () => {
    setDraft({
      datePreset,
      bookingStatus,
      bookingType,
      paymentStatus,
      search,
      fromDate,
      toDate,
    });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    if (draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate)) {
      showToast("Select both from and to dates", "error");
      return;
    }
    setDatePreset(draft.datePreset);
    setBookingStatus(draft.bookingStatus);
    setBookingType(draft.bookingType);
    setPaymentStatus(draft.paymentStatus);
    setSearch(draft.search);
    setFromDate(draft.fromDate);
    setToDate(draft.toDate);
    setPage(0);
    setFilterOpen(false);
  };

  const clearAll = () => {
    setDraft(DEFAULT_DRAFT);
  };

  const loadReport = useCallback(async () => {
    if (!hotelId || customRangeInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        propertyIds: [hotelId],
        datePreset,
        fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
        toDate: datePreset === "CUSTOM" ? toDate : undefined,
        bookingStatus,
        bookingType,
        paymentStatus,
        search,
        page,
        size: pageSize,
      };
      const parsed = await netEarningsReportService.getReport(params);
      setReport(parsed);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    hotelId,
    customRangeInvalid,
    datePreset,
    fromDate,
    toDate,
    bookingStatus,
    bookingType,
    paymentStatus,
    search,
    page,
    showToast,
  ]);

  useEffect(() => {
    if (!hotelId || customRangeInvalid) return;
    loadReport();
  }, [hotelId, page, loadReport, customRangeInvalid]);

  const openDetail = async (bookingRef: string) => {
    setActiveBookingRef(bookingRef);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const parsed = await netEarningsReportService.getBookingDetail(bookingRef);
      setDetail(parsed);
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadExport = async () => {
    if (!hotelId || customRangeInvalid) return;
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await netEarningsReportService.exportReport({
        params: {
          propertyIds: [hotelId],
          datePreset,
          fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
          toDate: datePreset === "CUSTOM" ? toDate : undefined,
          bookingStatus,
          bookingType,
          paymentStatus,
        },
        defaultFileName: `net-earnings-${report?.dateRange.fromDate || "report"}`,
        onStatus: setExportStatus,
      });
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Payment Report</h1>
        <p className="mt-1 text-sm text-slate-500">Select a hotel from top bar.</p>
        <div className="mt-8 flex min-h-70 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <Building2 className="h-10 w-10 text-slate-300" />
        </div>
      </div>
    );
  }

  const summary = report?.summary;
  const totalPages = report?.page.totalPages ?? 0;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <BookingDetailDrawer
        open={Boolean(activeBookingRef)}
        detail={detail}
        loading={loadingDetail}
        onClose={() => setActiveBookingRef(null)}
      />
      <div className="min-h-full bg-[#f7f8fa]">
        <div className="container mx-auto px-4 py-4">
          <ReportPageHeader
            icon={Wallet}
            iconClassName="bg-linear-to-br from-emerald-600 to-teal-500"
            borderClassName="border-emerald-100"
            title="Payment Report"
            description="Net earnings and settlement details"
            actions={
              <button
                type="button"
                onClick={downloadExport}
                disabled={exporting || loading || customRangeInvalid}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting ? exportStatusLabel(exportStatus) || "Exporting…" : "Download Report"}
              </button>
            }
          />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
            {summary ? (
              <div className="flex flex-wrap items-center gap-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Net Bookings
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-slate-900">
                    {summary.netBookings}
                  </p>
                </div>
                <div className="hidden h-10 w-px bg-slate-200 sm:block" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Payable To Property
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-emerald-700">
                    {formatReportCurrency(summary.payableToProperty)}
                  </p>
                </div>
                <div className="hidden h-10 w-px bg-slate-200 md:block" />
                <div className="hidden md:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Payment Settled
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-slate-900">
                    {formatReportCurrency(summary.paymentSettled)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Transferred {formatReportCurrency(summary.amountTransferred)} + Adjusted{" "}
                    {formatReportCurrency(summary.amountAdjusted)}
                  </p>
                </div>
                <div className="hidden h-10 w-px bg-slate-200 lg:block" />
                <div className="hidden lg:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Payment Pending
                  </p>
                  <p className="text-xl font-extrabold tabular-nums text-amber-700">
                    {formatReportCurrency(summary.paymentPending)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Open Filter to load report</p>
            )}

            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={openFilters}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  activeFilterCount
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount ? (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              {report?.dateRange.fromDate ? (
                <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatReportDate(report.dateRange.fromDate)} –{" "}
                  {formatReportDate(report.dateRange.toDate)}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {[
                      "Booking ID",
                      "Guest Name",
                      "Stay Duration",
                      "Booking Status",
                      "Booking Amount",
                      "Payable To Property",
                      "Payment Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                      </td>
                    </tr>
                  ) : !report?.bookings.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                        No rows found.
                      </td>
                    </tr>
                  ) : (
                    report.bookings.map((row) => (
                      <tr
                        key={row.bookingRef}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => openDetail(row.bookingRef)}
                            className="font-semibold text-[#2f3d95] hover:underline"
                          >
                            {row.bookingId}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">{row.guestName}</td>
                        <td className="px-3 py-2.5">
                          Check-in: {formatReportDate(row.checkInDate)}
                          <div className="text-xs text-slate-500">
                            Checkout: {formatReportDate(row.checkOutDate)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{formatStatusLabel(row.bookingStatus)}</td>
                        <td className="px-3 py-2.5">
                          {formatReportCurrency(row.bookingAmount)}
                        </td>
                        <td className="px-3 py-2.5">
                          {formatReportCurrency(row.payableToProperty)}{" "}
                          <span className="text-xs text-slate-500">
                            ({formatReportCurrency(row.amountTransferred)})
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                              paymentStatusTone(row.paymentStatus),
                            )}
                          >
                            {formatStatusLabel(row.paymentStatus)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Filter</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Date range</h3>
                <label className="mb-1 block text-xs text-slate-500">Time period</label>
                <select
                  value={draft.datePreset}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: e.target.value as NetEarningsDatePreset,
                    }))
                  }
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {DATE_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {draft.datePreset === "CUSTOM" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">From</label>
                      <input
                        type="date"
                        value={draft.fromDate}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, fromDate: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">To</label>
                      <input
                        type="date"
                        value={draft.toDate}
                        min={draft.fromDate || undefined}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, toDate: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Booking status</h3>
                <div className="space-y-2">
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="bookingStatus"
                        checked={draft.bookingStatus === option.value}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            bookingStatus: option.value,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Booking type</h3>
                <div className="space-y-2">
                  {BOOKING_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="bookingType"
                        checked={draft.bookingType === option.value}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            bookingType: option.value,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Payment status</h3>
                <div className="space-y-2">
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={draft.paymentStatus === option.value}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            paymentStatus: option.value,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Search</h3>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={draft.search}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, search: e.target.value }))
                    }
                    placeholder="Search booking / guest / pnr"
                    className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-8 text-sm focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-sm font-semibold text-[#2f3d95] hover:underline"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                disabled={draftCustomInvalid}
                className="cursor-pointer rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#26317a] disabled:opacity-50"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
