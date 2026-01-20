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
  role: "HOTEL_OWNER" | "HOTEL_MANAGER" | "SUPER_ADMIN";
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UpdateUserRequest {
  email: string;
  role: "HOTEL_OWNER" | "HOTEL_MANAGER" | "SUPER_ADMIN";
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
  acceptingSince: string;
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
  acceptingSince: number;
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
  roomId: string;
}

export interface ReorderMediaRequest {
  imageId: number;
  sortOrder: number;
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

export interface FinanceResponse {
  total: number;
  finances: FinanceData[];
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
    const response = await apiClient.post<ApiSuccessResponse<{ roomKey: string }>>(
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
  uploadHotelMedia: async (hotelId: string, file: File): Promise<{ imageId: number; imageUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiSuccessResponse<{ imageId: number; imageUrl: string }>>(
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
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_HOTEL_AMENITIES(hotelId),
      data
    );
    return response.data;
  },
  updateRoomAmenities: async (hotelId: string, roomId: string, data: UpdateAmenitiesRequest): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.UPDATE_ROOM_AMENITIES(hotelId, roomId),
      data
    );
    return response.data;
  },
};

