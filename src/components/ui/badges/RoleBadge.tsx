import { cn } from "@/lib/utils";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  ADMIN_MANAGED_ROLE_BADGE_STYLES,
  type Role,
} from "@/constants/roles";

interface RoleBadgeProps {
  roles: string[];
  className?: string;
  maxVisible?: number;
}

const DEFAULT_ROLE_STYLE = {
  bg: "bg-gray-100",
  text: "text-gray-700",
} as const;

function toRoleLabel(role: string): string {
  const label = ROLE_LABELS[role as Role];
  if (label) return label;

  return role
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function RoleBadge({
  roles,
  className,
  maxVisible = 1,
}: RoleBadgeProps) {
  if (!roles || roles.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700",
          className,
        )}
      >
        No Role
      </span>
    );
  }

  const uniqueRoles = [...new Set(roles)];
  const visibleRoles = uniqueRoles.slice(0, maxVisible);
  const hiddenCount = Math.max(uniqueRoles.length - visibleRoles.length, 0);
  const hiddenRolesLabel = hiddenCount
    ? uniqueRoles.slice(maxVisible).map(toRoleLabel).join(", ")
    : "";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleRoles.map((role) => {
        const config =
          ADMIN_MANAGED_ROLE_BADGE_STYLES[role] ||
          ROLE_COLORS[role as Role] ||
          DEFAULT_ROLE_STYLE;
        const label = toRoleLabel(role);

        return (
          <span
            key={role}
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
              config.bg,
              config.text,
              className,
            )}
          >
            {label}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span
          title={hiddenRolesLabel}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-600 border border-gray-200"
        >
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
