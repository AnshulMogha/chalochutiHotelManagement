import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  ChevronDown,
  CreditCard,
  FileText,
  Loader2,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const POLICY_TABS = [
  {
    value: "policy",
    label: "Policy",
    icon: FileText,
    active: "bg-blue-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-blue-100 hover:text-blue-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-blue-600",
  },
  {
    value: "cancellation",
    label: "Cancellation Policy",
    icon: CalendarClock,
    active: "bg-cyan-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-cyan-100 hover:text-cyan-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-cyan-600",
  },
  {
    value: "child",
    label: "Child Policy",
    icon: UserCircle2,
    active: "bg-violet-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-violet-100 hover:text-violet-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-violet-600",
  },
  {
    value: "payment",
    label: "Payment Policy",
    icon: CreditCard,
    active: "bg-teal-600 text-white font-semibold shadow-sm",
    idle: "text-slate-700 hover:bg-teal-100 hover:text-teal-800",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-teal-600",
  },
] as const;

const SECTION_THEMES = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  teal: "bg-teal-50 text-teal-600 ring-teal-100",
} as const;

const SECTION_ACCENTS = {
  blue: "border-l-blue-500",
  violet: "border-l-violet-500",
  indigo: "border-l-indigo-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
  slate: "border-l-slate-400",
  cyan: "border-l-cyan-500",
  emerald: "border-l-emerald-500",
  teal: "border-l-teal-500",
} as const;

const TOGGLE_SELECTED = {
  blue: "border-blue-300 bg-blue-50 ring-1 ring-blue-200 text-blue-900",
  violet: "border-violet-300 bg-violet-50 ring-1 ring-violet-200 text-violet-900",
  indigo: "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200 text-indigo-900",
  amber: "border-amber-300 bg-amber-50 ring-1 ring-amber-200 text-amber-900",
  rose: "border-rose-300 bg-rose-50 ring-1 ring-rose-200 text-rose-900",
  slate: "border-slate-300 bg-slate-100 ring-1 ring-slate-200 text-slate-900",
  cyan: "border-cyan-300 bg-cyan-50 ring-1 ring-cyan-200 text-cyan-900",
  emerald: "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-900",
  teal: "border-teal-300 bg-teal-50 ring-1 ring-teal-200 text-teal-900",
} as const;

const TOGGLE_IDLE =
  "border-slate-200 bg-white text-gray-700 hover:border-slate-300 hover:bg-slate-50";

const TIME_FIELD_THEMES = {
  blue: "border-blue-100 bg-blue-50/40 focus-within:ring-blue-200",
  violet: "border-violet-100 bg-violet-50/40 focus-within:ring-violet-200",
  indigo: "border-indigo-100 bg-indigo-50/40 focus-within:ring-indigo-200",
  amber: "border-amber-100 bg-amber-50/40 focus-within:ring-amber-200",
  rose: "border-rose-100 bg-rose-50/40 focus-within:ring-rose-200",
  slate: "border-slate-200 bg-slate-50/60 focus-within:ring-slate-200",
  cyan: "border-cyan-100 bg-cyan-50/40 focus-within:ring-cyan-200",
  emerald: "border-emerald-100 bg-emerald-50/40 focus-within:ring-emerald-200",
  teal: "border-teal-100 bg-teal-50/40 focus-within:ring-teal-200",
} as const;

const TIME_LABEL_THEMES = {
  blue: "text-blue-700",
  violet: "text-violet-700",
  indigo: "text-indigo-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  slate: "text-slate-600",
  cyan: "text-cyan-700",
  emerald: "text-emerald-700",
  teal: "text-teal-700",
} as const;

export type PolicySectionTheme = keyof typeof SECTION_THEMES;

export function PolicyPageLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
      <Loader2 className="h-9 w-9 animate-spin text-[#2f3d95]" />
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}

export function PolicySectionCard({
  children,
  className,
  theme,
}: {
  children: React.ReactNode;
  className?: string;
  theme?: PolicySectionTheme;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6",
        theme && "border-l-4",
        theme && SECTION_ACCENTS[theme],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PolicySectionHeader({
  icon: Icon,
  title,
  subtitle,
  theme = "blue",
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  theme?: PolicySectionTheme;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          SECTION_THEMES[theme],
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PolicySaveBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm">
      {children}
    </div>
  );
}

export function PolicyTimeField({
  label,
  value,
  onChange,
  theme = "blue",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme?: PolicySectionTheme;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 ring-0 transition-shadow focus-within:ring-2",
        TIME_FIELD_THEMES[theme],
      )}
    >
      <label
        className={cn(
          "mb-1.5 block text-xs font-semibold uppercase tracking-wide",
          TIME_LABEL_THEMES[theme],
        )}
      >
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/80 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/25"
      />
    </div>
  );
}

export function PolicyToggleOption({
  id,
  label,
  checked,
  onChange,
  theme = "blue",
}: {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  theme?: PolicySectionTheme;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150",
        checked ? TOGGLE_SELECTED[theme] : TOGGLE_IDLE,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#2f3d95] focus:ring-[#2f3d95]/30"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function PolicyCheckboxGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function BoundedHourSelect({
  label,
  value,
  onChange,
  options,
  formatOption,
  error,
  placeholder = "Select",
}: {
  label: string;
  value: number | "";
  onChange: (hours: number | "") => void;
  options: number[];
  formatOption: (hours: number) => string;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedLabel =
    value === "" ? placeholder : formatOption(Number(value));

  return (
    <div className="space-y-2" ref={rootRef}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            error && "border-red-500",
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={value === "" ? "text-gray-500" : "text-gray-900"}>
            {selectedLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-500 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            {options.map((hours) => (
              <button
                key={hours}
                type="button"
                role="option"
                aria-selected={value === hours}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-blue-50",
                  value === hours && "bg-blue-100 font-medium text-blue-900",
                )}
                onClick={() => {
                  onChange(hours);
                  setOpen(false);
                }}
              >
                {formatOption(hours)}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
