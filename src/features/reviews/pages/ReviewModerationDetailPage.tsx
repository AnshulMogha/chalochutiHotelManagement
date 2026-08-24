import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { reviewModerationService } from "../services/reviewModerationService";
import type {
  ReviewAuditEntry,
  ReviewQueueItem,
} from "../services/reviewModerationTypes";
import {
  ReviewModerationFlowStrip,
  ReviewModerationPageShell,
  ReviewRatingStars,
  ReviewStatusBadge,
  canApproveReview,
  canFlagReview,
  canRejectReview,
  canUnflagReview,
} from "../components/reviewModerationUi";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  History,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActionType = "approve" | "reject" | "flag" | "unflag";

export default function ReviewModerationDetailPage() {
  const { reviewId = "" } = useParams();
  const location = useLocation();
  const { toast, showToast, hideToast } = useToast();

  const [review, setReview] = useState<ReviewQueueItem | null>(
    (location.state as { review?: ReviewQueueItem } | null)?.review ?? null,
  );
  const [audit, setAudit] = useState<ReviewAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionOpen, setActionOpen] = useState<ActionType | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    try {
      const auditTrail = await reviewModerationService.getAuditTrail(reviewId);
      setAudit(auditTrail);
      const stateReview = (
        location.state as { review?: ReviewQueueItem } | null
      )?.review;
      if (stateReview?.id === reviewId) {
        setReview(stateReview);
      } else {
        const queueItem =
          await reviewModerationService.findReviewInQueue(reviewId);
        if (queueItem) setReview(queueItem);
      }
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [location.state, reviewId, showToast]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const status = review?.status ?? audit[audit.length - 1]?.toStatus ?? "";

  const runAction = async () => {
    if (!reviewId || !actionOpen || !reason.trim()) {
      showToast("Please enter a reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { reason: reason.trim() };
      let result;
      switch (actionOpen) {
        case "approve":
          result = await reviewModerationService.approve(reviewId, payload);
          break;
        case "reject":
          result = await reviewModerationService.reject(reviewId, payload);
          break;
        case "flag":
          result = await reviewModerationService.flag(reviewId, payload);
          break;
        case "unflag":
          result = await reviewModerationService.unflag(reviewId, payload);
          break;
      }
      showToast(`Review ${formatStatusLabel(result.status)}`, "success");
      setActionOpen(null);
      setReason("");
      if (review) {
        setReview({ ...review, status: result.status });
      }
      await loadDetail();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!reviewId) {
    return (
      <div className="p-6 text-sm text-slate-500">Review ID is missing.</div>
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
      <ReviewModerationPageShell
        title="Review detail"
        subtitle={
          review?.bookingRef
            ? `${review.bookingRef} · ${formatStatusLabel(review.bookingType)}`
            : `Review ID ${reviewId}`
        }
        actions={
          <Link
            to={ROUTES.RATINGS_REVIEWS.LIST}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to queue
          </Link>
        }
      >
        {loading && !review ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#2f3d95]" />
          </div>
        ) : (
          <>
            <ReviewModerationFlowStrip />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Booking reference
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {review?.bookingRef || "—"}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {review?.bookingType
                          ? formatStatusLabel(review.bookingType)
                          : "—"}
                        {review?.travellerType
                          ? ` · ${formatStatusLabel(review.travellerType)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ReviewRatingStars rating={review?.overallRating ?? null} />
                      {status ? <ReviewStatusBadge status={status} /> : null}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Review text
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {review?.reviewText || "No review text available."}
                    </p>
                  </div>

                  {review?.moderationReason ? (
                    <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2.5 text-sm text-rose-800">
                      <span className="font-semibold">Moderation reason:</span>{" "}
                      {review.moderationReason}
                    </div>
                  ) : null}

                  {review?.createdAt ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Submitted {formatReportDateTime(review.createdAt)}
                      {review.autoModerated ? " · Auto-moderated" : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Moderation actions
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      All actions require a reason
                    </p>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    {canApproveReview(status) ? (
                      <ActionButton
                        tone="emerald"
                        icon={CheckCircle2}
                        label="Approve & publish"
                        onClick={() => setActionOpen("approve")}
                      />
                    ) : null}
                    {canRejectReview(status) ? (
                      <ActionButton
                        tone="rose"
                        icon={XCircle}
                        label="Reject"
                        onClick={() => setActionOpen("reject")}
                      />
                    ) : null}
                    {canFlagReview(status) ? (
                      <ActionButton
                        tone="amber"
                        icon={Flag}
                        label="Flag"
                        onClick={() => setActionOpen("flag")}
                      />
                    ) : null}
                    {canUnflagReview(status) ? (
                      <ActionButton
                        tone="slate"
                        icon={RotateCcw}
                        label="Unflag → pending"
                        onClick={() => setActionOpen("unflag")}
                      />
                    ) : null}
                    {!canApproveReview(status) &&
                    !canRejectReview(status) &&
                    !canFlagReview(status) &&
                    !canUnflagReview(status) ? (
                      <p className="py-2 text-center text-xs text-slate-500">
                        No actions available for this status.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <History className="h-4 w-4 text-slate-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Audit trail
                  </h2>
                  <p className="text-xs text-slate-500">
                    {audit.length} entr{audit.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              </div>
              {audit.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  No audit entries yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Action</th>
                        <th className="px-4 py-2.5 font-semibold">From → To</th>
                        <th className="px-4 py-2.5 font-semibold">Reason</th>
                        <th className="px-4 py-2.5 font-semibold">Moderator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {audit.map((entry) => (
                        <tr key={String(entry.id)} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {formatStatusLabel(entry.action)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.fromStatus
                              ? formatStatusLabel(entry.fromStatus)
                              : "—"}
                            {" → "}
                            {entry.toStatus
                              ? formatStatusLabel(entry.toStatus)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.reasonCode
                              ? formatStatusLabel(entry.reasonCode)
                              : entry.reason || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.moderatorName ||
                              entry.moderatorRole ||
                              "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </ReviewModerationPageShell>

      {actionOpen ? (
        <>
          <button
            type="button"
            aria-label="Close action dialog"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => !submitting && setActionOpen(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {actionOpen === "approve"
                ? "Approve review"
                : actionOpen === "reject"
                  ? "Reject review"
                  : actionOpen === "flag"
                    ? "Flag review"
                    : "Unflag review"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter a reason for this moderation action.
            </p>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for moderation…"
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActionOpen(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !reason.trim()}
                onClick={() => void runAction()}
                className="rounded-lg bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: typeof CheckCircle2;
  tone: "emerald" | "rose" | "amber" | "slate";
  onClick: () => void;
}) {
  const styles = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    amber: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    slate: "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
        styles[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
