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
  },
  PROPERTY_INFO: {
    LIST: "/property/information",
    BASIC_INFO: "/property/information/basic-info",
    ROOMS_RATEPLANS: "/property/information/rooms-rateplans",
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
    UPDATE_ROOM_ACTIVE_STATUS: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/active-status`,
    GET_ROOM_RATE_PLANS: (hotelId: string, roomId: string) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans`,
    UPDATE_RATE_PLAN_ACTIVE_STATUS: (hotelId: string, roomId: string, ratePlanId: number) => `/hotel/${hotelId}/rooms/${roomId}/rate-plans/${ratePlanId}/active-status`,
  },
  INVENTORY: {
    GET_CALENDAR: (hotelId: string, fromDate: string, toDate: string) =>
      `/hotel/inventory/${hotelId}/calendar?from=${fromDate}&to=${toDate}`,
    UPDATE_SINGLE: "/hotel/inventory/single",
    UPDATE_BULK: "/hotel/inventory/bulk",
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
