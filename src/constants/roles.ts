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
  PACKAGE_BD: { bg: "bg-violet-100", text: "text-violet-800" },
  TRANSPORT_BD: { bg: "bg-sky-100", text: "text-sky-800" },
  SALES_MANAGER: { bg: "bg-emerald-100", text: "text-emerald-800" },
  ZONAL_MANAGER_HOTEL: { bg: "bg-indigo-100", text: "text-indigo-800" },
  ZontalHotelManager: { bg: "bg-indigo-100", text: "text-indigo-800" },
  ZONAL_MANAGER_SALES: { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
  FINANCE: { bg: "bg-amber-100", text: "text-amber-800" },
  QC: { bg: "bg-rose-100", text: "text-rose-800" },
  HELPDESK_AGENT: { bg: "bg-teal-100", text: "text-teal-800" },
  AUDITOR: { bg: "bg-slate-100", text: "text-slate-800" },
};

/** Friendly labels for admin-managed roles not present in `Role` union. */
export const ADMIN_MANAGED_ROLE_LABELS: Record<string, string> = {
  HOTEL_BD: "Hotel BD",
  PACKAGE_BD: "Package BD",
  TRANSPORT_BD: "Transport BD",
  SALES_MANAGER: "Sales Manager",
  ZONAL_MANAGER_HOTEL: "Zonal Manager Hotel",
  ZontalHotelManager: "Zonal Hotel Manager",
  ZONAL_MANAGER_SALES: "Zonal Manager Sales",
  FINANCE: "Finance",
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

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[] | undefined, role: Role): boolean {
  if (!userRoles) return false;
  return userRoles.includes(role);
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
export const SUPER_ADMIN_EXCLUDED_EDIT_ROLES = [
  "HOTEL_MANAGER",
  "ACCOUNTANT",
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
