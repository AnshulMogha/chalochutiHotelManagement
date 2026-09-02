export const SETTLEMENT_COMPONENTS = ["HOTEL", "TRANSPORT"] as const;
export type SettlementComponent = (typeof SETTLEMENT_COMPONENTS)[number];

export const SETTLEMENT_CYCLES = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"] as const;
export type SettlementCycle = (typeof SETTLEMENT_CYCLES)[number];

export const SETTLEMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAYMENT_QUEUED",
  "PAYMENT_PROCESSING",
  "PAID",
  "FAILED",
  "UNDER_REVIEW",
  "REVERSED",
  "DISPUTED",
] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

/** Reject allowed for PENDING and APPROVED (before release-payment). */
export function canRejectSettlementStatus(
  status: SettlementStatus | string | null | undefined,
): boolean {
  const value = String(status || "").toUpperCase();
  return value === "PENDING" || value === "APPROVED";
}

/** Maker-checker: creator cannot approve or reject their own settlement. */
export function isSettlementMaker(
  settlement: Pick<SettlementSummary, "createdBy"> | null | undefined,
  viewerUserId: number | undefined | null,
): boolean {
  if (!settlement || viewerUserId == null || settlement.createdBy == null) {
    return false;
  }
  return String(settlement.createdBy) === String(viewerUserId);
}

export function canCheckerApproveOrRejectSettlement(
  settlement: Pick<SettlementSummary, "createdBy"> | null | undefined,
  viewerUserId: number | undefined | null,
  hasCheckerPermission: boolean,
): boolean {
  return hasCheckerPermission && !isSettlementMaker(settlement, viewerUserId);
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface SettlementPeriod {
  from: string | null;
  to: string | null;
}

export interface WorkbenchRow {
  supplierId: string;
  supplierName: string;
  supplierType: string | null;
  component: SettlementComponent | string;
  cycle: SettlementCycle | string | null;
  completedItems: number;
  cancellationItems: number;
  partialCancellationItems: number;
  totalEligibleItems: number;
  grossAmount: MoneyAmount | null;
  commission: MoneyAmount | null;
  tds: MoneyAmount | null;
  tcs: MoneyAmount | null;
  gst: MoneyAmount | null;
  payableAmount: MoneyAmount | null;
  bankVerified: boolean;
  existingDraft: boolean;
  settlementReady: boolean;
  blockedReason: string | null;
  settlementPeriod: SettlementPeriod | null;
}

export interface WorkbenchResponse {
  content: WorkbenchRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface WorkbenchParams {
  component: SettlementComponent | string;
  cycle?: string;
  supplierId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  eligibleOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SettlementWarning {
  code: string;
  message: string;
}

export interface PreviewBookingLine {
  bookingId?: string | number | null;
  bookingRef?: string | null;
  settlementReason?: string | null;
  cancelled?: boolean;
  cancellationPolicyType?: string | null;
  serviceDate?: string | null;
  guestName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  customerPaid?: MoneyAmount | null;
  supplierCharge?: MoneyAmount | null;
  grossAmount?: MoneyAmount | null;
  commission?: MoneyAmount | null;
  tds?: MoneyAmount | null;
  tcs?: MoneyAmount | null;
  gst?: MoneyAmount | null;
  adjustments?: MoneyAmount | null;
  payableAmount?: MoneyAmount | null;
  commissionSource?: string | null;
}

export interface SettlementPreview {
  supplierName: string;
  component: SettlementComponent | string;
  bankVerified: boolean;
  financialItemCount: number;
  grossAmount: MoneyAmount | null;
  commission: MoneyAmount | null;
  tds: MoneyAmount | null;
  tcs: MoneyAmount | null;
  gst: MoneyAmount | null;
  adjustments: MoneyAmount | null;
  payableAmount: MoneyAmount | null;
  previewFingerprint: string;
  latestFinancialChangeAt: string | null;
  bookings: PreviewBookingLine[];
  warnings: SettlementWarning[];
}

export interface PreviewParams {
  supplierId: string;
  component: SettlementComponent | string;
  fromDate?: string;
  toDate?: string;
  cycle?: string;
}

export interface GenerateSettlementRequest {
  supplierId: string;
  component: SettlementComponent | string;
  fromDate?: string | null;
  toDate?: string | null;
  cycle?: string | null;
  previewFingerprint: string;
}

export interface SettlementSummary {
  settlementId: string;
  settlementNo?: string;
  status: SettlementStatus | string;
  financialItemCount?: number;
  payableAmount: MoneyAmount | null;
  grossAmount?: MoneyAmount | null;
  createdAt?: string | null;
  createdBy?: string | number | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  previewFingerprint?: string | null;
  latestFinancialChangeAt?: string | null;
  supplierName?: string | null;
  supplierType?: string | null;
  supplierId?: string | null;
  component?: SettlementComponent | string | null;
  cycle?: SettlementCycle | string | null;
  period?: SettlementPeriod | null;
  payoutStatus?: string | null;
  payoutId?: string | null;
  payoutRequestedAt?: string | null;
  payoutCompletedAt?: string | null;
  utr?: string | null;
  message?: string | null;
}

export interface QueueListParams {
  supplierName?: string;
  component?: string;
  fromDate?: string;
  toDate?: string;
  settlementNo?: string;
  page?: number;
  size?: number;
}

export interface QueueListResponse {
  content: SettlementSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pendingCount?: number;
}

export interface SettlementMisSummary {
  totalPayable: MoneyAmount | null;
  totalSettlements: number;
  paid: MoneyAmount | null;
  pending: MoneyAmount | null;
}

export interface SettlementMisRow {
  settlementNo: string;
  supplierId?: string | null;
  supplierName: string;
  supplierType?: string | null;
  component: SettlementComponent | string;
  period: SettlementPeriod | null;
  status: SettlementStatus | string;
  payoutStatus: string | null;
  gross: MoneyAmount | null;
  payable: MoneyAmount | null;
  utr: string | null;
}

export interface SettlementMisResponse {
  fromDate?: string | null;
  toDate?: string | null;
  summary: SettlementMisSummary;
  settlements: SettlementMisRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SettlementMisParams {
  fromDate?: string;
  toDate?: string;
  component?: string;
  supplierType?: string;
  payoutStatus?: string;
  supplierName?: string;
  settlementNo?: string;
  page?: number;
  size?: number;
}

export interface StatusHistoryItem {
  status: string;
  changedAt: string;
  changedBy?: string | null;
  note?: string | null;
}

export interface PaymentHistoryItem {
  payoutId?: string | null;
  payoutReference?: string | null;
  utr?: string | null;
  amount?: MoneyAmount | null;
  status?: string | null;
  requestedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
}

export interface SettlementDetail extends SettlementSummary {
  supplierId?: string | null;
  payoutRequestedAt?: string | null;
  payoutCompletedAt?: string | null;
  commission?: MoneyAmount | null;
  tds?: MoneyAmount | null;
  tcs?: MoneyAmount | null;
  gst?: MoneyAmount | null;
  adjustments?: MoneyAmount | null;
  bankVerified?: boolean;
  lineItems?: PreviewBookingLine[];
  statusHistory?: StatusHistoryItem[];
  paymentHistory?: PaymentHistoryItem[];
}
