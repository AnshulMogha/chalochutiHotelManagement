import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router";
import { startOfToday, addDays, format } from "date-fns";
import { DateSelector } from "./inventoryComponents/DateSelector";
import { NavigationTabs } from "./inventoryComponents/NavigationTabs";
import { RoomTypesGrid } from "./inventoryComponents/RoomTypesGrid";
import { SaveCancelButtons } from "./inventoryComponents/SaveCancelButtons";
import { BulkUpdateModal } from "./inventoryComponents/BulkUpdateModal";
import { TAB_OPTIONS } from "@/data/dummyData";
import { type InventoryRoom, type RatePlan } from "./type";
import { inventoryService } from "./services/inventoryService";
import { rateService } from "./services/rateService";
import { Toast, useToast } from "@/components/ui/Toast";
import { RatePlansGrid } from "./inventoryComponents/RatePlansGrid";
// import { updateAvailability } from "@/services/api";

// Track the single active edit
interface ActiveEdit {
  roomId: number;
  date: string;
  value: number;
}

// Track the single active rate plan edit
interface ActiveRateEdit {
  ratePlanId: number;
  roomId: number;
  date: string;
  baseRate: number;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  
  const { toast, showToast, hideToast } = useToast();

  // Determine active section based on route - recalculates when pathname changes
  const activeSidebarSection: "room-types" | "rate-plans" = useMemo(() => {
    const path = location.pathname;
    // Explicitly check for room-types route
    if (path.includes("/inventory/room-types") || path.includes("/room-types") || path.includes("/room-type")) {
      return "room-types";
    }
    // Default to rate-plans for any other route (including /inventory/rate-plans)
    return "rate-plans";
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(TAB_OPTIONS[0].id);
  const today = startOfToday();
  
  // Default: today to today + 6 days (7 days total)
  const [baseDate, setBaseDate] = useState(today);
  const [activeDate, setActiveDate] = useState(today);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

  const [rooms, setRooms] = useState<InventoryRoom[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [ratePlansFromDate, setRatePlansFromDate] = useState<string>("");
  const [ratePlansToDate, setRatePlansToDate] = useState<string>("");
  const [customerType, setCustomerType] = useState<string>("RETAIL");

  // Map navigation tab ID to customerType
  const getCustomerTypeFromTab = (tabId: string): string => {
    const tabToCustomerType: Record<string, string> = {
      'b2c': 'RETAIL',
      'mybiz': 'MYBIZ',
      'b2b': 'B2B',
    };
    return tabToCustomerType[tabId] || 'RETAIL';
  };

  // Get current customerType from active tab
  const currentCustomerType = useMemo(() => getCustomerTypeFromTab(activeTab), [activeTab]);
  const [isLoading, setIsLoading] = useState(false);

  // Track only the current active edit
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);
  
  // Track only the current active rate plan edit
  const [activeRateEdit, setActiveRateEdit] = useState<ActiveRateEdit | null>(null);

  // Track updating state per cell: key = `${roomId}-${dateStr}`
  const [updatingCells, setUpdatingCells] = useState<Set<string>>(new Set());
  
  // Store previous values for reverting on error: key = `${roomId}-${dateStr}`
  const previousValuesRef = useRef<Map<string, number>>(new Map());
  
  // Store original rooms state for cancel functionality
  const originalRoomsRef = useRef<InventoryRoom[]>([]);
  
  // Store original rate plans state for cancel functionality
  const originalRatePlansRef = useRef<RatePlan[]>([]);
  
  // Flag to prevent API calls when canceling
  const isCancelingRef = useRef(false);

  const hasChanges = activeEdit !== null || activeRateEdit !== null;

  // Calculate date range: fromDate = baseDate, toDate = baseDate + 6 days
  const fromDate = useMemo(() => format(baseDate, "yyyy-MM-dd"), [baseDate]);
  const toDate = useMemo(() => format(addDays(baseDate, 6), "yyyy-MM-dd"), [baseDate]);

  // Reset date range to today → today + 6 when hotel changes
  useEffect(() => {
    if (hotelId) {
      setBaseDate(today);
      setActiveDate(today);
    }
  }, [hotelId]);

  
  // Fetch inventory data for room-types section
  useEffect(() => {
    if (!hotelId || activeSidebarSection !== "room-types") return;

    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryService.getCalendar(hotelId, fromDate, toDate);
        setRooms(data);
        // Store original state for cancel functionality
        originalRoomsRef.current = JSON.parse(JSON.stringify(data));
        // Clear any active edits when data is refetched
        setActiveEdit(null);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        setRooms([]);
        originalRoomsRef.current = [];
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [hotelId, fromDate, toDate, activeSidebarSection]);

  
  // Fetch rate plans data for rate-plans section
  useEffect(() => {
    if (!hotelId || activeSidebarSection !== "rate-plans") return;

    const fetchRatePlans = async () => {
      setIsLoading(true);
      try {
        // Use customerType from active tab
        const customerTypeToFetch = currentCustomerType;
        const data = await rateService.getCalendar(hotelId, fromDate, toDate, customerTypeToFetch);
        console.log("rate plans data", data);
        setRatePlans(data.ratePlans);
        setRatePlansFromDate(data.from);
        setRatePlansToDate(data.to);
        setCustomerType(data.customerType);
        // Store original state for cancel functionality
        originalRatePlansRef.current = JSON.parse(JSON.stringify(data.ratePlans));
        // Clear any active edits when data is refetched
        setActiveRateEdit(null);
      } catch (error) {
        console.error("Error fetching rate plans:", error);
        setRatePlans([]);
        setRatePlansFromDate("");
        setRatePlansToDate("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatePlans();
  }, [hotelId, fromDate, toDate, activeSidebarSection, currentCustomerType]);

  const handleAvailabilityUpdate = (
    roomId: number,
    dateStr: string,
    value: number,
  ) => {
    // Update local state optimistically
    setRooms((prev) =>
      prev.map((room) =>
        room.roomId !== roomId
          ? room
          : {
              ...room,
              days: room.days.map((day) =>
                day.date === dateStr
                  ? {
                      ...day,
                      total: value,
                      // Calculate available dynamically
                      available: Math.max(
                        0,
                        value - (day.sold || 0) - (day.blocked || 0),
                      ),
                    }
                  : day,
              ),
            },
      ),
    );
    setActiveEdit({ roomId, date: dateStr, value });
  };

  // Handle single cell update via API - ONLY called from Save Changes button
  // NOT called on blur or Enter key - those only update local state
  const handleSingleCellUpdate = async (
    roomId: number,
    dateStr: string,
    totalRooms: number,
  ) => {
    if (!hotelId) return;
    
    // Don't make API call if we're canceling
    if (isCancelingRef.current) return;

    const cellKey = `${roomId}-${dateStr}`;
    
    // Prevent duplicate submissions
    if (updatingCells.has(cellKey)) return;

    // Store previous value for reverting on error
    const room = rooms.find((r) => r.roomId === roomId);
    const dayData = room?.days.find((d) => d.date === dateStr);
    const previousValue = dayData?.total ?? 0;
    previousValuesRef.current.set(cellKey, previousValue);

    // Mark cell as updating
    setUpdatingCells((prev) => new Set(prev).add(cellKey));

    try {
      // Determine status: OPEN if totalRooms > 0, CLOSED if totalRooms === 0
      const status: "OPEN" | "CLOSED" = totalRooms > 0 ? "OPEN" : "CLOSED";

      await inventoryService.updateInventory({
        roomId,
        date: dateStr,
        totalRooms,
        status,
      });

      // Update local state with new status
      setRooms((prev) =>
        prev.map((room) =>
          room.roomId !== roomId
            ? room
            : {
                ...room,
                days: room.days.map((day) =>
                  day.date === dateStr
                    ? {
                        ...day,
                        total: totalRooms,
                        status,
                        // Calculate available dynamically
                        available: Math.max(
                          0,
                          totalRooms - (day.sold || 0) - (day.blocked || 0),
                        ),
                      }
                    : day,
                ),
              },
        ),
      );

      // Clear active edit if this was the edited cell
      if (activeEdit?.roomId === roomId && activeEdit?.date === dateStr) {
        setActiveEdit(null);
      }

      // Show success toast
      showToast("Inventory updated successfully", "success");
    } catch (error: any) {
      // Revert to previous value
      setRooms((prev) =>
        prev.map((room) =>
          room.roomId !== roomId
            ? room
            : {
                ...room,
                days: room.days.map((day) =>
                  day.date === dateStr
                    ? {
                        ...day,
                        total: previousValue,
                        // Recalculate available
                        available: Math.max(
                          0,
                          previousValue - (day.sold || 0) - (day.blocked || 0),
                        ),
                      }
                    : day,
                ),
              },
        ),
      );

      // Show error toast
      // API client interceptor returns ApiFailureResponse with message property
      const errorMessage =
        error?.message || "Failed to update inventory";
      showToast(errorMessage, "error");
    } finally {
      // Remove updating state
      setUpdatingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
      previousValuesRef.current.delete(cellKey);
    }
  };
  const handleSave = async () => {
    if (!hotelId) return;
    
    // Handle room inventory save
    if (activeEdit) {
      await handleSingleCellUpdate(
        activeEdit.roomId,
        activeEdit.date,
        activeEdit.value,
      );
    }
    
    // Handle rate plan save
    if (activeRateEdit) {
      await handleSingleRateUpdate(
        activeRateEdit.ratePlanId,
        activeRateEdit.roomId,
        activeRateEdit.date,
        activeRateEdit.baseRate,
      );
    }
  };


  const handleCancel = () => {
    // Set canceling flag to prevent any pending API calls
    isCancelingRef.current = true;
    
    // Revert room inventory to original state
    if (originalRoomsRef.current.length > 0) {
      const originalData = JSON.parse(JSON.stringify(originalRoomsRef.current));
      setRooms(originalData);
    }
    setActiveEdit(null);
    
    // Revert rate plans to original state
    if (originalRatePlansRef.current.length > 0) {
      const originalData = JSON.parse(JSON.stringify(originalRatePlansRef.current));
      setRatePlans(originalData);
    }
    setActiveRateEdit(null);
    
    // Clear any updating cells state
    setUpdatingCells(new Set());
    // Clear previous values ref
    previousValuesRef.current.clear();
    
    // Reset canceling flag after a short delay to allow any pending operations to complete
    setTimeout(() => {
      isCancelingRef.current = false;
    }, 100);
  };


  const handleBulkUpdate = async (
    startDate: Date,
    endDate: Date,
    value: number | null,
  ) => {
    if (!hotelId || value === null) return;

    const fromDateStr = format(startDate, "yyyy-MM-dd");
    const toDateStr = format(endDate, "yyyy-MM-dd");
    
    // Determine status: OPEN if totalRooms > 0, CLOSED if totalRooms === 0
    const status: "OPEN" | "CLOSED" = value > 0 ? "OPEN" : "CLOSED";

    setIsLoading(true);
    try {
      // Call bulk update API for each room
      const updatePromises = rooms.map((room) =>
        inventoryService.bulkUpdateInventory({
          roomId: room.roomId,
          from: fromDateStr,
          to: toDateStr,
          totalRooms: value,
          status,
        })
      );

      await Promise.all(updatePromises);

      // Refetch data to get updated inventory
      const data = await inventoryService.getCalendar(hotelId, fromDate, toDate);
      setRooms(data);
      setActiveEdit(null);

      // Show success toast
      showToast("Inventory bulk updated successfully", "success");
    } catch (error: any) {
      // Show error toast
      const errorMessage =
        error?.message || "Failed to update inventory";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle rate plan base rate update (local state only - NOT API call)
  const handleRatePlanUpdate = (
    ratePlanId: number,
    roomId: number,
    date: string,
    baseRate: number,
  ) => {
    // Update local state optimistically
    setRatePlans((prev) =>
      prev.map((ratePlan) =>
        ratePlan.ratePlanId !== ratePlanId
          ? ratePlan
          : {
              ...ratePlan,
              rooms: ratePlan.rooms.map((room) =>
                room.roomId !== roomId
                  ? room
                  : {
                      ...room,
                      days: room.days.map((day) =>
                        day.date === date
                          ? { ...day, baseRate }
                          : day,
                      ),
                    },
              ),
            },
      ),
    );
    // Track active edit
    setActiveRateEdit({ ratePlanId, roomId, date, baseRate });
  };

  // Handle single day rate update via API - ONLY called from Save button
  const handleSingleRateUpdate = async (
    ratePlanId: number,
    roomId: number,
    date: string,
    baseRate: number,
  ) => {
    if (!hotelId) return;
    
    // Don't make API call if we're canceling
    if (isCancelingRef.current) return;

    // Find the day data to get existing values
    const ratePlan = ratePlans.find((rp) => rp.ratePlanId === ratePlanId);
    const room = ratePlan?.rooms.find((r) => r.roomId === roomId);
    const dayData = room?.days.find((d) => d.date === date);

    // Store previous value for reverting on error
    const previousBaseRate = dayData?.baseRate ?? 0;

    // Build payload using existing values from day data or defaults
    // Use customerType from active navigation tab
    const payload = {
      roomId,
      ratePlanId,
      customerType: currentCustomerType, // Use customerType from active tab
      date,
      baseRate: baseRate || 0, // Send 0 if empty
      extraAdultCharge: dayData?.extraAdultCharge ?? 0,
      paidChildCharge: dayData?.paidChildCharge ?? 0,
      minStay: dayData?.minStay ?? null,
      maxStay: dayData?.maxStay ?? null,
      cutoffTime: dayData?.cutoffTime ?? null,
      currency: dayData?.currency ?? "INR",
    };

    try {
      await rateService.updateSingleRate(payload);
      // On success, clear active edit
      if (activeRateEdit?.ratePlanId === ratePlanId && 
          activeRateEdit?.roomId === roomId && 
          activeRateEdit?.date === date) {
        setActiveRateEdit(null);
      }
      showToast("Rate updated successfully", "success");
    } catch (error: any) {
      // Revert to previous value on error
      handleRatePlanUpdate(ratePlanId, roomId, date, previousBaseRate);
      const errorMessage = error?.message || "Failed to update rate";
      showToast(errorMessage, "error");
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 pb-24 overflow-x-auto">
      <div className="max-w-450 mx-auto">
        <div className="flex pt-3 px-6">
          <div className="flex-1">
            {location.pathname.includes("/rate-plan") && (
              <NavigationTabs
                tabs={TAB_OPTIONS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}

            <div className="pt-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <DateSelector
                    baseDate={baseDate}
                    onBaseDateChange={setBaseDate}
                    onActiveDateChange={setActiveDate}
                  />
                </div>

                {/* Show Bulk Update button only for room-types section */}
                {activeSidebarSection === "room-types" && (
                  <button
                    onClick={() => setIsBulkUpdateModalOpen(true)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Bulk Update
                  </button>
                )}

                {/* Show Bulk Update Rate button only for rate-plans section */}
                {activeSidebarSection === "rate-plans" && hotelId && (
                  <button
                    onClick={() => {
                      navigate(`/rates/bulk-update?hotelId=${hotelId}`);
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Bulk Update Rate
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-gray-500">
                  {activeSidebarSection === "room-types" 
                    ? "Loading inventory..." 
                    : "Loading rate plans..."}
                </span>
              </div>
            ) : activeSidebarSection === "room-types" ? (
              <RoomTypesGrid
                rooms={rooms}
                baseDate={baseDate}
                activeDate={activeDate}
                onUpdate={handleAvailabilityUpdate}
                onActiveDateChange={setActiveDate}
                isLocked={hasChanges}
                activeEdit={activeEdit}
                updatingCells={updatingCells}
              />
            ) : (
              ratePlansFromDate && ratePlansToDate ? (
                <RatePlansGrid
                  ratePlans={ratePlans}
                  fromDate={ratePlansFromDate}
                  toDate={ratePlansToDate}
                  activeDate={activeDate}
                  customerType={customerType}
                  onUpdate={handleRatePlanUpdate}
                  onActiveDateChange={setActiveDate}
                  isLocked={hasChanges}
                  activeEdit={activeRateEdit}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <span className="text-gray-500">No rate plans data available</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <SaveCancelButtons
        hasChanges={hasChanges}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Only show Bulk Update Modal for room-types section */}
      {activeSidebarSection === "room-types" && (
        <BulkUpdateModal
          key={isBulkUpdateModalOpen ? "open" : "closed"}
          isOpen={isBulkUpdateModalOpen}
          onClose={() => setIsBulkUpdateModalOpen(false)}
          onApply={handleBulkUpdate}
          section={activeSidebarSection}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
