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

function normalizeReviewItem(raw: Record<string, unknown>): ReviewQueueItem {
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  return {
    id: String(raw.id ?? ""),
    bookingType: String(raw.bookingType ?? ""),
    bookingRef: (raw.bookingRef as string | null) ?? null,
    overallRating:
      raw.overallRating != null ? Number(raw.overallRating) : null,
    reviewText: (raw.reviewText as string | null) ?? null,
    travellerType: (raw.travellerType as string | null) ?? null,
    status: String(raw.status ?? ""),
    autoModerated: !!raw.autoModerated,
    moderationReason: (raw.moderationReason as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
    media: mediaRaw.map((item) => {
      const obj =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        id: obj.id != null ? String(obj.id) : null,
        url: (obj.url as string | null) ?? null,
        type: (obj.type as string | null) ?? null,
      };
    }),
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

export const reviewModerationService = {
  getFlagQueue: async (
    params: FlagQueueParams = {},
  ): Promise<ReviewFlagQueueResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(
      `${API_ENDPOINTS.REVIEW_MODERATION.FLAG_QUEUE}?page=${page}&size=${size}`,
    );
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
