import { useState, useMemo, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { RatePlanLinkRecord } from "../services/rateService";

export type RateDirection = "LOWER" | "HIGHER";
export type AdjustmentUnit = "PERCENT" | "INR";

export interface LinkRatePlansAdvancedPayload {
  /** When true, use a separate offset for extra adult / paid child vs the main rule. */
  linkExtraGuestRates: boolean;
  extraGuestAdjustment: number;
  extraGuestUnit: AdjustmentUnit;
  /** When true, align restrictions (LOS, cutoff, etc.) with the chosen base plan. */
  linkRestrictions: boolean;
}

export interface LinkRatePlansConfirmPayload {
  /** Rate plan row where the user clicked Link (master). */
  masterRatePlanId: number;
  direction: RateDirection;
  baseRateValue: string;
  adjustmentAmount: number;
  unit: AdjustmentUnit;
  advanced: LinkRatePlansAdvancedPayload;
  /** When set, submit with PUT /hotel/rate-plan/link/{id}. */
  existingLinkId?: number;
}

interface LinkRatePlansSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label for the plan being linked (e.g. EP). */
  targetPlanLabel?: string;
  baseRateOptions: Array<{ value: string; label: string }>;
  /** While true, base-plan list is loading from the API. */
  isLoadingOptions?: boolean;
  /** True after a successful fetch when every other plan was filtered out. */
  noLinkablePlans?: boolean;
  /** Master plan id (clicked row); included in the payload sent to onConfirm. */
  masterRatePlanId: number;
  /** Loaded from GET /hotel/rate-plan/link?masterRatePlanId=… when present. */
  existingLinkRecord: RatePlanLinkRecord | null;
  /** True while fetching existing link config. */
  linkConfigLoading: boolean;
  onConfirm?: (payload: LinkRatePlansConfirmPayload) => void | Promise<void>;
  /** Called to DELETE /hotel/rate-plan/link/{id}; shown only when an existing link is loaded. */
  onRemoveLink?: (linkId: number) => void | Promise<void>;
  /** Called when user confirms but no base plan is selected while options exist. */
  onInvalid?: () => void;
  /** Server / API error to show inside the sheet (not hidden behind overlay). */
  apiError?: string | null;
  /** Clear `apiError` when user retries submit or edits after an error. */
  onClearApiError?: () => void;
}

function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  compact,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  compact?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shadow-inner">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            compact
              ? "min-w-[3.25rem] rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all"
              : "min-w-[5.5rem] rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all",
            value === opt.value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type YesNo = "NO" | "YES";

export function LinkRatePlansSheet({
  open,
  onOpenChange,
  targetPlanLabel = "EP",
  baseRateOptions,
  isLoadingOptions = false,
  noLinkablePlans = false,
  masterRatePlanId,
  existingLinkRecord,
  linkConfigLoading,
  onConfirm,
  onRemoveLink,
  onInvalid,
  apiError = null,
  onClearApiError,
}: LinkRatePlansSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovingLink, setIsRemovingLink] = useState(false);
  const [direction, setDirection] = useState<RateDirection>("LOWER");
  const [baseRateValue, setBaseRateValue] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("0");
  const [unit, setUnit] = useState<AdjustmentUnit>("PERCENT");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [extraGuestLink, setExtraGuestLink] = useState<YesNo>("NO");
  const [extraGuestAmount, setExtraGuestAmount] = useState("0");
  const [extraGuestUnit, setExtraGuestUnit] = useState<AdjustmentUnit>("PERCENT");
  const [restrictionsLink, setRestrictionsLink] = useState<YesNo>("YES");

  useEffect(() => {
    if (!open) return;
    setIsSubmitting(false);
    setIsRemovingLink(false);
    setDirection("LOWER");
    setBaseRateValue("");
    setAdjustmentAmount("0");
    setUnit("PERCENT");
    setAdvancedOpen(false);
    setExtraGuestLink("NO");
    setExtraGuestAmount("0");
    setExtraGuestUnit("PERCENT");
    setRestrictionsLink("YES");
  }, [open]);

  useEffect(() => {
    if (!open || linkConfigLoading || !existingLinkRecord) return;
    const r = existingLinkRecord;
    setDirection(r.adjustmentDirection);
    setBaseRateValue(String(r.slaveRatePlanId));
    setAdjustmentAmount(String(r.adjustmentValue));
    setUnit(r.adjustmentType === "FIXED" ? "INR" : "PERCENT");
    setExtraGuestLink(r.linkExtraGuestRates ? "YES" : "NO");
    setExtraGuestAmount(
      r.extraGuestAdjustmentValue != null
        ? String(r.extraGuestAdjustmentValue)
        : "0",
    );
    setExtraGuestUnit(
      r.extraGuestAdjustmentType === "FIXED" ? "INR" : "PERCENT",
    );
    setRestrictionsLink(r.copyRestrictions === false ? "NO" : "YES");
    setAdvancedOpen(
      r.linkExtraGuestRates || r.copyRestrictions !== undefined,
    );
  }, [open, linkConfigLoading, existingLinkRecord]);

  const selectOptions = useMemo(() => {
    if (isLoadingOptions) {
      return [{ value: "", label: "Loading rate plans…" }];
    }
    if (baseRateOptions.length > 0) return baseRateOptions;
    return [
      {
        value: "",
        label: "Choose a base rate plan",
      },
    ];
  }, [baseRateOptions, isLoadingOptions]);

  const selectDisabled =
    isLoadingOptions ||
    linkConfigLoading ||
    noLinkablePlans ||
    baseRateOptions.length === 0;

  const confirmDisabled =
    isSubmitting ||
    isRemovingLink ||
    isLoadingOptions ||
    linkConfigLoading ||
    noLinkablePlans ||
    baseRateOptions.length === 0;

  const showRemoveLink =
    Boolean(onRemoveLink && existingLinkRecord?.id != null) &&
    !linkConfigLoading;

  const handleRemoveLink = async () => {
    const linkId = existingLinkRecord?.id;
    if (linkId == null || !onRemoveLink) return;
    onClearApiError?.();
    setIsRemovingLink(true);
    try {
      await onRemoveLink(linkId);
      onOpenChange(false);
    } finally {
      setIsRemovingLink(false);
    }
  };

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    if (!masterRatePlanId) return;
    if (baseRateOptions.length > 0 && !baseRateValue.trim()) {
      onInvalid?.();
      return;
    }
    const n = parseFloat(adjustmentAmount);
    const eg = parseFloat(extraGuestAmount);
    const payload: LinkRatePlansConfirmPayload = {
      masterRatePlanId,
      direction,
      baseRateValue,
      adjustmentAmount: Number.isFinite(n) ? n : 0,
      unit,
      advanced: {
        linkExtraGuestRates: extraGuestLink === "YES",
        extraGuestAdjustment: Number.isFinite(eg) ? eg : 0,
        extraGuestUnit,
        linkRestrictions: restrictionsLink === "YES",
      },
      existingLinkId: existingLinkRecord?.id,
    };
    onClearApiError?.();
    setIsSubmitting(true);
    try {
      await onConfirm?.(payload);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 max-w-[420px]">
        <SheetHeader>
          <SheetTitle>
            {linkConfigLoading
              ? "Linked rates"
              : existingLinkRecord
                ? "Update Linked Rates"
                : "Create Linked Rates"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Rate of <span className="font-semibold">{targetPlanLabel}</span>{" "}
              will be
            </p>
            <SegmentToggle
              value={direction}
              onChange={setDirection}
              options={[
                { value: "LOWER", label: "LOWER" },
                { value: "HIGHER", label: "HIGHER" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Select
              label="Than"
              placeholder="Choose a base rate plan"
              options={selectOptions}
              value={baseRateValue}
              onChange={(e) => setBaseRateValue(e.target.value)}
              disabled={selectDisabled}
            />
            {noLinkablePlans && !isLoadingOptions ? (
              <p className="text-sm text-amber-700">
                No other rate plans available to link
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium text-gray-700">By</span>
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="min-w-[6rem] flex-1">
                <Input
                  type="number"
                  min={0}
                  step={unit === "PERCENT" ? 1 : 0.01}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="h-11"
                />
              </div>
              <SegmentToggle
                value={unit}
                onChange={setUnit}
                options={[
                  { value: "PERCENT", label: "%" },
                  { value: "INR", label: "₹" },
                ]}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100/90"
          >
            {advancedOpen ? (
              <Minus className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
            ) : (
              <Plus className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
            )}
            <span>Advanced settings</span>
          </button>

          {advancedOpen && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium leading-snug text-slate-800">
                  Use a different offset for extra adult and child charges than
                  the main rate rule above?
                </p>
                <SegmentToggle<YesNo>
                  compact
                  value={extraGuestLink}
                  onChange={setExtraGuestLink}
                  options={[
                    { value: "NO", label: "No" },
                    { value: "YES", label: "Yes" },
                  ]}
                />
                {extraGuestLink === "YES" && (
                  <div className="flex flex-wrap items-stretch gap-3 pt-1">
                    <div className="min-w-[5rem] flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={extraGuestUnit === "PERCENT" ? 1 : 0.01}
                        value={extraGuestAmount}
                        onChange={(e) => setExtraGuestAmount(e.target.value)}
                        className="h-10"
                        placeholder="0"
                      />
                    </div>
                    <SegmentToggle
                      value={extraGuestUnit}
                      onChange={setExtraGuestUnit}
                      options={[
                        { value: "PERCENT", label: "%" },
                        { value: "INR", label: "₹" },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Sync restriction fields with base plan
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Applies min/max stay, cutoff, and similar rules from the
                    parent rate you selected.
                  </p>
                </div>
                <SegmentToggle<YesNo>
                  compact
                  value={restrictionsLink}
                  onChange={setRestrictionsLink}
                  options={[
                    { value: "NO", label: "No" },
                    { value: "YES", label: "Yes" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex flex-col gap-3">
          {apiError ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-900 whitespace-pre-wrap break-words shadow-sm"
              role="alert"
            >
              {apiError}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {linkConfigLoading
              ? "Loading…"
              : existingLinkRecord
                ? "Update Changes"
                : "Confirm Changes"}
          </button>
          {showRemoveLink ? (
            <button
              type="button"
              onClick={() => void handleRemoveLink()}
              disabled={isRemovingLink || isSubmitting || linkConfigLoading}
              className="w-full rounded-lg bg-red-600 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isRemovingLink ? "Removing…" : "Remove link"}
            </button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
