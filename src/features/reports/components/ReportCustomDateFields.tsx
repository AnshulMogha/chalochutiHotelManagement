import { cn } from "@/lib/utils";

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
};

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
}: ReportCustomDateFieldsProps) {
  const inputClass = cn(
    "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm",
    inputClassName,
  );

  if (singleDate) {
    return (
      <div className={className}>
        <label className="mb-1 block text-xs text-slate-500">{singleLabel}</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={fromText}
          onChange={(event) => onFromTextChange(event.target.value)}
          className={inputClass}
        />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div>
        <label className="mb-1 block text-xs text-slate-500">{fromLabel}</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={fromText}
          onChange={(event) => onFromTextChange(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">{toLabel}</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={toText}
          onChange={(event) => onToTextChange?.(event.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}
