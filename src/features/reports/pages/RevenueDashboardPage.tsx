import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import { HotelLookupFilterField } from "../components/HotelLookupFilterField";
import { PackageLookupFilterField } from "../components/PackageLookupFilterField";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
} from "../components/ReportFilterDrawer";
import {
  adminService,
  type CityMasterItem,
  type StateMasterItem,
} from "@/features/admin/services/adminService";
import {
  FINANCE_KPI_TONES,
  FinanceKpiCard,
} from "../components/hotelFinancialMisUi";
import {
  ReportPageHeader,
  exportStatusLabel,
  formatFinanceMoney,
  formatStatusLabel,
  isoToReportDateText,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import {
  revenueDashboardService,
  type RevenueChannel,
  type RevenueDashboardResponse,
  type RevenueDashboardParams,
  type RevenueDateAxis,
  type RevenueDatePreset,
  type RevenueMoney,
  type RevenuePaymentStatus,
  type RevenueProduct,
  type RevenueProductRow,
  type RevenueSecondary,
} from "../services/revenueDashboardService";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "../services/reportExportService";
import {
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  CircleDollarSign,
  HandCoins,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  RotateCcw,
  Wallet,
} from "lucide-react";

const DATE_PRESETS: { value: RevenueDatePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_WEEK", label: "Last week" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "LAST_15_DAYS", label: "Last 15 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_180_DAYS", label: "Last 180 days" },
  { value: "LAST_365_DAYS", label: "Last 365 days" },
  { value: "NEXT_7_DAYS", label: "Next 7 days" },
  { value: "NEXT_30_DAYS", label: "Next 30 days" },
  { value: "ALL_TIME", label: "All time" },
  { value: "CUSTOM", label: "Custom" },
];

type Filters = {
  datePreset: RevenueDatePreset;
  fromDate: string;
  toDate: string;
  product: RevenueProduct;
  channel: RevenueChannel;
  paymentStatus: RevenuePaymentStatus;
  hotelId: string;
  hotelLabel: string;
  packageId: string;
  packageLabel: string;
  supplierId: string;
  stateId: string;
  cityId: string;
};

const DEFAULT_FILTERS: Filters = {
  datePreset: "THIS_MONTH",
  fromDate: "",
  toDate: "",
  product: "ALL",
  channel: "ALL",
  paymentStatus: "ALL",
  hotelId: "",
  hotelLabel: "",
  packageId: "",
  packageLabel: "",
  supplierId: "",
  stateId: "",
  cityId: "",
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

function revenueDateAxis(product: RevenueProduct): RevenueDateAxis {
  if (product === "HOTEL") return "CHECK_OUT";
  if (product === "PACKAGE") return "REVENUE_DATE";
  return "REVENUE_DATE";
}

function dashboardParams(filters: Filters): RevenueDashboardParams {
  return {
    datePreset: filters.datePreset,
    fromDate: filters.datePreset === "CUSTOM" ? filters.fromDate : undefined,
    toDate: filters.datePreset === "CUSTOM" ? filters.toDate : undefined,
    dateAxis: revenueDateAxis(filters.product),
    product: filters.product,
    channel: filters.channel,
    paymentStatus: filters.paymentStatus,
    hotelId: filters.hotelId || undefined,
    packageId: filters.packageId || undefined,
    supplierId: filters.supplierId || undefined,
    stateId: filters.stateId || undefined,
    cityId: filters.cityId || undefined,
  };
}

function moneyLabel(value: RevenueMoney | null, supported = true): string {
  if (!supported || value == null) return "N/A";
  return formatFinanceMoney(value);
}

function productLabel(product: string): string {
  if (product === "HOTEL") return "Hotel";
  if (product === "PACKAGE") return "Package";
  return formatStatusLabel(product);
}

export default function RevenueDashboardPage() {
  const { toast, showToast, hideToast } = useToast();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [report, setReport] = useState<RevenueDashboardResponse | null>(null);
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [cities, setCities] = useState<CityMasterItem[]>([]);

  const load = useCallback(
    async (next: Filters) => {
      setLoading(true);
      try {
        const data = await revenueDashboardService.getDashboard(
          dashboardParams(next),
        );
        setReport(data);
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void load(DEFAULT_FILTERS);
  }, [load]);

  useEffect(() => {
    void Promise.all([adminService.getStates(), adminService.getCities()])
      .then(([stateRows, cityRows]) => {
        setStates(stateRows.filter((item) => item.active));
        setCities(cityRows.filter((item) => item.active !== false));
      })
      .catch(() => {
        setStates([]);
        setCities([]);
      });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.datePreset !== DEFAULT_FILTERS.datePreset) count += 1;
    if (filters.product !== DEFAULT_FILTERS.product) count += 1;
    if (filters.channel !== DEFAULT_FILTERS.channel) count += 1;
    if (filters.paymentStatus !== DEFAULT_FILTERS.paymentStatus) count += 1;
    if (filters.hotelId) count += 1;
    if (filters.packageId) count += 1;
    if (filters.supplierId) count += 1;
    if (filters.stateId) count += 1;
    if (filters.cityId) count += 1;
    if (filters.datePreset === "CUSTOM" && (filters.fromDate || filters.toDate)) {
      count += 1;
    }
    return count;
  }, [filters]);

  const openFilters = () => {
    setDraft(filters);
    setCustomFromText(isoToReportDateText(filters.fromDate));
    setCustomToText(isoToReportDateText(filters.toDate));
    setFilterOpen(true);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setCustomFromText("");
    setCustomToText("");
    setFilterOpen(false);
    void load(DEFAULT_FILTERS);
  };

  const applyFilters = () => {
    let next = draft;
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      next = { ...draft, fromDate: parsed.fromDate, toDate: parsed.toDate };
    }
    setFilters(next);
    setFilterOpen(false);
    void load(next);
  };

  const exportDashboard = async (format: ReportExportFormat) => {
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await revenueDashboardService.exportDashboard(
        dashboardParams(filters),
        format,
        setExportStatus,
      );
      showToast("Revenue dashboard downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const kpis = report?.primaryKpis;
  return (
    <div className="min-h-full bg-slate-50">
      <Toast {...toast} onClose={hideToast} />
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <ReportPageHeader
          icon={BadgeIndianRupee}
          iconClassName="bg-emerald-600 text-white"
          title="Revenue Dashboard"
          description="Financial performance from completed Hotel & Package services. Hotel = CHECK_OUT; Package = REVENUE_DATE."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                from={report?.dateRange.fromDate}
                to={report?.dateRange.toDate}
                detail={
                  DATE_PRESETS.find(
                    (option) => option.value === filters.datePreset,
                  )?.label
                }
              />
              <ReportFilterButton
                onClick={openFilters}
                activeCount={activeFilterCount}
              />
              <ExportButton
                iconOnly
                disabled={loading}
                exporting={exporting}
                exportingLabel={exportStatusLabel(exportStatus) || "Exporting…"}
                onExportExcel={() => void exportDashboard("EXCEL")}
                onExportCSV={() => void exportDashboard("CSV")}
                onExportPDF={() => void exportDashboard("PDF")}
              />
              <button
                type="button"
                onClick={() => void load(filters)}
                disabled={loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn("h-4 w-4", loading && "animate-spin")}
                />
              </button>
            </div>
          }
        />

        {filters.product === "ALL" ? (
          <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Hotel and package rows are not meant to add up to the primary cards.
            When all products are selected, primary totals use direct hotel
            bookings only so package hotel stays are not counted twice.
          </p>
        ) : null}

        {loading && !report ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <FinanceKpiCard
                label="Completed bookings"
                value={String(kpis?.completedBookings ?? 0)}
                sub="Completed services recognized as revenue"
                icon={CalendarDays}
                tone={FINANCE_KPI_TONES.bookings}
              />
              <FinanceKpiCard
                label="GBV"
                value={moneyLabel(kpis?.grossBookingValue ?? null)}
                sub="Gross booking value"
                icon={CircleDollarSign}
                tone={FINANCE_KPI_TONES.customer}
              />
              <FinanceKpiCard
                label="Customer collected"
                value={moneyLabel(kpis?.collectedRevenue ?? null)}
                sub="Successfully collected payments"
                icon={HandCoins}
                tone={FINANCE_KPI_TONES.collected}
              />
              <FinanceKpiCard
                label="Customer outstanding"
                value={moneyLabel(
                  kpis?.outstanding ?? null,
                  kpis?.outstandingSupported,
                )}
                sub={
                  kpis?.outstandingSupported
                    ? "Customer receivable only"
                    : "N/A for unsupported hotel receivable"
                }
                icon={Receipt}
                tone={FINANCE_KPI_TONES.refund}
              />
              <FinanceKpiCard
                label="Supplier cost"
                value={moneyLabel(
                  kpis?.supplierCost ?? null,
                  kpis?.supplierCostSupported,
                )}
                sub="Cost attributable to completed service"
                icon={Building2}
                tone={FINANCE_KPI_TONES.hotelPayout}
              />
              <FinanceKpiCard
                label="Platform revenue"
                value={moneyLabel(kpis?.otaRevenue ?? null)}
                sub="OTA revenue, excluding GST"
                icon={Wallet}
                tone={FINANCE_KPI_TONES.ota}
              />
              <FinanceKpiCard
                label="Gross profit — Package"
                value={moneyLabel(
                  kpis?.grossProfit ?? null,
                  kpis?.grossProfitSupported,
                )}
                sub={
                  kpis?.grossProfitSupported
                    ? "Package selling minus supplier cost"
                    : "N/A for Hotel"
                }
                icon={BadgeIndianRupee}
                tone={FINANCE_KPI_TONES.collected}
              />
              <FinanceKpiCard
                label="Refunded"
                value={moneyLabel(kpis?.refunded ?? null)}
                sub="Refund amount on recognized services"
                icon={RotateCcw}
                tone={FINANCE_KPI_TONES.cancellation}
              />
            </div>

            <ProductBreakdown
              key={filters.product}
              rows={report?.productBreakdown ?? []}
              showSumWarning={filters.product === "ALL"}
              initialProduct={filters.product}
            />
            <SecondarySections secondary={report?.secondary} />
          </>
        )}
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        resetLabel="Reset"
        applyLabel="Apply"
      >
        <Field label="Time period">
          <select
            className={fieldClass}
            value={draft.datePreset}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                datePreset: event.target.value as RevenueDatePreset,
              }))
            }
          >
            {DATE_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {draft.datePreset === "CUSTOM" ? (
          <ReportCustomDateFields
            fromText={customFromText}
            toText={customToText}
            onFromTextChange={setCustomFromText}
            onToTextChange={setCustomToText}
            stacked
          />
        ) : null}
        <Field label="Product">
          <select
            className={fieldClass}
            value={draft.product}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                product: event.target.value as RevenueProduct,
              }))
            }
          >
            <option value="ALL">All</option>
            <option value="HOTEL">Hotel</option>
            <option value="PACKAGE">Package</option>
          </select>
        </Field>
        <Field label="Channel">
          <select
            className={fieldClass}
            value={draft.channel}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                channel: event.target.value as RevenueChannel,
              }))
            }
          >
            <option value="ALL">All</option>
            <option value="B2C">B2C (direct)</option>
            <option value="B2B">B2B (agent)</option>
          </select>
        </Field>
        <Field label="Payment status">
          <select
            className={fieldClass}
            value={draft.paymentStatus}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                paymentStatus: event.target.value as RevenuePaymentStatus,
              }))
            }
          >
            <option value="ALL">All</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PENDING">Pending</option>
          </select>
        </Field>
        <HotelLookupFilterField
          value={draft.hotelId}
          selectedLabel={draft.hotelLabel}
          onChange={({ hotelId, hotelLabel }) =>
            setDraft((prev) => ({ ...prev, hotelId, hotelLabel }))
          }
        />
        <PackageLookupFilterField
          value={draft.packageId}
          selectedLabel={draft.packageLabel}
          onChange={({ packageId, packageLabel }) =>
            setDraft((prev) => ({ ...prev, packageId, packageLabel }))
          }
        />
        <Field label="Supplier id">
          <input
            className={fieldClass}
            value={draft.supplierId}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                supplierId: event.target.value,
              }))
            }
            placeholder="Packages only"
          />
        </Field>
        <Field label="State">
          <select
            className={fieldClass}
            value={draft.stateId}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                stateId: event.target.value,
                cityId: "",
              }))
            }
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <select
            className={fieldClass}
            value={draft.cityId}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                cityId: event.target.value,
              }))
            }
          >
            <option value="">All cities</option>
            {cities
              .filter(
                (city) =>
                  !draft.stateId || String(city.stateId || "") === draft.stateId,
              )
              .map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
          </select>
        </Field>
      </ReportFilterDrawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProductBreakdown({
  rows,
  showSumWarning,
  initialProduct,
}: {
  rows: RevenueProductRow[];
  showSumWarning: boolean;
  initialProduct: RevenueProduct;
}) {
  const [selectedProduct, setSelectedProduct] =
    useState<RevenueProduct>(initialProduct);
  const visibleRows =
    selectedProduct === "ALL"
      ? rows
      : rows.filter((row) => row.product === selectedProduct);

  const columns: GridColDef<RevenueProductRow>[] = [
    {
      field: "product",
      headerName: "Product",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="font-medium text-slate-900">
          {productLabel(params.row.product)}
        </span>
      ),
    },
    {
      field: "completedBookings",
      headerName: "Bookings",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">{params.row.completedBookings}</span>
      ),
    },
    {
      field: "grossBookingValue",
      headerName: "Gross",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {moneyLabel(params.row.grossBookingValue)}
        </span>
      ),
    },
    {
      field: "collectedRevenue",
      headerName: "Collected",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {moneyLabel(params.row.collectedRevenue)}
        </span>
      ),
    },
    {
      field: "outstanding",
      headerName: "Outstanding",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {moneyLabel(params.row.outstanding, params.row.outstandingSupported)}
        </span>
      ),
    },
    {
      field: "supplierCost",
      headerName: "Supplier cost",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {moneyLabel(params.row.supplierCost, params.row.supplierCostSupported)}
        </span>
      ),
    },
    {
      field: "otaRevenue",
      headerName: "OTA revenue",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">{moneyLabel(params.row.otaRevenue)}</span>
      ),
    },
    {
      field: "grossProfit",
      headerName: "Gross profit",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {moneyLabel(params.row.grossProfit, params.row.grossProfitSupported)}
        </span>
      ),
    },
    {
      field: "refunded",
      headerName: "Refunded",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">{moneyLabel(params.row.refunded)}</span>
      ),
    },
  ];

  return (
    <DataTable
      title={
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">
            Product breakdown
          </span>
        </div>
      }
      headerActions={
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {(["ALL", "HOTEL", "PACKAGE"] as RevenueProduct[]).map((product) => (
            <button
              key={product}
              type="button"
              onClick={() => setSelectedProduct(product)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                selectedProduct === product
                  ? "bg-[#2f3d95] text-white"
                  : "text-slate-600 hover:bg-white",
              )}
            >
              {productLabel(product)}
            </button>
          ))}
        </div>
      }
      afterHeader={
        showSumWarning && selectedProduct === "ALL" ? (
          <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            These rows stay independent of the cards above when all products are
            selected.
          </p>
        ) : null
      }
      rows={visibleRows}
      columns={columns}
      getRowId={(row) => row.product}
      disableRowSelectionOnClick
      disableColumnFilter
      showToolbar
      showExport={false}
      pageSizeOptions={[10, 20, 50]}
      initialState={{
        pagination: { paginationModel: { page: 0, pageSize: 20 } },
      }}
      localeText={{ noRowsLabel: "No product breakdown for this range." }}
    />
  );
}

function SecondarySections({ secondary }: { secondary?: RevenueSecondary }) {
  const taxItems: { label: string; value: string }[] = [
    { label: "TDS", value: moneyLabel(secondary?.tds ?? null) },
    { label: "TCS", value: moneyLabel(secondary?.tcs ?? null) },
    { label: "OTA GST", value: moneyLabel(secondary?.otaGst ?? null) },
    {
      label: "OTA revenue including GST",
      value: moneyLabel(secondary?.otaRevenueIncludingGst ?? null),
    },
  ];
  const commissionItems: { label: string; value: string }[] = [
    {
      label: "Agency commission",
      value: moneyLabel(secondary?.agencyCommission ?? null),
    },
    {
      label: "Commission reversal",
      value: moneyLabel(secondary?.commissionReversal ?? null),
    },
  ];
  const cancellationItems: { label: string; value: string }[] = [
    {
      label: "Cancelled bookings",
      value:
        secondary?.cancelledBookings == null
          ? "—"
          : String(secondary.cancelledBookings),
    },
    {
      label: "Cancellation amount",
      value: moneyLabel(secondary?.cancellationAmount ?? null),
    },
    {
      label: "Pending refund",
      value: moneyLabel(secondary?.pendingRefund ?? null),
    },
  ];

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <SecondarySection title="Tax & statutory" items={taxItems} />
      <SecondarySection title="Commission" items={commissionItems} />
      <SecondarySection
        title="Cancellation & refund"
        subtitle="Based on cancellation date"
        items={cancellationItems}
      />
    </div>
  );
}

function SecondarySection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: string }[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle ? (
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      ) : null}
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="text-xs text-slate-500">{item.label}</span>
            <span className="text-sm font-medium tabular-nums text-slate-900">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
