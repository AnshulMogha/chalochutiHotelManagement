import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import type {
  HelpdeskTicketCreateRequest,
  HelpdeskTicketCreateResponse,
  HelpdeskTicketDashboard,
  HelpdeskTicketDetail,
  HelpdeskTicketListParams,
  HelpdeskTicketListResponse,
  HelpdeskTicketReferenceInput,
  HelpdeskTicketSlaSummary,
  HelpdeskTicketStatus,
} from "./helpdeskTicketTypes";

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildListQuery(params: HelpdeskTicketListParams): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.priority) search.set("priority", params.priority);
  if (params.category) search.set("category", params.category);
  if (params.raisedByType) search.set("raisedByType", params.raisedByType);
  if (params.assignedTo != null && params.assignedTo !== "") {
    search.set("assignedTo", String(params.assignedTo));
  }
  if (params.ticketNo?.trim()) search.set("ticketNo", params.ticketNo.trim());
  if (params.referenceKey?.trim()) {
    search.set("referenceKey", params.referenceKey.trim());
  }
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 20));
  search.set("sort", params.sort || "createdAt,desc");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function normalizeListItem(raw: Record<string, unknown>) {
  return {
    ticketId: Number(raw.ticketId) || 0,
    ticketNo: String(raw.ticketNo || ""),
    status: String(raw.status || "") as HelpdeskTicketStatus,
    priority: String(raw.priority || "") as HelpdeskTicketListResponse["content"][number]["priority"],
    category: String(raw.category || "") as HelpdeskTicketListResponse["content"][number]["category"],
    subject: String(raw.subject || ""),
    raisedByType: String(
      raw.raisedByType || "",
    ) as HelpdeskTicketListResponse["content"][number]["raisedByType"],
    assignedTo: toNumber(raw.assignedTo),
    createdAt: String(raw.createdAt || ""),
  };
}

function normalizeListResponse(
  raw: Record<string, unknown>,
): HelpdeskTicketListResponse {
  const contentRaw = Array.isArray(raw.content) ? raw.content : [];
  return {
    content: contentRaw.map((item) =>
      normalizeListItem(
        (item && typeof item === "object" ? item : {}) as Record<
          string,
          unknown
        >,
      ),
    ),
    page: Number(raw.page ?? 0),
    size: Number(raw.size ?? 20),
    totalElements: Number(raw.totalElements ?? 0),
    totalPages: Number(raw.totalPages ?? 0),
  };
}

function normalizeDetail(raw: Record<string, unknown>): HelpdeskTicketDetail {
  const referencesRaw = Array.isArray(raw.references) ? raw.references : [];
  const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];

  return {
    ticketId: Number(raw.ticketId) || 0,
    ticketNo: String(raw.ticketNo || ""),
    raisedByType: String(raw.raisedByType || ""),
    raisedById: (raw.raisedById as string | null | undefined) ?? null,
    raisedByName: (raw.raisedByName as string | null | undefined) ?? null,
    raisedByPhone: (raw.raisedByPhone as string | null | undefined) ?? null,
    raisedByEmail: (raw.raisedByEmail as string | null | undefined) ?? null,
    category: String(raw.category || ""),
    priority: String(raw.priority || ""),
    status: String(raw.status || ""),
    subject: String(raw.subject || ""),
    description: (raw.description as string | null | undefined) ?? null,
    assignedTo: toNumber(raw.assignedTo),
    createdBy: toNumber(raw.createdBy),
    createdAt: String(raw.createdAt || ""),
    updatedBy: toNumber(raw.updatedBy),
    updatedAt: (raw.updatedAt as string | null | undefined) ?? null,
    resolvedAt: (raw.resolvedAt as string | null | undefined) ?? null,
    closedAt: (raw.closedAt as string | null | undefined) ?? null,
    references: referencesRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        id: Number(obj.id) || 0,
        referenceType: String(obj.referenceType || ""),
        referenceKey: String(obj.referenceKey || ""),
        referenceName: (obj.referenceName as string | null | undefined) ?? null,
        createdAt: String(obj.createdAt || ""),
      };
    }),
    activities: activitiesRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        id: Number(obj.id) || 0,
        action: String(obj.action || ""),
        oldStatus: (obj.oldStatus as string | null | undefined) ?? null,
        newStatus: (obj.newStatus as string | null | undefined) ?? null,
        note: (obj.note as string | null | undefined) ?? null,
        createdBy: toNumber(obj.createdBy),
        createdAt: String(obj.createdAt || ""),
      };
    }),
    bookingSummary:
      raw.bookingSummary && typeof raw.bookingSummary === "object"
        ? (raw.bookingSummary as Record<string, unknown>)
        : null,
  };
}

function normalizeDashboard(raw: Record<string, unknown>): HelpdeskTicketDashboard {
  return {
    open: Number(raw.open ?? 0),
    inProgress: Number(raw.inProgress ?? 0),
    waiting: Number(raw.waiting ?? 0),
    resolved: Number(raw.resolved ?? 0),
    closed: Number(raw.closed ?? 0),
  };
}

function normalizeSla(raw: Record<string, unknown>): HelpdeskTicketSlaSummary {
  return {
    averageResolutionHours: Number(raw.averageResolutionHours ?? 0),
    openBeyondSla: Number(raw.openBeyondSla ?? 0),
    highPriorityPending: Number(raw.highPriorityPending ?? 0),
  };
}

export const helpdeskTicketService = {
  async createTicket(
    body: HelpdeskTicketCreateRequest,
  ): Promise<HelpdeskTicketCreateResponse> {
    const response = await apiClient.post<
      ApiSuccessResponse<HelpdeskTicketCreateResponse> | HelpdeskTicketCreateResponse
    >(API_ENDPOINTS.HELPDESK.TICKETS, body);
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return {
      ticketId: Number(payload.ticketId) || 0,
      ticketNo: String(payload.ticketNo || ""),
      status: String(payload.status || "OPEN") as HelpdeskTicketStatus,
    };
  },

  async listTickets(
    params: HelpdeskTicketListParams = {},
  ): Promise<HelpdeskTicketListResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<HelpdeskTicketListResponse> | HelpdeskTicketListResponse
    >(`${API_ENDPOINTS.HELPDESK.TICKETS}${buildListQuery(params)}`);
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeListResponse(payload);
  },

  async getTicket(ticketId: string | number): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.get<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_BY_ID(ticketId));
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async assignTicket(
    ticketId: string | number,
    assignedTo: number,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.patch<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_ASSIGN(ticketId), { assignedTo });
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async changeStatus(
    ticketId: string | number,
    status: string,
    note?: string,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.patch<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_STATUS(ticketId), {
      status,
      ...(note?.trim() ? { note: note.trim() } : {}),
    });
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async addNote(
    ticketId: string | number,
    note: string,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.post<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_NOTES(ticketId), { note });
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async closeTicket(
    ticketId: string | number,
    resolution: string,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.patch<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_CLOSE(ticketId), { resolution });
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async reopenTicket(
    ticketId: string | number,
    reason: string,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.patch<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_REOPEN(ticketId), { reason });
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async addReference(
    ticketId: string | number,
    body: HelpdeskTicketReferenceInput,
  ): Promise<HelpdeskTicketDetail> {
    const response = await apiClient.post<
      ApiSuccessResponse<HelpdeskTicketDetail> | HelpdeskTicketDetail
    >(API_ENDPOINTS.HELPDESK.TICKET_REFERENCES(ticketId), body);
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDetail(payload);
  },

  async getDashboard(): Promise<HelpdeskTicketDashboard> {
    const response = await apiClient.get<
      ApiSuccessResponse<HelpdeskTicketDashboard> | HelpdeskTicketDashboard
    >(API_ENDPOINTS.HELPDESK.DASHBOARD);
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeDashboard(payload);
  },

  async getSlaSummary(): Promise<HelpdeskTicketSlaSummary> {
    const response = await apiClient.get<
      ApiSuccessResponse<HelpdeskTicketSlaSummary> | HelpdeskTicketSlaSummary
    >(API_ENDPOINTS.HELPDESK.DASHBOARD_SLA);
    const payload = unwrapPayload(response) as Record<string, unknown>;
    return normalizeSla(payload);
  },
};
