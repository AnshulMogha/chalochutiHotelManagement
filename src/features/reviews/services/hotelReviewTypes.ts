export interface HotelReviewMediaItem {
  fileName: string | null;
  contentType: string | null;
  storageKey: string | null;
  fileSizeBytes: number | null;
  displayOrder: number | null;
  url?: string | null;
}

export interface HotelReviewReply {
  replyText: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
}

export interface HotelReviewItem {
  id: string;
  bookingType: string | null;
  bookingRef: string | null;
  customerEmail: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectName: string | null;
  overallRating: number | null;
  title: string | null;
  reviewText: string | null;
  travellerType: string | null;
  wouldRecommend: boolean | null;
  wouldReturn: string | null;
  status: string | null;
  autoModerated: boolean | null;
  moderationReason: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  reply: HotelReviewReply | null;
  media: HotelReviewMediaItem[];
  reported?: boolean;
  canReply?: boolean;
  canReport?: boolean;
}

export interface HotelReviewListResponse {
  items: HotelReviewItem[];
  totalElements: number;
  page: number;
  size: number;
  queueStatus: string | null;
}

export interface HotelReviewListParams {
  hotelId: string;
  page?: number;
  size?: number;
  bookingRef?: string;
  customerEmail?: string;
}

export interface HotelReviewReplyPayload {
  replyText: string;
}

export interface HotelReviewReportPayload {
  reason: string;
}
