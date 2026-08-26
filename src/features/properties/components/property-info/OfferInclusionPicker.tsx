import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bus,
  Car,
  Clock,
  Coffee,
  Gift,
  Loader2,
  Map,
  Plus,
  Search,
  Sparkles,
  Star,
  UtensilsCrossed,
  Waves,
  X,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InclusionCatalogueCategory,
  InclusionCatalogueItem,
} from "../../services/inclusionsTypes";

type OfferInclusionPickerProps = {
  categories: InclusionCatalogueCategory[];
  loading?: boolean;
  error?: string | null;
  onBack: () => void;
  onSelect?: (inclusion: InclusionCatalogueItem, categoryCode: string) => void;
};

type CategoryTheme = {
  Icon: LucideIcon;
  rowIcon: string;
  rowOpen: string;
  badge: string;
  boxIcon: string;
  boxHover: string;
};

function categoryTheme(code: string, name: string): CategoryTheme {
  const key = `${code} ${name}`.toUpperCase();
  if (/POPULAR/.test(key)) {
    return {
      Icon: Star,
      rowIcon: "bg-amber-50 text-amber-600",
      rowOpen: "bg-amber-50/50",
      badge: "bg-amber-100 text-amber-700",
      boxIcon: "bg-amber-50 text-amber-600",
      boxHover: "hover:border-amber-300 hover:bg-amber-50/40",
    };
  }
  if (/FOOD|BEVERAGE|MEAL|DINING/.test(key)) {
    return {
      Icon: UtensilsCrossed,
      rowIcon: "bg-orange-50 text-orange-600",
      rowOpen: "bg-orange-50/40",
      badge: "bg-orange-100 text-orange-700",
      boxIcon: "bg-orange-50 text-orange-600",
      boxHover: "hover:border-orange-300 hover:bg-orange-50/40",
    };
  }
  if (/SPA|WELLNESS|SALON|YOGA/.test(key)) {
    return {
      Icon: Waves,
      rowIcon: "bg-teal-50 text-teal-600",
      rowOpen: "bg-teal-50/40",
      badge: "bg-teal-100 text-teal-700",
      boxIcon: "bg-teal-50 text-teal-600",
      boxHover: "hover:border-teal-300 hover:bg-teal-50/40",
    };
  }
  if (/TRANSFER|TRANSPORT|VEHICLE/.test(key)) {
    return {
      Icon: Car,
      rowIcon: "bg-sky-50 text-sky-600",
      rowOpen: "bg-sky-50/40",
      badge: "bg-sky-100 text-sky-700",
      boxIcon: "bg-sky-50 text-sky-600",
      boxHover: "hover:border-sky-300 hover:bg-sky-50/40",
    };
  }
  if (/TOUR|SIGHT|ACTIVITY|CRUISE|SAFARI|NATURE/.test(key)) {
    return {
      Icon: Map,
      rowIcon: "bg-emerald-50 text-emerald-600",
      rowOpen: "bg-emerald-50/40",
      badge: "bg-emerald-100 text-emerald-700",
      boxIcon: "bg-emerald-50 text-emerald-600",
      boxHover: "hover:border-emerald-300 hover:bg-emerald-50/40",
    };
  }
  if (/EARLY|LATE|CHECK/.test(key)) {
    return {
      Icon: Clock,
      rowIcon: "bg-indigo-50 text-indigo-600",
      rowOpen: "bg-indigo-50/40",
      badge: "bg-indigo-100 text-indigo-700",
      boxIcon: "bg-indigo-50 text-indigo-600",
      boxHover: "hover:border-indigo-300 hover:bg-indigo-50/40",
    };
  }
  return {
    Icon: Gift,
    rowIcon: "bg-[#2f3d95]/8 text-[#2f3d95]",
    rowOpen: "bg-[#2f3d95]/4",
    badge: "bg-slate-100 text-slate-600",
    boxIcon: "bg-[#2f3d95]/8 text-[#2f3d95]",
    boxHover: "hover:border-[#2f3d95]/35 hover:bg-[#2f3d95]/5",
  };
}

function inclusionIcon(inclusion: InclusionCatalogueItem): LucideIcon {
  const type = String(inclusion.configurationType || "").toUpperCase();
  const code = inclusion.code.toUpperCase();

  if (type === "ROOM_UPGRADE" || /ROOM_UPGRADE/.test(code)) return ArrowUpRight;
  if (
    type === "MEAL" ||
    /BREAKFAST|LUNCH|DINNER|BRUNCH|MEAL|BARBECUE|HI_TEA/.test(code)
  ) {
    return UtensilsCrossed;
  }
  if (type === "TRANSFER" || /TRANSFER|RENTAL/.test(code)) return Car;
  if (type === "TIME_OFFSET" || /CHECKIN|CHECKOUT/.test(code)) return Clock;
  if (/SPA|MASSAGE|SALON|YOGA|WELLNESS|SAUNA|STEAM/.test(code)) return Waves;
  if (/TOUR|PARK|WALK|CRUISE|SAFARI|SIGHT/.test(code)) return Map;
  if (/DRINK|WELCOME/.test(code)) return Coffee;
  if (/BUS/.test(code)) return Bus;
  if (type === "GENERIC") return Sparkles;
  return Gift;
}

export function OfferInclusionPicker({
  categories,
  loading,
  error,
  onBack,
  onSelect,
}: OfferInclusionPickerProps) {
  const [query, setQuery] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => {
        if (!q) return cat;
        const inclusions = cat.inclusions.filter(
          (inc) =>
            inc.name.toLowerCase().includes(q) ||
            inc.code.toLowerCase().includes(q) ||
            (inc.description || "").toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q),
        );
        return { ...cat, inclusions };
      })
      .filter((cat) => (!q ? true : cat.inclusions.length > 0));
  }, [categories, query]);

  const toggleCategory = (code: string) => {
    setExpandedCode((prev) => (prev === code ? null : code));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#2f3d95] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inclusions
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (next.trim()) {
                const q = next.trim().toLowerCase();
                const match = categories.find(
                  (cat) =>
                    cat.name.toLowerCase().includes(q) ||
                    cat.inclusions.some(
                      (inc) =>
                        inc.name.toLowerCase().includes(q) ||
                        inc.code.toLowerCase().includes(q),
                    ),
                );
                if (match) setExpandedCode(match.code);
              }
            }}
            placeholder="Search inclusions…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-[#2f3d95]/40 focus:ring-2 focus:ring-[#2f3d95]/15"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2f3d95]" />
            Loading catalogue…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No inclusions match your search.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredCategories.map((category) => {
              const open = expandedCode === category.code;
              const theme = categoryTheme(category.code, category.name);
              const CategoryIcon = theme.Icon;

              return (
                <li
                  key={category.code}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.code)}
                    aria-expanded={open}
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-3 text-left transition",
                      open ? theme.rowOpen : "hover:bg-slate-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        theme.rowIcon,
                      )}
                    >
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                      {category.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        theme.badge,
                      )}
                    >
                      {category.inclusions.length}
                    </span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </button>

                  {open ? (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                      {category.inclusions.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-400">
                          No inclusions in this category.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {category.inclusions.map((inclusion) => {
                            const ItemIcon = inclusionIcon(inclusion);
                            return (
                              <button
                                key={inclusion.code}
                                type="button"
                                title={
                                  inclusion.description || inclusion.name
                                }
                                onClick={() =>
                                  onSelect?.(inclusion, category.code)
                                }
                                className={cn(
                                  "group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition",
                                  theme.boxHover,
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    theme.boxIcon,
                                  )}
                                >
                                  <ItemIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {inclusion.name}
                                  </p>
                                  <p className="truncate font-mono text-[10px] text-slate-400">
                                    {inclusion.code}
                                  </p>
                                </div>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition group-hover:border-[#2f3d95] group-hover:bg-[#2f3d95] group-hover:text-white">
                                  <Plus className="h-3.5 w-3.5" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
