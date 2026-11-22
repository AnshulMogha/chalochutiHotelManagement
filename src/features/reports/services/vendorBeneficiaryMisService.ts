import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import type {
  VendorBeneficiaryBatchDetail,
  VendorBeneficiaryBatchDetailParams,
  VendorBeneficiaryBatchGenerateResult,
  VendorBeneficiaryBatchItem,
  VendorBeneficiaryBatchList,
  VendorBeneficiaryBatchListParams,
  VendorBeneficiaryBatchSubmitPayload,
  VendorBeneficiaryBatchSummary,
  VendorBeneficiaryBatchTransitionResult,
  VendorBeneficiaryDetail,
  VendorBeneficiaryMisDashboard,
  VendorBeneficiaryMisListParams,
  VendorBeneficiaryMisPageMeta,
  VendorBeneficiaryMisRow,
  VendorBeneficiaryMisSummary,
  VendorBeneficiaryRebuildResult,
  VendorBeneficiaryRejectedActionPayload,
  VendorBeneficiaryRejectedActionResult,
} from "./vendorBeneficiaryMisTypes";
import { downloadReportExportFile } from "./reportExportService";

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

function normalizeSummary(raw: Record<string, unknown> | undefined): VendorBeneficiaryMisSummary {
  return {
    totalBeneficiaries: Number(raw?.totalBeneficiaries ?? 0),
    verifiedBeneficiaries: Number(raw?.verifiedBeneficiaries ?? 0),
    fileGenerated: Number(raw?.fileGenerated ?? 0),
    pendingApproval: Number(raw?.pendingApproval ?? 0),
    notSubmitted: Number(raw?.notSubmitted ?? 0),
    rejected: Number(raw?.rejected ?? 0),
  };
}

function normalizeBatchSummary(raw: Record<string, unknown>): VendorBeneficiaryBatchSummary {
  return {
    batchId: Number(raw.batchId),
    batchNumber: String(raw.batchNumber ?? ""),
    fileName: String(raw.fileName ?? ""),
    totalRecords: Number(raw.totalRecords ?? 0),
    generatedByUserId:
      raw.generatedByUserId != null ? Number(raw.generatedByUserId) : null,
    generatedBy: strOrNull(raw.generatedBy),
    generatedAt: strOrNull(raw.generatedAt),
    batchStatus:
      (raw.batchStatus as VendorBeneficiaryBatchSummary["batchStatus"]) ??
      "GENERATED",
    downloadUrl: strOrNull(raw.downloadUrl),
    bankFileReferenceNumber: strOrNull(raw.bankFileReferenceNumber),
    submittedByUserId:
      raw.submittedByUserId != null ? Number(raw.submittedByUserId) : null,
    submittedBy: strOrNull(raw.submittedBy),
    submittedAt: strOrNull(raw.submittedAt),
    submissionRemarks: strOrNull(raw.submissionRemarks),
  };
}

function normalizeTransition(
  raw: Record<string, unknown>,
): VendorBeneficiaryBatchTransitionResult {
  return {
    batchId: Number(raw.batchId),
    batchNumber: String(raw.batchNumber ?? ""),
    batchStatus:
      (raw.batchStatus as VendorBeneficiaryBatchTransitionResult["batchStatus"]) ??
      "GENERATED",
    updatedBeneficiaries: Number(raw.updatedBeneficiaries ?? 0),
    skippedBeneficiaries: Number(raw.skippedBeneficiaries ?? 0),
    bankFileReferenceNumber: strOrNull(raw.bankFileReferenceNumber),
    submissionRemarks: strOrNull(raw.submissionRemarks),
  };
}

function normalizeBatchItem(raw: Record<string, unknown>): VendorBeneficiaryBatchItem {
  return {
    beneficiaryId: Number(raw.beneficiaryId),
    beneficiaryCode: String(raw.beneficiaryCode ?? ""),
    vendorId: String(raw.vendorId ?? ""),
    vendorType: (raw.vendorType as VendorBeneficiaryBatchItem["vendorType"]) ?? "HOTEL",
    vendorName: strOrNull(raw.vendorName),
    fileLine: strOrNull(raw.fileLine),
    bankFlag: strOrNull(raw.bankFlag),
    action: strOrNull(raw.action),
    accountHolderName: strOrNull(raw.accountHolderName),
    maskedAccountNumber:
      strOrNull(raw.maskedAccountNumber) ?? strOrNull(raw.accountNumber),
    bankName: strOrNull(raw.bankName),
    ifscCode: strOrNull(raw.ifscCode),
    currentBeneficiaryStatus:
      (raw.currentBeneficiaryStatus as VendorBeneficiaryBatchItem["currentBeneficiaryStatus"]) ??
      null,
    currentInternalBankVerificationStatus:
      (raw.currentInternalBankVerificationStatus as VendorBeneficiaryBatchItem["currentInternalBankVerificationStatus"]) ??
      null,
  };
}

function normalizeRow(raw: Record<string, unknown>): VendorBeneficiaryMisRow {
  return {
    beneficiaryId: Number(raw.beneficiaryId),
    vendorId: String(raw.vendorId ?? ""),
    vendorName: strOrNull(raw.vendorName),
    vendorType: (raw.vendorType as VendorBeneficiaryMisRow["vendorType"]) ?? "HOTEL",
    bankType: (raw.bankType as VendorBeneficiaryMisRow["bankType"]) ?? null,
    contactMobile: strOrNull(raw.contactMobile),
    contactEmail: strOrNull(raw.contactEmail),
    bankName: strOrNull(raw.bankName),
    maskedAccountNumber: strOrNull(raw.maskedAccountNumber),
    ifscCode: strOrNull(raw.ifscCode),
    beneficiaryCode: String(raw.beneficiaryCode ?? ""),
    internalBankVerificationStatus:
      (raw.internalBankVerificationStatus as VendorBeneficiaryMisRow["internalBankVerificationStatus"]) ??
      "PENDING",
    beneficiaryStatus:
      (raw.beneficiaryStatus as VendorBeneficiaryMisRow["beneficiaryStatus"]) ??
      "NOT_SUBMITTED",
    eligibleForFileGeneration: Boolean(raw.eligibleForFileGeneration),
    lastUpdated: strOrNull(raw.lastUpdated),
  };
}

function normalizeDetail(raw: Record<string, unknown>): VendorBeneficiaryDetail {
  return {
    ...normalizeRow(raw),
    bankBranch: strOrNull(raw.bankBranch),
    accountHolderName: strOrNull(raw.accountHolderName),
    accountNumber: strOrNull(raw.accountNumber),
    lastFileBatchId:
      raw.lastFileBatchId != null ? Number(raw.lastFileBatchId) : null,
    lastFileBatchNumber: strOrNull(raw.lastFileBatchNumber),
    lastFileGeneratedAt: strOrNull(raw.lastFileGeneratedAt),
    lastFileGeneratedByUserId:
      raw.lastFileGeneratedByUserId != null
        ? Number(raw.lastFileGeneratedByUserId)
        : null,
    lastFileGeneratedBy: strOrNull(raw.lastFileGeneratedBy),
    verifiedAt: strOrNull(raw.verifiedAt),
    verifiedByUserId:
      raw.verifiedByUserId != null ? Number(raw.verifiedByUserId) : null,
    verifiedBy: strOrNull(raw.verifiedBy),
    verifiedReportFileName: strOrNull(raw.verifiedReportFileName),
    sbiResponseStatus: strOrNull(raw.sbiResponseStatus),
    sbiValidationStatus: strOrNull(raw.sbiValidationStatus),
    sbiErrorDescription: strOrNull(raw.sbiErrorDescription),
    sbiResponseReceivedAt: strOrNull(raw.sbiResponseReceivedAt),
    sbiImportId: raw.sbiImportId != null ? Number(raw.sbiImportId) : null,
    financeAction:
      (raw.financeAction as VendorBeneficiaryDetail["financeAction"]) ?? "NONE",
    financeActionRemarks: strOrNull(raw.financeActionRemarks),
    financeActionByUserId:
      raw.financeActionByUserId != null
        ? Number(raw.financeActionByUserId)
        : null,
    financeActionAt: strOrNull(raw.financeActionAt),
    sbiRetryConfirmed: Boolean(raw.sbiRetryConfirmed),
  };
}

function normalizeRejectedAction(
  raw: Record<string, unknown>,
): VendorBeneficiaryRejectedActionResult {
  return {
    beneficiaryId: Number(raw.beneficiaryId ?? 0),
    beneficiaryCode: String(raw.beneficiaryCode ?? ""),
    beneficiaryStatus:
      (raw.beneficiaryStatus as VendorBeneficiaryRejectedActionResult["beneficiaryStatus"]) ??
      "REJECTED",
    financeAction:
      (raw.financeAction as VendorBeneficiaryRejectedActionResult["financeAction"]) ??
      "NONE",
    financeActionRemarks: strOrNull(raw.financeActionRemarks),
    financeActionByUserId:
      raw.financeActionByUserId != null
        ? Number(raw.financeActionByUserId)
        : null,
    financeActionAt: strOrNull(raw.financeActionAt),
    eligibleForFileGeneration: Boolean(raw.eligibleForFileGeneration),
    message: strOrNull(raw.message),
  };
}

function normalizePage(
  raw: Record<string, unknown> | undefined,
  page: number,
  size: number,
): VendorBeneficiaryMisPageMeta {
  const totalElements = Number(raw?.totalElements ?? 0);
  const resolvedSize = Number(raw?.size ?? size);
  return {
    page: Number(raw?.page ?? page),
    size: resolvedSize,
    totalElements,
    totalPages: Number(
      raw?.totalPages ?? (resolvedSize > 0 ? Math.ceil(totalElements / resolvedSize) : 0),
    ),
    sort: raw?.sort != null ? String(raw.sort) : undefined,
    direction: raw?.direction != null ? String(raw.direction) : undefined,
  };
}

export const vendorBeneficiaryMisService = {
  async getDashboard(
    params: VendorBeneficiaryMisListParams,
  ): Promise<VendorBeneficiaryMisDashboard> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARIES}${buildQuery({
      page,
      size,
      sort: params.sort,
      sortDir: params.sortDir,
      vendorType: params.vendorType,
      beneficiaryStatus: params.beneficiaryStatus,
      internalBankVerificationStatus: params.internalBankVerificationStatus,
      search: params.search,
    })}`);
    const data = unwrapPayload(response) as Record<string, unknown>;
    const beneficiariesRaw = Array.isArray(data.beneficiaries)
      ? (data.beneficiaries as Record<string, unknown>[])
      : [];
    return {
      summary: normalizeSummary(data.summary as Record<string, unknown> | undefined),
      beneficiaries: beneficiariesRaw.map(normalizeRow),
      page: normalizePage(
        data.page as Record<string, unknown> | undefined,
        page,
        size,
      ),
    };
  },

  async getDetail(beneficiaryId: number): Promise<VendorBeneficiaryDetail> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARIES}/${beneficiaryId}`);
    return normalizeDetail(unwrapPayload(response) as Record<string, unknown>);
  },

  async markVendorCorrectionRequired(
    beneficiaryId: number,
    payload: VendorBeneficiaryRejectedActionPayload,
  ): Promise<VendorBeneficiaryRejectedActionResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_VENDOR_CORRECTION(beneficiaryId),
      payload,
    );
    return normalizeRejectedAction(
      unwrapPayload(response) as Record<string, unknown>,
    );
  },

  async retrySbiRegistration(
    beneficiaryId: number,
    payload: VendorBeneficiaryRejectedActionPayload,
  ): Promise<VendorBeneficiaryRejectedActionResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_RETRY_SBI(beneficiaryId),
      payload,
    );
    return normalizeRejectedAction(
      unwrapPayload(response) as Record<string, unknown>,
    );
  },

  async rebuild(): Promise<VendorBeneficiaryRebuildResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARIES_REBUILD);
    const data = unwrapPayload(response) as Record<string, unknown>;
    return {
      hotelUpserted: Number(data.hotelUpserted ?? 0),
      transportUpserted: Number(data.transportUpserted ?? 0),
      skippedMissingBank: Number(data.skippedMissingBank ?? 0),
    };
  },

  async generateBatch(
    beneficiaryIds: number[],
  ): Promise<VendorBeneficiaryBatchGenerateResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCH_GENERATE, {
      beneficiaryIds,
    });
    const data = unwrapPayload(response) as Record<string, unknown>;
    return {
      batchId: Number(data.batchId),
      batchNumber: String(data.batchNumber ?? ""),
      fileName: String(data.fileName ?? "BENEFICIARY.txt"),
      totalRecords: Number(data.totalRecords ?? 0),
      generatedAt: strOrNull(data.generatedAt),
      downloadUrl: strOrNull(data.downloadUrl),
    };
  },

  async downloadBatch(batchId: number, fileName: string): Promise<void> {
    await downloadReportExportFile(
      API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCH_DOWNLOAD(batchId),
      fileName || "BENEFICIARY.txt",
    );
  },

  async downloadBeneficiaryFile(
    beneficiaryId: number,
    beneficiaryCode?: string | null,
  ): Promise<void> {
    const fileName = beneficiaryCode?.trim()
      ? `BENEFICIARY_${beneficiaryCode.trim()}.txt`
      : `BENEFICIARY_${beneficiaryId}.txt`;
    await downloadReportExportFile(
      API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_GENERATED_FILE(beneficiaryId),
      fileName,
    );
  },

  async listBatches(
    pageOrParams: number | VendorBeneficiaryBatchListParams = 0,
    size = 20,
  ): Promise<VendorBeneficiaryBatchList> {
    const params: VendorBeneficiaryBatchListParams =
      typeof pageOrParams === "number"
        ? { page: pageOrParams, size }
        : pageOrParams;
    const page = params.page ?? 0;
    const pageSize = params.size ?? size;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCHES}${buildQuery({
        page,
        size: pageSize,
        batchNumber: params.batchNumber?.trim() || undefined,
        fileName: params.fileName?.trim() || undefined,
        batchStatus: params.batchStatus || undefined,
      })}`,
    );
    const data = unwrapPayload(response) as Record<string, unknown>;
    const batchesRaw = Array.isArray(data.batches)
      ? (data.batches as Record<string, unknown>[])
      : [];
    return {
      batches: batchesRaw.map(normalizeBatchSummary),
      page: normalizePage(
        data.page as Record<string, unknown> | undefined,
        page,
        pageSize,
      ),
    };
  },

  async getBatchDetail(
    batchId: number,
    params: VendorBeneficiaryBatchDetailParams = {},
  ): Promise<VendorBeneficiaryBatchDetail> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCHES}/${batchId}${buildQuery({
        page,
        size,
        search: params.search?.trim() || undefined,
      })}`,
    );
    const data = unwrapPayload(response) as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[])
      : [];
    return {
      ...normalizeBatchSummary(data),
      items: itemsRaw.map(normalizeBatchItem),
      page: normalizePage(
        data.page as Record<string, unknown> | undefined,
        page,
        size,
      ),
    };
  },

  async submitBatchToBank(
    batchId: number,
    payload: VendorBeneficiaryBatchSubmitPayload = {},
  ): Promise<VendorBeneficiaryBatchTransitionResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCH_SUBMIT(batchId), {
      bankFileReferenceNumber: payload.bankFileReferenceNumber?.trim() || undefined,
      submissionRemarks: payload.submissionRemarks?.trim() || undefined,
    });
    return normalizeTransition(unwrapPayload(response) as Record<string, unknown>);
  },

  async markBatchPendingApproval(
    batchId: number,
  ): Promise<VendorBeneficiaryBatchTransitionResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_BATCH_PENDING(batchId));
    return normalizeTransition(unwrapPayload(response) as Record<string, unknown>);
  },
};
