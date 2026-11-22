import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { downloadReportExportFile } from "@/features/reports/services/reportExportService";
import type {
  SbiImportConfirmResult,
  SbiImportHistoryPage,
  SbiImportPreview,
  SbiImportPreviewSummary,
  SbiImportRecord,
  SbiImportRecordsPage,
  SbiImportStatus,
  SbiReconciliationResult,
} from "./vendorBeneficiarySbiImportTypes";

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

/** Map legacy backend enum literals to the current reconciliation set. */
function canonicalizeReconciliationResult(
  value: unknown,
): SbiReconciliationResult {
  const raw = String(value ?? "REVIEW_REQUIRED");
  switch (raw) {
    case "APPROVED":
      return "VERIFIED";
    case "VALIDATION_FAILED":
      return "VALIDATION_FAILED_REVIEW_REQUIRED";
    case "INVALID":
      return "REVIEW_REQUIRED";
    case "MISMATCHED_BANK_DETAILS":
      return "MISMATCH";
    case "VERIFIED":
    case "VALIDATION_FAILED_REVIEW_REQUIRED":
    case "REJECTED":
    case "UNMATCHED":
    case "DUPLICATE":
    case "MISMATCH":
    case "REVIEW_REQUIRED":
      return raw;
    default:
      return "REVIEW_REQUIRED";
  }
}

function normalizeSummary(
  raw: Record<string, unknown> | undefined,
): SbiImportPreviewSummary {
  const totalRecords = Number(raw?.totalRecords ?? 0);
  const verifiedCount = Number(raw?.verifiedCount ?? raw?.approvedRecords ?? 0);
  const rejectedCount = Number(raw?.rejectedCount ?? raw?.rejectedRecords ?? 0);
  const validationFailedCount = Number(
    raw?.validationFailedCount ?? raw?.validationFailedRecords ?? 0,
  );
  const reviewRequiredCount = Number(raw?.reviewRequiredCount ?? 0);
  const unmatchedCount = Number(raw?.unmatchedCount ?? raw?.unmatchedRecords ?? 0);
  const duplicateCount = Number(raw?.duplicateCount ?? raw?.duplicateRecords ?? 0);
  const mismatchCount = Number(
    raw?.mismatchCount ?? raw?.mismatchedRecords ?? 0,
  );
  const errorCount = Number(raw?.errorCount ?? raw?.invalidRecords ?? 0);
  const processedMessage =
    strOrNull(raw?.processedMessage) ??
    `${totalRecords} records processed: ${verifiedCount} verified, ${rejectedCount} rejected, ${validationFailedCount} validation failures requiring review.`;
  return {
    totalRecords,
    verifiedCount,
    rejectedCount,
    validationFailedCount,
    reviewRequiredCount,
    unmatchedCount,
    duplicateCount,
    mismatchCount,
    errorCount,
    processedMessage,
  };
}

function normalizeRecord(raw: Record<string, unknown>): SbiImportRecord {
  const vendorTypeRaw = strOrNull(raw.vendorType);
  return {
    id: Number(raw.id),
    rowNumber: Number(raw.rowNumber ?? 0),
    beneficiaryName: strOrNull(raw.beneficiaryName),
    beneficiaryCode: strOrNull(raw.beneficiaryCode),
    vendorType:
      vendorTypeRaw === "HOTEL" || vendorTypeRaw === "TRANSPORT"
        ? vendorTypeRaw
        : null,
    staycoreVendorName: strOrNull(raw.staycoreVendorName),
    sbiStatus: strOrNull(raw.sbiStatus),
    sbiResponseStatus: strOrNull(raw.sbiResponseStatus) as
      | SbiImportRecord["sbiResponseStatus"]
      | null,
    maskedAccountNumber: strOrNull(raw.maskedAccountNumber),
    ifscCode: strOrNull(raw.ifscCode),
    beneficiaryType: strOrNull(raw.beneficiaryType),
    beneficiaryActionType: strOrNull(raw.beneficiaryActionType),
    validationStatus: strOrNull(raw.validationStatus),
    sbiValidationStatus: strOrNull(raw.sbiValidationStatus) as
      | SbiImportRecord["sbiValidationStatus"]
      | null,
    errorDescription: strOrNull(raw.errorDescription),
    sbiResponseReceivedAt: strOrNull(raw.sbiResponseReceivedAt),
    reconciliationResult: canonicalizeReconciliationResult(
      raw.reconciliationResult,
    ),
    staycoreBeneficiaryId:
      raw.staycoreBeneficiaryId != null
        ? Number(raw.staycoreBeneficiaryId)
        : null,
    staycoreBatchId:
      raw.staycoreBatchId != null ? Number(raw.staycoreBatchId) : null,
    staycoreBatchNumber: strOrNull(raw.staycoreBatchNumber),
    staycoreBatchItemId:
      raw.staycoreBatchItemId != null ? Number(raw.staycoreBatchItemId) : null,
    staycoreAccountHolderName: strOrNull(raw.staycoreAccountHolderName),
    staycoreMaskedAccountNumber: strOrNull(raw.staycoreMaskedAccountNumber),
    staycoreIfscCode: strOrNull(raw.staycoreIfscCode),
    staycoreBeneficiaryStatus: strOrNull(raw.staycoreBeneficiaryStatus),
    mismatchFields: strOrNull(raw.mismatchFields),
    applied: Boolean(raw.applied),
  };
}

function normalizePreview(raw: Record<string, unknown>): SbiImportPreview {
  const recordsRaw = Array.isArray(raw.records)
    ? (raw.records as Record<string, unknown>[])
    : [];
  return {
    importId: Number(raw.importId),
    importNumber: String(raw.importNumber ?? ""),
    originalFileName: String(raw.originalFileName ?? ""),
    importStatus: String(raw.importStatus ?? "PREVIEWED") as SbiImportStatus,
    uploadedAt: strOrNull(raw.uploadedAt),
    summary: normalizeSummary(raw.summary as Record<string, unknown> | undefined),
    records: recordsRaw.map(normalizeRecord),
  };
}

export const vendorBeneficiarySbiImportService = {
  async uploadAndPreview(file: File): Promise<SbiImportPreview> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT_UPLOAD, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizePreview(unwrapPayload(response) as Record<string, unknown>);
  },

  async getPreview(importId: number): Promise<SbiImportPreview> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT_DETAIL(importId));
    return normalizePreview(unwrapPayload(response) as Record<string, unknown>);
  },

  async confirm(
    importId: number,
    remarks?: string,
  ): Promise<SbiImportConfirmResult> {
    const response = await apiClient.post<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT_CONFIRM(importId)}${buildQuery(
        { remarks },
      )}`,
    );
    const data = unwrapPayload(response) as Record<string, unknown>;
    return {
      importId: Number(data.importId),
      importNumber: String(data.importNumber ?? ""),
      importStatus: String(data.importStatus ?? "CONFIRMED") as SbiImportStatus,
      confirmedAt: strOrNull(data.confirmedAt),
      verifiedCount: Number(
        data.verifiedCount ?? data.appliedApprovedCount ?? 0,
      ),
      batchesUpdated: Number(data.batchesUpdated ?? 0),
      processedMessage:
        strOrNull(data.processedMessage) ??
        normalizeSummary(data.summary as Record<string, unknown> | undefined)
          .processedMessage,
      summary: normalizeSummary(
        data.summary as Record<string, unknown> | undefined,
      ),
      updatedBatchIds: Array.isArray(data.updatedBatchIds)
        ? (data.updatedBatchIds as unknown[]).map((id) => Number(id))
        : [],
    };
  },

  async listHistory(
    page = 0,
    size = 20,
    status?: SbiImportStatus | "",
  ): Promise<SbiImportHistoryPage> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORTS}${buildQuery({
        page,
        size,
        status: status || undefined,
      })}`,
    );
    const data = unwrapPayload(response) as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[])
      : [];
    const pageRaw = (data.page as Record<string, unknown> | undefined) ?? {};
    return {
      items: itemsRaw.map((row) => ({
        importId: Number(row.importId),
        importNumber: String(row.importNumber ?? ""),
        originalFileName: String(row.originalFileName ?? ""),
        importStatus: String(row.importStatus ?? "PREVIEWED") as SbiImportStatus,
        uploadedAt: strOrNull(row.uploadedAt),
        uploadedByUserId:
          row.uploadedByUserId != null ? Number(row.uploadedByUserId) : null,
        uploadedBy: strOrNull(row.uploadedBy),
        confirmedAt: strOrNull(row.confirmedAt),
        confirmedByUserId:
          row.confirmedByUserId != null ? Number(row.confirmedByUserId) : null,
        confirmedBy: strOrNull(row.confirmedBy),
        summary: normalizeSummary(
          row.summary as Record<string, unknown> | undefined,
        ),
        verifiedCount:
          row.verifiedCount != null
            ? Number(row.verifiedCount)
            : row.appliedApprovedCount != null
              ? Number(row.appliedApprovedCount)
              : null,
      })),
      page: {
        page: Number(pageRaw.page ?? page),
        size: Number(pageRaw.size ?? size),
        totalPages: Number(pageRaw.totalPages ?? 0),
        totalElements: Number(pageRaw.totalElements ?? 0),
      },
    };
  },

  async downloadUploadedReport(
    importId: number,
    fileName?: string | null,
  ): Promise<void> {
    await downloadReportExportFile(
      API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT_DOWNLOAD(importId),
      fileName?.trim() || `bank-import-${importId}.xls`,
    );
  },

  async listRecords(
    importId: number,
    page = 0,
    size = 50,
    result?: SbiReconciliationResult | "",
  ): Promise<SbiImportRecordsPage> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT_RECORDS(importId)}${buildQuery(
        { page, size, result: result || undefined },
      )}`,
    );
    const data = unwrapPayload(response) as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[])
      : [];
    const pageRaw = (data.page as Record<string, unknown> | undefined) ?? {};
    return {
      items: itemsRaw.map(normalizeRecord),
      page: {
        page: Number(pageRaw.page ?? page),
        size: Number(pageRaw.size ?? size),
        totalPages: Number(pageRaw.totalPages ?? 0),
        totalElements: Number(pageRaw.totalElements ?? 0),
      },
    };
  },
};
