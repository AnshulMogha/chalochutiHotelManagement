// App-wide constants
export const APP_NAME = "Hotel Onboard";

export const ROUTES = {
  PROPERTIES: {
    LIST: "/",
    DETAIL: (id: string) => `/properties/${id}`,
    CREATE: "/properties/hotel/basic_info",
    EDIT: (id: string) => `/properties/hotel/basic_info?draftId=${id}`,
  },
  // Keep HOTELS for backward compatibility with API endpoints
  HOTELS: {
    LIST: "/",
    DETAIL: (id: string) => `/hotels/${id}`,
    CREATE: "/hotels/create",
    EDIT: (id: string) => `/hotels/${id}/edit`,
  },
  ADMIN: {
    HOTEL_REVIEW: "/admin/hotels/review",
    HOTEL_REVIEW_DETAIL: (hotelId: string) => `/admin/hotels/review/${hotelId}`,
    USERS: "/admin/users",
    USER_DETAIL: (userId: string | number) => `/admin/users/${userId}`,
    COMMISSION_AND_TAX: "/admin/commission-tax",
    DOCUMENT_REVIEW: "/admin/document-review",
  },
  PROPERTY_INFO: {
    LIST: "/property/information",
    BASIC_INFO: "/property/information/basic-info",
    ROOMS_RATEPLANS: "/property/information/rooms-rateplans",
    PHOTOS_VIDEOS: "/property/information/photos-videos",
    AMENITIES_RESTAURANTS: "/property/information/amenities-restaurants",
    POLICY_RULES: "/property/information/policy-rules",
    FINANCE: "/property/information/finance",
    DOCUMENT: "/property/information/document",
  },
  ROOM_INVENTORY: {
    LIST: "/inventory/room-types",
  },
  RATE_INVENTORY: {
    LIST: "/inventory/rate-plans",
  },
  BOOKINGS: {
    LIST: "/bookings",
    DETAIL: (id: string) => `/bookings/${id}`,
  },
  RATINGS_REVIEWS: {
    LIST: "/ratings-reviews",
  },
  ANALYTICS: {
    DASHBOARD: "/analytics",
  },
  MORE: {
    LIST: "/more",
  },
  TEAM: {
    LIST: "/team",
  },
  PROMOTIONS: {
    LIST: "/promotions",
    CREATE: "/promotions/create",
    MY_PROMOTIONS: "/promotions/my-promotions",
  },
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    GET_ACCESS_TOKEN: "/auth/refreshToken",
    LOGIN_WITH_EMAIL: "/auth/login/email",
    VERIFY_OTP: "auth/login/email/verify-otp",
    RESEND_OTP: "/auth/login/otp/resend",
    VERIFY_OTP_ADMIN: "/auth/verify-otp",
    RESEND_OTP_ADMIN: "/auth/resend-otp",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    SUPER_ADMIN_LOGIN: "/auth/login",
  },
  ADMIN: {
    GET_HOTELS_FOR_REVIEW: "/admin/hotels/review",
    GET_APPROVED_HOTELS: "/admin/hotels/review/approved",
    GET_REJECTED_HOTELS: "/admin/hotels/review/rejected",
    APPROVE_HOTEL: (hotelId: string) => `/admin/hotels/${hotelId}/approve`,
    REJECT_HOTEL: (hotelId: string) => `/admin/hotels/${hotelId}/reject`,
    GET_HOTEL_BASIC_INFO: (hotelId: string) =>
      `/admin/hotel/${hotelId}/basic-info`,
    UPDATE_HOTEL_PROFILE: (hotelId: string) =>
      `/admin/hotel/${hotelId}/profile`,
    UPDATE_HOTEL_STATUS: (hotelId: string) => `/admin/hotel/${hotelId}/status`,
    GET_HOTEL_CONTACT: (hotelId: string) => `/admin/hotel/${hotelId}/contact`,
    UPDATE_HOTEL_CONTACT: (hotelId: string) =>
      `/admin/hotel/${hotelId}/contact`,
    GET_HOTEL_LOCATION: (hotelId: string) => `/admin/hotel/${hotelId}/location`,
    UPDATE_HOTEL_LOCATION: (hotelId: string) =>
      `/admin/hotel/${hotelId}/location`,
    GET_HOTEL_ADDRESS: (hotelId: string) => `/admin/hotel/${hotelId}/address`,
    UPDATE_HOTEL_ADDRESS: (hotelId: string) =>
      `/admin/hotel/${hotelId}/address`,
    GET_USERS: "/admin/users",
    GET_USER_BY_ID: (userId: string | number) => `/admin/users/${userId}`,
    CREATE_USER: "/admin/users",
    UPDATE_USER: (userId: string | number) => `/admin/users/${userId}`,
    // Commission APIs
    CREATE_COMMISSION: "/admin/commission",
    GET_COMMISSIONS: "/admin/commission/list",
    GET_ACTIVE_COMMISSIONS: "/admin/commission/active",
    GET_COMMISSION_BY_ID: (id: string | number) => `/admin/commission/${id}`,
    // Tax APIs
    CREATE_TAX: "/admin/tax",
    GET_TAXES: "/admin/tax/list",
    GET_ACTIVE_TAXES: "/admin/tax/active",
    GET_TAX_BY_ID: (id: string | number) => `/admin/tax/${id}`,
    // Document Review APIs
    GET_PENDING_DOCUMENTS: "/admin/hotel/finance/documents/pending",
    GET_HOTEL_DOCUMENTS: (hotelId: string) => `/admin/hotel/finance/${hotelId}/documents`,
    APPROVE_DOCUMENT: (docId: string | number) => `/admin/hotel/finance/documents/${docId}/approve`,
    REJECT_DOCUMENT: (docId: string | number) => `/admin/hotel/finance/documents/${docId}/reject`,
  },
  PRICING: {
    GET_QUOTE: "/pricing/quote",
  },
  HOTELS: {
    MEDIA_ONBOARDING: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/media`,
    DEATTACH_MEDIA: (mediaId: number, entityType: string, entityId: string) =>
      `/media/${mediaId}/detach?entityType=${entityType}&entityId=${entityId}`,
    ASSIGN_MEDIA: (mediaId: number) => `/media/${mediaId}/attach`,
    GET_MEDIA: (entityId: string) => `/media/${entityId}`,
    UPLOAD_MEDIA: "/media/upload",
    ASSIGN_MEDIA_TAG: (mediaId: string) => `/media/${mediaId}/tags`,
    GET_ALL_HOTELS: "/onboarding/hotels",
    GET_LOCATION_DETAILS: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/location`,
    GET_ROOM_DETAILS: (hotelId: string, roomKey: string) =>
      `/onboarding/hotels/${hotelId}/rooms/${roomKey}`,
    GENERATE_DRAFT_HOTEL: "/onboarding/hotels/draft",
    GET_ALL_BASIC_INFO: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/basic-info`,
    GET_ONBOARDING_STATUS: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/onboarding-status`,
    SUBMIT_BASIC_INFO: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/basic-info`,
    SUBMIT_LOCATION_INFO: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/location`,
    GET_AVAILABLE_HOTEL_AMENITIES: "/masters/amenities?appliesTo=HOTEL",
    GET_SELECTED_HOTEL_AMENITIES: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/amenities`,
    SUBMIT_AMENITIES_INFO: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/amenities`,
    SUBMIT_ROOM_DETAILS: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/rooms`,
    GET_AVAILABLE_ROOM_AMENITIES: "/masters/amenities?appliesTo=ROOM",
    SUBMIT_POLICIES: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/policies`,
    SUBMIT_FINANCE_AND_LEGAL: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/finance`,
    GET_FINANCE_AND_LEGAL: (hotelId: string) =>
      `/onboarding/hotels/${hotelId}/finance`,
    GET_ALL_ROOMS: (hotelId: string) => `onboarding/hotels/${hotelId}/rooms`,
  },

  USER: {
    GET_USER: "/users/me/profile",
  },
  HOTEL_ADMIN: {
    GET_HOTEL_BASIC_INFO: (hotelId: string) => `/hotel/${hotelId}/basic-info`,
    UPDATE_HOTEL_PROFILE: (hotelId: string) => `/hotel/${hotelId}/profile`,
    GET_HOTEL_CONTACT: (hotelId: string) => `/hotel/${hotelId}/contact`,
    UPDATE_HOTEL_CONTACT: (hotelId: string) => `/hotel/${hotelId}/contact`,
    GET_HOTEL_LOCATION: (hotelId: string) => `/hotel/${hotelId}/location`,
    GET_HOTEL_ADDRESS: (hotelId: string) => `/hotel/${hotelId}/address`,
    GET_HOTEL_ROOMS: (hotelId: string) => `/hotel/${hotelId}/rooms`,
    CREATE_OR_UPDATE_ROOM: (hotelId: string) => `/hotel/${hotelId}/rooms`,
    GET_ROOM_DETAILS: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}`,
    UPDATE_ROOM_ACTIVE_STATUS: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/active-status`,
    GET_ROOM_RATE_PLANS: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans`,
    GET_RATE_PLAN_EDIT: (hotelId: string, roomId: string, ratePlanId: number) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans/${ratePlanId}/edit`,
    CREATE_RATE_PLAN: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans`,
    UPDATE_RATE_PLAN: (hotelId: string, roomId: string, ratePlanId: number) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans/${ratePlanId}`,
    UPDATE_RATE_PLAN_ACTIVE_STATUS: (hotelId: string, roomId: string, ratePlanId: number) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans/${ratePlanId}/active-status`,
    GET_HOTEL_MEDIA: (hotelId: string) => `/hotel/${hotelId}/media`,
    GET_ROOM_MEDIA: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/media`,
    UPLOAD_HOTEL_MEDIA: (hotelId: string) => `/hotel/${hotelId}/media/upload`,
    ASSIGN_MEDIA_TAG: (hotelId: string, imageId: number) => `/hotel/${hotelId}/media/${imageId}/tag`,
    ASSIGN_MEDIA_TO_ROOM: (hotelId: string, imageId: number) => `/hotel/${hotelId}/media/${imageId}/assign-room`,
    ASSIGN_MEDIA_TO_HOTEL: (hotelId: string, imageId: number) => `/hotel/${hotelId}/media/${imageId}/assign-hotel`,
    DETACH_MEDIA: (hotelId: string, imageId: number) => `/hotel/${hotelId}/media/${imageId}/detach`,
    REORDER_MEDIA: (hotelId: string) => `/hotel/${hotelId}/media/reorder`,
    SET_MEDIA_COVER: (hotelId: string, mediaId: number) => `/hotel/${hotelId}/media/${mediaId}/cover`,
    GET_HOTEL_FINANCE: (hotelId: string) => `/hotel/${hotelId}/finance`,
    UPDATE_HOTEL_FINANCE: (hotelId: string) => `/hotel/${hotelId}/finance`,
    GET_HOTEL_AMENITIES: (hotelId: string) => `/hotel/${hotelId}/amenities`,
    UPDATE_HOTEL_AMENITIES: (hotelId: string) => `/hotel/${hotelId}/amenities`,
    GET_ROOM_AMENITIES: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/amenities`,
    UPDATE_ROOM_AMENITIES: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/amenities`,
    HOTEL_POLICIES: (hotelId: string) => `/hotel/${hotelId}/policies`,
    CANCELLATION_POLICIES: (hotelId: string) => `/hotel/${hotelId}/cancellation-policies`,
    CANCELLATION_POLICY_DETAIL: (hotelId: string, policyId: number | string) =>
      `/hotel/${hotelId}/cancellation-policies/${policyId}`,
    CHILD_AGE_POLICY: (hotelId: string) => `/hotel/${hotelId}/child-age-policy`,
    PAYMENT_RULES: (hotelId: string) => `/hotel/${hotelId}/payment-rules`,
    CREATE_PROMOTION: (hotelId: string) => `/hotel/${hotelId}/promotions`,
    GET_PROMOTIONS: (hotelId: string) => `/hotel/${hotelId}/promotions`,
    GET_PROMOTION_EDIT: (hotelId: string, promotionId: string) => `/hotel/${hotelId}/promotions/${promotionId}/edit`,
    UPDATE_PROMOTION_STATUS: (hotelId: string, promotionId: string) => `/hotel/${hotelId}/promotions/${promotionId}/status`,
    GET_DOCUMENTS: (hotelId: string) => `/hotel/${hotelId}/documents`,
    UPLOAD_DOCUMENT: (hotelId: string) => `/hotel/${hotelId}/document/upload`,
    GET_TEAM_MEMBERS: (hotelId: string) => `/hotel/${hotelId}/users`,
    CREATE_TEAM_MEMBER: (hotelId: string) => `/hotel/${hotelId}/users`,
    ASSIGN_HOTEL_TO_USER: (hotelId: string, userId: string | number) => `/hotel/${hotelId}/users/${userId}`,
    ASSIGN_PERMISSIONS: (accessId: string | number) => `/hotel-access/${accessId}/permissions`,
    REVOKE_ACCESS: (accessId: string | number) => `/hotel-access/${accessId}`,
  },
  INVENTORY: {
    GET_CALENDAR: (hotelId: string, fromDate: string, toDate: string) =>
      `/hotel/inventory/${hotelId}/calendar?from=${fromDate}&to=${toDate}`,
    UPDATE_SINGLE: "/hotel/inventory/single",
    UPDATE_BULK: "/hotel/inventory/bulk",
    UPDATE_BULK_RESTRICTIONS: (hotelId: string) =>
      `/hotel/inventory/${hotelId}/restrictions/bulk`,
  },
  RATES: {
    GET_CALENDAR: (hotelId: string, fromDate: string, toDate: string, customerType: string = "RETAIL") =>
      `/hotel/${hotelId}/rates/calendar?from=${fromDate}&to=${toDate}&customerType=${customerType}`,
    UPDATE_SINGLE: "/hotel/rates/single",
    UPDATE_BULK: "/hotel/rates/bulk",
  },
} as const;

// Export role and status constants
export * from "./roles";
export * from "./status";
