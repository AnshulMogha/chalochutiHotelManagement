import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiDatePicker } from "@/components/ui/MultiDatePicker";
import {
  adminService,
  type CreatePromotionPayload,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  Loader2,
  ArrowLeft,
  Percent,
  Clock,
  Bird,
  CalendarDays,
  Settings,
  Tag,
} from "lucide-react";

const PROMOTION_TYPES = {
  basic: {
    title: "Basic Promotion",
    subtitle: "Offer recurring discounts to improve occupancy.",
    type: "BASIC" as const,
  },
  "last-minute": {
    title: "Create Last Minute Promotion",
    subtitle:
      "Sell empty rooms by offering discount, which can be booked up to 2 days before check-in.",
    type: "LAST_MINUTE" as const,
  },
  "early-bird": {
    title: "Create Early Bird Promotion",
    subtitle:
      "Get advance bookings from customers by offering discount to bookings made long before check-in.",
    type: "EARLY_BIRD" as const,
  },
  "long-stay": {
    title: "Create Long Stay Promotion",
    subtitle:
      "Target higher occupancy for longer stays with exclusive promotions",
    type: "LONG_STAY" as const,
  },
  // Special Audience Types
  member: {
    title: "Member Promotion",
    subtitle:
      "Attract more bookings with special discounts for registered members of MakeMyTrip & Golbibo.",
    type: "BASIC" as const,
    audienceType: "MEMBER" as const,
  },
  "holiday-flights": {
    title: "Holiday+Flights Promotion",
    subtitle:
      "We're the top choice for 1 out of every 3 holiday bookings and flight bookings made in India! Seize this opportunity to attract more guests by offering exclusive discounts.",
    type: "BASIC" as const,
    audienceType: "HOLIDAY_FLIGHTS" as const,
  },
  mobile: {
    title: "Mobile phones Promotion",
    subtitle:
      "More than 85% customers book through their mobile phones. Offer discounts to attract mobile bookers and increase your revenue.",
    type: "BASIC" as const,
    audienceType: "MOBILE" as const,
  },
  mypartner: {
    title: "MyPartner Promotion",
    subtitle: "",
    type: "BASIC" as const,
    audienceType: "MY_PARTNER" as const,
  },
};

function SectionCard({
  step,
  title,
  subtitle,
  children,
  accent = "blue",
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: "blue" | "purple" | "green" | "orange" | "pink";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    green: "bg-emerald-600",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center gap-4">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${colors[accent]}`}
        >
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function CreatePromotionPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(type === "mypartner");
  const [extraLoggedDiscounts, setExtraLoggedDiscounts] = useState<number[]>(
    [],
  );
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [wantBlackoutDates, setWantBlackoutDates] = useState<boolean>(false);
  const [applyAllRoomsAndRateplans, setApplyAllRoomsAndRateplans] = useState<
    "yes" | "no"
  >("yes");
  const [nonRefundableOption, setNonRefundableOption] = useState<"yes" | "no">(
    "no",
  );
  const [payAtHotelOption, setPayAtHotelOption] = useState<"yes" | "no">("yes");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansData, setRatePlansData] = useState<
    Record<string, RatePlan[]>
  >({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedRatePlanIds, setSelectedRatePlanIds] = useState<Set<string>>(
    new Set(),
  );
  const [loadingRooms, setLoadingRooms] = useState(false);
  const fetchingRoomsRef = useRef(false);

  const promotionConfig = type
    ? PROMOTION_TYPES[type as keyof typeof PROMOTION_TYPES]
    : null;
  const isMyPartner = type === "mypartner";

  // Set showAdvanced to true for MyPartner
  useEffect(() => {
    if (isMyPartner) {
      setShowAdvanced(true);
    }
  }, [isMyPartner]);

  // Fetch rooms when hotelId is available and "No" is selected
  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId || applyAllRoomsAndRateplans === "yes") {
        setRooms([]);
        setRatePlansData({});
        setSelectedRoomIds(new Set());
        setSelectedRatePlanIds(new Set());
        return;
      }

      // Prevent multiple simultaneous fetches
      if (fetchingRoomsRef.current) {
        return;
      }

      fetchingRoomsRef.current = true;
      setLoadingRooms(true);
      try {
        const data = await adminService.getHotelAdminRooms(hotelId);
        setRooms(data.rooms || []);

        // Fetch rate plans for each room
        const ratePlansPromises = (data.rooms || []).map(async (room) => {
          try {
            const ratePlansData = await adminService.getRoomRatePlans(
              hotelId,
              room.roomId,
            );
            return {
              roomId: room.roomId,
              ratePlans: ratePlansData.ratePlans || [],
            };
          } catch (error) {
            console.error(
              `Error fetching rate plans for room ${room.roomId}:`,
              error,
            );
            return { roomId: room.roomId, ratePlans: [] };
          }
        });

        const ratePlansResults = await Promise.all(ratePlansPromises);
        const ratePlansMap: Record<string, RatePlan[]> = {};
        ratePlansResults.forEach(({ roomId, ratePlans }) => {
          ratePlansMap[roomId] = ratePlans;
        });
        setRatePlansData(ratePlansMap);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        showToast("Failed to load rooms", "error");
      } finally {
        setLoadingRooms(false);
        fetchingRoomsRef.current = false;
      }
    };

    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, applyAllRoomsAndRateplans]);

  const today = new Date().toISOString().split("T")[0];

  // Debug logging
  useEffect(() => {
    console.log(
      "CreatePromotionPage - type:",
      type,
      "promotionConfig:",
      promotionConfig,
      "hotelId:",
      hotelId,
    );
  }, [type, promotionConfig, hotelId]);

  // Get default discount from URL if it's a special audience promotion
  const defaultDiscountParam = searchParams.get("defaultDiscount");
  const isSpecialAudience =
    type && ["member", "holiday-flights", "mobile", "mypartner"].includes(type);

  const [formData, setFormData] = useState<CreatePromotionPayload>({
    promotionType: promotionConfig?.type || "BASIC",
    offerType: "PERCENTAGE",
    discountAllUsers: defaultDiscountParam ? Number(defaultDiscountParam) : 10,
    discountLoggedUsers: 0,
    extraLoggedDiscount: 0,
    applicableDateType: "BOOKING_AND_STAY",
    stayStartDate: today,
    stayEndDate: "",
    bookingStartDate: today,
    bookingEndDate: "",
    noEndDateStay: false,
    noEndDateBooking: false,
    blackoutEnabled: false,
    nonRefundable: false,
    payAtHotel: true,
    applyAllRooms: true,
    applyAllRateplans: true,
    applyChannel: "B2C",
    contractsJson: ["B2C", "MOBILE", "IPOS"],
    promotionName: "",
    bookablePeriod: "TWO_DAYS",
    advanceDays: 5,
    offerFreeNights: false,
    freeNightsCount: 0,
    minimumStayDays: 2,
  });

  useEffect(() => {
    if (!type || !promotionConfig) {
      navigate("/promotions");
      return;
    }

    // Update promotion type in form data
    setFormData((prev) => {
      const discount = prev.discountAllUsers + prev.discountLoggedUsers;
      let defaultName = "";

      switch (type) {
        case "basic":
          defaultName = `Basic-${discount}%`;
          break;
        case "last-minute":
          const period =
            prev.bookablePeriod === "SAME_DAY"
              ? "Same Day"
              : prev.bookablePeriod === "ONE_DAY"
                ? "1 Day"
                : "2 Days";
          defaultName = `Last Minute-${discount}%-${period}`;
          break;
        case "early-bird":
          defaultName = `Early Bird-${discount}%-${prev.advanceDays} Days`;
          break;
        case "long-stay":
          defaultName = `LOS-${discount}%-${prev.minimumStayDays} Days`;
          break;
      }

      return {
        ...prev,
        promotionType: promotionConfig.type,
        promotionName: defaultName || prev.promotionName,
      };
    });
  }, [type, navigate, promotionConfig]);

  const getDefaultPromotionName = (): string => {
    const discount = formData.discountAllUsers + formData.discountLoggedUsers;
    switch (type) {
      case "basic":
        return `Basic-${discount}%`;
      case "last-minute":
        const period =
          formData.bookablePeriod === "SAME_DAY"
            ? "Same Day"
            : formData.bookablePeriod === "ONE_DAY"
              ? "1 Day"
              : "2 Days";
        return `Last Minute-${discount}%-${period}`;
      case "early-bird":
        return `Early Bird-${discount}%-${formData.advanceDays} Days`;
      case "long-stay":
        return `LOS-${discount}%-${formData.minimumStayDays} Days`;
      default:
        return "";
    }
  };

  useEffect(() => {
    const name = getDefaultPromotionName();
    if (name) {
      setFormData((prev) => ({ ...prev, promotionName: name }));
    }
  }, [
    formData.discountAllUsers,
    formData.discountLoggedUsers,
    formData.bookablePeriod,
    formData.advanceDays,
    formData.minimumStayDays,
    type,
  ]);

  const handleInputChange = (
    field: keyof CreatePromotionPayload,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddExtraDiscount = () => {
    setExtraLoggedDiscounts((prev) => [...prev, 0]);
  };

  const handleRemoveExtraDiscount = (index: number) => {
    setExtraLoggedDiscounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtraDiscountChange = (index: number, value: number) => {
    setExtraLoggedDiscounts((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!hotelId) {
      showToast("Hotel ID is required", "error");
      return;
    }

    if (!formData.promotionName.trim()) {
      showToast("Promotion name is required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: CreatePromotionPayload = {
        promotionType: formData.promotionType,
        offerType: isMyPartner ? "PERCENTAGE" : formData.offerType,
        discountAllUsers: formData.discountAllUsers,
        discountLoggedUsers: isMyPartner ? 0 : formData.discountLoggedUsers,
        extraLoggedDiscount: isMyPartner
          ? 0
          : extraLoggedDiscounts.reduce((sum, val) => sum + val, 0),
        audienceType:
          isSpecialAudience && promotionConfig?.audienceType
            ? promotionConfig.audienceType
            : undefined,
        applicableDateType: isMyPartner
          ? "BOOKING_AND_STAY"
          : formData.applicableDateType,
        stayStartDate: formData.stayStartDate || undefined,
        stayEndDate: isMyPartner
          ? formData.stayEndDate || undefined
          : formData.noEndDateStay
            ? undefined
            : formData.stayEndDate || undefined,
        bookingStartDate: isMyPartner
          ? formData.bookingStartDate || undefined
          : formData.applicableDateType === "STAY"
            ? undefined
            : formData.noEndDateBooking
              ? undefined
              : formData.bookingStartDate || undefined,
        bookingEndDate: isMyPartner
          ? formData.bookingEndDate || undefined
          : formData.applicableDateType === "STAY"
            ? undefined
            : formData.noEndDateBooking
              ? undefined
              : formData.bookingEndDate || undefined,
        noEndDateStay: isMyPartner ? false : formData.noEndDateStay,
        noEndDateBooking: isMyPartner
          ? false
          : formData.applicableDateType === "STAY"
            ? false
            : formData.noEndDateBooking,
        blackoutEnabled: isMyPartner
          ? blackoutDates.length > 0
          : wantBlackoutDates
            ? true
            : false,
        blackoutDates: isMyPartner
          ? blackoutDates.length > 0
            ? blackoutDates
            : undefined
          : wantBlackoutDates && blackoutDates.length > 0
            ? blackoutDates
            : undefined,
        nonRefundable: isMyPartner ? false : formData.nonRefundable,
        payAtHotel: isMyPartner ? true : formData.payAtHotel,
        applyAllRooms: isMyPartner ? true : applyAllRoomsAndRateplans === "yes",
        applyAllRateplans: isMyPartner
          ? true
          : applyAllRoomsAndRateplans === "yes",
        roomIds: isMyPartner
          ? undefined
          : applyAllRoomsAndRateplans === "no"
            ? Array.from(selectedRoomIds)
            : undefined,
        rateplanIds: isMyPartner
          ? undefined
          : applyAllRoomsAndRateplans === "no"
            ? Array.from(selectedRatePlanIds).map(Number)
            : undefined,
        applyChannel: isMyPartner ? "MY_PARTNER" : formData.applyChannel,
        contractsJson: isMyPartner
          ? []
          : formData.applyChannel === "B2C"
            ? formData.contractsJson
            : [],
        promotionName: formData.promotionName,
        ...(type === "last-minute" && {
          bookablePeriod: formData.bookablePeriod,
        }),
        ...(type === "early-bird" && { advanceDays: formData.advanceDays }),
        ...(type === "long-stay" && {
          offerFreeNights: formData.offerFreeNights,
          freeNightsCount: formData.offerFreeNights
            ? formData.freeNightsCount
            : undefined,
          minimumStayDays: formData.minimumStayDays,
        }),
      };

      await adminService.createPromotion(hotelId, payload);
      showToast("Promotion created successfully", "success");
      const url = isMyPartner
        ? hotelId
          ? `/promotions/special-audience?hotelId=${hotelId}`
          : `/promotions/special-audience`
        : isSpecialAudience
          ? hotelId
            ? `/promotions/special-audience?hotelId=${hotelId}`
            : `/promotions/special-audience`
          : hotelId
            ? `/promotions?hotelId=${hotelId}&tab=my-promotions`
            : `/promotions?tab=my-promotions`;
      navigate(url);
    } catch (error: any) {
      console.error("Error creating promotion:", error);
      showToast(
        error?.response?.data?.message || "Failed to create promotion",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Show loading or error state
  if (!type) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!promotionConfig) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">Invalid promotion type: "{type}"</p>
          <p className="text-sm text-gray-400 mb-4">
            Please go back and select a valid promotion.
          </p>
          <button
            onClick={() =>
              navigate(
                isSpecialAudience
                  ? "/promotions/special-audience"
                  : "/promotions",
              )
            }
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to{" "}
            {isSpecialAudience ? "Special Audience Promotions" : "Promotions"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f6fb]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        {!hotelId && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Hotel ID is missing. Please select a
              hotel from the dropdown above or go back to properties page.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="mb-8">
          <button
            onClick={() =>
              navigate(
                isSpecialAudience
                  ? "/promotions/special-audience"
                  : "/promotions",
              )
            }
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to promotions
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {promotionConfig.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {promotionConfig.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left — Form sections */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Promotion Name — always first */}
            <SectionCard step={1} title="Promotion Name" subtitle="Give this promotion a recognisable name" accent="pink">
              <Input
                type="text"
                value={formData.promotionName}
                onChange={(e) => handleInputChange("promotionName", e.target.value)}
                placeholder={isMyPartner ? "e.g. MyPartner-10%" : "e.g., Basic-10%, Last Minute-53%-2 Days"}
                required
                className="text-sm py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </SectionCard>

            {/* MyPartner Simplified Form */}
            {isMyPartner ? (
              <>
                {/* Offer Value */}
                <SectionCard
                  step={2}
                  title="Offer Value"
                  subtitle="Set the discount percentage for agents"
                  accent="blue"
                >
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Enter offer value
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <button
                      type="button"
                      onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold shrink-0"
                    >−</button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.discountAllUsers}
                        onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))}
                        className="w-full text-center text-lg font-bold py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 pr-6"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange("discountAllUsers", Math.min(100, formData.discountAllUsers + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold shrink-0"
                    >+</button>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      myPartner discounts increase chances of higher occupancy
                      through regular business from our network of travel agents
                    </p>
                  </div>
                </SectionCard>

                {/* Advanced Settings - Always visible for MyPartner */}
                <SectionCard
                  step={3}
                  title="Advanced Settings"
                  subtitle="Configure dates and blackout periods"
                  accent="purple"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      Optional settings to fine-tune your promotion
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {showAdvanced ? "Hide" : "Show"} settings
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-6 pt-6 border-t border-gray-200">
                      {/* Stay Date Section */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Applicable for Stay Start Date
                        </label>
                        <Input
                          type="date"
                          value={formData.stayStartDate || today}
                          onChange={(e) =>
                            handleInputChange("stayStartDate", e.target.value)
                          }
                          min={today}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Applicable for Stay End Date
                        </label>
                        <Input
                          type="date"
                          value={formData.stayEndDate || ""}
                          onChange={(e) =>
                            handleInputChange("stayEndDate", e.target.value)
                          }
                          min={formData.stayStartDate || today}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Applicable for Booking Start Date
                        </label>
                        <Input
                          type="date"
                          value={formData.bookingStartDate || today}
                          onChange={(e) =>
                            handleInputChange(
                              "bookingStartDate",
                              e.target.value,
                            )
                          }
                          min={today}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Applicable for Booking End Date
                        </label>
                        <Input
                          type="date"
                          value={formData.bookingEndDate || ""}
                          onChange={(e) =>
                            handleInputChange("bookingEndDate", e.target.value)
                          }
                          min={formData.bookingStartDate || today}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Choose Blackout Dates
                        </label>
                        <MultiDatePicker
                          selectedDates={blackoutDates}
                          onChange={setBlackoutDates}
                          minDate={new Date(today)}
                        />
                      </div>
                    </div>
                  )}
                </SectionCard>

              </>
            ) : (
              <>
                {/* Basic: offer type toggle + discounts — merged step 2 */}
                {type === "basic" && (
                  <SectionCard step={2} title="Configure Discount" subtitle="Choose type and set discount values" accent="blue">
                    <div className="flex gap-2 mb-4">
                      {(["PERCENTAGE", "FIXED"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleInputChange("offerType", opt)}
                          className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                            formData.offerType === opt
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          {opt === "PERCENTAGE" ? "Percentage %" : "Fixed ₹"}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">All users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - (formData.offerType === "FIXED" ? 10 : 1)))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={formData.offerType === "FIXED" ? undefined : 100} value={formData.discountAllUsers} onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{formData.offerType === "FIXED" ? "₹" : "%"}</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", formData.discountAllUsers + (formData.offerType === "FIXED" ? 10 : 1))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                        <p className="text-xs font-medium text-blue-600 mb-2">Logged-in users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", Math.max(0, formData.discountLoggedUsers - (formData.offerType === "FIXED" ? 10 : 1)))} className="w-7 h-7 rounded-md border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={formData.offerType === "FIXED" ? undefined : 100} value={formData.discountLoggedUsers} onChange={(e) => handleInputChange("discountLoggedUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400">{formData.offerType === "FIXED" ? "₹" : "%"}</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", formData.discountLoggedUsers + (formData.offerType === "FIXED" ? 10 : 1))} className="w-7 h-7 rounded-md border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                    </div>
                    {extraLoggedDiscounts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {extraLoggedDiscounts.map((discount, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-20 shrink-0">Extra tier {index + 1}</span>
                            <div className="flex items-center gap-1 flex-1">
                              <button type="button" onClick={() => handleRemoveExtraDiscount(index)} className="w-7 h-7 rounded-md border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50 text-sm font-bold shrink-0">−</button>
                              <div className="relative flex-1">
                                <input type="number" min={0} max={formData.offerType === "FIXED" ? undefined : 100} value={discount} onChange={(e) => handleExtraDiscountChange(index, Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 pr-5" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{formData.offerType === "FIXED" ? "₹" : "%"}</span>
                              </div>
                              <button type="button" onClick={() => handleAddExtraDiscount()} className="w-7 h-7 rounded-md border border-green-200 flex items-center justify-center text-green-600 hover:bg-green-50 text-sm font-bold shrink-0">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Long Stay: offer type toggle + discount or free nights — merged step 2 */}
                {type === "long-stay" && (
                  <SectionCard step={2} title="Configure Offer" subtitle="Choose offer type and set values" accent="orange">
                    <div className="flex gap-2 mb-4">
                      <button type="button" onClick={() => handleInputChange("offerFreeNights", false)} className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${!formData.offerFreeNights ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-orange-300 hover:bg-orange-50"}`}>
                        Offer Discount
                      </button>
                      <button type="button" onClick={() => handleInputChange("offerFreeNights", true)} className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${formData.offerFreeNights ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:border-orange-300 hover:bg-orange-50"}`}>
                        Free Nights
                      </button>
                    </div>
                    {!formData.offerFreeNights && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">All users</p>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - 1))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">−</button>
                            <div className="relative flex-1">
                              <input type="number" min={0} max={100} value={formData.discountAllUsers} onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 pr-5" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                            </div>
                            <button type="button" onClick={() => handleInputChange("discountAllUsers", formData.discountAllUsers + 1)} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">+</button>
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                          <p className="text-xs font-medium text-orange-600 mb-2">Logged-in users</p>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleInputChange("discountLoggedUsers", Math.max(0, formData.discountLoggedUsers - 1))} className="w-7 h-7 rounded-md border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100 text-sm font-bold shrink-0">−</button>
                            <div className="relative flex-1">
                              <input type="number" min={0} max={100} value={formData.discountLoggedUsers} onChange={(e) => handleInputChange("discountLoggedUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-orange-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white pr-5" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-400">%</span>
                            </div>
                            <button type="button" onClick={() => handleInputChange("discountLoggedUsers", formData.discountLoggedUsers + 1)} className="w-7 h-7 rounded-md border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100 text-sm font-bold shrink-0">+</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {formData.offerFreeNights && (
                      <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 border border-orange-200">
                        <p className="text-xs font-medium text-orange-600 flex-1">Number of free nights</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("freeNightsCount", Math.max(1, (formData.freeNightsCount || 1) - 1))} className="w-7 h-7 rounded-md border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100 text-sm font-bold">−</button>
                          <input type="number" min={1} value={formData.freeNightsCount || 1} onChange={(e) => handleInputChange("freeNightsCount", Number(e.target.value))} className="w-16 text-center text-sm font-bold py-1.5 border border-orange-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white" />
                          <button type="button" onClick={() => handleInputChange("freeNightsCount", (formData.freeNightsCount || 1) + 1)} className="w-7 h-7 rounded-md border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100 text-sm font-bold">+</button>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Last Minute: discount + bookable period — merged step 2 */}
                {type === "last-minute" && (
                  <SectionCard step={2} title="Discount & Booking Window" subtitle="Set discount and when bookings qualify" accent="purple">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">All users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - 1))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={100} value={formData.discountAllUsers} onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-400 pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", formData.discountAllUsers + 1)} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                        <p className="text-xs font-medium text-purple-600 mb-2">Logged-in users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", Math.max(0, formData.discountLoggedUsers - 1))} className="w-7 h-7 rounded-md border border-purple-200 flex items-center justify-center text-purple-600 hover:bg-purple-100 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={100} value={formData.discountLoggedUsers} onChange={(e) => handleInputChange("discountLoggedUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-purple-200 rounded-lg focus:outline-none focus:border-purple-400 bg-white pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-400">%</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", formData.discountLoggedUsers + 1)} className="w-7 h-7 rounded-md border border-purple-200 flex items-center justify-center text-purple-600 hover:bg-purple-100 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bookable Window</p>
                    <div className="flex gap-2">
                      {([
                        { value: "SAME_DAY", label: "Same day" },
                        { value: "ONE_DAY", label: "1 day before" },
                        { value: "TWO_DAYS", label: "2 days before" },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange("bookablePeriod", option.value as any)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                            formData.bookablePeriod === option.value
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-300 hover:border-purple-300 hover:bg-purple-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Early Bird: discount + advance days — merged step 2 */}
                {type === "early-bird" && (
                  <SectionCard step={2} title="Discount & Advance Booking" subtitle="Set discount and minimum booking lead time" accent="green">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">All users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - 1))} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={100} value={formData.discountAllUsers} onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-green-400 pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountAllUsers", formData.discountAllUsers + 1)} className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                        <p className="text-xs font-medium text-emerald-600 mb-2">Logged-in users</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", Math.max(0, formData.discountLoggedUsers - 1))} className="w-7 h-7 rounded-md border border-emerald-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 text-sm font-bold shrink-0">−</button>
                          <div className="relative flex-1">
                            <input type="number" min={0} max={100} value={formData.discountLoggedUsers} onChange={(e) => handleInputChange("discountLoggedUsers", Number(e.target.value))} className="w-full text-center text-sm font-bold py-1.5 border border-emerald-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white pr-5" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400">%</span>
                          </div>
                          <button type="button" onClick={() => handleInputChange("discountLoggedUsers", formData.discountLoggedUsers + 1)} className="w-7 h-7 rounded-md border border-emerald-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 text-sm font-bold shrink-0">+</button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Advance booking required</p>
                    <div className="flex gap-2 flex-wrap">
                      {[5, 7, 14, 21, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleInputChange("advanceDays", days)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            formData.advanceDays === days
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-300 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {days}+ days
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                )}


                {/* Minimum Stay - Long Stay */}
                {type === "long-stay" && (
                  <SectionCard
                    step={3}
                    title="Minimum Stay Duration"
                    subtitle="Select the minimum number of nights required"
                    accent="orange"
                  >
                    <div className="flex gap-2 flex-wrap">
                      {[2, 3, 4, 5, 7].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleInputChange("minimumStayDays", days)}
                          className={`relative px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                            formData.minimumStayDays === days
                              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                              : "bg-white text-gray-600 border-gray-300 hover:border-orange-300 hover:bg-orange-50"
                          }`}
                        >
                          {days}+ nights
                          {days === 3 && (
                            <span className="ml-1 text-[10px] opacity-80">★</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Promotion Validity */}
                <SectionCard
                  step={
                    type === "last-minute" || type === "early-bird"
                      ? 3
                      : type === "long-stay"
                        ? 4
                        : 3
                  }
                  title="Promotion Dates"
                  subtitle="Specify the validity period for this promotion"
                  accent="blue"
                >
                  {/* Applicable Date Type — compact pill toggle */}
                  <div className="flex gap-2 mb-4">
                    {([
                      { value: "STAY", label: "Stay Date only" },
                      { value: "BOOKING_AND_STAY", label: "Booking + Stay" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleInputChange("applicableDateType", opt.value)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${
                          formData.applicableDateType === opt.value
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {/* Stay Date row */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Stay Date</span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <span className="text-[10px] text-gray-400">No end</span>
                          <div className="relative">
                            <input type="checkbox" checked={formData.noEndDateStay} onChange={(e) => handleInputChange("noEndDateStay", e.target.checked)} className="sr-only" />
                            <div className={`w-7 h-3.5 rounded-full transition-colors duration-200 ${formData.noEndDateStay ? "bg-blue-500" : "bg-gray-300"}`}>
                              <div className={`w-2.5 h-2.5 bg-white rounded-full shadow mt-0.5 transition-transform duration-200 ${formData.noEndDateStay ? "translate-x-3.5" : "translate-x-0.5"}`} />
                            </div>
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-400 mb-1">From</p>
                          <input type="date" value={formData.stayStartDate || today} onChange={(e) => handleInputChange("stayStartDate", e.target.value)} min={today} className="w-full text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer" />
                        </div>
                        <span className="text-gray-300 text-sm mt-4">→</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-400 mb-1">To</p>
                          {formData.noEndDateStay ? (
                            <div className="border border-dashed border-blue-200 bg-blue-50 rounded-lg px-2.5 py-1.5 text-[10px] text-blue-500 font-medium">Open-ended</div>
                          ) : (
                            <input type="date" value={formData.stayEndDate || ""} onChange={(e) => handleInputChange("stayEndDate", e.target.value)} min={formData.stayStartDate || today} className="w-full text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Booking Date row — only when BOOKING_AND_STAY */}
                    {formData.applicableDateType === "BOOKING_AND_STAY" && (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Booking Date</span>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <span className="text-[10px] text-gray-400">No end</span>
                            <div className="relative">
                              <input type="checkbox" checked={formData.noEndDateBooking} onChange={(e) => handleInputChange("noEndDateBooking", e.target.checked)} className="sr-only" />
                              <div className={`w-7 h-3.5 rounded-full transition-colors duration-200 ${formData.noEndDateBooking ? "bg-blue-500" : "bg-gray-300"}`}>
                                <div className={`w-2.5 h-2.5 bg-white rounded-full shadow mt-0.5 transition-transform duration-200 ${formData.noEndDateBooking ? "translate-x-3.5" : "translate-x-0.5"}`} />
                              </div>
                            </div>
                          </label>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-400 mb-1">From</p>
                            <input type="date" value={formData.bookingStartDate || today} onChange={(e) => handleInputChange("bookingStartDate", e.target.value)} min={today} className="w-full text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer" />
                          </div>
                          <span className="text-gray-300 text-sm mt-4">→</span>
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-400 mb-1">To</p>
                            {formData.noEndDateBooking ? (
                              <div className="border border-dashed border-blue-200 bg-blue-50 rounded-lg px-2.5 py-1.5 text-[10px] text-blue-500 font-medium">Open-ended</div>
                            ) : (
                              <input type="date" value={formData.bookingEndDate || ""} onChange={(e) => handleInputChange("bookingEndDate", e.target.value)} min={formData.bookingStartDate || today} className="w-full text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Advanced Settings */}
                <SectionCard
                  step={
                    type === "last-minute" || type === "early-bird"
                      ? 4
                      : type === "long-stay"
                        ? 5
                        : 4
                  }
                  title="Advanced Settings"
                  subtitle="Rooms, rate plans, blackout dates and more"
                  accent="blue"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      Optional — configure scope and restrictions
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {showAdvanced ? "Hide" : "Show"} settings
                    </button>
                  </div>
                  {showAdvanced && (
                    <div className="space-y-6 pt-6 border-t border-gray-200">
                      {/* Apply to all rooms and rate plans */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Do you want to apply to all rooms and rate plans?
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyAllRoomsAndRateplans"
                              checked={applyAllRoomsAndRateplans === "yes"}
                              onChange={() =>
                                setApplyAllRoomsAndRateplans("yes")
                              }
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyAllRoomsAndRateplans"
                              checked={applyAllRoomsAndRateplans === "no"}
                              onChange={() =>
                                setApplyAllRoomsAndRateplans("no")
                              }
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">No</span>
                          </label>
                        </div>
                      </div>

                      {/* Room and Rate Plan Selection - Show when "No" is selected */}
                      {applyAllRoomsAndRateplans === "no" && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <label className="block text-sm font-semibold text-gray-700 mb-4">
                            Select Rooms and Rate Plans
                          </label>
                          {!hotelId ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                              Please select a hotel first to view rooms and rate
                              plans.
                            </div>
                          ) : loadingRooms ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                          ) : rooms.length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                              No rooms available for this hotel.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                              {rooms.map((room) => {
                                const roomRatePlans =
                                  ratePlansData[room.roomId] || [];
                                const isRoomSelected = selectedRoomIds.has(
                                  room.roomId,
                                );

                                return (
                                  <div
                                    key={room.roomId}
                                    className="border border-gray-200 rounded-lg p-3 bg-white"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                      <input
                                        type="checkbox"
                                        checked={isRoomSelected}
                                        onChange={(e) => {
                                          const newSelectedRoomIds = new Set(
                                            selectedRoomIds,
                                          );
                                          const newSelectedRatePlanIds =
                                            new Set(selectedRatePlanIds);
                                          if (e.target.checked) {
                                            newSelectedRoomIds.add(room.roomId);
                                            // Select all rate plans for this room
                                            roomRatePlans.forEach((rp) => {
                                              newSelectedRatePlanIds.add(
                                                rp.ratePlanId.toString(),
                                              );
                                            });
                                          } else {
                                            newSelectedRoomIds.delete(
                                              room.roomId,
                                            );
                                            // Deselect all rate plans for this room
                                            roomRatePlans.forEach((rp) => {
                                              newSelectedRatePlanIds.delete(
                                                rp.ratePlanId.toString(),
                                              );
                                            });
                                          }
                                          setSelectedRoomIds(
                                            newSelectedRoomIds,
                                          );
                                          setSelectedRatePlanIds(
                                            newSelectedRatePlanIds,
                                          );
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-semibold text-gray-900">
                                        {room.roomName}
                                      </span>
                                    </label>
                                    {roomRatePlans.length > 0 && (
                                      <div className="ml-6 mt-2 space-y-1">
                                        {roomRatePlans.map((ratePlan) => (
                                          <label
                                            key={ratePlan.ratePlanId}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selectedRatePlanIds.has(
                                                ratePlan.ratePlanId.toString(),
                                              )}
                                              onChange={(e) => {
                                                const newSelectedRatePlanIds =
                                                  new Set(selectedRatePlanIds);
                                                if (e.target.checked) {
                                                  newSelectedRatePlanIds.add(
                                                    ratePlan.ratePlanId.toString(),
                                                  );
                                                } else {
                                                  newSelectedRatePlanIds.delete(
                                                    ratePlan.ratePlanId.toString(),
                                                  );
                                                  // If deselecting a rate plan, also deselect the room
                                                  if (isRoomSelected) {
                                                    setSelectedRoomIds(
                                                      (prev) => {
                                                        const newSet = new Set(
                                                          prev,
                                                        );
                                                        newSet.delete(
                                                          room.roomId,
                                                        );
                                                        return newSet;
                                                      },
                                                    );
                                                  }
                                                }
                                                setSelectedRatePlanIds(
                                                  newSelectedRatePlanIds,
                                                );
                                              }}
                                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700">
                                              {ratePlan.ratePlanName}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Blackout dates */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Do you want to blackout the offer for specific stay
                          dates?
                        </label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="wantBlackoutDates"
                              checked={wantBlackoutDates === true}
                              onChange={() => {
                                setWantBlackoutDates(true);
                                if (blackoutDates.length === 0) {
                                  setBlackoutDates([today]);
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="wantBlackoutDates"
                              checked={wantBlackoutDates === false}
                              onChange={() => {
                                setWantBlackoutDates(false);
                                setBlackoutDates([]);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">No</span>
                          </label>
                        </div>

                        {/* Date picker - only show when Yes is selected */}
                        {wantBlackoutDates && (
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Choose Blackout Dates
                            </label>
                            <MultiDatePicker
                              selectedDates={blackoutDates}
                              onChange={setBlackoutDates}
                              minDate={new Date(today)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Where do you want to apply the promotion */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Where do you want to apply the promotion?
                        </label>
                        <div className="flex flex-wrap gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyChannel"
                              value="B2C"
                              checked={formData.applyChannel === "B2C"}
                              onChange={(e) => {
                                handleInputChange(
                                  "applyChannel",
                                  e.target.value,
                                );
                                // Reset contractsJson when switching away from B2C
                                if (e.target.value !== "B2C") {
                                  handleInputChange("contractsJson", []);
                                } else {
                                  // Set default contracts when selecting B2C
                                  handleInputChange("contractsJson", [
                                    "B2C",
                                    "MOBILE",
                                    "IPOS",
                                  ]);
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">B2C</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyChannel"
                              value="BUNDLED_RATES"
                              checked={
                                formData.applyChannel === "BUNDLED_RATES"
                              }
                              onChange={(e) => {
                                handleInputChange(
                                  "applyChannel",
                                  e.target.value,
                                );
                                handleInputChange("contractsJson", []);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              Bundled Rates
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyChannel"
                              value="MY_BIZ"
                              checked={formData.applyChannel === "MY_BIZ"}
                              onChange={(e) => {
                                handleInputChange(
                                  "applyChannel",
                                  e.target.value,
                                );
                                handleInputChange("contractsJson", []);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              My Biz
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyChannel"
                              value="MY_PARTNER"
                              checked={formData.applyChannel === "MY_PARTNER"}
                              onChange={(e) => {
                                handleInputChange(
                                  "applyChannel",
                                  e.target.value,
                                );
                                handleInputChange("contractsJson", []);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              My Partner
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="applyChannel"
                              value="B2B"
                              checked={formData.applyChannel === "B2B"}
                              onChange={(e) => {
                                handleInputChange(
                                  "applyChannel",
                                  e.target.value,
                                );
                                handleInputChange("contractsJson", []);
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">B2B</span>
                          </label>
                        </div>

                        {/* Contract checkboxes - Show only when B2C is selected */}
                        {formData.applyChannel === "B2C" && (
                          <div className="mt-4 pl-2">
                            <div className="flex flex-wrap gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    formData.contractsJson?.includes("B2C") ||
                                    false
                                  }
                                  onChange={(e) => {
                                    const currentContracts =
                                      formData.contractsJson || [];
                                    if (e.target.checked) {
                                      handleInputChange("contractsJson", [
                                        ...currentContracts,
                                        "B2C",
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "contractsJson",
                                        currentContracts.filter(
                                          (c) => c !== "B2C",
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                  B2C Contract
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    formData.contractsJson?.includes(
                                      "MOBILE",
                                    ) || false
                                  }
                                  onChange={(e) => {
                                    const currentContracts =
                                      formData.contractsJson || [];
                                    if (e.target.checked) {
                                      handleInputChange("contractsJson", [
                                        ...currentContracts,
                                        "MOBILE",
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "contractsJson",
                                        currentContracts.filter(
                                          (c) => c !== "MOBILE",
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                  Mobile Contract
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    formData.contractsJson?.includes("IPOS") ||
                                    false
                                  }
                                  onChange={(e) => {
                                    const currentContracts =
                                      formData.contractsJson || [];
                                    if (e.target.checked) {
                                      handleInputChange("contractsJson", [
                                        ...currentContracts,
                                        "IPOS",
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "contractsJson",
                                        currentContracts.filter(
                                          (c) => c !== "IPOS",
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                  IPOS Contract
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Non-refundable */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Do you want to make this non-refundable?
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="nonRefundable"
                              checked={nonRefundableOption === "yes"}
                              onChange={() => setNonRefundableOption("yes")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="nonRefundable"
                              checked={nonRefundableOption === "no"}
                              onChange={() => setNonRefundableOption("no")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">No</span>
                          </label>
                        </div>
                      </div>

                      {/* Pay at hotel */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Do you want to enable pay at hotel?
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="payAtHotel"
                              checked={payAtHotelOption === "yes"}
                              onChange={() => setPayAtHotelOption("yes")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="payAtHotel"
                              checked={payAtHotelOption === "no"}
                              onChange={() => setPayAtHotelOption("no")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>

          {/* Right — Sticky Summary Panel */}
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-linear-to-r from-blue-600 to-indigo-600">
                  <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-0.5">
                    Live Preview
                  </p>
                  <h3 className="text-base font-bold text-white">
                    {formData.promotionName || "Untitled Promotion"}
                  </h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {type?.replace("-", " ") || "—"}
                    </span>
                  </div>
                  {!isMyPartner && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Offer Type</span>
                      <span className="font-medium text-gray-800">
                        {formData.offerType || "—"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Discount (All)</span>
                    <span className="font-semibold text-blue-600">
                      {formData.discountAllUsers
                        ? `${formData.discountAllUsers}${formData.offerType === "FIXED" ? " ₹" : "%"}`
                        : "—"}
                    </span>
                  </div>
                  {!isMyPartner && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Discount (Logged in)
                      </span>
                      <span className="font-semibold text-indigo-600">
                        {formData.discountLoggedUsers
                          ? `${formData.discountLoggedUsers}${formData.offerType === "FIXED" ? " ₹" : "%"}`
                          : "—"}
                      </span>
                    </div>
                  )}
                  {formData.stayStartDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Stay From</span>
                      <span className="font-medium text-gray-800">
                        {formData.stayStartDate}
                      </span>
                    </div>
                  )}
                  {formData.stayEndDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Stay Until</span>
                      <span className="font-medium text-gray-800">
                        {formData.stayEndDate}
                      </span>
                    </div>
                  )}
                  {formData.bookingStartDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Book From</span>
                      <span className="font-medium text-gray-800">
                        {formData.bookingStartDate}
                      </span>
                    </div>
                  )}
                  {blackoutDates.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Blackout Dates</span>
                      <span className="font-medium text-gray-800">
                        {blackoutDates.length} date(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons in sidebar */}
              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    "Create Promotion"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      isMyPartner
                        ? "/promotions/special-audience"
                        : "/promotions",
                    )
                  }
                  className="w-full py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
