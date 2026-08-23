import { cn } from "@/lib/utils";
import {
  PolicyPageLoader,
  PolicySaveBar,
  PolicySectionCard,
  PolicySectionHeader,
  type PolicySectionTheme,
} from "./policyRulesUi";

export {
  PolicyPageLoader as FinancePageLoader,
  PolicySaveBar as FinanceSaveBar,
  PolicySectionCard as FinanceSectionCard,
  PolicySectionHeader as FinanceSectionHeader,
};

export function FinanceBankBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = String(status || "NOT_VERIFIED").toUpperCase();
  const styles: Record<string, string> = {
    VERIFIED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
    FAILED: "bg-rose-50 text-rose-800 ring-rose-200",
    NOT_VERIFIED: "bg-rose-50 text-rose-800 ring-rose-200",
    UNVERIFIED: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  const labels: Record<string, string> = {
    VERIFIED: "Verified",
    PENDING: "Pending",
    FAILED: "Failed",
    NOT_VERIFIED: "Not verified",
    UNVERIFIED: "Not verified",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[normalized] ?? "bg-slate-50 text-slate-700 ring-slate-200",
      )}
    >
      {labels[normalized] ??
        normalized.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function FinanceFieldLabel({
  htmlFor,
  children,
  required,
  theme = "emerald",
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  theme?: PolicySectionTheme;
}) {
  const colors: Record<PolicySectionTheme, string> = {
    blue: "text-blue-800",
    violet: "text-violet-800",
    indigo: "text-indigo-800",
    amber: "text-amber-800",
    rose: "text-rose-800",
    slate: "text-slate-700",
    cyan: "text-cyan-800",
    emerald: "text-emerald-800",
    teal: "text-teal-800",
  };

  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide",
        colors[theme],
      )}
    >
      {children}
      {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export function FinanceFieldWrap({
  theme = "emerald",
  children,
  className,
}: {
  theme?: PolicySectionTheme;
  children: React.ReactNode;
  className?: string;
}) {
  const panel: Record<PolicySectionTheme, string> = {
    blue: "border-blue-100/80 bg-blue-50/30",
    violet: "border-violet-100/80 bg-violet-50/30",
    indigo: "border-indigo-100/80 bg-indigo-50/30",
    amber: "border-amber-100/80 bg-amber-50/30",
    rose: "border-rose-100/80 bg-rose-50/30",
    slate: "border-slate-200 bg-slate-50/50",
    cyan: "border-cyan-100/80 bg-cyan-50/30",
    emerald: "border-emerald-100/80 bg-emerald-50/30",
    teal: "border-teal-100/80 bg-teal-50/30",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        panel[theme],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FinanceFieldHint({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={cn(
        "mt-1.5 text-xs leading-relaxed",
        error ? "font-medium text-red-600" : "text-gray-500",
      )}
    >
      {children}
    </p>
  );
}

export function FinanceTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-md border border-white/80 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/25",
        className,
      )}
    />
  );
}
