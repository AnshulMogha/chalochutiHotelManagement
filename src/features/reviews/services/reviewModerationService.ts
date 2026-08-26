import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import type {
  FlagQueueParams,
  ModerationReasonPayload,
  ReviewAuditEntry,
  ReviewFlagQueueResponse,
  ReviewModerationActionResult,
  ReviewQueueItem,
} from "./reviewModerationTypes";

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

function normalizeMedia(raw: Record<string, unknown>): ReviewQueueItem["media"][number] {
  return {
    fileName: (raw.fileName as string | null) ?? null,
    contentType: (raw.contentType as string | null) ?? null,
    storageKey: (raw.storageKey as string | null) ?? null,
    fileSizeBytes: toNumber(raw.fileSizeBytes),
    displayOrder: toNumber(raw.displayOrder),
    url:
      (raw.url as string | null) ??
      (raw.fileUrl as string | null) ??
      (raw.signedUrl as string | null) ??
      null,
    id: raw.id != null ? String(raw.id) : null,
    type: (raw.type as string | null) ?? null,
  };
}

function normalizeReply(
  raw: Record<string, unknown> | null | undefined,
): ReviewQueueItem["reply"] {
  if (!raw || typeof raw !== "object") return null;
  return {
    replyText: (raw.replyText as string | null) ?? null,
    repliedByName: (raw.repliedByName as string | null) ?? null,
    repliedAt: (raw.repliedAt as string | null) ?? null,
  };
}

function normalizeReviewItem(raw: Record<string, unknown>): ReviewQueueItem {
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  return {
    id: String(raw.id ?? ""),
    bookingType: String(raw.bookingType ?? ""),
    bookingRef: (raw.bookingRef as string | null) ?? null,
    customerEmail: (raw.customerEmail as string | null) ?? null,
    subjectType: raw.subjectType != null ? String(raw.subjectType) : null,
    subjectId: raw.subjectId != null ? String(raw.subjectId) : null,
    subjectName: (raw.subjectName as string | null) ?? null,
    overallRating: toNumber(raw.overallRating),
    title: (raw.title as string | null) ?? null,
    reviewText: (raw.reviewText as string | null) ?? null,
    travellerType: (raw.travellerType as string | null) ?? null,
    wouldRecommend:
      typeof raw.wouldRecommend === "boolean" ? raw.wouldRecommend : null,
    wouldReturn: raw.wouldReturn != null ? String(raw.wouldReturn) : null,
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
  };
}

function normalizeQueueResponse(raw: Record<string, unknown>): ReviewFlagQueueResponse {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const totalElements = Number(raw.totalElements ?? itemsRaw.length);
  const size = Number(raw.size ?? 20);
  return {
    items: itemsRaw.map((item) =>
      normalizeReviewItem(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
    totalElements: Number.isFinite(totalElements) ? totalElements : 0,
    page: Number(raw.page ?? 0),
    size: Number.isFinite(size) ? size : 20,
    queueStatus: (raw.queueStatus as string | null) ?? null,
  };
}

function normalizeAuditEntry(raw: Record<string, unknown>): ReviewAuditEntry {
  return {
    id: (raw.id as number | string) ?? "",
    action: String(raw.action ?? ""),
    reasonCode: (raw.reasonCode as string | null) ?? null,
    reason: (raw.reason as string | null) ?? null,
    moderatorName: (raw.moderatorName as string | null) ?? null,
    moderatorRole: (raw.moderatorRole as string | null) ?? null,
    fromStatus: (raw.fromStatus as string | null) ?? null,
    toStatus: (raw.toStatus as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
  };
}

function buildFlagQueueQuery(params: FlagQueueParams): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 20));
  if (params.bookingType) search.set("bookingType", params.bookingType);
  if (params.bookingRef?.trim()) {
    search.set("bookingRef", params.bookingRef.trim());
  }
  if (params.customerEmail?.trim()) {
    search.set("customerEmail", params.customerEmail.trim());
  }
  if (params.subjectId?.trim()) {
    search.set("subjectId", params.subjectId.trim());
  }
  if (params.rating != null && Number.isFinite(params.rating)) {
    search.set("rating", String(params.rating));
  }
  if (params.date) search.set("date", params.date);
  return `?${search.toString()}`;
}

export const reviewModerationService = {
  getFlagQueue: async (
    params: FlagQueueParams = {},
  ): Promise<ReviewFlagQueueResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REVIEW_MODERATION.FLAG_QUEUE}${buildFlagQueueQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeQueueResponse(
      payload && typeof payload === "object"
        ? payload
        : { items: [], totalElements: 0, page, size },
    );
  },

  getAuditTrail: async (reviewId: string): Promise<ReviewAuditEntry[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>[]>
    >(API_ENDPOINTS.REVIEW_MODERATION.AUDIT(reviewId));
    const payload = unwrapPayload(response);
    if (!Array.isArray(payload)) return [];
    return payload.map((entry) =>
      normalizeAuditEntry(
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {},
      ),
    );
  },

  approve: async (
    reviewId: string,
    payload: ModerationReasonPayload,
  ): Promise<ReviewModerationActionResult> => {
    const response = await apiClient.post<
      ApiSuccessResponse<ReviewModerationActionResult>
    >(API_ENDPOINTS.REVIEW_MODERATION.APPROVE(reviewId), payload);
    return unwrapPayload(response);
  },

  reject: async (
    reviewId: string,
    payload: ModerationReasonPayload,
  ): Promise<ReviewModerationActionResult> => {
    const response = await apiClient.post<
      ApiSuccessResponse<ReviewModerationActionResult>
    >(API_ENDPOINTS.REVIEW_MODERATION.REJECT(reviewId), payload);
    return unwrapPayload(response);
  },

  flag: async (
    reviewId: string,
    payload: ModerationReasonPayload,
  ): Promise<ReviewModerationActionResult> => {
    const response = await apiClient.post<
      ApiSuccessResponse<ReviewModerationActionResult>
    >(API_ENDPOINTS.REVIEW_MODERATION.FLAG(reviewId), payload);
    return unwrapPayload(response);
  },

  unflag: async (
    reviewId: string,
    payload: ModerationReasonPayload,
  ): Promise<ReviewModerationActionResult> => {
    const response = await apiClient.post<
      ApiSuccessResponse<ReviewModerationActionResult>
    >(API_ENDPOINTS.REVIEW_MODERATION.UNFLAG(reviewId), payload);
    return unwrapPayload(response);
  },

  findReviewInQueue: async (reviewId: string): Promise<ReviewQueueItem | null> => {
    let page = 0;
    const size = 50;
    while (page < 20) {
      const queue = await reviewModerationService.getFlagQueue({ page, size });
      const match = queue.items.find((item) => item.id === reviewId);
      if (match) return match;
      if ((page + 1) * size >= queue.totalElements) break;
      page += 1;
    }
    return null;
  },
};
