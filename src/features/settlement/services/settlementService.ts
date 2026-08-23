import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import type {
  GenerateSettlementRequest,
  MoneyAmount,
  PreviewParams,
  QueueListParams,
  QueueListResponse,
  SettlementDetail,
  SettlementMisParams,
  SettlementMisResponse,
  SettlementPreview,
  SettlementSummary,
  SettlementPeriod,
  PaymentHistoryItem,
  StatusHistoryItem,
  WorkbenchParams,
  WorkbenchResponse,
} from "./settlementTypes";

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function money(raw: unknown): MoneyAmount | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const amount = Number(obj.amount);
  if (!Number.isFinite(amount)) return null;
  return { amount, currency: String(obj.currency || "INR") };
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

function normalizeWorkbenchRow(raw: Record<string, unknown>) {
  const periodRaw =
    raw.settlementPeriod && typeof raw.settlementPeriod === "object"
      ? (raw.settlementPeriod as Record<string, unknown>)
      : null;
  const periodFrom =
    (periodRaw?.from as string | null | undefined) ??
    (raw.fromDate as string | null | undefined) ??
    null;
  const periodTo =
    (periodRaw?.to as string | null | undefined) ??
    (raw.toDate as string | null | undefined) ??
    null;
  return {
    supplierId: String(raw.supplierId || ""),
    supplierName: String(raw.supplierName || ""),
    supplierType: (raw.supplierType as string | null) ?? null,
    component: String(raw.component || ""),
    cycle: (raw.cycle as string | null) ?? null,
    completedItems: Number(raw.completedItems ?? 0),
    cancellationItems: Number(raw.cancellationItems ?? 0),
    partialCancellationItems: Number(raw.partialCancellationItems ?? 0),
    totalEligibleItems: Number(raw.totalEligibleItems ?? 0),
    grossAmount: money(raw.grossAmount),
    commission: money(raw.commission),
    tds: money(raw.tds),
    tcs: money(raw.tcs),
    gst: money(raw.gst),
    payableAmount: money(raw.payableAmount),
    bankVerified: !!raw.bankVerified,
    existingDraft: !!raw.existingDraft,
    settlementReady: !!raw.settlementReady,
    blockedReason: (raw.blockedReason as string | null) ?? null,
    settlementPeriod:
      periodFrom || periodTo ? { from: periodFrom, to: periodTo } : null,
  };
}

function normalizePreview(raw: Record<string, unknown>): SettlementPreview {
  const bookingsRaw = Array.isArray(raw.bookings) ? raw.bookings : [];
  const warningsRaw = Array.isArray(raw.warnings) ? raw.warnings : [];
  return {
    supplierName: String(raw.supplierName || ""),
    component: String(raw.component || ""),
    bankVerified: !!raw.bankVerified,
    financialItemCount: Number(raw.financialItemCount ?? 0),
    grossAmount: money(raw.grossAmount),
    commission: money(raw.commission),
    tds: money(raw.tds),
    tcs: money(raw.tcs),
    gst: money(raw.gst),
    adjustments: money(raw.adjustments),
    payableAmount: money(raw.payableAmount),
    previewFingerprint: String(raw.previewFingerprint || ""),
    latestFinancialChangeAt:
      (raw.latestFinancialChangeAt as string | null) ?? null,
    bookings: bookingsRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      const bookingId = obj.bookingId ?? null;
      return {
        bookingId,
        bookingRef:
          (obj.bookingRef as string | null) ??
          (obj.bookingReference as string | null) ??
          (bookingId != null ? String(bookingId) : null),
        settlementReason: (obj.settlementReason as string | null) ?? null,
        cancelled: obj.cancelled != null ? !!obj.cancelled : undefined,
        cancellationPolicyType:
          (obj.cancellationPolicyType as string | null) ?? null,
        serviceDate: (obj.serviceDate as string | null) ?? null,
        guestName: (obj.guestName as string | null) ?? null,
        checkIn: (obj.checkIn as string | null) ?? null,
        checkOut: (obj.checkOut as string | null) ?? null,
        customerPaid: money(obj.customerPaid),
        supplierCharge: money(obj.supplierCharge),
        grossAmount: money(obj.grossAmount || obj.supplierCharge),
        commission: money(obj.commission),
        tds: money(obj.tds),
        tcs: money(obj.tcs),
        gst: money(obj.gst),
        adjustments: money(obj.adjustments),
        payableAmount: money(obj.payableAmount),
        commissionSource: (obj.commissionSource as string | null) ?? null,
      };
    }),
    warnings: warningsRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        code: String(obj.code || ""),
        message: String(obj.message || ""),
      };
    }),
  };
}

function normalizeSettlementSummary(
  raw: Record<string, unknown>,
): SettlementSummary {
  const settlementNo = String(raw.settlementNo || raw.settlementId || raw.id || "");
  return {
    settlementId: settlementNo,
    settlementNo,
    status: String(raw.status || ""),
    financialItemCount: Number(raw.financialItemCount ?? 0),
    payableAmount: money(raw.payableAmount),
    grossAmount: money(raw.grossAmount),
    createdAt: (raw.createdAt as string | null) ?? null,
    createdBy: raw.createdBy as string | number | null,
    createdByName: (raw.createdByName as string | null) ?? null,
    createdByRole: (raw.createdByRole as string | null) ?? null,
    approvedBy: (raw.approvedBy as string | null) ?? null,
    approvedAt: (raw.approvedAt as string | null) ?? null,
    rejectedBy: (raw.rejectedBy as string | null) ?? null,
    rejectedAt: (raw.rejectedAt as string | null) ?? null,
    rejectionReason: (raw.rejectionReason as string | null) ?? null,
    previewFingerprint: (raw.previewFingerprint as string | null) ?? null,
    latestFinancialChangeAt:
      (raw.latestFinancialChangeAt as string | null) ?? null,
    supplierName: (raw.supplierName as string | null) ?? null,
    supplierType: (raw.supplierType as string | null) ?? null,
    supplierId: raw.supplierId != null ? String(raw.supplierId) : null,
    component: (raw.component as string | null) ?? null,
    cycle: (raw.cycle as string | null) ?? null,
    period: normalizeMisPeriod(raw),
    payoutStatus: (raw.payoutStatus as string | null) ?? null,
    payoutId: (raw.payoutId as string | null) ?? null,
    payoutRequestedAt: (raw.payoutRequestedAt as string | null) ?? null,
    payoutCompletedAt: (raw.payoutCompletedAt as string | null) ?? null,
    utr: (raw.utr as string | null) ?? null,
    message: (raw.message as string | null) ?? null,
  };
}

function normalizeQueueResponse(raw: Record<string, unknown>): QueueListResponse {
  const contentRaw = Array.isArray(raw.content) ? raw.content : [];
  return {
    content: contentRaw.map((item) =>
      normalizeSettlementSummary(
        (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >,
      ),
    ),
    page: Number(raw.page ?? 0),
    size: Number(raw.size ?? 20),
    totalElements: Number(raw.totalElements ?? 0),
    totalPages: computeTotalPages(raw),
    pendingCount:
      raw.pendingCount != null ? Number(raw.pendingCount) : undefined,
  };
}

function normalizeDetail(raw: Record<string, unknown>): SettlementDetail {
  const base = normalizeSettlementSummary(raw);
  const lineItemsRaw = Array.isArray(raw.lineItems)
    ? raw.lineItems
    : Array.isArray(raw.bookings)
      ? raw.bookings
      : [];
  const statusHistoryRaw = Array.isArray(raw.statusHistory)
    ? raw.statusHistory
    : Array.isArray(raw.statusTimeline)
      ? raw.statusTimeline
      : [];
  const paymentHistoryRaw = Array.isArray(raw.paymentHistory)
    ? raw.paymentHistory
    : [];

  const statusHistory = statusHistoryRaw.map((item) =>
    normalizeHistoryItem(
      (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >,
    ),
  );

  const detail: SettlementDetail = {
    ...base,
    approvedBy:
      base.approvedBy ||
      findApprovedByFromTimeline(statusHistory) ||
      null,
    commission: money(raw.commission),
    tds: money(raw.tds),
    tcs: money(raw.tcs),
    gst: money(raw.gst),
    adjustments: money(raw.adjustments),
    bankVerified: raw.bankVerified != null ? !!raw.bankVerified : undefined,
    lineItems: lineItemsRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        bookingId: obj.bookingId ?? null,
        bookingRef:
          (obj.bookingRef as string | null) ??
          (obj.bookingReference as string | null) ??
          null,
        settlementReason: (obj.settlementReason as string | null) ?? null,
        cancelled: obj.cancelled != null ? !!obj.cancelled : undefined,
        cancellationPolicyType:
          (obj.cancellationPolicyType as string | null) ?? null,
        serviceDate: (obj.serviceDate as string | null) ?? null,
        guestName: (obj.guestName as string | null) ?? null,
        checkIn: (obj.checkIn as string | null) ?? null,
        checkOut: (obj.checkOut as string | null) ?? null,
        customerPaid: money(obj.customerPaid),
        supplierCharge: money(obj.supplierCharge),
        grossAmount: money(obj.grossAmount),
        commission: money(obj.commission),
        tds: money(obj.tds),
        tcs: money(obj.tcs),
        gst: money(obj.gst),
        adjustments: money(obj.adjustments ?? obj.cancellationAdjustment),
        payableAmount: money(obj.payableAmount),
        commissionSource: (obj.commissionSource as string | null) ?? null,
      };
    }),
    statusHistory,
    paymentHistory: paymentHistoryRaw.map((item) =>
      normalizePaymentHistoryItem(
        (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >,
      ),
    ),
  };

  return detail;
}

function normalizeHistoryItem(raw: Record<string, unknown>): StatusHistoryItem {
  const changedByName = raw.changedByName as string | null | undefined;
  const changedById = raw.changedBy;
  return {
    status: String(raw.status || raw.to || raw.newStatus || ""),
    changedAt: String(raw.changedAt || raw.at || raw.createdAt || ""),
    changedBy:
      changedByName ||
      (changedById != null ? String(changedById) : null) ||
      null,
    note: (raw.note as string | null) ?? (raw.remarks as string | null) ?? null,
  };
}

function normalizePaymentHistoryItem(
  raw: Record<string, unknown>,
): PaymentHistoryItem {
  return {
    payoutId: (raw.payoutId as string | null) ?? null,
    payoutReference: (raw.payoutReference as string | null) ?? null,
    utr: (raw.utr as string | null) ?? null,
    amount: money(raw.amount),
    status: (raw.status as string | null) ?? null,
    requestedAt: (raw.requestedAt as string | null) ?? null,
    completedAt: (raw.completedAt as string | null) ?? null,
    failedAt: (raw.failedAt as string | null) ?? null,
    failureReason: (raw.failureReason as string | null) ?? null,
  };
}

function findApprovedByFromTimeline(
  timeline: StatusHistoryItem[],
): string | null {
  const approved = timeline.find(
    (item) => String(item.status).toUpperCase() === "APPROVED",
  );
  return approved?.changedBy ?? null;
}

export type SettlementApiResult<T> = {
  data: T;
  raw: unknown;
};

function computeTotalPages(payload: Record<string, unknown>): number {
  const explicit = Number(payload.totalPages);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const totalElements = Number(payload.totalElements ?? 0);
  const size = Math.max(Number(payload.size ?? 20), 1);
  return totalElements > 0 ? Math.ceil(totalElements / size) : 0;
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function toResult<T>(
  response: unknown,
  normalize: (payload: Record<string, unknown>) => T,
): SettlementApiResult<T> {
  return {
    data: normalize(asRecord(unwrapPayload(response as ApiSuccessResponse<T> | T))),
    raw: response,
  };
}

function normalizeMisPeriod(
  obj: Record<string, unknown>,
): SettlementPeriod | null {
  const periodRaw =
    obj.period && typeof obj.period === "object"
      ? (obj.period as Record<string, unknown>)
      : null;
  if (periodRaw) {
    return {
      from: (periodRaw.from as string | null) ?? null,
      to: (periodRaw.to as string | null) ?? null,
    };
  }
  const from = (obj.fromDate as string | null) ?? null;
  const to = (obj.toDate as string | null) ?? null;
  if (!from && !to) return null;
  return { from, to };
}

function normalizeMis(payload: Record<string, unknown>): SettlementMisResponse {
  const summaryRaw =
    payload.summary && typeof payload.summary === "object"
      ? (payload.summary as Record<string, unknown>)
      : {};
  const settlementsRaw = Array.isArray(payload.settlements)
    ? payload.settlements
    : Array.isArray(payload.content)
      ? payload.content
      : [];
  return {
    fromDate: (payload.fromDate as string | null) ?? null,
    toDate: (payload.toDate as string | null) ?? null,
    summary: {
      totalPayable: money(summaryRaw.totalPayable),
      totalSettlements: Number(summaryRaw.totalSettlements ?? 0),
      paid: money(summaryRaw.paid),
      pending: money(summaryRaw.pending),
    },
    settlements: settlementsRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        settlementNo: String(obj.settlementNo || obj.settlementId || ""),
        supplierId: (obj.supplierId as string | null) ?? null,
        supplierName: String(obj.supplierName || ""),
        supplierType: (obj.supplierType as string | null) ?? null,
        component: String(obj.component || ""),
        period: normalizeMisPeriod(obj),
        status: String(obj.status || ""),
        payoutStatus: (obj.payoutStatus as string | null) ?? null,
        gross: money(obj.gross || obj.grossAmount),
        payable: money(obj.payable || obj.payableAmount),
        utr: (obj.utr as string | null) ?? null,
      };
    }),
    page: Number(payload.page ?? 0),
    size: Number(payload.size ?? 20),
    totalElements: Number(payload.totalElements ?? 0),
    totalPages: computeTotalPages(payload),
  };
}

function normalizeWorkbench(payload: Record<string, unknown>): WorkbenchResponse {
  const contentRaw = Array.isArray(payload.content) ? payload.content : [];
  return {
    content: contentRaw.map((item) =>
      normalizeWorkbenchRow(
        (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >,
      ),
    ),
    page: Number(payload.page ?? 0),
    size: Number(payload.size ?? 20),
    totalElements: Number(payload.totalElements ?? 0),
    totalPages: computeTotalPages(payload),
  };
}

export const settlementService = {
  async getWorkbench(
    params: WorkbenchParams,
  ): Promise<SettlementApiResult<WorkbenchResponse>> {
    const response = await apiClient.get<
      ApiSuccessResponse<WorkbenchResponse> | WorkbenchResponse
    >(
      `${API_ENDPOINTS.SETTLEMENT.WORKBENCH}${buildQuery({
        ...params,
        eligibleOnly: params.eligibleOnly ?? true,
      })}`,
    );
    return toResult(response, normalizeWorkbench);
  },

  async getPreview(
    params: PreviewParams,
  ): Promise<SettlementApiResult<SettlementPreview>> {
    const response = await apiClient.get<
      ApiSuccessResponse<SettlementPreview> | SettlementPreview
    >(`${API_ENDPOINTS.SETTLEMENT.PREVIEW}${buildQuery(params)}`);
    return toResult(response, normalizePreview);
  },

  async generateSettlement(
    body: GenerateSettlementRequest,
  ): Promise<SettlementApiResult<SettlementSummary>> {
    const response = await apiClient.post<
      ApiSuccessResponse<SettlementSummary> | SettlementSummary
    >(API_ENDPOINTS.SETTLEMENT.GENERATE, body);
    return toResult(response, normalizeSettlementSummary);
  },

  async getPending(
    params: QueueListParams = {},
  ): Promise<SettlementApiResult<QueueListResponse>> {
    const response = await apiClient.get<
      ApiSuccessResponse<QueueListResponse> | QueueListResponse
    >(`${API_ENDPOINTS.SETTLEMENT.PENDING}${buildQuery(params)}`);
    return toResult(response, normalizeQueueResponse);
  },

  async getApproved(
    params: QueueListParams = {},
  ): Promise<SettlementApiResult<QueueListResponse>> {
    const response = await apiClient.get<
      ApiSuccessResponse<QueueListResponse> | QueueListResponse
    >(`${API_ENDPOINTS.SETTLEMENT.APPROVED}${buildQuery(params)}`);
    return toResult(response, normalizeQueueResponse);
  },

  async getRejected(
    params: QueueListParams = {},
  ): Promise<SettlementApiResult<QueueListResponse>> {
    const response = await apiClient.get<
      ApiSuccessResponse<QueueListResponse> | QueueListResponse
    >(`${API_ENDPOINTS.SETTLEMENT.REJECTED}${buildQuery(params)}`);
    return toResult(response, normalizeQueueResponse);
  },

  async getMis(
    params: SettlementMisParams = {},
  ): Promise<SettlementApiResult<SettlementMisResponse>> {
    const response = await apiClient.get<
      ApiSuccessResponse<SettlementMisResponse> | SettlementMisResponse
    >(`${API_ENDPOINTS.SETTLEMENT.MIS}${buildQuery(params)}`);
    return toResult(response, normalizeMis);
  },

  async getDetail(
    settlementNo: string,
  ): Promise<SettlementApiResult<SettlementDetail>> {
    const response = await apiClient.get<
      ApiSuccessResponse<SettlementDetail> | SettlementDetail
    >(API_ENDPOINTS.SETTLEMENT.BY_ID(settlementNo));
    return toResult(response, normalizeDetail);
  },

  async approve(
    settlementNo: string,
  ): Promise<SettlementApiResult<SettlementSummary>> {
    const response = await apiClient.post<
      ApiSuccessResponse<SettlementSummary> | SettlementSummary
    >(API_ENDPOINTS.SETTLEMENT.APPROVE(settlementNo));
    return toResult(response, normalizeSettlementSummary);
  },

  async reject(
    settlementNo: string,
    reason: string,
  ): Promise<SettlementApiResult<SettlementSummary>> {
    const response = await apiClient.post<
      ApiSuccessResponse<SettlementSummary> | SettlementSummary
    >(API_ENDPOINTS.SETTLEMENT.REJECT(settlementNo), { reason });
    return toResult(response, normalizeSettlementSummary);
  },

  async releasePayment(
    settlementNo: string,
  ): Promise<SettlementApiResult<SettlementSummary>> {
    const response = await apiClient.post<
      ApiSuccessResponse<SettlementSummary> | SettlementSummary
    >(API_ENDPOINTS.SETTLEMENT.RELEASE_PAYMENT(settlementNo));
    return toResult(response, normalizeSettlementSummary);
  },

  async retryPayment(
    settlementNo: string,
  ): Promise<SettlementApiResult<SettlementSummary>> {
    const response = await apiClient.post<
      ApiSuccessResponse<SettlementSummary> | SettlementSummary
    >(API_ENDPOINTS.SETTLEMENT.RETRY_PAYMENT(settlementNo));
    return toResult(response, normalizeSettlementSummary);
  },

  async getStatusHistory(
    settlementNo: string,
  ): Promise<SettlementApiResult<StatusHistoryItem[]>> {
    const response = await apiClient.get<
      ApiSuccessResponse<StatusHistoryItem[]> | StatusHistoryItem[]
    >(API_ENDPOINTS.SETTLEMENT.STATUS_HISTORY(settlementNo));
    const payload = unwrapPayload(response);
    const list = Array.isArray(payload) ? payload : [];
    return {
      data: list.map((item) =>
        normalizeHistoryItem(
          (item && typeof item === "object" ? item : {}) as Record<
            string,
            unknown
          >,
        ),
      ),
      raw: response,
    };
  },
};
