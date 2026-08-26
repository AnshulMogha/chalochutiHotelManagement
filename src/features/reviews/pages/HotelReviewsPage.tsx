import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Building2,
  Flag,
  Loader2,
  MessageSquare,
  Search,
  Star,
  X,
} from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  ReviewFilterField,
  ReviewStatusBadge,
} from "../components/reviewModerationUi";
import { resolveReviewMediaUrl } from "../services/reviewMediaUrl";
import { hotelReviewService } from "../services/hotelReviewService";
import type { HotelReviewItem } from "../services/hotelReviewTypes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type DialogMode = "reply" | "report" | null;

type FilterDraft = {
  bookingRef: string;
  customerEmail: string;
};

type AppliedFilters = {
  bookingRef?: string;
  customerEmail?: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  bookingRef: "",
  customerEmail: "",
};

export default function HotelReviewsPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HotelReviewItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activeReview, setActiveReview] = useState<HotelReviewItem | null>(
    null,
  );
  const [dialogText, setDialogText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const hasActiveFilters = Boolean(
    filters.bookingRef || filters.customerEmail,
  );

  const loadReviews = useCallback(async () => {
    if (!hotelId) {
      setRows([]);
      setTotalElements(0);
      return;
    }
    setLoading(true);
    try {
      const response = await hotelReviewService.list({
        hotelId,
        page,
        size: PAGE_SIZE,
        bookingRef: filters.bookingRef,
        customerEmail: filters.customerEmail,
      });
      setRows(response.items);
      setTotalElements(response.totalElements);
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [hotelId, page, filters, showToast]);

  useEffect(() => {
    setPage(0);
    setDraft(DEFAULT_FILTERS);
    setFilters({});
  }, [hotelId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const applyFilters = () => {
    setFilters({
      bookingRef: draft.bookingRef.trim() || undefined,
      customerEmail: draft.customerEmail.trim() || undefined,
    });
    setPage(0);
  };

  const clearFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters({});
    setPage(0);
  };

  const openDialog = (mode: DialogMode, review: HotelReviewItem) => {
    setActiveReview(review);
    setDialogMode(mode);
    setDialogText("");
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogMode(null);
    setActiveReview(null);
    setDialogText("");
  };

  const resetDialog = () => {
    setDialogMode(null);
    setActiveReview(null);
    setDialogText("");
  };

  const submitDialog = async () => {
    if (!hotelId || !activeReview || !dialogMode) return;
    const text = dialogText.trim();
    if (!text) {
      showToast(
        dialogMode === "reply"
          ? "Please enter a reply"
          : "Please enter a report reason",
        "error",
      );
      return;
    }
    setSubmitting(true);
    try {
      if (dialogMode === "reply") {
        const updated = await hotelReviewService.reply(
          activeReview.id,
          hotelId,
          { replyText: text },
        );
        setRows((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
        showToast("Reply posted", "success");
      } else {
        await hotelReviewService.report(activeReview.id, hotelId, {
          reason: text,
        });
        showToast("Review reported", "success");
        await loadReviews();
      }
      resetDialog();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hotelId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Guest reviews</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a hotel from the top bar to view and respond to reviews.
        </p>
        <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f3d95]/10">
            <Building2 className="h-7 w-7 text-[#2f3d95]" />
          </div>
          <p className="font-medium text-slate-700">No hotel selected</p>
          <p className="mt-1 text-sm text-slate-400">
            Use the hotel selector above to choose a property
          </p>
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }}
          >
            <ReviewFilterField label="Booking reference">
              <input
                type="text"
                value={draft.bookingRef}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, bookingRef: e.target.value }))
                }
                placeholder="e.g. BRK148FA6ACC03E"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </ReviewFilterField>
            <ReviewFilterField label="Customer email">
              <input
                type="text"
                value={draft.customerEmail}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    customerEmail: e.target.value,
                  }))
                }
                placeholder="guest@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </ReviewFilterField>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
              {hasActiveFilters ||
              draft.bookingRef ||
              draft.customerEmail ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-slate-500">
              {hasActiveFilters
                ? "No reviews match your search."
                : "No reviews for this hotel yet."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => (
                <li key={row.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-800">
                          {row.overallRating != null
                            ? row.overallRating.toFixed(1)
                            : "—"}
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        </span>
                        {row.status ? (
                          <ReviewStatusBadge status={row.status} />
                        ) : null}
                        {row.bookingRef ? (
                          <span className="text-xs font-medium text-slate-500">
                            {row.bookingRef}
                          </span>
                        ) : null}
                      </div>
                      {row.customerEmail ? (
                        <p className="mt-1.5 text-xs text-slate-500">
                          {row.customerEmail}
                        </p>
                      ) : null}
                      {row.title ? (
                        <p className="mt-2 font-semibold text-slate-900">
                          {row.title}
                        </p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {row.reviewText || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        {row.travellerType ? (
                          <span>{formatStatusLabel(row.travellerType)}</span>
                        ) : null}
                        {row.wouldRecommend != null ? (
                          <span>
                            Recommend {row.wouldRecommend ? "yes" : "no"}
                          </span>
                        ) : null}
                        {row.wouldReturn ? (
                          <span>
                            Return {formatStatusLabel(row.wouldReturn)}
                          </span>
                        ) : null}
                        {row.publishedAt || row.createdAt ? (
                          <span>
                            {formatReportDateTime(
                              row.publishedAt || row.createdAt,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {row.canReply !== false && !row.reply?.replyText ? (
                        <button
                          type="button"
                          onClick={() => openDialog("reply", row)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Reply
                        </button>
                      ) : null}
                      {row.canReport !== false ? (
                        <button
                          type="button"
                          onClick={() => openDialog("report", row)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Report
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {row.media.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...row.media]
                        .sort(
                          (a, b) =>
                            (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
                        )
                        .map((media, index) => {
                          const label =
                            media.fileName || media.storageKey || "Image";
                          const href = resolveReviewMediaUrl(media);
                          if (!href) return null;
                          return (
                            <button
                              key={`${media.storageKey || label}-${index}`}
                              type="button"
                              onClick={() =>
                                setMediaPreview({ url: href, label })
                              }
                              className="h-16 w-20 overflow-hidden rounded-lg border border-slate-200"
                            >
                              <img
                                src={href}
                                alt={label}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          );
                        })}
                    </div>
                  ) : null}

                  {row.reply?.replyText ? (
                    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sky-800">
                        Your reply
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {row.reply.replyText}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {row.reply.repliedByName || "—"}
                        {row.reply.repliedAt
                          ? ` · ${formatReportDateTime(row.reply.repliedAt)}`
                          : ""}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {totalElements > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {dialogMode && activeReview ? (
        <>
          <button
            type="button"
            aria-label="Close dialog"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={closeDialog}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  dialogMode === "reply"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {dialogMode === "reply" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {dialogMode === "reply" ? "Reply to review" : "Report review"}
              </h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {activeReview.customerEmail ||
                activeReview.reviewText ||
                activeReview.bookingRef ||
                "Review"}
            </p>
            <textarea
              rows={4}
              value={dialogText}
              onChange={(e) => setDialogText(e.target.value)}
              placeholder={
                dialogMode === "reply"
                  ? "Write your reply to the guest…"
                  : "Why are you reporting this review?"
              }
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={closeDialog}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !dialogText.trim()}
                onClick={() => void submitDialog()}
                className="rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Saving…"
                  : dialogMode === "reply"
                    ? "Post reply"
                    : "Submit report"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {mediaPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-slate-900/70"
            onClick={() => setMediaPreview(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {mediaPreview.label}
              </p>
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-slate-950 p-4">
              <img
                src={mediaPreview.url}
                alt={mediaPreview.label}
                className="mx-auto max-h-[70vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
