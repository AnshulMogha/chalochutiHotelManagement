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
  formatReportDate,
  isoToReportDateText,
  isValidCustomDateRange,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  performanceDashboardService,
  type PerformanceBreakdownsResponse,
  type PerformanceComparisonType,
  type PerformanceCompetitor,
  type PerformanceCompetitorsResponse,
  type PerformanceDateAxis,
  type PerformanceDatePreset,
  type PerformanceMetric,
  type PerformanceOverviewResponse,
} from "../services/performanceDashboardService";
import {
  PerformanceSeriesChart,
  type PerformanceSeriesChartHandle,
} from "../components/PerformanceSeriesChart";
import {
  AnalyticsBreakdownCard,
  AnalyticsDelta,
  AnalyticsKpiCard,
  AnalyticsPanel,
  BREAKDOWN_HELP,
  METRIC_HELP,
  METRIC_LABELS,
  METRIC_THEMES,
} from "../components/performanceDashboardUi";
import {
  Banknote,
  BedDouble,
  Building2,
  CalendarDays,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  Loader2,
  Search,
  TrendingUp,
  Wallet,
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

const METRIC_ICONS = {
  ROOM_NIGHTS: BedDouble,
  REVENUE: Wallet,
  ASP: Banknote,
  PROPERTY_VISITS: Eye,
  CONVERSION: TrendingUp,
} as const;

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
      return `${base} Comparison period (${comparedTo}): ${formatReportDate(comparisonFrom)} - ${formatReportDate(comparisonTo)}.`;
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
      ? `${formatReportDate(comparisonFrom)} - ${formatReportDate(comparisonTo)}`
      : comparedTo;

  if (changePercent === 0) {
    return `No change in your ${metricLower} in comparison to ${metricLower} during ${range} (${duration}).`;
  }

  return `${pct} ${direction} your ${metricLower} in comparison to ${metricLower} during ${range} (${duration}).`;
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
                      <span className="text-xs font-semibold text-slate-700">Add</span>
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
                      className="shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-900"
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");

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
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

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
    setCustomFromText(isoToReportDateText(fromDate));
    setCustomToText(isoToReportDateText(toDate));
    setFilterOpen(true);
  };

  const applyFilters = () => {
    let nextDraft = draft;

    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextDraft = {
        ...draft,
        fromDate: parsed.fromDate,
        toDate: parsed.toDate,
      };
      setCustomFromText(formatReportDate(parsed.fromDate));
      setCustomToText(formatReportDate(parsed.toDate));
    }

    setDatePreset(nextDraft.datePreset);
    setDateAxis(nextDraft.dateAxis);
    setComparisonType(nextDraft.comparisonType);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setFilterOpen(false);
    loadAll(nextDraft);
  };

  const clearAll = () => {
    setDraft(DEFAULT_FILTER_DRAFT);
    setCustomFromText("");
    setCustomToText("");
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
        `${formatReportDate(overview.dateRange.fromDate)} to ${formatReportDate(overview.dateRange.toDate)}`,
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
        formatReportDate(point.fromDate),
        formatReportDate(point.toDate),
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
        formatReportDate(s.fromDate),
        formatReportDate(s.toDate),
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
        backgroundColor: "#f5f3ff",
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
  const metricName = METRIC_LABELS[metric] ?? metric;
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
        <p className="text-sm text-slate-500">
          Select a hotel from the top bar to load performance data.
        </p>
        <div className="mt-8 flex min-h-70 items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
          <div className="text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-indigo-300" />
            <p className="text-sm font-medium text-slate-600">No hotel selected</p>
          </div>
        </div>
      </div>
    );
  }

  const metricTheme = METRIC_THEMES[metric];
  const MetricChartIcon = METRIC_ICONS[metric];
  const visibleFromDate =
    overview?.dateRange.fromDate ??
    (datePreset === "CUSTOM" ? fromDate : null);
  const visibleToDate =
    overview?.dateRange.toDate ?? (datePreset === "CUSTOM" ? toDate : null);

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

      <div className="min-h-full bg-gradient-to-b from-indigo-50/40 via-slate-50 to-slate-50">
        <div ref={pageCaptureRef} className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">
                    {durationLabel(datePreset)}
                  </span>
                  {visibleFromDate && visibleToDate ? (
                    <span className="text-slate-500">
                      {formatReportDate(visibleFromDate)} –{" "}
                      {formatReportDate(visibleToDate)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {DATE_AXIS_OPTIONS.find((o) => o.value === dateAxis)?.label ??
                    dateAxis}
                  {" · "}
                  {comparisonLabel(comparisonType)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openFilters}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition",
                  activeFilterCount
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50",
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount ? (
                  <span className="rounded-full bg-white/20 px-1.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <div
                className="relative"
                ref={downloadMenuRef}
                data-exclude-from-capture="true"
              >
                <button
                  type="button"
                  onClick={() => setDownloadOpen((v) => !v)}
                  disabled={capturingPage}
                  aria-label={
                    capturingPage ? "Capturing" : `Download ${metricName} report`
                  }
                  title={
                    capturingPage ? "Capturing…" : `Download ${metricName} report`
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-60"
                >
                  {capturingPage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
                {downloadOpen ? (
                  <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={downloadFullPagePng}
                      disabled={capturingPage || !overview}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                      Full page (PNG)
                    </button>
                    <button
                      type="button"
                      onClick={downloadFullDataCsv}
                      disabled={!overview}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Full data (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={downloadChartPng}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50"
                    >
                      <FileImage className="h-4 w-4 text-sky-600" />
                      Chart image (PNG)
                    </button>
                    <button
                      type="button"
                      onClick={downloadSeriesCsv}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                      Series data (CSV)
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading && !overview ? (
            <div className="flex min-h-80 items-center justify-center rounded-xl border border-indigo-100 bg-white">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : overview ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
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
                ).map((kpi) => (
                  <AnalyticsKpiCard
                    key={kpi.metric}
                    metric={kpi.metric}
                    label={METRIC_LABELS[kpi.metric] ?? kpi.metric}
                    value={formatMetricValue(kpi.metric, kpi.value)}
                    changePercent={kpi.changePercent}
                    improved={kpi.improved}
                    active={kpi.metric === metric}
                    onClick={() => loadOverviewForMetric(kpi.metric)}
                    helpText={METRIC_HELP[kpi.metric]}
                    icon={METRIC_ICONS[kpi.metric]}
                  />
                ))}
              </div>

              <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <AnalyticsPanel
                  title={`${metricName} trend`}
                  subtitle={`${durationLabel(
                    (overview.dateRange.preset as PerformanceDatePreset) ||
                      datePreset,
                  )} · ${formatReportDate(overview.dateRange.fromDate)} – ${formatReportDate(overview.dateRange.toDate)}`}
                  headerClassName={metricTheme.panelHeader}
                  titleIcon={MetricChartIcon}
                  titleIconWrap={metricTheme.iconMuted}
                  titleIconColor={metricTheme.accent}
                  action={
                    <button
                      type="button"
                      onClick={downloadChartPng}
                      aria-label="Download chart"
                      title="Download chart"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                    >
                      <FileImage className="h-4 w-4" />
                    </button>
                  }
                >
                  <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums tracking-tight",
                        metricTheme.value,
                      )}
                    >
                      {formatMetricValue(
                        metric,
                        overview.metricDetail?.value ?? selectedKpi?.value,
                      )}
                    </span>
                    <AnalyticsDelta
                      changePercent={selectedChangePercent}
                      improved={selectedImproved}
                      comparisonType={comparisonType}
                      size="md"
                    />
                    {loadingMetric ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : null}
                  </div>
                  <p className="mb-5 max-w-3xl text-sm leading-relaxed text-slate-600">
                    {comparisonInsight}
                  </p>
                  <PerformanceSeriesChart
                    ref={chartRef}
                    series={overview.series ?? []}
                    showCompetitors={showCompetitors}
                    metricLabel={metricName}
                  />
                </AnalyticsPanel>

                <aside className="flex flex-col overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      </span>
                      Competitor set
                    </h3>
                    <button
                      type="button"
                      onClick={() => setManageOpen(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-4">
                    {overview.competitorShare?.eligible &&
                    overview.competitorShare.yourSharePercent != null ? (
                      <>
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                          Your market share
                        </p>
                        <p className="mt-2 text-4xl font-bold tabular-nums text-indigo-900">
                          {overview.competitorShare.yourSharePercent}%
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          Share of {metricName.toLowerCase()} among tracked
                          competitor properties in this period.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-800">
                          Benchmarking unavailable
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {overview.competitorShare?.message ||
                            "Add at least 5 competitors to unlock market comparison."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setManageOpen(true)}
                          className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Configure competitors
                        </button>
                      </>
                    )}
                  </div>
                </aside>
              </div>

              <div>
                <h2 className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  <LayoutDashboard className="h-4 w-4" />
                  Segment breakdown
                </h2>

                {breakdowns?.cards?.length ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {breakdowns.cards.map((card) => (
                      <AnalyticsBreakdownCard
                        key={card.dimensionType}
                        card={card}
                        helpText={BREAKDOWN_HELP[card.dimensionType]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                    No breakdown data for this period.
                  </div>
                )}
              </div>
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
                  onChange={(e) => {
                    const nextPreset = e.target.value as PerformanceDatePreset;
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: nextPreset,
                    }));
                    if (nextPreset !== "CUSTOM") {
                      setCustomFromText("");
                      setCustomToText("");
                    } else if (draft.fromDate && draft.toDate) {
                      setCustomFromText(formatReportDate(draft.fromDate));
                      setCustomToText(formatReportDate(draft.toDate));
                    }
                  }}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {DURATION_OPTIONS.map((option) => (
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
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50",
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
                className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                disabled={draftCustomInvalid || loading}
                className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
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
