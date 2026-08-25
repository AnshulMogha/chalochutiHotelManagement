import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import type {
  ReviewMisAggregate,
  ReviewMisAuditEntry,
  ReviewMisItem,
  ReviewMisMediaItem,
  ReviewMisParams,
  ReviewMisReply,
  ReviewMisResponse,
  ReviewMisSummary,
} from "./reviewMisTypes";

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toCount(value: unknown): number {
  const n = toNumber(value);
  return n == null ? 0 : n;
}

function buildMisQuery(params: ReviewMisParams): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 20));
  if (params.bookingType) search.set("bookingType", params.bookingType);
  if (params.status) search.set("status", params.status);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  if (params.bookingRef?.trim()) {
    search.set("bookingRef", params.bookingRef.trim());
  }
  if (params.subjectId?.trim()) {
    search.set("subjectId", params.subjectId.trim());
  }
  return `?${search.toString()}`;
}

function normalizeAggregate(
  raw: Record<string, unknown> | null | undefined,
): ReviewMisAggregate | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    ratingCount: toCount(raw.ratingCount),
    averageRating: toNumber(raw.averageRating),
    rating1Count: toCount(raw.rating1Count),
    rating2Count: toCount(raw.rating2Count),
    rating3Count: toCount(raw.rating3Count),
    rating4Count: toCount(raw.rating4Count),
    rating5Count: toCount(raw.rating5Count),
    cleanlinessAverage: toNumber(raw.cleanlinessAverage),
    staffAverage: toNumber(raw.staffAverage),
    locationAverage: toNumber(raw.locationAverage),
    roomComfortAverage: toNumber(raw.roomComfortAverage),
    valueForMoneyAverage: toNumber(raw.valueForMoneyAverage),
    hotelRatingAverage: toNumber(raw.hotelRatingAverage),
    transportRatingAverage: toNumber(raw.transportRatingAverage),
    activityRatingAverage: toNumber(raw.activityRatingAverage),
    tourGuideRatingAverage: toNumber(raw.tourGuideRatingAverage),
    itineraryRatingAverage: toNumber(raw.itineraryRatingAverage),
    lastReviewAt: (raw.lastReviewAt as string | null) ?? null,
  };
}

function normalizeSummary(
  raw: Record<string, unknown> | null | undefined,
): ReviewMisSummary {
  const aggregateRaw =
    raw?.publishedAggregate && typeof raw.publishedAggregate === "object"
      ? (raw.publishedAggregate as Record<string, unknown>)
      : null;
  return {
    totalReviews: toCount(raw?.totalReviews),
    pendingCount: toCount(raw?.pendingCount),
    publishedCount: toCount(raw?.publishedCount),
    flaggedCount: toCount(raw?.flaggedCount),
    rejectedCount: toCount(raw?.rejectedCount),
    publishedAverageRating: toNumber(raw?.publishedAverageRating),
    publishedAggregate: normalizeAggregate(aggregateRaw),
  };
}

function normalizeMedia(raw: Record<string, unknown>): ReviewMisMediaItem {
  return {
    fileName: (raw.fileName as string | null) ?? null,
    contentType: (raw.contentType as string | null) ?? null,
    storageKey: (raw.storageKey as string | null) ?? null,
    fileSizeBytes: toNumber(raw.fileSizeBytes),
    displayOrder: toNumber(raw.displayOrder),
  };
}

function normalizeReply(
  raw: Record<string, unknown> | null | undefined,
): ReviewMisReply | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    replyText: (raw.replyText as string | null) ?? null,
    repliedByName: (raw.repliedByName as string | null) ?? null,
    repliedAt: (raw.repliedAt as string | null) ?? null,
  };
}

function normalizeAudit(raw: Record<string, unknown>): ReviewMisAuditEntry {
  return {
    id: (raw.id as number | string) ?? "",
    reviewId: raw.reviewId != null ? String(raw.reviewId) : null,
    action: String(raw.action ?? ""),
    reasonCode: (raw.reasonCode as string | null) ?? null,
    reason: (raw.reason as string | null) ?? null,
    moderatorUserId: toNumber(raw.moderatorUserId),
    moderatorName: (raw.moderatorName as string | null) ?? null,
    moderatorRole: (raw.moderatorRole as string | null) ?? null,
    fromStatus: (raw.fromStatus as string | null) ?? null,
    toStatus: (raw.toStatus as string | null) ?? null,
    actedAt: (raw.actedAt as string | null) ?? null,
  };
}

function normalizeItem(raw: Record<string, unknown>): ReviewMisItem {
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  const auditRaw = Array.isArray(raw.auditHistory) ? raw.auditHistory : [];
  return {
    id: String(raw.id ?? ""),
    bookingType: String(raw.bookingType ?? ""),
    bookingRef: (raw.bookingRef as string | null) ?? null,
    subjectId: raw.subjectId != null ? String(raw.subjectId) : null,
    overallRating: toNumber(raw.overallRating),
    title: (raw.title as string | null) ?? null,
    reviewText: (raw.reviewText as string | null) ?? null,
    travellerType: (raw.travellerType as string | null) ?? null,
    wouldRecommend:
      typeof raw.wouldRecommend === "boolean" ? raw.wouldRecommend : null,
    wouldReturn: (raw.wouldReturn as string | null) ?? null,
    status: String(raw.status ?? ""),
    autoModerated: !!raw.autoModerated,
    moderationReason: (raw.moderationReason as string | null) ?? null,
    publishedAt: (raw.publishedAt as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
    reply: normalizeReply(
      raw.reply && typeof raw.reply === "object"
        ? (raw.reply as Record<string, unknown>)
        : null,
    ),
    media: mediaRaw.map((item) =>
      normalizeMedia(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
    auditHistory: auditRaw.map((item) =>
      normalizeAudit(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
  };
}

function normalizeMisResponse(
  raw: Record<string, unknown>,
  fallbackPage: number,
  fallbackSize: number,
): ReviewMisResponse {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const summaryRaw =
    raw.summary && typeof raw.summary === "object"
      ? (raw.summary as Record<string, unknown>)
      : {};
  return {
    summary: normalizeSummary(summaryRaw),
    items: itemsRaw.map((item) =>
      normalizeItem(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
    totalElements: toCount(raw.totalElements ?? itemsRaw.length),
    page: toNumber(raw.page) ?? fallbackPage,
    size: toNumber(raw.size) ?? fallbackSize,
  };
}

export const reviewMisService = {
  getMis: async (params: ReviewMisParams = {}): Promise<ReviewMisResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REVIEW_MODERATION.MIS}${buildMisQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeMisResponse(
      payload && typeof payload === "object" ? payload : {},
      page,
      size,
    );
  },
};
