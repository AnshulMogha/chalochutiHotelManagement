import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  format,
  addDays,
  startOfToday,
  isBefore,
  isSameDay,
  parseISO,
} from "date-fns";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { inventoryService } from "../services/inventoryService";
import type { InventoryBulkRoomsWeekDay } from "../services/inventoryService";
import type { HotelRoom } from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";

const ALL_WEEK_DAYS: InventoryBulkRoomsWeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<InventoryBulkRoomsWeekDay, { short: string; full: string }> = {
  MONDAY: { short: "M", full: "Mon" },
  TUESDAY: { short: "T", full: "Tue" },
  WEDNESDAY: { short: "W", full: "Wed" },
  THURSDAY: { short: "T", full: "Thu" },
  FRIDAY: { short: "F", full: "Fri" },
  SATURDAY: { short: "S", full: "Sat" },
  SUNDAY: { short: "S", full: "Sun" },
};

const ROOM_TYPE_DISPLAY_ORDER: Record<string, number> = {
  DORMITORY: 0,
  SHARED_ROOM: 1,
  STUDIO: 2,
  STANDARD: 3,
  DELUXE: 4,
  SUPER_DELUXE: 5,
  PREMIUM: 6,
  EXECUTIVE: 7,
  CLUB: 8,
  JUNIOR_SUITE: 9,
  SUITE: 10,
  FAMILY_SUITE: 11,
  PRESIDENTIAL_SUITE: 12,
  COTTAGE: 13,
  BUNGALOW: 14,
  VILLA: 15,
};

const normalizeForOrdering = (value?: string | null): string => {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const getRoomTypeOrder = (
  roomTypeCode?: string | null,
  roomName?: string,
): number => {
  const trimmedCode = roomTypeCode?.trim().toUpperCase();
  if (trimmedCode && ROOM_TYPE_DISPLAY_ORDER[trimmedCode] !== undefined) {
    return ROOM_TYPE_DISPLAY_ORDER[trimmedCode];
  }

  const normalizedCode = normalizeForOrdering(trimmedCode);
  const normalizedName = normalizeForOrdering(roomName);
  const roomTypeAliases: Record<string, keyof typeof ROOM_TYPE_DISPLAY_ORDER> = {
    SHAREDROOM: "SHARED_ROOM",
    STUDIOROOM: "STUDIO",
    STANDARDROOM: "STANDARD",
    DELUXEROOM: "DELUXE",
    SUPERDELUXEROOM: "SUPER_DELUXE",
    PREMIUMROOM: "PREMIUM",
    EXECUTIVEROOM: "EXECUTIVE",
    CLUBROOM: "CLUB",
    JUNIORSUITE: "JUNIOR_SUITE",
    FAMILYSUITE: "FAMILY_SUITE",
    PRESIDENTIALSUITE: "PRESIDENTIAL_SUITE",
  };

  if (normalizedCode && roomTypeAliases[normalizedCode]) {
    return ROOM_TYPE_DISPLAY_ORDER[roomTypeAliases[normalizedCode]];
  }

  const nameMatchers: Array<[RegExp, keyof typeof ROOM_TYPE_DISPLAY_ORDER]> = [
    [/\bDORMITORY\b/, "DORMITORY"],
    [/\bSHARED\s*ROOM\b/, "SHARED_ROOM"],
    [/\bSTUDIO\b/, "STUDIO"],
    [/\bSUPER\s*DELUXE\b/, "SUPER_DELUXE"],
    [/\bDELUXE\b/, "DELUXE"],
    [/\bSTANDARD\b/, "STANDARD"],
    [/\bPREMIUM\b/, "PREMIUM"],
    [/\bEXECUTIVE\b/, "EXECUTIVE"],
    [/\bCLUB\b/, "CLUB"],
    [/\bJUNIOR\s*SUITE\b/, "JUNIOR_SUITE"],
    [/\bFAMILY\s*SUITE\b/, "FAMILY_SUITE"],
    [/\bPRESIDENTIAL\s*SUITE\b/, "PRESIDENTIAL_SUITE"],
    [/\bSUITE\b/, "SUITE"],
    [/\bCOTTAGE\b/, "COTTAGE"],
    [/\bBUNGALOW\b/, "BUNGALOW"],
    [/\bVILLA\b/, "VILLA"],
  ];

  for (const [pattern, roomType] of nameMatchers) {
    if (pattern.test(normalizedName)) {
      return ROOM_TYPE_DISPLAY_ORDER[roomType];
    }
  }

  return Number.MAX_SAFE_INTEGER;
};

export default function BulkUpdateInventoryPage() {
  const { user } = useAuth();
  const isReadOnly = !canEditModule(user, "RATES_INVENTORY");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  const hotelId = searchParams.get("hotelId");

  const today = useMemo(() => startOfToday(), []);
  const defaultEnd = useMemo(() => addDays(today, 6), [today]);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(defaultEnd);

  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [uuidToNumeric, setUuidToNumeric] = useState<Record<string, number>>({});
  const [mappingLoading, setMappingLoading] = useState(false);

  const [selectedRoomUuids, setSelectedRoomUuids] = useState<string[]>([]);
  const [selectedWeekDays, setSelectedWeekDays] =
    useState<InventoryBulkRoomsWeekDay[]>([...ALL_WEEK_DAYS]);

  /** Per admin room UUID → total rooms string for bulk payload */
  const [roomTotalInputs, setRoomTotalInputs] = useState<Record<string, string>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  };

  useEffect(() => {
    if (!hotelId) return;

    const load = async () => {
      setLoadingRooms(true);
      try {
        const list = await inventoryService.getHotelRooms(hotelId);
        setRooms(list);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load room types";
        showToast(msg, "error");
        setRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId || rooms.length === 0) {
      setUuidToNumeric({});
      setSelectedRoomUuids([]);
      setRoomTotalInputs({});
      return;
    }
    const fromStr = format(today, "yyyy-MM-dd");
    const toStr = format(addDays(today, 6), "yyyy-MM-dd");

    let cancelled = false;
    setMappingLoading(true);

    const run = async () => {
      try {
        const calendarRooms = await inventoryService.getCalendar(
          hotelId,
          fromStr,
          toStr,
        );
        if (cancelled) return;

        const next: Record<string, number> = {};
        for (const hr of rooms) {
          const key = hr.roomName.toLowerCase().trim();
          const inv = calendarRooms.find(
            (r) => r.roomName.toLowerCase().trim() === key,
          );
          if (inv) {
            next[hr.roomId] = inv.roomId;
          }
        }
        setUuidToNumeric(next);
        const uuids = Object.keys(next);
        setSelectedRoomUuids(uuids);
        setRoomTotalInputs((prev) => {
          const merged = { ...prev };
          for (const uuid of uuids) {
            if (merged[uuid] === undefined) merged[uuid] = "";
          }
          return merged;
        });
      } catch {
        if (!cancelled) {
          setUuidToNumeric({});
          setSelectedRoomUuids([]);
          setRoomTotalInputs({});
          showToast("Could not load inventory calendar for this date range.", "error");
        }
      } finally {
        if (!cancelled) setMappingLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, rooms, today]);

  const handleStartDateChange = (date: Date) => {
    if (!isBefore(date, today) || isSameDay(date, today)) {
      setFromDate(date);
      if (isBefore(toDate, date)) {
        setToDate(date);
      }
    }
  };

  const handleEndDateChange = (date: Date) => {
    if (!isBefore(date, today) || isSameDay(date, today)) {
      if (!isBefore(date, fromDate) || isSameDay(date, fromDate)) {
        setToDate(date);
      }
    }
  };

  const toggleRoom = (roomUuid: string) => {
    setSelectedRoomUuids((prev) => {
      if (prev.includes(roomUuid)) {
        return prev.filter((id) => id !== roomUuid);
      }
      return [...prev, roomUuid];
    });
    setRoomTotalInputs((prev) =>
      prev[roomUuid] !== undefined ? prev : { ...prev, [roomUuid]: "" },
    );
  };

  const selectAllRooms = () => {
    const all = Object.keys(uuidToNumeric);
    setSelectedRoomUuids(all);
    setRoomTotalInputs((prev) => {
      const next = { ...prev };
      for (const uuid of all) {
        if (next[uuid] === undefined) next[uuid] = "";
      }
      return next;
    });
  };

  const deselectAllRooms = () => {
    setSelectedRoomUuids([]);
  };

  const toggleWeekDay = (day: InventoryBulkRoomsWeekDay) => {
    setSelectedWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const resetWeekDays = () => {
    setSelectedWeekDays([...ALL_WEEK_DAYS]);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!hotelId) return;

    if (selectedRoomUuids.length === 0) {
      showToast("Select at least one room type.", "error");
      return;
    }

    const roomsPayload: { roomId: number; totalRooms: number }[] = [];
    for (const uuid of selectedRoomUuids) {
      const roomId = uuidToNumeric[uuid];
      if (roomId == null || !Number.isFinite(roomId)) continue;

      const raw = roomTotalInputs[uuid];
      const total = raw === "" ? NaN : Number(raw);
      if (Number.isNaN(total) || total < 0 || !Number.isInteger(total)) {
        showToast(
          "Enter a valid whole number (0 or greater) for each selected room type.",
          "error",
        );
        return;
      }
      roomsPayload.push({ roomId, totalRooms: total });
    }

    if (roomsPayload.length === 0) {
      showToast(
        "Selected rooms could not be matched to inventory. Try another date range or refresh.",
        "error",
      );
      return;
    }

    if (selectedWeekDays.length === 0) {
      showToast("Select at least one weekday.", "error");
      return;
    }

    const aggregateTotalRooms = roomsPayload.reduce(
      (sum, r) => sum + r.totalRooms,
      0,
    );
    const from = format(fromDate, "yyyy-MM-dd");
    const to = format(toDate, "yyyy-MM-dd");

    setIsSubmitting(true);
    try {
      await inventoryService.bulkUpdateInventoryRooms({
        from,
        to,
        rooms: roomsPayload,
        totalRooms: aggregateTotalRooms,
        weekDays: selectedWeekDays,
      });
      showToast("Inventory updated successfully.", "success");
      navigate(-1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update inventory";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((firstRoom, secondRoom) => {
      const firstRoomTypeCode = (firstRoom as { room_type_code?: string | null })
        .room_type_code;
      const secondRoomTypeCode = (
        secondRoom as { room_type_code?: string | null }
      ).room_type_code;
      const orderDiff =
        getRoomTypeOrder(firstRoomTypeCode, firstRoom.roomName) -
        getRoomTypeOrder(secondRoomTypeCode, secondRoom.roomName);

      if (orderDiff !== 0) return orderDiff;
      return firstRoom.roomName.localeCompare(secondRoom.roomName);
    });
  }, [rooms]);

  const mappedRoomList = sortedRooms.filter((r) => uuidToNumeric[r.roomId] != null);

  if (!hotelId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-600">Missing hotel ID</span>
      </div>
    );
  }

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500">Loading room types...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-gray-50">
      <Toast {...toast} onClose={hideToast} />

      <div className="max-w-5xl mx-auto px-6 pt-6">
        {isReadOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have view-only access for Rate &amp; Inventory.
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2.5 rounded-full border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/70 transition-all shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-semibold text-slate-900">
                Bulk Update Inventory
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Enter total rooms for each selected room type, then choose the date range and weekdays to apply.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-8">
            <fieldset
              disabled={isSubmitting || isReadOnly || mappingLoading}
              className="space-y-8 disabled:opacity-70"
            >
              {/* Date range */}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Start and end date
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="relative flex-1 min-w-[140px] cursor-pointer"
                    onClick={() => openDatePicker(startDateInputRef.current)}
                  >
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={startDateInputRef}
                      type="date"
                      value={format(fromDate, "yyyy-MM-dd")}
                      min={format(today, "yyyy-MM-dd")}
                      onChange={(e) =>
                        handleStartDateChange(parseISO(e.target.value))
                      }
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                    />
                  </div>
                  <span className="text-slate-500 font-medium text-sm">to</span>
                  <div
                    className="relative flex-1 min-w-[140px] cursor-pointer"
                    onClick={() => openDatePicker(endDateInputRef.current)}
                  >
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={endDateInputRef}
                      type="date"
                      value={format(toDate, "yyyy-MM-dd")}
                      min={format(fromDate, "yyyy-MM-dd")}
                      onChange={(e) =>
                        handleEndDateChange(parseISO(e.target.value))
                      }
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                    />
                  </div>
                </div>
                {mappingLoading && (
                  <p className="text-xs text-slate-500">Updating room list for this range…</p>
                )}
              </div>

              {/* Weekdays */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800">
                  Weekdays
                </label>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5">
                  <div className="grid grid-cols-7 gap-2">
                    {ALL_WEEK_DAYS.map((day) => {
                      const isSelected = selectedWeekDays.includes(day);
                      const label = DAY_LABELS[day];
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekDay(day)}
                          className={`
                            flex flex-col items-center justify-center py-2 px-1 rounded-full border transition-all
                            ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-blue-700 border-blue-100 hover:border-blue-200 hover:bg-blue-50"
                            }
                          `}
                        >
                          <span className="text-xs font-bold">{label.short}</span>
                          <span className="text-[10px] font-medium mt-0.5">
                            {label.full}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600 font-medium">
                      {selectedWeekDays.length === ALL_WEEK_DAYS.length
                        ? "All days selected (default)"
                        : selectedWeekDays.length === 0
                          ? "No days selected"
                          : `${selectedWeekDays.length} day(s) selected`}
                    </p>
                    {selectedWeekDays.length !== ALL_WEEK_DAYS.length && (
                      <button
                        type="button"
                        onClick={resetWeekDays}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-50"
                      >
                        Reset all days
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Room types — multi select */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-slate-800">
                    Select room types
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllRooms}
                      disabled={mappedRoomList.length === 0}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 disabled:opacity-40"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllRooms}
                      disabled={selectedRoomUuids.length === 0}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {mappedRoomList.length === 0 && !mappingLoading ? (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    No room types match inventory for this hotel and date range. Adjust dates or ensure rooms exist in the inventory calendar.
                  </p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/30">
                    {sortedRooms.map((room) => {
                      const numericId = uuidToNumeric[room.roomId];
                      const disabledRow = numericId == null;
                      const checked = selectedRoomUuids.includes(room.roomId);

                      return (
                        <li key={room.roomId}>
                          <div
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 ${
                              disabledRow ? "opacity-50" : ""
                            }`}
                          >
                            <label
                              className={`flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-white/80 rounded-lg -mx-1 px-1 py-0.5 ${
                                disabledRow ? "cursor-not-allowed" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabledRow || mappingLoading}
                                onChange={() => {
                                  if (!disabledRow) toggleRoom(room.roomId);
                                }}
                                className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {room.roomName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {disabledRow
                                    ? "Not in calendar for this range"
                                    : `Inventory room ID: ${numericId}`}
                                </p>
                              </div>
                            </label>
                            <div className="flex items-center gap-2 sm:w-44 shrink-0 pl-7 sm:pl-0">
                              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                                Total rooms
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                disabled={
                                  disabledRow ||
                                  mappingLoading ||
                                  !checked ||
                                  isSubmitting ||
                                  isReadOnly
                                }
                                value={
                                  checked
                                    ? (roomTotalInputs[room.roomId] ?? "")
                                    : ""
                                }
                                onChange={(e) => {
                                  setRoomTotalInputs((prev) => ({
                                    ...prev,
                                    [room.roomId]: e.target.value,
                                  }));
                                }}
                                placeholder="0"
                                className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={
                  isSubmitting ||
                  isReadOnly ||
                  mappingLoading ||
                  mappedRoomList.length === 0
                }
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmitting ? "Updating…" : "Update inventory"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
