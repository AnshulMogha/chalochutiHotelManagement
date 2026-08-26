import { useState } from "react";
import {
  ArrowLeft,
  CalendarRange,
  Car,
  CreditCard,
  Gift,
  IndianRupee,
  Loader2,
  Save,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  isoToReportDateText,
  parseOptionalReportDate,
  parseReportDateDdMmYyyy,
} from "@/features/reports/components/reportUiHelpers";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
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
import {
  InclusionSectionCard,
  INCLUSION_PRICING_UNIT_OPTIONS,
  AppliedToLockedCard,
} from "./inclusionFormShared";
import { InclusionAssignmentsModal } from "./InclusionAssignmentsModal";

type TransferInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

const TRANSFER_TYPE_OPTIONS = [
  { value: "ARRIVAL", label: "Arrival" },
  { value: "DEPARTURE", label: "Departure" },
  { value: "ROUND_TRIP", label: "Round trip" },
];

const VEHICLE_TYPE_OPTIONS = [
  { value: "SEDAN", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "VAN", label: "Van" },
  { value: "BUS", label: "Bus" },
];

const OFFER_TYPE_OPTIONS = [
  { value: "FREE", label: "Free" },
  { value: "DISCOUNTED", label: "Discounted" },
];

const FREE_PAYMENT_OPTIONS = [{ value: "NONE", label: "None" }];
const DISCOUNTED_PAYMENT_OPTIONS = [
  { value: "PROPERTY", label: "At property" },
];
const CURRENCY_OPTIONS = [{ value: "INR", label: "INR" }];

export function TransferInclusionForm({
  hotelId,
  inclusion,
  onBack,
  onSuccess,
  showToast,
  editTarget = null,
}: TransferInclusionFormProps) {
  const idPrefix = "transfer";
  const isEdit = Boolean(editTarget);
  const initial = editTarget?.item;

  const [offerType, setOfferType] = useState(initial?.offerType || "FREE");
  const [paymentLocation, setPaymentLocation] = useState(
    initial?.paymentLocation || "NONE",
  );
  const [transferType, setTransferType] = useState(
    String(initial?.details?.transferType ?? "ARRIVAL"),
  );
  const [vehicleType, setVehicleType] = useState(
    String(initial?.details?.vehicleType ?? "SEDAN"),
  );
  const [price, setPrice] = useState(
    initial?.price != null ? String(initial.price) : "1000",
  );
  const [currency, setCurrency] = useState(initial?.currency || "INR");
  const [pricingUnit, setPricingUnit] = useState(
    initial?.pricingUnit || "PER_TRANSFER",
  );
  const [validFrom, setValidFrom] = useState(
    isoToReportDateText(initial?.validFrom),
  );
  const [validTo, setValidTo] = useState(
    isoToReportDateText(initial?.validTo),
  );
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

  const handleOfferTypeChange = (next: string) => {
    setOfferType(next);
    setPaymentLocation(next === "DISCOUNTED" ? "PROPERTY" : "NONE");
  };

  const priceValue = Number(price);
  const priceValid =
    !isDiscounted || (Number.isFinite(priceValue) && priceValue > 0);

  const fromIso = validFrom.trim()
    ? parseReportDateDdMmYyyy(validFrom)
    : null;
  const toIso = validTo.trim() ? parseReportDateDdMmYyyy(validTo) : null;
  const fromIncomplete = Boolean(validFrom.trim()) && !fromIso;
  const toIncomplete = Boolean(validTo.trim()) && !toIso;
  const datesValid =
    !fromIncomplete &&
    !toIncomplete &&
    (!fromIso || !toIso || fromIso <= toIso);

  const canSubmit =
    Boolean(transferType) &&
    Boolean(vehicleType) &&
    priceValid &&
    datesValid &&
    !saving;

  const buildBody = (): UpdateRatePlanInclusionRequest => {
    const body: UpdateRatePlanInclusionRequest = {
      offerType,
      paymentLocation,
      details: {
        transferType,
        vehicleType,
      },
    };

    if (isDiscounted) {
      body.price = priceValue;
      body.currency = currency;
      body.pricingUnit = pricingUnit;
    }

    const parsedFrom = parseOptionalReportDate(validFrom);
    const parsedTo = parseOptionalReportDate(validTo);
    if (parsedFrom) body.validFrom = parsedFrom;
    if (parsedTo) body.validTo = parsedTo;
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
        showToast("Transfer inclusion updated.", "success");
        onSuccess();
      } catch (err) {
        showToast(extractErrorMessage(err), "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    setPendingPayload({
      inclusionCode: inclusion.code,
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
      showToast("Transfer inclusion created.", "success");
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
          {isEdit
            ? `Edit ${inclusion.name || inclusion.code}`
            : inclusion.name || inclusion.code}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
        {isEdit && editTarget ? (
          <AppliedToLockedCard
            roomName={editTarget.roomName}
            ratePlanName={editTarget.ratePlanName}
          />
        ) : null}

        <InclusionSectionCard
          title="Offer Settings"
          subtitle="Free or discounted transfer offer."
          icon={Gift}
          iconTheme="bg-violet-50 text-violet-700 ring-violet-100"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id={`${idPrefix}-offer-type`}
              label="Offer type"
              labelIcon={Gift}
              labelIconTheme="violet"
              required
              value={offerType}
              onChange={(e) => handleOfferTypeChange(e.target.value)}
              options={OFFER_TYPE_OPTIONS}
            />
            <Select
              id={`${idPrefix}-payment`}
              label="Payment location"
              labelIcon={CreditCard}
              labelIconTheme="cyan"
              required
              value={paymentLocation}
              onChange={(e) => setPaymentLocation(e.target.value)}
              options={paymentOptions}
            />
          </div>
        </InclusionSectionCard>

        <InclusionSectionCard
          title="Transfer Details"
          subtitle="Set transfer direction and vehicle."
          icon={Car}
          iconTheme="bg-sky-50 text-sky-700 ring-sky-100"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id={`${idPrefix}-transfer-type`}
              label="Transfer type"
              labelIcon={Car}
              labelIconTheme="indigo"
              required
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
              options={TRANSFER_TYPE_OPTIONS}
            />
            <Select
              id={`${idPrefix}-vehicle-type`}
              label="Vehicle type"
              required
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              options={VEHICLE_TYPE_OPTIONS}
            />
          </div>
        </InclusionSectionCard>

        {isDiscounted ? (
          <InclusionSectionCard
            title="Discounted Pricing"
            subtitle="Pay at property for this transfer."
            icon={IndianRupee}
            iconTheme="bg-emerald-50 text-emerald-700 ring-emerald-100"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                id={`${idPrefix}-price`}
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
                id={`${idPrefix}-currency`}
                label="Currency"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCY_OPTIONS}
              />
              <Select
                id={`${idPrefix}-pricing-unit`}
                label="Pricing unit"
                required
                value={pricingUnit}
                onChange={(e) => setPricingUnit(e.target.value)}
                options={INCLUSION_PRICING_UNIT_OPTIONS}
              />
            </div>
          </InclusionSectionCard>
        ) : null}

        <InclusionSectionCard
          title="Validity (optional)"
          subtitle="Limit when this inclusion can be offered."
          icon={CalendarRange}
          iconTheme="bg-slate-100 text-slate-600 ring-slate-200"
        >
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
        </InclusionSectionCard>

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
