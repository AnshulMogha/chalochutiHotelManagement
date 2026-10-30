import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/ui";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid";
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
  BookOpen,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Download,
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
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
  filterApplyButtonClass,
} from "../components/ReportFilterDrawer";
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

  const summarySortModel: GridSortModel = [{ field: sort, sort: sortDir }];
  const onSummarySort = (model: GridSortModel) => {
    const next = model[0];
    if (!next?.field || !next.sort) return;
    const field = next.field as BookingSummarySortField;
    if (field === sort && next.sort === sortDir) return;
    setSort(field);
    setSortDir(next.sort);
    setPage(0);
  };

  const activityColumns: GridColDef<BookingSummaryHotelRow>[] = [
    {
      field: "hotelName",
      headerName: "Property",
      flex: 1.6,
      minWidth: 220,
      renderCell: (params) => {
        const hotel = params.row;
        return (
          <div className="flex min-w-0 items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-[#2f3d95] text-white shadow-sm shadow-indigo-200">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p title={hotel.hotelName} className="truncate text-sm font-semibold leading-tight text-slate-900">
                {hotel.hotelName}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                {[hotel.city, hotel.state].filter(Boolean).join(" · ") || "—"}
              </p>
              {hotel.hotelCode ? (
                <p className="truncate font-mono text-[11px] text-slate-400">
                  {hotel.hotelCode}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      field: "todaysBookings",
      headerName: "Bookings",
      description: `Today's bookings on this page: ${columnTotals.todaysBookings}`,
      width: 118,
      renderCell: (params) => (
        <MetricLink
          value={params.row.metrics.todaysBookings}
          tone="indigo"
          onClick={() =>
            openDrillDown(params.row, params.row.drillDown.todaysBookings)
          }
        />
      ),
    },
    {
      field: "todaysCheckins",
      headerName: "Check-ins",
      description: `Today's check-ins on this page: ${columnTotals.todaysCheckins}`,
      width: 118,
      renderCell: (params) => (
        <MetricLink
          value={params.row.metrics.todaysCheckins}
          tone="sky"
          onClick={() =>
            openDrillDown(params.row, params.row.drillDown.todaysCheckins)
          }
        />
      ),
    },
    {
      field: "stayingToday",
      headerName: "Staying",
      description: `Staying today on this page: ${columnTotals.stayingToday}`,
      width: 110,
      renderCell: (params) => (
        <MetricLink
          value={params.row.metrics.stayingToday}
          tone="violet"
          onClick={() =>
            openDrillDown(params.row, params.row.drillDown.stayingToday)
          }
        />
      ),
    },
    {
      field: "todaysCheckouts",
      headerName: "Check-outs",
      description: `Today's check-outs on this page: ${columnTotals.todaysCheckouts}`,
      width: 120,
      renderCell: (params) => (
        <MetricLink
          value={params.row.metrics.todaysCheckouts}
          tone="amber"
          onClick={() =>
            openDrillDown(params.row, params.row.drillDown.todaysCheckouts)
          }
        />
      ),
    },
  ];

  const earningsColumns: GridColDef<BookingSummaryHotelRow>[] = [
    {
      field: "netBookings",
      headerName: "Net",
      description: `Net bookings in the selected dates: ${summary.netBookings}`,
      flex: 1,
      minWidth: 90,
      renderCell: (params) => (
        <MetricLink
          value={params.row.metrics.netBookings}
          tone="indigo"
          onClick={
            params.row.drillDown.netBookings
              ? () =>
                  openDrillDown(params.row, params.row.drillDown.netBookings)
              : undefined
          }
        />
      ),
    },
    {
      field: "hotelEarnings",
      headerName: "Hotel",
      description: `Hotel earnings in the selected dates: ${formatCompactEarnings(
        summary.hotelEarnings.amount,
        summary.hotelEarnings.currency,
      )}`,
      flex: 1,
      minWidth: 100,
      renderCell: (params) => (
        <EarningsCell
          amount={params.row.metrics.hotelEarnings?.amount}
          currency={params.row.metrics.hotelEarnings?.currency ?? "INR"}
          onClick={
            params.row.drillDown.hotelEarnings
              ? () =>
                  openDrillDown(params.row, params.row.drillDown.hotelEarnings)
              : undefined
          }
        />
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            field: "otaEarnings",
            headerName: "OTA",
            description: `OTA earnings in the selected dates: ${formatCompactEarnings(
              summary.otaEarnings.amount,
              summary.otaEarnings.currency,
            )}`,
            flex: 1,
            minWidth: 100,
            renderCell: (params) => (
              <EarningsCell
                amount={params.row.metrics.otaEarnings?.amount}
                currency={params.row.metrics.otaEarnings?.currency ?? "INR"}
                tone="amber"
                onClick={
                  params.row.drillDown.otaEarnings
                    ? () =>
                        openDrillDown(
                          params.row,
                          params.row.drillDown.otaEarnings,
                        )
                    : undefined
                }
              />
            ),
          } satisfies GridColDef<BookingSummaryHotelRow>,
        ]
      : []),
  ];

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
                <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline">
                  Last updated{" "}
                  {lastUpdatedAt
                    ? lastUpdatedAt.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
                <ReportAppliedRange
                  from={dateRange.fromDate}
                  to={dateRange.toDate}
                  detail={
                    DATE_PRESET_OPTIONS.find(
                      (option) =>
                        option.value === (dateRange.preset || datePreset),
                    )?.label
                  }
                />
                <ReportFilterButton
                  onClick={() => setFilterOpen(true)}
                  activeCount={activeFilterCount}
                />
                <button
                  type="button"
                  onClick={downloadCsv}
                  aria-label="Download"
                  title="Download"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={fetchSummary}
                  disabled={loading}
                  aria-label="Refresh"
                  title="Refresh"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
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
                    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
                    iconTone: "bg-sky-500 text-white",
                    labelTone: "text-sky-700",
                  },
                  {
                    label: "Net bookings",
                    value: summary.netBookings,
                    icon: BookOpen,
                    card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
                    iconTone: "bg-indigo-600 text-white",
                    labelTone: "text-indigo-700",
                  },
                  {
                    label: "Today bookings",
                    value: columnTotals.todaysBookings,
                    icon: ClipboardList,
                    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
                    iconTone: "bg-blue-600 text-white",
                    labelTone: "text-blue-700",
                  },
                  {
                    label: "Hotel earnings",
                    value: formatCompactEarnings(
                      summary.hotelEarnings.amount,
                      summary.hotelEarnings.currency,
                    ),
                    icon: CircleDollarSign,
                    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
                    iconTone: "bg-emerald-600 text-white",
                    labelTone: "text-emerald-700",
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
                          card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
                          iconTone: "bg-amber-500 text-white",
                          labelTone: "text-amber-700",
                        },
                      ]
                    : []),
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm",
                      kpi.card,
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        kpi.iconTone,
                      )}
                    >
                      <kpi.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p
                        className={cn(
                          "text-[11px] font-medium uppercase tracking-wide",
                          kpi.labelTone,
                        )}
                      >
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
            <DataTable
              title={
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-slate-900">
                  <span>Today&apos;s activity</span>
                  <span className="text-xs font-medium text-slate-500">
                    {totalElements.toLocaleString("en-IN")} hotels · Page{" "}
                    {page + 1} of {Math.max(totalPages, 1)}
                  </span>
                </span>
              }
              rows={hotels}
              columns={activityColumns}
              getRowId={(row) => row.hotelId}
              loading={loading}
              paginationMode="server"
              rowCount={totalElements}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model) => {
                if (model.page !== page) setPage(model.page);
              }}
              pageSizeOptions={[pageSize]}
              sortingMode="server"
              sortModel={summarySortModel}
              onSortModelChange={onSummarySort}
              disableRowSelectionOnClick
              disableColumnFilter
              disableColumnMenu
              showToolbar={false}
              showExport={false}
              allowHorizontalScroll
              rowHeight={76}
              localeText={{
                noRowsLabel: "No hotels found. Try adjusting filters or date range.",
              }}
            />

            {/* Right: separate Net Bookings + earnings split (hotel-wise) */}
            <aside className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-sm ring-1 ring-indigo-100/60">
              <div
                ref={dateDropdownRef}
                className="relative flex items-center border-b border-indigo-100 bg-gradient-to-r from-indigo-100/90 via-sky-50 to-emerald-50 px-4 py-2.5"
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
                          className={filterApplyButtonClass + " w-full"}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                <DataTable
                  rows={hotels}
                  columns={earningsColumns}
                  getRowId={(row) => row.hotelId}
                  loading={loading}
                  paginationMode="server"
                  rowCount={totalElements}
                  paginationModel={{ page, pageSize }}
                  pageSizeOptions={[pageSize]}
                  sortingMode="server"
                  sortModel={summarySortModel}
                  onSortModelChange={onSummarySort}
                  hideFooter
                  disableRowSelectionOnClick
                  disableColumnFilter
                  disableColumnMenu
                  showToolbar={false}
                  showExport={false}
                  allowHorizontalScroll
                  rowHeight={76}
                  localeText={{ noRowsLabel: "No data" }}
                />
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
            <ReportFilterActions
              onReset={clearFilters}
              onApply={() => setFilterOpen(false)}
              applyLabel="Done"
            />
          </aside>
        </>
      ) : null}
    </>
  );
}
