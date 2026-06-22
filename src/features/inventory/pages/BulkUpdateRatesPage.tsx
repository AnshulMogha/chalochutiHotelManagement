import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
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
  Baby,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Loader2,
  Search,
  SlidersHorizontal,
  Tag,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  rateService,
  type BulkUpdateRatesRequest,
} from "../services/rateService";
import { mapHotelRoomUuidsToNumericRoomIds } from "../utils/mapHotelRoomUuidsToNumericRoomIds";
import {
  B2B_PRICING_MODE_OPTIONS,
  buildBulkUpdateDerivedPayload,
  clampB2bPercentageInput,
  createDefaultB2bPricingState,
  getB2bPricingFieldErrors,
  getB2bPricingModeHint,
  isB2bFixedPricingMode,
  isB2bPercentagePricingMode,
  type B2bB2cPricingState,
  type B2bRateFieldKey,
  validateB2bPricingConfig,
} from "../utils/rateHelpers";
import {
  adminService,
  type HotelRoom,
  type RatePlan as AdminRatePlan,
  type ChildAgePolicyResponse,
} from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";

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

const RATE_PLAN_DISPLAY_ORDER: Record<string, number> = {
  EP: 0,
  CP: 1,
  MAP: 2,
  AP: 3,
};

const normalizeForOrdering = (value?: string | null): string => {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const getRatePlanOrder = (mealPlanCode?: string | null): number => {
  if (!mealPlanCode) return Number.MAX_SAFE_INTEGER;
  const normalizedCode = mealPlanCode.trim().toUpperCase();
  return RATE_PLAN_DISPLAY_ORDER[normalizedCode] ?? Number.MAX_SAFE_INTEGER;
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

  // Fallback for endpoints that don't return room_type_code.
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

type IconBadgeColor =
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "indigo"
  | "orange"
  | "sky";

const ICON_BADGE_STYLES: Record<IconBadgeColor, string> = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
  indigo: "bg-indigo-100 text-indigo-600",
  orange: "bg-orange-100 text-orange-600",
  sky: "bg-sky-100 text-sky-600",
};

function IconBadge({
  icon: Icon,
  color,
  size = "md",
}: {
  icon: LucideIcon;
  color: IconBadgeColor;
  size?: "sm" | "md";
}) {
  const boxClass = size === "sm" ? "w-7 h-7 rounded-md" : "w-9 h-9 rounded-lg";
  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div
      className={`${boxClass} flex items-center justify-center shrink-0 ${ICON_BADGE_STYLES[color]}`}
    >
      <Icon className={iconClass} aria-hidden />
    </div>
  );
}

function FieldLabel({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
      <Icon className={`w-4 h-4 shrink-0 ${iconClassName}`} aria-hidden />
      <span>{children}</span>
    </label>
  );
}

function SectionHeading({
  icon: Icon,
  color,
  title,
  hint,
}: {
  icon: LucideIcon;
  color: IconBadgeColor;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-3 border-b border-inherit">
      <IconBadge icon={Icon} color={color} />
      <div className="min-w-0">
        <h5 className="text-sm font-bold text-slate-900">{title}</h5>
        {hint && (
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{hint}</p>
        )}
      </div>
    </div>
  );
}

export default function BulkUpdateRatesPage() {
  const { user } = useAuth();
  const isReadOnly = !canEditModule(user, "RATES_INVENTORY");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  // Get params from URL
  const hotelId = searchParams.get("hotelId");
  const contractTypeParam = searchParams.get("contractType");

  const normalizeContractTypeParam = (value: string | null): string => {
    const normalized = (value || "").trim().toUpperCase();
    const aliases: Record<string, string> = {
      B2C: "B2C",
      B2B: "B2B",
      BUNDLE: "BUNDLE",
    };
    return aliases[normalized] || "B2C";
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRatePlans, setLoadingRatePlans] = useState<
    Record<string, boolean>
  >({});

  // Date range state
  const today = useMemo(() => startOfToday(), []);
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

  // Customer type - UI value (B2C, B2B, BUNDLE)
  const [customerTypeUI, setCustomerTypeUI] = useState(() =>
    normalizeContractTypeParam(contractTypeParam),
  );

  // Map UI customer type to API customer type
  const getCustomerTypeFromUI = (uiValue: string): string => {
    const uiToApi: Record<string, string> = {
      B2C: "RETAIL",
      B2B: "AGENT",
      BUNDLE: "PACKAGE",
    };
    return uiToApi[uiValue] || "RETAIL";
  };

  // Get API customer type from UI value
  const customerType = useMemo(
    () => getCustomerTypeFromUI(customerTypeUI),
    [customerTypeUI],
  );

  useEffect(() => {
    setCustomerTypeUI(normalizeContractTypeParam(contractTypeParam));
  }, [contractTypeParam]);

  // UI state
  const [showNettRate, setShowNettRate] = useState(false);
  const [updateExtraGuestCharges, setUpdateExtraGuestCharges] = useState(false);
  // const [enableRateRestrictions, setEnableRateRestrictions] = useState(false);
  const [updateBothPricesB2CAndB2B, setUpdateBothPricesB2CAndB2B] =
    useState(false);

  const [baseRateB2bPricing, setBaseRateB2bPricing] = useState(
    createDefaultB2bPricingState,
  );
  const [singleAdultRateB2bPricing, setSingleAdultRateB2bPricing] = useState(
    createDefaultB2bPricingState,
  );
  const [extraAdultChargeB2bPricing, setExtraAdultChargeB2bPricing] =
    useState(createDefaultB2bPricingState);
  const [paidChildChargeB2bPricing, setPaidChildChargeB2bPricing] = useState(
    createDefaultB2bPricingState,
  );

  useEffect(() => {
    if (customerTypeUI !== "B2C") {
      setUpdateBothPricesB2CAndB2B(false);
      setBaseRateB2bPricing(createDefaultB2bPricingState());
      setSingleAdultRateB2bPricing(createDefaultB2bPricingState());
      setExtraAdultChargeB2bPricing(createDefaultB2bPricingState());
      setPaidChildChargeB2bPricing(createDefaultB2bPricingState());
    }
  }, [customerTypeUI]);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Data state
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansByRoom, setRatePlansByRoom] = useState<
    Record<string, AdminRatePlan[]>
  >({});
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(
    new Set(),
  );
  // const [expandedRestrictions, setExpandedRestrictions] = useState<Set<string>>(
  //   new Set(),
  // );

  // Mapping: room UUID (from HotelRoom) -> numeric roomId (from rate calendar)
  const [roomIdMapping, setRoomIdMapping] = useState<Record<string, number>>(
    {},
  );

  // Form data: roomUUID-ratePlanId -> form values (using UUID as key, but storing numeric ID)
  const [formData, setFormData] = useState<Record<string, RoomRateData>>({});

  // Child Age Policy State
  const [childPolicy, setChildPolicy] = useState<ChildAgePolicyResponse | null>(null);
  const [loadingChildPolicy, setLoadingChildPolicy] = useState(false);
  const [childPolicyNotFound, setChildPolicyNotFound] = useState(false);

  // Helper functions for dynamic child age labels
  const shouldShowFreeChildRate = (): boolean => {
    // Hide if policy is not found
    if (childPolicyNotFound) return false;
    // Show only if childrenAllowed is explicitly true AND age values are valid
    if (!childPolicy?.childrenAllowed) return false;
    const freeMaxAge = childPolicy.freeStayMaxAge;
    const paidMaxAge = childPolicy.paidStayMaxAge;
    // Validate age values exist and are numbers
    if (typeof freeMaxAge !== 'number' || typeof paidMaxAge !== 'number') return false;
    if (isNaN(freeMaxAge) || isNaN(paidMaxAge)) return false;
    return true;
  };

  const shouldShowPaidChildRate = (): boolean => {
    // Always show paid child charge field in bulk update guest charges.
    // If policy is unavailable, we still render with default static label.
    return true;
  };

  const getFreeChildRateLabel = (): string => {
    // This should only be called when shouldShowFreeChildRate() is true
    // But add safety checks to prevent undefined in label
    if (!childPolicy?.childrenAllowed) {
      return "Free Child Rate (0 - 5 years)"; // Fallback (should not be shown)
    }
    const maxAge = childPolicy.freeStayMaxAge;
    if (typeof maxAge !== 'number' || isNaN(maxAge)) {
      return "Free Child Rate (0 - 5 years)"; // Fallback
    }
    return `Free Child Rate (0 – ${maxAge} years)`;
  };

  const getPaidChildRateLabel = (): string => {
    const baseLabel = "Paid Child Rate";

    // Show age range only when valid policy values are available.
    if (!childPolicy?.childrenAllowed) {
      return baseLabel;
    }
    const freeMaxAge = childPolicy.freeStayMaxAge;
    const paidMaxAge = childPolicy.paidStayMaxAge;
    
    // Validate age values before using them
    if (typeof freeMaxAge !== 'number' || typeof paidMaxAge !== 'number') {
      return baseLabel;
    }
    if (isNaN(freeMaxAge) || isNaN(paidMaxAge)) {
      return baseLabel;
    }
    
    const minAge = freeMaxAge + 1;
    return `${baseLabel} (${minAge} – ${paidMaxAge} years)`;
  };

  const getExtraAdultChargeLabel = (): string => {
    // If child policy is available and valid, use dynamic age
    if (childPolicy?.childrenAllowed && typeof childPolicy.paidStayMaxAge === 'number' && !isNaN(childPolicy.paidStayMaxAge)) {
      const minAge = childPolicy.paidStayMaxAge + 1;
      return `Extra Adult Charge (${minAge}+ years)`;
    }
    // Default static label when no policy or invalid policy
    return "Extra Adult Charge";
  };

  // Fetch child age policy on page load
  useEffect(() => {
    if (!hotelId) return;

    const fetchChildAgePolicy = async () => {
      setLoadingChildPolicy(true);
      setChildPolicyNotFound(false);
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
      } finally {
        setLoadingChildPolicy(false);
      }
    };

    fetchChildAgePolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

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
        setRooms(
          (data.rooms || []).filter((room) => room.active !== false),
        );
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

  // Fetch rate calendar to map room names to numeric room IDs.
  // This mapping does not need to refetch on every date-range change.
  useEffect(() => {
    if (!hotelId || rooms.length === 0) return;

    const fetchRoomMapping = async () => {
      try {
        const fromDateStr = format(today, "yyyy-MM-dd");
        const toDateStr = format(addDays(today, 6), "yyyy-MM-dd");
        const uuidToNumericMapping = await mapHotelRoomUuidsToNumericRoomIds(
          hotelId,
          rooms,
          customerType,
          { from: fromDateStr, to: toDateStr },
        );
        setRoomIdMapping(uuidToNumericMapping);
      } catch (error: any) {
        console.error("Error fetching room mapping:", error);
        // Don't show error toast, just log it
      }
    };

    fetchRoomMapping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, rooms, customerType]);

  // Fetch rate plans when room is expanded
  const fetchRatePlansForRoom = async (roomId: string) => {
    if (!hotelId || ratePlansByRoom[roomId]) return; // Already fetched

    setLoadingRatePlans((prev) => ({ ...prev, [roomId]: true }));
    try {
      const data = await adminService.getRoomRatePlans(hotelId, roomId);
      const sortedRatePlans = [...(data.ratePlans || [])].sort(
        (firstRatePlan, secondRatePlan) => {
          const orderDiff =
            getRatePlanOrder(firstRatePlan.mealPlan) -
            getRatePlanOrder(secondRatePlan.mealPlan);
          if (orderDiff !== 0) return orderDiff;
          return firstRatePlan.ratePlanName.localeCompare(
            secondRatePlan.ratePlanName,
          );
        },
      );
      setRatePlansByRoom((prev) => ({
        ...prev,
        [roomId]: sortedRatePlans,
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

  // const toggleRestrictions = (roomId: string, ratePlanId: number) => {
  //   const key = `${roomId}-${ratePlanId}`;
  //   const newExpanded = new Set(expandedRestrictions);
  //   if (newExpanded.has(key)) {
  //     newExpanded.delete(key);
  //   } else {
  //     newExpanded.add(key);
  //   }
  //   setExpandedRestrictions(newExpanded);
  // };

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

  const parsePositiveRateInput = (rawValue: string): number | undefined => {
    if (rawValue === "") {
      return undefined;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    const sortedRooms = [...rooms].sort((firstRoom, secondRoom) => {
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

    if (!searchQuery.trim()) return sortedRooms;
    const query = searchQuery.toLowerCase();
    return sortedRooms.filter(
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

  const b2bPricingStates = useMemo(
    () => ({
      baseRate: baseRateB2bPricing,
      singleOccupancyRate: singleAdultRateB2bPricing,
      extraAdultCharge: extraAdultChargeB2bPricing,
      paidChildCharge: paidChildChargeB2bPricing,
    }),
    [
      baseRateB2bPricing,
      singleAdultRateB2bPricing,
      extraAdultChargeB2bPricing,
      paidChildChargeB2bPricing,
    ],
  );

  const b2bPricingFieldErrors = useMemo(() => {
    if (!updateBothPricesB2CAndB2B) return {};
    return getB2bPricingFieldErrors(Object.values(formData), b2bPricingStates);
  }, [updateBothPricesB2CAndB2B, formData, b2bPricingStates]);

  const hasB2bPricingErrors = Object.keys(b2bPricingFieldErrors).length > 0;

  const canSubmit =
    hasFormData &&
    isDateRangeValid &&
    !isSubmitting &&
    !hasB2bPricingErrors;

  const handleSubmit = async () => {
    if (isReadOnly) return;
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

      if (updateBothPricesB2CAndB2B) {
        const b2bError = validateB2bPricingConfig(
          validFormEntries.map(([, data]) => data),
          b2bPricingStates,
        );
        if (b2bError) {
          showToast(b2bError, "error");
          setIsSubmitting(false);
          return;
        }
      }

      const buildRestrictionPayload = (
        data: RoomRateData,
      ): BulkUpdateRatesRequest | null => {
        const hasRestrictions =
          data.minStay !== undefined ||
          data.maxStay !== undefined ||
          data.cutoffTime !== undefined;
        if (!hasRestrictions) return null;

        const payload: BulkUpdateRatesRequest = {
          roomId: data.numericRoomId,
          ratePlanId: data.ratePlanId,
          customerType,
          from: fromDateStr,
          to: toDateStr,
          weekDays: weekDaysToSend,
          currency: "INR",
        };
        if (data.minStay !== undefined) payload.minStay = data.minStay;
        if (data.maxStay !== undefined) payload.maxStay = data.maxStay;
        if (data.cutoffTime !== undefined) payload.cutoffTime = data.cutoffTime;
        return payload;
      };

      const updatePromises = validFormEntries.flatMap(([_, data]) => {
        if (!data.numericRoomId || !data.ratePlanId) {
          console.error("Invalid data in form entry:", data);
          throw new Error(`Invalid room ID or rate plan ID`);
        }

        const promises: Promise<void>[] = [];

        if (updateBothPricesB2CAndB2B) {
          const derivedPayload = buildBulkUpdateDerivedPayload(
            data,
            fromDateStr,
            toDateStr,
            weekDaysToSend,
            b2bPricingStates,
          );
          if (derivedPayload) {
            promises.push(rateService.bulkUpdateDerivedRates(derivedPayload));
          }

          const restrictionPayload = buildRestrictionPayload(data);
          if (restrictionPayload) {
            promises.push(rateService.bulkUpdateRates(restrictionPayload));
          }
        } else {
          const payload: BulkUpdateRatesRequest = {
            roomId: data.numericRoomId,
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
          if (data.cutoffTime !== undefined)
            payload.cutoffTime = data.cutoffTime;

          promises.push(rateService.bulkUpdateRates(payload));
        }

        return promises;
      });

      if (updatePromises.length === 0) {
        showToast("Please fill at least one rate field before submitting", "error");
        setIsSubmitting(false);
        return;
      }

      await Promise.all(updatePromises);

      showToast("Rates updated successfully", "success");

      setTimeout(() => {
        navigate(`/inventory/room-types?hotelId=${hotelId}`);
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
      navigate(`/inventory/room-types?hotelId=${hotelId}`);
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

  const calculateNettRate = (grossRate: number) => grossRate;

  const b2bB2cInputClassName =
    "w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400";

  const showB2bDualPricing =
    customerTypeUI === "B2C" && updateBothPricesB2CAndB2B;

  const renderB2bB2cPricingSection = (
    fieldKey: B2bRateFieldKey,
    sectionTitle: string,
    state: B2bB2cPricingState,
    setState: React.Dispatch<React.SetStateAction<B2bB2cPricingState>>,
    fieldError?: string,
  ) => (
    <div
      className={`mt-4 pt-4 border space-y-3 rounded-lg px-4 py-3 ${
        fieldError
          ? "border-red-300 bg-red-50/50"
          : "border-violet-100 bg-violet-50/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-violet-600 shrink-0" aria-hidden />
        <h6 className="text-sm font-semibold text-slate-800">{sectionTitle}</h6>
      </div>
      <div className="space-y-2.5">
        <label className="block text-sm font-semibold text-slate-800">
          P ricing rule <span className="text-red-500">*</span>
        </label>
        <select
          value={state.mode}
          onChange={(e) => {
            const mode = e.target.value as B2bB2cPricingState["mode"];
            setState((prev) => ({
              ...prev,
              mode,
              fixedAmount: isB2bFixedPricingMode(mode) ? prev.fixedAmount : "",
              percentage: isB2bPercentagePricingMode(mode)
                ? prev.percentage
                : "",
            }));
          }}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? `${fieldKey}-b2b-error` : undefined}
          className={`${b2bB2cInputClassName} ${
            fieldError ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""
          }`}
        >
          <option value="">Select B2B pricing</option>
          {B2B_PRICING_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldError && (
          <p
            id={`${fieldKey}-b2b-error`}
            className="text-xs font-medium text-red-600"
            role="alert"
          >
            {fieldError}
          </p>
        )}
      </div>
      {isB2bFixedPricingMode(state.mode) && (
        <div className="space-y-2.5">
          <label className="block text-sm font-semibold text-slate-800">
            Fixed amount (₹)
          </label>
          <input
            type="number"
            value={state.fixedAmount}
            onChange={(e) =>
              setState((prev) => ({ ...prev, fixedAmount: e.target.value }))
            }
            placeholder="Enter fixed amount"
            min="0"
            disabled={isSubmitting}
            className={b2bB2cInputClassName}
          />
          {getB2bPricingModeHint(state.mode) && (
            <p className="text-xs text-violet-600/90 font-medium">
              {getB2bPricingModeHint(state.mode)}
            </p>
          )}
        </div>
      )}
      {isB2bPercentagePricingMode(state.mode) && (
        <div className="space-y-2.5">
          <label className="block text-sm font-semibold text-slate-800">
            Percentage (%)
          </label>
          <input
            type="number"
            value={state.percentage}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                percentage: clampB2bPercentageInput(e.target.value),
              }))
            }
            onBlur={(e) =>
              setState((prev) => ({
                ...prev,
                percentage: clampB2bPercentageInput(e.target.value),
              }))
            }
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Enter percentage (max 100)"
            min="0"
            max="100"
            step="0.01"
            disabled={isSubmitting}
            className={b2bB2cInputClassName}
          />
          {getB2bPricingModeHint(state.mode) && (
            <p className="text-xs text-violet-600/90 font-medium">
              {getB2bPricingModeHint(state.mode)}
            </p>
          )}
        </div>
      )}
    </div>
  );

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
              <div className="flex items-center gap-3">
                <IconBadge icon={IndianRupee} color="emerald" />
                <div>
                  <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                    Bulk Update Rates
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Set rates for selected dates and rooms
                  </p>
                </div>
              </div>
              {/* <div className="h-1 w-full bg-blue-600/70 rounded-full mt-3"></div> */}
            </div>
          </div>

          {/* Step 1: Context & Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
              <IconBadge icon={SlidersHorizontal} color="violet" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Filters & Selection
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose contract, dates, and options
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contract Type */}
                <div className="space-y-2.5">
                  <FieldLabel icon={Building2} iconClassName="text-violet-600">
                    Contract Type
                  </FieldLabel>
                  <select
                    value={customerTypeUI}
                    onChange={(e) => setCustomerTypeUI(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-3 focus:ring-blue-500/25 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-blue-200 shadow-sm"
                  >
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                    <option value="BUNDLE">BUNDLE</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2.5">
                  <FieldLabel icon={Calendar} iconClassName="text-blue-600">
                    Date Range <span className="text-red-500">*</span>
                  </FieldLabel>
                  <div className="flex items-center gap-3">
                    <div
                      className="relative flex-1 cursor-pointer"
                      onClick={() => openDatePicker(startDateInputRef.current)}
                    >
                      <Calendar className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={startDateInputRef}
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
                    <div
                      className="relative flex-1 cursor-pointer"
                      onClick={() => openDatePicker(endDateInputRef.current)}
                    >
                      <Calendar className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={endDateInputRef}
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
                  {/* <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow transition-colors">
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
                  </div> */}

                  {/* Update Extra Guest Charges Toggle */}
                  <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 hover:shadow transition-colors">
                    <div className="flex items-start gap-3">
                      <IconBadge icon={UserPlus} color="orange" size="sm" />
                      <div>
                        <span className="text-sm font-semibold text-slate-900">
                          Update Extra Guest Charges
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Show extra adult & child rate fields
                        </p>
                      </div>
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

                  {/* Rate Restrictions Toggle - commented out */}
                  {/* Apply B2B Pricing Toggle */}
                  {customerTypeUI === "B2C" && (
                  <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-violet-200 hover:shadow transition-colors">
                    <div className="flex items-start gap-3">
                      <IconBadge icon={Building2} color="violet" size="sm" />
                      <div>
                        <span className="text-sm font-semibold text-slate-900">
                          Apply B2B Pricing
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          Auto-calculate B2B from B2C rates
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateBothPricesB2CAndB2B}
                        onChange={(e) =>
                          setUpdateBothPricesB2CAndB2B(e.target.checked)
                        }
                        disabled={isSubmitting}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isReadOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You have view-only access for Rate & Inventory.
          </div>
        )}
        {/* Step 2: Rate Plan Search */}

        {/* Step 3: Room Cards */}
        <div className="space-y-5 bg-white shadow-sm border-2 border-gray-200 rounded-2xl ">

          <div className="mb-7 bg-[#2f3d95] p-5 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-white shrink-0">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                  <BedDouble className="w-5 h-5 text-sky-300" aria-hidden />
                </div>
                <p className="text-xl font-semibold">Room List</p>
              </div>
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-blue-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      <BedDouble
                        className={`w-5 h-5 shrink-0 ${isExpanded ? "text-sky-300" : "text-blue-600"}`}
                        aria-hidden
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
                      className={`w-5 h-5 shrink-0 transition-transform ${isExpanded ? "text-white" : "text-slate-600"}`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 transition-transform ${isExpanded ? "text-white" : "text-slate-600"}`}
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
                              <div className="flex items-center gap-3">
                                <IconBadge icon={Tag} color="amber" size="sm" />
                                <div className="text-left">
                                  <h4 className="text-base font-bold text-slate-900">
                                    {ratePlan.ratePlanName}
                                  </h4>
                                  <p className="text-sm text-slate-500 font-medium">
                                    {ratePlan.mealPlan}
                                  </p>
                                </div>
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
                                {/* Section: Rate */}
                                <div className="bg-emerald-50/60 rounded-xl p-6 border border-emerald-200/70 shadow-sm">
                                  <SectionHeading
                                    icon={IndianRupee}
                                    color="emerald"
                                    title="Rate"
                                    hint="Leave blank to keep existing values"
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 md:divide-x md:divide-emerald-200/80">
                                    {/* Occupancy 2 (Base) */}
                                    <div className="space-y-2.5 md:pr-6">
                                      <FieldLabel icon={IndianRupee} iconClassName="text-emerald-600">
                                        Base Rate
                                      </FieldLabel>
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
                                            parsePositiveRateInput(
                                              e.target.value,
                                            ),
                                          )
                                        }
                                        placeholder=""
                                        min="1"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                      />
                                      {showNettRate &&
                                        getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "baseRate",
                                        ) && (
                                          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                            <IndianRupee className="w-3 h-3" aria-hidden />
                                            Nett: ₹
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
                                      {showB2bDualPricing &&
                                        getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "baseRate",
                                        ) &&
                                        renderB2bB2cPricingSection(
                                          "baseRate",
                                          "Apply B2B Pricing for Base Rate",
                                          baseRateB2bPricing,
                                          setBaseRateB2bPricing,
                                          b2bPricingFieldErrors.baseRate,
                                        )}
                                    </div>

                                    {/* Occupancy 1 */}
                                    <div className="space-y-2.5 md:pl-6">
                                      <FieldLabel icon={User} iconClassName="text-blue-600">
                                        Single Adult Rate
                                      </FieldLabel>
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
                                            parsePositiveRateInput(
                                              e.target.value,
                                            ),
                                          )
                                        }
                                        placeholder=""
                                        min="1"
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                      />
                                      {showB2bDualPricing &&
                                        getFormValue(
                                          room.roomId,
                                          ratePlan.ratePlanId,
                                          "singleOccupancyRate",
                                        ) &&
                                        renderB2bB2cPricingSection(
                                          "singleOccupancyRate",
                                          "Apply B2B Pricing for Single Rate",
                                          singleAdultRateB2bPricing,
                                          setSingleAdultRateB2bPricing,
                                          b2bPricingFieldErrors.singleOccupancyRate,
                                        )}
                                    </div>
                                  </div>
                                </div>

                                {/* Section: Guest Charges */}
                                {updateExtraGuestCharges && (
                                  <div className="bg-orange-50/60 rounded-xl p-6 border border-orange-200/70 shadow-sm">
                                    <SectionHeading
                                      icon={UserPlus}
                                      color="orange"
                                      title="Guest Charges"
                                      hint="Extra adult and child pricing"
                                    />
                                    <div
                                      className={`grid grid-cols-1 gap-6 md:gap-0 ${
                                        shouldShowFreeChildRate()
                                          ? "md:grid-cols-3 md:divide-x md:divide-orange-200/70"
                                          : shouldShowPaidChildRate()
                                            ? "md:grid-cols-2 md:divide-x md:divide-orange-200/70"
                                            : "md:grid-cols-1"
                                      }`}
                                    >
                                      {/* Extra Adult Charge */}
                                      <div
                                        className={`space-y-2.5 ${shouldShowPaidChildRate() ? "md:pr-6" : ""}`}
                                      >
                                        <FieldLabel icon={UserPlus} iconClassName="text-orange-600">
                                          {getExtraAdultChargeLabel()}
                                        </FieldLabel>
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
                                              parsePositiveRateInput(
                                                e.target.value,
                                              ),
                                            )
                                          }
                                          placeholder=""
                                          min="1"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                        />
                                        {showB2bDualPricing &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "extraAdultCharge",
                                          ) &&
                                          renderB2bB2cPricingSection(
                                            "extraAdultCharge",
                                            "Apply B2B Pricing for Extra Adult Charge",
                                            extraAdultChargeB2bPricing,
                                            setExtraAdultChargeB2bPricing,
                                            b2bPricingFieldErrors.extraAdultCharge,
                                          )}
                                        {showNettRate &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "extraAdultCharge",
                                          ) && (
                                            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                              <IndianRupee className="w-3 h-3" aria-hidden />
                                              Nett: ₹
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

                                      {/* Free Child Rate - Conditionally rendered */}
                                      {shouldShowFreeChildRate() && (
                                        <div className="space-y-2.5 md:px-6">
                                          <FieldLabel icon={Baby} iconClassName="text-sky-600">
                                            {getFreeChildRateLabel()}
                                          </FieldLabel>
                                          <input
                                            type="text"
                                            value="Free"
                                            readOnly
                                            disabled
                                            className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-slate-50 text-sm font-medium text-slate-500 cursor-not-allowed"
                                          />
                                          {showNettRate && (
                                            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                              <IndianRupee className="w-3 h-3" aria-hidden />
                                              Nett: ₹0.00
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {/* Paid Child Rate - Conditionally rendered */}
                                      {shouldShowPaidChildRate() && (
                                        <div className="space-y-2.5 md:pl-6">
                                          <FieldLabel icon={Baby} iconClassName="text-amber-600">
                                            {getPaidChildRateLabel()}
                                          </FieldLabel>
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
                                              parsePositiveRateInput(
                                                e.target.value,
                                              ),
                                            )
                                          }
                                          placeholder=""
                                          min="1"
                                          disabled={isSubmitting}
                                          className="w-full px-4 py-3.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all hover:border-slate-400"
                                        />
                                        {showB2bDualPricing &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "paidChildCharge",
                                          ) &&
                                          renderB2bB2cPricingSection(
                                            "paidChildCharge",
                                            "Apply B2B Pricing for Paid Child Rate",
                                            paidChildChargeB2bPricing,
                                            setPaidChildChargeB2bPricing,
                                            b2bPricingFieldErrors.paidChildCharge,
                                          )}
                                        {showNettRate &&
                                          getFormValue(
                                            room.roomId,
                                            ratePlan.ratePlanId,
                                            "paidChildCharge",
                                          ) && (
                                            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                              <IndianRupee className="w-3 h-3" aria-hidden />
                                              Nett: ₹
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
                                      )}

                                    </div>
                                  </div>
                                )}

                                {/* Section: Restrictions - commented out */}
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
                        disabled={!canSubmit || isReadOnly}
                        className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-md flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" aria-hidden />
                            Apply Updates
                          </>
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
