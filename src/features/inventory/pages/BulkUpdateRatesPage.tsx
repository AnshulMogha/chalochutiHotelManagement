import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  format,
  addDays,
  startOfToday,
  isBefore,
  isSameDay,
  parseISO,
} from "date-fns";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  AlertTriangle,
} from "lucide-react";
import { rateService } from "../services/rateService";
import {
  adminService,
  type HotelRoom,
  type RatePlan as AdminRatePlan,
} from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";

interface RoomRateData {
  roomUUID: string; // UUID from HotelRoom
  numericRoomId: number; // Numeric ID from rate calendar
  ratePlanId: number;
  baseRate?: number;
  singleOccupancyRate?: number;
  extraAdultCharge?: number;
  paidChildCharge?: number;
  minStay?: number | null;
  maxStay?: number | null;
  cutoffTime?: string | null;
}

export default function BulkUpdateRatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  // Get params from URL
  const hotelId = searchParams.get("hotelId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRatePlans, setLoadingRatePlans] = useState<
    Record<string, boolean>
  >({});

  // Date range state
  const today = startOfToday();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(addDays(today, 6));

  // Weekday selection state
  const ALL_WEEK_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  const DAY_LABELS: Record<string, { short: string; full: string }> = {
    MONDAY: { short: "M", full: "Mon" },
    TUESDAY: { short: "T", full: "Tue" },
    WEDNESDAY: { short: "W", full: "Wed" },
    THURSDAY: { short: "T", full: "Thu" },
    FRIDAY: { short: "F", full: "Fri" },
    SATURDAY: { short: "S", full: "Sat" },
    SUNDAY: { short: "S", full: "Sun" },
  };
  const [selectedWeekDays, setSelectedWeekDays] =
    useState<string[]>(ALL_WEEK_DAYS);

  // Customer type - UI value (B2C, B2B, MYBIZ)
  const [customerTypeUI, setCustomerTypeUI] = useState("B2C");

  // Map UI customer type to API customer type
  const getCustomerTypeFromUI = (uiValue: string): string => {
    const uiToApi: Record<string, string> = {
      B2C: "RETAIL",
      B2B: "AGENT",
      MYBIZ: "CORPORATE",
    };
    return uiToApi[uiValue] || "RETAIL";
  };

  // Get API customer type from UI value
  const customerType = useMemo(
    () => getCustomerTypeFromUI(customerTypeUI),
    [customerTypeUI],
  );

  // UI state
  const [showNettRate, setShowNettRate] = useState(false);
  const [updateExtraGuestCharges, setUpdateExtraGuestCharges] = useState(false);
  const [enableRateRestrictions, setEnableRateRestrictions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansByRoom, setRatePlansByRoom] = useState<
    Record<string, AdminRatePlan[]>
  >({});
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(
    new Set(),
  );
  const [expandedRestrictions, setExpandedRestrictions] = useState<Set<string>>(
    new Set(),
  );

  // Mapping: room UUID (from HotelRoom) -> numeric roomId (from rate calendar)
  const [roomIdMapping, setRoomIdMapping] = useState<Record<string, number>>(
    {},
  );

  // Form data: roomUUID-ratePlanId -> form values (using UUID as key, but storing numeric ID)
  const [formData, setFormData] = useState<Record<string, RoomRateData>>({});

  // Fetch rooms on mount
  useEffect(() => {
    if (!hotelId) {
      showToast("Missing hotel ID", "error");
      navigate(-1);
      return;
    }

    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const data = await adminService.getHotelAdminRooms(hotelId);
        setRooms(data.rooms || []);
      } catch (error: any) {
        console.error("Error fetching rooms:", error);
        showToast(error?.message || "Failed to load rooms", "error");
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // Fetch rate calendar to map room names to numeric room IDs
  useEffect(() => {
    if (!hotelId || rooms.length === 0) return;

    const fetchRoomMapping = async () => {
      try {
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(toDate, "yyyy-MM-dd");
        const rateData = await rateService.getCalendar(
          hotelId,
          fromDateStr,
          toDateStr,
          customerType,
        );

        // Build mapping: roomName -> numeric roomId
        // New API structure: rooms → ratePlans → days
        const mapping: Record<string, number> = {};
        rateData.rooms.forEach((room) => {
          // Map by room name (case-insensitive)
          const roomNameKey = room.roomName.toLowerCase().trim();
          if (!mapping[roomNameKey]) {
            mapping[roomNameKey] = room.roomId;
          }
        });

        // Now map UUID room IDs to numeric room IDs by matching room names
        const uuidToNumericMapping: Record<string, number> = {};
        rooms.forEach((hotelRoom) => {
          const roomNameKey = hotelRoom.roomName.toLowerCase().trim();
          if (mapping[roomNameKey]) {
            uuidToNumericMapping[hotelRoom.roomId] = mapping[roomNameKey];
          }
        });

        setRoomIdMapping(uuidToNumericMapping);
      } catch (error: any) {
        console.error("Error fetching room mapping:", error);
        // Don't show error toast, just log it
      }
    };

    fetchRoomMapping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, rooms, fromDate, toDate, customerType]);

  // Fetch rate plans when room is expanded
  const fetchRatePlansForRoom = async (roomId: string) => {
    if (!hotelId || ratePlansByRoom[roomId]) return; // Already fetched

    setLoadingRatePlans((prev) => ({ ...prev, [roomId]: true }));
    try {
      const data = await adminService.getRoomRatePlans(hotelId, roomId);
      setRatePlansByRoom((prev) => ({
        ...prev,
        [roomId]: data.ratePlans || [],
      }));
    } catch (error: any) {
      console.error("Error fetching rate plans:", error);
      showToast(error?.message || "Failed to load rate plans", "error");
    } finally {
      setLoadingRatePlans((prev) => ({ ...prev, [roomId]: false }));
    }
  };

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
      fetchRatePlansForRoom(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const toggleRatePlan = (roomId: string, ratePlanId: number) => {
    const key = `${roomId}-${ratePlanId}`;
    const newExpanded = new Set(expandedRatePlans);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRatePlans(newExpanded);
  };

  const toggleRestrictions = (roomId: string, ratePlanId: number) => {
    const key = `${roomId}-${ratePlanId}`;
    const newExpanded = new Set(expandedRestrictions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRestrictions(newExpanded);
  };

  const updateFormField = (
    roomUUID: string, // UUID from HotelRoom
    ratePlanId: number,
    field: keyof RoomRateData,
    value: number | string | null | undefined,
  ) => {
    const key = `${roomUUID}-${ratePlanId}`;
    const numericRoomId = roomIdMapping[roomUUID];

    if (!numericRoomId) {
      console.warn(`No numeric room ID found for UUID: ${roomUUID}. Room mapping may not be ready yet.`);
      // Still allow form updates - the mapping will be corrected when rate calendar data loads
      // We'll validate and correct the numericRoomId on submit
    }

    setFormData((prev) => {
      const existing = prev[key];
      // Build new data, ensuring roomUUID, numericRoomId and ratePlanId are always set correctly
      const newData: RoomRateData = {
        ...existing, // Spread existing data first
        roomUUID, // Always override with correct roomUUID
        numericRoomId: numericRoomId || 0, // Use numeric room ID if available, 0 as fallback (will be corrected on submit)
        ratePlanId, // Always override with correct ratePlanId
        [field]: value === "" ? undefined : value,
      };

      return {
        ...prev,
        [key]: newData,
      };
    });
  };

  const getFormValue = (
    roomUUID: string,
    ratePlanId: number,
    field: keyof RoomRateData,
  ) => {
    const key = `${roomUUID}-${ratePlanId}`;
    return formData[key]?.[field] ?? "";
  };

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter(
      (room) =>
        room.roomName.toLowerCase().includes(query) ||
        ratePlansByRoom[room.roomId]?.some((rp) =>
          rp.ratePlanName.toLowerCase().includes(query),
        ),
    );
  }, [rooms, searchQuery, ratePlansByRoom]);

  // Validate form - at least one field must be filled across all rooms/rate plans
  const hasFormData = useMemo(() => {
    return Object.values(formData).some(
      (data) =>
        data.baseRate !== undefined ||
        data.singleOccupancyRate !== undefined ||
        data.extraAdultCharge !== undefined ||
        data.paidChildCharge !== undefined ||
        data.minStay !== undefined ||
        data.maxStay !== undefined ||
        data.cutoffTime !== undefined,
    );
  }, [formData]);

  // Validate date range
  const isDateRangeValid = useMemo(() => {
    return fromDate <= toDate && !isBefore(fromDate, today);
  }, [fromDate, toDate, today]);

  const canSubmit = hasFormData && isDateRangeValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !hotelId) return;

    setIsSubmitting(true);
    try {
      const fromDateStr = format(fromDate, "yyyy-MM-dd");
      const toDateStr = format(toDate, "yyyy-MM-dd");

      // Build payloads for each room/rate plan combination
      const validFormEntries = Object.entries(formData).filter(([_, data]) => {
        // Only include entries that have valid numericRoomId (not 0), ratePlanId, and at least one field value
        if (!data.numericRoomId || data.numericRoomId === 0 || !data.ratePlanId) {
          console.warn(
            "Skipping entry without valid numericRoomId or ratePlanId:",
            data,
          );
          return false;
        }
        // Check if at least one field has a value
        const hasValue =
          data.baseRate !== undefined ||
          data.singleOccupancyRate !== undefined ||
          data.extraAdultCharge !== undefined ||
          data.paidChildCharge !== undefined ||
          data.minStay !== undefined ||
          data.maxStay !== undefined ||
          data.cutoffTime !== undefined;
        if (!hasValue) {
          console.warn("Skipping entry without any field values:", data);
          return false;
        }
        return true;
      });

      if (validFormEntries.length === 0) {
        showToast("Please fill at least one field before submitting", "error");
        setIsSubmitting(false);
        return;
      }

      const updatePromises = validFormEntries.map(([_, data]) => {
        if (!data.numericRoomId || !data.ratePlanId) {
          console.error("Invalid data in form entry:", data);
          throw new Error(`Invalid room ID or rate plan ID`);
        }

        const payload: any = {
          roomId: data.numericRoomId, // Use numeric room ID from rate calendar
          ratePlanId: data.ratePlanId,
          customerType,
          from: fromDateStr,
          to: toDateStr,
          weekDays: weekDaysToSend,
          currency: "INR",
        };

        if (data.baseRate !== undefined) payload.baseRate = data.baseRate;
        if (data.singleOccupancyRate !== undefined)
          payload.singleOccupancyRate = data.singleOccupancyRate;
        if (data.extraAdultCharge !== undefined)
          payload.extraAdultCharge = data.extraAdultCharge;
        if (data.paidChildCharge !== undefined)
          payload.paidChildCharge = data.paidChildCharge;
        if (data.minStay !== undefined) payload.minStay = data.minStay;
        if (data.maxStay !== undefined) payload.maxStay = data.maxStay;
        if (data.cutoffTime !== undefined) payload.cutoffTime = data.cutoffTime;

        console.log("Sending payload:", payload); // Debug log
        return rateService.bulkUpdateRates(payload);
      });

      await Promise.all(updatePromises);

      showToast("Rates updated successfully", "success");

      setTimeout(() => {
        navigate(`/inventory/rate-plans?hotelId=${hotelId}`);
      }, 1000);
    } catch (error: any) {
      console.error("Error updating rates:", error);
      showToast(error?.message || "Failed to update rates", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hotelId) {
      navigate(`/inventory/rate-plans?hotelId=${hotelId}`);
    } else {
      navigate(-1);
    }
  };

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

  // Toggle weekday selection
  const toggleWeekDay = (day: string) => {
    setSelectedWeekDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // Calculate weekDays to send to API (selected days)
  const weekDaysToSend = useMemo(() => {
    return selectedWeekDays;
  }, [selectedWeekDays]);

  // Reset weekday selections to all days
  const handleResetWeekDays = () => {
    setSelectedWeekDays(ALL_WEEK_DAYS);
  };

  // Calculate nett rate (assuming 20% commission for now)
  const calculateNettRate = (grossRate: number) => {
    return grossRate * 0.8;
  };

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen  pb-32">
      {/* Enhanced Sticky Header */}
      <div className="sticky top-0 z-40 ">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start gap-4 mb-8">
            <button
              onClick={handleCancel}
              className="p-2.5 rounded-full border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/70 transition-all duration-200 shadow-sm mt-0.5"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                  Bulk Update Rates
                </h1>
              </div>
              {/* <div className="h-1 w-full bg-blue-600/70 rounded-full mt-3"></div> */}
            </div>
          </div>

          {/* Step 1: Context & Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Filters & Selection
                </h2>
                <div className="h-0.5 w-full bg-blue-600/80 rounded-full mt-1"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contract Type */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-semibold text-slate-800">
                    Contract Type
                  </label>
                  <select
                    value={customerTypeUI}
                    onChange={(e) => setCustomerTypeUI(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-3 focus:ring-blue-500/25 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-blue-200 shadow-sm"
                  >
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                    <option value="MYBIZ">MYBIZ</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-semibold text-slate-800">
                    Date Range <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={format(fromDate, "yyyy-MM-dd")}
                        min={format(today, "yyyy-MM-dd")}
                        onChange={(e) =>
                          handleStartDateChange(parseISO(e.target.value))
                        }
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-3 focus:ring-blue-500/25 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-blue-200 shadow-sm"
                      />
                    </div>
                    <span className="text-slate-500 font-medium text-sm">
                      to
                    </span>
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={format(toDate, "yyyy-MM-dd")}
                        min={format(fromDate, "yyyy-MM-dd")}
                        onChange={(e) =>
                          handleEndDateChange(parseISO(e.target.value))
                        }
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-3 focus:ring-blue-500/25 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-blue-200 shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Default range is 7 days including today
                  </p>
                </div>

                {/* Weekday Selector */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-800">
                    Selected Days
                  </label>
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5">
                    <div className="grid grid-cols-7 gap-2.5">
                      {ALL_WEEK_DAYS.map((day) => {
                        const isSelected = selectedWeekDays.includes(day);
                        const label = DAY_LABELS[day];

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekDay(day)}
                            disabled={isSubmitting}
                            className={`
                              flex flex-col items-center justify-center py-2.5 px-2 rounded-full border
                              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                              ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 border-blue-600"
                                  : "bg-white text-blue-700 border-blue-100 hover:border-blue-200 hover:bg-blue-50"
                              }
                            `}
                          >
                            <span className="text-xs font-bold">
                              {label.short}
                            </span>
                            <span className="text-[10px] font-medium mt-0.5">
                              {label.full}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-xs text-slate-600 font-medium">
                        {selectedWeekDays.length === ALL_WEEK_DAYS.length
                          ? "All days selected (default)"
                          : selectedWeekDays.length === 0
                            ? "No days selected"
                            : `Selected: ${selectedWeekDays.map((d) => DAY_LABELS[d]?.full).join(", ")}`}
                      </p>
                      {selectedWeekDays.length !== ALL_WEEK_DAYS.length && (
                        <button
                          type="button"
                          onClick={handleResetWeekDays}
                          disabled={isSubmitting}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-400 px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-blue-50"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Toggles */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-800">
                    Options
                  </label>

                  {/* Show Net Rate Toggle */}
                  <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        Show Net Rate
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Display calculated net rates
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNettRate}
                        onChange={(e) => setShowNettRate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>

                  {/* Update Extra Guest Charges Toggle */}
                  <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        Update Extra Guest Charges
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Enable guest charge fields
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateExtraGuestCharges}
                        onChange={(e) =>
                          setUpdateExtraGuestCharges(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>

                  {/* Rate Restrictions Toggle */}
                  <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        Rate Restrictions
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Show and edit restrictions for this rate plan
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableRateRestrictions}
                        onChange={(e) => setEnableRateRestrictions(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Step 2: Rate Plan Search */}

        {/* Step 3: Room Cards */}
        <div className="space-y-5 bg-white shadow-sm border-2 border-gray-200 rounded-2xl ">

          <div className="mb-7 bg-[#2f3d95] p-5 rounded-md">
            <div className="flex items-center gap-4">
              <div className="text-white leading-tight">
                <p className="text-2xl font-semibold">Room List</p>
              
              </div>
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for a rate plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-3 focus:ring-blue-500/25 focus:border-blue-500 shadow-sm transition-all hover:border-blue-200 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="p-5 mb-7 space-y-4">

          

          {filteredRooms.map((room) => {
            const isExpanded = expandedRooms.has(room.roomId);
            const ratePlans = ratePlansByRoom[room.roomId] || [];
            const isLoadingRPs = loadingRatePlans[room.roomId];

            return (
              <div
                key={room.roomId}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-100"
              >
                {/* Room Header - Fully Clickable */}
                <button
                  type="button"
                  onClick={() => toggleRoom(room.roomId)}
                  className={`w-full flex items-center justify-between p-6 lg:p-3 text-left transition-all duration-200 ${
                    isExpanded
                      ? "bg-[#2f3d95] hover:bg-[#3445aa]"
                      : "bg-white hover:bg-slate-50/70 border-l-4 border-transparent hover:border-l-4 hover:border-blue-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Users
                        className={`w-4 h-4 ${isExpanded ? "text-white" : "text-blue-600"}`}
                      />
                      <h3
                        className={`text-lg font-semibold ${isExpanded ? "text-white" : "text-slate-900"}`}
                      >
                        {room.roomName}
                      </h3>
                    </div>
                    <p className={`text-sm mt-1.5 font-medium ${isExpanded ? "text-blue-100" : "text-slate-500"}`}>
                      Room ID: {room.roomId}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp
                      className={`w-5 h-5 flex-shrink-0 transition-transform ${isExpanded ? "text-white" : "text-slate-600"}`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 transition-transform ${isExpanded ? "text-white" : "text-slate-600"}`}
                    />
                  )}
                </button>

                {/* Rate Plans */}
                {isExpanded && (
                  <div className="border-t border-slate-200/60 bg-slate-50/30 p-6 space-y-5">
                    {isLoadingRPs ? (
                      <div className="text-center py-12 text-slate-500 font-medium">
                        Loading rate plans...
                      </div>
                    ) : ratePlans.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 font-medium">
                        No rate plans available
                      </div>
                    ) : (
                      ratePlans.map((ratePlan) => {
                        const ratePlanKey = `${room.roomId}-${ratePlan.ratePlanId}`;
                        const isRatePlanExpanded =
                          expandedRatePlans.has(ratePlanKey);

                        return (
                          <div
                            key={ratePlan.ratePlanId}
                            className="border border-slate-200/60 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                          >
                            {/* Rate Plan Header */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleRatePlan(room.roomId, ratePlan.ratePlanId)
                              }
                              className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50/50 transition-all duration-200 border-b border-slate-200/60"
                            >
                              <div className="flex justify-center items-center gap-3">
                                <h4 className="text-base font-bold text-slate-900">
                                  {ratePlan.ratePlanName}
                                </h4>
                                <p className="text-sm text-slate-500 font-medium">
                                  {ratePlan.mealPlan} (Commission @ 20%)
                                </p>
                              </div>
                              {isRatePlanExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-600 transition-transform" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-600 transition-transform" />
                              )}
                            </button>

                            {/* Rate Plan Form */}
                            {isRatePlanExpanded && (
                              <div className="p-6 bg-slate-50/30 space-y-6">
                                {/* Warning Banner */}
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                      If you have not set rates for any
                                      occupancy yet, we will pick the next
                                      higher-level occupancy rate here.
                                    </p>
                                  </div>
                                </div>

                                {/* Section: Rate */}
                                <div className="bg-white rounded-lg p-6 border border-slate-200/60 shadow-sm">
                                  <h5 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    Rate
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Occupancy 2 (Base) */}
                                    <div className="space-y-2.5">
                                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                                        Adult 2 Base Rate
                                      </label>
                                      <input
                                        type="number"
                                        value={getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "baseRate",
                                        )}
                                        onChange={(e) =>
                                          updateFormField(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "baseRate",
                                            e.target.value === ""
                                              ? undefined
                                              : Number(e.target.value),
                                          )
                                        }
                                        placeholder="₹ 0"
                                        min="0"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                      />
                                      <p className="text-xs text-slate-500 font-medium">
                                        Leave blank to keep existing value
                                      </p>
                                      {showNettRate &&
                                        getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "baseRate",
                                        ) && (
                                          <p className="text-xs text-blue-600 font-semibold">
                                            Nett Rate: ₹
                                            {calculateNettRate(
                                              Number(
                                                getFormValue(
                                                  room.roomId,
                                                  ratePlan.ratePlanId,
                                                  "baseRate",
                                                ),
                                              ) || 0,
                                            ).toFixed(2)}
                                          </p>
                                        )}
                                    </div>

                                    {/* Occupancy 1 */}
                                    <div className="space-y-2.5">
                                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                                        Single Adult Rate
                                      </label>
                                      <input
                                        type="number"
                                        value={getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "singleOccupancyRate",
                                        )}
                                        onChange={(e) =>
                                          updateFormField(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "singleOccupancyRate",
                                            e.target.value === ""
                                              ? undefined
                                              : Number(e.target.value),
                                          )
                                        }
                                        placeholder="₹ 0"
                                        min="0"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                      />
                                      <p className="text-xs text-slate-500 font-medium">
                                        Leave blank to keep existing value
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Section: Guest Charges */}
                                {updateExtraGuestCharges && (
                                  <div className="bg-white rounded-lg p-6 border border-slate-200/60 shadow-sm">
                                    <h5 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      Guest Charges
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Free Child Rate */}
                                      <div className="space-y-2.5">
                                        <label className="block text-sm font-semibold text-slate-800">
                                          Free Child Rate (0 - 5 years)
                                        </label>
                                        <input
                                          type="text"
                                          value="Free"
                                          readOnly
                                          disabled
                                          className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-slate-50 text-sm font-medium text-slate-500 cursor-not-allowed"
                                        />
                                        {showNettRate && (
                                          <p className="text-xs text-blue-600 font-semibold">
                                            Nett Rate: ₹0.00
                                          </p>
                                        )}
                                      </div>

                                      {/* Paid Child Rate */}
                                      <div className="space-y-2.5">
                                        <label className="block text-sm font-semibold text-slate-800">
                                          Paid Child Rate (6 - 13 years)
                                        </label>
                                        <input
                                          type="number"
                                          value={getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "paidChildCharge",
                                          )}
                                          onChange={(e) =>
                                            updateFormField(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "paidChildCharge",
                                              e.target.value === ""
                                                ? undefined
                                                : Number(e.target.value),
                                            )
                                          }
                                          placeholder="₹ 0"
                                          min="0"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                        />
                                        <p className="text-xs text-slate-500 font-medium">
                                          Leave blank to keep existing value
                                        </p>
                                        {showNettRate &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "paidChildCharge",
                                          ) && (
                                            <p className="text-xs text-blue-600 font-semibold">
                                              Nett Rate: ₹
                                              {calculateNettRate(
                                                Number(
                                                  getFormValue(
                                                    room.roomId,
                                                    ratePlan.ratePlanId,
                                                    "paidChildCharge",
                                                  ),
                                                ) || 0,
                                              ).toFixed(2)}
                                            </p>
                                          )}
                                      </div>

                                      {/* Extra Adult Charge */}
                                      <div className="space-y-2.5">
                                        <label className="block text-sm font-semibold text-slate-800">
                                          Extra Adult Charge (14+ years)
                                        </label>
                                        <input
                                          type="number"
                                          value={getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "extraAdultCharge",
                                          )}
                                          onChange={(e) =>
                                            updateFormField(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "extraAdultCharge",
                                              e.target.value === ""
                                                ? undefined
                                                : Number(e.target.value),
                                            )
                                          }
                                          placeholder="₹ 0"
                                          min="0"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                        />
                                        <p className="text-xs text-slate-500 font-medium">
                                          Leave blank to keep existing value
                                        </p>
                                        {showNettRate &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "extraAdultCharge",
                                          ) && (
                                            <p className="text-xs text-blue-600 font-semibold">
                                              Nett Rate: ₹
                                              {calculateNettRate(
                                                Number(
                                                  getFormValue(
                                                    room.roomId,
                                                    ratePlan.ratePlanId,
                                                    "extraAdultCharge",
                                                  ),
                                                ) || 0,
                                              ).toFixed(2)}
                                            </p>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Section: Restrictions */}
                                {enableRateRestrictions && (
                                  <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
                                    <div className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200/60">
                                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        Rate Restrictions
                                      </span>
                                    </div>

                                    <div className="p-6 space-y-5">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2.5">
                                          <label className="block text-sm font-semibold text-slate-800">
                                            Minimum Stay
                                          </label>
                                          <input
                                            type="number"
                                            value={getFormValue(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "minStay",
                                            )}
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "minStay",
                                                e.target.value === ""
                                                  ? undefined
                                                  : Number(e.target.value),
                                              )
                                            }
                                            placeholder="Enter minimum stay"
                                            min="0"
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                          />
                                          <p className="text-xs text-slate-500 font-medium">
                                            Leave blank to keep existing value
                                          </p>
                                        </div>

                                        <div className="space-y-2.5">
                                          <label className="block text-sm font-semibold text-slate-800">
                                            Maximum Stay
                                          </label>
                                          <input
                                            type="number"
                                            value={getFormValue(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "maxStay",
                                            )}
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "maxStay",
                                                e.target.value === ""
                                                  ? undefined
                                                  : Number(e.target.value),
                                              )
                                            }
                                            placeholder="Enter maximum stay"
                                            min="0"
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                          />
                                          <p className="text-xs text-slate-500 font-medium">
                                            Leave blank to keep existing value
                                          </p>
                                        </div>

                                        <div className="space-y-2.5">
                                          <label className="block text-sm font-semibold text-slate-800">
                                            Cutoff Time (HH:mm)
                                          </label>
                                          <input
                                            type="time"
                                            value={
                                              getFormValue(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "cutoffTime",
                                              ) || ""
                                            }
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "cutoffTime",
                                                e.target.value || undefined,
                                              )
                                            }
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                          />
                                          <p className="text-xs text-slate-500 font-medium">
                                            Leave blank to keep existing value
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-md flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Applying...
                          </>
                        ) : (
                          "Apply Updates"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          </div>

          {filteredRooms.length === 0 && (
            <div className="text-center py-16 text-slate-500 font-medium">
              {searchQuery
                ? "No rooms found matching your search"
                : "No rooms available"}
            </div>
          )}
        </div>
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
