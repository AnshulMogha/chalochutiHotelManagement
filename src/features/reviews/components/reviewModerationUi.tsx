import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flag,
  Inbox,
  Loader2,
  Search,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReportPageHeader,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  adminService,
  type HotelLookupItem,
  type PackageLookupItem,
} from "@/features/admin/services/adminService";
import type { ReviewStatus } from "../services/reviewModerationTypes";

const STAT_TONE: Record<
  "navy" | "amber" | "rose" | "emerald" | "slate",
  string
> = {
  navy: "bg-[#2f3d95]",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-600",
  slate: "bg-slate-500",
};

export function ReviewModerationPageShell({
  title,
  subtitle,
  actions,
  children,
  icon: Icon = Star,
  iconClassName = "bg-linear-to-br from-amber-500 to-orange-600",
  borderClassName = "border-amber-100",
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  borderClassName?: string;
  wide?: boolean;
}) {
  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <div
        className={cn(
          "mx-auto px-3 py-4 sm:px-4",
          wide ? "max-w-[1400px]" : "max-w-7xl",
        )}
      >
        <ReportPageHeader
          icon={Icon}
          iconClassName={iconClassName}
          title={title}
          description={subtitle}
          descriptionClassName="text-xs text-slate-500"
          borderClassName={borderClassName}
          actions={actions}
        />
        {children}
      </div>
    </div>
  );
}

export function ReviewReportSection({
  title,
  description,
  children,
  action,
  flush,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

export function ReviewFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

type SubjectOption = {
  id: string;
  label: string;
  sub?: string;
};

/**
 * Hotel or package searchable dropdown for review filters.
 * HOTEL → /customer/packages/hotel/lookup
 * PACKAGE → /customer/packages/lookup
 */
export function ReviewSubjectLookupField({
  bookingType,
  value,
  selectedLabel: selectedLabelProp = "",
  onChange,
}: {
  bookingType: string;
  value: string;
  selectedLabel?: string;
  onChange: (next: { subjectId: string; subjectLabel: string }) => void;
}) {
  const mode =
    bookingType.toUpperCase() === "PACKAGE"
      ? "PACKAGE"
      : bookingType.toUpperCase() === "HOTEL"
        ? "HOTEL"
        : "NONE";
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(selectedLabelProp);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setOptions([]);
    setSelectedLabel("");
  }, [mode]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    if (selectedLabelProp) setSelectedLabel(selectedLabelProp);
  }, [value, selectedLabelProp]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (mode === "NONE" || !open) return;
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        if (mode === "HOTEL") {
          const hotels: HotelLookupItem[] =
            await adminService.getSuperAdminHotelLookup(debouncedQuery);
          if (cancelled) return;
          setOptions(
            hotels.map((hotel) => ({
              id: hotel.hotelId,
              label: hotel.hotelName,
              sub: [hotel.hotelCode, hotel.city].filter(Boolean).join(" · "),
            })),
          );
        } else {
          const packages: PackageLookupItem[] =
            await adminService.getPackageLookup(debouncedQuery);
          if (cancelled) return;
          setOptions(
            packages.map((pkg) => ({
              id: pkg.packageId,
              label: pkg.packageName,
              sub: [pkg.packageCode, pkg.destination]
                .filter(Boolean)
                .join(" · "),
            })),
          );
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, debouncedQuery, open]);

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

  if (mode === "NONE") {
    return (
      <ReviewFilterField label="Hotel / Package">
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Select booking type (Hotel or Package) to choose from the list.
        </p>
      </ReviewFilterField>
    );
  }

  const kindLabel = mode === "HOTEL" ? "Hotel" : "Package";
  const searchPlaceholder =
    mode === "HOTEL" ? "Search hotel…" : "Search package…";
  const displayLabel = value
    ? selectedLabel ||
      options.find((option) => option.id === value)?.label ||
      value
    : "";

  const pick = (option: SubjectOption | null) => {
    if (!option) {
      setSelectedLabel("");
      onChange({ subjectId: "", subjectLabel: "" });
    } else {
      const nextLabel = option.sub
        ? `${option.label} · ${option.sub}`
        : option.label;
      setSelectedLabel(nextLabel);
      onChange({ subjectId: option.id, subjectLabel: nextLabel });
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <ReviewFilterField label={kindLabel}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm outline-none transition hover:border-slate-300 focus:border-slate-400"
        >
          <span
            className={cn(
              "min-w-0 flex-1 whitespace-normal break-words leading-snug",
              displayLabel ? "text-slate-800" : "text-slate-400",
            )}
          >
            {displayLabel || `All ${kindLabel.toLowerCase()}s`}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
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
                    !value && "bg-indigo-50 text-[#2f3d95]",
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {!value ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>All {kindLabel.toLowerCase()}s</span>
                </button>
              </li>
              {options.length === 0 && !loading ? (
                <li className="px-3 py-3 text-xs text-slate-500">
                  No matches. Try another search.
                </li>
              ) : null}
              {options.map((option) => {
                const active = option.id === value;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => pick(option)}
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50",
                        active && "bg-indigo-50",
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#2f3d95]">
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block whitespace-normal break-words text-sm leading-snug",
                            active
                              ? "font-medium text-[#2f3d95]"
                              : "text-slate-800",
                          )}
                        >
                          {option.label}
                        </span>
                        {option.sub ? (
                          <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-snug text-slate-500">
                            {option.sub}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </ReviewFilterField>
  );
}

export function ReviewFilterDrawer({
  open,
  onClose,
  onReset,
  onApply,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-[11px] text-slate-500">
              Adjust criteria, then apply to refresh results
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {children}
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white hover:bg-[#263578]"
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}

export function ReviewModerationStatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </div>
          {sub ? (
            <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            STAT_TONE[tone],
          )}
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function ReviewModerationFlowStrip({
  currentStatus,
}: {
  currentStatus?: string;
} = {}) {
  const normalized = String(currentStatus || "").toUpperCase();
  const highlightCurrent = Boolean(normalized);
  const steps = [
    {
      key: "REVIEW_PENDING",
      label: "Pending",
      active: "bg-amber-100 text-amber-800 ring-amber-200",
    },
    {
      key: "REVIEW_FLAGGED",
      label: "Flagged",
      active: "bg-rose-100 text-rose-800 ring-rose-200",
    },
    {
      key: "REVIEW_PUBLISHED",
      label: "Published",
      active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    },
    {
      key: "REVIEW_REJECTED",
      label: "Rejected",
      active: "bg-slate-200 text-slate-700 ring-slate-300",
    },
  ];

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-400">
        {highlightCurrent ? "Status" : "Flow"}
      </span>
      {steps.map((step, index) => {
        const isCurrent = normalized === step.key;
        const tone =
          !highlightCurrent || isCurrent
            ? step.active
            : "bg-slate-50 text-slate-400 ring-slate-100";
        return (
          <span key={step.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition",
                tone,
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="text-slate-200" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function ReviewModerationEmptyState({
  title = "Queue is clear",
  description = "No reviews are waiting for moderation right now. Check back later or refresh to pull the latest queue.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
        <Inbox className="h-7 w-7 text-amber-600" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ReviewModerationActionIcon({
  action,
}: {
  action: "approve" | "reject" | "flag" | "unflag";
}) {
  const map = {
    approve: { icon: CheckCircle2, className: "text-emerald-600" },
    reject: { icon: XCircle, className: "text-rose-600" },
    flag: { icon: Flag, className: "text-amber-600" },
    unflag: { icon: ShieldCheck, className: "text-slate-600" },
  };
  const { icon: Icon, className } = map[action];
  return <Icon className={cn("h-4 w-4", className)} />;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();
  const styles: Record<string, string> = {
    REVIEW_PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    REVIEW_PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    REVIEW_FLAGGED: "bg-rose-50 text-rose-800 ring-rose-200",
    REVIEW_REJECTED: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const labels: Record<string, string> = {
    REVIEW_PENDING: "Pending",
    REVIEW_PUBLISHED: "Published",
    REVIEW_FLAGGED: "Flagged",
    REVIEW_REJECTED: "Rejected",
  };
  const icons: Record<string, LucideIcon> = {
    REVIEW_PENDING: Clock3,
    REVIEW_PUBLISHED: CheckCircle2,
    REVIEW_FLAGGED: Flag,
    REVIEW_REJECTED: XCircle,
  };
  const Icon = icons[normalized];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[normalized] ?? "bg-slate-50 text-slate-700 ring-slate-200",
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {labels[normalized] ?? formatStatusLabel(status)}
    </span>
  );
}

export function ReviewRatingStars({ rating }: { rating: number | null }) {
  if (rating == null || Number.isNaN(rating)) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
      {rating.toFixed(1)}
      <span className="text-amber-500">★</span>
    </span>
  );
}

export function canApproveReview(status: string): boolean {
  const s = status.toUpperCase();
  return s === "REVIEW_PENDING" || s === "REVIEW_FLAGGED";
}

export function canRejectReview(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "REVIEW_PENDING" ||
    s === "REVIEW_FLAGGED" ||
    s === "REVIEW_PUBLISHED"
  );
}

export function canFlagReview(status: string): boolean {
  const s = status.toUpperCase();
  return s !== "REVIEW_FLAGGED" && s !== "REVIEW_REJECTED";
}

export function canUnflagReview(status: string): boolean {
  return status.toUpperCase() === "REVIEW_FLAGGED";
}

export function reviewStatusLabel(status: ReviewStatus | string): string {
  const map: Record<string, string> = {
    REVIEW_PENDING: "Pending",
    REVIEW_PUBLISHED: "Published",
    REVIEW_FLAGGED: "Flagged",
    REVIEW_REJECTED: "Rejected",
  };
  return map[String(status).toUpperCase()] ?? formatStatusLabel(status);
}
