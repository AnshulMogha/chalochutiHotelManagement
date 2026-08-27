import type { LucideIcon } from "lucide-react";
import { CreditCard, Pencil, UtensilsCrossed } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

export const ROOMS_BRAND = {
  primary: "#2f3d95",
  primarySoft: "#eef2ff",
  primaryHover: "#263578",
} as const;

export function StatusPill({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-amber-200",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {active ? "Live" : "Inactive"}
    </span>
  );
}

export function ActionLink({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  iconOnly = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary";
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        iconOnly
          ? "h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          : "gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
        !iconOnly &&
          (variant === "primary"
            ? "bg-[#eef2ff] text-[#2f3d95] hover:bg-[#2f3d95] hover:text-white"
            : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"),
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly ? label : null}
    </button>
  );
}

function MetaChip({
  icon: Icon,
  value,
  tone,
}: {
  icon: LucideIcon;
  value: string;
  tone: "sky" | "teal" | "slate";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-[140px] items-center gap-1 truncate rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
        tones[tone],
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      <span className="truncate">{value}</span>
    </span>
  );
}

export function RatePlanRow({
  name,
  mealPlan,
  paymentMode,
  active,
  onToggle,
  onEdit,
}: {
  name: string;
  mealPlan: string;
  paymentMode: string;
  active: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <StatusPill active={active} className="shrink-0 sm:hidden" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MetaChip icon={UtensilsCrossed} value={mealPlan} tone="sky" />
        <MetaChip
          icon={CreditCard}
          value={paymentMode}
          tone={paymentMode === "Not set" ? "slate" : "teal"}
        />
      </div>

      <div className="flex items-center gap-1 sm:justify-end">
        <StatusPill active={active} className="hidden shrink-0 sm:inline-flex" />
        <Toggle
          compact
          checked={active}
          onChange={() => onToggle()}
          checkedLabel="Set rate plan live"
          uncheckedLabel="Set rate plan inactive"
        />
        <ActionLink
          icon={Pencil}
          label="Edit rate plan"
          onClick={onEdit}
          iconOnly
        />
      </div>
    </div>
  );
}
