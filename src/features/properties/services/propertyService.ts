// Property service
// This demonstrates how to organize API services for a feature

import { apiClient } from "@/services/api/client";

import { API_ENDPOINTS } from "@/constants";
import type {
  GenerateDraftHotelResponse,
  SubmitAmenitiesInfoRequest,
  SubmitBasicInfoRequest,
  SubmitLocationInfoRequest,
  SubmitRoomDetailsRequest,
  SubmitPoliciesRequest,
  SubmitFinanceAndLegalRequest,
  GetAllBasicInfoResponse,
  GetOnboardingStatusResponse,
  RoomListResponse,
  GetSelectedHotelAmenitiesResponse,
  LocationInfoResponse,
  HotelListResponse,
  GetRoomDetailsResponse,
  UploadMediaResponse,
  UploadMediaRequest,
  AssignMediaRequest,
  MediaResponse,
  GetFinanceAndLegalResponse,
  OnboardingDocument,
  UploadOnboardingDocumentRequest,
} from "./api.types";
import type { ApiSuccessResponse } from "@/services/api/types";
import type { Amenity } from "../types";
import type { MediaTag } from "../components/steps/PhotosAndVideosStep/types";

export const propertyService = {
  deattachMedia: async (
    mediaId: number,
    entityType: string,
    entityId: string
  ): Promise<null> => {
    const response = await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.DEATTACH_MEDIA(mediaId, entityType, entityId)
    );
    return response.data;
  },
  assignMedia: async (
    data: AssignMediaRequest,
    mediaId: number
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.ASSIGN_MEDIA(mediaId),
      data
    );
    return response.data;
  },
  getMedia: async (entityId: string): Promise<MediaResponse[]> => {
    const response = await apiClient.get<ApiSuccessResponse<MediaResponse[]>>(
      API_ENDPOINTS.HOTELS.GET_MEDIA(entityId)
    );
    return response.data;
  },
  getAllHotels: async (): Promise<HotelListResponse[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<HotelListResponse[]>
    >(API_ENDPOINTS.HOTELS.GET_ALL_HOTELS);
    return response.data;
  },
  getLocationDetails: async (
    hotelId: string
  ): Promise<LocationInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<LocationInfoResponse>
    >(API_ENDPOINTS.HOTELS.GET_LOCATION_DETAILS(hotelId));
    return response.data;
  },
  getRoomDetails: async (
    hotelId: string,
    roomKey: string
  ): Promise<GetRoomDetailsResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetRoomDetailsResponse>
    >(API_ENDPOINTS.HOTELS.GET_ROOM_DETAILS(hotelId, roomKey));
    return response.data;
  },
  getSelectedHotelAmenities: async (
    hotelId: string
  ): Promise<GetSelectedHotelAmenitiesResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetSelectedHotelAmenitiesResponse>
    >(API_ENDPOINTS.HOTELS.GET_SELECTED_HOTEL_AMENITIES(hotelId));
    return response.data;
  },
  getAllRooms: async (hotelId: string): Promise<RoomListResponse[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<RoomListResponse[]>
    >(API_ENDPOINTS.HOTELS.GET_ALL_ROOMS(hotelId));
    return response.data;
  },
  getAvailableRoomAmenities: async (): Promise<Amenity[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Amenity[]>>(
      API_ENDPOINTS.HOTELS.GET_AVAILABLE_ROOM_AMENITIES
    );
    return response.data;
  },
  uploadMedia: async (
    data: UploadMediaRequest
  ): Promise<UploadMediaResponse> => {
    const formData = new FormData();

    formData.append("file", data.media); // file

    const response = await apiClient.post<
      ApiSuccessResponse<UploadMediaResponse>
    >(API_ENDPOINTS.HOTELS.UPLOAD_MEDIA, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
  uploadHotelMedia: async (
    hotelId: string,
    files: File[]
  ): Promise<UploadMediaResponse[]> => {
    // Upload all files in a single API call
    const formData = new FormData();
    
    // Append all files with the parameter name "files"
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post<
      ApiSuccessResponse<UploadMediaResponse[]>
    >(API_ENDPOINTS.HOTELS.UPLOAD_HOTEL_MEDIA_ONBOARDING(hotelId), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
  assignMediaTag: async (mediaId: number, tags: MediaTag[]): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.ASSIGN_MEDIA_TAG(mediaId.toString()),
      { tags }
    );
    return response.data;
  },
  assignMediaTagToHotel: async (
    mediaId: number,
    tags: MediaTag[]
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.ASSIGN_MEDIA_TAG(mediaId.toString()),
      { tags }
    );
    return response.data;
  },
  generateDraftHotel: async (): Promise<GenerateDraftHotelResponse> => {
    const response = await apiClient.post<
      ApiSuccessResponse<GenerateDraftHotelResponse>
    >(API_ENDPOINTS.HOTELS.GENERATE_DRAFT_HOTEL);
    return response.data;
  },
  getAllBasicInfo: async (
    hotelId: string
  ): Promise<GetAllBasicInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetAllBasicInfoResponse>
    >(API_ENDPOINTS.HOTELS.GET_ALL_BASIC_INFO(hotelId));
    return response.data;
  },
  getOnboardingStatus: async (
    hotelId: string
  ): Promise<GetOnboardingStatusResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetOnboardingStatusResponse>
    >(API_ENDPOINTS.HOTELS.GET_ONBOARDING_STATUS(hotelId));
    return response.data;
  },
  submitBasicInfo: async (
    data: SubmitBasicInfoRequest,
    hotelId: string
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_BASIC_INFO(hotelId),
      data
    );
    return response.data;
  },
  submitLocationInfo: async (
    data: SubmitLocationInfoRequest,
    hotelId: string
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_LOCATION_INFO(hotelId),
      data
    );
    return response.data;
  },
  getAvailableHotelAmenities: async (): Promise<Amenity[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Amenity[]>>(
      API_ENDPOINTS.HOTELS.GET_AVAILABLE_HOTEL_AMENITIES
    );
    return response.data;
  },
  mediaOnboarding: async (draft: boolean, hotelId: string): Promise<null> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.MEDIA_ONBOARDING(hotelId),
      { draft }
    );
    return null;
  },
  submitAmenitiesInfo: async (
    data: SubmitAmenitiesInfoRequest,
    hotelId: string
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_AMENITIES_INFO(hotelId),
      data
    );
    return response.data;
  },
  submitRoomDetails: async (
    data: SubmitRoomDetailsRequest,
    hotelId: string
  ): Promise<{ roomKey: string }> => {
    const response = await apiClient.post<
      ApiSuccessResponse<{ roomKey: string }>
    >(API_ENDPOINTS.HOTELS.SUBMIT_ROOM_DETAILS(hotelId), data);
    console.log("response", response.data);
    return response.data;
  },
  submitPolicies: async (
    data: SubmitPoliciesRequest,
    hotelId: string
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_POLICIES(hotelId),
      data
    );
    return response.data;
  },
  submitFinanceAndLegal: async (
    data: SubmitFinanceAndLegalRequest,
    hotelId: string
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_FINANCE_AND_LEGAL(hotelId),
      data
    );
    return response.data;
  },
  getFinanceAndLegal: async (
    hotelId: string
  ): Promise<GetFinanceAndLegalResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetFinanceAndLegalResponse>
    >(API_ENDPOINTS.HOTELS.GET_FINANCE_AND_LEGAL(hotelId));
    return response.data;
  },
  getOnboardingDocuments: async (hotelId: string): Promise<OnboardingDocument[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<OnboardingDocument[]>
    >(API_ENDPOINTS.HOTELS.GET_ONBOARDING_DOCUMENTS(hotelId));
    return response.data;
  },
  uploadOnboardingDocument: async (
    hotelId: string,
    data: UploadOnboardingDocumentRequest
  ): Promise<OnboardingDocument> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("docType", data.docType);
    formData.append("draft", String(data.draft));

    const response = await apiClient.post<ApiSuccessResponse<OnboardingDocument>>(
      API_ENDPOINTS.HOTELS.UPLOAD_ONBOARDING_DOCUMENT(hotelId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};
