import { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isoToReportDateText,
  parseReportDateDdMmYyyy,
} from "./reportUiHelpers";

type ReportCustomDateFieldsProps = {
  fromText: string;
  toText?: string;
  onFromTextChange: (value: string) => void;
  onToTextChange?: (value: string) => void;
  singleDate?: boolean;
  fromLabel?: string;
  toLabel?: string;
  singleLabel?: string;
  className?: string;
  inputClassName?: string;
  /** Stack from/to vertically (better in narrow filter drawers). */
  stacked?: boolean;
};

const CALENDAR_POPUP_WIDTH = 320;

function openNativeDatePicker(
  input: HTMLInputElement | null,
  anchor: HTMLElement | null,
) {
  if (!input) return;

  const rect = (anchor ?? input).getBoundingClientRect();
  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - CALENDAR_POPUP_WIDTH - 8),
  );
  const top = Math.max(
    8,
    Math.min(rect.bottom + 2, window.innerHeight - 8),
  );

  input.style.position = "fixed";
  input.style.left = `${left}px`;
  input.style.top = `${top}px`;
  input.style.width = "16px";
  input.style.height = "16px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.zIndex = "9999";
  input.style.border = "none";
  input.style.padding = "0";
  input.style.margin = "0";

  input.focus();
  if ("showPicker" in input && typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* fall through */
    }
  }
  input.click();
}

function resetDateInputPosition(input: HTMLInputElement | null) {
  if (!input) return;
  input.style.position = "";
  input.style.left = "";
  input.style.top = "";
  input.style.width = "";
  input.style.height = "";
  input.style.opacity = "";
  input.style.pointerEvents = "";
  input.style.zIndex = "";
  input.style.border = "";
  input.style.padding = "";
  input.style.margin = "";
}

function ReportDateField({
  label,
  value,
  onChange,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isoValue = parseReportDateDdMmYyyy(value) ?? "";

  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <div ref={fieldRef} className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-lg border border-slate-200 py-1.5 pl-2 pr-9 text-sm",
            inputClassName,
          )}
        />
        <button
          type="button"
          aria-label={`Open calendar for ${label}`}
          onClick={() =>
            openNativeDatePicker(dateInputRef.current, fieldRef.current)
          }
          className="absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-center text-slate-400 transition hover:text-[#2f3d95]"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={isoValue}
          onChange={(event) => {
            const nextIso = event.target.value;
            onChange(nextIso ? isoToReportDateText(nextIso) : "");
            resetDateInputPosition(dateInputRef.current);
          }}
          onBlur={() => resetDateInputPosition(dateInputRef.current)}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
        />
      </div>
    </div>
  );
}

export function ReportCustomDateFields({
  fromText,
  toText = "",
  onFromTextChange,
  onToTextChange,
  singleDate = false,
  fromLabel = "From",
  toLabel = "To",
  singleLabel = "Date",
  className,
  inputClassName,
  stacked = false,
}: ReportCustomDateFieldsProps) {
  if (singleDate) {
    return (
      <div className={className}>
        <ReportDateField
          label={singleLabel}
          value={fromText}
          onChange={onFromTextChange}
          inputClassName={inputClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        stacked ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
    >
      <ReportDateField
        label={fromLabel}
        value={fromText}
        onChange={onFromTextChange}
        inputClassName={inputClassName}
      />
      <ReportDateField
        label={toLabel}
        value={toText}
        onChange={(value) => onToTextChange?.(value)}
        inputClassName={inputClassName}
      />
    </div>
  );
}
