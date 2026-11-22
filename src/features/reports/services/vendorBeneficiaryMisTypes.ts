export type VendorBeneficiaryType = "HOTEL" | "TRANSPORT";
export type VendorBeneficiaryTypeFilter = "ALL" | VendorBeneficiaryType;
/** SB = same bank, OB = other bank */
export type BeneficiaryBankType = "SB" | "OB";

export type InternalBankVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type BeneficiaryRegistrationStatus =
  | "NOT_SUBMITTED"
  | "FILE_GENERATED"
  | "SUBMITTED_TO_BANK"
  | "PENDING_APPROVAL"
  | "VERIFIED"
  | "REJECTED"
  | "UPDATE_REQUIRED";

export type VendorBeneficiaryMisListParams = {
  page?: number;
  size?: number;
  sort?: string;
  sortDir?: "asc" | "desc" | string;
  vendorType?: VendorBeneficiaryTypeFilter;
  beneficiaryStatus?: BeneficiaryRegistrationStatus | "";
  internalBankVerificationStatus?: InternalBankVerificationStatus | "";
  search?: string;
};

export type VendorBeneficiaryMisRow = {
  beneficiaryId: number;
  vendorId: string;
  vendorName: string | null;
  vendorType: VendorBeneficiaryType;
  bankType: BeneficiaryBankType | null;
  contactMobile: string | null;
  contactEmail: string | null;
  bankName: string | null;
  maskedAccountNumber: string | null;
  ifscCode: string | null;
  beneficiaryCode: string;
  internalBankVerificationStatus: InternalBankVerificationStatus;
  beneficiaryStatus: BeneficiaryRegistrationStatus;
  eligibleForFileGeneration?: boolean;
  lastUpdated: string | null;
};

export type VendorBeneficiaryBatchGenerateResult = {
  batchId: number;
  batchNumber: string;
  fileName: string;
  totalRecords: number;
  generatedAt: string | null;
  downloadUrl: string | null;
};

export type BeneficiaryBatchStatus =
  | "GENERATED"
  | "DOWNLOADED"
  | "SUBMITTED_TO_BANK"
  | "PENDING_APPROVAL"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED_WITH_ERRORS";

export type VendorBeneficiaryBatchSummary = {
  batchId: number;
  batchNumber: string;
  fileName: string;
  totalRecords: number;
  generatedByUserId: number | null;
  generatedBy: string | null;
  generatedAt: string | null;
  batchStatus: BeneficiaryBatchStatus;
  downloadUrl: string | null;
  bankFileReferenceNumber: string | null;
  submittedByUserId: number | null;
  submittedBy: string | null;
  submittedAt: string | null;
  submissionRemarks: string | null;
};

export type VendorBeneficiaryBatchTransitionResult = {
  batchId: number;
  batchNumber: string;
  batchStatus: BeneficiaryBatchStatus;
  updatedBeneficiaries: number;
  skippedBeneficiaries: number;
  bankFileReferenceNumber: string | null;
  submissionRemarks: string | null;
};

export type VendorBeneficiaryBatchSubmitPayload = {
  bankFileReferenceNumber?: string;
  submissionRemarks?: string;
};

export type VendorBeneficiaryBatchItem = {
  beneficiaryId: number;
  beneficiaryCode: string;
  vendorId: string;
  vendorType: VendorBeneficiaryType;
  vendorName: string | null;
  fileLine: string | null;
  bankFlag: string | null;
  action: string | null;
  accountHolderName: string | null;
  /** Masked only — full account is never returned by the list/detail API. */
  maskedAccountNumber: string | null;
  bankName: string | null;
  ifscCode: string | null;
  currentBeneficiaryStatus: BeneficiaryRegistrationStatus | null;
  currentInternalBankVerificationStatus: InternalBankVerificationStatus | null;
};

export type VendorBeneficiaryBatchDetailParams = {
  page?: number;
  size?: number;
  search?: string;
};

export type VendorBeneficiaryBatchDetail = VendorBeneficiaryBatchSummary & {
  items: VendorBeneficiaryBatchItem[];
  page: VendorBeneficiaryMisPageMeta;
};

export type VendorBeneficiaryBatchListParams = {
  page?: number;
  size?: number;
  batchNumber?: string;
  fileName?: string;
  /** FILE_GENERATED (GENERATED+DOWNLOADED) or exact batch status. */
  batchStatus?:
    | "FILE_GENERATED"
    | "SUBMITTED_TO_BANK"
    | "GENERATED"
    | "DOWNLOADED"
    | "PENDING_APPROVAL"
    | "COMPLETED"
    | "PARTIALLY_COMPLETED"
    | "COMPLETED_WITH_ERRORS"
    | "";
};

export type VendorBeneficiaryBatchList = {
  batches: VendorBeneficiaryBatchSummary[];
  page: VendorBeneficiaryMisPageMeta;
};

export type VendorBeneficiaryFinanceAction =
  | "NONE"
  | "VENDOR_CORRECTION_REQUIRED"
  | "SBI_RETRY";

export type VendorBeneficiaryDetail = {
  beneficiaryId: number;
  vendorId: string;
  vendorName: string | null;
  vendorType: VendorBeneficiaryType;
  bankType: BeneficiaryBankType | null;
  beneficiaryCode: string;
  contactMobile: string | null;
  contactEmail: string | null;
  bankName: string | null;
  bankBranch: string | null;
  ifscCode: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  maskedAccountNumber: string | null;
  internalBankVerificationStatus: InternalBankVerificationStatus;
  beneficiaryStatus: BeneficiaryRegistrationStatus;
  lastUpdated: string | null;
  lastFileBatchId?: number | null;
  lastFileBatchNumber?: string | null;
  lastFileGeneratedAt?: string | null;
  lastFileGeneratedByUserId?: number | null;
  lastFileGeneratedBy?: string | null;
  verifiedAt?: string | null;
  verifiedByUserId?: number | null;
  verifiedBy?: string | null;
  verifiedReportFileName?: string | null;
  sbiResponseStatus?: string | null;
  sbiValidationStatus?: string | null;
  sbiErrorDescription?: string | null;
  sbiResponseReceivedAt?: string | null;
  sbiImportId?: number | null;
  financeAction?: VendorBeneficiaryFinanceAction | null;
  financeActionRemarks?: string | null;
  financeActionByUserId?: number | null;
  financeActionAt?: string | null;
  sbiRetryConfirmed?: boolean;
};

export type VendorBeneficiaryRejectedActionPayload = {
  remarks: string;
  sbiIssueResolvedConfirmed?: boolean;
};

export type VendorBeneficiaryRejectedActionResult = {
  beneficiaryId: number;
  beneficiaryCode: string;
  beneficiaryStatus: BeneficiaryRegistrationStatus;
  financeAction: VendorBeneficiaryFinanceAction;
  financeActionRemarks: string | null;
  financeActionByUserId: number | null;
  financeActionAt: string | null;
  eligibleForFileGeneration: boolean;
  message: string | null;
};

export type VendorBeneficiaryMisSummary = {
  totalBeneficiaries: number;
  verifiedBeneficiaries: number;
  fileGenerated: number;
  pendingApproval: number;
  notSubmitted: number;
  rejected: number;
};

export type VendorBeneficiaryMisPageMeta = {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  sort?: string;
  direction?: string;
};

export type VendorBeneficiaryMisDashboard = {
  summary: VendorBeneficiaryMisSummary;
  beneficiaries: VendorBeneficiaryMisRow[];
  page: VendorBeneficiaryMisPageMeta;
};

export type VendorBeneficiaryRebuildResult = {
  hotelUpserted: number;
  transportUpserted: number;
  skippedMissingBank: number;
};
