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
  ReviewStatusBadge,
  canApproveReview,
  canFlagReview,
  canRejectReview,
  canUnflagReview,
} from "../components/reviewModerationUi";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Flag,
  History,
  Hotel,
  Loader2,
  Mail,
  MessageSquareText,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveReviewMediaUrl } from "../services/reviewMediaUrl";

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

  const metaChips: {
    label: string;
    icon: LucideIcon;
    className: string;
  }[] = [];
  if (review?.bookingType) {
    metaChips.push({
      label: formatStatusLabel(review.bookingType),
      icon: Hotel,
      className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    });
  }
  if (review?.subjectName) {
    metaChips.push({
      label: review.subjectName,
      icon: Hotel,
      className: "bg-slate-50 text-slate-700 ring-slate-200",
    });
  }
  if (review?.customerEmail) {
    metaChips.push({
      label: review.customerEmail,
      icon: Mail,
      className: "bg-sky-50 text-sky-700 ring-sky-200",
    });
  }
  if (review?.travellerType) {
    metaChips.push({
      label: formatStatusLabel(review.travellerType),
      icon: Users,
      className: "bg-sky-50 text-sky-700 ring-sky-200",
    });
  }
  if (review?.autoModerated) {
    metaChips.push({
      label: "Auto-moderated",
      icon: Sparkles,
      className: "bg-violet-50 text-violet-700 ring-violet-200",
    });
  }

  const noteLooksPositive =
    /approv|pass|safe|ok/i.test(review?.moderationReason || "") ||
    status.toUpperCase() === "REVIEW_PUBLISHED";

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <ReviewModerationPageShell
        title={review?.bookingRef || "Review detail"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Shield className="h-3 w-3 text-[#2f3d95]" />
              Review moderation
            </span>
            {review?.overallRating != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                {review.overallRating.toFixed(1)}
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </span>
            ) : null}
            {status ? <ReviewStatusBadge status={status} /> : null}
          </span>
        }
        icon={Star}
        iconClassName="bg-linear-to-br from-[#2f3d95] to-indigo-500"
        borderClassName="border-indigo-100"
        actions={
          <Link
            to={ROUTES.RATINGS_REVIEWS.LIST}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm font-medium text-[#2f3d95] transition hover:bg-indigo-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to queue
          </Link>
        }
      >
        {loading && !review ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            <ReviewModerationFlowStrip currentStatus={status} />

            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 border-b border-indigo-50 bg-linear-to-r from-indigo-50/80 to-white px-4 py-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2f3d95]/10 text-[#2f3d95]">
                    <MessageSquareText className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Review text
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  {metaChips.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {metaChips.map((chip) => {
                        const Icon = chip.icon;
                        return (
                          <span
                            key={chip.label}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                              chip.className,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {chip.label}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-sky-100 bg-sky-50/40 px-3.5 py-3">
                    {review?.title ? (
                      <p className="mb-1.5 text-sm font-semibold text-slate-900">
                        {review.title}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                      {review?.reviewText || "No review text available."}
                    </p>
                  </div>

                  {review?.media && review.media.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...review.media]
                        .sort(
                          (a, b) =>
                            (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
                        )
                        .map((media, index) => {
                          const href = resolveReviewMediaUrl(media);
                          if (!href) return null;
                          const label =
                            media.fileName || media.storageKey || "Image";
                          return (
                            <a
                              key={`${media.storageKey || label}-${index}`}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="h-16 w-20 overflow-hidden rounded-lg border border-slate-200"
                            >
                              <img
                                src={href}
                                alt={label}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </a>
                          );
                        })}
                    </div>
                  ) : null}

                  {review?.reply?.replyText ? (
                    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sky-800">
                        Hotel reply
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {review.reply.replyText}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {review.reply.repliedByName || "—"}
                        {review.reply.repliedAt
                          ? ` · ${formatReportDateTime(review.reply.repliedAt)}`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  {review?.moderationReason ? (
                    <div
                      className={cn(
                        "mt-3 flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                        noteLooksPositive
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                          : "border-amber-200 bg-amber-50/80 text-amber-900",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                          noteLooksPositive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {noteLooksPositive ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Flag className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">Moderation note</p>
                        <p className="mt-0.5 opacity-90">
                          {review.moderationReason}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {review?.createdAt ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      Submitted {formatReportDateTime(review.createdAt)}
                    </p>
                  ) : null}
                </div>
              </section>

              <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="border-b border-amber-100 bg-linear-to-r from-amber-50 to-white px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Actions
                      </p>
                      <p className="text-[11px] text-amber-700/80">
                        Reason required
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-3.5">
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
                    <p className="py-3 text-center text-xs text-slate-500">
                      No actions for this status.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>

            <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 border-b border-violet-100 bg-linear-to-r from-violet-50 to-white px-4 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <History className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Audit trail
                  </h2>
                  <p className="text-[11px] text-violet-700/70">
                    {audit.length} entr{audit.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              </div>
              {audit.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No audit entries yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                          Action
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                          From → To
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                          Reason
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                          Moderator
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {audit.map((entry) => {
                        const actionMeta = auditActionMeta(entry.action);
                        const ActionIcon = actionMeta.icon;
                        const isSystem =
                          !entry.moderatorName ||
                          String(entry.moderatorName).toUpperCase() ===
                            "SYSTEM" ||
                          String(entry.moderatorRole || "").toUpperCase() ===
                            "SYSTEM";
                        return (
                          <tr
                            key={String(entry.id)}
                            className="hover:bg-violet-50/30"
                          >
                            <td className="px-4 py-2.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                                  actionMeta.chip,
                                )}
                              >
                                <ActionIcon className="h-3 w-3" />
                                {formatStatusLabel(entry.action)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                {entry.fromStatus ? (
                                  <ReviewStatusBadge status={entry.fromStatus} />
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                                <ArrowRight className="h-3 w-3 text-slate-300" />
                                {entry.toStatus ? (
                                  <ReviewStatusBadge status={entry.toStatus} />
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {entry.reasonCode
                                ? formatStatusLabel(entry.reasonCode)
                                : entry.reason || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {isSystem ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                  <Bot className="h-3 w-3" />
                                  SYSTEM
                                </span>
                              ) : (
                                <span className="font-medium text-slate-700">
                                  {entry.moderatorName ||
                                    entry.moderatorRole ||
                                    "—"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
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
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  actionOpen === "approve"
                    ? "bg-emerald-100 text-emerald-700"
                    : actionOpen === "reject"
                      ? "bg-rose-100 text-rose-700"
                      : actionOpen === "flag"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700",
                )}
              >
                {actionOpen === "approve" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : actionOpen === "reject" ? (
                  <XCircle className="h-4 w-4" />
                ) : actionOpen === "flag" ? (
                  <Flag className="h-4 w-4" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {actionOpen === "approve"
                  ? "Approve review"
                  : actionOpen === "reject"
                    ? "Reject review"
                    : actionOpen === "flag"
                      ? "Flag review"
                      : "Unflag review"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Enter a reason for this moderation action.
            </p>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for moderation…"
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActionOpen(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !reason.trim()}
                onClick={() => void runAction()}
                className="rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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

function auditActionMeta(action: string): {
  icon: LucideIcon;
  chip: string;
} {
  const key = String(action || "").toUpperCase();
  if (key.includes("APPROVE") || key.includes("PUBLISH")) {
    return {
      icon: CheckCircle2,
      chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    };
  }
  if (key.includes("REJECT")) {
    return {
      icon: XCircle,
      chip: "bg-rose-50 text-rose-800 ring-rose-200",
    };
  }
  if (key.includes("UNFLAG")) {
    return {
      icon: RotateCcw,
      chip: "bg-sky-50 text-sky-800 ring-sky-200",
    };
  }
  if (key.includes("FLAG")) {
    return {
      icon: Flag,
      chip: "bg-amber-50 text-amber-800 ring-amber-200",
    };
  }
  return {
    icon: History,
    chip: "bg-slate-50 text-slate-700 ring-slate-200",
  };
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
        "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
        styles[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
