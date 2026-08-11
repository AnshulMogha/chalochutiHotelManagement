import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  format,
  startOfMonth,
  subDays,
  subMonths,
  startOfDay,
  endOfMonth,
} from "date-fns";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  adminService,
  type HotelLookupItem,
} from "@/features/admin/services/adminService";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  FINANCE_KPI_TONES,
  FinanceKpiCard,
  StatusBadge,
  bookingStatusTone,
  cacheFinancialMisRow,
  getHotelFinancialMisDisplaySellingPrice,
  isHotelFinancialMisB2b,
  paymentStatusTone,
  refundStatusTone,
} from "../components/hotelFinancialMisUi";
import {
  ReportPageHeader,
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
} from "../components/reportUiHelpers";
import {
  hotelBookingFinancialMisService,
  type HotelFinancialMisBookingRow,
  type HotelFinancialMisBookingSource,
  type HotelFinancialMisBookingStatus,
  type HotelFinancialMisDateAxis,
  type HotelFinancialMisPaymentStatus,
  type HotelFinancialMisRefundStatus,
  type HotelFinancialMisReportResponse,
  type HotelFinancialMisSort,
} from "../services/hotelBookingFinancialMisService";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Filter,
  HandCoins,
  Landmark,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  Target,
  Percent,
  Wallet,
  X,
} from "lucide-react";

type UiDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

type DetailTab =
  | "overview"
  | "bookingDetails"
  | "customer"
  | "hotelPayout"
  | "otaRevenue"
  | "cancellation"
  | "payment";

type FilterDraft = {
  uiDatePreset: UiDatePreset;
  fromDate: string;
  toDate: string;
  dateAxis: HotelFinancialMisDateAxis;
  bookingStatus: HotelFinancialMisBookingStatus;
  bookingSource: HotelFinancialMisBookingSource;
  paymentStatus: HotelFinancialMisPaymentStatus;
  refundStatus: HotelFinancialMisRefundStatus;
  hotelId: string;
  search: string;
  sort: HotelFinancialMisSort;
  sortDir: "asc" | "desc";
  checkInFrom: string;
  checkInTo: string;
  checkOutFrom: string;
  checkOutTo: string;
};

const PAGE_SIZE = 20;

const DEFAULT_DRAFT: FilterDraft = {
  uiDatePreset: "THIS_MONTH",
  fromDate: "",
  toDate: "",
  dateAxis: "BOOKING_DATE",
  bookingStatus: "ALL",
  bookingSource: "ALL",
  paymentStatus: "ALL",
  refundStatus: "ALL",
  hotelId: "",
  search: "",
  sort: "BOOKING_DATE",
  sortDir: "desc",
  checkInFrom: "",
  checkInTo: "",
  checkOutFrom: "",
  checkOutTo: "",
};

const UI_DATE_PRESET_OPTIONS: { value: UiDatePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom" },
];

const DATE_AXIS_OPTIONS: { value: HotelFinancialMisDateAxis; label: string }[] =
  [
    { value: "BOOKING_DATE", label: "Booking date" },
    { value: "CHECK_IN", label: "Check-in" },
    { value: "CHECK_OUT", label: "Check-out" },
  ];

const BOOKING_STATUS_OPTIONS: {
  value: HotelFinancialMisBookingStatus;
  label: string;
}[] = [
  { value: "ALL", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
];

const BOOKING_SOURCE_OPTIONS: {
  value: HotelFinancialMisBookingSource;
  label: string;
}[] = [
  { value: "ALL", label: "All sources" },
  { value: "HOTEL", label: "Hotel (B2C/B2B)" },
  { value: "PACKAGE", label: "Package" },
];

const PAYMENT_STATUS_OPTIONS: {
  value: HotelFinancialMisPaymentStatus;
  label: string;
}[] = [
  { value: "ALL", label: "All payments" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PENDING", label: "Pending" },
];

const REFUND_STATUS_OPTIONS: {
  value: HotelFinancialMisRefundStatus;
  label: string;
}[] = [
  { value: "ALL", label: "All refunds" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSED", label: "Processed" },
];

const SORT_OPTIONS: { value: HotelFinancialMisSort; label: string }[] = [
  { value: "BOOKING_DATE", label: "Booking date" },
  { value: "CHECK_IN", label: "Check-in" },
  { value: "CHECK_OUT", label: "Check-out" },
  { value: "BOOKING_REF", label: "Booking ref" },
  { value: "HOTEL_NAME", label: "Hotel name" },
  { value: "CUSTOMER_SELLING_PRICE", label: "Customer price" },
  { value: "HOTEL_PAYOUT", label: "Hotel payout" },
  { value: "OTA_REVENUE", label: "OTA revenue" },
  { value: "AMOUNT_COLLECTED", label: "Amount collected" },
  { value: "LAST_UPDATED", label: "Last updated" },
];

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function defaultCustomRange(): { fromDate: string; toDate: string } {
  const today = startOfDay(new Date());
  return {
    fromDate: toIsoDate(startOfMonth(today)),
    toDate: toIsoDate(today),
  };
}

function resolveApiDateRange(draft: FilterDraft): {
  datePreset: "THIS_MONTH" | "CUSTOM";
  fromDate?: string;
  toDate?: string;
} {
  if (draft.uiDatePreset === "THIS_MONTH") {
    return { datePreset: "THIS_MONTH" };
  }
  if (draft.uiDatePreset === "CUSTOM") {
    return {
      datePreset: "CUSTOM",
      fromDate: draft.fromDate || undefined,
      toDate: draft.toDate || undefined,
    };
  }

  const today = startOfDay(new Date());
  if (draft.uiDatePreset === "TODAY") {
    const day = toIsoDate(today);
    return { datePreset: "CUSTOM", fromDate: day, toDate: day };
  }
  if (draft.uiDatePreset === "YESTERDAY") {
    const day = toIsoDate(subDays(today, 1));
    return { datePreset: "CUSTOM", fromDate: day, toDate: day };
  }
  if (draft.uiDatePreset === "LAST_7_DAYS") {
    return {
      datePreset: "CUSTOM",
      fromDate: toIsoDate(subDays(today, 6)),
      toDate: toIsoDate(today),
    };
  }
  if (draft.uiDatePreset === "LAST_30_DAYS") {
    return {
      datePreset: "CUSTOM",
      fromDate: toIsoDate(subDays(today, 29)),
      toDate: toIsoDate(today),
    };
  }
  const lastMonth = subMonths(today, 1);
  return {
    datePreset: "CUSTOM",
    fromDate: toIsoDate(startOfMonth(lastMonth)),
    toDate: toIsoDate(endOfMonth(lastMonth)),
  };
}

function FilterField({
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

export default function HotelBookingFinancialMisPage() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<HotelLookupItem[]>([]);
  const [hotelQuery, setHotelQuery] = useState("");

  const [report, setReport] = useState<HotelFinancialMisReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customInvalid =
    filters.uiDatePreset === "CUSTOM" &&
    (!filters.fromDate || !filters.toDate);
  const draftCustomInvalid =
    draft.uiDatePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.uiDatePreset !== "THIS_MONTH") count += 1;
    if (filters.dateAxis !== "BOOKING_DATE") count += 1;
    if (filters.bookingStatus !== "ALL") count += 1;
    if (filters.bookingSource !== "ALL") count += 1;
    if (filters.paymentStatus !== "ALL") count += 1;
    if (filters.refundStatus !== "ALL") count += 1;
    if (filters.hotelId) count += 1;
    if (filters.search.trim()) count += 1;
    if (filters.checkInFrom || filters.checkInTo) count += 1;
    if (filters.checkOutFrom || filters.checkOutTo) count += 1;
    if (filters.sort !== "BOOKING_DATE" || filters.sortDir !== "desc") count += 1;
    return count;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getSuperAdminHotelLookup("")
      .then((hotels) => {
        if (!cancelled) setHotelOptions(hotels);
      })
      .catch(() => {
        if (!cancelled) setHotelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredHotels = useMemo(() => {
    const query = hotelQuery.trim().toLowerCase();
    if (!query) return hotelOptions.slice(0, 80);
    return hotelOptions
      .filter((hotel) => {
        const haystack =
          `${hotel.hotelName} ${hotel.hotelCode ?? ""} ${hotel.city ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 80);
  }, [hotelOptions, hotelQuery]);

  const loadReport = useCallback(
    async (
      nextFilters: FilterDraft = filters,
      nextPage: number = page,
    ) => {
      if (
        nextFilters.uiDatePreset === "CUSTOM" &&
        (!nextFilters.fromDate || !nextFilters.toDate)
      ) {
        return;
      }

      const dateRange = resolveApiDateRange(nextFilters);
      if (
        dateRange.datePreset === "CUSTOM" &&
        (!dateRange.fromDate || !dateRange.toDate)
      ) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await hotelBookingFinancialMisService.getReport({
          datePreset: dateRange.datePreset,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          dateAxis: nextFilters.dateAxis,
          bookingStatus: nextFilters.bookingStatus,
          bookingSource: nextFilters.bookingSource,
          paymentStatus: nextFilters.paymentStatus,
          refundStatus: nextFilters.refundStatus,
          hotelIds: nextFilters.hotelId ? [nextFilters.hotelId] : undefined,
          search: nextFilters.search.trim() || undefined,
          sort: nextFilters.sort,
          sortDir: nextFilters.sortDir,
          checkInFrom: nextFilters.checkInFrom || undefined,
          checkInTo: nextFilters.checkInTo || undefined,
          checkOutFrom: nextFilters.checkOutFrom || undefined,
          checkOutTo: nextFilters.checkOutTo || undefined,
          page: nextPage,
          size: PAGE_SIZE,
        });
        setReport(data);
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [filters, page, showToast],
  );

  useEffect(() => {
    if (customInvalid) return;
    void loadReport();
  }, [customInvalid, loadReport]);

  const openDetail = (
    row: HotelFinancialMisBookingRow,
    tab: DetailTab = "overview",
  ) => {
    cacheFinancialMisRow(row);
    navigate(ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS_DETAIL(row.bookingId), {
      state: { booking: row, tab },
    });
  };

  const applyFilters = () => {
    if (draftCustomInvalid) return;
    setFilters(draft);
    setPage(0);
    setFilterOpen(false);
    void loadReport(draft, 0);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setFilters(DEFAULT_DRAFT);
    setPage(0);
    setFilterOpen(false);
    void loadReport(DEFAULT_DRAFT, 0);
  };

  const summary = report?.summary;
  const totalPages = report?.page.totalPages ?? 0;
  const totalElements = report?.page.totalElements ?? 0;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-4">
        <Toast toast={toast} onClose={hideToast} />

        <div className="space-y-2">
          <ReportPageHeader
            icon={Wallet}
            iconClassName="bg-gradient-to-br from-blue-500 to-indigo-600"
            title="Hotel Booking Financial MIS"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {report?.dateRange?.fromDate && report?.dateRange?.toDate ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800 shadow-sm">
                    <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
                    <span>
                      {formatReportDate(report.dateRange.fromDate)} –{" "}
                      {formatReportDate(report.dateRange.toDate)}
                    </span>
                    {report.dateAxis ? (
                      <span className="font-semibold text-blue-600">
                        · {formatStatusLabel(report.dateAxis)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setDraft(filters);
                    setFilterOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => void loadReport()}
                  disabled={loading || customInvalid}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </div>
            }
          />

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            <FinanceKpiCard
              label="Total Bookings"
              value={
                summary ? String(summary.totalBookings) : loading ? "…" : "0"
              }
              icon={Building2}
              tone={FINANCE_KPI_TONES.bookings}
            />
            <FinanceKpiCard
              label="Customer Revenue"
              value={
                summary
                  ? formatFinanceMoney(summary.grossBookingValue)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={CircleDollarSign}
              tone={FINANCE_KPI_TONES.customer}
            />
            <FinanceKpiCard
              label="Hotel Payout"
              value={
                summary
                  ? formatFinanceMoney(summary.hotelPayout)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={Landmark}
              tone={FINANCE_KPI_TONES.hotelPayout}
            />
            <FinanceKpiCard
              label="OTA Revenue"
              value={
                summary
                  ? formatFinanceMoney(summary.otaRevenue)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={Target}
              tone={FINANCE_KPI_TONES.ota}
            />
            <FinanceKpiCard
              label="OTA GST"
              value={
                summary
                  ? formatFinanceMoney(summary.otaRevenueGst)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={Percent}
              tone={FINANCE_KPI_TONES.margin}
            />
            <FinanceKpiCard
              label="OTA Incl. GST"
              value={
                summary
                  ? formatFinanceMoney(summary.otaRevenueInclusiveGst)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={CircleDollarSign}
              tone={FINANCE_KPI_TONES.ota}
            />
            <FinanceKpiCard
              label="Agency Commission"
              value={
                summary
                  ? formatFinanceMoney(summary.agencyCommission)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={HandCoins}
              tone={FINANCE_KPI_TONES.outstanding}
            />
            <FinanceKpiCard
              label="Cancellation"
              value={
                summary
                  ? formatFinanceMoney(summary.cancellationAmount)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={Receipt}
              tone={FINANCE_KPI_TONES.cancellation}
            />
            <FinanceKpiCard
              label="Refunded"
              value={
                summary
                  ? formatFinanceMoney(summary.refundAmount)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={RotateCcw}
              tone={FINANCE_KPI_TONES.refund}
            />
            <FinanceKpiCard
              label="Out. Payout"
              value={
                summary
                  ? formatFinanceMoney(summary.outstandingHotelPayout)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={Wallet}
              tone={FINANCE_KPI_TONES.outstanding}
            />
            <FinanceKpiCard
              label="Out. Refund"
              value={
                summary
                  ? formatFinanceMoney(summary.outstandingCustomerRefund)
                  : loading
                    ? "…"
                    : "—"
              }
              icon={HandCoins}
              tone={FINANCE_KPI_TONES.collected}
            />
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">
                    Booking
                  </th>
                  <th className="px-4 py-3">Hotel</th>
                  <th className="px-4 py-3">Booking Date</th>
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Customer / Agent Price</th>
                  <th className="px-4 py-3">Hotel Payout</th>
                  <th className="px-4 py-3">OTA Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Cancel / Refund</th>
                  <th className="px-4 py-3">View Details</th>
                </tr>
              </thead>
              <tbody>
                {(report?.bookings ?? []).map((row) => (
                  <tr
                    key={`${row.bookingId}-${row.bookingRef}`}
                    className="border-t border-slate-100 align-top hover:bg-blue-50/30"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "overview")}
                        className="text-left"
                      >
                        <p className="font-semibold text-blue-700 hover:underline">
                          {row.bookingRef}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID {row.bookingId}
                        </p>
                        {row.customerName ? (
                          <p className="text-xs text-slate-500">
                            {row.customerName}
                          </p>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row.hotelName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.hotelCode || "—"}
                      </p>
                      {row.hotelCity || row.hotelState ? (
                        <p className="text-xs text-slate-500">
                          {[row.hotelCity, row.hotelState]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatReportDate(row.bookingDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      <p>
                        {formatReportDate(row.checkIn)} –{" "}
                        {formatReportDate(row.checkOut)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.nights} night{row.nights === 1 ? "" : "s"}
                        {row.rooms != null ? ` · ${row.rooms} room(s)` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={row.bookingSource}
                        tone="bg-sky-50 text-sky-700 ring-sky-200"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {formatStatusLabel(row.bookedBy)}
                        {row.bookingRate
                          ? ` · ${formatStatusLabel(row.bookingRate)}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "customer")}
                        className="font-semibold tabular-nums text-blue-700 hover:underline"
                      >
                        {formatFinanceMoney(
                          getHotelFinancialMisDisplaySellingPrice(row),
                        )}
                      </button>
                      {isHotelFinancialMisB2b(row) ? (
                        <p className="text-xs text-slate-500">
                          Agent · sell{" "}
                          {formatFinanceMoney(row.customerSellingPrice)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "hotelPayout")}
                        className="font-semibold tabular-nums text-indigo-700 hover:underline"
                      >
                        {formatFinanceMoney(row.hotelPayout)}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "otaRevenue")}
                        className="text-left font-semibold tabular-nums text-cyan-700 hover:underline"
                      >
                        {formatFinanceMoney(row.otaRevenue)}
                      </button>
                      <p className="text-xs tabular-nums text-slate-500">
                        GST {formatFinanceMoney(row.otaRevenueGst)}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500">
                        Incl. {formatFinanceMoney(row.otaRevenueInclusiveGst)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={row.bookingStatus}
                        tone={bookingStatusTone(row.bookingStatus)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={row.paymentStatus}
                        tone={paymentStatusTone(row.paymentStatus)}
                      />
                      <p className="mt-1 text-xs tabular-nums text-slate-500">
                        Collected {formatFinanceMoney(row.amountCollected)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "cancellation")}
                        className="text-left"
                      >
                        <p className="tabular-nums text-slate-800 hover:text-blue-700 hover:underline">
                          {formatFinanceMoney(row.cancellationCharge)}
                        </p>
                        <p className="text-xs tabular-nums text-slate-500">
                          Refund {formatFinanceMoney(row.refundAmount)}
                        </p>
                        <div className="mt-1">
                          <StatusBadge
                            status={row.refundStatus}
                            tone={refundStatusTone(row.refundStatus)}
                          />
                        </div>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(row, "overview")}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span className="whitespace-nowrap">View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !(report?.bookings.length ?? 0) ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-12 text-center text-sm text-slate-400"
                    >
                      No hotel bookings match the current filters
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-1.5">
            <p className="text-[11px] leading-none text-slate-500">
              {totalElements} booking{totalElements === 1 ? "" : "s"}
              {report?.page.sort
                ? ` · sorted by ${formatStatusLabel(report.page.sort)} (${report.page.direction})`
                : null}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => {
                  const nextPage = page - 1;
                  setPage(nextPage);
                  void loadReport(filters, nextPage);
                }}
                className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-[11px] tabular-nums text-slate-600">
                Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  void loadReport(filters, nextPage);
                }}
                className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {filterOpen ? (
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-40 bg-slate-900/30"
              onClick={() => setFilterOpen(false)}
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <FilterField label="Date preset">
                  <select
                    value={draft.uiDatePreset}
                    onChange={(event) => {
                      const preset = event.target.value as UiDatePreset;
                      if (preset === "CUSTOM") {
                        const seeded =
                          draft.fromDate && draft.toDate
                            ? {
                                fromDate: draft.fromDate,
                                toDate: draft.toDate,
                              }
                            : defaultCustomRange();
                        setDraft((prev) => ({
                          ...prev,
                          uiDatePreset: "CUSTOM",
                          ...seeded,
                        }));
                        return;
                      }
                      setDraft((prev) => ({
                        ...prev,
                        uiDatePreset: preset,
                      }));
                    }}
                    className={fieldClass}
                  >
                    {UI_DATE_PRESET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                {draft.uiDatePreset === "CUSTOM" ? (
                  <div className="space-y-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Custom date range
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <FilterField label="From">
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
                          <input
                            type="date"
                            value={draft.fromDate}
                            max={draft.toDate || undefined}
                            onChange={(event) =>
                              setDraft((prev) => ({
                                ...prev,
                                fromDate: event.target.value,
                              }))
                            }
                            className={cn(fieldClass, "pl-8")}
                          />
                        </div>
                      </FilterField>
                      <FilterField label="To">
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
                          <input
                            type="date"
                            value={draft.toDate}
                            min={draft.fromDate || undefined}
                            onChange={(event) =>
                              setDraft((prev) => ({
                                ...prev,
                                toDate: event.target.value,
                              }))
                            }
                            className={cn(fieldClass, "pl-8")}
                          />
                        </div>
                      </FilterField>
                    </div>
                    {draftCustomInvalid ? (
                      <p className="text-xs text-rose-600">
                        Select both from and to dates.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <FilterField label="Date type">
                  <select
                    value={draft.dateAxis}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        dateAxis: event.target
                          .value as HotelFinancialMisDateAxis,
                      }))
                    }
                    className={fieldClass}
                  >
                    {DATE_AXIS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Booking source">
                  <select
                    value={draft.bookingSource}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        bookingSource: event.target
                          .value as HotelFinancialMisBookingSource,
                      }))
                    }
                    className={fieldClass}
                  >
                    {BOOKING_SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Booking status">
                  <select
                    value={draft.bookingStatus}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        bookingStatus: event.target
                          .value as HotelFinancialMisBookingStatus,
                      }))
                    }
                    className={fieldClass}
                  >
                    {BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Payment status">
                  <select
                    value={draft.paymentStatus}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        paymentStatus: event.target
                          .value as HotelFinancialMisPaymentStatus,
                      }))
                    }
                    className={fieldClass}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Refund status">
                  <select
                    value={draft.refundStatus}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        refundStatus: event.target
                          .value as HotelFinancialMisRefundStatus,
                      }))
                    }
                    className={fieldClass}
                  >
                    {REFUND_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Hotel">
                  <input
                    type="text"
                    value={hotelQuery}
                    onChange={(event) => setHotelQuery(event.target.value)}
                    placeholder="Search hotels…"
                    className={cn(fieldClass, "mb-2")}
                  />
                  <select
                    value={draft.hotelId}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        hotelId: event.target.value,
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="">All hotels</option>
                    {filteredHotels.map((hotel) => (
                      <option key={hotel.hotelId} value={hotel.hotelId}>
                        {hotel.hotelName}
                        {hotel.hotelCode ? ` (${hotel.hotelCode})` : ""}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Search">
                  <input
                    type="text"
                    value={draft.search}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Booking ref, guest, hotel"
                    className={fieldClass}
                  />
                </FilterField>
                <div className="grid grid-cols-2 gap-2">
                  <FilterField label="Check-in from">
                    <input
                      type="date"
                      value={draft.checkInFrom}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          checkInFrom: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </FilterField>
                  <FilterField label="Check-in to">
                    <input
                      type="date"
                      value={draft.checkInTo}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          checkInTo: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </FilterField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FilterField label="Check-out from">
                    <input
                      type="date"
                      value={draft.checkOutFrom}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          checkOutFrom: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </FilterField>
                  <FilterField label="Check-out to">
                    <input
                      type="date"
                      value={draft.checkOutTo}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          checkOutTo: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </FilterField>
                </div>
                <FilterField label="Sort by">
                  <select
                    value={draft.sort}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        sort: event.target.value as HotelFinancialMisSort,
                      }))
                    }
                    className={fieldClass}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label="Sort direction">
                  <select
                    value={draft.sortDir}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        sortDir: event.target.value as "asc" | "desc",
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </FilterField>
              </div>
              <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={draftCustomInvalid}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Apply
                </button>
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
