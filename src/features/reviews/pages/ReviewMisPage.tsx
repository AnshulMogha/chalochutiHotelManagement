import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDate,
  formatReportDateTime,
  formatStatusLabel,
  isoToReportDateText,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { reviewMisService } from "../services/reviewMisService";
import type {
  ReviewMisItem,
  ReviewMisSummary,
} from "../services/reviewMisTypes";
import {
  BOOKING_TYPES,
  REVIEW_STATUSES,
} from "../services/reviewModerationTypes";
import {
  ReviewFilterDrawer,
  ReviewFilterField,
  ReviewModerationPageShell,
  ReviewStatusBadge,
} from "../components/reviewModerationUi";
import {
  BarChart3,
  BedDouble,
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Flag,
  Hotel,
  IndianRupee,
  Loader2,
  MapPin,
  MessageSquare,
  Mountain,
  RefreshCw,
  Route,
  Sparkles,
  Star,
  UserRound,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const RATING_MIX_TONES: Record<
  1 | 2 | 3 | 4 | 5,
  { bar: string; label: string; chip: string }
> = {
  5: {
    bar: "bg-emerald-500",
    label: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700",
  },
  4: {
    bar: "bg-lime-500",
    label: "text-lime-700",
    chip: "bg-lime-50 text-lime-700",
  },
  3: {
    bar: "bg-amber-400",
    label: "text-amber-700",
    chip: "bg-amber-50 text-amber-700",
  },
  2: {
    bar: "bg-orange-500",
    label: "text-orange-700",
    chip: "bg-orange-50 text-orange-700",
  },
  1: {
    bar: "bg-rose-500",
    label: "text-rose-700",
    chip: "bg-rose-50 text-rose-700",
  },
};

const CATEGORY_META: Record<
  string,
  { icon: LucideIcon; tone: string; iconTone: string }
> = {
  Cleanliness: {
    icon: Sparkles,
    tone: "border-cyan-100 bg-cyan-50/60",
    iconTone: "bg-cyan-100 text-cyan-700",
  },
  Staff: {
    icon: Users,
    tone: "border-violet-100 bg-violet-50/60",
    iconTone: "bg-violet-100 text-violet-700",
  },
  Location: {
    icon: MapPin,
    tone: "border-rose-100 bg-rose-50/60",
    iconTone: "bg-rose-100 text-rose-700",
  },
  "Room comfort": {
    icon: BedDouble,
    tone: "border-sky-100 bg-sky-50/60",
    iconTone: "bg-sky-100 text-sky-700",
  },
  Value: {
    icon: IndianRupee,
    tone: "border-emerald-100 bg-emerald-50/60",
    iconTone: "bg-emerald-100 text-emerald-700",
  },
  Hotel: {
    icon: Hotel,
    tone: "border-indigo-100 bg-indigo-50/60",
    iconTone: "bg-indigo-100 text-indigo-700",
  },
  Transport: {
    icon: Bus,
    tone: "border-amber-100 bg-amber-50/60",
    iconTone: "bg-amber-100 text-amber-700",
  },
  Activity: {
    icon: Mountain,
    tone: "border-teal-100 bg-teal-50/60",
    iconTone: "bg-teal-100 text-teal-700",
  },
  "Tour guide": {
    icon: UserRound,
    tone: "border-fuchsia-100 bg-fuchsia-50/60",
    iconTone: "bg-fuchsia-100 text-fuchsia-700",
  },
  Itinerary: {
    icon: Route,
    tone: "border-orange-100 bg-orange-50/60",
    iconTone: "bg-orange-100 text-orange-700",
  },
};

type FilterDraft = {
  bookingType: string;
  status: string;
  bookingRef: string;
  subjectId: string;
  fromDateText: string;
  toDateText: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  bookingType: "",
  status: "",
  bookingRef: "",
  subjectId: "",
  fromDateText: "",
  toDateText: "",
};

type AppliedFilters = {
  bookingType?: string;
  status?: string;
  bookingRef?: string;
  subjectId?: string;
  fromDate?: string;
  toDate?: string;
};

const EMPTY_SUMMARY: ReviewMisSummary = {
  totalReviews: 0,
  pendingCount: 0,
  publishedCount: 0,
  flaggedCount: 0,
  rejectedCount: 0,
  publishedAverageRating: null,
  publishedAggregate: null,
};

const KPI_TONES = {
  slate: {
    card: "border-slate-200/80 bg-white",
    icon: "bg-slate-100 text-slate-600",
    label: "text-slate-500",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/40",
    icon: "bg-emerald-100 text-emerald-700",
    label: "text-emerald-700/80",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/40",
    icon: "bg-amber-100 text-amber-700",
    label: "text-amber-700/80",
  },
  gold: {
    card: "border-yellow-100 bg-yellow-50/50",
    icon: "bg-yellow-100 text-yellow-700",
    label: "text-yellow-700/80",
  },
  rose: {
    card: "border-rose-100 bg-rose-50/40",
    icon: "bg-rose-100 text-rose-700",
    label: "text-rose-700/80",
  },
  sky: {
    card: "border-sky-100 bg-sky-50/40",
    icon: "bg-sky-100 text-sky-700",
    label: "text-sky-700/80",
  },
} as const;

function formatAvg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function MisKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: (typeof KPI_TONES)[keyof typeof KPI_TONES];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        tone.card,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.04em]",
            tone.label,
          )}
        >
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      ) : null}
    </div>
  );
}

export default function ReviewMisPage() {
  const { toast, showToast, hideToast } = useToast();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReviewMisItem[]>([]);
  const [summary, setSummary] = useState<ReviewMisSummary>(EMPTY_SUMMARY);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.bookingType) count += 1;
    if (filters.status) count += 1;
    if (filters.bookingRef) count += 1;
    if (filters.subjectId) count += 1;
    if (filters.fromDate || filters.toDate) count += 1;
    return count;
  }, [filters]);

  const dateRangeLabel = useMemo(() => {
    if (filters.fromDate && filters.toDate) {
      return `${formatReportDate(filters.fromDate)} – ${formatReportDate(filters.toDate)}`;
    }
    if (filters.fromDate) return `From ${formatReportDate(filters.fromDate)}`;
    if (filters.toDate) return `Until ${formatReportDate(filters.toDate)}`;
    return null;
  }, [filters.fromDate, filters.toDate]);

  const loadMis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewMisService.getMis({
        page,
        size: PAGE_SIZE,
        ...filters,
      });
      setRows(data.items);
      setSummary(data.summary);
      setTotalElements(data.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showToast]);

  useEffect(() => {
    void loadMis();
  }, [loadMis]);

  const applyFilters = () => {
    const range = validateOptionalDateRange(
      draft.fromDateText,
      draft.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setFilters({
      bookingType: draft.bookingType || undefined,
      status: draft.status || undefined,
      bookingRef: draft.bookingRef.trim() || undefined,
      subjectId: draft.subjectId.trim() || undefined,
      fromDate: range.fromDate || undefined,
      toDate: range.toDate || undefined,
    });
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters({});
    setPage(0);
    setFilterOpen(false);
  };

  const aggregate = summary.publishedAggregate;
  const categoryScores = (
    [
      ["Cleanliness", aggregate?.cleanlinessAverage],
      ["Staff", aggregate?.staffAverage],
      ["Location", aggregate?.locationAverage],
      ["Room comfort", aggregate?.roomComfortAverage],
      ["Value", aggregate?.valueForMoneyAverage],
      ["Hotel", aggregate?.hotelRatingAverage],
      ["Transport", aggregate?.transportRatingAverage],
      ["Activity", aggregate?.activityRatingAverage],
      ["Tour guide", aggregate?.tourGuideRatingAverage],
      ["Itinerary", aggregate?.itineraryRatingAverage],
    ] as const
  ).filter(([, value]) => value != null);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <ReviewModerationPageShell
        title="Review MIS"
        subtitle={
          dateRangeLabel
            ? `Analytics · ${dateRangeLabel}`
            : "Volume, ratings, and review inventory"
        }
        icon={BarChart3}
        iconClassName="bg-[#2f3d95]"
        borderClassName="border-slate-200"
        wide
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dateRangeLabel ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {dateRangeLabel}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDraft(filtersToDraft(filters));
                setFilterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4 text-slate-500" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2f3d95] px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void loadMis()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <RefreshCw className="h-4 w-4 text-slate-500" />
              )}
              Refresh
            </button>
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MisKpiCard
            label="Total"
            value={loading ? "…" : summary.totalReviews.toLocaleString("en-IN")}
            icon={BarChart3}
            tone={KPI_TONES.slate}
          />
          <MisKpiCard
            label="Published"
            value={
              loading ? "…" : summary.publishedCount.toLocaleString("en-IN")
            }
            icon={CheckCircle2}
            tone={KPI_TONES.emerald}
          />
          <MisKpiCard
            label="Avg rating"
            value={
              loading
                ? "…"
                : formatAvg(
                    aggregate?.averageRating ?? summary.publishedAverageRating,
                  )
            }
            sub={
              aggregate
                ? `${aggregate.ratingCount.toLocaleString("en-IN")} ratings`
                : undefined
            }
            icon={Star}
            tone={KPI_TONES.gold}
          />
          <MisKpiCard
            label="Pending"
            value={loading ? "…" : summary.pendingCount.toLocaleString("en-IN")}
            icon={Clock3}
            tone={KPI_TONES.amber}
          />
          <MisKpiCard
            label="Flagged"
            value={loading ? "…" : summary.flaggedCount.toLocaleString("en-IN")}
            icon={Flag}
            tone={KPI_TONES.rose}
          />
          <MisKpiCard
            label="Rejected"
            value={
              loading ? "…" : summary.rejectedCount.toLocaleString("en-IN")
            }
            icon={XCircle}
            tone={KPI_TONES.sky}
          />
        </div>

        {aggregate ? (
          <div className="mb-3 grid gap-2 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-100/80 bg-linear-to-br from-amber-50/40 to-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-800/80">
                  Rating mix
                </p>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {(
                  [
                    [5, aggregate.rating5Count],
                    [4, aggregate.rating4Count],
                    [3, aggregate.rating3Count],
                    [2, aggregate.rating2Count],
                    [1, aggregate.rating1Count],
                  ] as const
                ).map(([stars, count]) => {
                  const total = Math.max(1, aggregate.ratingCount);
                  const pct = Math.round((count / total) * 100);
                  const tone = RATING_MIX_TONES[stars];
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex w-8 items-center justify-end gap-0.5 text-[11px] font-semibold",
                          tone.label,
                        )}
                      >
                        {stars}
                        <Star className="h-2.5 w-2.5 fill-current" />
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", tone.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "min-w-14 rounded-md px-1.5 py-0.5 text-right text-[10px] font-medium tabular-nums",
                          tone.chip,
                        )}
                      >
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100/80 bg-linear-to-br from-indigo-50/30 to-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-indigo-800/80">
                    Category averages
                  </p>
                </div>
                {aggregate.lastReviewAt ? (
                  <p className="truncate text-[10px] text-slate-400">
                    Last {formatReportDateTime(aggregate.lastReviewAt)}
                  </p>
                ) : null}
              </div>
              {categoryScores.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No category data.</p>
              ) : (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  {categoryScores.map(([label, value]) => {
                    const meta = CATEGORY_META[label] ?? {
                      icon: Star,
                      tone: "border-slate-100 bg-slate-50/80",
                      iconTone: "bg-slate-100 text-slate-600",
                    };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={label}
                        className={cn(
                          "flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5",
                          meta.tone,
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            meta.iconTone,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] text-slate-500">
                            {label}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatAvg(value)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Review
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Traveller
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Published
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-20 text-center text-slate-500"
                    >
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />
                      Loading reviews…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-20 text-center text-sm text-slate-500"
                    >
                      No reviews match the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <FragmentRow
                        key={row.id}
                        row={row}
                        expanded={expanded}
                        onToggle={() =>
                          setExpandedId((prev) =>
                            prev === row.id ? null : row.id,
                          )
                        }
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3.5">
            <p className="text-xs text-slate-500">
              {totalElements.toLocaleString("en-IN")} reviews
              <span className="text-slate-300"> · </span>
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </ReviewModerationPageShell>

      <ReviewFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
      >
        <ReviewFilterField label="Booking type">
          <select
            value={draft.bookingType}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, bookingType: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All types</option>
            {BOOKING_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatStatusLabel(type)}
              </option>
            ))}
          </select>
        </ReviewFilterField>
        <ReviewFilterField label="Status">
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All statuses</option>
            {REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status.replace(/^REVIEW_/, ""))}
              </option>
            ))}
          </select>
        </ReviewFilterField>
        <ReviewFilterField label="Booking reference">
          <input
            type="text"
            value={draft.bookingRef}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, bookingRef: e.target.value }))
            }
            placeholder="BRKD2813CF0EC8B"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </ReviewFilterField>
        <ReviewFilterField label="Subject ID">
          <input
            type="text"
            value={draft.subjectId}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, subjectId: e.target.value }))
            }
            placeholder="Hotel UUID or package ID"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-slate-400"
          />
        </ReviewFilterField>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">
            Date range (dd/mm/yyyy)
          </p>
          <ReportCustomDateFields
            fromText={draft.fromDateText}
            toText={draft.toDateText}
            onFromTextChange={(value) =>
              setDraft((prev) => ({ ...prev, fromDateText: value }))
            }
            onToTextChange={(value) =>
              setDraft((prev) => ({ ...prev, toDateText: value }))
            }
            inputClassName="rounded-xl"
          />
        </div>
      </ReviewFilterDrawer>
    </>
  );
}

function FragmentRow({
  row,
  expanded,
  onToggle,
}: {
  row: ReviewMisItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="align-top transition-colors hover:bg-slate-50/70">
        <td className="px-3 py-4">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </td>
        <td className="px-4 py-4">
          <p className="font-medium text-slate-900">{row.bookingRef || "—"}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatStatusLabel(row.bookingType)}
          </p>
        </td>
        <td className="px-4 py-4">
          <div className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-800">
            {row.overallRating != null ? row.overallRating.toFixed(1) : "—"}
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          </div>
        </td>
        <td className="max-w-sm px-4 py-4">
          {row.title ? (
            <p className="line-clamp-1 font-medium text-slate-900">{row.title}</p>
          ) : null}
          <p
            className={cn(
              "line-clamp-2 text-slate-600",
              row.title ? "mt-0.5" : "",
            )}
          >
            {row.reviewText || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {row.media.length > 0 ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {row.media.length} media
              </span>
            ) : null}
            {row.reply ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                <MessageSquare className="h-3 w-3" />
                Reply
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-4 text-slate-600">
          {row.travellerType ? formatStatusLabel(row.travellerType) : "—"}
          {row.wouldRecommend != null ? (
            <p className="mt-1 text-[11px] text-slate-400">
              Recommend {row.wouldRecommend ? "yes" : "no"}
            </p>
          ) : null}
        </td>
        <td className="px-4 py-4">
          <ReviewStatusBadge status={row.status} />
          {row.autoModerated ? (
            <p className="mt-1 text-[11px] text-slate-400">Auto</p>
          ) : null}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
          {row.publishedAt
            ? formatReportDateTime(row.publishedAt)
            : row.createdAt
              ? formatReportDateTime(row.createdAt)
              : "—"}
        </td>
        <td className="px-4 py-4 text-right">
          <Link
            to={ROUTES.RATINGS_REVIEWS.DETAIL(row.id)}
            state={{
              review: {
                id: row.id,
                bookingType: row.bookingType,
                bookingRef: row.bookingRef,
                overallRating: row.overallRating,
                reviewText: row.reviewText,
                travellerType: row.travellerType,
                status: row.status,
                autoModerated: row.autoModerated,
                moderationReason: row.moderationReason,
                createdAt: row.createdAt,
                media: [],
              },
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Open
          </Link>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50/50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                  Moderation
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {row.moderationReason || "—"}
                </p>
                {row.reply ? (
                  <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                    <p className="text-xs font-semibold text-sky-800">
                      Hotel reply
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {row.reply.replyText}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {row.reply.repliedByName || "—"}
                      {row.reply.repliedAt
                        ? ` · ${formatReportDateTime(row.reply.repliedAt)}`
                        : ""}
                    </p>
                  </div>
                ) : null}
                {row.media.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                      Media ({row.media.length})
                    </p>
                    <ul className="mt-2 space-y-1">
                      {[...row.media]
                        .sort(
                          (a, b) =>
                            (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
                        )
                        .map((media, index) => (
                          <li
                            key={`${media.storageKey || media.fileName}-${index}`}
                            className="truncate text-xs text-slate-600"
                          >
                            {media.fileName || media.storageKey || "File"}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                  Audit history ({row.auditHistory.length})
                </p>
                {row.auditHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No audit entries.</p>
                ) : (
                  <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                    {row.auditHistory.map((entry) => (
                      <li
                        key={String(entry.id)}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {formatStatusLabel(entry.action)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {entry.fromStatus
                              ? formatStatusLabel(entry.fromStatus)
                              : "—"}
                            {" → "}
                            {entry.toStatus
                              ? formatStatusLabel(entry.toStatus)
                              : "—"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {entry.reason || entry.reasonCode || "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {entry.moderatorName || entry.moderatorRole || "—"}
                          {entry.actedAt
                            ? ` · ${formatReportDateTime(entry.actedAt)}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function filtersToDraft(filters: AppliedFilters): FilterDraft {
  return {
    bookingType: filters.bookingType || "",
    status: filters.status || "",
    bookingRef: filters.bookingRef || "",
    subjectId: filters.subjectId || "",
    fromDateText: filters.fromDate ? isoToReportDateText(filters.fromDate) : "",
    toDateText: filters.toDate ? isoToReportDateText(filters.toDate) : "",
  };
}
