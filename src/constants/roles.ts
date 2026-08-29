/**
 * Application Roles and Permissions
 */

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  HOTEL_OWNER: "HOTEL_OWNER",
  HOTEL_MANAGER: "HOTEL_MANAGER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.HOTEL_OWNER]: "Hotel Owner",
  [ROLES.HOTEL_MANAGER]: "Hotel Manager",
};

export const ROLE_OPTIONS = [
  { value: ROLES.HOTEL_OWNER, label: ROLE_LABELS[ROLES.HOTEL_OWNER] },
  { value: ROLES.HOTEL_MANAGER, label: ROLE_LABELS[ROLES.HOTEL_MANAGER] },
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN] },
] as const;

export const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  [ROLES.SUPER_ADMIN]: { bg: "bg-red-100", text: "text-red-700" },
  [ROLES.HOTEL_OWNER]: { bg: "bg-blue-100", text: "text-blue-700" },
  [ROLES.HOTEL_MANAGER]: { bg: "bg-purple-100", text: "text-purple-700" },
};

/** Badge styles for roles assigned only via Super Admin User Management (not in `Role` union). */
export const ADMIN_MANAGED_ROLE_BADGE_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  HOTEL_BD: { bg: "bg-blue-100", text: "text-blue-800" },
  PACKAGE_CREATOR: { bg: "bg-purple-100", text: "text-purple-800" },
  PACKAGE_BD: { bg: "bg-violet-100", text: "text-violet-800" },
  TRANSPORT_BD: { bg: "bg-sky-100", text: "text-sky-800" },
  TRAVEL_AGENT_ADMIN: { bg: "bg-cyan-100", text: "text-cyan-800" },
  TRAVEL_AGENT_USER: { bg: "bg-lime-100", text: "text-lime-800" },
  TRANSPORT_AGENT_ADMIN: { bg: "bg-orange-100", text: "text-orange-800" },
  TRANSPORT_AGENT_USER: { bg: "bg-amber-100", text: "text-amber-800" },
  SALES_MANAGER: { bg: "bg-emerald-100", text: "text-emerald-800" },
  ZONAL_MANAGER_HOTEL: { bg: "bg-indigo-100", text: "text-indigo-800" },
  ZontalHotelManager: { bg: "bg-indigo-100", text: "text-indigo-800" },
  ZONAL_MANAGER_SALES: { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
  FINANCE: { bg: "bg-amber-100", text: "text-amber-800" },
  FINANCE_MANAGER: { bg: "bg-yellow-100", text: "text-yellow-800" },
  HOTEL_ACCOUNTANT: { bg: "bg-amber-100", text: "text-amber-800" },
  ACCOUNTANT: { bg: "bg-amber-100", text: "text-amber-800" },
  FRONT_DESK_EXEC: { bg: "bg-teal-100", text: "text-teal-800" },
  QC: { bg: "bg-rose-100", text: "text-rose-800" },
  HELPDESK_AGENT: { bg: "bg-teal-100", text: "text-teal-800" },
  AUDITOR: { bg: "bg-slate-100", text: "text-slate-800" },
};

/** Friendly labels for admin-managed roles not present in `Role` union. */
export const ADMIN_MANAGED_ROLE_LABELS: Record<string, string> = {
  HOTEL_BD: "Hotel BD",
  PACKAGE_CREATOR: "Package Creator",
  PACKAGE_BD: "Package BD",
  TRANSPORT_BD: "Transport BD",
  TRAVEL_AGENT_ADMIN: "Travel Agent Admin",
  TRAVEL_AGENT_USER: "Travel Agent User",
  TRANSPORT_AGENT_ADMIN: "Transport Agent Admin",
  TRANSPORT_AGENT_USER: "Transport Agent User",
  SALES_MANAGER: "Sales Manager",
  ZONAL_MANAGER_HOTEL: "Zonal Manager Hotel",
  ZontalHotelManager: "Zonal Hotel Manager",
  ZONAL_MANAGER_SALES: "Zonal Manager Sales",
  FINANCE: "Finance",
  FINANCE_MANAGER: "Finance Manager",
  HOTEL_ACCOUNTANT: "Hotel Accountant",
  ACCOUNTANT: "Accountant",
  FRONT_DESK_EXEC: "Front Desk",
  QC: "Quality Control",
  HELPDESK_AGENT: "Helpdesk Agent",
  AUDITOR: "Auditor",
};

/** Role strings that use the zonal hotel review queue APIs (non–Super Admin). */
export const ZONAL_HOTEL_REVIEW_ROLES = [
  "ZONAL_MANAGER_HOTEL",
  "ZontalHotelManager",
] as const;

export function hasZonalHotelReviewRole(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((r) =>
    (ZONAL_HOTEL_REVIEW_ROLES as readonly string[]).includes(r),
  );
}

export function isZonalHotelReviewerRole(
  userRoles: string[] | undefined,
): boolean {
  if (!hasZonalHotelReviewRole(userRoles)) return false;
  return !isSuperAdmin(userRoles);
}

/** Who may start or continue the multi-step hotel onboarding wizard (`/properties/hotel`). */
export function canOnboardHotel(userRoles: string[] | undefined): boolean {
  if (!userRoles?.length) return false;
  return (
    userRoles.includes("SUPER_ADMIN") ||
    userRoles.includes("ONBOARDING_REVIEWER") ||
    userRoles.includes("QC") ||
    hasZonalHotelReviewRole(userRoles) ||
    userRoles.includes("HOTEL_OWNER") ||
    userRoles.includes("HOTEL_BD")
  );
}

/** Business development role: My Properties by default; other modules via hotel-access permissions. */
export function isHotelBdRole(userRoles: string[] | undefined): boolean {
  return !!userRoles?.includes("HOTEL_BD");
}

/** Roles allowed to view Hotel BD portfolio dashboard and pipeline reports. */
export const HOTEL_BD_REPORT_ROLES = [
  "HOTEL_BD",
  "SUPER_ADMIN",
  "ZONAL_MANAGER_HOTEL",
  "ZontalHotelManager",
  "FINANCE",
  "AUDITOR",
] as const;

export function canViewHotelBdReports(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HOTEL_BD_REPORT_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to view Onboarding Pipeline (includes QC; dashboard stays separate). */
export function canViewHotelBdPipeline(
  userRoles: string[] | undefined,
): boolean {
  if (isZonalManagerSalesRole(userRoles) && !isSuperAdmin(userRoles)) {
    return false;
  }
  // Auditor uses Financial MIS + helpdesk only — not onboarding pipeline.
  if (isAuditorRole(userRoles) && !isSuperAdmin(userRoles)) {
    return false;
  }
  if (canViewHotelBdReports(userRoles)) return true;
  return !!userRoles?.includes("QC");
}

/** Platform roles that may filter pipeline/dashboard by assigned BD user. */
export function canFilterHotelBdReportsByUser(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    [
      "SUPER_ADMIN",
      "ZONAL_MANAGER_HOTEL",
      "ZontalHotelManager",
      "FINANCE",
      "AUDITOR",
      "ZONAL_MANAGER_SALES",
    ].includes(role),
  );
}

/** Roles allowed to view Sales Manager dashboard and agent portfolio reports. */
export const SALES_MANAGER_REPORT_ROLES = [
  "SALES_MANAGER",
  "SUPER_ADMIN",
  "ZONAL_MANAGER_SALES",
] as const;

export function canViewSalesManagerReports(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (SALES_MANAGER_REPORT_ROLES as readonly string[]).includes(role),
  );
}

/** Admin/zonal roles that may filter sales manager reports by assigned manager. */
export function canFilterSalesManagerReportsByUser(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    ["SUPER_ADMIN", "ZONAL_MANAGER_SALES"].includes(role),
  );
}

/**
 * Roles allowed to view Payment Report (net earnings).
 * Same report Super Admin uses — shared with other Payments roles so they
 * are not sent to a different report page.
 */
export const PAYMENT_REPORT_ROLES = [
  "SUPER_ADMIN",
  "HOTEL_OWNER",
  "HOTEL_BD",
  "HOTEL_MANAGER",
  "HOTEL_ACCOUNTANT",
  "ACCOUNTANT",
  "FRONT_DESK_EXEC",
  "FINANCE",
  "AUDITOR",
] as const;

export function canViewPaymentReport(userRoles: string[] | undefined): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (PAYMENT_REPORT_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to view Hotel Payout MIS. */
export const HOTEL_PAYOUT_MIS_ROLES = [
  "HOTEL_OWNER",
  "HOTEL_MANAGER",
  "HOTEL_ACCOUNTANT",
  "ACCOUNTANT",
  "SUPER_ADMIN",
  "FRONT_DESK_EXEC",
  "HOTEL_BD",
  "FINANCE",
  "AUDITOR",
] as const;

export function canViewHotelPayoutMis(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HOTEL_PAYOUT_MIS_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to view Transport Payout MIS. */
export const TRANSPORT_PAYOUT_MIS_ROLES = [
  "TRANSPORT_AGENT_ADMIN",
  "TRANSPORT_AGENT_USER",
  "TRANSPORT_BD",
  "SUPER_ADMIN",
  "ZONAL_MANAGER_SALES",
  "FINANCE",
  "FINANCE_MANAGER",
  "HOTEL_ACCOUNTANT",
  "ACCOUNTANT",
  "AUDITOR",
] as const;

export function canViewTransportPayoutMis(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (TRANSPORT_PAYOUT_MIS_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to view Hotel Booking Financial MIS. */
export const HOTEL_BOOKING_FINANCIAL_MIS_ROLES = [
  "FINANCE",
  "FINANCE_MANAGER",
  "ACCOUNTANT",
  "AUDITOR",
  "SUPER_ADMIN",
  "SALES_MANAGER",
  "ZONAL_MANAGER_SALES",
] as const;

export function canViewHotelBookingFinancialMis(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HOTEL_BOOKING_FINANCIAL_MIS_ROLES as readonly string[]).includes(role),
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[] | undefined, role: Role): boolean {
  if (!userRoles) return false;
  return userRoles.includes(role);
}

/** Who may verify a hotel bank account from the Finance tab. */
export function canVerifyHotelBank(userRoles: string[] | undefined): boolean {
  if (!userRoles?.length) return false;
  return (
    userRoles.includes("SUPER_ADMIN") ||
    userRoles.includes("FINANCE_MANAGER")
  );
}

/** Roles allowed to moderate customer reviews (admin rating APIs). */
export const REVIEW_MODERATION_ROLES = [
  "SUPER_ADMIN",
  "HOTEL_BD",
  "PACKAGE_BD",
] as const;

export function canModerateReviews(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (REVIEW_MODERATION_ROLES as readonly string[]).includes(role),
  );
}

/** Hotel owners (and managers) can view/reply/report their hotel reviews. */
export function canManageHotelReviews(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return (
    userRoles.includes("HOTEL_OWNER") ||
    userRoles.includes("HOTEL_MANAGER") ||
    userRoles.includes("SUPER_ADMIN")
  );
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRoles: string[] | undefined): boolean {
  return hasRole(userRoles, ROLES.SUPER_ADMIN);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  userRoles: string[] | undefined,
  roles: Role[],
): boolean {
  if (!userRoles) return false;
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Check if user is a hotel owner (HOTEL_OWNER, but not SUPER_ADMIN)
 */
export function isHotelOwner(userRoles: string[] | undefined): boolean {
  if (!userRoles) return false;
  return (
    userRoles.includes(ROLES.HOTEL_OWNER) &&
    !userRoles.includes(ROLES.SUPER_ADMIN)
  );
}

/**
 * Hotel staff created under a property account (My Team). Super Admin may see
 * these users in the global list but must not edit them or manage their hotel
 * access from admin screens — that stays with the hotel account.
 * Users who also have HOTEL_OWNER are still manageable as property owners.
 */
/** Roles that cannot use the hotel onboarding portal (access denied screen). */
export const PORTAL_ACCESS_DENIED_ROLES = [
  "PACKAGE_CREATOR",
  "PACKAGE_BD",
  "TRANSPORT_BD",
  "TRANSPORT_AGENT_ADMIN",
  "TRANSPORT_AGENT_USER",
] as const;

export function normalizeUserRoles(userRoles: string[] | undefined): string[] {
  if (!userRoles?.length) return [];
  return userRoles.filter(
    (role) => typeof role === "string" && role.trim().length > 0,
  );
}

export function hasNoAssignedPortalRole(
  userRoles: string[] | undefined,
): boolean {
  return normalizeUserRoles(userRoles).length === 0;
}

export function hasBlockedPortalRole(userRoles: string[] | undefined): boolean {
  const roles = normalizeUserRoles(userRoles);
  return roles.some((role) =>
    (PORTAL_ACCESS_DENIED_ROLES as readonly string[]).includes(role),
  );
}

export function isPortalAccessDenied(userRoles: string[] | undefined): boolean {
  return hasNoAssignedPortalRole(userRoles) || hasBlockedPortalRole(userRoles);
}

export const SUPER_ADMIN_EXCLUDED_EDIT_ROLES = [
  "HOTEL_MANAGER",
  "HOTEL_ACCOUNTANT",
  "FRONT_DESK_EXEC",
] as const;

export function isSuperAdminExcludedFromUserEdit(
  roles: string[] | undefined,
): boolean {
  if (!roles?.length) return false;
  if (roles.includes("HOTEL_OWNER")) return false;
  return SUPER_ADMIN_EXCLUDED_EDIT_ROLES.some((r) => roles.includes(r));
}

/** QC (non–Super Admin): QC dashboard home, hotel review only; no document review tab. */
export function isQcReviewerRole(userRoles: string[] | undefined): boolean {
  if (!userRoles?.includes("QC")) return false;
  return !isSuperAdmin(userRoles);
}

/**
 * QC or Zonal hotel reviewer (non–Super Admin): shared reviewer dashboard + hotel
 * review nav; zonal uses different list/approve APIs on the same screens.
 */
export function isReviewerPortalRole(userRoles: string[] | undefined): boolean {
  return isQcReviewerRole(userRoles) || isZonalHotelReviewerRole(userRoles);
}

/** Sales-side zonal reviewer/manager role for travel partner workflows. */
export function isZonalManagerSalesRole(
  userRoles: string[] | undefined,
): boolean {
  return !!userRoles?.includes("ZONAL_MANAGER_SALES");
}

/** Sales manager: onboard travel agents and view agent pipeline. */
export function isSalesManagerRole(userRoles: string[] | undefined): boolean {
  return !!userRoles?.includes("SALES_MANAGER");
}

/** Helpdesk agent: customer order lookup and support view. */
export function isHelpdeskAgentRole(
  userRoles: string[] | undefined,
): boolean {
  return !!userRoles?.includes("HELPDESK_AGENT");
}

/** Auditor: financial MIS + helpdesk (no property ops). */
export function isAuditorRole(userRoles: string[] | undefined): boolean {
  return !!userRoles?.includes("AUDITOR");
}

/** Platform accountant (Super Admin–created): financial reports + property finance. */
export function isPlatformAccountantRole(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  if (userRoles.includes("SUPER_ADMIN")) return false;
  return userRoles.includes("ACCOUNTANT");
}

/** Finance Manager portal: settlements + hotel MIS (no property/helpdesk home). */
export function isFinanceManagerRole(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.includes("FINANCE_MANAGER")) return false;
  if (isSuperAdmin(userRoles)) return false;
  if (isAuditorRole(userRoles)) return false;
  if (isHelpdeskAgentRole(userRoles)) return false;
  return true;
}

/** Roles allowed to access helpdesk booking lookup APIs and screens. */
export const HELPDESK_BOOKING_ROLES = [
  "HELPDESK_AGENT",
  "SUPER_ADMIN",
  "FINANCE",
  "AUDITOR",
] as const;

export function canViewHelpdeskBookings(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HELPDESK_BOOKING_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to access helpdesk ticket APIs and screens. */
export const HELPDESK_TICKET_ROLES = [
  "HELPDESK_AGENT",
  "SUPER_ADMIN",
  "FINANCE",
  "AUDITOR",
] as const;

export function canViewHelpdeskTickets(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HELPDESK_TICKET_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to assign helpdesk tickets. */
export const HELPDESK_TICKET_ASSIGN_ROLES = [
  "SUPER_ADMIN",
] as const;

export function canAssignHelpdeskTickets(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (HELPDESK_TICKET_ASSIGN_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to view supplier settlement screens and list APIs. */
export const SETTLEMENT_VIEW_ROLES = [
  "SUPER_ADMIN",
  "FINANCE_MANAGER",
  "FINANCE",
  "ACCOUNTANT",
] as const;

export function canViewSupplierSettlement(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (SETTLEMENT_VIEW_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to approve, reject, release, and retry settlements. */
export const SETTLEMENT_APPROVE_ROLES = [
  "SUPER_ADMIN",
  "FINANCE_MANAGER",
] as const;

export function canApproveSupplierSettlement(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (SETTLEMENT_APPROVE_ROLES as readonly string[]).includes(role),
  );
}

/** Roles allowed to generate settlements (maker). */
export const SETTLEMENT_GENERATE_ROLES = [
  "SUPER_ADMIN",
  "FINANCE_MANAGER",
] as const;

export function canGenerateSupplierSettlement(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((role) =>
    (SETTLEMENT_GENERATE_ROLES as readonly string[]).includes(role),
  );
}
