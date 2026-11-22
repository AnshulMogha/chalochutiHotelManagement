import {
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import type { BeneficiaryBatchStatus } from "@/features/reports/services/vendorBeneficiaryMisTypes";
import { cn } from "@/lib/utils";

export function isFileGeneratedBatchStatus(
  status: BeneficiaryBatchStatus,
): boolean {
  return status === "GENERATED" || status === "DOWNLOADED";
}

export function formatVendorBeneficiaryDateTime(
  value?: string | null,
): string {
  if (!value?.trim()) return "-";
  return formatReportDateTime(value) || "-";
}

export function formatVendorBeneficiaryUserLabel(
  label?: string | null,
  userId?: number | null,
): string {
  if (label?.trim()) return label.trim();
  if (userId != null) return `User #${userId}`;
  return "-";
}

export function VendorBeneficiaryStatusPill({
  value,
}: {
  value?: string | null;
}) {
  const display =
    value === "GENERATED" ||
    value === "DOWNLOADED" ||
    value === "FILE_GENERATED"
      ? "File Generated"
      : value === "SUBMITTED_TO_BANK"
        ? "Submitted to Bank"
        : value === "PARTIALLY_COMPLETED"
          ? "Partially Completed"
          : value === "COMPLETED_WITH_ERRORS"
            ? "Completed with Errors"
            : formatStatusLabel(value);
  const tone =
    value === "VERIFIED" || value === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === "REJECTED" ||
          value === "UPDATE_REQUIRED" ||
          value === "COMPLETED_WITH_ERRORS"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : value === "PENDING" ||
            value === "PENDING_APPROVAL" ||
            value === "NOT_SUBMITTED" ||
            value === "PARTIALLY_COMPLETED"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : value === "SUBMITTED_TO_BANK"
            ? "bg-sky-50 text-sky-800 ring-sky-200"
            : value === "FILE_GENERATED" ||
                value === "GENERATED" ||
                value === "DOWNLOADED"
              ? "bg-indigo-50 text-indigo-800 ring-indigo-200"
              : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone,
      )}
    >
      {display}
    </span>
  );
}

export function VendorBeneficiaryDetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50/90 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-all text-[13px] font-semibold text-slate-900",
          mono && "font-mono tracking-wide",
        )}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}
