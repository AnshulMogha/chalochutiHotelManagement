import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import type {
  HotelReviewItem,
  HotelReviewListParams,
  HotelReviewListResponse,
  HotelReviewMediaItem,
  HotelReviewReply,
  HotelReviewReplyPayload,
  HotelReviewReportPayload,
} from "./hotelReviewTypes";

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

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return undefined;
}

function normalizeMedia(raw: Record<string, unknown>): HotelReviewMediaItem {
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
  };
}

function normalizeReply(
  raw: Record<string, unknown> | null | undefined,
): HotelReviewReply | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    replyText: (raw.replyText as string | null) ?? null,
    repliedByName: (raw.repliedByName as string | null) ?? null,
    repliedAt: (raw.repliedAt as string | null) ?? null,
  };
}

function normalizeItem(raw: Record<string, unknown>): HotelReviewItem {
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  const reply =
    raw.reply && typeof raw.reply === "object"
      ? normalizeReply(raw.reply as Record<string, unknown>)
      : null;
  const hasReply = Boolean(reply?.replyText);
  return {
    id: String(raw.id ?? ""),
    bookingType: raw.bookingType != null ? String(raw.bookingType) : null,
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
    status: raw.status != null ? String(raw.status) : null,
    autoModerated:
      typeof raw.autoModerated === "boolean" ? raw.autoModerated : null,
    moderationReason: (raw.moderationReason as string | null) ?? null,
    publishedAt: (raw.publishedAt as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
    reply,
    media: mediaRaw.map((item) =>
      normalizeMedia(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
    reported: typeof raw.reported === "boolean" ? raw.reported : undefined,
    canReply: (() => {
      const parsed = toBoolean(
        raw.canReply ?? raw.ownerCanReply ?? raw.canOwnerReply,
      );
      if (parsed !== undefined) return parsed;
      return !hasReply;
    })(),
    canReport: (() => {
      const parsed = toBoolean(raw.canReport ?? raw.canOwnerReport);
      if (parsed !== undefined) return parsed;
      return true;
    })(),
  };
}

function normalizeListResponse(
  raw: Record<string, unknown>,
  fallbackPage: number,
  fallbackSize: number,
): HotelReviewListResponse {
  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.content)
      ? raw.content
      : Array.isArray(raw)
        ? raw
        : [];
  return {
    items: itemsRaw.map((item) =>
      normalizeItem(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
    totalElements: toNumber(raw.totalElements ?? itemsRaw.length) ?? 0,
    page: toNumber(raw.page ?? raw.number) ?? fallbackPage,
    size: toNumber(raw.size) ?? fallbackSize,
    queueStatus: raw.queueStatus != null ? String(raw.queueStatus) : null,
  };
}

export const hotelReviewService = {
  list: async (
    params: HotelReviewListParams,
  ): Promise<HotelReviewListResponse> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const bookingRef = params.bookingRef?.trim();
    const customerEmail = params.customerEmail?.trim();
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(API_ENDPOINTS.HOTEL_REVIEWS.LIST, {
      params: {
        hotelId: params.hotelId,
        page,
        size,
        ...(bookingRef ? { bookingRef } : {}),
        ...(customerEmail ? { customerEmail } : {}),
      },
    });
    const payload = unwrapPayload(response);
    return normalizeListResponse(
      payload && typeof payload === "object" ? payload : {},
      page,
      size,
    );
  },

  reply: async (
    reviewId: string,
    hotelId: string,
    payload: HotelReviewReplyPayload,
  ): Promise<HotelReviewItem> => {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>>
    >(
      API_ENDPOINTS.HOTEL_REVIEWS.REPLY(reviewId),
      { replyText: payload.replyText.trim() },
      { params: { hotelId } },
    );
    const raw = unwrapPayload(response);
    return normalizeItem(
      raw && typeof raw === "object" ? raw : {},
    );
  },

  report: async (
    reviewId: string,
    hotelId: string,
    payload: HotelReviewReportPayload,
  ): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.HOTEL_REVIEWS.REPORT(reviewId),
      { reason: payload.reason.trim() },
      { params: { hotelId } },
    );
  },
};
