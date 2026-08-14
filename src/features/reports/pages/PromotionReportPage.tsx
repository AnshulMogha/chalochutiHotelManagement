import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
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
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  X,
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

function formatDisplayDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(
    value.length <= 10 ? `${value}T00:00:00` : value,
  );
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
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
      <SortIcon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? "text-[#2f3d95]" : "text-slate-400",
        )}
      />
    </button>
  );
}

export default function PromotionReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(false);
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [lifecycleTab, setLifecycleTab] =
    useState<PromotionLifecycleTab>("ACTIVE");
  const [sort, setSort] = useState<PromotionSortField>("roomNights");
  const [sortDir, setSortDir] = useState<PromotionSortDir>("desc");

  // Filter panel state (draft values are applied on "Apply filter").
  const [filterOpen, setFilterOpen] = useState(false);
  const [tiers, setTiers] = useState<PromotionTier[]>([]);
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

  const [draft, setDraft] = useState({
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
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setTiers(draft.tiers);
    setDatePreset(draft.datePreset);
    setCustomFrom(draft.customFrom);
    setCustomTo(draft.customTo);
    setPerformanceAxis(draft.performanceAxis);
    setApplicability(draft.applicability);
    setPromotionName(draft.promotionName);
    setApplicabilityFrom(draft.applicabilityFrom);
    setApplicabilityTo(draft.applicabilityTo);
    setPage(0);
    setFilterOpen(false);
  };

  const clearAll = () => {
    setDraft({
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
  };

  const activeFilterCount =
    (tiers.length ? 1 : 0) +
    (datePreset !== DEFAULT_PRESET ? 1 : 0) +
    (performanceAxis !== "BOOKING" ? 1 : 0) +
    (applicability ? 1 : 0);

  const fetchReport = useCallback(async () => {
    if (!hotelId) return;
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
        hotelId,
        lifecycleTab,
        page,
        size: pageSize,
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
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error("Failed to load promotion report", error);
      showToast("Failed to load promotion report", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hotelId,
    lifecycleTab,
    page,
    pageSize,
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
  ]);

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

  const downloadCsv = () => {
    if (!rows.length) {
      showToast("No rows to download", "error");
      return;
    }
    const header = [
      "Promotion Name",
      "Promotion Type",
      "Booking Date",
      "Stay Date",
      "Discount",
      lifecycleTab === "ACTIVE" ? "Expiring" : "De-activated On",
      "Room Nights",
      "Revenue",
      "Currency",
      "Discount Given",
      "Last Modified",
    ];
    const body = rows.map((row) => [
      row.promotionName,
      row.promotionTypeLabel ?? row.promotionType,
      row.bookingDateLabel ?? "",
      row.stayDateLabel ?? "",
      row.discountLabel ?? "",
      lifecycleTab === "ACTIVE"
        ? (row.expiringLabel ?? "")
        : (row.deactivatedOnLabel ?? row.deactivatedOn ?? ""),
      row.roomNights,
      row.revenue?.amount ?? 0,
      row.revenue?.currency ?? summary.currency,
      row.discountGiven ?? 0,
      row.lastModified ?? "",
    ]);
    const csv = [header, ...body]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `promotion-report-${lifecycleTab.toLowerCase()}-${
      performanceRange.fromDate || "export"
    }.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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

  if (!hotelId) {
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

  const colSpan = 8;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <div className="container mx-auto px-4 py-3">
          <div className="mb-3 overflow-hidden rounded-xl border border-indigo-100/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f3d95] to-indigo-500 text-white shadow-sm">
                  <Tag className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                    <Sparkles className="h-2.5 w-2.5" />
                    Reports
                  </div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Promotion Report
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Updated{" "}
                  {lastUpdatedAt
                    ? lastUpdatedAt.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
                <button
                  type="button"
                  onClick={fetchReport}
                  disabled={loading}
                  aria-label="Refresh"
                  title="Refresh"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                  />
                </button>
                <button
                  type="button"
                  onClick={downloadCsv}
                  aria-label="Download"
                  title="Download"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
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
                            ? "bg-indigo-100 text-[#2f3d95]"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                        )}
                      >
                        {tab.label}
                        <span
                          className={cn(
                            "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
                            isActive
                              ? "bg-white text-[#2f3d95]"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <BedDouble className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Room nights
                    </p>
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {summary.roomNights}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Revenue
                    </p>
                    <p className="text-sm font-bold tabular-nums text-emerald-700">
                      {formatCurrency(summary.revenue, summary.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <p className="hidden text-[11px] text-slate-400 sm:block">
                  {performanceAxis === "BOOKING" ? "Booking" : "Stay"}{" "}
                  {formatDisplayDate(performanceRange.fromDate)} –{" "}
                  {formatDisplayDate(performanceRange.toDate)}
                  {tiers.length ? ` · ${tiers.length} tier(s)` : ""}
                </p>
                <button
                  type="button"
                  onClick={openFilters}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                    activeFilterCount
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount ? (
                    <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {(
                      [
                        { label: "Promotion Name", field: "name" as const },
                        { label: "Promotion Type", field: "type" as const },
                        { label: "Booking Date" },
                        { label: "Stay Date" },
                        { label: "Discount" },
                        {
                          label:
                            lifecycleTab === "ACTIVE"
                              ? "Expiring"
                              : "Deactivated On",
                          field:
                            lifecycleTab === "ACTIVE"
                              ? ("expiring" as const)
                              : ("deactivatedOn" as const),
                        },
                        { label: "Room Nights", field: "roomNights" as const },
                        { label: "Revenue", field: "revenue" as const },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.label}
                        className="whitespace-nowrap px-3 py-2.5 text-left align-middle"
                      >
                        <SortHeader
                          label={col.label}
                          field={"field" in col ? col.field : undefined}
                          activeField={sort}
                          direction={sortDir}
                          onSort={handleSort}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-12 text-center">
                        <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-indigo-600" />
                        <p className="text-sm font-medium text-slate-600">
                          Loading promotion report…
                        </p>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-12 text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                          <Tag className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          No {lifecycleTab === "ACTIVE" ? "active" : "expired"}{" "}
                          promotions found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Try adjusting the filters or performance period.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.promotionId}
                        className="align-top transition-colors hover:bg-indigo-50/40"
                      >
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/promotions/edit/${row.promotionId}?hotelId=${hotelId}&mode=view`,
                              )
                            }
                            className="cursor-pointer text-left text-sm font-semibold text-[#2f3d95] hover:underline"
                          >
                            {row.promotionName}
                          </button>
                          {row.lastModified ? (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Last modified{" "}
                              {formatDisplayDate(row.lastModified)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-slate-700">
                            {row.promotionTypeLabel ?? row.promotionType}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-slate-700">
                            {row.bookingDateLabel ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-slate-700">
                            {row.stayDateLabel ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {row.discountLabel ?? "—"}
                          </span>
                          {row.audienceLabel ? (
                            <p className="text-[11px] text-slate-400">
                              {row.audienceLabel}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {lifecycleTab === "ACTIVE" ? (
                            row.expiringLabel ? (
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ring-1",
                                  expiringTone(row),
                                )}
                              >
                                {row.expiringLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300">—</span>
                            )
                          ) : (
                            <span className="text-sm text-slate-700">
                              {row.deactivatedOnLabel ??
                                formatDisplayDate(row.deactivatedOn)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-bold tabular-nums text-indigo-700">
                            {row.roomNights || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-bold tabular-nums text-emerald-700">
                            {formatCurrency(
                              row.revenue?.amount,
                              row.revenue?.currency ?? summary.currency,
                            )}
                          </span>
                          {row.discountGiven ? (
                            <p className="text-[11px] text-slate-400">
                              Discount{" "}
                              {formatCurrency(
                                row.discountGiven,
                                row.revenue?.currency ?? summary.currency,
                              )}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                <p className="text-xs text-slate-500">
                  Page {page + 1} of {totalPages} · {totalElements} promotions
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter drawer */}
      {filterOpen && (
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
                        <span className="text-sm text-slate-700">
                          {option.label}
                        </span>
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

                {draft.datePreset === "CUSTOM" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        From
                      </label>
                      <input
                        type="date"
                        value={draft.customFrom}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            customFrom: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        To
                      </label>
                      <input
                        type="date"
                        value={draft.customTo}
                        min={draft.customFrom || undefined}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            customTo: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

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
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
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
                <p className="mb-2 text-xs text-slate-500">
                  Filter promotion by
                </p>
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
                        <span className="text-sm text-slate-700">
                          {option.label}
                        </span>
                      </label>

                      {draft.applicability === option.value &&
                        option.value === "NAME" && (
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
                        )}

                      {draft.applicability === option.value &&
                        option.value !== "NAME" && (
                          <div className="ml-7 mt-1 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                            <div>
                              <label className="mb-1 block text-xs text-slate-500">
                                From
                              </label>
                              <input
                                type="date"
                                value={draft.applicabilityFrom}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    applicabilityFrom: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-slate-500">
                                To
                              </label>
                              <input
                                type="date"
                                value={draft.applicabilityTo}
                                min={draft.applicabilityFrom || undefined}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    applicabilityTo: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
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
                className="cursor-pointer rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#26317a]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
