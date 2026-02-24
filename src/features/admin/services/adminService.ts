import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types";

export interface HotelReviewItem {
  hotelId: string;
  hotelCode: string;
  hotelName: string;
  submittedAt: string;
  requestedBy: string;
}

export interface ApprovedHotelItem {
  hotelId: string;
  hotelCode: string;
  hotelName: string;
  submittedAt: string;
  requestedBy: string;
}

export interface RejectedHotelItem {
  hotelId: string;
  hotelCode: string;
  hotelName: string;
  submittedAt: string;
  requestedBy: string;
}

export interface ApproveHotelRequest {
  remarks: string;
}

export interface RejectHotelRequest {
  remarks: string;
}

/** Travel agent onboarding (travel partner) – list item from GET /travel-agent/onboarding */
export type TravelAgentOnboardingStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TravelAgentOnboardingListItem {
  id: number;
  fullName: string;
  email: string;
  agencyName: string;
  status: TravelAgentOnboardingStatus;
  createdAt: string;
}

export interface TravelAgentOnboardingListResponse {
  content: TravelAgentOnboardingListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TravelAgentOnboardingListParams {
  page?: number;
  size?: number;
  status?: TravelAgentOnboardingStatus;
}

/** Full item from GET /travel-agent/onboarding/:id – pure API response, no wrapper */
export interface TravelAgentOnboardingItem {
  id: number;
  title: string;
  fullName: string;
  email: string;
  agencyName: string;
  panNumber: string;
  panCardDocumentUrl: string;
  gstNumber: string;
  businessAddress: string;
  city: string;
  state: string;
  pinCode: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  termsAccepted: boolean;
  status: TravelAgentOnboardingStatus;
  rejectionRemarks: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveTravelAgentOnboardingRequest {
  remarks: string;
}

export interface RejectTravelAgentOnboardingRequest {
  remarks: string;
}

export interface User {
  userId: number;
  email: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  authProvider: "LOCAL" | "GOOGLE" | "FACEBOOK";
  twoFactorEnabled: boolean;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  lastLoginTime: string | null;
  firstLoginRequired: boolean;
}

export interface UsersResponse {
  content: User[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateUserRequest {
  email: string;
  role: "HOTEL_OWNER" | "HOTEL_MANAGER" | "SUPER_ADMIN" | "PLATFORM_ADMIN" | "ONBOARDING_REVIEWER";
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UpdateUserRequest {
  email: string;
  role: "HOTEL_OWNER" | "HOTEL_MANAGER" | "SUPER_ADMIN" | "PLATFORM_ADMIN" | "ONBOARDING_REVIEWER";
  firstName: string;
  lastName: string;
  phoneNumber: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface HotelBasicInfoResponse {
  hotelId: string;
  hotelCode: string;
  name: string;
  displayName: string;
  description: string | null;
  starRating: number;
  propertyType: string;
  yearOfConstruction: string;
  currency: string;
  status: string;
  statusReason: string | null;
  statusChangedAt: string | null;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHotelProfileRequest {
  name: string;
  displayName: string;
  propertyType: string;
  starRating: number;
  yearOfConstruction: number;
  currency: string;
}

export interface UpdateHotelStatusRequest {
  status: string;
  reason: string;
}

export interface HotelContactResponse {
  hotelId: string;
  hotelPhone: string;
  hotelMobile: string;
  hotelEmail: string;
  phoneList: string;
  websiteList: string;
  emailList: string;
  customerCareNumber: string;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHotelContactRequest {
  hotelPhone: string;
  hotelMobile: string;
  hotelEmail: string;
  phoneList: string;
  websiteList: string;
  emailList: string;
  customerCareNumber: string;
}

export interface HotelLocationResponse {
  hotelId: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateHotelLocationRequest {
  country: string;
  state: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface HotelAddressResponse {
  hotelId: string;
  houseBuildingApartmentNo: string;
  localityAreaStreetSector: string;
  landmark: string;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateHotelAddressRequest {
  houseBuildingApartmentNo: string;
  localityAreaStreetSector: string;
  landmark: string;
}

export interface CancellationPolicyPayload {
  policyName: string;
  freeCancellationTillHours: number;
  noShowPenalty: string;
}

export interface CancellationPolicySlab {
  id: number;
  fromHours: number;
  toHours: number;
  refundPercent: number;
  penaltyAmount: number | null;
  penaltyType: string | null;
  active: boolean;
}

export interface CancellationPolicy {
  id: number;
  hotelId: string;
  policyName: string;
  version: number;
  isLatest: boolean;
  status: string;
  slabs: CancellationPolicySlab[];
  createdBy: number;
  createdByEmail: string;
  createdAt: string;
}

export interface CancellationPolicyListResponse {
  total: number;
  policies: CancellationPolicy[];
}

export interface ChildAgePolicyPayload {
  childrenAllowed: boolean;
  freeStayMaxAge: number;
  paidStayMaxAge: number;
}

export interface ChildAgePolicyResponse extends ChildAgePolicyPayload {
  hotelId: string;
  createdBy?: number;
  createdByEmail?: string;
  updatedBy?: number;
  updatedByEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRulePayload {
  paymentType: "FULL_PREPAID" | "PARTIAL_PREPAID" | "PAY_AT_HOTEL";
  status: "ACTIVE" | "INACTIVE";
  advancePercent: number;
  refundable: boolean;
  refundBeforeHours: number | null;
  allowedModes: string[];
  effectiveFrom: string;
  effectiveTo: string;
}

export interface PaymentRule extends PaymentRulePayload {
  id: number;
  hotelId: string;
  createdBy?: number;
  createdByEmail?: string;
  updatedBy?: number;
  updatedByEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRuleListResponse {
  total: number;
  paymentRules: PaymentRule[];
}

export interface CreatePromotionPayload {
  promotionType: "BASIC" | "LAST_MINUTE" | "EARLY_BIRD" | "LONG_STAY";
  offerType: "PERCENTAGE" | "FIXED";
  discountAllUsers: number;
  discountLoggedUsers: number;
  extraLoggedDiscount?: number;
  applicableDateType: "BOOKING_AND_STAY" | "BOOKING_ONLY" | "STAY_ONLY" | "STAY";
  stayStartDate?: string;
  stayEndDate?: string;
  bookingStartDate?: string;
  bookingEndDate?: string;
  noEndDateStay?: boolean;
  noEndDateBooking?: boolean;
  blackoutEnabled?: boolean;
  blackoutDates?: string[];
  nonRefundable?: boolean;
  payAtHotel?: boolean;
  applyAllRooms?: boolean;
  applyAllRateplans?: boolean;
  applyChannel?: string;
  contractsJson?: string[];
  promotionName: string;
  // Last Minute specific
  bookablePeriod?: "SAME_DAY" | "ONE_DAY" | "TWO_DAYS";
  // Early Bird specific
  advanceDays?: number;
  // Long Stay specific
  offerFreeNights?: boolean;
  freeNightsCount?: number;
  minimumStayDays?: number;
  roomIds?: string[];
  rateplanIds?: string[];
  audienceType?: string;
}

export interface PromotionListItem {
  id: string;
  promotionName: string;
  promotionType: string;
  status: string;
  offerType: string;
  discountAllUsers: number;
  extraLoggedDiscount: number;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  stayStartDate: string | null;
  stayEndDate: string | null;
  noEndDate: boolean | null;
  expiringLabel: string | null;
  roomNights: number | null;
  revenue: number | null;
  lastModified: string;
}

export interface PromotionListResponse {
  data: PromotionListItem[];
}

export interface DropdownOption {
  code: string;
  label: string;
}

export interface PromotionDetail {
  id: string;
  hotelId: string;
  promotionType: string;
  offerType: string;
  discountAllUsers: number;
  discountLoggedUsers: number;
  extraLoggedDiscount: number;
  applicableDateType: string;
  stayStartDate: string | null;
  stayEndDate: string | null;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  noEndDateStay: boolean;
  noEndDateBooking: boolean;
  blackoutEnabled: boolean;
  nonRefundable: boolean;
  payAtHotel: boolean;
  applyAllRooms: boolean;
  applyAllRateplans: boolean;
  applyChannel: string;
  contractsJson: string[];
  promotionName: string;
  status: string;
  maxDaysBeforeCheckin: number | null;
  minDaysBeforeCheckin: number | null;
  offerMode: string | null;
  freeNights: number | null;
  minStayNights: number | null;
  audienceType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionEditResponse {
  data: {
    promotion: PromotionDetail;
    roomIds: string[];
    rateplanIds: string[];
    blackoutDates: string[];
    promotionTypes: DropdownOption[];
    offerTypes: DropdownOption[];
    applicableDateTypes: DropdownOption[];
    channelTypes: DropdownOption[];
    offerModes: DropdownOption[];
    audienceTypes: DropdownOption[];
    promotionStatuses: DropdownOption[];
  };
}

export interface UpdatePromotionStatusPayload {
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
}

export interface UpdatePromotionPayload extends CreatePromotionPayload {
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";
}

export interface HotelPolicyRule {
  category: string;
  ruleCode: string;
  value: string | number | boolean | string[];
  active: boolean;
}

export interface HotelPolicyRecord {
  policyId: number;
  hotelId: string;
  version: number;
  isLatest: boolean;
  draft: boolean;
  status: string;
  policies: Record<string, HotelPolicyRule[]>;
  createdBy: string;
  createdByEmail: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelPoliciesResponse {
  total: number;
  policies: HotelPolicyRecord[];
}

export interface UpdateHotelPoliciesRequest {
  draft: boolean;
  rules: HotelPolicyRule[];
}

// Hotel Admin specific interfaces
export interface UpdateHotelAdminProfileRequest {
  description: string;
}

export interface UpdateHotelAdminContactRequest {
  hotelPhone: string;
  hotelMobile: string;
  hotelEmail: string;
  phoneList: string;
  websiteList: string;
  emailList: string;
  customerCareNumber: string;
}

export interface HotelRoom {
  roomId: string;
  roomKey?: string;
  roomName: string;
  description: string;
  active: boolean;
  ratePlans: string[];
}

export interface HotelRoomsResponse {
  totalRooms: number;
  rooms: HotelRoom[];
}

export interface UpdateRoomActiveStatusRequest {
  active: boolean;
}

export interface UpdateRatePlanActiveStatusRequest {
  active: boolean;
}

export interface CreateRatePlanRequest {
  ratePlanName: string;
  mealPlan: string;
  active: boolean;
}

export interface MealPlanOption {
  code: string;
  label: string;
}

export interface RatePlanEditResponse {
  ratePlan: {
    id: number;
    name: string;
    mealPlan: string;
    active: boolean;
    cancellationPolicyId?: number | null;
  };
  mealPlans: MealPlanOption[];
}

export interface UpdateRatePlanRequest {
  ratePlanName: string;
  mealPlan: string;
  cancellationPolicyId: number | null;
}

export interface RatePlan {
  ratePlanId: number;
  ratePlanName: string;
  mealPlan: string;
  paymentMode: string | null;
  active: boolean;
}

export interface RoomRatePlansResponse {
  roomName: string;
  total: number;
  ratePlans: RatePlan[];
}

export interface HotelRoomDetailsRequest {
  roomKey?: string;
  draft: boolean;
  roomDetails: {
    roomName: string;
    roomType: string;
    roomView: string;
    roomSize: number;
    roomSizeUnit: "SQFT" | "SQM";
    totalRooms: number;
    numberOfBathrooms: number;
    description: string;
  };
  occupancy: {
    baseAdults: number;
    maxAdults: number;
    baseChildren: number;
    maxChildren: number;
    maxOccupancy: number;
    extraBedAllowed: boolean;
    alternateArrangement: boolean;
  };
  beds: {
    bedType: string;
    numberOfBeds: number;
    standard: boolean;
  }[];
  amenities: {
    amenityCode: string;
    categoryCode?: string;
  }[];
}

export interface HotelRoomDetailsResponse {
  roomKey: string;
  draft: boolean;
  roomDetails: {
    roomName: string;
    roomType: string;
    roomView: string;
    roomSize: number;
    roomSizeUnit: "SQFT" | "SQM";
    totalRooms: number;
    description: string;
    numberOfBathrooms: number;
  };
  occupancy: {
    baseAdults: number;
    maxAdults: number;
    baseChildren: number;
    maxChildren: number;
    maxOccupancy: number;
    extraBedAllowed: boolean;
    alternateArrangement: boolean;
  };
  beds: {
    bedType: string;
    numberOfBeds: number;
    standard: boolean;
  }[];
  amenities: {
    amenityCode: string;
    categoryCode?: string;
  }[];
}

export interface HotelMediaItem {
  imageId: number;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  sortOrder: number;
  roomId: string | null;
  roomKey: string | null;
  roomName: string | null;
  cover: boolean;
}

export interface AssignMediaTagRequest {
  category: string;
}

export interface AssignMediaToRoomRequest {
  roomKey: string;
}

export interface ReorderMediaRequest {
  imageId: number;
  sortOrder: number;
}

export type DocumentType = 
  | "GST_CERTIFICATE"
  | "PAN_CARD"
  | "CANCELLED_CHEQUE"
  | "BANK_STATEMENT"
  | "AGREEMENT"
  | "OTHER";

export interface Document {
  id: number;
  hotelId?: string;
  docType: DocumentType;
  fileUrl?: string;
  documentUrl?: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  remarks: string | null;
  uploadedAt: string;
  verifiedAt: string | null;
  uploadedBy?: number;
  verifiedBy?: number | null;
}

export interface FinanceData {
  gstin: string;
  pan: string;
  businessName: string;
  businessAddress: string;
  bankAccountNumber: string;
  bankName: string;
  bankIfsc: string;
  bankBranch: string;
}

export interface FinanceItem {
  financeId: number;
  hotelId: string;
  version: number;
  isLatest: boolean;
  gstin: string | null;
  pan: string | null;
  businessName: string | null;
  businessAddress: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceResponse {
  total: number;
  finances: FinanceItem[];
}

export interface HotelAmenityItem {
  amenityCode: string;
  createdBy: number;
  createdByEmail: string;
  updatedBy: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmenitiesResponse {
  total: number;
  amenities: HotelAmenityItem[];
}

export interface UpdateAmenitiesRequest {
  amenityCodes: string[];
}

export interface FoodServicesResponse {
  restaurantAvailable: boolean;
  inRoomDining: boolean;
  nonVegAllowed: boolean;
  outsideFoodAllowed: boolean;
  foodDeliveryAvailable: boolean;
  alcoholAllowed: boolean;
}

export const adminService = {
  getHotelsForReview: async (): Promise<HotelReviewItem[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelReviewItem[]>
    >(API_ENDPOINTS.ADMIN.GET_HOTELS_FOR_REVIEW);
    return response.data;
  },
  getApprovedHotels: async (): Promise<ApprovedHotelItem[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<ApprovedHotelItem[]>
    >(API_ENDPOINTS.ADMIN.GET_APPROVED_HOTELS);
    return response.data;
  },
  getRejectedHotels: async (): Promise<RejectedHotelItem[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<RejectedHotelItem[]>
    >(API_ENDPOINTS.ADMIN.GET_REJECTED_HOTELS);
    return response.data;
  },
  approveHotel: async (
    hotelId: string,
    data: ApproveHotelRequest
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.APPROVE_HOTEL(hotelId),
      data
    );
    return response.data;
  },
  rejectHotel: async (
    hotelId: string,
    data: RejectHotelRequest
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.REJECT_HOTEL(hotelId),
      data
    );
    return response.data;
  },
  // User Management
  getUsers: async (): Promise<UsersResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<UsersResponse>>(
      API_ENDPOINTS.ADMIN.GET_USERS
    );
    return response.data;
  },
  getUserById: async (userId: string | number): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>(
      API_ENDPOINTS.ADMIN.GET_USER_BY_ID(userId)
    );
    return response.data;
  },
  createUser: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<ApiSuccessResponse<User>>(
      API_ENDPOINTS.ADMIN.CREATE_USER,
      data
    );
    return response.data;
  },
  updateUser: async (
    userId: string | number,
    data: UpdateUserRequest
  ): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>(
      API_ENDPOINTS.ADMIN.UPDATE_USER(userId),
      data
    );
    return response.data;
  },
  // Hotel Management
  getHotelBasicInfo: async (
    hotelId: string
  ): Promise<HotelBasicInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelBasicInfoResponse>
    >(API_ENDPOINTS.ADMIN.GET_HOTEL_BASIC_INFO(hotelId));
    return response.data;
  },
  updateHotelProfile: async (
    hotelId: string,
    data: UpdateHotelProfileRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.UPDATE_HOTEL_PROFILE(hotelId),
      data
    );
    return response.data;
  },
  updateHotelStatus: async (
    hotelId: string,
    data: UpdateHotelStatusRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.UPDATE_HOTEL_STATUS(hotelId),
      data
    );
    return response.data;
  },
  // Hotel Contact Management
  getHotelContact: async (
    hotelId: string
  ): Promise<HotelContactResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelContactResponse>
    >(API_ENDPOINTS.ADMIN.GET_HOTEL_CONTACT(hotelId));
    return response.data;
  },
  updateHotelContact: async (
    hotelId: string,
    data: UpdateHotelContactRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.UPDATE_HOTEL_CONTACT(hotelId),
      data
    );
    return response.data;
  },
  // Hotel Location Management
  getHotelLocation: async (
    hotelId: string
  ): Promise<HotelLocationResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelLocationResponse>
    >(API_ENDPOINTS.ADMIN.GET_HOTEL_LOCATION(hotelId));
    return response.data;
  },
  updateHotelLocation: async (
    hotelId: string,
    data: UpdateHotelLocationRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.UPDATE_HOTEL_LOCATION(hotelId),
      data
    );
    return response.data;
  },
  // Hotel Address Management
  getHotelAddress: async (
    hotelId: string
  ): Promise<HotelAddressResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelAddressResponse>
    >(API_ENDPOINTS.ADMIN.GET_HOTEL_ADDRESS(hotelId));
    return response.data;
  },
  updateHotelAddress: async (
    hotelId: string,
    data: UpdateHotelAddressRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.UPDATE_HOTEL_ADDRESS(hotelId),
      data
    );
    return response.data;
  },
  // Hotel Admin specific methods (without /admin prefix)
  getHotelAdminBasicInfo: async (
    hotelId: string
  ): Promise<HotelBasicInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelBasicInfoResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_BASIC_INFO(hotelId));
    return response.data;
  },
  updateHotelAdminProfile: async (
    hotelId: string,
    data: UpdateHotelAdminProfileRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_PROFILE(hotelId),
      data
    );
    return response.data;
  },
  getHotelAdminContact: async (
    hotelId: string
  ): Promise<HotelContactResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelContactResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_CONTACT(hotelId));
    return response.data;
  },
  updateHotelAdminContact: async (
    hotelId: string,
    data: UpdateHotelAdminContactRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_CONTACT(hotelId),
      data
    );
    return response.data;
  },
  getHotelAdminLocation: async (
    hotelId: string
  ): Promise<HotelLocationResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelLocationResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_LOCATION(hotelId));
    return response.data;
  },
  getHotelAdminAddress: async (
    hotelId: string
  ): Promise<HotelAddressResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelAddressResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_ADDRESS(hotelId));
    return response.data;
  },
  getHotelPolicies: async (
    hotelId: string
  ): Promise<HotelPoliciesResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelPoliciesResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.HOTEL_POLICIES(hotelId));
    return response.data;
  },
  createHotelPolicies: async (
    hotelId: string,
    data: UpdateHotelPoliciesRequest
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.HOTEL_POLICIES(hotelId),
      data
    );
    return response.data;
  },
  updateHotelPolicies: async (
    hotelId: string,
    data: UpdateHotelPoliciesRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.HOTEL_POLICIES(hotelId),
      data
    );
    return response.data;
  },
  getCancellationPolicies: async (
    hotelId: string
  ): Promise<CancellationPolicyListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<CancellationPolicyListResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.CANCELLATION_POLICIES(hotelId));
    return response.data;
  },
  getCancellationPolicy: async (
    hotelId: string,
    policyId: number
  ): Promise<CancellationPolicy> => {
    const response = await apiClient.get<ApiSuccessResponse<CancellationPolicy>>(
      API_ENDPOINTS.HOTEL_ADMIN.CANCELLATION_POLICY_DETAIL(hotelId, policyId)
    );
    return response.data;
  },
  createCancellationPolicy: async (
    hotelId: string,
    data: CancellationPolicyPayload
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.CANCELLATION_POLICIES(hotelId),
      data
    );
    return response.data;
  },
  updateCancellationPolicy: async (
    hotelId: string,
    policyId: number,
    data: CancellationPolicyPayload
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.CANCELLATION_POLICY_DETAIL(hotelId, policyId),
      data
    );
    return response.data;
  },
  getChildAgePolicy: async (hotelId: string): Promise<ChildAgePolicyResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<ChildAgePolicyResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.CHILD_AGE_POLICY(hotelId));
    return response.data;
  },
  getChildAgePolicy: async (
    hotelId: string
  ): Promise<ChildAgePolicyResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<ChildAgePolicyResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.CHILD_AGE_POLICY(hotelId));
    return response.data;
  },
  createChildAgePolicy: async (
    hotelId: string,
    data: ChildAgePolicyPayload
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.CHILD_AGE_POLICY(hotelId),
      data
    );
    return response.data;
  },
  updateChildAgePolicy: async (
    hotelId: string,
    data: ChildAgePolicyPayload
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.CHILD_AGE_POLICY(hotelId),
      data
    );
    return response.data;
  },
  // Payment Rules Management
  getPaymentRules: async (
    hotelId: string
  ): Promise<PaymentRuleListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<PaymentRuleListResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.PAYMENT_RULES(hotelId));
    return response.data;
  },
  createPaymentRule: async (
    hotelId: string,
    data: PaymentRulePayload
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.PAYMENT_RULES(hotelId),
      data
    );
    return response.data;
  },
  updatePaymentRule: async (
    hotelId: string,
    data: PaymentRulePayload
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.PAYMENT_RULES(hotelId),
      data
    );
    return response.data;
  },
  // Promotions Management
  createPromotion: async (
    hotelId: string,
    data: CreatePromotionPayload
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.CREATE_PROMOTION(hotelId),
      data
    );
    return response.data;
  },
  getPromotions: async (
    hotelId: string
  ): Promise<PromotionListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<PromotionListItem[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_PROMOTIONS(hotelId)
    );
    // response.data is the data from ApiSuccessResponse
    // If it's an array, use it directly
    if (Array.isArray(response.data)) {
      return { data: response.data };
    }
    // If it's an object with a data property, extract it
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { data: (response.data as any).data || [] };
    }
    return { data: [] };
  },
  getPromotionEdit: async (
    hotelId: string,
    promotionId: string
  ): Promise<PromotionEditResponse> => {
    // The API returns { data: { promotion: {...}, ... } } wrapped in ApiSuccessResponse
    const response = await apiClient.get<ApiSuccessResponse<PromotionEditResponse["data"]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_PROMOTION_EDIT(hotelId, promotionId)
    );
    // response.data is the PromotionEditResponse["data"] (the inner data object)
    // We need to wrap it in PromotionEditResponse format
    return { data: response.data };
  },
  updatePromotionStatus: async (
    hotelId: string,
    promotionId: string,
    data: UpdatePromotionStatusPayload
  ): Promise<null> => {
    const response = await apiClient.patch<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_PROMOTION_STATUS(hotelId, promotionId),
      data
    );
    return response.data;
  },
  updatePromotion: async (
    hotelId: string,
    promotionId: string,
    data: UpdatePromotionPayload
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_PROMOTION_STATUS(hotelId, promotionId),
      data
    );
    return response.data;
  },
  // Hotel Rooms Management
  getHotelAdminRooms: async (
    hotelId: string
  ): Promise<HotelRoomsResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelRoomsResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_ROOMS(hotelId));
    return response.data;
  },
  updateRoomActiveStatus: async (
    hotelId: string,
    roomId: string,
    data: UpdateRoomActiveStatusRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_ROOM_ACTIVE_STATUS(hotelId, roomId),
      data
    );
    return response.data;
  },
  getRoomRatePlans: async (
    hotelId: string,
    roomId: string
  ): Promise<RoomRatePlansResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<RoomRatePlansResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_ROOM_RATE_PLANS(hotelId, roomId));
    return response.data;
  },
  getRatePlanForEdit: async (
    hotelId: string,
    roomId: string,
    ratePlanId: number
  ): Promise<RatePlanEditResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<RatePlanEditResponse>
    >(API_ENDPOINTS.HOTEL_ADMIN.GET_RATE_PLAN_EDIT(hotelId, roomId, ratePlanId));
    return response.data;
  },
  createRatePlan: async (
    hotelId: string,
    roomId: string,
    data: CreateRatePlanRequest
  ): Promise<RatePlan> => {
    const response = await apiClient.post<ApiSuccessResponse<RatePlan>>(
      API_ENDPOINTS.HOTEL_ADMIN.CREATE_RATE_PLAN(hotelId, roomId),
      data
    );
    return response.data;
  },
  updateRatePlan: async (
    hotelId: string,
    roomId: string,
    ratePlanId: number,
    data: UpdateRatePlanRequest
  ): Promise<RatePlan> => {
    const response = await apiClient.put<ApiSuccessResponse<RatePlan>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_RATE_PLAN(hotelId, roomId, ratePlanId),
      data
    );
    return response.data;
  },
  updateRatePlanActiveStatus: async (
    hotelId: string,
    roomId: string,
    ratePlanId: number,
    data: UpdateRatePlanActiveStatusRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_RATE_PLAN_ACTIVE_STATUS(hotelId, roomId, ratePlanId),
      data
    );
    return response.data;
  },
  // Hotel Room Create/Update
  createOrUpdateRoom: async (
    hotelId: string,
    data: HotelRoomDetailsRequest
  ): Promise<{ roomKey: string }> => {
    const response = data.roomKey
      ? await apiClient.post<ApiSuccessResponse<{ roomKey: string }>>(
          API_ENDPOINTS.HOTEL_ADMIN.CREATE_OR_UPDATE_ROOM(hotelId),
          data
        )
      : await apiClient.post<ApiSuccessResponse<{ roomKey: string }>>(
          API_ENDPOINTS.HOTEL_ADMIN.CREATE_OR_UPDATE_ROOM(hotelId),
          data
        );
    return response.data;
  },
  getRoomDetails: async (
    hotelId: string,
    roomId: string
  ): Promise<HotelRoomDetailsResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<HotelRoomDetailsResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_ROOM_DETAILS(hotelId, roomId)
    );
    return response.data;
  },
  // Media APIs
  getHotelMedia: async (hotelId: string): Promise<HotelMediaItem[]> => {
    const response = await apiClient.get<ApiSuccessResponse<HotelMediaItem[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_MEDIA(hotelId)
    );
    return response.data;
  },
  getRoomMedia: async (hotelId: string, roomId: string): Promise<HotelMediaItem[]> => {
    const response = await apiClient.get<ApiSuccessResponse<HotelMediaItem[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_ROOM_MEDIA(hotelId, roomId)
    );
    return response.data;
  },
  uploadHotelMedia: async (hotelId: string, files: File[]): Promise<{ imageId: number; imageUrl: string }[]> => {
    const formData = new FormData();
    // Append all files with the parameter name "files"
    files.forEach((file) => {
      formData.append("files", file);
    });
    const response = await apiClient.post<ApiSuccessResponse<{ imageId: number; imageUrl: string }[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPLOAD_HOTEL_MEDIA(hotelId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
  assignMediaTag: async (hotelId: string, imageId: number, data: AssignMediaTagRequest): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.ASSIGN_MEDIA_TAG(hotelId, imageId),
      data
    );
    return response.data;
  },
  assignMediaToRoom: async (hotelId: string, imageId: number, data: AssignMediaToRoomRequest): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.ASSIGN_MEDIA_TO_ROOM(hotelId, imageId),
      data
    );
    return response.data;
  },
  assignMediaToHotel: async (hotelId: string, imageId: number): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.ASSIGN_MEDIA_TO_HOTEL(hotelId, imageId)
    );
    return response.data;
  },
  detachMedia: async (hotelId: string, imageId: number): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.DETACH_MEDIA(hotelId, imageId)
    );
    return response.data;
  },
  reorderMedia: async (hotelId: string, data: ReorderMediaRequest): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.REORDER_MEDIA(hotelId),
      data
    );
    return response.data;
  },
  setMediaCover: async (hotelId: string, mediaId: number): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.SET_MEDIA_COVER(hotelId, mediaId)
    );
    return response.data;
  },
  // Finance APIs
  getHotelFinance: async (hotelId: string): Promise<FinanceResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<FinanceResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_FINANCE(hotelId)
    );
    return response.data;
  },
  updateHotelFinance: async (hotelId: string, data: FinanceData): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_FINANCE(hotelId),
      data
    );
    return response.data;
  },
  getHotelFoodServices: async (hotelId: string): Promise<FoodServicesResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<FoodServicesResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_FOOD_SERVICES(hotelId)
    );
    return response.data;
  },
  updateHotelFoodServices: async (
    hotelId: string,
    data: FoodServicesResponse
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_FOOD_SERVICES(hotelId),
      data
    );
    return response.data;
  },
  // Amenities APIs
  getHotelAmenities: async (hotelId: string): Promise<AmenitiesResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<AmenitiesResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_AMENITIES(hotelId)
    );
    return response.data;
  },
  getRoomAmenities: async (hotelId: string, roomId: string): Promise<AmenitiesResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<AmenitiesResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_ROOM_AMENITIES(hotelId, roomId)
    );
    return response.data;
  },
  updateHotelAmenities: async (hotelId: string, data: UpdateAmenitiesRequest): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_AMENITIES(hotelId),
      data
    );
    return response.data;
  },
  updateRoomAmenities: async (hotelId: string, roomId: string, data: UpdateAmenitiesRequest): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_ROOM_AMENITIES(hotelId, roomId),
      data
    );
    return response.data;
  },
  // Document APIs
  getDocuments: async (hotelId: string): Promise<Document[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Document[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_DOCUMENTS(hotelId)
    );
    return response.data;
  },
  uploadDocument: async (hotelId: string, file: File, docType: DocumentType): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    const response = await apiClient.post<ApiSuccessResponse<Document>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPLOAD_DOCUMENT(hotelId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
  // Document Review APIs (Super Admin)
  getPendingDocuments: async (): Promise<Document[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Document[]>>(
      API_ENDPOINTS.ADMIN.GET_PENDING_DOCUMENTS
    );
    return response.data;
  },
  getHotelDocuments: async (hotelId: string): Promise<Document[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Document[]>>(
      API_ENDPOINTS.ADMIN.GET_HOTEL_DOCUMENTS(hotelId)
    );
    return response.data;
  },
  approveDocument: async (docId: string | number, remarks: string): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.APPROVE_DOCUMENT(docId),
      { remarks }
    );
    return response.data;
  },
  rejectDocument: async (docId: string | number, remarks: string): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      `${API_ENDPOINTS.ADMIN.REJECT_DOCUMENT(docId)}?remarks=${encodeURIComponent(remarks)}`
    );
    return response.data;
  },

  // Travel agent onboarding (travel partners) – API now wraps responses in ApiSuccessResponse
  getTravelAgentOnboardingList: async (
    params?: TravelAgentOnboardingListParams
  ): Promise<TravelAgentOnboardingListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<TravelAgentOnboardingListResponse>
    >(API_ENDPOINTS.ADMIN.TRAVEL_AGENT_ONBOARDING_LIST, { params });
    return response.data;
  },
  getTravelAgentOnboardingById: async (
    id: string | number
  ): Promise<TravelAgentOnboardingItem> => {
    const response = await apiClient.get<
      ApiSuccessResponse<TravelAgentOnboardingItem>
    >(API_ENDPOINTS.ADMIN.TRAVEL_AGENT_ONBOARDING_BY_ID(id));
    return response.data;
  },
  approveTravelAgentOnboarding: async (
    id: string | number,
    data: ApproveTravelAgentOnboardingRequest
  ): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.ADMIN.TRAVEL_AGENT_ONBOARDING_APPROVE(id),
      data
    );
  },
  rejectTravelAgentOnboarding: async (
    id: string | number,
    data: RejectTravelAgentOnboardingRequest
  ): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.ADMIN.TRAVEL_AGENT_ONBOARDING_REJECT(id),
      data
    );
  },
};

