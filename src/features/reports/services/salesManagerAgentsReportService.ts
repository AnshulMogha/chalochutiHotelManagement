import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  appendSalesManagerSharedParams,
  type SalesManagerAgentsReportParams,
} from "./salesManagerReportTypes";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";
import type { SalesManagerMoneyAmount } from "./salesManagerDashboardReportService";

export interface SalesManagerAgentPortfolioRow {
  agentId: number;
  agentCode: string;
  onboardingId: number;
  agency: {
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  location: {
    stateId?: number | null;
    state?: string | null;
    city?: string | null;
  };
  tier: {
    code: string;
    label: string;
  };
  status: {
    code: string;
    label: string;
    color?: string | null;
  };
  activity: {
    assignedAt?: string | null;
    activatedAt?: string | null;
    lastLoginAt?: string | null;
    lastBookingAt?: string | null;
    daysSinceLastBooking?: number | null;
    daysSinceLastLogin?: number | null;
    activeDays: number;
  };
  bookings: {
    hotel: number;
    package: number;
    total: number;
    confirmed: number;
    cancelled: number;
  };
  revenue: {
    grossBookingValue: SalesManagerMoneyAmount;
    collected: SalesManagerMoneyAmount;
    outstanding: SalesManagerMoneyAmount;
    collectionPercent: number;
    averageBookingValue: SalesManagerMoneyAmount;
  };
  quality: {
    refundPercent: number;
    cancellationPercent: number;
  };
}

export interface SalesManagerAgentsReportResponse {
  viewer?: string | null;
  allAgents?: boolean;
  scope?: string | null;
  metricWindow?: string | null;
  dateRange: {
    preset?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  };
  summary: {
    totalAgents: number;
    activeAgents: number;
    inactiveAgents: number;
    zeroBookingAgents: number;
    suspendedAgents: number;
    tierDistribution: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
      diamond: number;
    };
  };
  agents: {
    content: SalesManagerAgentPortfolioRow[];
    page: {
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      sort: string;
      direction: string;
    };
  };
  filters?: {
    status?: string[];
    tier?: string[];
    sort?: string[];
  };
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

function normalizeAgentRow(raw: unknown): SalesManagerAgentPortfolioRow {
  const record = (raw ?? {}) as Record<string, unknown>;
  const agencyRaw =
    (record.agency as Record<string, unknown> | undefined) ?? {};
  const locationRaw =
    (record.location as Record<string, unknown> | undefined) ?? {};
  const tierRaw = (record.tier as Record<string, unknown> | undefined) ?? {};
  const statusRaw =
    (record.status as Record<string, unknown> | undefined) ?? {};
  const activityRaw =
    (record.activity as Record<string, unknown> | undefined) ?? {};
  const bookingsRaw =
    (record.bookings as Record<string, unknown> | undefined) ?? {};
  const revenueRaw =
    (record.revenue as Record<string, unknown> | undefined) ?? {};
  const qualityRaw =
    (record.quality as Record<string, unknown> | undefined) ?? {};

  return {
    agentId: toNumber(record.agentId),
    agentCode: String(record.agentCode ?? "—"),
    onboardingId: toNumber(record.onboardingId),
    agency: {
      name: String(agencyRaw.name ?? "—"),
      contactPerson:
        (agencyRaw.contactPerson as string | null | undefined) ?? null,
      email: (agencyRaw.email as string | null | undefined) ?? null,
      phone: (agencyRaw.phone as string | null | undefined) ?? null,
    },
    location: {
      stateId:
        locationRaw.stateId != null ? toNumber(locationRaw.stateId) : null,
      state: (locationRaw.state as string | null | undefined) ?? null,
      city: (locationRaw.city as string | null | undefined) ?? null,
    },
    tier: {
      code: String(tierRaw.code ?? "—"),
      label: String(tierRaw.label ?? tierRaw.code ?? "—"),
    },
    status: {
      code: String(statusRaw.code ?? "—"),
      label: String(statusRaw.label ?? statusRaw.code ?? "—"),
      color: (statusRaw.color as string | null | undefined) ?? null,
    },
    activity: {
      assignedAt: (activityRaw.assignedAt as string | null | undefined) ?? null,
      activatedAt:
        (activityRaw.activatedAt as string | null | undefined) ?? null,
      lastLoginAt:
        (activityRaw.lastLoginAt as string | null | undefined) ?? null,
      lastBookingAt:
        (activityRaw.lastBookingAt as string | null | undefined) ?? null,
      daysSinceLastBooking: toNullableNumber(activityRaw.daysSinceLastBooking),
      daysSinceLastLogin: toNullableNumber(activityRaw.daysSinceLastLogin),
      activeDays: toNumber(activityRaw.activeDays),
    },
    bookings: {
      hotel: toNumber(bookingsRaw.hotel),
      package: toNumber(bookingsRaw.package),
      total: toNumber(bookingsRaw.total),
      confirmed: toNumber(bookingsRaw.confirmed),
      cancelled: toNumber(bookingsRaw.cancelled),
    },
    revenue: {
      grossBookingValue: normalizeMoney(revenueRaw.grossBookingValue),
      collected: normalizeMoney(revenueRaw.collected),
      outstanding: normalizeMoney(revenueRaw.outstanding),
      collectionPercent: toNumber(revenueRaw.collectionPercent),
      averageBookingValue: normalizeMoney(revenueRaw.averageBookingValue),
    },
    quality: {
      refundPercent: toNumber(qualityRaw.refundPercent),
      cancellationPercent: toNumber(qualityRaw.cancellationPercent),
    },
  };
}

function normalizeAgentsResponse(
  payload: Record<string, unknown>,
): SalesManagerAgentsReportResponse {
  const summaryRaw =
    (payload.summary as Record<string, unknown> | undefined) ?? {};
  const tierRaw =
    (summaryRaw.tierDistribution as Record<string, unknown> | undefined) ?? {};
  const agentsRaw =
    (payload.agents as Record<string, unknown> | undefined) ?? {};
  const pageRaw = (agentsRaw.page as Record<string, unknown> | undefined) ?? {};
  const dateRangeRaw =
    (payload.dateRange as Record<string, unknown> | undefined) ?? {};
  const contentRaw = agentsRaw.content;

  return {
    viewer: (payload.viewer as string | undefined) ?? null,
    allAgents: Boolean(payload.allAgents),
    scope: (payload.scope as string | undefined) ?? null,
    metricWindow: (payload.metricWindow as string | undefined) ?? null,
    dateRange: {
      preset: (dateRangeRaw.preset as string | undefined) ?? null,
      fromDate: (dateRangeRaw.fromDate as string | undefined) ?? null,
      toDate: (dateRangeRaw.toDate as string | undefined) ?? null,
    },
    summary: {
      totalAgents: toNumber(summaryRaw.totalAgents),
      activeAgents: toNumber(summaryRaw.activeAgents),
      inactiveAgents: toNumber(summaryRaw.inactiveAgents),
      zeroBookingAgents: toNumber(summaryRaw.zeroBookingAgents),
      suspendedAgents: toNumber(summaryRaw.suspendedAgents),
      tierDistribution: {
        bronze: toNumber(tierRaw.bronze),
        silver: toNumber(tierRaw.silver),
        gold: toNumber(tierRaw.gold),
        platinum: toNumber(tierRaw.platinum),
        diamond: toNumber(tierRaw.diamond),
      },
    },
    agents: {
      content: Array.isArray(contentRaw)
        ? contentRaw.map(normalizeAgentRow)
        : [],
      page: {
        page: toNumber(pageRaw.page),
        size: toNumber(pageRaw.size, 20),
        totalElements: toNumber(pageRaw.totalElements),
        totalPages: toNumber(pageRaw.totalPages),
        sort: String(pageRaw.sort ?? "TOTAL_BOOKINGS"),
        direction: String(pageRaw.direction ?? "DESC"),
      },
    },
    filters: payload.filters as SalesManagerAgentsReportResponse["filters"],
  };
}

function buildQuery(params: SalesManagerAgentsReportParams): string {
  const search = new URLSearchParams();
  appendSalesManagerSharedParams(search, params);
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  if (params.agentStatus && params.agentStatus !== "ALL") {
    search.set("agentStatus", params.agentStatus);
  }
  if (params.onboardedFrom) search.set("onboardedFrom", params.onboardedFrom);
  if (params.onboardedTo) search.set("onboardedTo", params.onboardedTo);
  if (params.lastBookingFrom) {
    search.set("lastBookingFrom", params.lastBookingFrom);
  }
  if (params.lastBookingTo) search.set("lastBookingTo", params.lastBookingTo);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const salesManagerAgentsReportService = {
  async getReport(
    params: SalesManagerAgentsReportParams = {},
  ): Promise<SalesManagerAgentsReportResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.SALES_MANAGER_AGENTS}${buildQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeAgentsResponse((payload ?? {}) as Record<string, unknown>);
  },

  async exportReport(
    params: Omit<SalesManagerAgentsReportParams, "page" | "size">,
    format: ReportExportFormat = "EXCEL",
    onStatus?: (status: ExportJobStatus) => void,
  ): Promise<void> {
    const query = buildQuery({ ...params, page: undefined, size: undefined });
    const formatParam = query
      ? `${query}&format=${format}`
      : `?format=${format}`;

    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.SALES_MANAGER_AGENTS_EXPORT}${formatParam}`,
      statusUrl: API_ENDPOINTS.REPORTS.SALES_MANAGER_AGENTS_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.SALES_MANAGER_AGENTS_EXPORT_DOWNLOAD,
      defaultFileName: "sales-manager-agents",
      format,
      onStatus,
    });
  },
};
