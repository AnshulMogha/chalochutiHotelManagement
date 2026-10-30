import { cn } from "@/lib/utils";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  ADMIN_MANAGED_ROLE_BADGE_STYLES,
  ADMIN_MANAGED_ROLE_LABELS,
  type Role,
} from "@/constants/roles";

interface RoleBadgeProps {
  roles: string[];
  className?: string;
  maxVisible?: number;
  /**
   * color — full palette pills
   * soft — softer pastels (tables)
   * muted — slate only
   */
  variant?: "color" | "soft" | "muted";
}

const DEFAULT_ROLE_STYLE = {
  bg: "bg-slate-100",
  text: "text-slate-700",
} as const;

/** Soft pastels that stay readable in dense tables without looking neon. */
const SOFT_ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: "bg-rose-50", text: "text-rose-700" },
  HOTEL_OWNER: { bg: "bg-sky-50", text: "text-sky-800" },
  HOTEL_MANAGER: { bg: "bg-violet-50", text: "text-violet-700" },
  HOTEL_BD: { bg: "bg-blue-50", text: "text-blue-800" },
  PACKAGE_CREATOR: { bg: "bg-purple-50", text: "text-purple-700" },
  PACKAGE_BD: { bg: "bg-violet-50", text: "text-violet-700" },
  TRANSPORT_BD: { bg: "bg-cyan-50", text: "text-cyan-800" },
  TRAVEL_AGENT_ADMIN: { bg: "bg-teal-50", text: "text-teal-800" },
  TRAVEL_AGENT_USER: { bg: "bg-teal-50", text: "text-teal-700" },
  TRANSPORT_AGENT_ADMIN: { bg: "bg-orange-50", text: "text-orange-800" },
  TRANSPORT_AGENT_USER: { bg: "bg-amber-50", text: "text-amber-800" },
  SALES_MANAGER: { bg: "bg-emerald-50", text: "text-emerald-800" },
  ZONAL_MANAGER_HOTEL: { bg: "bg-indigo-50", text: "text-indigo-800" },
  ZONAL_MANAGER_SALES: { bg: "bg-fuchsia-50", text: "text-fuchsia-800" },
  FINANCE_MANAGER: { bg: "bg-yellow-50", text: "text-yellow-800" },
  HOTEL_ACCOUNTANT: { bg: "bg-amber-50", text: "text-amber-800" },
  ACCOUNTANT: { bg: "bg-amber-50", text: "text-amber-800" },
  FRONT_DESK_EXEC: { bg: "bg-cyan-50", text: "text-cyan-800" },
  QC: { bg: "bg-rose-50", text: "text-rose-700" },
  HELPDESK_AGENT: { bg: "bg-teal-50", text: "text-teal-800" },
  AUDITOR: { bg: "bg-slate-100", text: "text-slate-700" },
};

function toRoleLabel(role: string): string {
  const label = ROLE_LABELS[role as Role];
  if (label) return label;
  const adminLabel = ADMIN_MANAGED_ROLE_LABELS[role];
  if (adminLabel) return adminLabel;

  return role
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function resolveStyle(
  role: string,
  variant: NonNullable<RoleBadgeProps["variant"]>,
) {
  if (variant === "muted") {
    return { bg: "bg-slate-100", text: "text-slate-700" };
  }
  if (variant === "soft") {
    return SOFT_ROLE_STYLES[role] || DEFAULT_ROLE_STYLE;
  }
  return (
    ADMIN_MANAGED_ROLE_BADGE_STYLES[role] ||
    ROLE_COLORS[role as Role] ||
    DEFAULT_ROLE_STYLE
  );
}

export function RoleBadge({
  roles,
  className,
  maxVisible = 1,
  variant = "color",
}: RoleBadgeProps) {
  if (!roles || roles.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap bg-slate-100 text-slate-500",
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
    <div className="flex min-w-0 max-w-full items-center gap-1 self-center overflow-hidden leading-tight">
      {visibleRoles.map((role) => {
        const config = resolveStyle(role, variant);
        const label = toRoleLabel(role);

        return (
          <span
            key={role}
            title={label}
            className={cn(
              // min-w-0 + inner truncate keeps the pill bg wrapping text correctly
              "inline-flex h-auto min-w-0 max-w-full items-center self-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset",
              variant === "muted" ? "ring-slate-200/80" : "ring-black/5",
              config.bg,
              config.text,
              className,
            )}
          >
            <span className="truncate">{label}</span>
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span
          title={hiddenRolesLabel}
          className="inline-flex h-auto shrink-0 items-center self-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-slate-600"
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
