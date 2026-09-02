import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminService,
  type HotelLookupItem,
} from "@/features/admin/services/adminService";

function formatHotelLabel(hotel: HotelLookupItem): string {
  const parts = [hotel.hotelName, hotel.hotelCode, hotel.city].filter(Boolean);
  return parts.join(" · ");
}

type HotelLookupFilterFieldProps = {
  value: string;
  selectedLabel?: string;
  onChange: (next: { hotelId: string; hotelLabel: string }) => void;
  label?: string;
  allLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
};

export function HotelLookupFilterField({
  value,
  selectedLabel: selectedLabelProp = "",
  onChange,
  label = "Hotel",
  allLabel = "All hotels",
  placeholder = "Search hotels…",
  triggerClassName,
}: HotelLookupFilterFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<HotelLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(selectedLabelProp);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    if (selectedLabelProp) {
      setSelectedLabel(selectedLabelProp);
    }
  }, [value, selectedLabelProp]);

  useEffect(() => {
    if (!value || selectedLabel || selectedLabelProp) return;
    let cancelled = false;
    void adminService.getSuperAdminHotelLookup("").then((hotels) => {
      if (cancelled) return;
      const match = hotels.find((hotel) => hotel.hotelId === value);
      if (match) setSelectedLabel(formatHotelLabel(match));
    });
    return () => {
      cancelled = true;
    };
  }, [value, selectedLabel, selectedLabelProp]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void adminService
      .getSuperAdminHotelLookup(debouncedQuery)
      .then((hotels) => {
        if (!cancelled) setOptions(hotels);
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
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const displayLabel = value
    ? selectedLabel ||
      options.find((hotel) => hotel.hotelId === value)?.hotelName ||
      value
    : "";

  const pick = (hotel: HotelLookupItem | null) => {
    if (!hotel) {
      setSelectedLabel("");
      onChange({ hotelId: "", hotelLabel: "" });
    } else {
      const nextLabel = formatHotelLabel(hotel);
      setSelectedLabel(nextLabel);
      onChange({ hotelId: hotel.hotelId, hotelLabel: nextLabel });
    }
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
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
            triggerClassName,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 whitespace-normal break-words leading-snug",
              displayLabel ? "text-slate-800" : "text-slate-400",
            )}
          >
            {displayLabel || allLabel}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
              ) : null}
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                    !value && "bg-blue-50 text-[#2f3d95]",
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {!value ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>{allLabel}</span>
                </button>
              </li>
              {options.length === 0 && !loading ? (
                <li className="px-3 py-3 text-xs text-slate-500">
                  {debouncedQuery
                    ? "No hotels found. Try another search."
                    : "No hotels available"}
                </li>
              ) : (
                options.map((hotel) => (
                  <li key={hotel.hotelId}>
                    <button
                      type="button"
                      onClick={() => pick(hotel)}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                        value === hotel.hotelId && "bg-blue-50 text-[#2f3d95]",
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {value === hotel.hotelId ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {hotel.hotelName}
                        </span>
                        {[hotel.hotelCode, hotel.city].filter(Boolean).length >
                        0 ? (
                          <span className="block truncate text-xs text-slate-500">
                            {[hotel.hotelCode, hotel.city]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
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
