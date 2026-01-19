import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, startOfToday, isBefore, isSameDay, parseISO } from "date-fns";
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Search, Users, AlertTriangle } from "lucide-react";
import { rateService } from "../services/rateService";
import { adminService, type HotelRoom, type RatePlan as AdminRatePlan } from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";

interface RoomRateData {
  roomUUID: string; // UUID from HotelRoom
  numericRoomId: number; // Numeric ID from rate calendar
  ratePlanId: number;
  baseRate?: number;
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
  const [loadingRatePlans, setLoadingRatePlans] = useState<Record<string, boolean>>({});

  // Date range state
  const today = startOfToday();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(addDays(today, 6));

  // Customer type
  const [customerType, setCustomerType] = useState("RETAIL");

  // UI state
  const [showNettRate, setShowNettRate] = useState(false);
  const [updateExtraGuestCharges, setUpdateExtraGuestCharges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansByRoom, setRatePlansByRoom] = useState<Record<string, AdminRatePlan[]>>({});
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(new Set());
  const [expandedRestrictions, setExpandedRestrictions] = useState<Set<string>>(new Set());

  // Mapping: room UUID (from HotelRoom) -> numeric roomId (from rate calendar)
  const [roomIdMapping, setRoomIdMapping] = useState<Record<string, number>>({});

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
        const rateData = await rateService.getCalendar(hotelId, fromDateStr, toDateStr, customerType);
        
        // Build mapping: roomName -> numeric roomId
        const mapping: Record<string, number> = {};
        rateData.ratePlans.forEach((ratePlan) => {
          ratePlan.rooms.forEach((room) => {
            // Map by room name (case-insensitive)
            const roomNameKey = room.roomName.toLowerCase().trim();
            if (!mapping[roomNameKey]) {
              mapping[roomNameKey] = room.roomId;
            }
          });
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
    value: number | string | null | undefined
  ) => {
    const key = `${roomUUID}-${ratePlanId}`;
    const numericRoomId = roomIdMapping[roomUUID];
    
    if (!numericRoomId) {
      console.warn(`No numeric room ID found for UUID: ${roomUUID}`);
      return; // Don't update if we don't have the numeric room ID
    }

    setFormData((prev) => {
      const existing = prev[key];
      // Build new data, ensuring roomUUID, numericRoomId and ratePlanId are always set correctly
      const newData: RoomRateData = {
        ...existing, // Spread existing data first
        roomUUID, // Always override with correct roomUUID
        numericRoomId, // Always override with correct numeric room ID
        ratePlanId, // Always override with correct ratePlanId
        [field]: value === "" ? undefined : value,
      };
      
      return {
        ...prev,
        [key]: newData,
      };
    });
  };

  const getFormValue = (roomUUID: string, ratePlanId: number, field: keyof RoomRateData) => {
    const key = `${roomUUID}-${ratePlanId}`;
    return formData[key]?.[field] ?? "";
  };

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter((room) =>
      room.roomName.toLowerCase().includes(query) ||
      ratePlansByRoom[room.roomId]?.some((rp) =>
        rp.ratePlanName.toLowerCase().includes(query)
      )
    );
  }, [rooms, searchQuery, ratePlansByRoom]);

  // Validate form - at least one field must be filled across all rooms/rate plans
  const hasFormData = useMemo(() => {
    return Object.values(formData).some((data) =>
      data.baseRate !== undefined ||
      data.extraAdultCharge !== undefined ||
      data.paidChildCharge !== undefined ||
      data.minStay !== undefined ||
      data.maxStay !== undefined ||
      data.cutoffTime !== undefined
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
        // Only include entries that have numericRoomId, ratePlanId, and at least one field value
        if (!data.numericRoomId || !data.ratePlanId) {
          console.warn("Skipping entry without numericRoomId or ratePlanId:", data);
          return false;
        }
        // Check if at least one field has a value
        const hasValue = (
          data.baseRate !== undefined ||
          data.extraAdultCharge !== undefined ||
          data.paidChildCharge !== undefined ||
          data.minStay !== undefined ||
          data.maxStay !== undefined ||
          data.cutoffTime !== undefined
        );
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
          currency: "INR",
        };

        if (data.baseRate !== undefined) payload.baseRate = data.baseRate;
        if (data.extraAdultCharge !== undefined) payload.extraAdultCharge = data.extraAdultCharge;
        if (data.paidChildCharge !== undefined) payload.paidChildCharge = data.paidChildCharge;
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
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Enhanced Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Update Rates</h1>
              <p className="text-sm text-gray-600 mt-1">
                Update room rates and restrictions for multiple dates
              </p>
            </div>
          </div>

          {/* Step 1: Context & Filters Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contract Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Contract Type
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                  >
                    <option value="RETAIL">RETAIL</option>
                    <option value="B2C">B2C</option>
                    <option value="AGENT">AGENT</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Date Range <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={format(fromDate, "yyyy-MM-dd")}
                        min={format(today, "yyyy-MM-dd")}
                        onChange={(e) => handleStartDateChange(parseISO(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                      />
                    </div>
                    <span className="text-gray-500 font-medium">to</span>
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={format(toDate, "yyyy-MM-dd")}
                        min={format(fromDate, "yyyy-MM-dd")}
                        onChange={(e) => handleEndDateChange(parseISO(e.target.value))}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Default range is 7 days including today
                  </p>
                </div>
              </div>

              {/* Right Column - Toggles */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Options</label>
                  
                  {/* Show Nett Rate Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Show Nett Rate</span>
                      <p className="text-xs text-gray-500 mt-0.5">Display calculated net rates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNettRate}
                        onChange={(e) => setShowNettRate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Update Extra Guest Charges Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Update Extra Guest Charges</span>
                      <p className="text-xs text-gray-500 mt-0.5">Enable guest charge fields</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateExtraGuestCharges}
                        onChange={(e) => setUpdateExtraGuestCharges(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
        <div className="mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search for a rate plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Step 3: Room Cards */}
        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const isExpanded = expandedRooms.has(room.roomId);
            const ratePlans = ratePlansByRoom[room.roomId] || [];
            const isLoadingRPs = loadingRatePlans[room.roomId];

            return (
              <div 
                key={room.roomId} 
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Room Header - Fully Clickable */}
                <button
                  type="button"
                  onClick={() => toggleRoom(room.roomId)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-all duration-200 text-left"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{room.roomName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Room ID: {room.roomId}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0 transition-transform" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0 transition-transform" />
                  )}
                </button>

                {/* Rate Plans */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-6 space-y-4">
                    {isLoadingRPs ? (
                      <div className="text-center py-8 text-gray-500">Loading rate plans...</div>
                    ) : ratePlans.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No rate plans available</div>
                    ) : (
                      ratePlans.map((ratePlan) => {
                        const ratePlanKey = `${room.roomId}-${ratePlan.ratePlanId}`;
                        const isRatePlanExpanded = expandedRatePlans.has(ratePlanKey);

                        return (
                          <div key={ratePlan.ratePlanId} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {/* Rate Plan Header */}
                            <button
                              type="button"
                              onClick={() => toggleRatePlan(room.roomId, ratePlan.ratePlanId)}
                              className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-all duration-200"
                            >
                              <div>
                                <h4 className="text-base font-bold text-gray-900">
                                  {ratePlan.ratePlanName}
                                </h4>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {ratePlan.mealPlan} (Commission @ 20%)
                                </p>
                              </div>
                              {isRatePlanExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-600 transition-transform" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600 transition-transform" />
                              )}
                            </button>

                            {/* Rate Plan Form */}
                            {isRatePlanExpanded && (
                              <div className="p-6 bg-gray-50/50 space-y-6 border-t border-gray-100">
                                {/* Warning Banner */}
                                <div className="bg-amber-50/80 border-l-4 border-amber-400 p-4 rounded-xl">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800 leading-relaxed">
                                      If you have not set rates for any occupancy yet, we will pick the next higher-level occupancy rate here.
                                    </p>
                                  </div>
                                </div>

                                {/* Section: Base Rates */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                  <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    Base Rates
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Occupancy 2 (Base) */}
                                    <div className="space-y-2">
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        2 Base
                                      </label>
                                      <input
                                        type="number"
                                        value={getFormValue(room.roomId, ratePlan.ratePlanId, "baseRate")}
                                        onChange={(e) =>
                                          updateFormField(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "baseRate",
                                            e.target.value === "" ? undefined : Number(e.target.value)
                                          )
                                        }
                                        placeholder="₹ 0"
                                        min="0"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                      />
                                      <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                      {showNettRate && getFormValue(room.roomId, ratePlan.ratePlanId, "baseRate") && (
                                        <p className="text-xs text-blue-600 font-medium">
                                          Nett Rate: ₹{calculateNettRate(Number(getFormValue(room.roomId, ratePlan.ratePlanId, "baseRate")) || 0).toFixed(2)}
                                        </p>
                                      )}
                                    </div>

                                    {/* Occupancy 1 */}
                                    <div className="space-y-2">
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        1 Adult
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="₹ 0"
                                        min="0"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                      />
                                      <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Section: Guest Charges */}
                                {updateExtraGuestCharges && (
                                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      Guest Charges
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                      {/* Free Child Rate */}
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          Free Child Rate (0 - 5 years)
                                        </label>
                                        <input
                                          type="text"
                                          value="Free"
                                          readOnly
                                          disabled
                                          className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-gray-50 text-sm font-medium text-gray-500 cursor-not-allowed"
                                        />
                                        {showNettRate && (
                                          <p className="text-xs text-blue-600 font-medium">Nett Rate: ₹0.00</p>
                                        )}
                                      </div>

                                      {/* Paid Child Rate */}
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          Paid Child Rate (6 - 13 years)
                                        </label>
                                        <input
                                          type="number"
                                          value={getFormValue(room.roomId, ratePlan.ratePlanId, "paidChildCharge")}
                                          onChange={(e) =>
                                            updateFormField(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "paidChildCharge",
                                              e.target.value === "" ? undefined : Number(e.target.value)
                                            )
                                          }
                                          placeholder="₹ 0"
                                          min="0"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                        />
                                        <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                        {showNettRate && getFormValue(room.roomId, ratePlan.ratePlanId, "paidChildCharge") && (
                                          <p className="text-xs text-blue-600 font-medium">
                                            Nett Rate: ₹{calculateNettRate(Number(getFormValue(room.roomId, ratePlan.ratePlanId, "paidChildCharge")) || 0).toFixed(2)}
                                          </p>
                                        )}
                                      </div>

                                      {/* Extra Adult Charge */}
                                      <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          Extra Adult Charge (14+ years)
                                        </label>
                                        <input
                                          type="number"
                                          value={getFormValue(room.roomId, ratePlan.ratePlanId, "extraAdultCharge")}
                                          onChange={(e) =>
                                            updateFormField(
                                              room.roomId,
                                              ratePlan.ratePlanId,
                                              "extraAdultCharge",
                                              e.target.value === "" ? undefined : Number(e.target.value)
                                            )
                                          }
                                          placeholder="₹ 0"
                                          min="0"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                        />
                                        <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                        {showNettRate && getFormValue(room.roomId, ratePlan.ratePlanId, "extraAdultCharge") && (
                                          <p className="text-xs text-blue-600 font-medium">
                                            Nett Rate: ₹{calculateNettRate(Number(getFormValue(room.roomId, ratePlan.ratePlanId, "extraAdultCharge")) || 0).toFixed(2)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Section: Restrictions */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => toggleRestrictions(room.roomId, ratePlan.ratePlanId)}
                                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-all duration-200"
                                  >
                                    <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      Rate Restrictions
                                    </span>
                                    {expandedRestrictions.has(`${room.roomId}-${ratePlan.ratePlanId}`) ? (
                                      <ChevronUp className="w-5 h-5 text-gray-600 transition-transform" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-gray-600 transition-transform" />
                                    )}
                                  </button>

                                  {/* Restrictions Section - Hidden by default */}
                                  {expandedRestrictions.has(`${room.roomId}-${ratePlan.ratePlanId}`) && (
                                    <div className="p-5 space-y-5">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-700">Minimum Stay</label>
                                          <input
                                            type="number"
                                            value={getFormValue(room.roomId, ratePlan.ratePlanId, "minStay")}
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "minStay",
                                                e.target.value === "" ? undefined : Number(e.target.value)
                                              )
                                            }
                                            placeholder="Enter minimum stay"
                                            min="0"
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                          />
                                          <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-700">Maximum Stay</label>
                                          <input
                                            type="number"
                                            value={getFormValue(room.roomId, ratePlan.ratePlanId, "maxStay")}
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "maxStay",
                                                e.target.value === "" ? undefined : Number(e.target.value)
                                              )
                                            }
                                            placeholder="Enter maximum stay"
                                            min="0"
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                          />
                                          <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="block text-sm font-semibold text-gray-700">Cutoff Time (HH:mm)</label>
                                          <input
                                            type="time"
                                            value={getFormValue(room.roomId, ratePlan.ratePlanId, "cutoffTime") || ""}
                                            onChange={(e) =>
                                              updateFormField(
                                                room.roomId,
                                                ratePlan.ratePlanId,
                                                "cutoffTime",
                                                e.target.value || undefined
                                              )
                                            }
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
                                          />
                                          <p className="text-xs text-gray-500">Leave blank to keep existing value</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredRooms.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "No rooms found matching your search" : "No rooms available"}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Changes will apply to selected dates</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center gap-2"
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
