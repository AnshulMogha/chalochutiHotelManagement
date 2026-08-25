import type {
  ModerationAction,
  ReviewBookingType,
  ReviewStatus,
  TravellerType,
} from "./reviewModerationTypes";

export interface ReviewMisAggregate {
  ratingCount: number;
  averageRating: number | null;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  cleanlinessAverage: number | null;
  staffAverage: number | null;
  locationAverage: number | null;
  roomComfortAverage: number | null;
  valueForMoneyAverage: number | null;
  hotelRatingAverage: number | null;
  transportRatingAverage: number | null;
  activityRatingAverage: number | null;
  tourGuideRatingAverage: number | null;
  itineraryRatingAverage: number | null;
  lastReviewAt: string | null;
}

export interface ReviewMisSummary {
  totalReviews: number;
  pendingCount: number;
  publishedCount: number;
  flaggedCount: number;
  rejectedCount: number;
  publishedAverageRating: number | null;
  publishedAggregate: ReviewMisAggregate | null;
}

export interface ReviewMisMediaItem {
  fileName: string | null;
  contentType: string | null;
  storageKey: string | null;
  fileSizeBytes: number | null;
  displayOrder: number | null;
  /** Absolute or signed URL when API provides one */
  url?: string | null;
}

export interface ReviewMisReply {
  replyText: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
}

export interface ReviewMisAuditEntry {
  id: number | string;
  reviewId: string | null;
  action: ModerationAction | string;
  reasonCode: string | null;
  reason: string | null;
  moderatorUserId: number | null;
  moderatorName: string | null;
  moderatorRole: string | null;
  fromStatus: ReviewStatus | string | null;
  toStatus: ReviewStatus | string | null;
  actedAt: string | null;
}

export interface ReviewMisItem {
  id: string;
  bookingType: ReviewBookingType | string;
  bookingRef: string | null;
  subjectId: string | null;
  subjectType: string | null;
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
  reply: ReviewMisReply | null;
  media: ReviewMisMediaItem[];
  auditHistory: ReviewMisAuditEntry[];
}

export interface ReviewMisResponse {
  summary: ReviewMisSummary;
  items: ReviewMisItem[];
  totalElements: number;
  page: number;
  size: number;
}

export interface ReviewMisParams {
  page?: number;
  size?: number;
  bookingType?: ReviewBookingType | string;
  status?: ReviewStatus | string;
  fromDate?: string;
  toDate?: string;
  bookingRef?: string;
  subjectId?: string;
}
