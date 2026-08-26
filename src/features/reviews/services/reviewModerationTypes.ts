export const REVIEW_STATUSES = [
  "REVIEW_PENDING",
  "REVIEW_PUBLISHED",
  "REVIEW_FLAGGED",
  "REVIEW_REJECTED",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MODERATION_ACTIONS = [
  "AUTO_APPROVE",
  "AUTO_FLAG",
  "APPROVE",
  "REJECT",
  "FLAG",
  "UNFLAG",
  "HOTEL_REPORT",
] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const BOOKING_TYPES = ["HOTEL", "PACKAGE"] as const;
export type ReviewBookingType = (typeof BOOKING_TYPES)[number];

export const TRAVELLER_TYPES = [
  "SOLO",
  "COUPLE",
  "FAMILY",
  "BUSINESS",
  "FRIENDS_GROUP",
] as const;

export type TravellerType = (typeof TRAVELLER_TYPES)[number];

export interface ReviewMediaItem {
  fileName: string | null;
  contentType: string | null;
  storageKey: string | null;
  fileSizeBytes: number | null;
  displayOrder: number | null;
  url?: string | null;
  id?: string | null;
  type?: string | null;
}

export interface ReviewReply {
  replyText: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
}

export interface ReviewQueueItem {
  id: string;
  bookingType: ReviewBookingType | string;
  bookingRef: string | null;
  customerEmail: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectName: string | null;
  overallRating: number | null;
  title: string | null;
  reviewText: string | null;
  travellerType: TravellerType | string | null;
  wouldRecommend: boolean | null;
  wouldReturn: string | null;
  status: ReviewStatus | string;
  autoModerated: boolean;
  moderationReason: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  reply: ReviewReply | null;
  media: ReviewMediaItem[];
}

export interface ReviewFlagQueueResponse {
  items: ReviewQueueItem[];
  totalElements: number;
  page: number;
  size: number;
  queueStatus: ReviewStatus | string | null;
}

export interface ReviewAuditEntry {
  id: number | string;
  action: ModerationAction | string;
  reasonCode?: string | null;
  reason?: string | null;
  moderatorName?: string | null;
  moderatorRole?: string | null;
  fromStatus?: ReviewStatus | string | null;
  toStatus?: ReviewStatus | string | null;
  createdAt?: string | null;
}

export interface ReviewModerationActionResult {
  status: ReviewStatus | string;
  publishedAt?: string | null;
}

export interface FlagQueueParams {
  page?: number;
  size?: number;
  bookingType?: ReviewBookingType | string;
  bookingRef?: string;
  customerEmail?: string;
  subjectId?: string;
  rating?: number;
  date?: string;
}

export interface ModerationReasonPayload {
  reason: string;
}
