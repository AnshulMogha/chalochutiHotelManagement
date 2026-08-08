import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router";
import { toPng } from "html-to-image";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  performanceDashboardService,
  type PerformanceBreakdownCard,
  type PerformanceBreakdownsResponse,
  type PerformanceComparisonType,
  type PerformanceCompetitor,
  type PerformanceCompetitorsResponse,
  type PerformanceDateAxis,
  type PerformanceDatePreset,
  type PerformanceMetric,
  type PerformanceOverviewResponse,
  type PerformanceRanking,
} from "../services/performanceDashboardService";
import {
  COMPETITOR_BAR,
  PerformanceSeriesChart,
  PROPERTY_BAR,
  type PerformanceSeriesChartHandle,
} from "../components/PerformanceSeriesChart";
import {
  Building2,
  ChevronDown,
  Download,
  FileImage,
  FileSpreadsheet,
  Filter,
  Info,
  LayoutDashboard,
  Loader2,
  Search,
  Trophy,
  X,
} from "lucide-react";

const DURATION_OPTIONS: { value: PerformanceDatePreset; label: string }[] = [
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_15_DAYS", label: "Last 15 days" },
  { value: "LAST_30_DAYS", label: "Last 1 month" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "CUSTOM", label: "Custom Date Range" },
];

const DATE_AXIS_OPTIONS: { value: PerformanceDateAxis; label: string }[] = [
  { value: "BOOKING", label: "Booking dates" },
  { value: "STAY", label: "Staying dates" },
];

const COMPARISON_OPTIONS: {
  value: PerformanceComparisonType;
  label: string;
}[] = [
  { value: "SAME_TIME_LAST_YEAR", label: "Same time last year" },
  { value: "PREVIOUS_PERIOD", label: "Previous period" },
];

const METRIC_LABELS: Record<PerformanceMetric, string> = {
  ROOM_NIGHTS: "Room Nights",
  REVENUE: "Revenue",
  ASP: "ASP (Average Selling Price)",
  PROPERTY_VISITS: "Property Visits",
  CONVERSION: "Conversion",
};

const METRIC_SHORT: Record<PerformanceMetric, string> = {
  ROOM_NIGHTS: "Room Nights",
  REVENUE: "Revenue",
  ASP: "ASP (Average Selling Price)",
  PROPERTY_VISITS: "Property Visits",
  CONVERSION: "Conversion",
};

type PerformanceFilterDraft = {
  datePreset: PerformanceDatePreset;
  dateAxis: PerformanceDateAxis;
  comparisonType: PerformanceComparisonType;
  fromDate: string;
  toDate: string;
};

const DEFAULT_FILTER_DRAFT: PerformanceFilterDraft = {
  datePreset: "LAST_30_DAYS",
  dateAxis: "BOOKING",
  comparisonType: "SAME_TIME_LAST_YEAR",
  fromDate: "",
  toDate: "",
};

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message || "Request failed");
  }
  return "Request failed";
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatMetricValue(metric: PerformanceMetric, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (metric === "CONVERSION") {
    return `${Number(value).toFixed(2)}%`;
  }
  if (metric === "REVENUE" || metric === "ASP") {
    const abs = Math.abs(value);
    if (abs >= 100000) return `₹ ${(value / 100000).toFixed(1)} L`;
    if (abs >= 1000) return `₹ ${(value / 1000).toFixed(1)} K`;
    return `₹ ${new Intl.NumberFormat("en-IN").format(Math.round(value))}`;
  }
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatChangeBadge(changePercent: number | null | undefined, improved?: boolean) {
  if (changePercent == null || Number.isNaN(changePercent)) return null;
  const abs = Math.abs(changePercent);
  const label = `${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  const up = improved ?? changePercent >= 0;
  return { label, up, text: `${label} ${up ? "↑" : "↓"}` };
}

function durationLabel(preset: PerformanceDatePreset): string {
  return DURATION_OPTIONS.find((o) => o.value === preset)?.label ?? preset;
}

function comparisonLabel(type: PerformanceComparisonType): string {
  return COMPARISON_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function buildComparisonInsight({
  metricLabel,
  changePercent,
  improved,
  comparisonFrom,
  comparisonTo,
  duration,
  comparisonType,
  fallbackInsight,
}: {
  metricLabel: string;
  changePercent: number | null | undefined;
  improved?: boolean;
  comparisonFrom?: string | null;
  comparisonTo?: string | null;
  duration: string;
  comparisonType: PerformanceComparisonType;
  fallbackInsight?: string | null;
}): string {
  const comparedTo =
    comparisonType === "PREVIOUS_PERIOD"
      ? "previous period"
      : "same time last year";

  if (changePercent == null || Number.isNaN(changePercent)) {
    const base =
      fallbackInsight ||
      `Your property's ${metricLabel.toLowerCase()} for the selected period.`;
    if (comparisonFrom && comparisonTo) {
      return `${base} Comparison period (${comparedTo}): ${formatDisplayDate(comparisonFrom)} - ${formatDisplayDate(comparisonTo)}.`;
    }
    return base;
  }

  const abs = Math.abs(changePercent);
  const pct = `${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  const up = improved ?? changePercent >= 0;
  const direction =
    changePercent === 0 ? "no change in" : up ? "increase in" : "decrease in";
  const metricLower = metricLabel.toLowerCase();
  const range =
    comparisonFrom && comparisonTo
      ? `${formatDisplayDate(comparisonFrom)} - ${formatDisplayDate(comparisonTo)}`
      : comparedTo;

  if (changePercent === 0) {
    return `No change in your ${metricLower} in comparison to ${metricLower} during ${range} (${duration}).`;
  }

  return `${pct} ${direction} your ${metricLower} in comparison to ${metricLower} during ${range} (${duration}).`;
}

function ChangePill({
  changePercent,
  improved,
  size = "sm",
  comparisonType = "SAME_TIME_LAST_YEAR",
}: {
  changePercent: number | null | undefined;
  improved?: boolean;
  size?: "sm" | "md";
  comparisonType?: PerformanceComparisonType;
}) {
  const badge = formatChangeBadge(changePercent, improved);
  if (!badge) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-semibold",
        badge.up
          ? "bg-emerald-50 text-emerald-600"
          : "bg-rose-50 text-rose-600",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
      )}
      title={`Compared with ${comparisonLabel(comparisonType)}`}
    >
      {badge.text}
    </span>
  );
}

function RankingBars({ ranking }: { ranking: PerformanceRanking }) {
  const yours = ranking.yourPercent ?? 0;
  const comps = ranking.competitorsPercent ?? 0;
  const max = Math.max(yours, comps, 1);

  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-700">
        <span className="shrink-0 font-medium text-slate-500">#{ranking.rank}</span>
        {ranking.rank === 1 ? (
          <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : null}
        <span className="truncate font-medium">{ranking.label}</span>
      </div>
      <div className="min-w-0">
        <div className="mb-1 text-right text-xs font-semibold tabular-nums text-slate-700">
          {ranking.yourPercent == null ? "—" : `${ranking.yourPercent.toFixed(2)}%`}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(yours / max) * 100}%`,
              backgroundColor: PROPERTY_BAR,
            }}
          />
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-1 text-right text-xs font-semibold tabular-nums text-slate-700">
          {ranking.competitorsPercent == null
            ? "—"
            : `${ranking.competitorsPercent.toFixed(2)}%`}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(comps / max) * 100}%`,
              backgroundColor: COMPETITOR_BAR,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BreakdownCardView({ card }: { card: PerformanceBreakdownCard }) {
  const [expanded, setExpanded] = useState(false);
  const isRoomPlan = card.dimensionType === "ROOM_RATE_PLAN";
  const visible = isRoomPlan && !expanded ? card.rankings.slice(0, 2) : card.rankings;
  const hasMore = isRoomPlan && card.rankings.length > 2;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
        <Info className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <p className="mb-4 text-sm text-slate-600">{card.insight}</p>

      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-100 pb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
        <span />
        <span className="text-right" style={{ color: PROPERTY_BAR }}>
          Your Property
        </span>
        <span className="text-right" style={{ color: COMPETITOR_BAR }}>
          Competitors
        </span>
      </div>

      <div className="relative divide-y divide-slate-50">
        {visible.map((row) => (
          <RankingBars key={row.key} ranking={row} />
        ))}
        {hasMore && !expanded ? (
          <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t from-white via-white/90 to-transparent pb-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-md border border-[#3B6FE8] px-3 py-1.5 text-sm font-semibold text-[#3B6FE8] hover:bg-blue-50"
            >
              View More Details
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompetitorManageModal({
  open,
  onClose,
  hotelId,
  initial,
  onSaved,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  hotelId: string;
  initial: PerformanceCompetitorsResponse | null;
  onSaved: (data: PerformanceCompetitorsResponse) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}) {
  const [selected, setSelected] = useState<PerformanceCompetitor[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PerformanceCompetitor[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const min = initial?.minCompetitors ?? 5;
  const max = initial?.maxCompetitors ?? 20;

  useEffect(() => {
    if (!open) return;
    setSelected(initial?.competitors ?? []);
    setQuery("");
    setResults([]);
  }, [open, initial]);

  const runSearch = useEffectEvent(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await performanceDashboardService.searchCompetitors(hotelId, q);
      const selectedIds = new Set(selected.map((c) => c.hotelId));
      setResults(data.filter((c) => !selectedIds.has(c.hotelId)));
    } catch (err) {
      console.error(err);
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSearching(false);
    }
  });

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => runSearch(query), 300);
    return () => window.clearTimeout(handle);
  }, [query, open, selected]);

  const addCompetitor = (item: PerformanceCompetitor) => {
    if (selected.length >= max) {
      showToast(`Maximum ${max} competitors allowed`, "error");
      return;
    }
    if (selected.some((c) => c.hotelId === item.hotelId)) return;
    setSelected((prev) => [...prev, item]);
    setResults((prev) => prev.filter((c) => c.hotelId !== item.hotelId));
  };

  const removeCompetitor = (hotelIdToRemove: string) => {
    setSelected((prev) => prev.filter((c) => c.hotelId !== hotelIdToRemove));
  };

  const handleSave = async () => {
    if (selected.length < min) {
      showToast(`Please add at least ${min} competitors`, "error");
      return;
    }
    if (selected.length > max) {
      showToast(`Maximum ${max} competitors allowed`, "error");
      return;
    }
    setSaving(true);
    try {
      const data = await performanceDashboardService.replaceCompetitors(
        hotelId,
        selected.map((c) => c.hotelId),
      );
      onSaved(data);
      showToast("Competitors updated", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">Manage Your Competitors</h2>
          <p className="mt-1 text-sm text-slate-500">
            Please add minimum {min} and maximum {max} Properties
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <h3 className="mb-3 text-base font-bold text-slate-800">
              Add Atleast {min} Competitors
            </h3>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Property Name"
                className="w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-10 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {searching ? (
                <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              ) : null}
            </div>
            {results.length > 0 ? (
              <ul className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200">
                {results.map((item) => (
                  <li key={item.hotelId}>
                    <button
                      type="button"
                      onClick={() => addCompetitor(item)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <CompetitorThumb url={item.thumbnailUrl} name={item.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.address || "—"}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-[#3B6FE8]">Add</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700">
              Your Competitors ({selected.length}/{max})
            </div>
            {selected.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No competitors added yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selected.map((item, index) => (
                  <li
                    key={item.hotelId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="w-6 shrink-0 text-sm text-slate-500">
                      {index + 1}.
                    </span>
                    <CompetitorThumb url={item.thumbnailUrl} name={item.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.address || "—"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCompetitor(item.hotelId)}
                      className="shrink-0 text-sm font-semibold text-[#3B6FE8] hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#3B6FE8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f5fd0] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Competitors"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompetitorThumb({
  url,
  name,
}: {
  url: string | null | undefined;
  name: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-10 w-10 shrink-0 rounded object-cover bg-slate-100"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
      <Building2 className="h-5 w-5" />
    </div>
  );
}

export default function PerformanceDashboardPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();
  const chartRef = useRef<PerformanceSeriesChartHandle>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const pageCaptureRef = useRef<HTMLDivElement>(null);
  const [capturingPage, setCapturingPage] = useState(false);

  const [datePreset, setDatePreset] =
    useState<PerformanceDatePreset>(DEFAULT_FILTER_DRAFT.datePreset);
  const [dateAxis, setDateAxis] = useState<PerformanceDateAxis>(
    DEFAULT_FILTER_DRAFT.dateAxis,
  );
  const [comparisonType, setComparisonType] =
    useState<PerformanceComparisonType>(DEFAULT_FILTER_DRAFT.comparisonType);
  const [metric, setMetric] = useState<PerformanceMetric>("ROOM_NIGHTS");
  const [fromDate, setFromDate] = useState(DEFAULT_FILTER_DRAFT.fromDate);
  const [toDate, setToDate] = useState(DEFAULT_FILTER_DRAFT.toDate);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<PerformanceFilterDraft>(DEFAULT_FILTER_DRAFT);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [overview, setOverview] = useState<PerformanceOverviewResponse | null>(
    null,
  );
  const [breakdowns, setBreakdowns] =
    useState<PerformanceBreakdownsResponse | null>(null);
  const [competitors, setCompetitors] =
    useState<PerformanceCompetitorsResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMetric, setLoadingMetric] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customRangeInvalid =
    datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate);

  const activeFilterCount =
    (datePreset !== DEFAULT_FILTER_DRAFT.datePreset ? 1 : 0) +
    (dateAxis !== DEFAULT_FILTER_DRAFT.dateAxis ? 1 : 0) +
    (comparisonType !== DEFAULT_FILTER_DRAFT.comparisonType ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0);

  const buildFilterParams = (overrides?: Partial<PerformanceFilterDraft> & {
    metric?: PerformanceMetric;
  }) => {
    const nextPreset = overrides?.datePreset ?? datePreset;
    return {
      hotelId: hotelId || "",
      datePreset: nextPreset,
      dateAxis: overrides?.dateAxis ?? dateAxis,
      comparisonType: overrides?.comparisonType ?? comparisonType,
      metric: overrides?.metric ?? metric,
      fromDate:
        nextPreset === "CUSTOM"
          ? overrides?.fromDate ?? fromDate
          : undefined,
      toDate:
        nextPreset === "CUSTOM" ? overrides?.toDate ?? toDate : undefined,
    };
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!downloadMenuRef.current?.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const loadAll = useCallback(
    async (overrides?: Partial<PerformanceFilterDraft>) => {
      if (!hotelId) return;
      const nextPreset = overrides?.datePreset ?? datePreset;
      const nextFrom = overrides?.fromDate ?? fromDate;
      const nextTo = overrides?.toDate ?? toDate;
      if (nextPreset === "CUSTOM" && (!nextFrom || !nextTo)) return;

      setLoading(true);
      setError(null);
      try {
        const params = buildFilterParams(overrides);
        const [overviewData, breakdownsData, competitorsData] =
          await Promise.all([
            performanceDashboardService.getOverview(params),
            performanceDashboardService.getBreakdowns({
              hotelId,
              datePreset: params.datePreset,
              dateAxis: params.dateAxis,
              fromDate: params.fromDate,
              toDate: params.toDate,
            }),
            performanceDashboardService.listCompetitors(hotelId),
          ]);
        setOverview(overviewData);
        setBreakdowns(breakdownsData);
        setCompetitors(competitorsData);
        if (overviewData.selectedMetric) {
          setMetric(overviewData.selectedMetric);
        }
      } catch (err) {
        console.error(err);
        const message = extractErrorMessage(err);
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    // buildFilterParams reads current filter state; deps cover those fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hotelId,
      datePreset,
      dateAxis,
      comparisonType,
      metric,
      fromDate,
      toDate,
      showToast,
    ],
  );

  useEffect(() => {
    if (!hotelId || customRangeInvalid) return;
    loadAll();
    // Initial load / hotel change only — Apply handles filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const openFilters = () => {
    setDraft({
      datePreset,
      dateAxis,
      comparisonType,
      fromDate,
      toDate,
    });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    if (draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate)) {
      showToast("Select a custom from/to date range", "error");
      return;
    }
    setDatePreset(draft.datePreset);
    setDateAxis(draft.dateAxis);
    setComparisonType(draft.comparisonType);
    setFromDate(draft.fromDate);
    setToDate(draft.toDate);
    setFilterOpen(false);
    loadAll(draft);
  };

  const clearAll = () => {
    setDraft(DEFAULT_FILTER_DRAFT);
  };

  const loadOverviewForMetric = async (nextMetric: PerformanceMetric) => {
    if (!hotelId || customRangeInvalid) return;
    setMetric(nextMetric);
    setLoadingMetric(true);
    try {
      const data = await performanceDashboardService.getOverview(
        buildFilterParams({ metric: nextMetric }),
      );
      setOverview(data);
    } catch (err) {
      console.error(err);
      showToast(extractErrorMessage(err), "error");
    } finally {
      setLoadingMetric(false);
    }
  };

  const exportBaseName = () => {
    const from = overview?.dateRange.fromDate ?? "from";
    const to = overview?.dateRange.toDate ?? "to";
    return `performance-${metric.toLowerCase()}-${from}-${to}`;
  };

  const csvEscape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadRowsAsCsv = (rows: (string | number | null | undefined)[][], filename: string) => {
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFullDataCsv = () => {
    if (!overview) {
      showToast("Load the dashboard before downloading", "error");
      return;
    }

    const rows: (string | number | null | undefined)[][] = [
      ["Section", "Field", "Value", "Extra 1", "Extra 2", "Extra 3"],
      [
        "Filters",
        "Date range",
        `${overview.dateRange.fromDate} to ${overview.dateRange.toDate}`,
        overview.dateRange.preset,
        dateAxis,
        comparisonType,
      ],
      [
        "Filters",
        "Selected metric",
        overview.selectedMetric ?? metric,
        METRIC_LABELS[overview.selectedMetric ?? metric] ?? metric,
        "",
        "",
      ],
      [],
      ["KPIs", "Metric", "Value", "Change %", "Improved", ""],
      ...(overview.kpis ?? []).map((kpi) => [
        "KPIs",
        METRIC_LABELS[kpi.metric] ?? kpi.metric,
        kpi.value,
        kpi.changePercent,
        kpi.improved ? "Yes" : "No",
        "",
      ]),
      [],
      ["Metric detail", "Metric", overview.metricDetail?.metric ?? metric, "", "", ""],
      ["Metric detail", "Value", overview.metricDetail?.value ?? "", "", "", ""],
      [
        "Metric detail",
        "Change %",
        overview.metricDetail?.changePercent ?? "",
        "",
        "",
        "",
      ],
      [
        "Metric detail",
        "Insight",
        overview.metricDetail?.insight ?? "",
        "",
        "",
        "",
      ],
      [],
      [
        "Competitor share",
        "Eligible",
        overview.competitorShare?.eligible ? "Yes" : "No",
        "",
        "",
        "",
      ],
      [
        "Competitor share",
        "Competitor count",
        overview.competitorShare?.competitorCount ?? "",
        "",
        "",
        "",
      ],
      [
        "Competitor share",
        "Your share %",
        overview.competitorShare?.yourSharePercent ?? "",
        "",
        "",
        "",
      ],
      [
        "Competitor share",
        "Message",
        overview.competitorShare?.message ?? "",
        "",
        "",
        "",
      ],
      [],
      ["Series", "Label", "From", "To", "Your Property", "Competitors Avg"],
      ...(overview.series ?? []).map((point) => [
        "Series",
        point.label,
        point.fromDate,
        point.toDate,
        point.yourProperty,
        point.competitorsAvg,
      ]),
    ];

    if (breakdowns?.cards?.length) {
      rows.push([]);
      rows.push([
        "Breakdowns",
        "Dimension",
        "Rank",
        "Label",
        "Your %",
        "Competitors %",
      ]);
      for (const card of breakdowns.cards) {
        rows.push([
          "Breakdowns",
          card.title,
          "Insight",
          card.insight,
          "",
          "",
        ]);
        for (const ranking of card.rankings ?? []) {
          rows.push([
            "Breakdowns",
            card.title,
            ranking.rank,
            ranking.label,
            ranking.yourPercent,
            ranking.competitorsPercent,
          ]);
        }
      }
    }

    downloadRowsAsCsv(rows, `${exportBaseName()}-full-data.csv`);
    setDownloadOpen(false);
    showToast("Full data CSV downloaded", "success");
  };

  const downloadSeriesCsv = () => {
    if (!overview?.series?.length) {
      showToast("No series data to download", "error");
      return;
    }
    const rows = [
      ["Label", "From", "To", "Your Property", "Competitors Avg"],
      ...overview.series.map((s) => [
        s.label,
        s.fromDate,
        s.toDate,
        s.yourProperty,
        s.competitorsAvg,
      ]),
    ];
    downloadRowsAsCsv(rows, `${exportBaseName()}-series.csv`);
    setDownloadOpen(false);
    showToast("Series CSV downloaded", "success");
  };

  const downloadChartPng = () => {
    if (!overview?.series?.length) {
      showToast("No chart data to download", "error");
      return;
    }
    const ok = chartRef.current?.downloadPng(`${exportBaseName()}.png`);
    setDownloadOpen(false);
    if (ok) {
      showToast("Chart image downloaded", "success");
    } else {
      showToast("Chart is not ready yet", "error");
    }
  };

  const downloadFullPagePng = async () => {
    const node = pageCaptureRef.current;
    if (!node) {
      showToast("Page is not ready to capture", "error");
      return;
    }
    if (!overview) {
      showToast("Load the dashboard before downloading", "error");
      return;
    }

    setDownloadOpen(false);
    setCapturingPage(true);
    try {
      // Wait a frame so the download menu closes before capture.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: "#f7f8fa",
        filter: (element) => {
          if (!(element instanceof HTMLElement)) return true;
          return !element.dataset.excludeFromCapture;
        },
      });

      const link = document.createElement("a");
      link.download = `${exportBaseName()}-full-page.png`;
      link.href = dataUrl;
      link.click();
      showToast("Full page image downloaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to capture full page", "error");
    } finally {
      setCapturingPage(false);
    }
  };

  const showCompetitors =
    Boolean(overview?.competitorShare?.eligible) ||
    Boolean(
      overview?.series?.some((point) => point.competitorsAvg != null),
    );

  const selectedKpi =
    overview?.kpis?.find((k) => k.metric === metric) ?? overview?.kpis?.[0];
  const metricName = METRIC_SHORT[metric] ?? metric;
  const selectedChangePercent =
    overview?.metricDetail?.changePercent ?? selectedKpi?.changePercent ?? null;
  const selectedImproved =
    overview?.metricDetail?.improved ??
    selectedKpi?.improved ??
    (selectedChangePercent == null ? undefined : selectedChangePercent >= 0);
  const comparisonInsight = overview
    ? buildComparisonInsight({
        metricLabel: metricName,
        changePercent: selectedChangePercent,
        improved: selectedImproved,
        comparisonFrom: overview.comparisonDateRange?.fromDate,
        comparisonTo: overview.comparisonDateRange?.toDate,
        duration: durationLabel(
          (overview.dateRange.preset as PerformanceDatePreset) || datePreset,
        ),
        comparisonType,
        fallbackInsight: overview.metricDetail?.insight,
      })
    : "";

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Performance Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a hotel from the top bar to load performance data.
        </p>
        <div className="mt-8 flex min-h-70 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <div className="text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No hotel selected</p>
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

      <CompetitorManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        hotelId={hotelId}
        initial={competitors}
        onSaved={(data) => {
          setCompetitors(data);
          loadAll();
        }}
        showToast={showToast}
      />

      <div className="min-h-full bg-[#f7f8fa]">
        <div ref={pageCaptureRef} className="container mx-auto px-4 py-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Performance Overview
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Room Nights, Revenue, ASP, Property Visits, and Conversion for the
                selected property.
              </p>
            </div>
            <div
              className="relative"
              ref={downloadMenuRef}
              data-exclude-from-capture="true"
            >
              <button
                type="button"
                onClick={() => setDownloadOpen((v) => !v)}
                disabled={capturingPage}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#3B6FE8] shadow-sm hover:bg-blue-50 disabled:opacity-60"
              >
                {capturingPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {capturingPage ? "Capturing…" : `Download ${metricName} Report`}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition",
                    downloadOpen && "rotate-180",
                  )}
                />
              </button>
              {downloadOpen ? (
                <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={downloadFullPagePng}
                    disabled={capturingPage || !overview}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#3B6FE8]" />
                    Full page (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={downloadFullDataCsv}
                    disabled={!overview}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Full data (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={downloadChartPng}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileImage className="h-4 w-4 text-[#3B6FE8]" />
                    Chart image (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={downloadSeriesCsv}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                    Series data (CSV)
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {durationLabel(datePreset)}
                {overview?.dateRange ? (
                  <span className="font-normal text-slate-500">
                    {" "}
                    ({formatDisplayDate(overview.dateRange.fromDate)} –{" "}
                    {formatDisplayDate(overview.dateRange.toDate)})
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {DATE_AXIS_OPTIONS.find((o) => o.value === dateAxis)?.label ??
                  dateAxis}
                {" · "}
                {COMPARISON_OPTIONS.find((o) => o.value === comparisonType)
                  ?.label ?? comparisonType}
              </p>
            </div>

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
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading && !overview ? (
            <div className="flex min-h-80 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B6FE8]" />
            </div>
          ) : overview ? (
            <>
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-3 lg:grid-cols-5">
                  {(overview.kpis?.length
                    ? overview.kpis
                    : (Object.keys(METRIC_LABELS) as PerformanceMetric[]).map(
                        (m) => ({
                          metric: m,
                          value: 0,
                          changePercent: null,
                          improved: false,
                        }),
                      )
                  ).map((kpi) => {
                    const active = kpi.metric === metric;
                    return (
                      <button
                        key={kpi.metric}
                        type="button"
                        onClick={() => loadOverviewForMetric(kpi.metric)}
                        className={cn(
                          "relative px-4 py-4 text-left transition hover:bg-slate-50",
                          active && "bg-white",
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-slate-600">
                            {METRIC_LABELS[kpi.metric] ?? kpi.metric}
                          </span>
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xl font-bold text-slate-900">
                            {formatMetricValue(kpi.metric, kpi.value)}
                          </span>
                          <ChangePill
                            changePercent={kpi.changePercent}
                            improved={kpi.improved}
                            comparisonType={comparisonType}
                          />
                        </div>
                        {active ? (
                          <span className="absolute inset-x-0 bottom-0 h-1 bg-[#3B6FE8]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_0.8fr]">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Your Property&apos;s {metricName} for{" "}
                      {durationLabel(
                        (overview.dateRange.preset as PerformanceDatePreset) ||
                          datePreset,
                      )}{" "}
                      <span className="font-normal text-slate-500">
                        ({formatDisplayDate(overview.dateRange.fromDate)} -{" "}
                        {formatDisplayDate(overview.dateRange.toDate)})
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-4xl font-bold tracking-tight text-slate-900">
                        {formatMetricValue(
                          metric,
                          overview.metricDetail?.value ?? selectedKpi?.value,
                        )}
                      </span>
                      <ChangePill
                        changePercent={selectedChangePercent}
                        improved={selectedImproved}
                        size="md"
                        comparisonType={comparisonType}
                      />
                      {loadingMetric ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : null}
                    </div>
                    <p className="mt-3 max-w-xl text-sm text-slate-600">
                      {comparisonInsight}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">
                        Competitors
                      </h3>
                      <button
                        type="button"
                        onClick={() => setManageOpen(true)}
                        className="text-sm font-semibold text-[#3B6FE8] hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    {overview.competitorShare?.eligible &&
                    overview.competitorShare.yourSharePercent != null ? (
                      <>
                        <p className="text-4xl font-bold text-slate-900">
                          {overview.competitorShare.yourSharePercent}%
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          Your share among the added competitor properties.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-700">
                          {overview.competitorShare?.message ||
                            "Add at least 5 competitors to unlock comparison"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setManageOpen(true)}
                          className="mt-3 text-sm font-semibold text-[#3B6FE8] hover:underline"
                        >
                          Manage competitors
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-5">
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={downloadChartPng}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B6FE8] hover:underline"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      Download chart
                    </button>
                  </div>
                  <PerformanceSeriesChart
                    ref={chartRef}
                    series={overview.series ?? []}
                    showCompetitors={showCompetitors}
                    metricLabel={metricName}
                  />
                </div>
              </div>

              <h2 className="mb-4 text-lg font-bold text-slate-900">
                Detailed analysis of {metricName}
              </h2>

              {breakdowns?.cards?.length ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  {breakdowns.cards.map((card) => (
                    <BreakdownCardView key={card.dimensionType} card={card} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                  No breakdown data for this period.
                </div>
              )}
            </>
          ) : null}
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
                <h3 className="mb-2 text-sm font-bold text-slate-900">Duration</h3>
                <label className="mb-1 block text-xs text-slate-500">
                  Time period
                </label>
                <select
                  value={draft.datePreset}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: e.target.value as PerformanceDatePreset,
                    }))
                  }
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {draft.datePreset === "CUSTOM" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        From
                      </label>
                      <input
                        type="date"
                        value={draft.fromDate}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            fromDate: e.target.value,
                          }))
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
                          setDraft((prev) => ({
                            ...prev,
                            toDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Comparison with
                </h3>
                <div className="space-y-2">
                  {COMPARISON_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="comparisonType"
                        checked={draft.comparisonType === option.value}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            comparisonType: option.value,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Date type</h3>
                <div className="flex gap-2">
                  {DATE_AXIS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          dateAxis: option.value,
                        }))
                      }
                      className={cn(
                        "flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition",
                        draft.dateAxis === option.value
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {option.label}
                    </button>
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
                disabled={draftCustomInvalid || loading}
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
