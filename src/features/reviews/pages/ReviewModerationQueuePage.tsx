import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDateTime,
  formatStatusLabel,
  isoToReportDateText,
  parseOptionalReportDate,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { reviewModerationService } from "../services/reviewModerationService";
import type { ReviewQueueItem } from "../services/reviewModerationTypes";
import { BOOKING_TYPES } from "../services/reviewModerationTypes";
import {
  ReviewModerationEmptyState,
  ReviewModerationFlowStrip,
  ReviewModerationPageShell,
  ReviewModerationStatCard,
  ReviewRatingStars,
  ReviewStatusBadge,
  ReviewSubjectLookupField,
} from "../components/reviewModerationUi";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Flag,
  ListOrdered,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

const PAGE_SIZE = 20;

const RATING_OPTIONS = [
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
] as const;

type FilterDraft = {
  bookingType: string;
  bookingRef: string;
  subjectId: string;
  subjectLabel: string;
  rating: string;
  dateText: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  bookingType: "",
  bookingRef: "",
  subjectId: "",
  subjectLabel: "",
  rating: "",
  dateText: "",
};

type AppliedFilters = {
  bookingType?: string;
  bookingRef?: string;
  subjectId?: string;
  rating?: number;
  date?: string;
};

function buildAppliedFilters(draft: FilterDraft): AppliedFilters | null {
  const date = parseOptionalReportDate(draft.dateText);
  if (draft.dateText.trim() && !date) {
    return null;
  }

  const rating =
    draft.rating.trim() !== "" ? Number(draft.rating) : undefined;
  if (rating != null && !Number.isFinite(rating)) {
    return null;
  }

  return {
    bookingType: draft.bookingType || undefined,
    bookingRef: draft.bookingRef.trim() || undefined,
    subjectId: draft.subjectId.trim() || undefined,
    rating,
    date: date || undefined,
  };
}

function validateDraftFilters(
  draft: FilterDraft,
): { ok: true; filters: AppliedFilters } | { ok: false; message: string } {
  const date = parseOptionalReportDate(draft.dateText);
  if (draft.dateText.trim() && !date) {
    return { ok: false, message: "Enter submitted date as dd/mm/yyyy" };
  }

  if (draft.rating.trim() !== "") {
    const rating = Number(draft.rating);
    if (!Number.isFinite(rating)) {
      return { ok: false, message: "Enter a valid rating" };
    }
  }

  const filters = buildAppliedFilters(draft);
  if (!filters) {
    return { ok: false, message: "Invalid filter values" };
  }

  return { ok: true, filters };
}

export default function ReviewModerationQueuePage() {
  const { toast, showToast, hideToast } = useToast();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReviewQueueItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.bookingType) count += 1;
    if (filters.bookingRef) count += 1;
    if (filters.subjectId) count += 1;
    if (filters.rating != null) count += 1;
    if (filters.date) count += 1;
    return count;
  }, [filters]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewModerationService.getFlagQueue({
        page,
        size: PAGE_SIZE,
        ...filters,
      });
      setRows(data.items);
      setTotalElements(data.totalElements);
      setQueueStatus(data.queueStatus);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showToast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const applyFilters = () => {
    const result = validateDraftFilters(draft);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    setFilters(result.filters);
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters({});
    setPage(0);
    setFilterOpen(false);
  };

  const flaggedCount = rows.filter(
    (row) => row.status.toUpperCase() === "REVIEW_FLAGGED",
  ).length;
  const pendingCount = rows.filter(
    (row) => row.status.toUpperCase() === "REVIEW_PENDING",
  ).length;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <ReviewModerationPageShell
        title="Review Moderation"
        subtitle="Moderate customer reviews in the flag queue — approve, reject, flag, or unflag."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(filtersToDraft(filters));
                setFilterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-[#2f3d95] px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void loadQueue()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReviewModerationStatCard
            label="Queue total"
            value={loading ? "…" : totalElements.toLocaleString("en-IN")}
            sub={queueStatus ? formatStatusLabel(queueStatus) : "All statuses"}
            icon={ListOrdered}
            tone="navy"
          />
          <ReviewModerationStatCard
            label="On this page"
            value={loading ? "…" : rows.length}
            sub={`Page ${page + 1} of ${totalPages}`}
            icon={Eye}
            tone="slate"
          />
          <ReviewModerationStatCard
            label="Flagged"
            value={loading ? "…" : flaggedCount}
            sub="On current page"
            icon={Flag}
            tone="rose"
          />
          <ReviewModerationStatCard
            label="Pending"
            value={loading ? "…" : pendingCount}
            sub="Awaiting review"
            icon={Clock3}
            tone="amber"
          />
        </div>

        <ReviewModerationFlowStrip />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Moderation queue
              </h2>
              <p className="text-xs text-slate-500">
                {loading
                  ? "Loading…"
                  : `${totalElements.toLocaleString("en-IN")} review${totalElements === 1 ? "" : "s"} in queue`}
                {activeFilterCount > 0 ? " · filtered" : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Booking</th>
                  <th className="px-4 py-2.5 font-semibold">Rating</th>
                  <th className="px-4 py-2.5 font-semibold">Review</th>
                  <th className="px-4 py-2.5 font-semibold">Traveller</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Moderation</th>
                  <th className="px-4 py-2.5 font-semibold">Submitted</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#2f3d95]" />
                      Loading moderation queue…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <ReviewModerationEmptyState
                        title={
                          activeFilterCount > 0
                            ? "No matching reviews"
                            : undefined
                        }
                        description={
                          activeFilterCount > 0
                            ? "Try adjusting or clearing your filters to see more results."
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="align-top transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {row.bookingRef || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatStatusLabel(row.bookingType)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <ReviewRatingStars rating={row.overallRating} />
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-2 text-slate-700">
                          {row.reviewText || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.travellerType
                          ? formatStatusLabel(row.travellerType)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ReviewStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        {row.autoModerated ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                            <Flag className="h-3 w-3" />
                            Auto
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Manual</span>
                        )}
                        {row.moderationReason ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                            {row.moderationReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {row.createdAt
                          ? formatReportDateTime(row.createdAt)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={ROUTES.RATINGS_REVIEWS.DETAIL(row.id)}
                          state={{ review: row }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#263578]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Page {page + 1} of {totalPages}
              <span className="text-slate-400"> · </span>
              {totalElements.toLocaleString("en-IN")} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </ReviewModerationPageShell>

      {filterOpen ? (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Booking type
                </label>
                <select
                  value={draft.bookingType}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      bookingType: e.target.value,
                      subjectId: "",
                      subjectLabel: "",
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {BOOKING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatStatusLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Booking reference
                </label>
                <input
                  type="text"
                  value={draft.bookingRef}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      bookingRef: e.target.value,
                    }))
                  }
                  placeholder="BRKFFE8"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Partial match, case-insensitive
                </p>
              </div>
              <ReviewSubjectLookupField
                bookingType={draft.bookingType}
                value={draft.subjectId}
                selectedLabel={draft.subjectLabel}
                onChange={({ subjectId, subjectLabel }) =>
                  setDraft((prev) => ({ ...prev, subjectId, subjectLabel }))
                }
              />
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Overall rating
                </label>
                <select
                  value={draft.rating}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, rating: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Any</option>
                  {RATING_OPTIONS.map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">
                  Submitted on (IST day, dd/mm/yyyy)
                </p>
                <ReportCustomDateFields
                  singleDate
                  singleLabel="Date"
                  fromText={draft.dateText}
                  onFromTextChange={(value) =>
                    setDraft((prev) => ({ ...prev, dateText: value }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-medium text-white"
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function filtersToDraft(filters: AppliedFilters): FilterDraft {
  return {
    bookingType: filters.bookingType || "",
    bookingRef: filters.bookingRef || "",
    subjectId: filters.subjectId || "",
    subjectLabel: "",
    rating:
      filters.rating != null && Number.isFinite(filters.rating)
        ? String(filters.rating)
        : "",
    dateText: filters.date ? isoToReportDateText(filters.date) : "",
  };
}
