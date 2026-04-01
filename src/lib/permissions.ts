import type { User } from "@/types";
import { isSuperAdmin } from "@/constants/roles";

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
  | "PROPERTY_DOCUMENT";

export interface UserPermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

const FRONT_DESK_ALLOWED_MODULES: PermissionModule[] = ["BOOKINGS"];
const ACCOUNTANT_ALLOWED_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "FINANCE",
  "PROPERTY_FINANCE",
];
const HOTEL_MANAGER_ALLOWED_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "MY_TEAM",
  "RATES_INVENTORY",
  "DASHBOARD",
  "PROPERTY_BASIC_INFO",
  "PROPERTY_ROOMS_RATEPLANS",
  "PROPERTY_PHOTOS_VIDEOS",
  "PROPERTY_AMENITIES_RESTAURANTS",
  "PROPERTY_POLICY_RULES",
];

export function hasPermissionBypass(user: Pick<User, "roles"> | null): boolean {
  const roles = user?.roles || [];
  return roles.includes("SUPER_ADMIN") || roles.includes("HOTEL_OWNER");
}

export function getModuleFromPath(pathname: string): PermissionModule | null {
  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return "BOOKINGS";
  }
  if (pathname === "/team" || pathname.startsWith("/team/")) {
    return "MY_TEAM";
  }
  if (
    pathname === "/inventory/room-types" ||
    pathname === "/inventory/rate-plans" ||
    pathname === "/rates/bulk-update" ||
    pathname === "/restrictions/bulk-update"
  ) {
    return "RATES_INVENTORY";
  }
  if (pathname === "/promotions" || pathname.startsWith("/promotions/")) {
    return "OFFERS";
  }
  if (pathname === "/analytics") {
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
  if (pathname === "/property/information/finance") {
    return "PROPERTY_FINANCE";
  }
  if (pathname === "/property/information/document") {
    return "PROPERTY_DOCUMENT";
  }
  return null;
}

const MODULE_ALIASES: Partial<Record<PermissionModule, PermissionModule[]>> = {
  // Backward compatibility for setups still sending broader module names.
  PROPERTY_FINANCE: ["FINANCE"],
  PROPERTY_DOCUMENT: ["CONTENT"],
};

function findPermission(user: User | null, module: PermissionModule): UserPermission | null {
  const permissions = user?.permissions || [];
  const allowedModules = [module, ...(MODULE_ALIASES[module] || [])];
  return (
    permissions.find((item) => allowedModules.includes(item.module as PermissionModule)) ||
    null
  );
}

function getConstrainedRole(
  user: Pick<User, "roles"> | null,
): "FRONT_DESK_EXEC" | "ACCOUNTANT" | "HOTEL_MANAGER" | null {
  const roles = user?.roles || [];
  // Most restrictive first if multiple scoped roles exist.
  if (roles.includes("FRONT_DESK_EXEC")) return "FRONT_DESK_EXEC";
  if (roles.includes("ACCOUNTANT")) return "ACCOUNTANT";
  if (roles.includes("HOTEL_MANAGER")) return "HOTEL_MANAGER";
  return null;
}

function canRoleAccessModule(user: User | null, module: PermissionModule): boolean {
  const constrainedRole = getConstrainedRole(user);
  if (!constrainedRole) return true;
  if (constrainedRole === "FRONT_DESK_EXEC") {
    return FRONT_DESK_ALLOWED_MODULES.includes(module);
  }
  if (constrainedRole === "ACCOUNTANT") {
    return ACCOUNTANT_ALLOWED_MODULES.includes(module);
  }
  if (constrainedRole === "HOTEL_MANAGER") {
    return HOTEL_MANAGER_ALLOWED_MODULES.includes(module);
  }
  return true;
}

export function canViewModule(user: User | null, module: PermissionModule): boolean {
  if (!user) return true;
  if (hasPermissionBypass(user)) return true;
  if (!canRoleAccessModule(user, module)) return false;
  const permission = findPermission(user, module);
  return !!permission?.canView;
}

export function canEditModule(user: User | null, module: PermissionModule): boolean {
  if (!user) return true;
  if (hasPermissionBypass(user)) return true;
  if (!canRoleAccessModule(user, module)) return false;
  // Bookings is always view-only for non-bypass roles.
  if (module === "BOOKINGS") return false;
  // Accountant modules are view-only by policy.
  const constrainedRole = getConstrainedRole(user);
  if (constrainedRole === "ACCOUNTANT") return false;
  // Front desk has only bookings and bookings is already view-only above.
  if (constrainedRole === "FRONT_DESK_EXEC") return false;
  const permission = findPermission(user, module);
  return !!permission?.canEdit;
}

export function canViewPath(user: User | null, pathname: string): boolean {
  const module = getModuleFromPath(pathname);
  if (!module) return true;
  return canViewModule(user, module);
}

export function canEditPath(user: User | null, pathname: string): boolean {
  const module = getModuleFromPath(pathname);
  if (!module) return true;
  return canEditModule(user, module);
}

/** Basic Information → Property Details tab: Super Admin only (not Hotel Owner / staff). */
export function canEditBasicInfoPropertyDetails(user: User | null): boolean {
  if (!user) return true;
  return isSuperAdmin(user.roles);
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
  if (!hasPermissionBypass(user)) return canEditModule(user, "PROPERTY_BASIC_INFO");
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
    return !superAdmin;
  }
  if (/\/admin\/hotel\/[^/]+\/(profile|status|location|address)$/i.test(n)) {
    return !superAdmin;
  }
  if (/\/hotel\/[^/]+\/contact$/i.test(n) || /\/admin\/hotel\/[^/]+\/contact$/i.test(n)) {
    return !canEditBasicInfoContactDetails(user);
  }
  return false;
}

