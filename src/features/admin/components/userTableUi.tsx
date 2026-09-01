import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserColumnHeader({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-white">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" strokeWidth={2.25} />
      {label}
    </span>
  );
}

export function UserFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-2.5 py-2 shadow-sm [&>*]:shrink-0">
      {children}
    </div>
  );
}

export function UserFilterLabel({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pr-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <Icon className="h-3.5 w-3.5 text-[#2f3d95]" strokeWidth={2.25} />
      {label}
    </div>
  );
}

const FILTER_THEMES = {
  emerald: {
    wrap: "border-emerald-200/80 bg-emerald-50/50",
    icon: "text-emerald-600",
  },
  indigo: {
    wrap: "border-indigo-200/80 bg-indigo-50/50",
    icon: "text-indigo-600",
  },
  sky: {
    wrap: "border-sky-200/80 bg-sky-50/50",
    icon: "text-sky-600",
  },
} as const;

type FilterTheme = keyof typeof FILTER_THEMES;

export function UserFilterGroup({
  icon: Icon,
  theme = "emerald",
  className,
  children,
}: {
  icon: LucideIcon;
  theme?: FilterTheme;
  className?: string;
  children: React.ReactNode;
}) {
  const styles = FILTER_THEMES[theme];
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border px-2",
        styles.wrap,
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", styles.icon)}
        strokeWidth={2.25}
      />
      {children}
    </div>
  );
}

export function UserSearchInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  embedded = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder: string;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="h-8 min-w-[140px] flex-1 border-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
      />
    );
  }

  return (
    <div className="relative min-w-[180px] max-w-xs flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pr-2.5 pl-8 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
      />
    </div>
  );
}

const filterSelectClass =
  "h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20";

export function UserFilterSelect({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  embedded = false,
  searchable = false,
  searchPlaceholder = "Search...",
  /** Max height of the open menu (scrollable). */
  menuMaxHeightClassName = "max-h-60",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  "aria-label": ariaLabel;
  embedded?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  menuMaxHeightClassName?: string;
}) {
  const listId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selected =
    options.find((opt) => opt.value === value) ?? options[0] ?? null;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleOptions = searchable && normalizedQuery
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(normalizedQuery) ||
          opt.value.toLowerCase().includes(normalizedQuery),
      )
    : options;

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, searchable ? 260 : 220);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
      const maxHeight = Math.min(320, preferBelow ? spaceBelow : spaceAbove);
      setMenuStyle({
        position: "fixed",
        left: Math.min(rect.left, window.innerWidth - width - 8),
        width,
        maxHeight,
        ...(preferBelow
          ? { top: rect.bottom + 4 }
          : { bottom: window.innerHeight - rect.top + 4 }),
      });
    };

    updatePosition();
    if (searchable) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        const menu = document.getElementById(listId);
        if (menu?.contains(event.target as Node)) return;
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, listId, searchable]);

  return (
    <div ref={rootRef} className="relative min-w-[140px]">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-8 w-full items-center justify-between gap-1.5 text-left",
          embedded
            ? "min-w-[120px] cursor-pointer border-0 bg-transparent text-sm text-gray-700 focus:outline-none focus:ring-0"
            : cn(filterSelectClass, "min-w-[140px]"),
        )}
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={listId}
          style={menuStyle}
          className={cn(
            "z-50 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5",
            menuMaxHeightClassName,
          )}
        >
          {searchable ? (
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-2 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder={searchPlaceholder}
                  aria-label={`${ariaLabel} search`}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 py-0 pr-2 pl-7 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#2f3d95] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
                />
              </div>
            </div>
          ) : null}
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="min-h-0 flex-1 overflow-y-auto py-1"
          >
            {visibleOptions.length ? (
              visibleOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value || "all"}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-[#eef2ff] font-medium text-[#2f3d95]"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#2f3d95]" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-4 text-center text-sm text-slate-500">
                No results found
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export const userTableGridSx = {
  "& .MuiDataGrid-row": {
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: "#eff6ff !important",
    },
    "&.Mui-selected": {
      backgroundColor: "#dbeafe !important",
    },
  },
  "& .MuiDataGrid-cell": {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    py: "6px !important",
  },
  "& .MuiDataGrid-cell[data-field='actions']": {
    overflow: "visible",
  },
  "& .MuiDataGrid-cell[data-field='roles']": {
    alignItems: "flex-start",
    py: "8px !important",
  },
  "& .MuiDataGrid-footerContainer": {
    minHeight: 48,
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
  },
  "& .MuiTablePagination-root": {
    color: "#64748b",
    fontSize: "0.8125rem",
  },
  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
    fontSize: "0.8125rem",
    fontWeight: 500,
  },
  "& .MuiTablePagination-select": {
    borderRadius: "8px",
    fontSize: "0.8125rem",
  },
  "& .MuiIconButton-root": {
    color: "#475569",
    borderRadius: "8px",
    "&:hover": {
      backgroundColor: "#e2e8f0",
    },
    "&.Mui-disabled": {
      color: "#cbd5e1",
    },
  },
};
