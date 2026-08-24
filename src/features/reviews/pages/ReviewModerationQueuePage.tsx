import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { reviewModerationService } from "../services/reviewModerationService";
import type { ReviewQueueItem } from "../services/reviewModerationTypes";
import {
  ReviewModerationEmptyState,
  ReviewModerationFlowStrip,
  ReviewModerationPageShell,
  ReviewModerationStatCard,
  ReviewRatingStars,
  ReviewStatusBadge,
} from "../components/reviewModerationUi";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flag,
  ListOrdered,
  Loader2,
  RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 20;

export default function ReviewModerationQueuePage() {
  const { toast, showToast, hideToast } = useToast();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReviewQueueItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewModerationService.getFlagQueue({
        page,
        size: PAGE_SIZE,
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
  }, [page, showToast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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
                      <ReviewModerationEmptyState />
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
    </>
  );
}
