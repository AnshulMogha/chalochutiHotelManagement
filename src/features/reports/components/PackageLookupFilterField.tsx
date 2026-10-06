import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminService,
  type PackageLookupItem,
} from "@/features/admin/services/adminService";

type Props = {
  value: string;
  selectedLabel?: string;
  onChange: (next: { packageId: string; packageLabel: string }) => void;
  label?: string;
  allLabel?: string;
};

function optionLabel(item: PackageLookupItem): string {
  return [item.packageName, item.packageCode, item.destination]
    .filter(Boolean)
    .join(" · ");
}

export function PackageLookupFilterField({
  value,
  selectedLabel = "",
  onChange,
  label = "Package",
  allLabel = "All packages",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<PackageLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void adminService
      .getPackageLookup(debouncedQuery)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const display =
    selectedLabel ||
    options.find((item) => item.packageId === value)?.packageName ||
    value;

  const pick = (item: PackageLookupItem | null) => {
    onChange(
      item
        ? { packageId: item.packageId, packageLabel: optionLabel(item) }
        : { packageId: "", packageLabel: "" },
    );
    setOpen(false);
    setQuery("");
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (!open) setLoading(true);
            setOpen((current) => !current);
          }}
          className="flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm outline-none hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <span className={cn("min-w-0 wrap-break-word", display ? "text-slate-800" : "text-slate-400")}>
            {display || allLabel}
          </span>
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400", open && "rotate-180")} />
        </button>
        {open ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setLoading(true);
                  setQuery(event.target.value);
                }}
                placeholder="Search packages…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className={cn("flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50", !value && "bg-blue-50 text-[#2f3d95]")}
                >
                  <span className="h-4 w-4">{!value ? <Check className="h-4 w-4" /> : null}</span>
                  {allLabel}
                </button>
              </li>
              {!loading && options.length === 0 ? (
                <li className="px-3 py-3 text-xs text-slate-500">No packages found</li>
              ) : (
                options.map((item) => (
                  <li key={item.packageId}>
                    <button
                      type="button"
                      onClick={() => pick(item)}
                      className={cn("flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50", item.packageId === value && "bg-blue-50 text-[#2f3d95]")}
                    >
                      <span className="mt-0.5 h-4 w-4 shrink-0">
                        {item.packageId === value ? <Check className="h-4 w-4" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.packageName}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {[item.packageCode, item.destination].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
