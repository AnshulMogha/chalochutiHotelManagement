import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import {
  adminService,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { cn } from "@/lib/utils";

export function roomPathKey(room: HotelRoom): string {
  return String(room.roomKey || room.roomId || "");
}

export function roomLiveId(room: HotelRoom): string {
  return String(room.roomId || room.roomKey || "");
}

export function InclusionSectionCard({
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

export function useHotelRoomRatePlanSelection(hotelId: string) {
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [roomKey, setRoomKey] = useState("");
  const [ratePlansLoading, setRatePlansLoading] = useState(false);
  const [ratePlansError, setRatePlansError] = useState<string | null>(null);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [ratePlanId, setRatePlanId] = useState("");

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const data = await adminService.getHotelAdminRooms(hotelId);
      setRooms(data.rooms || []);
    } catch (err) {
      setRooms([]);
      setRoomsError(extractErrorMessage(err));
    } finally {
      setRoomsLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!roomKey) {
      setRatePlans([]);
      setRatePlanId("");
      setRatePlansError(null);
      return;
    }

    let cancelled = false;
    const loadRatePlans = async () => {
      setRatePlansLoading(true);
      setRatePlansError(null);
      setRatePlanId("");
      try {
        const data = await adminService.getRoomRatePlans(hotelId, roomKey);
        if (cancelled) return;
        setRatePlans(data.ratePlans || []);
      } catch (err) {
        if (cancelled) return;
        setRatePlans([]);
        setRatePlansError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setRatePlansLoading(false);
      }
    };
    void loadRatePlans();
    return () => {
      cancelled = true;
    };
  }, [hotelId, roomKey]);

  const roomOptions = useMemo(
    () =>
      rooms.map((room) => ({
        value: roomPathKey(room),
        label:
          room.active === false
            ? `${room.roomName} (inactive)`
            : room.roomName,
      })),
    [rooms],
  );

  const ratePlanOptions = useMemo(
    () =>
      ratePlans.map((rp) => {
        const inactive = rp.active === false || rp.ratePlanActive === false;
        return {
          value: String(rp.ratePlanId),
          label: inactive ? `${rp.ratePlanName} (inactive)` : rp.ratePlanName,
        };
      }),
    [ratePlans],
  );

  return {
    rooms,
    roomsLoading,
    roomsError,
    roomKey,
    setRoomKey,
    ratePlansLoading,
    ratePlansError,
    ratePlanId,
    setRatePlanId,
    roomOptions,
    ratePlanOptions,
  };
}

export function RoomRatePlanFields({
  idPrefix,
  roomsLoading,
  roomsError,
  roomOptions,
  roomKey,
  onRoomChange,
  ratePlansLoading,
  ratePlansError,
  ratePlanOptions,
  ratePlanId,
  onRatePlanChange,
}: {
  idPrefix: string;
  roomsLoading: boolean;
  roomsError: string | null;
  roomOptions: Array<{ value: string; label: string }>;
  roomKey: string;
  onRoomChange: (value: string) => void;
  ratePlansLoading: boolean;
  ratePlansError: string | null;
  ratePlanOptions: Array<{ value: string; label: string }>;
  ratePlanId: string;
  onRatePlanChange: (value: string) => void;
}) {
  return (
    <InclusionSectionCard
      title="Apply To"
      subtitle="Choose room and rate plan for this inclusion."
      icon={BedDouble}
      iconTheme="bg-sky-50 text-sky-700 ring-sky-100"
    >
      <div className="space-y-3">
        {roomsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
            Loading rooms…
          </div>
        ) : roomsError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {roomsError}
          </div>
        ) : (
          <Select
            id={`${idPrefix}-room`}
            label="Room"
            labelIcon={BedDouble}
            labelIconTheme="indigo"
            required
            value={roomKey}
            onChange={(e) => onRoomChange(e.target.value)}
            options={roomOptions}
            placeholder="Select room"
          />
        )}

        {roomKey ? (
          ratePlansLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
              Loading rate plans…
            </div>
          ) : ratePlansError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              {ratePlansError}
            </div>
          ) : (
            <Select
              id={`${idPrefix}-rate-plan`}
              label="Rate plan"
              required
              value={ratePlanId}
              onChange={(e) => onRatePlanChange(e.target.value)}
              options={ratePlanOptions}
              placeholder={
                ratePlanOptions.length
                  ? "Select rate plan"
                  : "No rate plans for this room"
              }
              disabled={ratePlanOptions.length === 0}
            />
          )
        ) : null}
      </div>
    </InclusionSectionCard>
  );
}

export function useOptionalValidityDates() {
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  return { validFrom, setValidFrom, validTo, setValidTo };
}

export const INCLUSION_PRICING_UNIT_OPTIONS = [
  { value: "PER_STAY", label: "Per stay" },
  { value: "PER_NIGHT", label: "Per night" },
  { value: "PER_ROOM", label: "Per room" },
  { value: "PER_PERSON", label: "Per person" },
  { value: "PER_UNIT", label: "Per unit" },
  { value: "PER_TRANSFER", label: "Per transfer" },
];

export const TRANSFER_CODES = new Set([
  "AIRPORT_TRANSFER",
  "BUS_STOP_TRANSFER",
  "RAILWAY_STATION_TRANSFER",
  "LOCAL_TRANSFER",
  "PORT_TRANSFER",
  "OFFICE_TRANSFER",
  "VEHICLE_RENTAL",
]);

export const MEAL_PERSONS_CODES = new Set([
  "MEAL_UPGRADE",
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "BRUNCH",
  "HI_TEA",
  "BARBECUE",
]);

export const TIME_OFFSET_CODES = new Set([
  "EARLY_CHECKIN",
  "LATE_CHECKOUT",
  "GUARANTEED_EARLY_CHECKIN_LATE_CHECKOUT",
]);

export const SIMPLE_FREE_CODES = new Set([
  "WELCOME_DRINK",
  "SPA",
  "MASSAGE",
  "SALON",
  "YOGA",
  "WELLNESS_FITNESS_SESSION",
  "WELLNESS_CONSULTATION",
  "STEAM_SAUNA",
  "THEME_PARK",
  "TOURS_SIGHTSEEING",
  "NATURE_WALK",
  "CRUISE",
  "WILDLIFE_SAFARI",
]);

export const ROOM_UPGRADE_CODES = new Set(["ROOM_UPGRADE"]);

export type { InclusionEditTarget } from "../../services/inclusionsTypes";

export function AppliedToLockedCard({
  roomName,
  ratePlanName,
}: {
  roomName: string;
  ratePlanName: string;
}) {
  return (
    <InclusionSectionCard
      title="Applied To"
      subtitle="Room and rate plan cannot be changed on update."
      icon={BedDouble}
      iconTheme="bg-sky-50 text-sky-700 ring-sky-100"
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-slate-500">Room</p>
          <p className="font-medium text-slate-800">{roomName || "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-slate-500">Rate plan</p>
          <p className="font-medium text-slate-800">{ratePlanName || "—"}</p>
        </div>
      </div>
    </InclusionSectionCard>
  );
}

export function catalogueItemFromRatePlanInclusion(
  item: import("../../services/inclusionsTypes").RatePlanInclusionItem,
): import("../../services/inclusionsTypes").InclusionCatalogueItem {
  return {
    code: item.code,
    name: item.name,
    description: null,
    configurationType: item.category || "NONE",
  };
}
