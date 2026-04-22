import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_STATUS_CONFIG, type AccountStatus } from "@/constants/status";

interface StatusBadgeProps {
  status?: AccountStatus;
  className?: string;
}

const iconMap = {
  check: CheckCircle2,
  x: XCircle,
  alert: AlertCircle,
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  const config = ACCOUNT_STATUS_CONFIG[status];
  const Icon = iconMap[config.icon as keyof typeof iconMap] || CheckCircle2;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

