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
  const tabs: { id: ListStatusFilterValue; label: string; count?: number }[] = [
    { id: "active", label: "Active", count: activeCount },
    { id: "inactive", label: "Inactive", count: inactiveCount },
  ];

  return (
    <div
      className={cn(
        "inline-flex gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200",
        className,
      )}
      role="tablist"
      aria-label="Filter by status"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            value === tab.id
              ? "bg-white text-[#2f3d95] shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  );
}
