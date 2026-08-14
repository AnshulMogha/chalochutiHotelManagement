import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  appendSalesManagerSharedParams,
  type SalesManagerDashboardReportParams,
} from "./salesManagerReportTypes";

export interface SalesManagerMoneyAmount {
  amount: number;
  currency: string;
}

export interface SalesManagerPeriodMetric<T = number> {
  current: T;
  previous: T;
  changePercent: number | null;
}

export interface SalesManagerPeriodMoneyMetric {
  current: SalesManagerMoneyAmount;
  previous: SalesManagerMoneyAmount;
  changePercent: number | null;
}

export interface SalesManagerDashboardReportResponse {
  viewer?: string | null;
  allAgents?: boolean;
  scope?: string | null;
  dateAxis?: string | null;
  bookingType?: string | null;
  dateRange: {
    preset?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  };
  previousDateRange?: {
    preset?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  } | null;
  portfolioKpis: {
    assignedAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    newAgents: number;
    pendingApprovals: number;
    suspendedAgents: number;
    totalActiveSubAgents: number;
    averageBookingsPerAgent: number;
    averageRevenuePerAgent: SalesManagerMoneyAmount;
    approvedToActiveConversionPercent: number;
  };
  bookingKpis: {
    totalBookings: SalesManagerPeriodMetric;
    hotelBookings: SalesManagerPeriodMetric;
    packageBookings: SalesManagerPeriodMetric;
    confirmedBookings: SalesManagerPeriodMetric;
    cancelledBookings: SalesManagerPeriodMetric;
  };
  revenueKpis: {
    grossBookingValue: SalesManagerPeriodMoneyMetric;
    collectedRevenue: SalesManagerPeriodMoneyMetric;
    otaRevenue: SalesManagerPeriodMoneyMetric;
    agencyCommission: SalesManagerPeriodMoneyMetric;
    outstandingBalance: SalesManagerPeriodMoneyMetric;
    overdueBalance: SalesManagerPeriodMoneyMetric;
    refundAmount: SalesManagerPeriodMoneyMetric;
    collectionRate: SalesManagerPeriodMetric;
    collectionEfficiencyPercent: number;
    averageCollectionDays: number | null;
    averageOutstandingDays: number;
    overduePercent: number;
    averageBookingValue: SalesManagerMoneyAmount;
    hotelRevenue: SalesManagerMoneyAmount;
    packageRevenue: SalesManagerMoneyAmount;
  };
  agentFunnel: {
    applied: number;
    approved: number;
    activated: number;
    firstBooking: number;
    retainedAgents: number;
    rejected: number;
    appliedToApprovedPercent: number;
    approvedToActivatedPercent: number;
    activatedToFirstBookingPercent: number | null;
    firstBookingToRetainedPercent: number;
  };
  agentHealth: {
    zeroBookingAgents: number;
    pendingDocuments: number;
    loggedInToday: number;
    loggedInThisWeek: number;
    inactiveOver30Days: number;
    outstandingBalanceAgents: number;
    highCancellationAgents: number;
    lowCollectionAgents: number;
    negativeGrowthAgents: number;
    highRefundAgents: number;
  };
  topPerformingAgents: SalesManagerAgentSnapshot[];
  lowPerformingAgents: SalesManagerAgentSnapshot[];
  leaderboard: {
    highestRevenueAgent: SalesManagerAgentSnapshot | null;
    highestBookingAgent: SalesManagerAgentSnapshot | null;
    fastestGrowingAgent: SalesManagerAgentSnapshot | null;
    bestCollectionAgent: SalesManagerAgentSnapshot | null;
    highestCancellationAgent: SalesManagerAgentSnapshot | null;
    highestOutstandingAgent: SalesManagerAgentSnapshot | null;
  };
  geographicPerformance: Array<{
    stateId: number;
    state: string;
    stateCode?: string | null;
    agents: number;
    bookings: number;
    grossBookingValue: SalesManagerMoneyAmount;
  }>;
  agentTierDistribution: Array<{
    tier: string;
    agents: number;
    percent: number;
  }>;
  productMix: {
    hotelBookings: number;
    packageBookings: number;
    hotelPercent: number;
    packagePercent: number;
    hotelRevenue: SalesManagerMoneyAmount;
    packageRevenue: SalesManagerMoneyAmount;
    hotelRevenuePercent: number;
    packageRevenuePercent: number;
  };
  topDestinations: Array<{
    destination: string;
    product: string;
    bookings: number;
    revenue: SalesManagerMoneyAmount;
  }>;
  paymentMix: {
    fullyPaid: number;
    partiallyPaid: number;
    outstanding: number;
    fullyPaidPercent: number;
    partiallyPaidPercent: number;
    outstandingPercent: number;
  };
  charts: {
    bookingTrend: Array<{ date: string; count: number }>;
    revenueTrend: Array<{ date: string; amount: SalesManagerMoneyAmount }>;
    collectionTrend: Array<{ date: string; amount: SalesManagerMoneyAmount }>;
    newAgentTrend: Array<{ date: string; count: number }>;
    agentActivationTrend: Array<{ date: string; count: number }>;
  };
  actionInbox: SalesManagerActionInboxItem[];
}

export interface SalesManagerAgentSnapshot {
  onboardingId: number;
  agentUserId: number;
  agentCode: string;
  agencyName: string;
  contactName?: string | null;
  email?: string | null;
  tier: string | null;
  state?: string | null;
  assignedAt?: string | null;
  lastBookingAt?: string | null;
  lastLoginAt?: string | null;
  totalBookings: number;
  hotelBookings: number;
  packageBookings: number;
  grossBookingValue: SalesManagerMoneyAmount;
  otaGrossRevenue: SalesManagerMoneyAmount;
  agencyCommission: SalesManagerMoneyAmount;
  otaNetRevenue: SalesManagerMoneyAmount;
  outstanding: SalesManagerMoneyAmount;
  collectionPercent: number;
  activeDays: number;
  status: string;
  reasons: string[];
}

export type SalesManagerInboxType =
  | "HIGH_CANCELLATION"
  | "LOW_COLLECTION"
  | "HIGH_OUTSTANDING"
  | "NEW_AGENT_PENDING"
  | "NO_LOGIN_30_DAYS"
  | "ZERO_BOOKING_AGENT"
  | string;

export interface SalesManagerActionInboxItem {
  type: SalesManagerInboxType;
  severity: string;
  priority: number;
  entityType: string;
  entityId: number;
  agentUserId?: number | null;
  onboardingId?: number | null;
  agencyName: string;
  state?: string | null;
  tier?: string | null;
  amount?: SalesManagerMoneyAmount | null;
  title: string;
  description: string;
  actionUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeMoney(
  raw: unknown,
  fallbackCurrency = "INR",
): SalesManagerMoneyAmount {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return {
      amount: toNumber(record.amount),
      currency: String(record.currency || fallbackCurrency),
    };
  }
  return { amount: toNumber(raw), currency: fallbackCurrency };
}

function normalizePeriodMetric(raw: unknown): SalesManagerPeriodMetric {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    current: toNumber(record.current),
    previous: toNumber(record.previous),
    changePercent: toNullableNumber(record.changePercent),
  };
}

function normalizePeriodMoneyMetric(
  raw: unknown,
): SalesManagerPeriodMoneyMetric {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    current: normalizeMoney(record.current),
    previous: normalizeMoney(record.previous),
    changePercent: toNullableNumber(record.changePercent),
  };
}

function normalizeAgentSnapshot(raw: unknown): SalesManagerAgentSnapshot {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    onboardingId: toNumber(record.onboardingId),
    agentUserId: toNumber(record.agentUserId),
    agentCode: String(record.agentCode ?? "—"),
    agencyName: String(record.agencyName ?? "—"),
    contactName: (record.contactName as string | null | undefined) ?? null,
    email: (record.email as string | null | undefined) ?? null,
    tier: (record.tier as string | null | undefined) ?? null,
    state: (record.state as string | null | undefined) ?? null,
    assignedAt: (record.assignedAt as string | null | undefined) ?? null,
    lastBookingAt: (record.lastBookingAt as string | null | undefined) ?? null,
    lastLoginAt: (record.lastLoginAt as string | null | undefined) ?? null,
    totalBookings: toNumber(record.totalBookings),
    hotelBookings: toNumber(record.hotelBookings),
    packageBookings: toNumber(record.packageBookings),
    grossBookingValue: normalizeMoney(record.grossBookingValue),
    otaGrossRevenue: normalizeMoney(record.otaGrossRevenue),
    agencyCommission: normalizeMoney(record.agencyCommission),
    otaNetRevenue: normalizeMoney(record.otaNetRevenue),
    outstanding: normalizeMoney(record.outstanding),
    collectionPercent: toNumber(record.collectionPercent),
    activeDays: toNumber(record.activeDays),
    status: String(record.status ?? "—"),
    reasons: Array.isArray(record.reasons)
      ? record.reasons.map((item) => String(item))
      : [],
  };
}

function normalizeInboxItem(raw: unknown): SalesManagerActionInboxItem {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    type: String(record.type ?? "UNKNOWN"),
    severity: String(record.severity ?? "INFO"),
    priority: toNumber(record.priority),
    entityType: String(record.entityType ?? "—"),
    entityId: toNumber(record.entityId),
    agentUserId:
      record.agentUserId != null ? toNumber(record.agentUserId) : null,
    onboardingId:
      record.onboardingId != null ? toNumber(record.onboardingId) : null,
    agencyName: String(record.agencyName ?? "—"),
    state: (record.state as string | null | undefined) ?? null,
    tier: (record.tier as string | null | undefined) ?? null,
    amount:
      record.amount != null ? normalizeMoney(record.amount) : null,
    title: String(record.title ?? "Action required"),
    description: String(record.description ?? ""),
    actionUrl: (record.actionUrl as string | null | undefined) ?? null,
    createdAt: (record.createdAt as string | null | undefined) ?? null,
    updatedAt: (record.updatedAt as string | null | undefined) ?? null,
  };
}

function normalizeDashboardResponse(
  payload: Record<string, unknown>,
): SalesManagerDashboardReportResponse {
  const portfolioRaw =
    (payload.portfolioKpis as Record<string, unknown> | undefined) ?? {};
  const bookingRaw =
    (payload.bookingKpis as Record<string, unknown> | undefined) ?? {};
  const revenueRaw =
    (payload.revenueKpis as Record<string, unknown> | undefined) ?? {};
  const funnelRaw =
    (payload.agentFunnel as Record<string, unknown> | undefined) ?? {};
  const healthRaw =
    (payload.agentHealth as Record<string, unknown> | undefined) ?? {};
  const chartsRaw = (payload.charts as Record<string, unknown> | undefined) ?? {};
  const productMixRaw =
    (payload.productMix as Record<string, unknown> | undefined) ?? {};
  const paymentMixRaw =
    (payload.paymentMix as Record<string, unknown> | undefined) ?? {};
  const dateRangeRaw =
    (payload.dateRange as Record<string, unknown> | undefined) ?? {};
  const previousDateRangeRaw =
    (payload.previousDateRange as Record<string, unknown> | undefined) ?? null;
  const leaderboardRaw =
    (payload.leaderboard as Record<string, unknown> | undefined) ?? {};

  return {
    viewer: (payload.viewer as string | undefined) ?? null,
    allAgents: Boolean(payload.allAgents),
    scope: (payload.scope as string | undefined) ?? null,
    dateAxis: (payload.dateAxis as string | undefined) ?? null,
    bookingType: (payload.bookingType as string | undefined) ?? null,
    dateRange: {
      preset: (dateRangeRaw.preset as string | undefined) ?? null,
      fromDate: (dateRangeRaw.fromDate as string | undefined) ?? null,
      toDate: (dateRangeRaw.toDate as string | undefined) ?? null,
    },
    previousDateRange: previousDateRangeRaw
      ? {
          preset: (previousDateRangeRaw.preset as string | undefined) ?? null,
          fromDate:
            (previousDateRangeRaw.fromDate as string | undefined) ?? null,
          toDate: (previousDateRangeRaw.toDate as string | undefined) ?? null,
        }
      : null,
    portfolioKpis: {
      assignedAgents: toNumber(portfolioRaw.assignedAgents),
      activeAgents: toNumber(portfolioRaw.activeAgents),
      inactiveAgents: toNumber(portfolioRaw.inactiveAgents),
      newAgents: toNumber(portfolioRaw.newAgents),
      pendingApprovals: toNumber(portfolioRaw.pendingApprovals),
      suspendedAgents: toNumber(portfolioRaw.suspendedAgents),
      totalActiveSubAgents: toNumber(portfolioRaw.totalActiveSubAgents),
      averageBookingsPerAgent: toNumber(portfolioRaw.averageBookingsPerAgent),
      averageRevenuePerAgent: normalizeMoney(
        portfolioRaw.averageRevenuePerAgent,
      ),
      approvedToActiveConversionPercent: toNumber(
        portfolioRaw.approvedToActiveConversionPercent,
      ),
    },
    bookingKpis: {
      totalBookings: normalizePeriodMetric(bookingRaw.totalBookings),
      hotelBookings: normalizePeriodMetric(bookingRaw.hotelBookings),
      packageBookings: normalizePeriodMetric(bookingRaw.packageBookings),
      confirmedBookings: normalizePeriodMetric(bookingRaw.confirmedBookings),
      cancelledBookings: normalizePeriodMetric(bookingRaw.cancelledBookings),
    },
    revenueKpis: {
      grossBookingValue: normalizePeriodMoneyMetric(
        revenueRaw.grossBookingValue,
      ),
      collectedRevenue: normalizePeriodMoneyMetric(revenueRaw.collectedRevenue),
      otaRevenue: normalizePeriodMoneyMetric(revenueRaw.otaRevenue),
      agencyCommission: normalizePeriodMoneyMetric(revenueRaw.agencyCommission),
      outstandingBalance: normalizePeriodMoneyMetric(
        revenueRaw.outstandingBalance,
      ),
      overdueBalance: normalizePeriodMoneyMetric(revenueRaw.overdueBalance),
      refundAmount: normalizePeriodMoneyMetric(revenueRaw.refundAmount),
      collectionRate: normalizePeriodMetric(revenueRaw.collectionRate),
      collectionEfficiencyPercent: toNumber(
        revenueRaw.collectionEfficiencyPercent,
      ),
      averageCollectionDays: toNullableNumber(revenueRaw.averageCollectionDays),
      averageOutstandingDays: toNumber(revenueRaw.averageOutstandingDays),
      overduePercent: toNumber(revenueRaw.overduePercent),
      averageBookingValue: normalizeMoney(revenueRaw.averageBookingValue),
      hotelRevenue: normalizeMoney(revenueRaw.hotelRevenue),
      packageRevenue: normalizeMoney(revenueRaw.packageRevenue),
    },
    agentFunnel: {
      applied: toNumber(funnelRaw.applied),
      approved: toNumber(funnelRaw.approved),
      activated: toNumber(funnelRaw.activated),
      firstBooking: toNumber(funnelRaw.firstBooking),
      retainedAgents: toNumber(funnelRaw.retainedAgents),
      rejected: toNumber(funnelRaw.rejected),
      appliedToApprovedPercent: toNumber(funnelRaw.appliedToApprovedPercent),
      approvedToActivatedPercent: toNumber(
        funnelRaw.approvedToActivatedPercent,
      ),
      activatedToFirstBookingPercent: toNullableNumber(
        funnelRaw.activatedToFirstBookingPercent,
      ),
      firstBookingToRetainedPercent: toNumber(
        funnelRaw.firstBookingToRetainedPercent,
      ),
    },
    agentHealth: {
      zeroBookingAgents: toNumber(healthRaw.zeroBookingAgents),
      pendingDocuments: toNumber(healthRaw.pendingDocuments),
      loggedInToday: toNumber(healthRaw.loggedInToday),
      loggedInThisWeek: toNumber(healthRaw.loggedInThisWeek),
      inactiveOver30Days: toNumber(healthRaw.inactiveOver30Days),
      outstandingBalanceAgents: toNumber(healthRaw.outstandingBalanceAgents),
      highCancellationAgents: toNumber(healthRaw.highCancellationAgents),
      lowCollectionAgents: toNumber(healthRaw.lowCollectionAgents),
      negativeGrowthAgents: toNumber(healthRaw.negativeGrowthAgents),
      highRefundAgents: toNumber(healthRaw.highRefundAgents),
    },
    topPerformingAgents: Array.isArray(payload.topPerformingAgents)
      ? payload.topPerformingAgents.map(normalizeAgentSnapshot)
      : [],
    lowPerformingAgents: Array.isArray(payload.lowPerformingAgents)
      ? payload.lowPerformingAgents.map(normalizeAgentSnapshot)
      : [],
    leaderboard: {
      highestRevenueAgent: leaderboardRaw.highestRevenueAgent
        ? normalizeAgentSnapshot(leaderboardRaw.highestRevenueAgent)
        : null,
      highestBookingAgent: leaderboardRaw.highestBookingAgent
        ? normalizeAgentSnapshot(leaderboardRaw.highestBookingAgent)
        : null,
      fastestGrowingAgent: leaderboardRaw.fastestGrowingAgent
        ? normalizeAgentSnapshot(leaderboardRaw.fastestGrowingAgent)
        : null,
      bestCollectionAgent: leaderboardRaw.bestCollectionAgent
        ? normalizeAgentSnapshot(leaderboardRaw.bestCollectionAgent)
        : null,
      highestCancellationAgent: leaderboardRaw.highestCancellationAgent
        ? normalizeAgentSnapshot(leaderboardRaw.highestCancellationAgent)
        : null,
      highestOutstandingAgent: leaderboardRaw.highestOutstandingAgent
        ? normalizeAgentSnapshot(leaderboardRaw.highestOutstandingAgent)
        : null,
    },
    geographicPerformance: Array.isArray(payload.geographicPerformance)
      ? payload.geographicPerformance.map((item) => {
          const record = (item ?? {}) as Record<string, unknown>;
          return {
            stateId: toNumber(record.stateId),
            state: String(record.state ?? "—"),
            stateCode: (record.stateCode as string | null | undefined) ?? null,
            agents: toNumber(record.agents),
            bookings: toNumber(record.bookings),
            grossBookingValue: normalizeMoney(record.grossBookingValue),
          };
        })
      : [],
    agentTierDistribution: Array.isArray(payload.agentTierDistribution)
      ? payload.agentTierDistribution.map((item) => {
          const record = (item ?? {}) as Record<string, unknown>;
          return {
            tier: String(record.tier ?? "—"),
            agents: toNumber(record.agents),
            percent: toNumber(record.percent),
          };
        })
      : [],
    productMix: {
      hotelBookings: toNumber(productMixRaw.hotelBookings),
      packageBookings: toNumber(productMixRaw.packageBookings),
      hotelPercent: toNumber(productMixRaw.hotelPercent),
      packagePercent: toNumber(productMixRaw.packagePercent),
      hotelRevenue: normalizeMoney(productMixRaw.hotelRevenue),
      packageRevenue: normalizeMoney(productMixRaw.packageRevenue),
      hotelRevenuePercent: toNumber(productMixRaw.hotelRevenuePercent),
      packageRevenuePercent: toNumber(productMixRaw.packageRevenuePercent),
    },
    topDestinations: Array.isArray(payload.topDestinations)
      ? payload.topDestinations.map((item) => {
          const record = (item ?? {}) as Record<string, unknown>;
          return {
            destination: String(record.destination ?? "—"),
            product: String(record.product ?? "—"),
            bookings: toNumber(record.bookings),
            revenue: normalizeMoney(record.revenue),
          };
        })
      : [],
    paymentMix: {
      fullyPaid: toNumber(paymentMixRaw.fullyPaid),
      partiallyPaid: toNumber(paymentMixRaw.partiallyPaid),
      outstanding: toNumber(paymentMixRaw.outstanding),
      fullyPaidPercent: toNumber(paymentMixRaw.fullyPaidPercent),
      partiallyPaidPercent: toNumber(paymentMixRaw.partiallyPaidPercent),
      outstandingPercent: toNumber(paymentMixRaw.outstandingPercent),
    },
    charts: {
      bookingTrend: Array.isArray(chartsRaw.bookingTrend)
        ? chartsRaw.bookingTrend.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              date: String(record.date ?? ""),
              count: toNumber(record.count),
            };
          })
        : [],
      revenueTrend: Array.isArray(chartsRaw.revenueTrend)
        ? chartsRaw.revenueTrend.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              date: String(record.date ?? ""),
              amount: normalizeMoney(record.amount),
            };
          })
        : [],
      collectionTrend: Array.isArray(chartsRaw.collectionTrend)
        ? chartsRaw.collectionTrend.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              date: String(record.date ?? ""),
              amount: normalizeMoney(record.amount),
            };
          })
        : [],
      newAgentTrend: Array.isArray(chartsRaw.newAgentTrend)
        ? chartsRaw.newAgentTrend.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              date: String(record.date ?? ""),
              count: toNumber(record.count),
            };
          })
        : [],
      agentActivationTrend: Array.isArray(chartsRaw.agentActivationTrend)
        ? chartsRaw.agentActivationTrend.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
              date: String(record.date ?? ""),
              count: toNumber(record.count),
            };
          })
        : [],
    },
    actionInbox: Array.isArray(payload.actionInbox)
      ? payload.actionInbox.map(normalizeInboxItem)
      : [],
  };
}

function buildQuery(params: SalesManagerDashboardReportParams): string {
  const search = new URLSearchParams();
  appendSalesManagerSharedParams(search, params);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const salesManagerDashboardReportService = {
  async getReport(
    params: SalesManagerDashboardReportParams = {},
  ): Promise<SalesManagerDashboardReportResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.SALES_MANAGER_DASHBOARD}${buildQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeDashboardResponse(
      (payload ?? {}) as Record<string, unknown>,
    );
  },
};
