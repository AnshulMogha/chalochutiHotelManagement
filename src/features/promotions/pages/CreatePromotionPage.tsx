import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { MultiDatePicker } from "@/components/ui/MultiDatePicker";
import { adminService, type CreatePromotionPayload, type HotelRoom, type RatePlan } from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";
import { Loader2, ArrowLeft, Calendar, Info, Percent, Clock, Bird, CalendarDays, Settings, Tag } from "lucide-react";

const PROMOTION_TYPES = {
  basic: {
    title: "Basic Promotion",
    subtitle: "Offer recurring discounts to improve occupancy.",
    type: "BASIC" as const,
  },
  "last-minute": {
    title: "Create Last Minute Promotion",
    subtitle: "Sell empty rooms by offering discount, which can be booked up to 2 days before check-in.",
    type: "LAST_MINUTE" as const,
  },
  "early-bird": {
    title: "Create Early Bird Promotion",
    subtitle: "Get advance bookings from customers by offering discount to bookings made long before check-in.",
    type: "EARLY_BIRD" as const,
  },
  "long-stay": {
    title: "Create Long Stay Promotion",
    subtitle: "Target higher occupancy for longer stays with exclusive promotions",
    type: "LONG_STAY" as const,
  },
  // Special Audience Types
  member: {
    title: "Member Promotion",
    subtitle: "Attract more bookings with special discounts for registered members of MakeMyTrip & Golbibo.",
    type: "BASIC" as const,
    audienceType: "MEMBER" as const,
  },
  "holiday-flights": {
    title: "Holiday+Flights Promotion",
    subtitle: "We're the top choice for 1 out of every 3 holiday bookings and flight bookings made in India! Seize this opportunity to attract more guests by offering exclusive discounts.",
    type: "BASIC" as const,
    audienceType: "HOLIDAY_FLIGHTS" as const,
  },
  mobile: {
    title: "Mobile phones Promotion",
    subtitle: "More than 85% customers book through their mobile phones. Offer discounts to attract mobile bookers and increase your revenue.",
    type: "BASIC" as const,
    audienceType: "MOBILE" as const,
  },
  mypartner: {
    title: "MyPartner Promotion",
    subtitle: "We're among India's largest agent networks, with 40,000+ agents across 550+ cities. Offer discounts to expand your reach among customers.",
    type: "BASIC" as const,
    audienceType: "MY_PARTNER" as const,
  },
};

export default function CreatePromotionPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(type === "mypartner");
  const [extraLoggedDiscounts, setExtraLoggedDiscounts] = useState<number[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [wantBlackoutDates, setWantBlackoutDates] = useState<boolean>(false);
  const [applyAllRoomsAndRateplans, setApplyAllRoomsAndRateplans] = useState<"yes" | "no">("yes");
  const [nonRefundableOption, setNonRefundableOption] = useState<"yes" | "no">("no");
  const [payAtHotelOption, setPayAtHotelOption] = useState<"yes" | "no">("yes");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansData, setRatePlansData] = useState<Record<string, RatePlan[]>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRatePlanIds, setSelectedRatePlanIds] = useState<Set<string>>(new Set());
  const [loadingRooms, setLoadingRooms] = useState(false);
  const fetchingRoomsRef = useRef(false);

  const promotionConfig = type ? PROMOTION_TYPES[type as keyof typeof PROMOTION_TYPES] : null;
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
            const ratePlansData = await adminService.getRoomRatePlans(hotelId, room.roomId);
            return { roomId: room.roomId, ratePlans: ratePlansData.ratePlans || [] };
          } catch (error) {
            console.error(`Error fetching rate plans for room ${room.roomId}:`, error);
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
    console.log("CreatePromotionPage - type:", type, "promotionConfig:", promotionConfig, "hotelId:", hotelId);
  }, [type, promotionConfig, hotelId]);

  // Get default discount from URL if it's a special audience promotion
  const defaultDiscountParam = searchParams.get("defaultDiscount");
  const isSpecialAudience = type && ["member", "holiday-flights", "mobile", "mypartner"].includes(type);

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
          const period = prev.bookablePeriod === "SAME_DAY" ? "Same Day" : 
                        prev.bookablePeriod === "ONE_DAY" ? "1 Day" : "2 Days";
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
        const period = formData.bookablePeriod === "SAME_DAY" ? "Same Day" : 
                      formData.bookablePeriod === "ONE_DAY" ? "1 Day" : "2 Days";
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
  }, [formData.discountAllUsers, formData.discountLoggedUsers, formData.bookablePeriod, formData.advanceDays, formData.minimumStayDays, type]);

  const handleInputChange = (field: keyof CreatePromotionPayload, value: any) => {
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
        extraLoggedDiscount: isMyPartner ? 0 : extraLoggedDiscounts.reduce((sum, val) => sum + val, 0),
        audienceType: isSpecialAudience && promotionConfig?.audienceType ? promotionConfig.audienceType : undefined,
        applicableDateType: isMyPartner ? "BOOKING_AND_STAY" : formData.applicableDateType,
        stayStartDate: formData.stayStartDate || undefined,
        stayEndDate: isMyPartner ? (formData.stayEndDate || undefined) : (formData.noEndDateStay ? undefined : (formData.stayEndDate || undefined)),
        bookingStartDate: isMyPartner ? (formData.bookingStartDate || undefined) : (formData.applicableDateType === "STAY" ? undefined : (formData.noEndDateBooking ? undefined : (formData.bookingStartDate || undefined))),
        bookingEndDate: isMyPartner ? (formData.bookingEndDate || undefined) : (formData.applicableDateType === "STAY" ? undefined : (formData.noEndDateBooking ? undefined : (formData.bookingEndDate || undefined))),
        noEndDateStay: isMyPartner ? false : formData.noEndDateStay,
        noEndDateBooking: isMyPartner ? false : (formData.applicableDateType === "STAY" ? false : formData.noEndDateBooking),
        blackoutEnabled: isMyPartner ? (blackoutDates.length > 0) : (wantBlackoutDates ? true : false),
        blackoutDates: isMyPartner ? (blackoutDates.length > 0 ? blackoutDates : undefined) : (wantBlackoutDates && blackoutDates.length > 0 ? blackoutDates : undefined),
        nonRefundable: isMyPartner ? false : formData.nonRefundable,
        payAtHotel: isMyPartner ? true : formData.payAtHotel,
        applyAllRooms: isMyPartner ? true : (applyAllRoomsAndRateplans === "yes"),
        applyAllRateplans: isMyPartner ? true : (applyAllRoomsAndRateplans === "yes"),
        roomIds: isMyPartner ? undefined : (applyAllRoomsAndRateplans === "no" ? Array.from(selectedRoomIds) : undefined),
        rateplanIds: isMyPartner ? undefined : (applyAllRoomsAndRateplans === "no" ? Array.from(selectedRatePlanIds).map(Number) : undefined),
        applyChannel: isMyPartner ? "MY_PARTNER" : formData.applyChannel,
        contractsJson: isMyPartner ? [] : (formData.applyChannel === "B2C" ? formData.contractsJson : []),
        promotionName: formData.promotionName,
        ...(type === "last-minute" && { bookablePeriod: formData.bookablePeriod }),
        ...(type === "early-bird" && { advanceDays: formData.advanceDays }),
        ...(type === "long-stay" && {
          offerFreeNights: formData.offerFreeNights,
          freeNightsCount: formData.offerFreeNights ? formData.freeNightsCount : undefined,
          minimumStayDays: formData.minimumStayDays,
        }),
      };

      await adminService.createPromotion(hotelId, payload);
      showToast("Promotion created successfully", "success");
      const url = isMyPartner
        ? (hotelId
            ? `/promotions/special-audience?hotelId=${hotelId}`
            : `/promotions/special-audience`)
        : isSpecialAudience
        ? (hotelId
            ? `/promotions/special-audience?hotelId=${hotelId}`
            : `/promotions/special-audience`)
        : (hotelId
            ? `/promotions?hotelId=${hotelId}&tab=my-promotions`
            : `/promotions?tab=my-promotions`);
      navigate(url);
    } catch (error: any) {
      console.error("Error creating promotion:", error);
      showToast(error?.response?.data?.message || "Failed to create promotion", "error");
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
          <p className="text-sm text-gray-400 mb-4">Please go back and select a valid promotion.</p>
          <button
            onClick={() => navigate(isSpecialAudience ? "/promotions/special-audience" : "/promotions")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to {isSpecialAudience ? "Special Audience Promotions" : "Promotions"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      {!hotelId && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> Hotel ID is missing. Please select a hotel from the dropdown above or go back to properties page.
          </p>
        </div>
      )}
      <div className="mb-8">
        <button
          onClick={() => navigate(isSpecialAudience ? "/promotions/special-audience" : "/promotions")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{promotionConfig.title}</h1>
          <p className="text-gray-600 text-base">{promotionConfig.subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* MyPartner Simplified Form */}
        {isMyPartner ? (
          <>
            {/* Offer Value */}
            <Card variant="outlined" className="p-6 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Enter Offer value
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - 1))}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                >
                  −
                </button>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.discountAllUsers}
                    onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))}
                    className="text-center text-2xl font-bold py-4 border-2 border-gray-300 focus:border-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-lg">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange("discountAllUsers", Math.min(100, formData.discountAllUsers + 1))}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                >
                  +
                </button>
              </div>
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  myPartner discounts increase chances of higher occupancy through regular business from our network of travel agents
                </p>
              </div>
            </Card>

            {/* Advanced Settings - Always visible for MyPartner */}
            <Card variant="outlined" className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Advance Settings</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
                >
                  {showAdvanced ? "HIDE ADVANCE SETTINGS" : "SHOW ADVANCE SETTINGS"}
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
                      onChange={(e) => handleInputChange("stayStartDate", e.target.value)}
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
                      onChange={(e) => handleInputChange("stayEndDate", e.target.value)}
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
                      onChange={(e) => handleInputChange("bookingStartDate", e.target.value)}
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
                      onChange={(e) => handleInputChange("bookingEndDate", e.target.value)}
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
            </Card>

            {/* Promotion Name */}
            <Card variant="outlined" className="p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Tag className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Promotion Name</h3>
                  <p className="text-sm text-gray-500">Enter a name for this promotion *</p>
                </div>
              </div>
              <Input
                type="text"
                value={formData.promotionName}
                onChange={(e) => handleInputChange("promotionName", e.target.value)}
                placeholder="Enter promotion name"
                required
                className="text-base py-3 border-2 focus:border-blue-500"
              />
            </Card>

            {/* Action Buttons for MyPartner */}
            <div className="flex items-center justify-between pt-8 pb-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(isMyPartner ? "/promotions/special-audience" : "/promotions")}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Promotion...
                  </>
                ) : (
                  "Create Promotion"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
        {/* Basic Promotion - Offer Type */}
        {type === "basic" && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configure Offer</h3>
                <p className="text-sm text-gray-500">Select offer Type *</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleInputChange("offerType", "PERCENTAGE")}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  formData.offerType === "PERCENTAGE"
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("offerType", "FIXED")}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  formData.offerType === "FIXED"
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                Fixed
              </button>
            </div>
          </Card>
        )}

        {/* Long Stay - Offer Type */}
        {type === "long-stay" && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Choose Offer Type</h3>
                <p className="text-sm text-gray-500">How do you want to offer this promotion?</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleInputChange("offerFreeNights", false)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                  !formData.offerFreeNights
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm"
                }`}
              >
                {!formData.offerFreeNights && (
                  <div className="absolute top-3 right-3 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 mb-2 text-left">I want to offer discount</h3>
                <p className="text-sm text-gray-600 text-left">Offer discount to users booking longer stays</p>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("offerFreeNights", true)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                  formData.offerFreeNights
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm"
                }`}
              >
                {formData.offerFreeNights && (
                  <div className="absolute top-3 right-3 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 mb-2 text-left">I want to offer free night(s)</h3>
                <p className="text-sm text-gray-600 text-left">Offer free nights to users booking longer stays</p>
              </button>
            </div>
          </Card>
        )}

        {/* Set Discount Percentage/Amount */}
        {(!formData.offerFreeNights || type !== "long-stay") && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {formData.offerType === "FIXED" ? "Set Discount Amount" : "Set Discount Percentage"}
                </h3>
                <p className="text-sm text-gray-500">Configure discounts for all users and logged-in users</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Discount for all users *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange("discountAllUsers", Math.max(0, formData.discountAllUsers - (formData.offerType === "FIXED" ? 10 : 1)))}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                  >
                    −
                  </button>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      min={0}
                      max={formData.offerType === "FIXED" ? undefined : 100}
                      value={formData.discountAllUsers}
                      onChange={(e) => handleInputChange("discountAllUsers", Number(e.target.value))}
                      className="text-center text-2xl font-bold py-4 border-2 border-gray-300 focus:border-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-lg">
                      {formData.offerType === "FIXED" ? "₹" : "%"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange("discountAllUsers", formData.discountAllUsers + (formData.offerType === "FIXED" ? 10 : 1))}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="h-px w-8 bg-gray-300"></div>
                  <span className="text-xl font-bold">+</span>
                  <div className="h-px w-8 bg-gray-300"></div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Additional discount for logged-in users only *
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange("discountLoggedUsers", Math.max(0, formData.discountLoggedUsers - (formData.offerType === "FIXED" ? 10 : 1)))}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                    >
                      −
                    </button>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        min={0}
                        max={formData.offerType === "FIXED" ? undefined : 100}
                        value={formData.discountLoggedUsers}
                        onChange={(e) => handleInputChange("discountLoggedUsers", Number(e.target.value))}
                        className="text-center text-2xl font-bold py-4 border-2 border-gray-300 focus:border-blue-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-lg">
                        {formData.offerType === "FIXED" ? "₹" : "%"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange("discountLoggedUsers", formData.discountLoggedUsers + (formData.offerType === "FIXED" ? 10 : 1))}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all h-10"
                    >
                      +
                    </button>
                  </div>
                  {type === "basic" && (
                    <>
                      {extraLoggedDiscounts.map((discount, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraDiscount(index)}
                            className="px-3 py-2 border-2 border-red-300 rounded-lg hover:bg-red-50 font-semibold text-red-600 transition-all h-10"
                          >
                            −
                          </button>
                          <div className="flex-1 relative">
                            <Input
                              type="number"
                              min={0}
                              max={formData.offerType === "FIXED" ? undefined : 100}
                              value={discount}
                              onChange={(e) => handleExtraDiscountChange(index, Number(e.target.value))}
                              className="text-center text-xl font-bold py-3 border-2 border-gray-300 focus:border-blue-500"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                              {formData.offerType === "FIXED" ? "₹" : "%"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddExtraDiscount()}
                            className="px-3 py-2 border-2 border-green-300 rounded-lg hover:bg-green-50 font-semibold text-green-600 transition-all h-10"
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Free Nights (Long Stay) */}
        {type === "long-stay" && formData.offerFreeNights && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarDays className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Set Free Nights</h3>
                <p className="text-sm text-gray-500">Specify the number of free nights to offer</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Number of free nights *
              </label>
              <Input
                type="number"
                min={1}
                value={formData.freeNightsCount || 0}
                onChange={(e) => handleInputChange("freeNightsCount", Number(e.target.value))}
                className="w-full text-lg py-3 border-2 focus:border-blue-500"
                placeholder="Enter number of free nights"
              />
            </div>
          </Card>
        )}

        {/* Bookable Period - Last Minute */}
        {type === "last-minute" && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Choose Bookable Period</h3>
                <p className="text-sm text-gray-500">How far in advance do you wish to get bookings under this promotion?</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { value: "SAME_DAY", label: "Same Day Check-in" },
                { value: "ONE_DAY", label: "Up to 1 Day before Check-in" },
                { value: "TWO_DAYS", label: "Up to 2 Days before Check-in" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.bookablePeriod === option.value
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="bookablePeriod"
                    value={option.value}
                    checked={formData.bookablePeriod === option.value}
                    onChange={(e) => handleInputChange("bookablePeriod", e.target.value as any)}
                    className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{option.label}</span>
                  {formData.bookablePeriod === option.value && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Advance Days - Early Bird */}
        {type === "early-bird" && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bird className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Choose Bookable Period</h3>
                <p className="text-sm text-gray-500">How far in advance do you wish to get bookings under this promotion?</p>
              </div>
            </div>
            <div className="space-y-3">
              {[5, 7, 14, 21, 30].map((days) => (
                <label
                  key={days}
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.advanceDays === days
                      ? "border-green-500 bg-green-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="advanceDays"
                    value={days}
                    checked={formData.advanceDays === days}
                    onChange={(e) => handleInputChange("advanceDays", Number(e.target.value))}
                    className="w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{days} days or more</span>
                  {formData.advanceDays === days && (
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  )}
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Minimum Stay - Long Stay */}
        {type === "long-stay" && (
          <Card variant="outlined" className="p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Choose Minimum Stay Duration</h3>
                <p className="text-sm text-gray-500">Select the minimum number of days for this promotion</p>
              </div>
            </div>
            <div className="space-y-3">
              {[2, 3, 4, 5, 7].map((days) => (
                <label
                  key={days}
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.minimumStayDays === days
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="minimumStayDays"
                    value={days}
                    checked={formData.minimumStayDays === days}
                    onChange={(e) => handleInputChange("minimumStayDays", Number(e.target.value))}
                    className="w-5 h-5 text-orange-600 focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{days} days or more</span>
                  {days === 3 && (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">RECOMMENDED</span>
                  )}
                  {formData.minimumStayDays === days && (
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  )}
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Promotion Validity */}
        <Card variant="outlined" className="p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Promotion Dates</h3>
              <p className="text-sm text-gray-500">Specify promotion validity period</p>
            </div>
          </div>

          {/* Applicable Date Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              This promotion will be applicable for?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleInputChange("applicableDateType", "STAY")}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  formData.applicableDateType === "STAY"
                    ? "bg-blue-600 text-white shadow-md border-2 border-blue-600"
                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                Stay Date
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("applicableDateType", "BOOKING_AND_STAY")}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                  formData.applicableDateType === "BOOKING_AND_STAY"
                    ? "bg-blue-600 text-white shadow-md border-2 border-blue-600"
                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                Booking & Stay Date
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Stay Date Section */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-900">Stay Date</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">No End Date</span>
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      checked={formData.noEndDateStay}
                      onChange={(e) => handleInputChange("noEndDateStay", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-12 h-6 rounded-full transition-all duration-200 ease-in-out ${
                        formData.noEndDateStay ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-200 ease-in-out flex items-center justify-center ${
                          formData.noEndDateStay ? "translate-x-6" : "translate-x-0.5"
                        }`}
                        style={{ marginTop: "2px" }}
                      >
                        {formData.noEndDateStay && (
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.stayStartDate || today}
                    onChange={(e) => handleInputChange("stayStartDate", e.target.value)}
                    min={today}
                    className="w-full"
                  />
                </div>
                {!formData.noEndDateStay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={formData.stayEndDate || ""}
                      onChange={(e) => handleInputChange("stayEndDate", e.target.value)}
                      min={formData.stayStartDate || today}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Booking Date Section - Only show when applicableDateType is BOOKING_AND_STAY */}
            {formData.applicableDateType === "BOOKING_AND_STAY" && (
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">Booking Date</h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">No End Date</span>
                    <div className="relative inline-block">
                      <input
                        type="checkbox"
                        checked={formData.noEndDateBooking}
                        onChange={(e) => handleInputChange("noEndDateBooking", e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-12 h-6 rounded-full transition-all duration-200 ease-in-out ${
                          formData.noEndDateBooking ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-200 ease-in-out flex items-center justify-center ${
                            formData.noEndDateBooking ? "translate-x-6" : "translate-x-0.5"
                          }`}
                          style={{ marginTop: "2px" }}
                        >
                          {formData.noEndDateBooking && (
                            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={formData.bookingStartDate || today}
                      onChange={(e) => handleInputChange("bookingStartDate", e.target.value)}
                      min={today}
                      className="w-full"
                    />
                  </div>
                  {!formData.noEndDateBooking && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={formData.bookingEndDate || ""}
                        onChange={(e) => handleInputChange("bookingEndDate", e.target.value)}
                        min={formData.bookingStartDate || today}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Promotion Name */}
        <Card variant="outlined" className="p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Tag className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Promotion Name</h3>
              <p className="text-sm text-gray-500">Enter a name for this promotion *</p>
            </div>
          </div>
          <Input
            type="text"
            value={formData.promotionName}
            onChange={(e) => handleInputChange("promotionName", e.target.value)}
            placeholder="e.g., Basic-10%, Last Minute-53%-2 Days"
            required
            className="text-base py-3 border-2 focus:border-blue-500"
          />
        </Card>

        {/* Advanced Settings */}
        <Card variant="outlined" className="p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                <p className="text-sm text-gray-500">
                  Select relevant rooms, rate plans and applicable blackout dates if any.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
            >
              {showAdvanced ? "− Hide Settings" : "+ Show Settings"}
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
                      onChange={() => setApplyAllRoomsAndRateplans("yes")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyAllRoomsAndRateplans"
                      checked={applyAllRoomsAndRateplans === "no"}
                      onChange={() => setApplyAllRoomsAndRateplans("no")}
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
                      Please select a hotel first to view rooms and rate plans.
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
                        const roomRatePlans = ratePlansData[room.roomId] || [];
                        const isRoomSelected = selectedRoomIds.has(room.roomId);

                        return (
                          <div key={room.roomId} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={isRoomSelected}
                                onChange={(e) => {
                                  const newSelectedRoomIds = new Set(selectedRoomIds);
                                  const newSelectedRatePlanIds = new Set(selectedRatePlanIds);
                                  if (e.target.checked) {
                                    newSelectedRoomIds.add(room.roomId);
                                    // Select all rate plans for this room
                                    roomRatePlans.forEach(rp => {
                                      newSelectedRatePlanIds.add(rp.ratePlanId.toString());
                                    });
                                  } else {
                                    newSelectedRoomIds.delete(room.roomId);
                                    // Deselect all rate plans for this room
                                    roomRatePlans.forEach(rp => {
                                      newSelectedRatePlanIds.delete(rp.ratePlanId.toString());
                                    });
                                  }
                                  setSelectedRoomIds(newSelectedRoomIds);
                                  setSelectedRatePlanIds(newSelectedRatePlanIds);
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
                                      checked={selectedRatePlanIds.has(ratePlan.ratePlanId.toString())}
                                      onChange={(e) => {
                                        const newSelectedRatePlanIds = new Set(selectedRatePlanIds);
                                        if (e.target.checked) {
                                          newSelectedRatePlanIds.add(ratePlan.ratePlanId.toString());
                                        } else {
                                          newSelectedRatePlanIds.delete(ratePlan.ratePlanId.toString());
                                          // If deselecting a rate plan, also deselect the room
                                          if (isRoomSelected) {
                                            setSelectedRoomIds(prev => {
                                              const newSet = new Set(prev);
                                              newSet.delete(room.roomId);
                                              return newSet;
                                            });
                                          }
                                        }
                                        setSelectedRatePlanIds(newSelectedRatePlanIds);
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
                  Do you want to blackout the offer for specific stay dates?
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
                        handleInputChange("applyChannel", e.target.value);
                        // Reset contractsJson when switching away from B2C
                        if (e.target.value !== "B2C") {
                          handleInputChange("contractsJson", []);
                        } else {
                          // Set default contracts when selecting B2C
                          handleInputChange("contractsJson", ["B2C", "MOBILE", "IPOS"]);
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
                      checked={formData.applyChannel === "BUNDLED_RATES"}
                      onChange={(e) => {
                        handleInputChange("applyChannel", e.target.value);
                        handleInputChange("contractsJson", []);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Bundled Rates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyChannel"
                      value="MY_BIZ"
                      checked={formData.applyChannel === "MY_BIZ"}
                      onChange={(e) => {
                        handleInputChange("applyChannel", e.target.value);
                        handleInputChange("contractsJson", []);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">My Biz</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyChannel"
                      value="MY_PARTNER"
                      checked={formData.applyChannel === "MY_PARTNER"}
                      onChange={(e) => {
                        handleInputChange("applyChannel", e.target.value);
                        handleInputChange("contractsJson", []);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">My Partner</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="applyChannel"
                      value="B2B"
                      checked={formData.applyChannel === "B2B"}
                      onChange={(e) => {
                        handleInputChange("applyChannel", e.target.value);
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
                          checked={formData.contractsJson?.includes("B2C") || false}
                          onChange={(e) => {
                            const currentContracts = formData.contractsJson || [];
                            if (e.target.checked) {
                              handleInputChange("contractsJson", [...currentContracts, "B2C"]);
                            } else {
                              handleInputChange("contractsJson", currentContracts.filter(c => c !== "B2C"));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">B2C Contract</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.contractsJson?.includes("MOBILE") || false}
                          onChange={(e) => {
                            const currentContracts = formData.contractsJson || [];
                            if (e.target.checked) {
                              handleInputChange("contractsJson", [...currentContracts, "MOBILE"]);
                            } else {
                              handleInputChange("contractsJson", currentContracts.filter(c => c !== "MOBILE"));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Mobile Contract</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.contractsJson?.includes("IPOS") || false}
                          onChange={(e) => {
                            const currentContracts = formData.contractsJson || [];
                            if (e.target.checked) {
                              handleInputChange("contractsJson", [...currentContracts, "IPOS"]);
                            } else {
                              handleInputChange("contractsJson", currentContracts.filter(c => c !== "IPOS"));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">IPOS Contract</span>
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

              {/* Blackout Dates Section */}
              {formData.blackoutEnabled && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Do you want to blackout the offer for specific stay dates?
                    </label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="blackoutOption"
                          checked={!!blackoutDate}
                          onChange={() => {
                            if (!blackoutDate) {
                              setBlackoutDate(today);
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="blackoutOption"
                          checked={!blackoutDate}
                          onChange={() => setBlackoutDate("")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Choose Blackout Dates
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={blackoutDate || ""}
                        onChange={(e) => setBlackoutDate(e.target.value)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setBlackoutDate("")}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Action Buttons for non-MyPartner */}
        <div className="flex items-center justify-between pt-8 pb-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(isMyPartner ? "/promotions/special-audience" : "/promotions")}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Promotion...
              </>
            ) : (
              "Create Promotion"
            )}
          </Button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

