import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  adminService,
  type CityMasterItem,
  type HotelLookupItem,
} from "@/features/admin/services/adminService";
import {
  bookingSummaryService,
  type BookingSummaryDatePreset,
  type BookingSummaryDrillDown,
  type BookingSummaryHotelRow,
  type BookingSummarySortDir,
  type BookingSummarySortField,
} from "../services/bookingSummaryService";
import {
  ArrowUpDown,
  BookOpen,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Download,
  Filter,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatReportDate,
  isoToReportDateText,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import { ROLES, hasAnyRole } from "@/constants/roles";
import { useAuth } from "@/hooks";

const DATE_PRESET_OPTIONS: {
  value: BookingSummaryDatePreset;
  label: string;
}[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_WEEK", label: "Last week" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "CUSTOM", label: "Custom" },
];

/**
 * The metrics table and the earnings panel are two separate tables shown side
 * by side, so their bars and header rows need identical fixed heights to line
 * up once labels start wrapping on narrow screens.
 */
const TABLE_TOP_BAR_CLASS = "h-14";
const TABLE_HEADER_ROW_CLASS = "h-20";

function formatCurrency(
  amount: number | undefined | null,
  currency = "INR",
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactEarnings(
  amount: number | undefined | null,
  currency = "INR",
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "—";
  }
  const abs = Math.abs(amount);
  if (abs >= 100000) {
    const lakhs = amount / 100000;
    const prefix = currency === "INR" ? "₹" : "";
    return `${prefix}${lakhs.toFixed(1)}L`;
  }
  return formatCurrency(amount, currency);
}

function MetricLink({
  value,
  onClick,
  tone = "indigo",
}: {
  value: number;
  onClick?: () => void;
  tone?: "indigo" | "sky" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    indigo: "text-indigo-700 hover:bg-indigo-50",
    sky: "text-sky-700 hover:bg-sky-50",
    emerald: "text-emerald-700 hover:bg-emerald-50",
    amber: "text-amber-700 hover:bg-amber-50",
    violet: "text-violet-700 hover:bg-violet-50",
  };
  const staticTones = {
    indigo: "text-indigo-700",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    violet: "text-violet-700",
  };

  if (!value) {
    return <span className="text-sm text-slate-300">—</span>;
  }
  if (!onClick) {
    return (
      <span className={cn("text-sm font-bold tabular-nums", staticTones[tone])}>
        {value}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[2rem] cursor-pointer items-center justify-center rounded-lg px-2 py-1 text-sm font-bold tabular-nums transition-colors",
        tones[tone],
      )}
    >
      {value}
    </button>
  );
}

function EarningsCell({
  amount,
  currency = "INR",
  onClick,
  tone = "emerald",
}: {
  amount: number | undefined | null;
  currency?: string;
  onClick?: () => void;
  tone?: "emerald" | "amber";
}) {
  const tones = {
    emerald: { text: "text-emerald-700", hover: "hover:bg-emerald-50" },
    amber: { text: "text-amber-700", hover: "hover:bg-amber-50" },
  }[tone];

  if (
    amount === undefined ||
    amount === null ||
    Number.isNaN(amount) ||
    !amount
  ) {
    return <span className="text-sm text-slate-300">—</span>;
  }
  const label = formatCompactEarnings(amount, currency);
  if (!onClick) {
    return (
      <span className={cn("text-sm font-bold tabular-nums", tones.text)}>
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-lg px-2 py-1 text-sm font-bold tabular-nums transition-colors",
        tones.text,
        tones.hover,
      )}
      title={formatCurrency(amount, currency)}
    >
      {label}
    </button>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  hint,
  tone,
}: {
  label: string;
  active?: boolean;
  direction?: BookingSummarySortDir;
  onClick?: () => void;
  hint?: string;
  tone?: "indigo" | "emerald" | "sky" | "violet" | "amber" | "slate";
}) {
  const toneClass = {
    indigo: "text-indigo-700 hover:text-indigo-900",
    emerald: "text-emerald-700 hover:text-emerald-900",
    sky: "text-sky-700 hover:text-sky-900",
    violet: "text-violet-700 hover:text-violet-900",
    amber: "text-amber-700 hover:text-amber-900",
    slate: "text-slate-600 hover:text-slate-900",
  }[tone ?? "slate"];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer flex-col items-start gap-1 text-left text-xs font-semibold uppercase tracking-wide",
        toneClass,
      )}
      title={hint ? `${label} — ${hint}` : label}
    >
      <span className="flex w-full items-start gap-1">
        <span className="line-clamp-2 leading-snug">{label}</span>
        {hint && (
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 normal-case tracking-normal",
          active
            ? "border-indigo-200 bg-indigo-100 text-[#2f3d95]"
            : "border-slate-200 bg-white/80 text-slate-400",
        )}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {active ? (
          <span className="text-[11px] font-bold leading-none">
            {direction === "asc" ? "Asc" : "Desc"}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function BookingSummaryPage() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = hasAnyRole(user?.roles, [ROLES.SUPER_ADMIN]);

  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [hotels, setHotels] = useState<BookingSummaryHotelRow[]>([]);
  const [summary, setSummary] = useState({
    totalHotels: 0,
    netBookings: 0,
    otaEarnings: { amount: 0, currency: "INR" },
    hotelEarnings: { amount: 0, currency: "INR" },
  });
  const [dateRange, setDateRange] = useState({
    fromDate: "",
    toDate: "",
    preset: "LAST_30_DAYS",
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState<BookingSummarySortField>("netBookings");
  const [sortDir, setSortDir] = useState<BookingSummarySortDir>("desc");

  const [datePreset, setDatePreset] =
    useState<BookingSummaryDatePreset>("LAST_30_DAYS");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [propertyFilterQuery, setPropertyFilterQuery] = useState("");
  const [cityFilterQuery, setCityFilterQuery] = useState("");
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [propertyOptions, setPropertyOptions] = useState<HotelLookupItem[]>([]);
  const [cityOptions, setCityOptions] = useState<CityMasterItem[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!dateOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(target)
      ) {
        setDateOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [dateOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFiltersLoading(true);
      try {
        const [lookup, cities] = await Promise.all([
          adminService.getSuperAdminHotelLookup(""),
          adminService.getCities(),
        ]);
        if (!cancelled) {
          setPropertyOptions(lookup);
          setCityOptions(cities.filter((c) => c.active !== false));
        }
      } catch (err) {
        console.error("Failed to load report filters", err);
        if (!cancelled) {
          showToast("Failed to load filter options", "error");
        }
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    if (datePreset === "CUSTOM" && (!customFrom || !customTo)) {
      return;
    }
    setLoading(true);
    try {
      const data = await bookingSummaryService.getBookingSummary({
        page,
        size: pageSize,
        sort,
        sortDir,
        datePreset,
        fromDate: datePreset === "CUSTOM" ? customFrom : undefined,
        toDate: datePreset === "CUSTOM" ? customTo : undefined,
        propertyIds: selectedPropertyIds,
        cityIds: selectedCityIds,
        search: debouncedSearch || undefined,
      });
      setHotels(data.hotels);
      setSummary(data.summary);
      setDateRange({
        fromDate: data.dateRange.fromDate,
        toDate: data.dateRange.toDate,
        preset: data.dateRange.preset ?? datePreset,
      });
      setTotalElements(data.page.totalElements);
      setTotalPages(data.page.totalPages);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("Failed to load booking summary", err);
      showToast("Failed to load booking summary", "error");
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    sort,
    sortDir,
    datePreset,
    customFrom,
    customTo,
    selectedPropertyIds,
    selectedCityIds,
    debouncedSearch,
  ]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const openDrillDown = (
    hotel: BookingSummaryHotelRow,
    drill?: BookingSummaryDrillDown | null,
  ) => {
    if (!drill?.view) return;
    const params = new URLSearchParams();
    params.set("hotelId", hotel.hotelId);
    params.set("view", drill.view);
    Object.entries(drill.filters || {}).forEach(([key, value]) => {
      if (value != null && String(value).trim() !== "") {
        params.set(key, String(value));
      }
    });
    navigate(`${ROUTES.BOOKINGS.LIST}?${params.toString()}`);
  };

  const toggleSort = (field: BookingSummarySortField) => {
    setPage(0);
    if (sort === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedPropertyIds([]);
    setSelectedCityIds([]);
    setPropertyFilterQuery("");
    setCityFilterQuery("");
    setDatePreset("LAST_30_DAYS");
    setCustomFrom("");
    setCustomTo("");
    setPage(0);
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedPropertyIds.length ? 1 : 0) +
    (selectedCityIds.length ? 1 : 0);

  const filteredPropertyOptions = useMemo(() => {
    const query = propertyFilterQuery.trim().toLowerCase();
    if (!query) return propertyOptions;
    return propertyOptions.filter((p) => {
      const haystack = `${p.hotelName} ${p.city ?? ""} ${p.hotelCode ?? ""}`
        .toLowerCase()
        .trim();
      return haystack.includes(query);
    });
  }, [propertyOptions, propertyFilterQuery]);

  const filteredCityOptions = useMemo(() => {
    const query = cityFilterQuery.trim().toLowerCase();
    if (!query) return cityOptions;
    return cityOptions.filter((c) =>
      c.name.toLowerCase().includes(query),
    );
  }, [cityOptions, cityFilterQuery]);

  const downloadCsv = () => {
    if (!hotels.length) {
      showToast("No rows to download", "error");
      return;
    }
    const header = [
      "Hotel",
      "Code",
      "City",
      "State",
      "Todays Bookings",
      "Todays Check Ins",
      "Staying Today",
      "Todays Check Outs",
      "Net Bookings",
      "Hotel Earnings",
      ...(isSuperAdmin ? ["OTA Earnings"] : []),
      "Currency",
    ];
    const rows = hotels.map((h) => [
      h.hotelName,
      h.hotelCode ?? "",
      h.city ?? "",
      h.state ?? "",
      h.metrics.todaysBookings,
      h.metrics.todaysCheckins,
      h.metrics.stayingToday,
      h.metrics.todaysCheckouts,
      h.metrics.netBookings,
      h.metrics.hotelEarnings?.amount ?? 0,
      ...(isSuperAdmin ? [h.metrics.otaEarnings?.amount ?? 0] : []),
      h.metrics.hotelEarnings?.currency ??
        h.metrics.otaEarnings?.currency ??
        "INR",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-summary-${dateRange.fromDate || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columnTotals = useMemo(() => {
    return hotels.reduce(
      (acc, h) => {
        acc.todaysBookings += h.metrics.todaysBookings || 0;
        acc.todaysCheckins += h.metrics.todaysCheckins || 0;
        acc.stayingToday += h.metrics.stayingToday || 0;
        acc.todaysCheckouts += h.metrics.todaysCheckouts || 0;
        return acc;
      },
      {
        todaysBookings: 0,
        todaysCheckins: 0,
        stayingToday: 0,
        todaysCheckouts: 0,
      },
    );
  }, [hotels]);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <div className="container mx-auto px-4 py-4">
          <div className="mb-3 overflow-hidden rounded-2xl border border-indigo-100/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f3d95] to-indigo-500 text-white shadow-sm">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h1 className="truncate text-lg font-bold text-slate-900">
                  Booking Summary
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                    activeFilterCount
                      ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50",
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
                <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline">
                  Last updated{" "}
                  {lastUpdatedAt
                    ? lastUpdatedAt.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
                <button
                  type="button"
                  onClick={fetchSummary}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                  />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={downloadCsv}
                  aria-label="Download"
                  title="Download"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={cn(
                "grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-3",
                isSuperAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4",
              )}
            >
                {[
                  {
                    label: "Hotels",
                    value: summary.totalHotels || totalElements,
                    icon: Building2,
                    tone: "bg-slate-100 text-slate-700",
                  },
                  {
                    label: "Net bookings",
                    value: summary.netBookings,
                    icon: BookOpen,
                    tone: "bg-indigo-100 text-indigo-700",
                  },
                  {
                    label: "Today bookings",
                    value: columnTotals.todaysBookings,
                    icon: ClipboardList,
                    tone: "bg-sky-100 text-sky-700",
                  },
                  {
                    label: "Hotel earnings",
                    value: formatCompactEarnings(
                      summary.hotelEarnings.amount,
                      summary.hotelEarnings.currency,
                    ),
                    icon: CircleDollarSign,
                    tone: "bg-emerald-100 text-emerald-700",
                  },
                  ...(isSuperAdmin
                    ? [
                        {
                          label: "OTA earnings",
                          value: formatCompactEarnings(
                            summary.otaEarnings.amount,
                            summary.otaEarnings.currency,
                          ),
                          icon: Wallet,
                          tone: "bg-amber-100 text-amber-700",
                        },
                      ]
                    : []),
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 shadow-sm"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        kpi.tone,
                      )}
                    >
                      <kpi.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {kpi.label}
                      </p>
                      <p className="text-base font-bold tabular-nums text-slate-900">
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 items-start gap-3",
              isSuperAdmin
                ? "xl:grid-cols-[minmax(0,1fr)_460px]"
                : "xl:grid-cols-[minmax(0,1fr)_340px]",
            )}
          >
            {/* Left: today's metrics */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
                  <thead>
                    {/* Spacer matches right date bar height */}
                    <tr>
                      <th
                        colSpan={5}
                        className={cn(
                          TABLE_TOP_BAR_CLASS,
                          "border-b border-slate-100 bg-slate-50/60 px-4 text-left",
                        )}
                      >
                        <span className="text-xs font-medium text-slate-400">
                          Today&apos;s activity
                        </span>
                      </th>
                    </tr>
                    <tr
                      className={cn(
                        TABLE_HEADER_ROW_CLASS,
                        "border-b border-slate-100",
                      )}
                    >
                      <th className="bg-slate-100/90 px-4 text-left align-middle">
                        <SortHeader
                          label="Property"
                          active={sort === "hotelName"}
                          direction={sortDir}
                          onClick={() => toggleSort("hotelName")}
                          tone="slate"
                        />
                      </th>
                      <th className="bg-indigo-50 px-3 text-left align-middle">
                        <SortHeader
                          label={`Today's Bookings (${columnTotals.todaysBookings})`}
                          active={sort === "todaysBookings"}
                          direction={sortDir}
                          onClick={() => toggleSort("todaysBookings")}
                          tone="indigo"
                        />
                      </th>
                      <th className="bg-sky-50 px-3 text-left align-middle">
                        <SortHeader
                          label={`Today's Check Ins (${columnTotals.todaysCheckins})`}
                          active={sort === "todaysCheckins"}
                          direction={sortDir}
                          onClick={() => toggleSort("todaysCheckins")}
                          tone="sky"
                        />
                      </th>
                      <th className="bg-violet-50 px-3 text-left align-middle">
                        <SortHeader
                          label={`Staying Today (${columnTotals.stayingToday})`}
                          active={sort === "stayingToday"}
                          direction={sortDir}
                          onClick={() => toggleSort("stayingToday")}
                          tone="violet"
                        />
                      </th>
                      <th className="bg-amber-50 px-3 text-left align-middle">
                        <SortHeader
                          label={`Today's Check Outs (${columnTotals.todaysCheckouts})`}
                          active={sort === "todaysCheckouts"}
                          direction={sortDir}
                          onClick={() => toggleSort("todaysCheckouts")}
                          tone="amber"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-20 text-center">
                          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-indigo-600" />
                          <p className="text-sm font-medium text-slate-600">
                            Loading booking summary…
                          </p>
                        </td>
                      </tr>
                    ) : hotels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-20 text-center">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <Building2 className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            No hotels found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Try adjusting filters or date range.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      hotels.map((hotel) => (
                        <tr
                          key={hotel.hotelId}
                          className="h-[4.75rem] transition-colors hover:bg-indigo-50/40"
                        >
                          <td className="px-4 align-middle">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-[#2f3d95] text-white shadow-sm shadow-indigo-200">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {hotel.hotelName}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                  {[hotel.city, hotel.state]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </p>
                                {hotel.hotelCode ? (
                                  <p className="truncate font-mono text-[11px] text-slate-400">
                                    {hotel.hotelCode}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 align-middle">
                            <MetricLink
                              value={hotel.metrics.todaysBookings}
                              tone="indigo"
                              onClick={() =>
                                openDrillDown(
                                  hotel,
                                  hotel.drillDown.todaysBookings,
                                )
                              }
                            />
                          </td>
                          <td className="px-3 align-middle">
                            <MetricLink
                              value={hotel.metrics.todaysCheckins}
                              tone="sky"
                              onClick={() =>
                                openDrillDown(
                                  hotel,
                                  hotel.drillDown.todaysCheckins,
                                )
                              }
                            />
                          </td>
                          <td className="px-3 align-middle">
                            <MetricLink
                              value={hotel.metrics.stayingToday}
                              tone="violet"
                              onClick={() =>
                                openDrillDown(
                                  hotel,
                                  hotel.drillDown.stayingToday,
                                )
                              }
                            />
                          </td>
                          <td className="px-3 align-middle">
                            <MetricLink
                              value={hotel.metrics.todaysCheckouts}
                              tone="amber"
                              onClick={() =>
                                openDrillDown(
                                  hotel,
                                  hotel.drillDown.todaysCheckouts,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Page {page + 1} of {totalPages} · {totalElements} hotels
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 0 || loading}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: separate Net Bookings + earnings split (hotel-wise) */}
            <aside className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-sm ring-1 ring-indigo-100/60">
              <div
                ref={dateDropdownRef}
                className={cn(
                  TABLE_TOP_BAR_CLASS,
                  "relative flex items-center border-b border-indigo-100 bg-gradient-to-r from-indigo-100/90 via-sky-50 to-emerald-50 px-4",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-900">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    {formatReportDate(dateRange.fromDate)} –{" "}
                    {formatReportDate(dateRange.toDate)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDateOpen((v) => !v)}
                    className="inline-flex items-center gap-0.5 text-sm font-semibold text-indigo-700 hover:underline"
                  >
                    Change Dates
                    <span className="text-indigo-400">›</span>
                  </button>
                </div>
                {dateOpen && (
                  <div className="absolute left-3 right-3 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Date preset
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {DATE_PRESET_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDatePreset(opt.value);
                            setPage(0);
                            if (opt.value !== "CUSTOM") {
                              setDateOpen(false);
                            } else {
                              setCustomFromText(isoToReportDateText(customFrom));
                              setCustomToText(isoToReportDateText(customTo));
                            }
                          }}
                          className={cn(
                            "flex w-full rounded-lg px-2 py-1.5 text-left text-sm",
                            datePreset === opt.value
                              ? "bg-indigo-50 font-semibold text-indigo-700"
                              : "text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {datePreset === "CUSTOM" && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <ReportCustomDateFields
                          fromText={customFromText}
                          toText={customToText}
                          onFromTextChange={setCustomFromText}
                          onToTextChange={setCustomToText}
                          inputClassName="rounded-md"
                        />
                        <button
                          type="button"
                          disabled={
                            !validateCustomDateRange(customFromText, customToText).ok
                          }
                          onClick={() => {
                            const parsed = validateCustomDateRange(
                              customFromText,
                              customToText,
                            );
                            if (!parsed.ok) return;
                            setCustomFrom(parsed.fromDate);
                            setCustomTo(parsed.toDate);
                            setCustomFromText(formatReportDate(parsed.fromDate));
                            setCustomToText(formatReportDate(parsed.toDate));
                            setDateOpen(false);
                          }}
                          className="w-full rounded-lg bg-[#2f3d95] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr
                      className={cn(
                        TABLE_HEADER_ROW_CLASS,
                        "border-b border-indigo-100",
                      )}
                    >
                      <th className="bg-indigo-50/80 px-3 text-left align-middle">
                        <SortHeader
                          label={`Net Bookings (${summary.netBookings})`}
                          active={sort === "netBookings"}
                          direction={sortDir}
                          onClick={() => toggleSort("netBookings")}
                          hint="Bookings in selected date range (per hotel)"
                          tone="indigo"
                        />
                      </th>
                      <th className="bg-emerald-50/80 px-3 text-left align-middle">
                        <SortHeader
                          label={`Hotel Earnings (${formatCompactEarnings(
                            summary.hotelEarnings.amount,
                            summary.hotelEarnings.currency,
                          )})`}
                          active={sort === "hotelEarnings"}
                          direction={sortDir}
                          onClick={() => toggleSort("hotelEarnings")}
                          hint="Amount payable to the property in selected date range"
                          tone="emerald"
                        />
                      </th>
                      {isSuperAdmin && (
                        <th className="bg-amber-50/80 px-3 text-left align-middle">
                          <SortHeader
                            label={`OTA Earnings (${formatCompactEarnings(
                              summary.otaEarnings.amount,
                              summary.otaEarnings.currency,
                            )})`}
                            active={sort === "otaEarnings"}
                            direction={sortDir}
                            onClick={() => toggleSort("otaEarnings")}
                            hint="Commission and fees retained by the OTA"
                            tone="amber"
                          />
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={isSuperAdmin ? 3 : 2}
                          className="px-4 py-20 text-center"
                        >
                          <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
                        </td>
                      </tr>
                    ) : hotels.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isSuperAdmin ? 3 : 2}
                          className="px-4 py-16 text-center text-xs text-slate-400"
                        >
                          No data
                        </td>
                      </tr>
                    ) : (
                      hotels.map((hotel) => (
                        <tr
                          key={`net-${hotel.hotelId}`}
                          className="h-[4.75rem] transition-colors hover:bg-indigo-50/40"
                        >
                          <td className="bg-indigo-50/20 px-3 align-middle">
                            <MetricLink
                              value={hotel.metrics.netBookings}
                              tone="indigo"
                              onClick={
                                hotel.drillDown.netBookings
                                  ? () =>
                                      openDrillDown(
                                        hotel,
                                        hotel.drillDown.netBookings,
                                      )
                                  : undefined
                              }
                            />
                          </td>
                          <td className="bg-emerald-50/20 px-3 align-middle">
                            <EarningsCell
                              amount={hotel.metrics.hotelEarnings?.amount}
                              currency={
                                hotel.metrics.hotelEarnings?.currency ?? "INR"
                              }
                              onClick={
                                hotel.drillDown.hotelEarnings
                                  ? () =>
                                      openDrillDown(
                                        hotel,
                                        hotel.drillDown.hotelEarnings,
                                      )
                                  : undefined
                              }
                            />
                          </td>
                          {isSuperAdmin && (
                            <td className="bg-amber-50/20 px-3 align-middle">
                              <EarningsCell
                                amount={hotel.metrics.otaEarnings?.amount}
                                currency={
                                  hotel.metrics.otaEarnings?.currency ?? "INR"
                                }
                                tone="amber"
                                onClick={
                                  hotel.drillDown.otaEarnings
                                    ? () =>
                                        openDrillDown(
                                          hotel,
                                          hotel.drillDown.otaEarnings,
                                        )
                                    : undefined
                                }
                              />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </aside>
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
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search property…"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Property
                </label>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={propertyFilterQuery}
                    onChange={(e) => setPropertyFilterQuery(e.target.value)}
                    placeholder="Search property…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-8 text-sm"
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-1">
                  {filtersLoading ? (
                    <p className="px-2 py-3 text-sm text-slate-500">Loading…</p>
                  ) : filteredPropertyOptions.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">
                      No properties found
                    </p>
                  ) : (
                    filteredPropertyOptions.map((p) => {
                      const checked = selectedPropertyIds.includes(p.hotelId);
                      return (
                        <label
                          key={p.hotelId}
                          className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={checked}
                            onChange={() => {
                              setPage(0);
                              setSelectedPropertyIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== p.hotelId)
                                  : [...prev, p.hotelId],
                              );
                            }}
                          />
                          <span className="text-sm text-slate-800">
                            {p.hotelName}
                            {p.city ? (
                              <span className="block text-xs text-slate-500">
                                {p.city}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  City
                </label>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cityFilterQuery}
                    onChange={(e) => setCityFilterQuery(e.target.value)}
                    placeholder="Search city…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-8 text-sm"
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-1">
                  {filteredCityOptions.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">
                      No cities found
                    </p>
                  ) : (
                    filteredCityOptions.map((c) => {
                      const checked = selectedCityIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setPage(0);
                              setSelectedCityIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== c.id)
                                  : [...prev, c.id],
                              );
                            }}
                          />
                          <span className="text-sm text-slate-800">{c.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-[#2f3d95] hover:underline"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white hover:bg-[#26317a]"
              >
                Done
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
