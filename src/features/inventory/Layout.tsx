import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { startOfToday, addDays, format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { DateSelector } from "./inventoryComponents/DateSelector";
import { NavigationTabs } from "./inventoryComponents/NavigationTabs";
import { RoomTypesGrid } from "./inventoryComponents/RoomTypesGrid";
import { SaveCancelButtons } from "./inventoryComponents/SaveCancelButtons";
import { BulkUpdateModal } from "./inventoryComponents/BulkUpdateModal";
import { TAB_OPTIONS } from "@/data/dummyData";
import type { InventoryRoom, RatesRoom } from "./type";
import { inventoryService } from "./services/inventoryService";
import {
  rateService,
  toLinkRatePlanLinkPayload,
  type RatePlanLinkRecord,
} from "./services/rateService";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  RatePlansGrid,
  type OpenLinkRatePlansContext,
} from "./inventoryComponents/RatePlansGrid";
import { LinkRatePlansSheet } from "./inventoryComponents/LinkRatePlansSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  adminService,
  type ChildAgePolicyResponse,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import {
  filterLinkableRatePlans,
  ratePlansToSelectOptions,
} from "./utils/filterLinkableRatePlans";
import { formatApiClientError } from "@/services/api/formatApiClientError";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";

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
  singleOccupancyRate?: number | null;
  extraAdultCharge?: number;
  paidChildCharge?: number;
  minStay?: number | null;
  maxStay?: number | null;
  cutoffTime?: string | null;
}

export default function Layout() {
  const { user } = useAuth();
  const isReadOnly = !canEditModule(user, "RATES_INVENTORY");
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
  const [isBulkUpdateDropdownOpen, setIsBulkUpdateDropdownOpen] = useState(false);
  const [isLinkRatePlansOpen, setIsLinkRatePlansOpen] = useState(false);
  const [linkSheetApiError, setLinkSheetApiError] = useState<string | null>(
    null,
  );
  const [linkRatePlansTargetLabel, setLinkRatePlansTargetLabel] =
    useState("EP");
  const [linkRatePlansContext, setLinkRatePlansContext] =
    useState<OpenLinkRatePlansContext | null>(null);
  const [linkAllRatePlans, setLinkAllRatePlans] = useState<RatePlan[]>([]);
  const [linkFilteredRatePlans, setLinkFilteredRatePlans] = useState<
    RatePlan[]
  >([]);
  const [linkRpLoading, setLinkRpLoading] = useState(false);
  const [linkRpError, setLinkRpError] = useState(false);
  const [linkExistingRecord, setLinkExistingRecord] =
    useState<RatePlanLinkRecord | null>(null);
  const [linkRecordLoading, setLinkRecordLoading] = useState(false);

  const [rooms, setRooms] = useState<InventoryRoom[]>([]);
  const [rateRooms, setRateRooms] = useState<RatesRoom[]>([]);
  const [ratesCalendarIsLinkEnable, setRatesCalendarIsLinkEnable] = useState<
    boolean | undefined
  >(undefined);
  const [ratePlansFromDate, setRatePlansFromDate] = useState<string>("");
  const [ratePlansToDate, setRatePlansToDate] = useState<string>("");
  const [customerType, setCustomerType] = useState<string>("RETAIL");
  // Expandable rate plans inside Room Types view (per-room)
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<number>>(new Set());
  const [loadingRatePlansByRoomId, setLoadingRatePlansByRoomId] = useState<
    Record<number, boolean>
  >({});
  const [rateRoomsByRoomId, setRateRoomsByRoomId] = useState<
    Record<number, RatesRoom>
  >({});
  const [roomTypes, setRoomTypes] = useState<HotelRoom[]>([]);
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(false);
  const [roomTypesError, setRoomTypesError] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");

  // Map navigation tab ID to customerType
  const getCustomerTypeFromTab = (tabId: string): string => {
    const tabToCustomerType: Record<string, string> = {
      'b2c': 'RETAIL',
      'mybiz': 'CORPORATE',
      'b2b': 'AGENT',
    };
    return tabToCustomerType[tabId] || 'RETAIL';
  };

  // Get current customerType from active tab
  const currentCustomerType = useMemo(() => getCustomerTypeFromTab(activeTab), [activeTab]);
  const activeSegmentLabel = useMemo(
    () => TAB_OPTIONS.find((t) => t.id === activeTab)?.label,
    [activeTab],
  );
  const [isLoading, setIsLoading] = useState(false);

  const linkSheetBaseOptions = useMemo(() => {
    const base = ratePlansToSelectOptions(linkFilteredRatePlans);
    const slaveId = linkExistingRecord?.slaveRatePlanId;
    if (
      slaveId != null &&
      !base.some((o) => o.value === String(slaveId))
    ) {
      const rp = linkAllRatePlans.find((r) => r.ratePlanId === slaveId);
      const label = rp?.ratePlanName ?? `Plan #${slaveId}`;
      return [...base, { value: String(slaveId), label }];
    }
    return base;
  }, [linkFilteredRatePlans, linkAllRatePlans, linkExistingRecord]);

  const openLinkRatePlansFromGrid = (ctx: OpenLinkRatePlansContext) => {
    setLinkSheetApiError(null);
    setLinkRatePlansContext(ctx);
    setLinkAllRatePlans([]);
    setLinkFilteredRatePlans([]);
    setLinkRpLoading(true);
    setLinkRpError(false);
    setLinkRatePlansTargetLabel(
      `${ctx.currentRatePlanName} (${ctx.roomName})`,
    );
    setIsLinkRatePlansOpen(true);
  };

  const handleLinkSheetOpenChange = (open: boolean) => {
    setIsLinkRatePlansOpen(open);
    if (!open) {
      setLinkSheetApiError(null);
      setLinkRatePlansContext(null);
      setLinkAllRatePlans([]);
      setLinkFilteredRatePlans([]);
      setLinkRpLoading(false);
      setLinkRpError(false);
      setLinkExistingRecord(null);
      setLinkRecordLoading(false);
    }
  };

  useEffect(() => {
    if (!isLinkRatePlansOpen || !hotelId || !linkRatePlansContext) return;

    let cancelled = false;
    setLinkRpLoading(true);
    setLinkRecordLoading(true);
    setLinkRpError(false);
    setLinkExistingRecord(null);

    const run = async () => {
      try {
        const hotelRooms = await inventoryService.getHotelRooms(hotelId);
        const key = linkRatePlansContext.roomName.toLowerCase().trim();
        const match = hotelRooms.find(
          (r) => r.roomName.toLowerCase().trim() === key,
        );
        if (!match) {
          throw new Error("Could not resolve room for linking.");
        }
        const masterId = linkRatePlansContext.currentRatePlanId;
        const [data, links] = await Promise.all([
          adminService.getRoomRatePlans(hotelId, match.roomId),
          rateService.getRatePlanLinksByMaster(masterId).catch(() => []),
        ]);
        if (cancelled) return;
        const all = data.ratePlans ?? [];
        const filtered = filterLinkableRatePlans(all, masterId);
        setLinkAllRatePlans(all);
        setLinkFilteredRatePlans(filtered);
        const matchLink =
          links.find(
            (l) => l.masterRatePlanId === masterId && l.active !== false,
          ) ??
          links.find((l) => l.masterRatePlanId === masterId) ??
          null;
        setLinkExistingRecord(matchLink);
      } catch (err: unknown) {
        if (!cancelled) {
          setLinkAllRatePlans([]);
          setLinkFilteredRatePlans([]);
          setLinkExistingRecord(null);
          setLinkRpError(true);
          const message =
            err instanceof Error ? err.message : "Failed to load rate plans";
          showToast(message, "error");
        }
      } finally {
        if (!cancelled) {
          setLinkRpLoading(false);
          setLinkRecordLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isLinkRatePlansOpen,
    hotelId,
    linkRatePlansContext?.roomId,
    linkRatePlansContext?.roomName,
    linkRatePlansContext?.currentRatePlanId,
    // showToast omitted: not referentially stable from useToast
  ]);

  // Child Age Policy State
  const [childPolicy, setChildPolicy] = useState<ChildAgePolicyResponse | null>(null);
  const [childPolicyNotFound, setChildPolicyNotFound] = useState(false);

  // Debug: Log child policy state changes
  useEffect(() => {
    console.log("Layout - childPolicyNotFound:", childPolicyNotFound);
  }, [childPolicyNotFound]);

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
  const originalRateRoomsRef = useRef<RatesRoom[]>([]);
  
  // Flag to prevent API calls when canceling
  const isCancelingRef = useRef(false);

  const hasChanges = activeEdit !== null || activeRateEdit !== null;
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Reset all changes when switching between room-types and rate-plans tabs
  useEffect(() => {
    // Set canceling flag to prevent any pending API calls
    isCancelingRef.current = true;
    
    // Revert room inventory to original state if there were changes
    if (activeEdit && originalRoomsRef.current.length > 0) {
      const originalData = JSON.parse(JSON.stringify(originalRoomsRef.current));
      setRooms(originalData);
    }
    setActiveEdit(null);
    
    // Revert rate rooms to original state if there were changes
    if (activeRateEdit && originalRateRoomsRef.current.length > 0) {
      const originalData = JSON.parse(JSON.stringify(originalRateRoomsRef.current));
      setRateRooms(originalData);
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
  }, [activeSidebarSection]);

  // Fetch child age policy on mount
  useEffect(() => {
    if (!hotelId) return;

    const fetchChildAgePolicy = async () => {
      try {
        const data = await adminService.getChildAgePolicy(hotelId);
        setChildPolicy(data);
        setChildPolicyNotFound(false);
      } catch (error: any) {
        // Check if error is "child policy not found"
        // API client interceptor transforms error structure:
        // - Before: error.response.data.data.childAgePolicy
        // - After: error.data.childAgePolicy (interceptor extracts data into error.data)
        const errorData = error?.data || error?.response?.data?.data || error?.data?.data;
        const childAgePolicyError = errorData?.childAgePolicy;
        console.log("Child policy error check:", {
          error,
          errorData,
          childAgePolicyError,
          matches: childAgePolicyError === "error.hotel.child.age.policy.not.found"
        });
        
        if (childAgePolicyError === "error.hotel.child.age.policy.not.found") {
          // Policy not found - hide all child-related fields
          console.log("Setting childPolicyNotFound to true");
          setChildPolicy(null);
          setChildPolicyNotFound(true);
        } else {
          // Other errors - treat as no policy but don't hide fields
          console.error("Error fetching child age policy (not 'not found' error):", error);
          setChildPolicy(null);
          setChildPolicyNotFound(false);
        }
      }
    };

    fetchChildAgePolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // Calculate date range: fromDate = baseDate, toDate = baseDate + 6 days
  const fromDate = useMemo(() => format(baseDate, "yyyy-MM-dd"), [baseDate]);
  const toDate = useMemo(() => format(addDays(baseDate, 6), "yyyy-MM-dd"), [baseDate]);

  // Keep a per-room cache for quick lookups in the expandable view.
  // Derived from `rateRooms` so it stays aligned with existing update logic.
  useEffect(() => {
    const next: Record<number, RatesRoom> = {};
    for (const rr of rateRooms) next[rr.roomId] = rr;
    setRateRoomsByRoomId(next);
  }, [rateRooms]);

  // Reset expandable state when hotel/date range/customer type changes.
  useEffect(() => {
    setExpandedRoomIds(new Set());
    setLoadingRatePlansByRoomId({});
    setRateRoomsByRoomId({});
    setRateRooms([]);
    originalRateRoomsRef.current = [];
    setRatePlansFromDate("");
    setRatePlansToDate("");
    setRatesCalendarIsLinkEnable(undefined);
    setActiveRateEdit(null);
  }, [hotelId, fromDate, toDate, currentCustomerType]);

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

  // Room inventory: load rates calendar for the selected segment (B2C / MYBIZZ / B2B) so
  // expanded rows and saves use the correct customerType — tab change refetches rates.
  useEffect(() => {
    if (!hotelId || activeSidebarSection !== "room-types") return;

    let cancelled = false;
    const prefetchRatesForSegment = async () => {
      try {
        const data = await rateService.getCalendar(
          hotelId,
          fromDate,
          toDate,
          currentCustomerType,
        );
        if (cancelled) return;
        setRateRooms(data.rooms);
        setRatesCalendarIsLinkEnable(data.isLinkEnable);
        setRatePlansFromDate(data.from);
        setRatePlansToDate(data.to);
        setCustomerType(data.customerType);
        originalRateRoomsRef.current = JSON.parse(JSON.stringify(data.rooms));
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading rates for segment (room inventory):", error);
        setRateRooms([]);
        setRatesCalendarIsLinkEnable(undefined);
        setRatePlansFromDate("");
        setRatePlansToDate("");
      }
    };

    void prefetchRatesForSegment();
    return () => {
      cancelled = true;
    };
  }, [hotelId, fromDate, toDate, activeSidebarSection, currentCustomerType]);

  
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
        setRateRooms(data.rooms);
        setRatesCalendarIsLinkEnable(data.isLinkEnable);
        setRatePlansFromDate(data.from);
        setRatePlansToDate(data.to);
        setCustomerType(data.customerType);
        // Store original state for cancel functionality
        originalRateRoomsRef.current = JSON.parse(JSON.stringify(data.rooms));
        // Clear any active edits when data is refetched
        setActiveRateEdit(null);
      } catch (error) {
        console.error("Error fetching rate plans:", error);
        setRateRooms([]);
        setRatesCalendarIsLinkEnable(undefined);
        setRatePlansFromDate("");
        setRatePlansToDate("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatePlans();
  }, [hotelId, fromDate, toDate, activeSidebarSection, currentCustomerType]);

  const ensureRatePlansLoadedForRoom = async (roomId: number) => {
    if (!hotelId) return;
    if (rateRoomsByRoomId[roomId]) return;
    if (loadingRatePlansByRoomId[roomId]) return;

    setLoadingRatePlansByRoomId((prev) => ({ ...prev, [roomId]: true }));
    try {
      const data = await rateService.getCalendar(
        hotelId,
        fromDate,
        toDate,
        currentCustomerType
      );
      setRateRooms(data.rooms);
      setRatesCalendarIsLinkEnable(data.isLinkEnable);
      setRatePlansFromDate(data.from);
      setRatePlansToDate(data.to);
      setCustomerType(data.customerType);
      // Store original state for cancel functionality
      originalRateRoomsRef.current = JSON.parse(JSON.stringify(data.rooms));
    } catch (error: any) {
      console.error("Error fetching rate plans (expand):", error);
      showToast(error?.message || "Failed to load rate plans", "error");
    } finally {
      setLoadingRatePlansByRoomId((prev) => ({ ...prev, [roomId]: false }));
    }
  };

  /** GET /hotel/{id}/rates/calendar — refresh grid after link create/update/remove. */
  const refreshRatesCalendarAfterLinkChange = useCallback(async () => {
    if (!hotelId) return;
    try {
      const data = await rateService.getCalendar(
        hotelId,
        fromDate,
        toDate,
        currentCustomerType,
      );
      setRateRooms(data.rooms);
      setRatesCalendarIsLinkEnable(data.isLinkEnable);
      setRatePlansFromDate(data.from);
      setRatePlansToDate(data.to);
      setCustomerType(data.customerType);
      originalRateRoomsRef.current = JSON.parse(JSON.stringify(data.rooms));
      setActiveRateEdit(null);
    } catch (error) {
      console.error("Error refreshing rates calendar after link change:", error);
      showToast(
        "Link saved, but the calendar could not be refreshed. Try changing the date range or reloading.",
        "error",
      );
    }
  }, [hotelId, fromDate, toDate, currentCustomerType, showToast]);

  const toggleRoomExpand = (roomId: number) => {
    const shouldExpand = !expandedRoomIds.has(roomId);
    setExpandedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
    if (shouldExpand) {
      void ensureRatePlansLoadedForRoom(roomId);
    }
  };

  useEffect(() => {
    if (!hotelId || !isBulkUpdateModalOpen) return;

    const fetchRoomTypes = async () => {
      setIsLoadingRoomTypes(true);
      setRoomTypesError(null);
      setSelectedRoomTypeId("");
      try {
        const roomTypeList = await inventoryService.getHotelRooms(hotelId);
        setRoomTypes(roomTypeList);

        if (roomTypeList.length === 0) {
          const message = "No room types available for this hotel.";
          setRoomTypesError(message);
          showToast(message, "error");
        }
      } catch (error: any) {
        const message = error?.message || "Failed to load room types";
        setRoomTypesError(message);
        showToast(message, "error");
      } finally {
        setIsLoadingRoomTypes(false);
      }
    };

    fetchRoomTypes();
  }, [hotelId, isBulkUpdateModalOpen]);

  const handleAvailabilityUpdate = (
    roomId: number,
    dateStr: string,
    value: number,
  ) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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
        activeRateEdit.singleOccupancyRate,
        activeRateEdit.extraAdultCharge,
        activeRateEdit.paidChildCharge,
        activeRateEdit.minStay,
        activeRateEdit.maxStay,
        activeRateEdit.cutoffTime,
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
    
    // Revert rate rooms to original state
    if (originalRateRoomsRef.current.length > 0) {
      const originalData = JSON.parse(JSON.stringify(originalRateRoomsRef.current));
      setRateRooms(originalData);
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
    roomId: string,
  ) => {
    if (isReadOnly) return;
    if (!hotelId) return;

    if (roomTypes.length === 0) {
      showToast("No room types available for this hotel.", "error");
      return;
    }

    if (!roomId) {
      showToast("Please select a room type before applying.", "error");
      return;
    }

    if (value === null) {
      showToast("Please enter a value for total rooms.", "error");
      return;
    }

    if (isBulkSubmitting) return;

    // Map selected room type (admin room list) to numeric inventory roomId by room name
    const selectedRoom = roomTypes.find((r) => r.roomId === roomId);
    const matchingInventoryRoom = rooms.find(
      (r) =>
        r.roomName.toLowerCase().trim() ===
        (selectedRoom?.roomName.toLowerCase().trim() || "")
    );
    const numericRoomId = matchingInventoryRoom?.roomId;
    if (!numericRoomId) {
      showToast("Invalid room type selected. Please refresh inventory and try again.", "error");
      return;
    }

    const fromDateStr = format(startDate, "yyyy-MM-dd");
    const toDateStr = format(endDate, "yyyy-MM-dd");
    
    // Determine status: OPEN if totalRooms > 0, CLOSED if totalRooms === 0
    const status: "OPEN" | "CLOSED" = value > 0 ? "OPEN" : "CLOSED";

    setIsBulkSubmitting(true);
    setIsLoading(true);
    try {
      await inventoryService.bulkUpdateInventory({
        roomId: numericRoomId,
        from: fromDateStr,
        to: toDateStr,
        totalRooms: value,
        status,
      });

      // Refetch data to get updated inventory
      const data = await inventoryService.getCalendar(hotelId, fromDateStr, toDateStr);
      setRooms(data);
      setActiveEdit(null);
      setIsBulkUpdateModalOpen(false);

      // Show success toast
      showToast("Inventory bulk updated successfully", "success");
    } catch (error: any) {
      // Show error toast
      const errorMessage =
        error?.message || "Failed to update inventory";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
      setIsBulkSubmitting(false);
    }
  };

  // Handle rate plan update (local state only - NOT API call)
  const handleRatePlanUpdate = (
    ratePlanId: number,
    roomId: number,
    date: string,
    baseRate: number,
    singleOccupancyRate?: number | null | undefined,
    extraAdultCharge?: number | undefined,
    paidChildCharge?: number | undefined,
    minStay?: number | null | undefined,
    maxStay?: number | null | undefined,
    cutoffTime?: string | null | undefined,
  ) => {
    if (isReadOnly) return;
    // Update local state optimistically
    // New structure: rooms → ratePlans → days
    setRateRooms((prev) =>
      prev.map((room) =>
        room.roomId !== roomId
          ? room
          : {
              ...room,
              ratePlans: room.ratePlans.map((ratePlan) =>
                ratePlan.ratePlanId !== ratePlanId
                  ? ratePlan
                  : {
                      ...ratePlan,
                      days: ratePlan.days.map((day) =>
                        day.date === date
                          ? { 
                              ...day, 
                              baseRate,
                              ...(singleOccupancyRate !== undefined && { singleOccupancyRate }),
                              ...(extraAdultCharge !== undefined && { extraAdultCharge }),
                              ...(paidChildCharge !== undefined && { paidChildCharge }),
                              ...(minStay !== undefined && { minStay }),
                              ...(maxStay !== undefined && { maxStay }),
                              ...(cutoffTime !== undefined && { cutoffTime }),
                            }
                          : day,
                      ),
                    },
              ),
            },
      ),
    );
    // Track active edit
    setActiveRateEdit((prev) => ({
      ratePlanId,
      roomId,
      date,
      baseRate,
      ...(singleOccupancyRate !== undefined && { singleOccupancyRate }),
      ...(extraAdultCharge !== undefined && { extraAdultCharge }),
      ...(paidChildCharge !== undefined && { paidChildCharge }),
      ...(minStay !== undefined && { minStay }),
      ...(maxStay !== undefined && { maxStay }),
      ...(cutoffTime !== undefined && { cutoffTime }),
    }));
  };

  // Handle single day rate update via API - ONLY called from Save button
  const handleSingleRateUpdate = async (
    ratePlanId: number,
    roomId: number,
    date: string,
    baseRate: number,
    singleOccupancyRate?: number | null,
    extraAdultCharge?: number,
    paidChildCharge?: number,
    minStay?: number | null,
    maxStay?: number | null,
    cutoffTime?: string | null,
  ) => {
    if (!hotelId) return;
    
    // Don't make API call if we're canceling
    if (isCancelingRef.current) return;

    // Find the day data to get existing values
    // New structure: rooms → ratePlans → days
    const room = rateRooms.find((r) => r.roomId === roomId);
    const ratePlan = room?.ratePlans.find((rp) => rp.ratePlanId === ratePlanId);
    const dayData = ratePlan?.days.find((d) => d.date === date);

    // Store previous values for reverting on error
    const previousBaseRate = dayData?.baseRate ?? 0;
    const previousSingleOccupancyRate = dayData?.singleOccupancyRate ?? null;
    const previousExtraAdultCharge = dayData?.extraAdultCharge ?? 0;
    const previousPaidChildCharge = dayData?.paidChildCharge ?? 0;
    const previousMinStay = dayData?.minStay ?? null;
    const previousMaxStay = dayData?.maxStay ?? null;
    const previousCutoffTime = dayData?.cutoffTime ?? null;

    // Build payload using values from activeEdit or existing day data
    // Use customerType from active navigation tab
    const payload = {
      roomId,
      ratePlanId,
      customerType: currentCustomerType, // Use customerType from active tab
      date,
      baseRate: baseRate || 0, // Send 0 if empty
      singleOccupancyRate: singleOccupancyRate !== undefined ? singleOccupancyRate : (dayData?.singleOccupancyRate ?? null),
      extraAdultCharge: extraAdultCharge !== undefined ? extraAdultCharge : (dayData?.extraAdultCharge ?? 0),
      paidChildCharge: paidChildCharge !== undefined ? paidChildCharge : (dayData?.paidChildCharge ?? 0),
      minStay: minStay !== undefined ? minStay : (dayData?.minStay ?? null),
      maxStay: maxStay !== undefined ? maxStay : (dayData?.maxStay ?? null),
      cutoffTime: cutoffTime !== undefined ? cutoffTime : (dayData?.cutoffTime ?? null),
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
      // Revert to previous values on error
      handleRatePlanUpdate(
        ratePlanId, 
        roomId, 
        date, 
        previousBaseRate,
        previousSingleOccupancyRate,
        previousExtraAdultCharge,
        previousPaidChildCharge,
        previousMinStay,
        previousMaxStay,
        previousCutoffTime
      );
      const errorMessage = error?.message || "Failed to update rate";
      showToast(errorMessage, "error");
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 pb-24 overflow-x-auto">
      {isReadOnly && (
        <div className="max-w-450 mx-auto px-6 pt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have view-only access for Rate & Inventory.
          </div>
        </div>
      )}
      <div className="max-w-450 mx-auto">
        <div className="flex pt-3 px-6">
          <div className="flex-1">
            <NavigationTabs
              tabs={TAB_OPTIONS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="pt-6 mb-4">
              <DateSelector
                baseDate={baseDate}
                onBaseDateChange={setBaseDate}
                onActiveDateChange={setActiveDate}
                channelSegmentLabel={activeSegmentLabel}
                rightAction={
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DropdownMenu
                      open={isBulkUpdateDropdownOpen}
                      onOpenChange={setIsBulkUpdateDropdownOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Bulk Update
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => {
                            setIsBulkUpdateModalOpen(true);
                            setIsBulkUpdateDropdownOpen(false);
                          }}
                          className="cursor-pointer"
                          disabled={isReadOnly}
                        >
                          Bulk Update Inventory
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (hotelId) {
                              navigate(`/rates/bulk-update?hotelId=${hotelId}`);
                            }
                            setIsBulkUpdateDropdownOpen(false);
                          }}
                          className="cursor-pointer"
                          disabled={!hotelId || isReadOnly}
                        >
                          Bulk Update Rates
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (hotelId) {
                              navigate(`/restrictions/bulk-update?hotelId=${hotelId}`);
                            }
                            setIsBulkUpdateDropdownOpen(false);
                          }}
                          className="cursor-pointer"
                          disabled={!hotelId || isReadOnly}
                        >
                          Bulk Restrictions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              />
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
              <div className="mt-4" key={`room-types-${activeSidebarSection}`}>
                <RoomTypesGrid
                  rooms={rooms}
                  baseDate={baseDate}
                  activeDate={activeDate}
                  onUpdate={handleAvailabilityUpdate}
                  onActiveDateChange={setActiveDate}
                  isLocked={isReadOnly || hasChanges}
                  activeEdit={activeEdit}
                  updatingCells={updatingCells}
                  expandedRoomIds={expandedRoomIds}
                  onToggleExpand={toggleRoomExpand}
                  rateRoomsByRoomId={rateRoomsByRoomId}
                  loadingRatePlansByRoomId={loadingRatePlansByRoomId}
                  fromDate={fromDate}
                  toDate={toDate}
                  customerType={currentCustomerType}
                  onRatePlanUpdate={handleRatePlanUpdate}
                  activeRateEdit={activeRateEdit}
                  hidePaidChildCharge={childPolicyNotFound}
                  childPolicy={childPolicy}
                  onOpenLinkRatePlans={openLinkRatePlansFromGrid}
                  calendarIsLinkEnable={ratesCalendarIsLinkEnable}
                  hotelId={hotelId}
                />
              </div>
            ) : (
              ratePlansFromDate && ratePlansToDate ? (
                <div className="mt-4" key={`rate-plans-${activeSidebarSection}`}>
                  <RatePlansGrid
                    rooms={rateRooms}
                    fromDate={ratePlansFromDate}
                    toDate={ratePlansToDate}
                    activeDate={activeDate}
                    customerType={currentCustomerType}
                    onUpdate={handleRatePlanUpdate}
                    onActiveDateChange={setActiveDate}
                    isLocked={isReadOnly || hasChanges}
                    activeEdit={activeRateEdit}
                    hidePaidChildCharge={childPolicyNotFound}
                    childPolicy={childPolicy}
                    onOpenLinkRatePlans={openLinkRatePlansFromGrid}
                    calendarIsLinkEnable={ratesCalendarIsLinkEnable}
                    hotelId={hotelId}
                  />
                </div>
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

      {/* Bulk Update Modal - Available from both sections */}
      <BulkUpdateModal
        key={isBulkUpdateModalOpen ? "open" : "closed"}
        isOpen={isBulkUpdateModalOpen}
        onClose={() => setIsBulkUpdateModalOpen(false)}
        onApply={handleBulkUpdate}
        rooms={roomTypes}
        selectedRoomId={selectedRoomTypeId}
        onSelectRoom={setSelectedRoomTypeId}
        isLoadingRooms={isLoadingRoomTypes}
        roomsError={roomTypesError}
        isSubmitting={isBulkSubmitting}
        section="room-types"
      />

      <LinkRatePlansSheet
        open={isLinkRatePlansOpen}
        onOpenChange={handleLinkSheetOpenChange}
        targetPlanLabel={linkRatePlansTargetLabel}
        baseRateOptions={linkSheetBaseOptions}
        isLoadingOptions={linkRpLoading}
        noLinkablePlans={
          !linkRpLoading &&
          !linkRpError &&
          linkFilteredRatePlans.length === 0
        }
        masterRatePlanId={linkRatePlansContext?.currentRatePlanId ?? 0}
        existingLinkRecord={linkExistingRecord}
        linkConfigLoading={linkRecordLoading}
        onInvalid={() => {
          setLinkSheetApiError("Please choose a base rate plan.");
        }}
        apiError={linkSheetApiError}
        onClearApiError={() => setLinkSheetApiError(null)}
        onRemoveLink={async (linkId) => {
          try {
            await rateService.deleteRatePlanLink(linkId);
            showToast("Rate plan link is removed.", "success");
            await refreshRatesCalendarAfterLinkChange();
          } catch (err: unknown) {
            const message = formatApiClientError(err);
            setLinkSheetApiError(message);
            throw err;
          }
        }}
        onConfirm={async (payload) => {
          const slaveRatePlanId = Number.parseInt(payload.baseRateValue, 10);
          if (!Number.isFinite(slaveRatePlanId)) {
            setLinkSheetApiError("Invalid base rate plan.");
            throw new Error("Invalid slave rate plan id");
          }
          const body = toLinkRatePlanLinkPayload(
            payload.masterRatePlanId,
            slaveRatePlanId,
            payload.direction,
            payload.unit,
            payload.adjustmentAmount,
            payload.advanced,
          );
          try {
            if (payload.existingLinkId != null) {
              await rateService.updateRatePlanLink(
                payload.existingLinkId,
                body,
              );
              showToast("Linked rates updated.", "success");
            } else {
              await rateService.linkRatePlans(body);
              showToast("Linked rates saved.", "success");
            }
            await refreshRatesCalendarAfterLinkChange();
          } catch (err: unknown) {
            const message = formatApiClientError(err);
            setLinkSheetApiError(message);
            throw err;
          }
        }}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={toast.type === "error" ? 9000 : 3000}
      />
    </div>
  );
}
