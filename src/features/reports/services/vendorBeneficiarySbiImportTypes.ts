export type SbiImportStatus = "PREVIEWED" | "CONFIRMED" | "FAILED";

export type SbiResponseStatus = "APPROVED" | "REJECTED" | "UNKNOWN";

export type SbiValidationOutcome = "SUCCESS" | "FAILURE" | "UNKNOWN";

export type SbiReconciliationResult =
  | "VERIFIED"
  | "VALIDATION_FAILED_REVIEW_REQUIRED"
  | "REJECTED"
  | "UNMATCHED"
  | "DUPLICATE"
  | "MISMATCH"
  | "REVIEW_REQUIRED";

export type SbiImportPreviewSummary = {
  totalRecords: number;
  verifiedCount: number;
  rejectedCount: number;
  validationFailedCount: number;
  reviewRequiredCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  mismatchCount: number;
  errorCount: number;
  processedMessage: string;
};

export type SbiImportRecord = {
  id: number;
  rowNumber: number;
  beneficiaryName: string | null;
  beneficiaryCode: string | null;
  vendorType: "HOTEL" | "TRANSPORT" | null;
  staycoreVendorName: string | null;
  sbiStatus: string | null;
  sbiResponseStatus: SbiResponseStatus | null;
  maskedAccountNumber: string | null;
  ifscCode: string | null;
  beneficiaryType: string | null;
  beneficiaryActionType: string | null;
  validationStatus: string | null;
  sbiValidationStatus: SbiValidationOutcome | null;
  errorDescription: string | null;
  sbiResponseReceivedAt: string | null;
  reconciliationResult: SbiReconciliationResult;
  staycoreBeneficiaryId: number | null;
  staycoreBatchId: number | null;
  staycoreBatchNumber: string | null;
  staycoreBatchItemId: number | null;
  staycoreAccountHolderName: string | null;
  staycoreMaskedAccountNumber: string | null;
  staycoreIfscCode: string | null;
  staycoreBeneficiaryStatus: string | null;
  mismatchFields: string | null;
  applied: boolean;
};

export type SbiImportPreview = {
  importId: number;
  importNumber: string;
  originalFileName: string;
  importStatus: SbiImportStatus;
  uploadedAt: string | null;
  summary: SbiImportPreviewSummary;
  records: SbiImportRecord[];
};

export type SbiImportConfirmResult = {
  importId: number;
  importNumber: string;
  importStatus: SbiImportStatus;
  confirmedAt: string | null;
  verifiedCount: number;
  batchesUpdated: number;
  summary: SbiImportPreviewSummary;
  processedMessage: string;
  updatedBatchIds: number[];
};

export type SbiImportHistoryItem = {
  importId: number;
  importNumber: string;
  originalFileName: string;
  importStatus: SbiImportStatus;
  uploadedAt: string | null;
  uploadedByUserId: number | null;
  uploadedBy: string | null;
  confirmedAt: string | null;
  confirmedByUserId: number | null;
  confirmedBy: string | null;
  summary: SbiImportPreviewSummary;
  verifiedCount: number | null;
};

export type SbiImportHistoryPage = {
  items: SbiImportHistoryItem[];
  page: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
  };
};

export type SbiImportRecordsPage = {
  items: SbiImportRecord[];
  page: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
  };
};
