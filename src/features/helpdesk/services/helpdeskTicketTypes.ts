export const HELPDESK_TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_HOTEL",
  "WAITING_VENDOR",
  "WAITING_AGENT",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
] as const;

export type HelpdeskTicketStatus = (typeof HELPDESK_TICKET_STATUSES)[number];

export const HELPDESK_TICKET_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type HelpdeskTicketPriority =
  (typeof HELPDESK_TICKET_PRIORITIES)[number];

export const HELPDESK_TICKET_CATEGORIES = [
  "BOOKING",
  "CANCELLATION",
  "REFUND",
  "PAYMENT",
  "HOTEL_PAYOUT",
  "HOTEL_ONBOARDING",
  "TRANSPORT_ASSIGNMENT",
  "TRANSPORT_PAYMENT",
  "AGENT_COMMISSION",
  "SETTLEMENT",
  "CHECK_IN",
  "CHECK_OUT",
  "OTHER",
] as const;

export type HelpdeskTicketCategory =
  (typeof HELPDESK_TICKET_CATEGORIES)[number];

export const HELPDESK_RAISED_BY_TYPES = [
  "CUSTOMER",
  "HOTEL_OWNER",
  "TRANSPORT_VENDOR",
  "TRAVEL_AGENT",
  "ACTIVITY_VENDOR",
  "INTERNAL_SUPPORT",
  "INTERNAL_FINANCE",
  "INTERNAL_SALES",
] as const;

export type HelpdeskRaisedByType = (typeof HELPDESK_RAISED_BY_TYPES)[number];

export const HELPDESK_REFERENCE_TYPES = [
  "BOOKING",
  "HOTEL",
  "PACKAGE_BOOKING",
  "TRANSPORT_BOOKING",
  "PAYMENT",
  "SETTLEMENT",
] as const;

export type HelpdeskReferenceType =
  (typeof HELPDESK_REFERENCE_TYPES)[number];

export const HELPDESK_ACTIVITY_ACTIONS = [
  "CREATED",
  "ASSIGNED",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "REFERENCE_ADDED",
  "CLOSED",
  "REOPENED",
] as const;

export type HelpdeskActivityAction =
  (typeof HELPDESK_ACTIVITY_ACTIONS)[number];

export const WAITING_STATUSES: HelpdeskTicketStatus[] = [
  "WAITING_CUSTOMER",
  "WAITING_HOTEL",
  "WAITING_VENDOR",
  "WAITING_AGENT",
];

/** Allowed next statuses for Change Status API (excludes CLOSE/REOPEN). */
export const STATUS_TRANSITIONS: Record<
  HelpdeskTicketStatus,
  HelpdeskTicketStatus[]
> = {
  OPEN: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: [
    "WAITING_CUSTOMER",
    "WAITING_HOTEL",
    "WAITING_VENDOR",
    "WAITING_AGENT",
    "RESOLVED",
  ],
  WAITING_CUSTOMER: [
    "IN_PROGRESS",
    "RESOLVED",
    "WAITING_HOTEL",
    "WAITING_VENDOR",
    "WAITING_AGENT",
  ],
  WAITING_HOTEL: [
    "IN_PROGRESS",
    "RESOLVED",
    "WAITING_CUSTOMER",
    "WAITING_VENDOR",
    "WAITING_AGENT",
  ],
  WAITING_VENDOR: [
    "IN_PROGRESS",
    "RESOLVED",
    "WAITING_CUSTOMER",
    "WAITING_HOTEL",
    "WAITING_AGENT",
  ],
  WAITING_AGENT: [
    "IN_PROGRESS",
    "RESOLVED",
    "WAITING_CUSTOMER",
    "WAITING_HOTEL",
    "WAITING_VENDOR",
  ],
  RESOLVED: ["IN_PROGRESS"],
  CLOSED: [],
  REOPENED: ["IN_PROGRESS"],
};

export function getAllowedStatusTransitions(
  status: HelpdeskTicketStatus | string | null | undefined,
): HelpdeskTicketStatus[] {
  if (!status) return [];
  const key = String(status).toUpperCase() as HelpdeskTicketStatus;
  return STATUS_TRANSITIONS[key] ?? [];
}

export function canCloseTicket(
  status: HelpdeskTicketStatus | string | null | undefined,
): boolean {
  return String(status || "").toUpperCase() === "RESOLVED";
}

export function canReopenTicket(
  status: HelpdeskTicketStatus | string | null | undefined,
): boolean {
  return String(status || "").toUpperCase() === "CLOSED";
}

export interface HelpdeskTicketReferenceInput {
  referenceType: HelpdeskReferenceType;
  referenceKey: string;
  referenceName?: string | null;
}

export interface HelpdeskTicketCreateRequest {
  raisedByType: HelpdeskRaisedByType;
  raisedById?: string | null;
  raisedByName?: string | null;
  raisedByPhone?: string | null;
  raisedByEmail?: string | null;
  category: HelpdeskTicketCategory;
  priority: HelpdeskTicketPriority;
  subject: string;
  description?: string | null;
  references?: HelpdeskTicketReferenceInput[];
}

export interface HelpdeskTicketCreateResponse {
  ticketId: number;
  ticketNo: string;
  status: HelpdeskTicketStatus;
}

export interface HelpdeskTicketListItem {
  ticketId: number;
  ticketNo: string;
  status: HelpdeskTicketStatus;
  priority: HelpdeskTicketPriority;
  category: HelpdeskTicketCategory;
  subject: string;
  raisedByType: HelpdeskRaisedByType;
  assignedTo: number | null;
  createdAt: string;
}

export interface HelpdeskTicketListResponse {
  content: HelpdeskTicketListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface HelpdeskTicketListParams {
  status?: string;
  priority?: string;
  category?: string;
  raisedByType?: string;
  assignedTo?: number | string;
  ticketNo?: string;
  referenceKey?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface HelpdeskTicketReference {
  id: number;
  referenceType: HelpdeskReferenceType | string;
  referenceKey: string;
  referenceName: string | null;
  createdAt: string;
}

export interface HelpdeskTicketActivity {
  id: number;
  action: HelpdeskActivityAction | string;
  oldStatus: HelpdeskTicketStatus | string | null;
  newStatus: HelpdeskTicketStatus | string | null;
  note: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface HelpdeskTicketDetail {
  ticketId: number;
  ticketNo: string;
  raisedByType: HelpdeskRaisedByType | string;
  raisedById: string | null;
  raisedByName: string | null;
  raisedByPhone: string | null;
  raisedByEmail: string | null;
  category: HelpdeskTicketCategory | string;
  priority: HelpdeskTicketPriority | string;
  status: HelpdeskTicketStatus | string;
  subject: string;
  description: string | null;
  assignedTo: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  references: HelpdeskTicketReference[];
  activities: HelpdeskTicketActivity[];
  bookingSummary?: Record<string, unknown> | null;
}

export interface HelpdeskTicketDashboard {
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export interface HelpdeskTicketSlaSummary {
  averageResolutionHours: number;
  openBeyondSla: number;
  highPriorityPending: number;
}
