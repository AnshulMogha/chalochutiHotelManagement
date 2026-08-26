import { useState } from "react";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Gift,
  IndianRupee,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  parseOptionalReportDate,
  parseReportDateDdMmYyyy,
  isoToReportDateText,
} from "@/features/reports/components/reportUiHelpers";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { cn } from "@/lib/utils";
import {
  createHotelInclusion,
  updateRatePlanInclusion,
} from "../../services/inclusionsService";
import type {
  CreateHotelInclusionRequest,
  InclusionAssignment,
  InclusionCatalogueItem,
  InclusionEditTarget,
  UpdateRatePlanInclusionRequest,
} from "../../services/inclusionsTypes";
import { AppliedToLockedCard } from "./inclusionFormShared";
import { InclusionAssignmentsModal } from "./InclusionAssignmentsModal";

export type TimeOffsetDetailsKey =
  | "hoursBeforeStandardCheckIn"
  | "hoursAfterStandardCheckOut";

export type TimeOffsetFieldConfig = {
  key: TimeOffsetDetailsKey;
  label: string;
  hint?: string;
};

export type TimeOffsetInclusionConfig = {
  fallbackCode: string;
  fallbackName: string;
  detailsTitle: string;
  detailsSubtitle: string;
  fields: TimeOffsetFieldConfig[];
  successMessage: string;
  idPrefix: string;
};

type TimeOffsetInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  config: TimeOffsetInclusionConfig;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

const OFFER_TYPE_OPTIONS = [
  { value: "FREE", label: "Free" },
  { value: "DISCOUNTED", label: "Discounted" },
];

const AVAILABILITY_OPTIONS = [
  { value: "GUARANTEED", label: "Guaranteed" },
  { value: "SUBJECT_TO_AVAILABILITY", label: "Subject to availability" },
];

const CURRENCY_OPTIONS = [{ value: "INR", label: "INR" }];

const PRICING_UNIT_OPTIONS = [
  { value: "PER_STAY", label: "Per stay" },
  { value: "PER_NIGHT", label: "Per night" },
  { value: "PER_ROOM", label: "Per room" },
  { value: "PER_PERSON", label: "Per person" },
  { value: "PER_UNIT", label: "Per unit" },
  { value: "PER_TRANSFER", label: "Per transfer" },
];

const FREE_PAYMENT_OPTIONS = [{ value: "NONE", label: "None" }];

const DISCOUNTED_PAYMENT_OPTIONS = [
  { value: "PROPERTY", label: "At property" },
];

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6].map((h) => ({
  value: String(h),
  label: `${h} hour${h === 1 ? "" : "s"}`,
}));

export const EARLY_CHECKIN_CONFIG: TimeOffsetInclusionConfig = {
  fallbackCode: "EARLY_CHECKIN",
  fallbackName: "Early check-in",
  detailsTitle: "Early Check-in Details",
  detailsSubtitle: "Set how many hours early check-in is allowed.",
  fields: [
    {
      key: "hoursBeforeStandardCheckIn",
      label: "Hours before standard check-in",
      hint: "Example: 2 means guests may check in up to 2 hours early.",
    },
  ],
  successMessage: "Early check-in inclusion created.",
  idPrefix: "early-checkin",
};

export const LATE_CHECKOUT_CONFIG: TimeOffsetInclusionConfig = {
  fallbackCode: "LATE_CHECKOUT",
  fallbackName: "Late check-out",
  detailsTitle: "Late Check-out Details",
  detailsSubtitle: "Set how many hours late check-out is allowed.",
  fields: [
    {
      key: "hoursAfterStandardCheckOut",
      label: "Hours after standard check-out",
      hint: "Example: 2 means guests may check out up to 2 hours late.",
    },
  ],
  successMessage: "Late check-out inclusion created.",
  idPrefix: "late-checkout",
};

export const EARLY_LATE_COMBO_CONFIG: TimeOffsetInclusionConfig = {
  fallbackCode: "GUARANTEED_EARLY_CHECKIN_LATE_CHECKOUT",
  fallbackName: "Early check-in & late check-out",
  detailsTitle: "Check-in / Check-out Details",
  detailsSubtitle: "Set early check-in and late check-out hours.",
  fields: [
    {
      key: "hoursBeforeStandardCheckIn",
      label: "Hours before standard check-in",
      hint: "Example: 2 means guests may check in up to 2 hours early.",
    },
    {
      key: "hoursAfterStandardCheckOut",
      label: "Hours after standard check-out",
      hint: "Example: 2 means guests may check out up to 2 hours late.",
    },
  ],
  successMessage: "Early check-in & late check-out inclusion created.",
  idPrefix: "early-late-combo",
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconTheme = "bg-indigo-50 text-indigo-600 ring-indigo-100",
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTheme?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
            iconTheme,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function TimeOffsetInclusionForm({
  hotelId,
  inclusion,
  config,
  onBack,
  onSuccess,
  showToast,
  editTarget = null,
}: TimeOffsetInclusionFormProps) {
  const isEdit = Boolean(editTarget);
  const initial = editTarget?.item;

  const [offerType, setOfferType] = useState(initial?.offerType || "FREE");
  const [availabilityType, setAvailabilityType] = useState(
    initial?.availabilityType || "GUARANTEED",
  );
  const [paymentLocation, setPaymentLocation] = useState(
    initial?.paymentLocation || "NONE",
  );
  const [price, setPrice] = useState(
    initial?.price != null ? String(initial.price) : "500",
  );
  const [currency, setCurrency] = useState(initial?.currency || "INR");
  const [pricingUnit, setPricingUnit] = useState(
    initial?.pricingUnit || "PER_STAY",
  );
  const [validFrom, setValidFrom] = useState(
    isoToReportDateText(initial?.validFrom),
  );
  const [validTo, setValidTo] = useState(isoToReportDateText(initial?.validTo));
  const [hoursByKey, setHoursByKey] = useState<
    Record<TimeOffsetDetailsKey, string>
  >({
    hoursBeforeStandardCheckIn: String(
      initial?.details?.hoursBeforeStandardCheckIn ?? 2,
    ),
    hoursAfterStandardCheckOut: String(
      initial?.details?.hoursAfterStandardCheckOut ?? 2,
    ),
  });

  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Omit<
    CreateHotelInclusionRequest,
    "assignments"
  > | null>(null);
  const isDiscounted = offerType === "DISCOUNTED";
  const paymentOptions = isDiscounted
    ? DISCOUNTED_PAYMENT_OPTIONS
    : FREE_PAYMENT_OPTIONS;

  const handleOfferTypeChange = (nextOfferType: string) => {
    setOfferType(nextOfferType);
    if (nextOfferType === "DISCOUNTED") {
      setPaymentLocation("PROPERTY");
      setAvailabilityType((prev) =>
        prev === "GUARANTEED" ? "SUBJECT_TO_AVAILABILITY" : prev,
      );
    } else {
      setPaymentLocation("NONE");
      setAvailabilityType("GUARANTEED");
    }
  };

  const hoursValid = config.fields.every((field) => {
    const value = Number(hoursByKey[field.key]);
    return value >= 1 && value <= 6;
  });

  const priceValue = Number(price);
  const priceValid =
    !isDiscounted || (Number.isFinite(priceValue) && priceValue > 0);

  const fromIso = validFrom.trim()
    ? parseReportDateDdMmYyyy(validFrom)
    : null;
  const toIso = validTo.trim()
    ? parseReportDateDdMmYyyy(validTo)
    : null;
  const fromIncomplete = Boolean(validFrom.trim()) && !fromIso;
  const toIncomplete = Boolean(validTo.trim()) && !toIso;
  const datesValid =
    !isDiscounted ||
    (!fromIncomplete &&
      !toIncomplete &&
      (!fromIso || !toIso || fromIso <= toIso));

  const canSubmit = hoursValid && priceValid && datesValid && !saving;

  const buildBody = (): UpdateRatePlanInclusionRequest => {
    const details: Record<string, number> = {};
    for (const field of config.fields) {
      details[field.key] = Number(hoursByKey[field.key]);
    }

    const body: UpdateRatePlanInclusionRequest = {
      offerType,
      availabilityType,
      paymentLocation,
      details,
    };

    if (isDiscounted) {
      body.price = priceValue;
      body.currency = currency;
      body.pricingUnit = pricingUnit;
      const parsedFrom = parseOptionalReportDate(validFrom);
      const parsedTo = parseOptionalReportDate(validTo);
      if (parsedFrom) body.validFrom = parsedFrom;
      if (parsedTo) body.validTo = parsedTo;
    }

    return body;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body = buildBody();

    if (isEdit && editTarget) {
      setSaving(true);
      try {
        await updateRatePlanInclusion(
          hotelId,
          editTarget.roomKey,
          editTarget.ratePlanId,
          editTarget.inclusionId,
          body,
        );
        showToast(
          config.successMessage.replace("created.", "updated."),
          "success",
        );
        onSuccess();
      } catch (err) {
        showToast(extractErrorMessage(err), "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    setPendingPayload({
      inclusionCode: inclusion.code || config.fallbackCode,
      ...body,
    });
    setAssignOpen(true);
  };

  const handleConfirmAssignments = async (
    assignments: InclusionAssignment[],
  ) => {
    if (!pendingPayload) return;
    setSaving(true);
    try {
      await createHotelInclusion(hotelId, {
        ...pendingPayload,
        assignments,
      });
      showToast(config.successMessage, "success");
      setAssignOpen(false);
      setPendingPayload(null);
      onSuccess();
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#2f3d95] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEdit ? "Back to list" : "Back to catalogue"}
        </button>
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit ? `Edit ${inclusion.name || config.fallbackName}` : inclusion.name || config.fallbackName}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
        {isEdit && editTarget ? (
          <AppliedToLockedCard
            roomName={editTarget.roomName}
            ratePlanName={editTarget.ratePlanName}
          />
        ) : null}

        <SectionCard
          title="Offer Settings"
          subtitle="Pricing and request handling rules."
          icon={Gift}
          iconTheme="bg-violet-50 text-violet-700 ring-violet-100"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id={`${config.idPrefix}-offer-type`}
              label="Offer type"
              labelIcon={Gift}
              labelIconTheme="violet"
              required
              value={offerType}
              onChange={(e) => handleOfferTypeChange(e.target.value)}
              options={OFFER_TYPE_OPTIONS}
            />
            <Select
              id={`${config.idPrefix}-availability`}
              label="Availability"
              labelIcon={ShieldCheck}
              labelIconTheme="indigo"
              required
              value={availabilityType}
              onChange={(e) => setAvailabilityType(e.target.value)}
              options={AVAILABILITY_OPTIONS}
            />
            <Select
              id={`${config.idPrefix}-payment`}
              label="Payment location"
              labelIcon={CreditCard}
              labelIconTheme="cyan"
              required
              value={paymentLocation}
              onChange={(e) => setPaymentLocation(e.target.value)}
              options={paymentOptions}
            />
          </div>
        </SectionCard>

        {isDiscounted ? (
          <SectionCard
            title="Discounted Pricing"
            subtitle="Pay at property — price applies per stay."
            icon={IndianRupee}
            iconTheme="bg-emerald-50 text-emerald-700 ring-emerald-100"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                id={`${config.idPrefix}-price`}
                label="Price"
                labelIcon={IndianRupee}
                labelIconTheme="emerald"
                type="number"
                min={1}
                step={1}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                error={
                  price !== "" && !priceValid
                    ? "Enter a price greater than 0"
                    : undefined
                }
              />
              <Select
                id={`${config.idPrefix}-currency`}
                label="Currency"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCY_OPTIONS}
              />
              <Select
                id={`${config.idPrefix}-pricing-unit`}
                label="Pricing unit"
                required
                value={pricingUnit}
                onChange={(e) => setPricingUnit(e.target.value)}
                options={PRICING_UNIT_OPTIONS}
              />
            </div>
            <div className="mt-3">
              <ReportCustomDateFields
                fromText={validFrom}
                toText={validTo}
                onFromTextChange={setValidFrom}
                onToTextChange={setValidTo}
                fromLabel="Valid from (optional)"
                toLabel="Valid to (optional)"
              />
              {fromIncomplete || toIncomplete ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  Enter dates as dd/mm/yyyy
                </p>
              ) : !datesValid ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  Valid to must be on or after valid from
                </p>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title={config.detailsTitle}
          subtitle={config.detailsSubtitle}
          icon={Clock}
          iconTheme="bg-amber-50 text-amber-700 ring-amber-100"
        >
          <div className="space-y-3">
            {config.fields.map((field) => (
              <div key={field.key}>
                <Select
                  id={`${config.idPrefix}-${field.key}`}
                  label={field.label}
                  labelIcon={Clock}
                  labelIconTheme="amber"
                  required
                  value={hoursByKey[field.key]}
                  onChange={(e) =>
                    setHoursByKey((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  options={HOURS_OPTIONS}
                  placeholder="Select hours"
                />
                {field.hint ? (
                  <p className="mt-2 text-xs text-slate-500">{field.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#263578] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && isEdit ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Update inclusion" : "Create inclusion"}
          </button>
        </div>
      </form>

      {!isEdit ? (
        <InclusionAssignmentsModal
          open={assignOpen}
          hotelId={hotelId}
          confirming={saving}
          onClose={() => {
            if (saving) return;
            setAssignOpen(false);
            setPendingPayload(null);
          }}
          onConfirm={handleConfirmAssignments}
        />
      ) : null}
    </div>
  );
}
