import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Loader2,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceCurrency,
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
  exportStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import {
  SettlementFilterDrawer,
  SettlementFilterField,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementReportSection,
  SettlementReportStatCard,
  SettlementStatusBadge,
} from "../components/settlementUi";
import {
  settlementDashboardService,
  type SettlementBookingFilters,
  type SettlementBookingSort,
  type SettlementBookingsResponse,
  type SettlementDashboardParams,
  type SettlementDashboardResponse,
  type SettlementDatePreset,
  type SettlementKpiGroup,
  type SettlementMoneyKpi,
  type SettlementProduct,
  type SettlementSupplierComponent,
} from "../services/settlementDashboardService";

type SharedFilter = {
  datePreset: SettlementDatePreset;
  fromDate: string;
  toDate: string;
  product: SettlementProduct;
  hotelId: string;
  hotelLabel: string;
  packageId: string;
  packageLabel: string;
  supplierId: string;
  component: string;
  settlementStatus: string;
};

type BookingFilter = SharedFilter & {
  supplierId: string;
  settlementStatus: string;
  customerPaymentStatus: string;
  supplierPaymentStatus: string;
  bookingStatus: string;
  paymentStatus: string;
  channel: string;
  businessType: string;
  agencyId: string;
  search: string;
  sortBy: SettlementBookingSort;
  sortDirection: "ASC" | "DESC";
};

const DEFAULT_SHARED: SharedFilter = {
  datePreset: "THIS_MONTH",
  fromDate: "",
  toDate: "",
  product: "ALL",
  hotelId: "",
  hotelLabel: "",
  packageId: "",
  packageLabel: "",
  supplierId: "",
  component: "",
  settlementStatus: "",
};

const DEFAULT_BOOKING: BookingFilter = {
  ...DEFAULT_SHARED,
  customerPaymentStatus: "",
  supplierPaymentStatus: "",
  bookingStatus: "",
  paymentStatus: "",
  channel: "",
  businessType: "",
  agencyId: "",
  search: "",
  sortBy: "bookingDate",
  sortDirection: "DESC",
};

const DATE_PRESETS: { value: SettlementDatePreset; label: string }[] = [
  ["TODAY", "Today"],
  ["YESTERDAY", "Yesterday"],
  ["THIS_WEEK", "This week"],
  ["LAST_WEEK", "Last week"],
  ["LAST_7_DAYS", "Last 7 days"],
  ["LAST_14_DAYS", "Last 14 days"],
  ["LAST_15_DAYS", "Last 15 days"],
  ["THIS_MONTH", "This month"],
  ["LAST_MONTH", "Last month"],
  ["LAST_3_MONTHS", "Last 3 months"],
  ["LAST_6_MONTHS", "Last 6 months"],
  ["LAST_30_DAYS", "Last 30 days"],
  ["LAST_180_DAYS", "Last 180 days"],
  ["LAST_365_DAYS", "Last 365 days"],
  ["ALL_TIME", "All time"],
  ["CUSTOM", "Custom"],
].map(([value, label]) => ({ value: value as SettlementDatePreset, label }));

const SETTLEMENT_STATUSES = [
  "FULLY_SETTLED",
  "CUSTOMER_PAYMENT_PENDING",
  "SUPPLIER_PAYMENT_PENDING",
  "BOTH_PENDING",
  "REFUND_PENDING",
  "NO_SETTLEMENT_DUE",
  "SETTLEMENT_TRACKING_INCOMPLETE",
];
const PAGE_SIZE = 20;
const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const OVERALL_KPIS = [
  ["supplierPayable", "Supplier payable", Building2, "violet"],
  ["supplierPaid", "Supplier paid", Wallet, "emerald"],
  ["supplierOutstanding", "Supplier pending", Receipt, "amber"],
  ["untrackedActivityPayable", "Activity payable", AlertTriangle, "rose"],
] as const;

const HOTEL_KPIS = [
  ["hotelBookingValue", "Booking value"],
  ["customerCollected", "Customer collected"],
  ["customerOutstanding", "Customer outstanding"],
  ["hotelPayable", "Hotel payable"],
  ["hotelPaid", "Hotel paid"],
  ["hotelOutstanding", "Hotel outstanding"],
  ["otaCommission", "OTA commission"],
  ["commissionGst", "Commission GST"],
  ["refundPending", "Refund pending"],
] as const;

const PACKAGE_KPIS = [
  ["packageBookingValue", "Booking value"],
  ["customerCollected", "Customer collected"],
  ["customerOutstanding", "Customer outstanding"],
  ["supplierCost", "Supplier cost"],
  ["supplierPayable", "Supplier payable"],
  ["trackedSupplierPayable", "Tracked payable"],
  ["supplierPaid", "Supplier paid"],
  ["supplierOutstanding", "Supplier outstanding"],
  ["untrackedActivityPayable", "Untracked activity"],
  ["packageRevenue", "Package revenue"],
  ["refundPending", "Refund pending"],
] as const;

function getKpi(group: SettlementKpiGroup | null | undefined, key: string) {
  const value = group?.[key];
  return value && typeof value === "object" && "available" in value
    ? (value as SettlementMoneyKpi)
    : null;
}

function kpiText(kpi: SettlementMoneyKpi | null | undefined): string {
  if (!kpi?.available || !kpi.amount) return "N/A";
  return formatFinanceMoney(kpi.amount);
}

function kpiReason(kpi: SettlementMoneyKpi | null | undefined) {
  return !kpi?.available
    ? kpi?.unavailableReason || "Not available"
    : undefined;
}

function validateCustom(filter: SharedFilter): string | null {
  if (filter.datePreset !== "CUSTOM") return null;
  if (!filter.fromDate || !filter.toDate) return "Select both custom dates";
  if (filter.fromDate > filter.toDate)
    return "From date cannot be after to date";
  return null;
}

function sharedParams(filter: SharedFilter): SettlementDashboardParams {
  return {
    datePreset: filter.datePreset,
    fromDate: filter.datePreset === "CUSTOM" ? filter.fromDate : undefined,
    toDate: filter.datePreset === "CUSTOM" ? filter.toDate : undefined,
    product: filter.product,
    hotelId: filter.hotelId || undefined,
    packageId: filter.packageId || undefined,
    supplierId: filter.supplierId || undefined,
    component: filter.component || undefined,
    settlementStatus: filter.settlementStatus || undefined,
  };
}

function bookingParams(
  filter: BookingFilter,
  page: number,
): SettlementBookingFilters {
  const common = sharedParams(filter);
  return {
    datePreset: common.datePreset,
    fromDate: common.fromDate,
    toDate: common.toDate,
    hotelId: common.hotelId,
    packageId: common.packageId,
    productType: filter.product,
    supplierId: filter.supplierId || undefined,
    component: filter.component || undefined,
    settlementStatus: filter.settlementStatus || undefined,
    customerPaymentStatus: filter.customerPaymentStatus || undefined,
    supplierPaymentStatus: filter.supplierPaymentStatus || undefined,
    bookingStatus: filter.bookingStatus.trim() || undefined,
    paymentStatus: filter.paymentStatus || undefined,
    channel: filter.channel.trim() || undefined,
    businessType: filter.businessType || undefined,
    agencyId: filter.agencyId.trim() || undefined,
    search: filter.search.trim() || undefined,
    page,
    size: PAGE_SIZE,
    sortBy: filter.sortBy,
    sortDirection: filter.sortDirection,
  };
}

function activeSharedCount(filter: SharedFilter): number {
  return (
    (filter.datePreset !== "THIS_MONTH" ? 1 : 0) +
    (filter.product !== "ALL" ? 1 : 0) +
    (filter.supplierId ? 1 : 0) +
    (filter.component ? 1 : 0) +
    (filter.settlementStatus ? 1 : 0)
  );
}

function MoneyKpiGrid({
  group,
  items,
}: {
  group: SettlementKpiGroup;
  items: readonly (readonly [string, string])[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {items.map(([key, label]) => {
        const kpi = getKpi(group, key);
        return (
          <div
            key={key}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums",
                kpi?.available ? "text-slate-900" : "text-slate-500",
              )}
            >
              {kpiText(kpi)}
            </p>
            {kpiReason(kpi) ? (
              <p className="mt-0.5 text-[10px] leading-snug text-amber-700">
                {kpiReason(kpi)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SupplierComponents({ rows }: { rows: SettlementSupplierComponent[] }) {
  if (!rows.length)
    return (
      <p className="text-sm text-slate-500">No supplier component data.</p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Component</th>
            <th className="px-3 py-2">Payable</th>
            <th className="px-3 py-2">Paid</th>
            <th className="px-3 py-2">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.component}
              className="border-b border-slate-100 last:border-0"
            >
              <td className="px-3 py-2">
                <SettlementStatusBadge status={row.component} />
              </td>
              {[row.payable, row.paid, row.outstanding].map((kpi, index) => (
                <td
                  key={index}
                  className="px-3 py-2"
                  title={
                    row.component === "ACTIVITY" && index > 0 && !kpi.available
                      ? "Activity settlement tracking is not available in Phase 1"
                      : kpiReason(kpi)
                  }
                >
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      kpi.available ? "text-slate-900" : "text-slate-500",
                    )}
                  >
                    {kpiText(kpi)}
                  </span>
                  {kpiReason(kpi) ? (
                    <p className="max-w-xs text-[10px] text-amber-700">
                      {kpiReason(kpi)}
                    </p>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SharedFilterFields({
  draft,
  setDraft,
}: {
  draft: SharedFilter;
  setDraft: (next: SharedFilter) => void;
}) {
  return (
    <>
      <SettlementFilterField label="Date period">
        <select
          className={fieldClass}
          value={draft.datePreset}
          onChange={(event) =>
            setDraft({
              ...draft,
              datePreset: event.target.value as SettlementDatePreset,
            })
          }
        >
          {DATE_PRESETS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SettlementFilterField>
      {draft.datePreset === "CUSTOM" ? (
        <div className="grid grid-cols-2 gap-2">
          <SettlementFilterField label="From date">
            <input
              type="date"
              className={fieldClass}
              value={draft.fromDate}
              onChange={(event) =>
                setDraft({ ...draft, fromDate: event.target.value })
              }
            />
          </SettlementFilterField>
          <SettlementFilterField label="To date">
            <input
              type="date"
              className={fieldClass}
              value={draft.toDate}
              onChange={(event) =>
                setDraft({ ...draft, toDate: event.target.value })
              }
            />
          </SettlementFilterField>
        </div>
      ) : null}
      <SettlementFilterField label="Product">
        <select
          className={fieldClass}
          value={draft.product}
          onChange={(event) =>
            setDraft({
              ...draft,
              product: event.target.value as SettlementProduct,
            })
          }
        >
          <option value="ALL">All products</option>
          <option value="HOTEL">Hotel</option>
          <option value="PACKAGE">Package</option>
        </select>
      </SettlementFilterField>
      <SettlementFilterField label="Supplier">
        <input
          className={fieldClass}
          value={draft.supplierId}
          onChange={(event) =>
            setDraft({ ...draft, supplierId: event.target.value })
          }
          placeholder="Hotel UUID or transport vendor ID"
        />
      </SettlementFilterField>
      <SettlementFilterField label="Component">
        <select
          className={fieldClass}
          value={draft.component}
          onChange={(event) =>
            setDraft({ ...draft, component: event.target.value })
          }
        >
          <option value="">All components</option>
          <option value="HOTEL">Hotel</option>
          <option value="TRANSPORT">Transport</option>
          <option value="ACTIVITY">Activity</option>
        </select>
      </SettlementFilterField>
      <SettlementFilterField label="Settlement status">
        <SelectAny
          value={draft.settlementStatus}
          onChange={(value) => setDraft({ ...draft, settlementStatus: value })}
          options={SETTLEMENT_STATUSES}
        />
      </SettlementFilterField>
    </>
  );
}

export default function SettlementDashboardPage() {
  const { toast, showToast, hideToast } = useToast();
  const [filterOpen, setFilterOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState(DEFAULT_BOOKING);
  const [bookingDraft, setBookingDraft] = useState(DEFAULT_BOOKING);
  const [dashboard, setDashboard] =
    useState<SettlementDashboardResponse | null>(null);
  const [bookings, setBookings] = useState<SettlementBookingsResponse | null>(
    null,
  );
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [overviewExporting, setOverviewExporting] = useState(false);
  const [overviewExportStatus, setOverviewExportStatus] =
    useState<ExportJobStatus | null>(null);
  const [bookingsExporting, setBookingsExporting] = useState(false);
  const [bookingsExportStatus, setBookingsExportStatus] =
    useState<ExportJobStatus | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      setDashboard(
        await settlementDashboardService.getDashboard(
          sharedParams(bookingFilter),
        ),
      );
    } catch (error) {
      const message = extractErrorMessage(error);
      setOverviewError(message);
      showToast(message, "error");
    } finally {
      setOverviewLoading(false);
    }
  }, [bookingFilter, showToast]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      setBookings(
        await settlementDashboardService.getBookings(
          bookingParams(bookingFilter, page),
        ),
      );
    } catch (error) {
      const message = extractErrorMessage(error);
      setBookingsError(message);
      showToast(message, "error");
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingFilter, page, showToast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const activeCount = useMemo(() => {
    return (
      activeSharedCount(bookingFilter) +
      [
        bookingFilter.customerPaymentStatus,
        bookingFilter.supplierPaymentStatus,
        bookingFilter.bookingStatus,
        bookingFilter.paymentStatus,
        bookingFilter.channel,
        bookingFilter.businessType,
        bookingFilter.agencyId,
        bookingFilter.search,
      ].filter(Boolean).length +
      (bookingFilter.sortBy !== "bookingDate" ||
      bookingFilter.sortDirection !== "DESC"
        ? 1
        : 0)
    );
  }, [bookingFilter]);

  const openFilters = () => {
    setBookingDraft(bookingFilter);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    const error = validateCustom(bookingDraft);
    if (error) {
      showToast(error, "error");
      return;
    }
    setBookingFilter(bookingDraft);
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setBookingDraft(DEFAULT_BOOKING);
    setBookingFilter(DEFAULT_BOOKING);
    setPage(0);
    setFilterOpen(false);
  };

  const exportOverview = async (format: ReportExportFormat) => {
    setOverviewExporting(true);
    setOverviewExportStatus("QUEUED");
    try {
      await settlementDashboardService.exportDashboard(
        sharedParams(bookingFilter),
        format,
        setOverviewExportStatus,
      );
      showToast("Settlement KPI dashboard downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setOverviewExporting(false);
      setOverviewExportStatus(null);
    }
  };

  const exportBookings = async (format: ReportExportFormat) => {
    setBookingsExporting(true);
    setBookingsExportStatus("QUEUED");
    try {
      await settlementDashboardService.exportBookings(
        bookingParams(bookingFilter, page),
        format,
        setBookingsExportStatus,
      );
      showToast("Settlement booking MIS downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setBookingsExporting(false);
      setBookingsExportStatus(null);
    }
  };

  const dateLabel = (() => {
    const range = dashboard?.dateRange || bookings?.dateRange;
    return range?.fromDate && range.toDate
      ? `${formatReportDate(range.fromDate)} – ${formatReportDate(range.toDate)}`
      : formatStatusLabel(bookingFilter.datePreset);
  })();

  return (
    <>
      <Toast {...toast} onClose={hideToast} />
      <SettlementPageShell
        title="Settlement MIS"
        subtitle={`Customer collection, supplier payable and settlement/payment tracking. · ${dateLabel} · Hotel = check-out date; Package = travel end date`}
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeCount ? (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              ) : null}
            </button>
            <ExportButton
              disabled={overviewLoading}
              exporting={overviewExporting}
              exportingLabel={
                exportStatusLabel(overviewExportStatus) || "Exporting…"
              }
              onExportExcel={() => void exportOverview("EXCEL")}
              onExportCSV={() => void exportOverview("CSV")}
              onExportPDF={() => void exportOverview("PDF")}
            />
            <SettlementRefreshButton
              loading={overviewLoading || bookingsLoading}
              onClick={() => {
                void loadOverview();
                void loadBookings();
              }}
            />
          </div>
        }
      >
        <OverviewTab
          report={dashboard}
          loading={overviewLoading}
          error={overviewError}
          onRetry={loadOverview}
        />
        <div className="mt-2">
          <BookingsTab
            report={bookings}
            loading={bookingsLoading}
            error={bookingsError}
            onRetry={loadBookings}
            onPage={setPage}
            onSort={(sortBy) => {
              setBookingFilter((current) => ({
                ...current,
                sortBy,
                sortDirection:
                  current.sortBy === sortBy && current.sortDirection === "DESC"
                    ? "ASC"
                    : "DESC",
              }));
              setPage(0);
            }}
            sortBy={bookingFilter.sortBy}
            sortDirection={bookingFilter.sortDirection}
            exportAction={
              <ExportButton
                disabled={bookingsLoading}
                exporting={bookingsExporting}
                exportingLabel={
                  exportStatusLabel(bookingsExportStatus) || "Exporting…"
                }
                onExportExcel={() => void exportBookings("EXCEL")}
                onExportCSV={() => void exportBookings("CSV")}
                onExportPDF={() => void exportBookings("PDF")}
              />
            }
          />
        </div>
      </SettlementPageShell>

      <SettlementFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
      >
        <BookingFilterFields draft={bookingDraft} setDraft={setBookingDraft} />
      </SettlementFilterDrawer>
    </>
  );
}

function OverviewTab({
  report,
  loading,
  error,
  onRetry,
}: {
  report: SettlementDashboardResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
}) {
  const [productSection, setProductSection] = useState<"HOTEL" | "PACKAGE">(
    "HOTEL",
  );
  if (loading && !report) return <CenteredLoading />;
  if (error && !report) return <ErrorState message={error} onRetry={onRetry} />;
  if (!report) return <EmptyState />;
  const components = Array.isArray(report.packages.supplierComponents)
    ? (report.packages.supplierComponents as SettlementSupplierComponent[])
    : [];
  return (
    <div className={cn("space-y-2", loading && "opacity-70")}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {OVERALL_KPIS.map(([key, label, Icon, tone]) => {
          const kpi = getKpi(report.overall, key);
          return (
            <SettlementReportStatCard
              key={key}
              label={label}
              value={kpiText(kpi)}
              sub={kpiReason(kpi)}
              icon={Icon}
              tone={tone}
              className="p-2.5"
            />
          );
        })}
      </div>
      <SettlementReportSection title="Settlement status" compact>
        {report.statusDistribution.length ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
            {report.statusDistribution.map((item) => (
              <div
                key={item.status}
                title={formatStatusLabel(item.status)}
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <SettlementStatusBadge
                  status={item.status}
                  className="min-w-0 truncate"
                />
                <p className="shrink-0 text-base font-bold tabular-nums text-slate-900">
                  {item.bookingCount.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact />
        )}
      </SettlementReportSection>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        {(["HOTEL", "PACKAGE"] as const).map((product) => (
          <button
            key={product}
            type="button"
            onClick={() => setProductSection(product)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium",
              productSection === product
                ? "bg-[#2f3d95] text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {formatStatusLabel(product)}
          </button>
        ))}
      </div>
      {productSection === "HOTEL" ? (
        <SettlementReportSection
          title="Hotel settlement"
          description={`${report.hotel.bookingCount.toLocaleString("en-IN")} bookings`}
          compact
        >
          <MoneyKpiGrid group={report.hotel} items={HOTEL_KPIS} />
        </SettlementReportSection>
      ) : (
        <SettlementReportSection
          title="Package settlement"
          description={`${report.packages.bookingCount.toLocaleString("en-IN")} bookings`}
          compact
        >
          <MoneyKpiGrid group={report.packages} items={PACKAGE_KPIS} />
        </SettlementReportSection>
      )}
      <SettlementReportSection
        title="Package supplier components"
        description="Availability follows Phase 1 settlement tracking coverage."
        compact
      >
        <SupplierComponents rows={components} />
      </SettlementReportSection>
    </div>
  );
}

function BookingFilterFields({
  draft,
  setDraft,
}: {
  draft: BookingFilter;
  setDraft: (next: BookingFilter) => void;
}) {
  const sharedSetter = (next: SharedFilter) => setDraft({ ...draft, ...next });
  return (
    <>
      <SharedFilterFields draft={draft} setDraft={sharedSetter} />
      <SettlementFilterField label="Search">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className={`${fieldClass} pl-9`}
            value={draft.search}
            onChange={(event) =>
              setDraft({ ...draft, search: event.target.value })
            }
            placeholder="Booking ref, customer, email, mobile"
          />
        </div>
      </SettlementFilterField>
      <SettlementFilterField label="Payment status">
        <select
          className={fieldClass}
          value={draft.paymentStatus}
          onChange={(event) =>
            setDraft({ ...draft, paymentStatus: event.target.value })
          }
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </SettlementFilterField>
    </>
  );
}

function SelectAny({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className={fieldClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">All statuses</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {formatStatusLabel(option)}
        </option>
      ))}
    </select>
  );
}

function BookingsTab({
  report,
  loading,
  error,
  onRetry,
  onPage,
  onSort,
  sortBy,
  sortDirection,
  exportAction,
}: {
  report: SettlementBookingsResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  onPage: (page: number) => void;
  onSort: (key: SettlementBookingSort) => void;
  sortBy: SettlementBookingSort;
  sortDirection: "ASC" | "DESC";
  exportAction: ReactNode;
}) {
  if (loading && !report) return <CenteredLoading />;
  if (error && !report) return <ErrorState message={error} onRetry={onRetry} />;
  if (!report) return <EmptyState />;
  return (
    <div className={cn("space-y-4", loading && "opacity-70")}>
      <SettlementReportSection
        title="Booking settlement MIS"
        description={`${report.totalElements.toLocaleString("en-IN")} records · Page ${report.totalPages ? report.page + 1 : 0} of ${report.totalPages}`}
        action={exportAction}
        flush
      >
        {report.content.length ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-275 table-auto border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#263578] bg-[#2f3d95] text-white">
                  <th className="min-w-40 whitespace-nowrap px-4 py-3 text-xs font-semibold">
                    Booking reference
                  </th>
                  <SortableHeader
                    label="Service date"
                    sortKey="serviceDate"
                    {...{ onSort, sortBy, sortDirection }}
                  />
                  <SortableHeader
                    label="Booking value"
                    sortKey="bookingValue"
                    {...{ onSort, sortBy, sortDirection }}
                  />
                  <SortableHeader
                    label="Customer collected"
                    sortKey="customerCollected"
                    {...{ onSort, sortBy, sortDirection }}
                  />
                  <SortableHeader
                    label="Customer outstanding"
                    sortKey="customerOutstanding"
                    {...{ onSort, sortBy, sortDirection }}
                  />
                  <SortableHeader
                    label="Supplier outstanding"
                    sortKey="supplierOutstanding"
                    {...{ onSort, sortBy, sortDirection }}
                  />
                  <th className="min-w-44 whitespace-nowrap px-4 py-3 text-xs font-semibold">
                    Settlement status
                  </th>
                  <th className="min-w-28 whitespace-nowrap px-4 py-3 text-right text-xs font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.content.map((row) => {
                  const rowKey = row.bookingId ?? row.bookingRef;
                  return (
                    <tr
                      key={String(rowKey)}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#2f3d95]">
                          {row.bookingRef}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatStatusLabel(row.productType)} ·{" "}
                          {row.customerName}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatReportDate(row.serviceDate)}
                      </td>
                      {[
                        row.bookingValue,
                        row.customerCollected,
                        row.customerOutstanding,
                        row.supplierOutstanding,
                      ].map((value, index) => (
                        <td
                          key={index}
                          className="whitespace-nowrap px-3 py-3 font-medium tabular-nums"
                        >
                          {formatFinanceCurrency(value)}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <SettlementStatusBadge status={row.settlementStatus} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {row.settlementNo ? (
                          <Link
                            to={ROUTES.SETTLEMENT.DETAIL(row.settlementNo)}
                            className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            View settlement
                          </Link>
                        ) : (
                          <span
                            className="text-xs text-slate-400"
                            title="Settlement number is not available for this booking"
                          >
                            Not available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact />
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            {report.totalElements.toLocaleString("en-IN")} records
            <span className="text-slate-400">
              {" "}
              · Page {report.totalPages ? report.page + 1 : 0} of{" "}
              {report.totalPages}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!report.hasPrevious || loading}
              onClick={() => onPage(Math.max(0, report.page - 1))}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!report.hasNext || loading}
              onClick={() => onPage(report.page + 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SettlementReportSection>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  onSort,
  sortBy,
  sortDirection,
}: {
  label: string;
  sortKey: SettlementBookingSort;
  onSort: (key: SettlementBookingSort) => void;
  sortBy: SettlementBookingSort;
  sortDirection: "ASC" | "DESC";
}) {
  return (
    <th className="min-w-36 whitespace-nowrap px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-xs font-semibold"
      >
        {label}
        {sortBy === sortKey ? (
          sortDirection === "ASC" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : null}
      </button>
    </th>
  );
}

function CenteredLoading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
      <p className="mt-2 text-sm text-rose-800">{message}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-slate-500",
        compact ? "min-h-24" : "min-h-[35vh]",
      )}
    >
      No settlement data found.
    </div>
  );
}
