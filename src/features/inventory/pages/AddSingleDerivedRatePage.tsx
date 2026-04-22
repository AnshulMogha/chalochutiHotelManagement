import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  Users,
  CalendarDays,
  IndianRupee,
  User,
  UserPlus,
  Baby,
  Hash,
  Clock,
  Coins,
  Link2,
  Save,
  X,
  Loader2,
  ListOrdered,
  AlertCircle,
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { ROUTES } from "@/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { rateService } from "../services/rateService";
import { inventoryService } from "../services/inventoryService";
import { adminService, type HotelRoom, type RatePlan } from "@/features/admin/services/adminService";
import { mapHotelRoomUuidsToNumericRoomIds } from "../utils/mapHotelRoomUuidsToNumericRoomIds";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPES = [
  { value: "RETAIL", label: "RETAIL" },
  { value: "AGENT", label: "AGENT" },
  { value: "CORPORATE", label: "CORPORATE" },
];

const CURRENCIES = [
  { value: "INR", label: "INR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

const iconClass = "w-4 h-4 text-blue-600";

function todayYmd() {
  return format(new Date(), "yyyy-MM-dd");
}

const initialFormFields = () => ({
  customerType: "RETAIL",
  date: todayYmd(),
  baseRate: "",
  singleOccupancyRate: "",
  extraAdultCharge: "",
  paidChildCharge: "",
  minStay: "1",
  maxStay: "7",
  cutoffTime: "18:00",
  currency: "INR",
});

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#2A3170]">
          {title}
        </h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function AddSingleDerivedRatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const fromDateFromUrl = searchParams.get("from");
  const toDateFromUrl = searchParams.get("to");
  const roomIdFromUrl = searchParams.get("roomId");
  const ratePlanIdFromUrl = searchParams.get("ratePlanId");
  const { toast, showToast, hideToast } = useToast();
  const deepLinkFromInventoryAppliedRef = useRef(false);

  const init = initialFormFields();
  const [customerType, setCustomerType] = useState(init.customerType);
  const [date, setDate] = useState(init.date);
  const [baseRate, setBaseRate] = useState(init.baseRate);
  const [singleOccupancyRate, setSingleOccupancyRate] = useState(
    init.singleOccupancyRate,
  );
  const [extraAdultCharge, setExtraAdultCharge] = useState(
    init.extraAdultCharge,
  );
  const [paidChildCharge, setPaidChildCharge] = useState(init.paidChildCharge);
  const [minStay, setMinStay] = useState(init.minStay);
  const [maxStay, setMaxStay] = useState(init.maxStay);
  const [cutoffTime, setCutoffTime] = useState(init.cutoffTime);
  const [currency, setCurrency] = useState(init.currency);

  const [hotelRooms, setHotelRooms] = useState<HotelRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [uuidToNumericRoomId, setUuidToNumericRoomId] = useState<
    Record<string, number>
  >({});
  const [loadingRoomIdMap, setLoadingRoomIdMap] = useState(false);

  const [selectedRoomUuid, setSelectedRoomUuid] = useState("");
  const [selectedRatePlanId, setSelectedRatePlanId] = useState("");
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loadingRatePlans, setLoadingRatePlans] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** When opened from Rate Inventory with roomId + ratePlanId, room & rate plan cannot be changed. */
  const [roomAndRatePlanLocked, setRoomAndRatePlanLocked] = useState(false);

  const selectedRoomId =
    selectedRoomUuid && uuidToNumericRoomId[selectedRoomUuid] != null
      ? uuidToNumericRoomId[selectedRoomUuid]
      : null;

  const minSelectableDateYmd = format(startOfToday(), "yyyy-MM-dd");

  const backToRatePlans = () => {
    const path = hotelId
      ? `${ROUTES.RATE_INVENTORY.LIST}?hotelId=${encodeURIComponent(hotelId)}`
      : ROUTES.RATE_INVENTORY.LIST;
    navigate(path);
  };

  useEffect(() => {
    if (!hotelId) return;
    let cancelled = false;
    setLoadingRooms(true);
    inventoryService
      .getHotelRooms(hotelId)
      .then((rooms) => {
        if (!cancelled) setHotelRooms(rooms);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHotelRooms([]);
          const msg =
            err &&
            typeof err === "object" &&
            "message" in err &&
            typeof (err as { message: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Failed to load rooms.";
          showToast(msg, "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showToast is not stable
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId || hotelRooms.length === 0) {
      setUuidToNumericRoomId({});
      return;
    }
    let cancelled = false;
    setLoadingRoomIdMap(true);
    mapHotelRoomUuidsToNumericRoomIds(hotelId, hotelRooms, customerType)
      .then((map) => {
        if (!cancelled) setUuidToNumericRoomId(map);
      })
      .catch(() => {
        if (!cancelled) setUuidToNumericRoomId({});
      })
      .finally(() => {
        if (!cancelled) setLoadingRoomIdMap(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelId, hotelRooms, customerType]);

  useEffect(() => {
    deepLinkFromInventoryAppliedRef.current = false;
    setRoomAndRatePlanLocked(false);
  }, [hotelId, roomIdFromUrl, ratePlanIdFromUrl]);

  useEffect(() => {
    if (deepLinkFromInventoryAppliedRef.current) return;
    if (!hotelId || !roomIdFromUrl || !ratePlanIdFromUrl) return;
    const numericRoomId = parseInt(roomIdFromUrl, 10);
    if (!Number.isFinite(numericRoomId)) return;
    const entries = Object.entries(uuidToNumericRoomId);
    if (entries.length === 0) return;
    const roomUuid = entries.find(([, n]) => n === numericRoomId)?.[0];
    if (!roomUuid) return;
    setSelectedRoomUuid(roomUuid);
    setSelectedRatePlanId(ratePlanIdFromUrl);
    deepLinkFromInventoryAppliedRef.current = true;
    setRoomAndRatePlanLocked(true);
  }, [
    hotelId,
    roomIdFromUrl,
    ratePlanIdFromUrl,
    uuidToNumericRoomId,
  ]);

  useEffect(() => {
    if (!hotelId || !selectedRoomUuid) {
      setRatePlans([]);
      return;
    }
    let cancelled = false;
    setLoadingRatePlans(true);
    setRatePlans([]);
    adminService
      .getRoomRatePlans(hotelId, selectedRoomUuid)
      .then((data) => {
        if (!cancelled) setRatePlans(data.ratePlans || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRatePlans([]);
          const msg =
            err &&
            typeof err === "object" &&
            "message" in err &&
            typeof (err as { message: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Failed to load rate plans.";
          showToast(msg, "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRatePlans(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showToast is not stable
  }, [hotelId, selectedRoomUuid]);

  const roomSelectOptions = hotelRooms.map((r) => ({
    value: r.roomId,
    label: r.roomName,
  }));

  const ratePlanSelectOptions = ratePlans.map((rp) => ({
    value: String(rp.ratePlanId),
    label: rp.ratePlanName,
  }));

  const handleRoomChange = (uuid: string) => {
    setSelectedRoomUuid(uuid);
    setSelectedRatePlanId("");
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.roomUuid;
      delete next.ratePlanId;
      delete next.roomNumericId;
      return next;
    });
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};

    if (!hotelId) err.hotelId = "Hotel ID is missing";
    if (!selectedRoomUuid) err.roomUuid = "Select a room";
    if (selectedRoomUuid && selectedRoomId == null) {
      err.roomNumericId =
        "Could not resolve numeric room ID from the rate calendar. Try another customer type or refresh.";
    }
    if (!selectedRatePlanId.trim()) err.ratePlanId = "Select a rate plan";
    const rp = parseInt(selectedRatePlanId, 10);
    if (selectedRatePlanId.trim() && (Number.isNaN(rp) || rp <= 0)) {
      err.ratePlanId = "Select a valid rate plan";
    }

    if (!customerType.trim()) err.customerType = "Select customer type";
    if (!date.trim()) err.date = "Select a date";
    else if (date < minSelectableDateYmd) {
      err.date = "Date must be today or later";
    }

    const br = parseFloat(baseRate);
    if (baseRate.trim() === "" || Number.isNaN(br) || br < 0) {
      err.baseRate = "Enter a valid base rate";
    }

    const sor = parseFloat(singleOccupancyRate);
    if (
      singleOccupancyRate.trim() === "" ||
      Number.isNaN(sor) ||
      sor < 0
    ) {
      err.singleOccupancyRate = "Enter a valid single occupancy rate";
    }

    const eac = parseFloat(extraAdultCharge);
    if (extraAdultCharge.trim() === "" || Number.isNaN(eac) || eac < 0) {
      err.extraAdultCharge = "Enter a valid extra adult charge";
    }

    const pcc = parseFloat(paidChildCharge);
    if (paidChildCharge.trim() === "" || Number.isNaN(pcc) || pcc < 0) {
      err.paidChildCharge = "Enter a valid paid child charge";
    }

    const min = parseInt(minStay, 10);
    if (minStay.trim() === "" || Number.isNaN(min) || min < 1) {
      err.minStay = "Min stay must be at least 1";
    }

    const max = parseInt(maxStay, 10);
    if (maxStay.trim() === "" || Number.isNaN(max) || max < 1) {
      err.maxStay = "Max stay must be at least 1";
    } else if (!Number.isNaN(min) && max < min) {
      err.maxStay = "Max stay must be greater than or equal to min stay";
    }

    if (!cutoffTime.trim()) err.cutoffTime = "Select cutoff time";
    if (!currency.trim()) err.currency = "Select currency";

    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast("Please fix the errors below.", "error");
      return;
    }
    if (hotelId == null || selectedRoomId == null) return;

    setIsSubmitting(true);
    try {
      await rateService.createSingleDerivedRate({
        roomId: selectedRoomId,
        ratePlanId: parseInt(selectedRatePlanId, 10),
        customerType,
        date,
        baseRate: parseFloat(baseRate),
        singleOccupancyRate: parseFloat(singleOccupancyRate),
        extraAdultCharge: parseFloat(extraAdultCharge),
        paidChildCharge: parseFloat(paidChildCharge),
        minStay: parseInt(minStay, 10),
        maxStay: parseInt(maxStay, 10),
        cutoffTime,
        currency,
      });
      const refreshFrom = fromDateFromUrl || date;
      const refreshTo = toDateFromUrl || date;
      await rateService.getCalendar(hotelId, refreshFrom, refreshTo, customerType);
      showToast("Single day derived rate saved successfully.", "success");
      const next = initialFormFields();
      setCustomerType(next.customerType);
      setDate(next.date);
      setBaseRate(next.baseRate);
      setSingleOccupancyRate(next.singleOccupancyRate);
      setExtraAdultCharge(next.extraAdultCharge);
      setPaidChildCharge(next.paidChildCharge);
      setMinStay(next.minStay);
      setMaxStay(next.maxStay);
      setCutoffTime(next.cutoffTime);
      setCurrency(next.currency);
      setSelectedRoomUuid("");
      setSelectedRatePlanId("");
      setRatePlans([]);
      setFieldErrors({});
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Failed to save derived rate.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratePlanDisabled =
    !selectedRoomUuid || loadingRatePlans || !hotelId;
  const roomDropdownDisabled =
    loadingRooms || !hotelId || isSubmitting || roomAndRatePlanLocked;
  const ratePlanSelectDisabled =
    ratePlanDisabled || isSubmitting || roomAndRatePlanLocked;

  return (
    <div className="min-h-screen w-full bg-slate-100 pb-28">
      <div className="w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="w-full max-w-[100vw] px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                onClick={backToRatePlans}
                className="mt-0.5 shrink-0 p-2.5 rounded-full border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/70 transition-colors shadow-sm"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shrink-0">
                    <Link2 className="w-5 h-5" />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Add Single Day Derived Rate
                  </h1>
                </div>
                {!hotelId && (
                  <p className="mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Add{" "}
                    <code className="text-xs bg-amber-100/80 px-1 rounded">
                      ?hotelId=…
                    </code>{" "}
                    to the URL (open from Rate &amp; Inventory) to load rooms and
                    rate plans.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
            <SectionCard
              title="Room & rate plan"
              icon={<BedDouble className="w-4 h-4" />}
            >
              <div className="space-y-4">
                {loadingRooms && (
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Loading rooms…
                  </p>
                )}
                {loadingRoomIdMap && selectedRoomUuid && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Syncing room ID with rate calendar…
                  </p>
                )}
                <Select
                  label="Room"
                  placeholder="Choose a room"
                  options={roomSelectOptions}
                  value={selectedRoomUuid}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  error={fieldErrors.roomUuid}
                  disabled={roomDropdownDisabled}
                  icon={<BedDouble className={iconClass} />}
                  title={
                    roomAndRatePlanLocked
                      ? "Room is set from inventory and cannot be changed"
                      : undefined
                  }
                />
                {fieldErrors.roomNumericId && (
                  <p
                    className="flex items-start gap-2 text-sm text-red-600"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {fieldErrors.roomNumericId}
                  </p>
                )}
                <div>
                  <Select
                    label="Rate plan"
                    placeholder={
                      !selectedRoomUuid
                        ? "Select a room first"
                        : loadingRatePlans
                          ? "Loading rate plans…"
                          : ratePlans.length === 0
                            ? "No rate plans for this room"
                            : "Choose a rate plan"
                    }
                    options={ratePlanSelectOptions}
                    value={selectedRatePlanId}
                    onChange={(e) => setSelectedRatePlanId(e.target.value)}
                    error={fieldErrors.ratePlanId}
                    disabled={ratePlanSelectDisabled}
                    icon={<ListOrdered className={iconClass} />}
                    title={
                      roomAndRatePlanLocked
                        ? "Rate plan is set from inventory and cannot be changed"
                        : undefined
                    }
                  />
                  {selectedRoomUuid &&
                    !loadingRatePlans &&
                    ratePlans.length === 0 && (
                      <p className="mt-2 text-sm text-slate-500">
                        No rate plans returned for this room.
                      </p>
                    )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Channel & date"
              icon={<Users className="w-4 h-4" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                <Select
                  label="Customer Type"
                  placeholder="Choose customer type"
                  options={CUSTOMER_TYPES}
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  error={fieldErrors.customerType}
                  disabled={isSubmitting}
                  icon={<Users className={iconClass} />}
                />
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    Date
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      min={minSelectableDateYmd}
                      value={date}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setDate("");
                          return;
                        }
                        setDate(
                          v < minSelectableDateYmd ? minSelectableDateYmd : v,
                        );
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm",
                        "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
                        "disabled:cursor-not-allowed disabled:bg-gray-100",
                        fieldErrors.date && "border-red-500",
                      )}
                    />
                  </div>
                  {fieldErrors.date && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {fieldErrors.date}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Rates & charges"
            icon={<IndianRupee className="w-4 h-4" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 w-full">
              <Input
                label="Base Rate"
                type="number"
                min={0}
                step={0.01}
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                error={fieldErrors.baseRate}
                disabled={isSubmitting}
                icon={<IndianRupee className={iconClass} />}
              />
              <Input
                label="Single Occupancy Rate"
                type="number"
                min={0}
                step={0.01}
                value={singleOccupancyRate}
                onChange={(e) => setSingleOccupancyRate(e.target.value)}
                error={fieldErrors.singleOccupancyRate}
                disabled={isSubmitting}
                icon={<User className={iconClass} />}
              />
              <Input
                label="Extra Adult Charge"
                type="number"
                min={0}
                step={0.01}
                value={extraAdultCharge}
                onChange={(e) => setExtraAdultCharge(e.target.value)}
                error={fieldErrors.extraAdultCharge}
                disabled={isSubmitting}
                icon={<UserPlus className={iconClass} />}
              />
              <Input
                label="Paid Child Charge"
                type="number"
                min={0}
                step={0.01}
                value={paidChildCharge}
                onChange={(e) => setPaidChildCharge(e.target.value)}
                error={fieldErrors.paidChildCharge}
                disabled={isSubmitting}
                icon={<Baby className={iconClass} />}
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
            <SectionCard
              title="Stay length"
              icon={<Hash className="w-4 h-4" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                <Input
                  label="Min Stay"
                  type="number"
                  min={1}
                  step={1}
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value)}
                  error={fieldErrors.minStay}
                  disabled={isSubmitting}
                  icon={<Hash className={iconClass} />}
                />
                <Input
                  label="Max Stay"
                  type="number"
                  min={1}
                  step={1}
                  value={maxStay}
                  onChange={(e) => setMaxStay(e.target.value)}
                  error={fieldErrors.maxStay}
                  disabled={isSubmitting}
                  icon={<Hash className={iconClass} />}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Cutoff & currency"
              icon={<Clock className="w-4 h-4" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Cutoff Time
                  </label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      value={cutoffTime}
                      onChange={(e) => setCutoffTime(e.target.value)}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm",
                        "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
                        "disabled:cursor-not-allowed disabled:bg-gray-100",
                        fieldErrors.cutoffTime && "border-red-500",
                      )}
                    />
                  </div>
                  {fieldErrors.cutoffTime && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {fieldErrors.cutoffTime}
                    </p>
                  )}
                </div>
                <Select
                  label="Currency"
                  placeholder="Select currency"
                  options={CURRENCIES}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  error={fieldErrors.currency}
                  disabled={isSubmitting}
                  icon={<Coins className={iconClass} />}
                />
              </div>
            </SectionCard>
          </div>

          <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 sm:px-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={backToRatePlans}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 sm:min-w-[8rem]"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hotelId}
              className="inline-flex items-center justify-center gap-2 sm:min-w-[10rem]"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
