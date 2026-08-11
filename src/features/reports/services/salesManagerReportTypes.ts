export type SalesManagerDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_7_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

export type SalesManagerDateAxis = "BOOKING" | "TRAVEL";

export type SalesManagerBookingType = "ALL" | "HOTEL" | "PACKAGE";

export type SalesManagerAgencyTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND";

export type SalesManagerAgentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ZERO_BOOKING"
  | "LOW_COLLECTION"
  | "HIGH_OUTSTANDING"
  | "SUSPENDED";

export type SalesManagerAgentsSortField =
  | "TOTAL_BOOKINGS"
  | "REVENUE"
  | "COLLECTION_PERCENT"
  | "LAST_BOOKING"
  | "LAST_LOGIN"
  | "ACTIVE_DAYS"
  | "AGENCY_NAME";

export type SalesManagerSortDir = "ASC" | "DESC";

export interface SalesManagerSharedReportParams {
  datePreset?: SalesManagerDatePreset;
  fromDate?: string;
  toDate?: string;
  dateAxis?: SalesManagerDateAxis;
  stateId?: string;
  state?: string;
  agencyTier?: SalesManagerAgencyTier;
  bookingType?: SalesManagerBookingType;
  salesManagerId?: string;
  search?: string;
}

export interface SalesManagerDashboardReportParams
  extends SalesManagerSharedReportParams {}

export interface SalesManagerAgentsReportParams
  extends SalesManagerSharedReportParams {
  page?: number;
  size?: number;
  sort?: SalesManagerAgentsSortField;
  sortDir?: SalesManagerSortDir;
  agentStatus?: SalesManagerAgentStatus | "ALL";
  onboardedFrom?: string;
  onboardedTo?: string;
  lastBookingFrom?: string;
  lastBookingTo?: string;
}

export function appendSalesManagerSharedParams(
  search: URLSearchParams,
  params: SalesManagerSharedReportParams,
): void {
  if (params.datePreset) search.set("datePreset", params.datePreset);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  if (params.dateAxis) search.set("dateAxis", params.dateAxis);
  if (params.stateId?.trim()) search.set("stateId", params.stateId.trim());
  if (params.state?.trim()) search.set("state", params.state.trim());
  if (params.agencyTier) search.set("agencyTier", params.agencyTier);
  if (params.bookingType) search.set("bookingType", params.bookingType);
  if (params.salesManagerId?.trim()) {
    search.set("salesManagerId", params.salesManagerId.trim());
  }
  if (params.search?.trim()) search.set("search", params.search.trim());
}
