import type { User } from "@/types";
import {
  canOnboardHotel,
  canViewHelpdeskBookings,
  canViewHelpdeskTickets,
  canViewHotelBdPipeline,
  canViewHotelBdReports,
  canViewHotelBookingFinancialMis,
  canViewHotelPayoutMis,
  canViewPaymentReport,
  canViewTransportPayoutMis,
  canViewSalesManagerReports,
  canViewSupplierSettlement,
  canVerifyHotelBank,
  canModerateReviews,
  canManageHotelReviews,
  isAuditorRole,
  isFinanceManagerRole,
  isHelpdeskAgentRole,
  isHotelBdRole,
  isPlatformAccountantRole,
  isQcReviewerRole,
  isReviewerPortalRole,
  isSalesManagerRole,
  isSuperAdmin,
  isZonalManagerSalesRole,
} from "@/constants/roles";
import { ROUTES, hasAnyRole, ROLES } from "@/constants";

export type PermissionModule =
  | "BOOKINGS"
  | "MY_TEAM"
  | "RATES_INVENTORY"
  | "OFFERS"
  | "CONTENT"
  | "ANALYTICS"
  | "MESSAGES"
  | "DASHBOARD"
  | "FINANCE"
  | "PROPERTY_BASIC_INFO"
  | "PROPERTY_ROOMS_RATEPLANS"
  | "PROPERTY_PHOTOS_VIDEOS"
  | "PROPERTY_AMENITIES_RESTAURANTS"
  | "PROPERTY_POLICY_RULES"
  | "PROPERTY_FINANCE"
  | "PROPERTY_DOCUMENT"
  | "PAYMENTS"
  | "REPORT_BOOKING_SUMMARY"
  | "REPORT_PROMOTIONS"
  | "REPORT_RATE_HEALTH"
  | "REPORT_INVENTORY_ALLOCATION"
  | "GUEST_REVIEWS";

export interface UserPermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

const FRONT_DESK_ALLOWED_MODULES: PermissionModule[] = ["BOOKINGS"];
const HOTEL_ACCOUNTANT_ALLOWED_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "PROPERTY_FINANCE",
  "FINANCE",
  "PAYMENTS",
];
const HOTEL_MANAGER_ALLOWED_MODULES: PermissionModule[] = [
  // Matches Hotel Owner sidebar tabs that an owner can grant (no Finance / Documents)
  "PROPERTY_BASIC_INFO",
  "PROPERTY_ROOMS_RATEPLANS",
  "PROPERTY_PHOTOS_VIDEOS",
  "PROPERTY_AMENITIES_RESTAURANTS",
  "PROPERTY_POLICY_RULES",
  "RATES_INVENTORY",
  "BOOKINGS",
  "OFFERS",
  "ANALYTICS",
  "MY_TEAM",
  "DASHBOARD",
  // Per-report grants
  "REPORT_BOOKING_SUMMARY",
  "REPORT_PROMOTIONS",
  "REPORT_RATE_HEALTH",
  "REPORT_INVENTORY_ALLOCATION",
  "PAYMENTS",
  "GUEST_REVIEWS",
];

function isHotelAccountantRole(userRoles: string[] | undefined): boolean {
  if (!userRoles?.length) return false;
  return userRoles.includes("HOTEL_ACCOUNTANT");
}

const PLATFORM_ACCOUNTANT_VIEW_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "PROPERTY_FINANCE",
  "FINANCE",
  "PAYMENTS",
];

/** Hotel Manager staff (not owner/super-admin). */
export function isHotelManagerStaffRole(
  userRoles: string[] | undefined,
): boolean {
  if (!userRoles?.length) return false;
  if (userRoles.includes("SUPER_ADMIN") || userRoles.includes("HOTEL_OWNER")) {
    return false;
  }
  if (
    userRoles.includes("FRONT_DESK_EXEC") ||
    userRoles.includes("HOTEL_ACCOUNTANT")
  ) {
    return false;
  }
  return userRoles.includes("HOTEL_MANAGER");
}

export function hasPermissionBypass(user: Pick<User, "roles"> | null): boolean {
  const roles = user?.roles || [];
  return roles.includes("SUPER_ADMIN") || roles.includes("HOTEL_OWNER");
}

export function getModuleFromPath(pathname: string): PermissionModule | null {
  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return "BOOKINGS";
  }
  if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    return "BOOKINGS";
  }
  if (pathname === "/team" || pathname.startsWith("/team/")) {
    return "MY_TEAM";
  }
  if (
    pathname === "/inventory/room-types" ||
    pathname === "/inventory/rate-plans" ||
    pathname === "/inventory/bulk-update" ||
    pathname === "/hotel/rates/add-single-derived" ||
    pathname === "/rates/bulk-update" ||
    pathname === "/restrictions/bulk-update"
  ) {
    return "RATES_INVENTORY";
  }
  if (pathname === "/promotions" || pathname.startsWith("/promotions/")) {
    return "OFFERS";
  }
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    // Prefer ANALYTICS when present; canViewPath also allows BOOKINGS.
    return "ANALYTICS";
  }
  if (pathname === "/property/information/basic-info") {
    return "PROPERTY_BASIC_INFO";
  }
  if (pathname === "/property/information/rooms-rateplans") {
    return "PROPERTY_ROOMS_RATEPLANS";
  }
  if (pathname === "/property/information/photos-videos") {
    return "PROPERTY_PHOTOS_VIDEOS";
  }
  if (pathname === "/property/information/amenities-restaurants") {
    return "PROPERTY_AMENITIES_RESTAURANTS";
  }
  if (pathname === "/property/information/policy-rules") {
    return "PROPERTY_POLICY_RULES";
  }
  if (pathname === "/property/information/inclusions") {
    // Reuse basic-info permission until a dedicated inclusions module exists.
    return "PROPERTY_BASIC_INFO";
  }
  if (pathname === "/property/information/finance") {
    return "PROPERTY_FINANCE";
  }
  if (pathname === "/property/information/document") {
    return "PROPERTY_DOCUMENT";
  }
  if (
    pathname === ROUTES.HOTEL_REVIEWS.LIST ||
    pathname.startsWith(`${ROUTES.HOTEL_REVIEWS.LIST}/`)
  ) {
    return "GUEST_REVIEWS";
  }
  if (pathname === ROUTES.RATINGS_REVIEWS.MIS) {
    return "GUEST_REVIEWS";
  }
  return null;
}

const MODULE_ALIASES: Partial<Record<PermissionModule, PermissionModule[]>> = {
  // Backward compatibility for setups still sending broader module names.
  PROPERTY_FINANCE: ["FINANCE"],
  PROPERTY_DOCUMENT: ["CONTENT"],
};

function findPermission(
  user: User | null,
  module: PermissionModule,
): UserPermission | null {
  const permissions = user?.permissions || [];
  const allowedModules = [module, ...(MODULE_ALIASES[module] || [])];
  return (
    permissions.find((item) =>
      allowedModules.includes(item.module as PermissionModule),
    ) || null
  );
}

function getConstrainedRole(
  user: Pick<User, "roles"> | null,
): "FRONT_DESK_EXEC" | "HOTEL_ACCOUNTANT" | "HOTEL_MANAGER" | null {
  const roles = user?.roles || [];
  // Most restrictive first if multiple scoped roles exist.
  if (roles.includes("FRONT_DESK_EXEC")) return "FRONT_DESK_EXEC";
  if (roles.includes("HOTEL_ACCOUNTANT")) {
    return "HOTEL_ACCOUNTANT";
  }
  if (roles.includes("HOTEL_MANAGER")) return "HOTEL_MANAGER";
  return null;
}

function canRoleAccessModule(
  user: User | null,
  module: PermissionModule,
): boolean {
  const constrainedRole = getConstrainedRole(user);
  if (!constrainedRole) return true;
  if (constrainedRole === "FRONT_DESK_EXEC") {
    return FRONT_DESK_ALLOWED_MODULES.includes(module);
  }
  if (constrainedRole === "HOTEL_ACCOUNTANT") {
    return HOTEL_ACCOUNTANT_ALLOWED_MODULES.includes(module);
  }
  if (constrainedRole === "HOTEL_MANAGER") {
    return HOTEL_MANAGER_ALLOWED_MODULES.includes(module);
  }
  return true;
}

export function canViewModule(
  user: User | null,
  module: PermissionModule,
): boolean {
  if (!user) return true;
  if (
    isPlatformAccountantRole(user.roles) &&
    PLATFORM_ACCOUNTANT_VIEW_MODULES.includes(module)
  ) {
    return true;
  }
  if (isSuperAdmin(user.roles) && module === "MY_TEAM") return false;
  if (module === "PROPERTY_FINANCE" && canVerifyHotelBank(user.roles)) {
    return true;
  }
  if (hasPermissionBypass(user)) return true;
  if (isHotelBdRole(user.roles)) {
    if (module === "PROPERTY_FINANCE") return false;
    return !!findPermission(user, module)?.canView;
  }
  if (!canRoleAccessModule(user, module)) return false;
  const permission = findPermission(user, module);
  return !!permission?.canView;
}

export function canEditModule(
  user: User | null,
  module: PermissionModule,
): boolean {
  if (!user) return true;
  if (isSuperAdmin(user.roles) && module === "MY_TEAM") return false;
  if (
    module === "PROPERTY_FINANCE" &&
    (isSuperAdmin(user.roles) || user.roles?.includes("FINANCE_MANAGER"))
  ) {
    return false;
  }
  if (hasPermissionBypass(user)) return true;
  if (isHotelBdRole(user.roles)) {
    if (module === "PROPERTY_FINANCE") return false;
    if (module === "BOOKINGS") return false;
    return !!findPermission(user, module)?.canEdit;
  }
  if (!canRoleAccessModule(user, module)) return false;
  // Bookings is always view-only for non-bypass roles.
  if (module === "BOOKINGS") return false;
  // Front desk has only bookings and bookings is already view-only above.
  const constrainedRole = getConstrainedRole(user);
  if (constrainedRole === "FRONT_DESK_EXEC") return false;
  const permission = findPermission(user, module);
  return !!permission?.canEdit;
}

/** Hotel Owner / staff may edit finance details; Super Admin & Finance Manager verify only. */
export function canEditHotelFinanceDetails(user: User | null): boolean {
  return canEditModule(user, "PROPERTY_FINANCE");
}

function isSalesManagerReportPath(pathname: string): boolean {
  return (
    pathname === ROUTES.REPORTS.SALES_MANAGER_DASHBOARD ||
    pathname === ROUTES.REPORTS.SALES_MANAGER_AGENTS
  );
}

function isHotelBookingFinancialMisPath(pathname: string): boolean {
  return (
    pathname === ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS ||
    pathname.startsWith(`${ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS}/`)
  );
}

function isHelpdeskPath(pathname: string): boolean {
  return pathname === "/helpdesk" || pathname.startsWith("/helpdesk/");
}

function isHelpdeskOrdersPath(pathname: string): boolean {
  return (
    pathname === ROUTES.HELPDESK.LOOKUP ||
    pathname.startsWith(`${ROUTES.HELPDESK.LOOKUP}/`)
  );
}

function isHelpdeskTicketsPath(pathname: string): boolean {
  return (
    pathname === ROUTES.HELPDESK.TICKETS ||
    pathname.startsWith(`${ROUTES.HELPDESK.TICKETS}/`)
  );
}

function isSettlementPath(pathname: string): boolean {
  return (
    pathname === "/finance/settlements" ||
    pathname.startsWith("/finance/settlements/")
  );
}

function isReviewModerationPath(pathname: string): boolean {
  if (isReviewMisPath(pathname)) return false;
  return (
    pathname === ROUTES.RATINGS_REVIEWS.LIST ||
    pathname.startsWith(`${ROUTES.RATINGS_REVIEWS.LIST}/`)
  );
}

function isReviewMisPath(pathname: string): boolean {
  return pathname === ROUTES.RATINGS_REVIEWS.MIS;
}

function canAccessReviewMis(user: User | null): boolean {
  if (canModerateReviews(user?.roles)) return true;
  if (user?.roles?.includes("HOTEL_OWNER")) {
    return canViewModule(user, "GUEST_REVIEWS");
  }
  if (isHotelManagerStaffRole(user?.roles)) {
    return canViewModule(user, "GUEST_REVIEWS");
  }
  return false;
}

function isHotelReviewsPath(pathname: string): boolean {
  return (
    pathname === ROUTES.HOTEL_REVIEWS.LIST ||
    pathname.startsWith(`${ROUTES.HOTEL_REVIEWS.LIST}/`)
  );
}

function canAccessHotelGuestReviews(user: User | null): boolean {
  if (isHotelManagerStaffRole(user?.roles)) {
    return canViewModule(user, "GUEST_REVIEWS");
  }
  return canManageHotelReviews(user?.roles);
}

function isAgentsPath(pathname: string): boolean {
  return pathname === ROUTES.AGENTS.LIST || pathname.startsWith("/agents/");
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin/");
}

function canViewAnyReportPath(user: User | null): boolean {
  if (isPlatformAccountantRole(user?.roles)) {
    return (
      canViewPaymentReport(user?.roles) ||
      canViewHotelPayoutMis(user?.roles) ||
      canViewTransportPayoutMis(user?.roles) ||
      canViewHotelBookingFinancialMis(user?.roles)
    );
  }
  if (isAuditorRole(user?.roles)) {
    return (
      canViewPaymentReport(user?.roles) ||
      canViewHotelPayoutMis(user?.roles) ||
      canViewTransportPayoutMis(user?.roles) ||
      canViewHotelBookingFinancialMis(user?.roles) ||
      canViewHotelBdReports(user?.roles)
    );
  }
  if (isHotelAccountantRole(user?.roles)) {
    return canViewModule(user, "PAYMENTS");
  }
  if (isHotelManagerStaffRole(user?.roles)) {
    return (
      canViewModule(user, "REPORT_BOOKING_SUMMARY") ||
      canViewModule(user, "REPORT_PROMOTIONS") ||
      canViewModule(user, "REPORT_RATE_HEALTH") ||
      canViewModule(user, "REPORT_INVENTORY_ALLOCATION") ||
      canViewModule(user, "PAYMENTS")
    );
  }
  return (
    canViewModule(user, "BOOKINGS") ||
    canViewPaymentReport(user?.roles) ||
    canViewHotelPayoutMis(user?.roles) ||
    canViewHotelBdReports(user?.roles) ||
    canViewHotelBdPipeline(user?.roles) ||
    canViewSalesManagerReports(user?.roles) ||
    canViewHotelBookingFinancialMis(user?.roles)
  );
}

function canViewReportsPath(user: User | null, pathOnly: string): boolean {
  if (pathOnly === ROUTES.REPORTS.LIST) {
    return canViewAnyReportPath(user);
  }

  if (isAuditorRole(user?.roles)) {
    if (pathOnly === ROUTES.REPORTS.BOOKING_SUMMARY) return true;
    if (pathOnly === ROUTES.REPORTS.PROMOTIONS) return true;
    if (pathOnly === ROUTES.REPORTS.RATE_HEALTH) return true;
    if (pathOnly === ROUTES.REPORTS.INVENTORY_ALLOCATION) return true;
    if (
      pathOnly === ROUTES.REPORTS.NET_EARNINGS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.NET_EARNINGS}/`)
    ) {
      return canViewPaymentReport(user?.roles);
    }
    if (
      pathOnly === ROUTES.REPORTS.HOTEL_PAYOUTS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.HOTEL_PAYOUTS}/`)
    ) {
      return canViewHotelPayoutMis(user?.roles);
    }
    if (
      pathOnly === ROUTES.REPORTS.TRANSPORT_PAYOUTS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.TRANSPORT_PAYOUTS}/`)
    ) {
      return canViewTransportPayoutMis(user?.roles);
    }
    if (pathOnly === ROUTES.REPORTS.HOTEL_BD_DASHBOARD) {
      return canViewHotelBdReports(user?.roles);
    }
    if (pathOnly === ROUTES.REPORTS.HOTEL_BD_PIPELINE) {
      return canViewHotelBdPipeline(user?.roles);
    }
    if (isSalesManagerReportPath(pathOnly)) {
      return canViewSalesManagerReports(user?.roles);
    }
    if (isHotelBookingFinancialMisPath(pathOnly)) {
      return canViewHotelBookingFinancialMis(user?.roles);
    }
    if (pathOnly === "/reports/performance") return true;
    return false;
  }

  // Hotel Accountant: Payments report only (no booking/other report pages).
  if (isHotelAccountantRole(user?.roles)) {
    if (
      pathOnly === ROUTES.REPORTS.NET_EARNINGS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.NET_EARNINGS}/`) ||
      pathOnly === ROUTES.REPORTS.HOTEL_PAYOUTS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.HOTEL_PAYOUTS}/`)
    ) {
      return canViewModule(user, "PAYMENTS");
    }
    return false;
  }

  // Hotel Manager: each report is a separate permission.
  if (isHotelManagerStaffRole(user?.roles)) {
    if (pathOnly === ROUTES.REPORTS.BOOKING_SUMMARY) {
      return canViewModule(user, "REPORT_BOOKING_SUMMARY");
    }
    if (pathOnly === ROUTES.REPORTS.PROMOTIONS) {
      return canViewModule(user, "REPORT_PROMOTIONS");
    }
    if (pathOnly === ROUTES.REPORTS.RATE_HEALTH) {
      return canViewModule(user, "REPORT_RATE_HEALTH");
    }
    if (pathOnly === ROUTES.REPORTS.INVENTORY_ALLOCATION) {
      return canViewModule(user, "REPORT_INVENTORY_ALLOCATION");
    }
    if (
      pathOnly === ROUTES.REPORTS.NET_EARNINGS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.NET_EARNINGS}/`) ||
      pathOnly === ROUTES.REPORTS.HOTEL_PAYOUTS ||
      pathOnly.startsWith(`${ROUTES.REPORTS.HOTEL_PAYOUTS}/`)
    ) {
      return canViewModule(user, "PAYMENTS");
    }
    return false;
  }

  if (pathOnly === ROUTES.REPORTS.BOOKING_SUMMARY) {
    return canViewModule(user, "BOOKINGS");
  }

  if (pathOnly === ROUTES.REPORTS.PROMOTIONS) {
    return canViewModule(user, "BOOKINGS");
  }

  if (pathOnly === ROUTES.REPORTS.RATE_HEALTH) {
    return canViewModule(user, "BOOKINGS");
  }

  if (pathOnly === ROUTES.REPORTS.INVENTORY_ALLOCATION) {
    return canViewModule(user, "BOOKINGS");
  }

  if (
    pathOnly === ROUTES.REPORTS.NET_EARNINGS ||
    pathOnly.startsWith(`${ROUTES.REPORTS.NET_EARNINGS}/`)
  ) {
    return canViewPaymentReport(user?.roles);
  }

  if (
    pathOnly === ROUTES.REPORTS.HOTEL_PAYOUTS ||
    pathOnly.startsWith(`${ROUTES.REPORTS.HOTEL_PAYOUTS}/`)
  ) {
    return canViewHotelPayoutMis(user?.roles);
  }

  if (
    pathOnly === ROUTES.REPORTS.HOTEL_PAYOUTS ||
    pathOnly.startsWith(`${ROUTES.REPORTS.HOTEL_PAYOUTS}/`)
  ) {
    return canViewHotelPayoutMis(user?.roles);
  }

  if (
    pathOnly === ROUTES.REPORTS.TRANSPORT_PAYOUTS ||
    pathOnly.startsWith(`${ROUTES.REPORTS.TRANSPORT_PAYOUTS}/`)
  ) {
    return canViewTransportPayoutMis(user?.roles);
  }

  if (pathOnly === ROUTES.REPORTS.HOTEL_BD_DASHBOARD) {
    return canViewHotelBdReports(user?.roles);
  }

  if (pathOnly === ROUTES.REPORTS.HOTEL_BD_PIPELINE) {
    return canViewHotelBdPipeline(user?.roles);
  }

  if (isSalesManagerReportPath(pathOnly)) {
    return canViewSalesManagerReports(user?.roles);
  }

  if (isHotelBookingFinancialMisPath(pathOnly)) {
    return canViewHotelBookingFinancialMis(user?.roles);
  }

  if (pathOnly === "/reports/performance") {
    return (
      canViewModule(user, "ANALYTICS") || canViewModule(user, "BOOKINGS")
    );
  }

  return false;
}

function canViewAdminPath(user: User | null, pathOnly: string): boolean {
  if (isSuperAdmin(user?.roles)) return true;

  if (pathOnly.startsWith("/admin/hotels/review")) {
    return (
      isReviewerPortalRole(user?.roles) ||
      !!user?.roles?.includes("ONBOARDING_REVIEWER")
    );
  }

  if (pathOnly === ROUTES.ADMIN.TRAVEL_PARTNERS) {
    return isZonalManagerSalesRole(user?.roles);
  }

  if (
    pathOnly.startsWith("/admin/users") ||
    pathOnly === ROUTES.ADMIN.COMMISSION_AND_TAX ||
    pathOnly.startsWith(ROUTES.ADMIN.DOCUMENT_REVIEW)
  ) {
    return false;
  }

  return false;
}

function canViewAgentsPath(user: User | null): boolean {
  if (isSuperAdmin(user?.roles)) return true;
  return (
    isSalesManagerRole(user?.roles) && !isZonalManagerSalesRole(user?.roles)
  );
}

function canHelpdeskAgentViewPath(pathOnly: string): boolean {
  return (
    pathOnly === "/" ||
    pathOnly === "" ||
    pathOnly.startsWith("/profile") ||
    isHelpdeskTicketsPath(pathOnly) ||
    isHelpdeskOrdersPath(pathOnly)
  );
}

/** Auditor: order lookup + all report screens (no Tickets). */
function canAuditorViewPath(pathOnly: string): boolean {
  return (
    pathOnly === "/" ||
    pathOnly === "" ||
    pathOnly.startsWith("/profile") ||
    isHelpdeskOrdersPath(pathOnly) ||
    pathOnly === ROUTES.REPORTS.LIST ||
    pathOnly.startsWith("/reports/")
  );
}

/** Sales Manager: agent portfolio + sales reports. */
function canSalesManagerViewPath(pathOnly: string): boolean {
  return (
    pathOnly === "/" ||
    pathOnly === "" ||
    pathOnly.startsWith("/profile") ||
    isSalesManagerReportPath(pathOnly) ||
    isHotelBookingFinancialMisPath(pathOnly) ||
    isAgentsPath(pathOnly)
  );
}

function canZonalManagerSalesViewPath(pathOnly: string): boolean {
  return (
    pathOnly === "/" ||
    pathOnly === "" ||
    pathOnly.startsWith("/profile") ||
    isSalesManagerReportPath(pathOnly) ||
    isHotelBookingFinancialMisPath(pathOnly) ||
    pathOnly === ROUTES.ADMIN.TRAVEL_PARTNERS
  );
}

function canOnboardingReviewerViewPath(pathOnly: string): boolean {
  return (
    pathOnly === "/" ||
    pathOnly === "" ||
    pathOnly.startsWith("/profile") ||
    pathOnly.startsWith("/admin/hotels/review")
  );
}

function canReviewerPortalViewPath(user: User | null, pathOnly: string): boolean {
  if (pathOnly === "/" || pathOnly === "") return true;
  if (pathOnly.startsWith("/profile")) return true;
  if (pathOnly.startsWith("/admin/hotels/review")) return true;
  if (
    pathOnly === ROUTES.PROPERTIES.MY_PROPERTY &&
    hasAnyRole(user?.roles, [ROLES.HOTEL_OWNER, ROLES.HOTEL_MANAGER])
  ) {
    return true;
  }
  if (pathOnly.startsWith("/properties/hotel") && canOnboardHotel(user?.roles)) {
    return true;
  }
  if (pathOnly.startsWith("/reports/")) {
    return canViewReportsPath(user, pathOnly);
  }
  if (isReviewMisPath(pathOnly)) {
    return canAccessReviewMis(user);
  }
  if (isReviewModerationPath(pathOnly)) {
    return canModerateReviews(user?.roles);
  }
  if (isHotelReviewsPath(pathOnly)) {
    return canAccessHotelGuestReviews(user);
  }
  if (pathOnly.startsWith("/property/information/")) {
    const module = getModuleFromPath(pathOnly);
    return module ? canViewModule(user, module) : false;
  }
  if (pathOnly === ROUTES.QC.DASHBOARD && isQcReviewerRole(user?.roles)) {
    return true;
  }
  return false;
}

function canViewUnmappedPath(user: User | null, pathOnly: string): boolean {
  if (pathOnly === "/" || pathOnly === "") return true;

  if (pathOnly === "/home") {
    return hasPermissionBypass(user);
  }

  if (pathOnly === ROUTES.PROPERTIES.MY_PROPERTY) {
    return (
      hasPermissionBypass(user) ||
      isHotelBdRole(user?.roles) ||
      !!user?.roles?.some((role) =>
        ["HOTEL_MANAGER", "FRONT_DESK_EXEC", "HOTEL_ACCOUNTANT", "ACCOUNTANT"].includes(role),
      )
    );
  }

  if (pathOnly.startsWith("/properties/hotel")) {
    return canOnboardHotel(user?.roles);
  }

  if (pathOnly === ROUTES.MORE.LIST) {
    return hasAnyRole(user?.roles, [
      ROLES.SUPER_ADMIN,
      ROLES.HOTEL_OWNER,
      ROLES.HOTEL_MANAGER,
    ]);
  }

  if (isReviewMisPath(pathOnly)) {
    return canAccessReviewMis(user);
  }

  if (isReviewModerationPath(pathOnly)) {
    return false;
  }

  if (isHotelReviewsPath(pathOnly)) {
    return canAccessHotelGuestReviews(user);
  }

  if (pathOnly === ROUTES.QC.DASHBOARD) {
    return isSuperAdmin(user?.roles);
  }

  if (pathOnly === ROUTES.PROPERTY_INFO.LIST) {
    return (
      canViewModule(user, "PROPERTY_BASIC_INFO") ||
      canViewModule(user, "PROPERTY_ROOMS_RATEPLANS") ||
      canViewModule(user, "PROPERTY_PHOTOS_VIDEOS") ||
      canViewModule(user, "PROPERTY_AMENITIES_RESTAURANTS") ||
      canViewModule(user, "PROPERTY_POLICY_RULES") ||
      canViewModule(user, "PROPERTY_FINANCE") ||
      canViewModule(user, "PROPERTY_DOCUMENT")
    );
  }

  return false;
}

/** Platform accountant / finance manager: bookings, financial reports, settlements, and property finance. */
function canPlatformAccountantViewPath(pathOnly: string): boolean {
  if (pathOnly === "/" || pathOnly === "") return true;
  if (pathOnly.startsWith("/profile")) return true;
  if (pathOnly === ROUTES.PROPERTIES.MY_PROPERTY) return true;
  if (
    pathOnly === ROUTES.PROPERTY_INFO.LIST ||
    pathOnly === ROUTES.PROPERTY_INFO.FINANCE
  ) {
    return true;
  }
  if (
    pathOnly === ROUTES.BOOKINGS.LIST ||
    pathOnly.startsWith(`${ROUTES.BOOKINGS.LIST}/`)
  ) {
    return true;
  }
  if (pathOnly === ROUTES.REPORTS.LIST || pathOnly.startsWith("/reports/")) {
    return true;
  }
  if (isSettlementPath(pathOnly)) return true;
  return false;
}

function passesRoleScopedPathGuard(user: User | null, pathOnly: string): boolean {
  if (isSuperAdmin(user?.roles)) return true;

  if (isPlatformAccountantRole(user?.roles)) {
    return canPlatformAccountantViewPath(pathOnly);
  }

  if (isZonalManagerSalesRole(user?.roles)) {
    return canZonalManagerSalesViewPath(pathOnly);
  }

  if (isHelpdeskAgentRole(user?.roles)) {
    return canHelpdeskAgentViewPath(pathOnly);
  }

  if (isAuditorRole(user?.roles)) {
    return canAuditorViewPath(pathOnly);
  }

  if (isSalesManagerRole(user?.roles)) {
    return canSalesManagerViewPath(pathOnly);
  }

  if (isReviewerPortalRole(user?.roles)) {
    return canReviewerPortalViewPath(user, pathOnly);
  }

  if (user?.roles?.includes("ONBOARDING_REVIEWER")) {
    return canOnboardingReviewerViewPath(pathOnly);
  }

  return true;
}

export function canViewPath(user: User | null, pathname: string): boolean {
  const pathOnly = pathname.split("?")[0];

  if (pathOnly.startsWith("/profile")) {
    return true;
  }

  if (pathOnly === ROUTES.REPORTS.LIST || pathOnly.startsWith("/reports/")) {
    return canViewReportsPath(user, pathOnly);
  }

  if (isSettlementPath(pathOnly)) {
    return canViewSupplierSettlement(user?.roles);
  }

  if (isReviewMisPath(pathOnly)) {
    return canAccessReviewMis(user);
  }

  if (isReviewModerationPath(pathOnly)) {
    return canModerateReviews(user?.roles);
  }

  if (isHotelReviewsPath(pathOnly)) {
    return canAccessHotelGuestReviews(user);
  }

  if (isHelpdeskPath(pathOnly)) {
    if (isHelpdeskTicketsPath(pathOnly)) {
      return canViewHelpdeskTickets(user?.roles);
    }
    if (isHelpdeskOrdersPath(pathOnly)) {
      return (
        canViewHelpdeskBookings(user?.roles) ||
        canViewHelpdeskTickets(user?.roles)
      );
    }
    // Helpdesk agents may only use Tickets + Order Lookup (404 for other helpdesk URLs).
    if (isHelpdeskAgentRole(user?.roles) && !isSuperAdmin(user?.roles)) {
      return false;
    }
    return (
      canViewHelpdeskTickets(user?.roles) ||
      canViewHelpdeskBookings(user?.roles)
    );
  }

  if (isAdminPath(pathOnly)) {
    return canViewAdminPath(user, pathOnly);
  }

  if (isAgentsPath(pathOnly)) {
    return canViewAgentsPath(user);
  }

  if (pathOnly === "/analytics" || pathOnly.startsWith("/analytics/")) {
    return (
      canViewModule(user, "ANALYTICS") || canViewModule(user, "BOOKINGS")
    );
  }

  if (!passesRoleScopedPathGuard(user, pathOnly)) {
    return false;
  }

  const module = getModuleFromPath(pathOnly);

  if (isHotelBdRole(user?.roles)) {
    if (module === "PROPERTY_FINANCE") return false;
    if (module) return canViewModule(user, module);
    return canViewUnmappedPath(user, pathOnly);
  }

  if (!module) {
    return canViewUnmappedPath(user, pathOnly);
  }

  return canViewModule(user, module);
}

export function canEditPath(user: User | null, pathname: string): boolean {
  const pathOnly = pathname.split("?")[0];
  const module = getModuleFromPath(pathOnly);
  if (isHotelBdRole(user?.roles) && module === "PROPERTY_FINANCE") return false;
  if (!module) return true;
  return canEditModule(user, module);
}

/** Basic Information → Property Details tab: Super Admin only (not Hotel Owner / staff). */
export function canEditBasicInfoPropertyDetails(user: User | null): boolean {
  if (!user) return true;
  return isSuperAdmin(user.roles);
}

/**
 * Basic Information → Property Details description field:
 * Super Admin, Hotel Owner, or staff with PROPERTY_BASIC_INFO edit permission.
 */
export function canEditBasicInfoPropertyDescription(
  user: User | null,
): boolean {
  if (!user) return true;
  if (isSuperAdmin(user.roles)) return true;
  if (user.roles?.includes("HOTEL_OWNER")) return true;
  if (!hasPermissionBypass(user))
    return canEditModule(user, "PROPERTY_BASIC_INFO");
  return false;
}

/** Basic Information → How to Reach tab: Super Admin only. */
export function canEditBasicInfoHowToReach(user: User | null): boolean {
  if (!user) return true;
  return isSuperAdmin(user.roles);
}

/**
 * Basic Information → Property Contact Details tab:
 * Super Admin, Hotel Owner, or staff with PROPERTY_BASIC_INFO edit permission.
 */
export function canEditBasicInfoContactDetails(user: User | null): boolean {
  if (!user) return true;
  if (isSuperAdmin(user.roles)) return true;
  if (user.roles?.includes("HOTEL_OWNER")) return true;
  if (!hasPermissionBypass(user))
    return canEditModule(user, "PROPERTY_BASIC_INFO");
  return false;
}

/**
 * Enforce granular Basic Information API rules for users who bypass module checks (e.g. HOTEL_OWNER).
 * Returns true if the request should be blocked.
 */
export function shouldBlockBasicInfoWriteRequest(
  requestUrl: string,
  method: string,
  user: User | null,
): boolean {
  if (!user) return false;
  const m = (method || "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(m)) return false;

  let path = requestUrl.split("?")[0];
  if (path.includes("://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return false;
    }
  }
  const n = path.startsWith("/") ? path : `/${path}`;

  const superAdmin = isSuperAdmin(user.roles);

  if (/\/hotel\/[^/]+\/profile$/i.test(n)) {
    return !canEditBasicInfoPropertyDescription(user);
  }
  if (/\/admin\/hotel\/[^/]+\/(profile|status|location|address)$/i.test(n)) {
    return !superAdmin;
  }
  if (
    /\/hotel\/[^/]+\/contact$/i.test(n) ||
    /\/admin\/hotel\/[^/]+\/contact$/i.test(n)
  ) {
    return !canEditBasicInfoContactDetails(user);
  }
  return false;
}
