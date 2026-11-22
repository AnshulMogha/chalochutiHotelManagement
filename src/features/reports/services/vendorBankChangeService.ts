import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import type {
  VendorBankChangeListParams,
  VendorBankChangeMisDashboard,
  VendorBankChangeMisSummary,
  VendorBankChangeRequest,
  VendorBankChangeVendorType,
  VendorBankVerificationDetail,
  VendorBankVerificationMisRow,
} from "./vendorBankChangeTypes";

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiSuccessResponse<T>).status === "SUCCESS"
  ) {
    return (response as ApiSuccessResponse<T>).data as T;
  }
  return response as T;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function strOrNull(value: unknown): string | null {
  return value != null && String(value).trim() !== "" ? String(value) : null;
}

function normalizeRow(raw: Record<string, unknown>): VendorBankVerificationMisRow {
  return {
    beneficiaryId: Number(raw.beneficiaryId),
    vendorType: (raw.vendorType as VendorBankVerificationMisRow["vendorType"]) ?? "HOTEL",
    vendorId: String(raw.vendorId ?? ""),
    vendorName: strOrNull(raw.vendorName),
    contactMobile: strOrNull(raw.contactMobile),
    contactEmail: strOrNull(raw.contactEmail),
    bankName: strOrNull(raw.bankName),
    maskedAccountNumber: strOrNull(raw.maskedAccountNumber),
    ifscCode: strOrNull(raw.ifscCode),
    bankBranch: strOrNull(raw.bankBranch),
    accountHolderName: strOrNull(raw.accountHolderName),
    internalBankVerificationStatus:
      (raw.internalBankVerificationStatus as VendorBankVerificationMisRow["internalBankVerificationStatus"]) ??
      "PENDING",
    beneficiaryStatus:
      (raw.beneficiaryStatus as VendorBankVerificationMisRow["beneficiaryStatus"]) ?? null,
    lastUpdated: strOrNull(raw.lastUpdated),
    changeRequestId: raw.changeRequestId != null ? Number(raw.changeRequestId) : null,
    changeRequestStatus:
      (raw.changeRequestStatus as VendorBankVerificationMisRow["changeRequestStatus"]) ?? null,
    changeRequestedAt: strOrNull(raw.changeRequestedAt),
    changeRequestedByName: strOrNull(raw.changeRequestedByName),
    hasPendingChangeRequest: Boolean(raw.hasPendingChangeRequest),
  };
}

function normalizeRequest(raw: Record<string, unknown>): VendorBankChangeRequest {
  return {
    id: Number(raw.id),
    vendorType: (raw.vendorType as VendorBankChangeRequest["vendorType"]) ?? "HOTEL",
    vendorId: String(raw.vendorId ?? ""),
    vendorName: strOrNull(raw.vendorName),
    contactMobile: strOrNull(raw.contactMobile),
    contactEmail: strOrNull(raw.contactEmail),
    sourceBankDetailId:
      raw.sourceBankDetailId != null ? Number(raw.sourceBankDetailId) : null,
    status: (raw.status as VendorBankChangeRequest["status"]) ?? "PENDING_APPROVAL",
    oldAccountHolderName: strOrNull(raw.oldAccountHolderName),
    oldAccountNumber: strOrNull(raw.oldAccountNumber),
    oldIfsc: strOrNull(raw.oldIfsc),
    oldBankName: strOrNull(raw.oldBankName),
    oldBankBranch: strOrNull(raw.oldBankBranch),
    proposedAccountHolderName: strOrNull(raw.proposedAccountHolderName),
    proposedAccountNumber: strOrNull(raw.proposedAccountNumber),
    proposedIfsc: strOrNull(raw.proposedIfsc),
    proposedBankName: strOrNull(raw.proposedBankName),
    proposedBankBranch: strOrNull(raw.proposedBankBranch),
    bankProofDocumentKey: strOrNull(raw.bankProofDocumentKey),
    bankProofDocumentUrl: strOrNull(raw.bankProofDocumentUrl),
    requestedBy: raw.requestedBy != null ? Number(raw.requestedBy) : null,
    requestedByName: strOrNull(raw.requestedByName),
    requestedAt: strOrNull(raw.requestedAt),
    requestSource:
      (raw.requestSource as VendorBankChangeRequest["requestSource"]) ?? null,
    changeReason: strOrNull(raw.changeReason),
    approvedBy: raw.approvedBy != null ? Number(raw.approvedBy) : null,
    approvedByName: strOrNull(raw.approvedByName),
    approvedAt: strOrNull(raw.approvedAt),
    approvalRemarks: strOrNull(raw.approvalRemarks),
    rejectedBy: raw.rejectedBy != null ? Number(raw.rejectedBy) : null,
    rejectedByName: strOrNull(raw.rejectedByName),
    rejectedAt: strOrNull(raw.rejectedAt),
    rejectionRemarks: strOrNull(raw.rejectionRemarks),
    cancelledBy: raw.cancelledBy != null ? Number(raw.cancelledBy) : null,
    cancelledAt: strOrNull(raw.cancelledAt),
    beneficiaryStatus:
      (raw.beneficiaryStatus as VendorBankChangeRequest["beneficiaryStatus"]) ?? null,
    createdAt: strOrNull(raw.createdAt),
    updatedAt: strOrNull(raw.updatedAt),
  };
}

function normalizeSummary(raw: Record<string, unknown> | undefined): VendorBankChangeMisSummary {
  return {
    totalVendorAccounts: Number(raw?.totalVendorAccounts ?? 0),
    pendingApproval: Number(raw?.pendingApproval ?? 0),
    approved: Number(raw?.approved ?? 0),
    rejected: Number(raw?.rejected ?? 0),
    changeRequestPending: Number(raw?.changeRequestPending ?? 0),
    reVerificationRequired: Number(raw?.reVerificationRequired ?? 0),
    sbiRegistrationPending: Number(raw?.sbiRegistrationPending ?? 0),
    sbiVerified: Number(raw?.sbiVerified ?? 0),
    total: Number(raw?.total ?? 0),
  };
}

export const vendorBankChangeService = {
  async getDashboard(
    params: VendorBankChangeListParams = {},
  ): Promise<VendorBankChangeMisDashboard> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}${buildQuery({
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort,
      sortDir: params.sortDir,
      vendorType: params.vendorType ?? "ALL",
      internalBankVerificationStatus: params.internalBankVerificationStatus,
      changeRequestStatus: params.changeRequestStatus,
      beneficiaryStatus: params.beneficiaryStatus,
      vendorName: params.vendorName,
      vendorId: params.vendorId,
      search: params.search,
      fromAt: params.fromAt,
      toAt: params.toAt,
    })}`);
    const data = unwrapPayload(response) as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items) ? data.items : [];
    return {
      summary: normalizeSummary(data.summary as Record<string, unknown> | undefined),
      items: itemsRaw.map((row) => normalizeRow(row as Record<string, unknown>)),
      page: Number(data.page ?? 0),
      size: Number(data.size ?? 20),
      totalElements: Number(data.totalElements ?? 0),
      totalPages: Number(data.totalPages ?? 0),
    };
  },

  async getById(id: number): Promise<VendorBankChangeRequest> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/${id}`);
    return normalizeRequest(unwrapPayload(response) as Record<string, unknown>);
  },

  async getVerificationDetail(
    beneficiaryId: number,
  ): Promise<VendorBankVerificationDetail> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/accounts/${beneficiaryId}`,
    );
    const raw = unwrapPayload(response) as Record<string, unknown>;
    return {
      ...normalizeRow(raw),
      accountNumber: strOrNull(raw.accountNumber),
      ledgerInternalBankVerificationStatus:
        (raw.ledgerInternalBankVerificationStatus as VendorBankVerificationDetail["ledgerInternalBankVerificationStatus"]) ??
        null,
      liveBankVerificationStatus:
        (raw.liveBankVerificationStatus as VendorBankVerificationDetail["liveBankVerificationStatus"]) ??
        null,
      allowsInternalVerification: Boolean(raw.allowsInternalVerification),
      latestChangeRequestId:
        raw.latestChangeRequestId != null
          ? Number(raw.latestChangeRequestId)
          : null,
      latestChangeRequestStatus:
        (raw.latestChangeRequestStatus as VendorBankVerificationDetail["latestChangeRequestStatus"]) ??
        null,
    };
  },

  async getLatest(
    vendorType: VendorBankChangeVendorType,
    vendorId: string,
  ): Promise<VendorBankChangeRequest | null> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown> | null>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/latest${buildQuery({
      vendorType,
      vendorId,
    })}`);
    const data = unwrapPayload(response);
    if (!data || typeof data !== "object" || !("id" in data)) return null;
    return normalizeRequest(data as Record<string, unknown>);
  },

  async approve(id: number, remarks?: string): Promise<VendorBankChangeRequest> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/${id}/approve`, {
      remarks: remarks || undefined,
    });
    return normalizeRequest(unwrapPayload(response) as Record<string, unknown>);
  },

  async reject(id: number, remarks: string): Promise<VendorBankChangeRequest> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/${id}/reject`, {
      remarks,
    });
    return normalizeRequest(unwrapPayload(response) as Record<string, unknown>);
  },

  /** Approve pending bank details when there is no open change request. */
  async approveInternalVerification(
    vendorType: VendorBankChangeVendorType,
    vendorId: string,
    remarks?: string,
  ): Promise<VendorBankVerificationMisRow> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/internal-verification/approve`,
      { vendorType, vendorId, remarks: remarks || undefined },
    );
    return normalizeRow(unwrapPayload(response) as Record<string, unknown>);
  },

  /** Reject pending bank details when there is no open change request. */
  async rejectInternalVerification(
    vendorType: VendorBankChangeVendorType,
    vendorId: string,
    remarks: string,
  ): Promise<VendorBankVerificationMisRow> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BANK_CHANGE_REQUESTS}/internal-verification/reject`,
      { vendorType, vendorId, remarks },
    );
    return normalizeRow(unwrapPayload(response) as Record<string, unknown>);
  },
};
