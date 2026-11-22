export type VendorBankChangeVendorType = "HOTEL" | "TRANSPORT";
export type VendorBankChangeVendorTypeFilter = "ALL" | VendorBankChangeVendorType;

export type InternalBankVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type VendorBankChangeRequestStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type VendorBankChangeRequestSource =
  | "HOTEL_OWNER"
  | "TRANSPORT_OWNER"
  | "ADMIN";

export type BeneficiaryRegistrationStatus =
  | "NOT_SUBMITTED"
  | "FILE_GENERATED"
  | "SUBMITTED_TO_BANK"
  | "PENDING_APPROVAL"
  | "VERIFIED"
  | "REJECTED"
  | "UPDATE_REQUIRED";

export type VendorBankChangeListParams = {
  page?: number;
  size?: number;
  sort?: string;
  sortDir?: "asc" | "desc" | string;
  vendorType?: VendorBankChangeVendorTypeFilter;
  internalBankVerificationStatus?: InternalBankVerificationStatus | "";
  changeRequestStatus?: VendorBankChangeRequestStatus | "";
  beneficiaryStatus?: BeneficiaryRegistrationStatus | "";
  vendorName?: string;
  vendorId?: string;
  search?: string;
  fromAt?: string;
  toAt?: string;
};

/** Main MIS row = vendor bank account (all verification statuses). */
export type VendorBankVerificationMisRow = {
  beneficiaryId: number;
  vendorType: VendorBankChangeVendorType;
  vendorId: string;
  vendorName: string | null;
  contactMobile: string | null;
  contactEmail: string | null;
  bankName: string | null;
  maskedAccountNumber: string | null;
  ifscCode: string | null;
  bankBranch: string | null;
  accountHolderName: string | null;
  internalBankVerificationStatus: InternalBankVerificationStatus;
  beneficiaryStatus: BeneficiaryRegistrationStatus | null;
  lastUpdated: string | null;
  changeRequestId: number | null;
  changeRequestStatus: VendorBankChangeRequestStatus | null;
  changeRequestedAt: string | null;
  changeRequestedByName: string | null;
  hasPendingChangeRequest: boolean;
};

/** View drawer — full account number / holder (finance roles). */
export type VendorBankVerificationDetail = VendorBankVerificationMisRow & {
  accountNumber: string | null;
  ledgerInternalBankVerificationStatus?: InternalBankVerificationStatus | null;
  liveBankVerificationStatus?: InternalBankVerificationStatus | null;
  allowsInternalVerification?: boolean;
  latestChangeRequestId?: number | null;
  latestChangeRequestStatus?: VendorBankChangeRequestStatus | null;
};

export type VendorBankChangeRequest = {
  id: number;
  vendorType: VendorBankChangeVendorType;
  vendorId: string;
  vendorName: string | null;
  contactMobile: string | null;
  contactEmail: string | null;
  sourceBankDetailId: number | null;
  status: VendorBankChangeRequestStatus;
  oldAccountHolderName: string | null;
  oldAccountNumber: string | null;
  oldIfsc: string | null;
  oldBankName: string | null;
  oldBankBranch: string | null;
  proposedAccountHolderName: string | null;
  proposedAccountNumber: string | null;
  proposedIfsc: string | null;
  proposedBankName: string | null;
  proposedBankBranch: string | null;
  bankProofDocumentKey: string | null;
  bankProofDocumentUrl: string | null;
  requestedBy: number | null;
  requestedByName: string | null;
  requestedAt: string | null;
  requestSource: VendorBankChangeRequestSource | null;
  changeReason: string | null;
  approvedBy: number | null;
  approvedByName: string | null;
  approvedAt: string | null;
  approvalRemarks: string | null;
  rejectedBy: number | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionRemarks: string | null;
  cancelledBy: number | null;
  cancelledAt: string | null;
  beneficiaryStatus: BeneficiaryRegistrationStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type VendorBankChangeMisSummary = {
  totalVendorAccounts: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  changeRequestPending: number;
  reVerificationRequired: number;
  sbiRegistrationPending: number;
  sbiVerified: number;
  total: number;
};

export type VendorBankChangeMisDashboard = {
  summary: VendorBankChangeMisSummary;
  items: VendorBankVerificationMisRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
