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
  PACKAGE_MANAGER: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

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
