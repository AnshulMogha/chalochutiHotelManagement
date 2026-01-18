import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_COLORS, type Role } from "@/constants/roles";

interface RoleBadgeProps {
  roles: string[];
  className?: string;
}

export function RoleBadge({ roles, className }: RoleBadgeProps) {
  if (!roles || roles.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700",
          className
        )}
      >
        No Role
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role, index) => {
        const roleKey = role as Role;
        const config = ROLE_COLORS[roleKey] || { bg: "bg-gray-100", text: "text-gray-700" };
        const label = ROLE_LABELS[roleKey] || role;

        return (
          <span
            key={index}
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
              config.bg,
              config.text,
              className
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

