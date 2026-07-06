import { cn } from "@/lib/utils";

export type ListStatusFilterValue = "active" | "inactive";

export function matchesListStatusFilter(
  active: boolean | undefined | null,
  filter: ListStatusFilterValue,
): boolean {
  if (filter === "active") return active !== false;
  return active === false;
}

interface ListStatusFilterTabsProps {
  value: ListStatusFilterValue;
  onChange: (value: ListStatusFilterValue) => void;
  activeCount?: number;
  inactiveCount?: number;
  className?: string;
}

export function ListStatusFilterTabs({
  value,
  onChange,
  activeCount,
  inactiveCount,
  className,
}: ListStatusFilterTabsProps) {
  const tabConfig: Record<
    ListStatusFilterValue,
    { label: string; count?: number; selected: string; idle: string }
  > = {
    active: {
      label: "Active",
      count: activeCount,
      selected:
        "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 font-semibold",
      idle: "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:ring-1 hover:ring-emerald-200",
    },
    inactive: {
      label: "Inactive",
      count: inactiveCount,
      selected:
        "bg-slate-600 text-white shadow-sm ring-2 ring-slate-600/30 font-semibold",
      idle: "text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:ring-1 hover:ring-slate-200",
    },
  };

  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1",
        className,
      )}
      role="tablist"
      aria-label="Filter by status"
    >
      {(Object.keys(tabConfig) as ListStatusFilterValue[]).map((tabId) => {
        const tab = tabConfig[tabId];
        const isSelected = value === tabId;
        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tabId)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150",
              isSelected ? tab.selected : tab.idle,
            )}
          >
            {tab.label}
            {tab.count !== undefined ? ` (${tab.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}
