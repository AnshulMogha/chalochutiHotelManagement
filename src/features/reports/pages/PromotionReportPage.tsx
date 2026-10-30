import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { canUseCrossHotelReportFilter } from "@/constants/roles";
import { HotelLookupMultiSelectField } from "../components/HotelLookupFilterField";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
} from "../components/ReportFilterDrawer";
import {
  exportStatusLabel,
  formatReportDate,
  isoToReportDateText,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "../services/reportExportService";
import {
  promotionReportService,
  type PromotionApplicabilityFilter,
  type PromotionDatePreset,
  type PromotionLifecycleTab,
  type PromotionPerformanceAxis,
  type PromotionReportRow,
  type PromotionSortDir,
  type PromotionSortField,
  type PromotionTier,
} from "../services/promotionReportService";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BedDouble,
  Building2,
  CircleDollarSign,
  RefreshCw,
} from "lucide-react";

const TIER_OPTIONS: { value: PromotionTier; label: string }[] = [
  { value: "TIER_1", label: "Promotions (Tier 1)" },
  { value: "TIER_2", label: "Special Audience Promotions (Tier 2)" },
];

const DATE_PRESET_OPTIONS: { value: PromotionDatePreset; label: string }[] = [
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_180_DAYS", label: "Last 180 days" },
  { value: "LAST_365_DAYS", label: "Last 365 days" },
  { value: "ALL_TIME", label: "All time" },
  { value: "CUSTOM", label: "Custom" },
];

const APPLICABILITY_OPTIONS: {
  value: PromotionApplicabilityFilter;
  label: string;
}[] = [
  { value: "NAME", label: "Name" },
  { value: "BOOKING_WINDOW", label: "Applicable between booking date range" },
  { value: "STAY_WINDOW", label: "Applicable between stay date range" },
];

const DEFAULT_PRESET: PromotionDatePreset = "LAST_365_DAYS";

function formatCurrency(amount?: number | null, currency = "INR"): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Expiry chips are colour coded: urgent (<=7 days), upcoming, open ended. */
function expiringTone(row: PromotionReportRow): string {
  const days = row.daysToExpire;
  if (days == null) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (days <= 7) return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function SortHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
}: {
  label: string;
  field?: PromotionSortField;
  activeField: PromotionSortField;
  direction: PromotionSortDir;
  onSort: (field: PromotionSortField) => void;
}) {
  const isActive = !!field && field === activeField;
  const SortIcon = !field
    ? null
    : isActive
      ? direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

  if (!field) {
    return (
      <span className="inline-flex h-7 items-center whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      title={isActive ? `Sorted ${direction === "asc" ? "ascending" : "descending"}` : `Sort by ${label}`}
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide",
        isActive ? "text-[#2f3d95]" : "text-slate-600 hover:text-slate-900",
      )}
    >
      {label}
      {SortIcon ? (
        <SortIcon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-[#2f3d95]" : "text-slate-400",
          )}
        />
      ) : null}
    </button>
  );
}

export default function PromotionReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { user } = useAuth();
  const canFilterHotels = canUseCrossHotelReportFilter(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [rows, setRows] = useState<PromotionReportRow[]>([]);
  const [summary, setSummary] = useState({
    activeCount: 0,
    expiredCount: 0,
    roomNights: 0,
    revenue: 0,
    currency: "INR",
  });
  const [performanceRange, setPerformanceRange] = useState({
    preset: DEFAULT_PRESET as string,
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [lifecycleTab, setLifecycleTab] =
    useState<PromotionLifecycleTab>("ACTIVE");
  const [sort, setSort] = useState<PromotionSortField>("roomNights");
  const [sortDir, setSortDir] = useState<PromotionSortDir>("desc");

  // Filter panel state (draft values are applied on "Apply filter").
  const [filterOpen, setFilterOpen] = useState(false);
  const [tiers, setTiers] = useState<PromotionTier[]>([]);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] =
    useState<PromotionDatePreset>(DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [performanceAxis, setPerformanceAxis] =
    useState<PromotionPerformanceAxis>("BOOKING");
  const [applicability, setApplicability] =
    useState<PromotionApplicabilityFilter | "">("");
  const [promotionName, setPromotionName] = useState("");
  const [applicabilityFrom, setApplicabilityFrom] = useState("");
  const [applicabilityTo, setApplicabilityTo] = useState("");
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [applicFromText, setApplicFromText] = useState("");
  const [applicToText, setApplicToText] = useState("");

  const [draft, setDraft] = useState({
    propertyIds: [] as string[],
    tiers: [] as PromotionTier[],
    datePreset: DEFAULT_PRESET as PromotionDatePreset,
    customFrom: "",
    customTo: "",
    performanceAxis: "BOOKING" as PromotionPerformanceAxis,
    applicability: "" as PromotionApplicabilityFilter | "",
    promotionName: "",
    applicabilityFrom: "",
    applicabilityTo: "",
  });

  const openFilters = () => {
    setDraft({
      propertyIds,
      tiers,
      datePreset,
      customFrom,
      customTo,
      performanceAxis,
      applicability,
      promotionName,
      applicabilityFrom,
      applicabilityTo,
    });
    setCustomFromText(isoToReportDateText(customFrom));
    setCustomToText(isoToReportDateText(customTo));
    setApplicFromText(isoToReportDateText(applicabilityFrom));
    setApplicToText(isoToReportDateText(applicabilityTo));
    setFilterOpen(true);
  };

  const applyFilters = () => {
    let nextCustomFrom = customFrom;
    let nextCustomTo = customTo;
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextCustomFrom = parsed.fromDate;
      nextCustomTo = parsed.toDate;
    }

    let nextApplicFrom = applicabilityFrom;
    let nextApplicTo = applicabilityTo;
    if (
      draft.applicability === "BOOKING_WINDOW" ||
      draft.applicability === "STAY_WINDOW"
    ) {
      const parsed = validateCustomDateRange(applicFromText, applicToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextApplicFrom = parsed.fromDate;
      nextApplicTo = parsed.toDate;
    }

    setPropertyIds(draft.propertyIds);
    setTiers(draft.tiers);
    setDatePreset(draft.datePreset);
    setCustomFrom(nextCustomFrom);
    setCustomTo(nextCustomTo);
    setPerformanceAxis(draft.performanceAxis);
    setApplicability(draft.applicability);
    setPromotionName(draft.promotionName);
    setApplicabilityFrom(nextApplicFrom);
    setApplicabilityTo(nextApplicTo);
    setPage(0);
    setFilterOpen(false);
  };

  const clearAll = () => {
    setDraft({
      propertyIds: [],
      tiers: [],
      datePreset: DEFAULT_PRESET,
      customFrom: "",
      customTo: "",
      performanceAxis: "BOOKING",
      applicability: "",
      promotionName: "",
      applicabilityFrom: "",
      applicabilityTo: "",
    });
    setCustomFromText("");
    setCustomToText("");
    setApplicFromText("");
    setApplicToText("");
    setPropertyIds([]);
    setTiers([]);
    setDatePreset(DEFAULT_PRESET);
    setCustomFrom("");
    setCustomTo("");
    setPerformanceAxis("BOOKING");
    setApplicability("");
    setPromotionName("");
    setApplicabilityFrom("");
    setApplicabilityTo("");
    setPage(0);
    setFilterOpen(false);
  };

  const activeFilterCount =
    (propertyIds.length ? 1 : 0) +
    (tiers.length ? 1 : 0) +
    (datePreset !== DEFAULT_PRESET ? 1 : 0) +
    (performanceAxis !== "BOOKING" ? 1 : 0) +
    (applicability ? 1 : 0);

  const reportParams = useMemo(
    () => ({
      hotelId: canFilterHotels ? undefined : hotelId || undefined,
      propertyIds: canFilterHotels ? propertyIds : undefined,
      lifecycleTab,
      sort,
      sortDir,
      promotionTiers: tiers.length ? tiers : undefined,
      datePreset,
      fromDate: datePreset === "CUSTOM" ? customFrom : undefined,
      toDate: datePreset === "CUSTOM" ? customTo : undefined,
      performanceDateAxis: performanceAxis,
      applicabilityFilter: applicability || undefined,
      promotionName: applicability === "NAME" ? promotionName : undefined,
      applicabilityFrom:
        applicability === "BOOKING_WINDOW" || applicability === "STAY_WINDOW"
          ? applicabilityFrom
          : undefined,
      applicabilityTo:
        applicability === "BOOKING_WINDOW" || applicability === "STAY_WINDOW"
          ? applicabilityTo
          : undefined,
    }),
    [
      canFilterHotels,
      hotelId,
      propertyIds,
      lifecycleTab,
      sort,
      sortDir,
      tiers,
      datePreset,
      customFrom,
      customTo,
      performanceAxis,
      applicability,
      promotionName,
      applicabilityFrom,
      applicabilityTo,
    ],
  );

  const fetchReport = useCallback(async () => {
    if (!canFilterHotels && !hotelId) return;
    if (datePreset === "CUSTOM" && (!customFrom || !customTo)) return;
    if (
      (applicability === "BOOKING_WINDOW" || applicability === "STAY_WINDOW") &&
      (!applicabilityFrom || !applicabilityTo)
    ) {
      return;
    }

    setLoading(true);
    try {
      const data = await promotionReportService.getPromotionReport({
        ...reportParams,
        page,
        size: pageSize,
      });

      setRows(data.promotions);
      setSummary(data.summary);
      setPerformanceRange({
        preset: data.performanceDateRange.preset ?? datePreset,
        fromDate: data.performanceDateRange.fromDate,
        toDate: data.performanceDateRange.toDate,
      });
      setTotalPages(data.page.totalPages);
      setTotalElements(data.page.totalElements);
    } catch (error) {
      console.error("Failed to load promotion report", error);
      showToast("Failed to load promotion report", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canFilterHotels, hotelId, datePreset, customFrom, customTo, applicability, applicabilityFrom, applicabilityTo, reportParams, page, pageSize, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSort = (field: PromotionSortField) => {
    setPage(0);
    if (sort === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("desc");
    }
  };

  const promotionColumns = useMemo<GridColDef<PromotionReportRow>[]>(() => {
    const header = (
      label: string,
      field?: PromotionSortField,
    ) =>
      field ? (
        <SortHeader
          label={label}
          field={field}
          activeField={sort}
          direction={sortDir}
          onSort={handleSort}
        />
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      );

    const expiringField: PromotionSortField =
      lifecycleTab === "ACTIVE" ? "expiring" : "deactivatedOn";

    return [
      {
        field: "promotionName",
        headerName: "Promotion Name",
        flex: 1.2,
        minWidth: 180,
        sortable: false,
        renderHeader: () => header("Promotion Name", "name"),
        renderCell: (params) => (
          <div className="min-w-0 leading-tight">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/promotions/edit/${params.row.promotionId}?hotelId=${params.row.hotelId || hotelId}&mode=view`,
                )
              }
              className="cursor-pointer text-left text-sm font-semibold text-[#2f3d95] hover:underline"
            >
              {params.row.promotionName}
            </button>
            {params.row.lastModified ? (
              <p className="mt-0.5 text-[11px] text-slate-400">
                Last modified {formatReportDate(params.row.lastModified)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "hotelName",
        headerName: "Hotel Name",
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderHeader: () => header("Hotel Name"),
        renderCell: (params) => (
          <span className="truncate text-sm text-slate-700" title={params.row.hotelName || undefined}>
            {params.row.hotelName || "—"}
          </span>
        ),
      },
      {
        field: "promotionType",
        headerName: "Promotion Type",
        width: 150,
        sortable: false,
        renderHeader: () => header("Promotion Type", "type"),
        renderCell: (params) => (
          <span className="text-sm text-slate-700">
            {params.row.promotionTypeLabel ?? params.row.promotionType}
          </span>
        ),
      },
      {
        field: "bookingDateLabel",
        headerName: "Booking Date",
        width: 160,
        sortable: false,
        renderHeader: () => header("Booking Date"),
        renderCell: (params) => (
          <span className="text-sm text-slate-700">{params.row.bookingDateLabel ?? "—"}</span>
        ),
      },
      {
        field: "stayDateLabel",
        headerName: "Stay Date",
        width: 160,
        sortable: false,
        renderHeader: () => header("Stay Date"),
        renderCell: (params) => (
          <span className="text-sm text-slate-700">{params.row.stayDateLabel ?? "—"}</span>
        ),
      },
      {
        field: "discountLabel",
        headerName: "Discount",
        width: 140,
        sortable: false,
        renderHeader: () => header("Discount"),
        renderCell: (params) => (
          <div className="leading-tight">
            <span className="text-sm font-semibold text-slate-800">
              {params.row.discountLabel ?? "—"}
            </span>
            {params.row.audienceLabel ? (
              <p className="text-[11px] text-slate-400">{params.row.audienceLabel}</p>
            ) : null}
          </div>
        ),
      },
      {
        field: expiringField,
        headerName: lifecycleTab === "ACTIVE" ? "Expiring" : "Deactivated On",
        width: 150,
        sortable: false,
        renderHeader: () =>
          header(
            lifecycleTab === "ACTIVE" ? "Expiring" : "Deactivated On",
            expiringField,
          ),
        renderCell: (params) =>
          lifecycleTab === "ACTIVE" ? (
            params.row.expiringLabel ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase leading-tight ring-1",
                  expiringTone(params.row),
                )}
              >
                {params.row.expiringLabel}
              </span>
            ) : (
              <span className="text-sm text-slate-300">—</span>
            )
          ) : (
            <span className="text-sm text-slate-700">
              {params.row.deactivatedOnLabel ?? formatReportDate(params.row.deactivatedOn)}
            </span>
          ),
      },
      {
        field: "roomNights",
        headerName: "Room Nights",
        width: 130,
        sortable: false,
        renderHeader: () => header("Room Nights", "roomNights"),
        renderCell: (params) => (
          <span className="text-sm font-bold tabular-nums text-indigo-700">
            {params.row.roomNights || "—"}
          </span>
        ),
      },
      {
        field: "revenue",
        headerName: "Revenue",
        width: 150,
        sortable: false,
        renderHeader: () => header("Revenue", "revenue"),
        renderCell: (params) => (
          <div className="leading-tight">
            <span className="text-sm font-bold tabular-nums text-emerald-700">
              {formatCurrency(
                params.row.revenue?.amount,
                params.row.revenue?.currency ?? summary.currency,
              )}
            </span>
            {params.row.discountGiven ? (
              <p className="text-[11px] text-slate-400">
                Discount{" "}
                {formatCurrency(
                  params.row.discountGiven,
                  params.row.revenue?.currency ?? summary.currency,
                )}
              </p>
            ) : null}
          </div>
        ),
      },
    ];
  }, [handleSort, hotelId, lifecycleTab, navigate, sort, sortDir, summary.currency]);

  const switchTab = (tab: PromotionLifecycleTab) => {
    if (tab === lifecycleTab) return;
    setLifecycleTab(tab);
    setPage(0);
    // "Expiring" only exists on active rows, "de-activated on" only on expired.
    setSort((prev) => {
      if (tab === "EXPIRED" && prev === "expiring") return "deactivatedOn";
      if (tab === "ACTIVE" && prev === "deactivatedOn") return "expiring";
      return prev;
    });
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!canFilterHotels && !hotelId) return;
    if (datePreset === "CUSTOM" && (!customFrom || !customTo)) {
      showToast("Select both custom dates", "error");
      return;
    }
    if (
      (applicability === "BOOKING_WINDOW" || applicability === "STAY_WINDOW") &&
      (!applicabilityFrom || !applicabilityTo)
    ) {
      showToast("Select both applicability dates", "error");
      return;
    }

    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await promotionReportService.exportReport(
        reportParams,
        format,
        setExportStatus,
      );
      showToast("Promotion report downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const tabs = useMemo(
    () =>
      [
        { value: "ACTIVE" as const, label: "Active", count: summary.activeCount },
        {
          value: "EXPIRED" as const,
          label: "Expired",
          count: summary.expiredCount,
        },
      ] satisfies { value: PromotionLifecycleTab; label: string; count: number }[],
    [summary.activeCount, summary.expiredCount],
  );

  if (!canFilterHotels && !hotelId) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900">Promotion Report</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Please select a hotel from the dropdown above to view promotion
            performance
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2f3d95]/10">
              <Building2 className="h-8 w-8 text-[#2f3d95]" />
            </div>
            <p className="font-medium text-gray-500">No hotel selected</p>
            <p className="mt-1 text-sm text-gray-400">
              Use the hotel selector in the top bar to choose a property
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {tabs.map((tab) => {
                    const isActive = tab.value === lifecycleTab;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => switchTab(tab.value)}
                        className={cn(
                          "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
                          isActive
                            ? "bg-[#2f3d95] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                        )}
                      >
                        {tab.label}
                        <span
                          className={cn(
                            "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white text-slate-500",
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-2 py-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <BedDouble className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      Room nights
                    </p>
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {summary.roomNights}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-2 py-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Revenue
                    </p>
                    <p className="text-sm font-bold tabular-nums text-emerald-700">
                      {formatCurrency(summary.revenue, summary.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={performanceRange.fromDate}
                  to={performanceRange.toDate}
                  detail={`${performanceAxis === "BOOKING" ? "Booking" : "Stay"}${
                    tiers.length ? ` · ${tiers.length} tier(s)` : ""
                  }`}
                />
                <ReportFilterButton
                  onClick={openFilters}
                  activeCount={activeFilterCount}
                />
                <ExportButton
                  iconOnly
                  disabled={loading}
                  exporting={exporting}
                  exportingLabel={
                    exportStatusLabel(exportStatus) || "Exporting…"
                  }
                  onExportExcel={() => void handleExport("EXCEL")}
                  onExportCSV={() => void handleExport("CSV")}
                  onExportPDF={() => void handleExport("PDF")}
                />
                <button
                  type="button"
                  onClick={fetchReport}
                  disabled={loading}
                  aria-label="Refresh"
                  title="Refresh"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                  />
                </button>
              </div>
            </div>
          </div>

          <DataTable
            subtitle={
              <>
                <span className="font-medium text-slate-600">
                  {formatListCount(totalElements, "promotion")}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
              </>
            }
            rows={rows}
            columns={promotionColumns}
            getRowId={(row) => row.promotionId}
            loading={loading}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              if (model.page !== page) setPage(Math.max(0, model.page));
            }}
            pageSizeOptions={[pageSize]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            rowHeight={64}
            localeText={{
              noRowsLabel:
                lifecycleTab === "ACTIVE"
                  ? "No active promotions found"
                  : "No expired promotions found",
            }}
          />
        </div>
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={clearAll}
        onApply={applyFilters}
      >
        {canFilterHotels ? (
          <HotelLookupMultiSelectField
            value={draft.propertyIds}
            onChange={(ids) =>
              setDraft((prev) => ({ ...prev, propertyIds: ids }))
            }
          />
        ) : null}
        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            Promotion Type
          </h3>
          <div className="space-y-2">
            {TIER_OPTIONS.map((option) => {
              const checked = draft.tiers.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setDraft((prev) => ({
                        ...prev,
                        tiers: checked
                          ? prev.tiers.filter((t) => t !== option.value)
                          : [...prev.tiers, option.value],
                      }))
                    }
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            View Promotion Performance
          </h3>
          <label className="mb-1 block text-xs text-slate-500">
            Time period
          </label>
          <select
            value={draft.datePreset}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                datePreset: e.target.value as PromotionDatePreset,
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
            <ReportCustomDateFields
              className="mt-3"
              fromText={customFromText}
              toText={customToText}
              onFromTextChange={setCustomFromText}
              onToTextChange={setCustomToText}
            />
          ) : null}

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500">
              Measure performance on
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "BOOKING", label: "Booking dates" },
                  { value: "STAY", label: "Stay dates" },
                ] as { value: PromotionPerformanceAxis; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      performanceAxis: option.value,
                    }))
                  }
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition",
                    draft.performanceAxis === option.value
                      ? "border-[#2f3d95]/30 bg-[#2f3d95]/5 text-[#2f3d95]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            Advanced Filter
          </h3>
          <p className="mb-2 text-xs text-slate-500">Filter promotion by</p>
          <div className="space-y-2">
            {APPLICABILITY_OPTIONS.map((option) => (
              <div key={option.value}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="applicabilityFilter"
                    checked={draft.applicability === option.value}
                    onChange={() =>
                      setDraft((prev) => ({
                        ...prev,
                        applicability: option.value,
                      }))
                    }
                  />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </label>

                {draft.applicability === option.value &&
                option.value === "NAME" ? (
                  <div className="ml-7 mt-1 rounded-lg bg-slate-50 p-3">
                    <label className="mb-1 block text-xs text-slate-500">
                      Promotion name
                    </label>
                    <input
                      type="text"
                      value={draft.promotionName}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          promotionName: e.target.value,
                        }))
                      }
                      placeholder="Search for promotion names"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                ) : null}

                {draft.applicability === option.value &&
                option.value !== "NAME" ? (
                  <ReportCustomDateFields
                    className="ml-7 mt-1 rounded-lg bg-slate-50 p-3"
                    fromText={applicFromText}
                    toText={applicToText}
                    onFromTextChange={setApplicFromText}
                    onToTextChange={setApplicToText}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </ReportFilterDrawer>
    </>
  );
}
