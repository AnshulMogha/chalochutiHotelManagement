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
  GetPoliciesResponse,
  SubmitFinanceAndLegalRequest,
  GetAllBasicInfoResponse,
  GetOnboardingStatusResponse,
  RoomListResponse,
  GetSelectedHotelAmenitiesResponse,
  LocationInfoResponse,
  HotelListResponse,
  HotelListPageParams,
  HotelListPageResponse,
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
    entityId: string,
  ): Promise<null> => {
    const response = await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.DEATTACH_MEDIA(mediaId, entityType, entityId),
    );
    return response.data;
  },
  assignMedia: async (
    data: AssignMediaRequest,
    mediaId: number,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.ASSIGN_MEDIA(mediaId),
      data,
    );
    return response.data;
  },
  getMedia: async (entityId: string): Promise<MediaResponse[]> => {
    const response = await apiClient.get<ApiSuccessResponse<MediaResponse[]>>(
      API_ENDPOINTS.HOTELS.GET_MEDIA(entityId),
    );
    return response.data;
  },
  getAllHotels: async (
    params?: HotelListPageParams,
  ): Promise<HotelListPageResponse> => {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    const query: Record<string, string | number> = { page, size };
    const trim = (value?: string) => value?.trim() || undefined;
    const hotelName = trim(params?.hotelName);
    const hotelCode = trim(params?.hotelCode);
    const city = trim(params?.city);
    const status = trim(params?.status);
    const requestedBy = trim(params?.requestedBy);
    const submittedAt = trim(params?.submittedAt);
    const submittedAtFrom = trim(params?.submittedAtFrom);
    const submittedAtTo = trim(params?.submittedAtTo);
    if (hotelName) query.hotelName = hotelName;
    if (hotelCode) query.hotelCode = hotelCode;
    if (city) query.city = city;
    if (status) query.status = status;
    if (requestedBy) query.requestedBy = requestedBy;
    if (submittedAt) {
      query.submittedAt = submittedAt;
    } else {
      if (submittedAtFrom) query.submittedAtFrom = submittedAtFrom;
      if (submittedAtTo) query.submittedAtTo = submittedAtTo;
    }
    const response = await apiClient.get<
      ApiSuccessResponse<HotelListResponse[] | HotelListPageResponse>
    >(API_ENDPOINTS.HOTELS.GET_ALL_HOTELS, {
      params: query,
    });
    const payload = response.data;

    if (Array.isArray(payload)) {
      return {
        content: payload,
        totalElements: payload.length,
        totalPages: 1,
        size: payload.length,
        number: 0,
        numberOfElements: payload.length,
        first: true,
        last: true,
        empty: payload.length === 0,
      };
    }

    const content = Array.isArray(payload?.content) ? payload.content : [];
    const totalElements = Number(payload?.totalElements ?? content.length);
    const resolvedSize = Number(payload?.size ?? size);
    const totalPages = Number(
      payload?.totalPages ??
        Math.max(1, Math.ceil(totalElements / Math.max(1, resolvedSize))),
    );

    return {
      content,
      totalElements: Number.isFinite(totalElements) ? totalElements : 0,
      totalPages: Number.isFinite(totalPages) ? totalPages : 1,
      size: Number.isFinite(resolvedSize) ? resolvedSize : size,
      number: Number(payload?.number ?? page),
      numberOfElements: Number(
        payload?.numberOfElements ?? content.length,
      ),
      first: payload?.first ?? page === 0,
      last: payload?.last ?? page >= totalPages - 1,
      empty: payload?.empty ?? content.length === 0,
    };
  },

  /** Fetch every page (for selectors / assignment UIs that need the full list). */
  getAllHotelsList: async (): Promise<HotelListResponse[]> => {
    const size = 50;
    let page = 0;
    let totalPages = 1;
    const all: HotelListResponse[] = [];

    do {
      const response = await propertyService.getAllHotels({ page, size });
      all.push(...response.content);
      totalPages = Math.max(1, response.totalPages);
      page += 1;
    } while (page < totalPages);

    return all;
  },
  getLocationDetails: async (
    hotelId: string,
  ): Promise<LocationInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<LocationInfoResponse>
    >(API_ENDPOINTS.HOTELS.GET_LOCATION_DETAILS(hotelId));
    return response.data;
  },
  getRoomDetails: async (
    hotelId: string,
    roomKey: string,
  ): Promise<GetRoomDetailsResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetRoomDetailsResponse>
    >(API_ENDPOINTS.HOTELS.GET_ROOM_DETAILS(hotelId, roomKey));
    return response.data;
  },
  getSelectedHotelAmenities: async (
    hotelId: string,
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
      API_ENDPOINTS.HOTELS.GET_AVAILABLE_ROOM_AMENITIES,
    );
    return response.data;
  },
  uploadMedia: async (
    data: UploadMediaRequest,
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
    files: File[],
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
      { tags },
    );
    return response.data;
  },
  assignMediaTagToHotel: async (
    mediaId: number,
    tags: MediaTag[],
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.ASSIGN_MEDIA_TAG(mediaId.toString()),
      { tags },
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
    hotelId: string,
  ): Promise<GetAllBasicInfoResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetAllBasicInfoResponse>
    >(API_ENDPOINTS.HOTELS.GET_ALL_BASIC_INFO(hotelId));
    return response.data;
  },
  getOnboardingStatus: async (
    hotelId: string,
  ): Promise<GetOnboardingStatusResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetOnboardingStatusResponse>
    >(API_ENDPOINTS.HOTELS.GET_ONBOARDING_STATUS(hotelId));
    return response.data;
  },
  submitBasicInfo: async (
    data: SubmitBasicInfoRequest,
    hotelId: string,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_BASIC_INFO(hotelId),
      data,
    );
    return response.data;
  },
  submitLocationInfo: async (
    data: SubmitLocationInfoRequest,
    hotelId: string,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_LOCATION_INFO(hotelId),
      data,
    );
    return response.data;
  },
  getAvailableHotelAmenities: async (): Promise<Amenity[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Amenity[]>>(
      API_ENDPOINTS.HOTELS.GET_AVAILABLE_HOTEL_AMENITIES,
    );
    return response.data;
  },
  mediaOnboarding: async (draft: boolean, hotelId: string): Promise<null> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.MEDIA_ONBOARDING(hotelId),
      { draft },
    );
    return null;
  },
  submitAmenitiesInfo: async (
    data: SubmitAmenitiesInfoRequest,
    hotelId: string,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_AMENITIES_INFO(hotelId),
      data,
    );
    return response.data;
  },
  submitRoomDetails: async (
    data: SubmitRoomDetailsRequest,
    hotelId: string,
  ): Promise<{ roomKey: string }> => {
    const response = await apiClient.post<
      ApiSuccessResponse<{ roomKey: string }>
    >(API_ENDPOINTS.HOTELS.SUBMIT_ROOM_DETAILS(hotelId), data);
    console.log("response", response.data);
    return response.data;
  },
  submitPolicies: async (
    data: SubmitPoliciesRequest,
    hotelId: string,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_POLICIES(hotelId),
      data,
    );
    return response.data;
  },
  getPolicies: async (hotelId: string): Promise<GetPoliciesResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<GetPoliciesResponse>>(
      API_ENDPOINTS.HOTELS.SUBMIT_POLICIES(hotelId),
    );
    return response.data;
  },
  submitFinanceAndLegal: async (
    data: SubmitFinanceAndLegalRequest,
    hotelId: string,
  ): Promise<null> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTELS.SUBMIT_FINANCE_AND_LEGAL(hotelId),
      data,
    );
    return response.data;
  },
  getFinanceAndLegal: async (
    hotelId: string,
  ): Promise<GetFinanceAndLegalResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<GetFinanceAndLegalResponse>
    >(API_ENDPOINTS.HOTELS.GET_FINANCE_AND_LEGAL(hotelId));
    return response.data;
  },
  getOnboardingDocuments: async (
    hotelId: string,
  ): Promise<OnboardingDocument[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<OnboardingDocument[]>
    >(API_ENDPOINTS.HOTELS.GET_ONBOARDING_DOCUMENTS(hotelId));
    return response.data;
  },
  uploadOnboardingDocument: async (
    hotelId: string,
    data: UploadOnboardingDocumentRequest,
  ): Promise<OnboardingDocument> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("docType", data.docType);
    formData.append("draft", String(data.draft));

    const response = await apiClient.post<
      ApiSuccessResponse<OnboardingDocument>
    >(API_ENDPOINTS.HOTELS.UPLOAD_ONBOARDING_DOCUMENT(hotelId), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  updateOnboardingDocument: async (
    hotelId: string,
    documentId: string | number,
    data: Omit<UploadOnboardingDocumentRequest, "draft">,
  ): Promise<OnboardingDocument> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("docType", data.docType);

    const response = await apiClient.put<ApiSuccessResponse<OnboardingDocument>>(
      API_ENDPOINTS.HOTELS.UPDATE_ONBOARDING_DOCUMENT(hotelId, documentId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },
};
