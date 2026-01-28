import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MultiDatePicker } from "@/components/ui/MultiDatePicker";
import {
  adminService,
  type CreatePromotionPayload,
  type PromotionEditResponse,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Percent,
  Clock,
  Bird,
  CalendarDays,
  Settings,
  Tag,
} from "lucide-react";

export default function EditPromotionPage() {
  const { promotionId } = useParams<{ promotionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extraLoggedDiscounts, setExtraLoggedDiscounts] = useState<number[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [wantBlackoutDates, setWantBlackoutDates] = useState<boolean>(false);
  const [editData, setEditData] = useState<PromotionEditResponse | null>(null);
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED">("DRAFT");
  const [applyAllRoomsAndRateplans, setApplyAllRoomsAndRateplans] = useState<"yes" | "no">("yes");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [ratePlansData, setRatePlansData] = useState<Record<string, RatePlan[]>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRatePlanIds, setSelectedRatePlanIds] = useState<Set<string>>(new Set());
  const [loadingRooms, setLoadingRooms] = useState(false);
  const fetchingRoomsRef = useRef(false);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<CreatePromotionPayload>({
    promotionType: "BASIC",
    offerType: "PERCENTAGE",
    discountAllUsers: 10,
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

  // Fetch rooms when hotelId is available and "No" is selected
  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId || applyAllRoomsAndRateplans === "yes") {
        if (applyAllRoomsAndRateplans === "yes") {
          setRooms([]);
          setRatePlansData({});
          setSelectedRoomIds(new Set());
          setSelectedRatePlanIds(new Set());
        }
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

  useEffect(() => {
    if (!promotionId) {
      showToast("Promotion ID is required", "error");
      navigate("/promotions");
      return;
    }
    if (!hotelId) {
      showToast("Hotel ID is required. Please select a hotel from the dropdown above.", "error");
      return;
    }
    loadPromotionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionId, hotelId]);

  const loadPromotionData = async () => {
    if (!promotionId || !hotelId) {
      console.error("Missing promotionId or hotelId", { promotionId, hotelId });
      return;
    }
    setLoading(true);
    try {
      console.log("Loading promotion data:", { hotelId, promotionId });
      const data = await adminService.getPromotionEdit(hotelId, promotionId);
      console.log("Promotion data loaded:", data);
      
      if (!data || !data.data || !data.data.promotion) {
        throw new Error("Invalid promotion data structure");
      }
      
      setEditData(data);
      const promo = data.data.promotion;

      // Map promotion data to form
      // Handle applicableDateType - API might return "STAY" or "BOOKING_AND_STAY"
      let applicableDateType = promo.applicableDateType;
      if (applicableDateType === "STAY_ONLY") {
        applicableDateType = "STAY";
      } else if (applicableDateType !== "STAY" && applicableDateType !== "BOOKING_AND_STAY") {
        applicableDateType = "BOOKING_AND_STAY"; // Default
      }
      
      // Load blackout dates from edit data
      // Set wantBlackoutDates based on blackoutEnabled flag from API
      if (promo.blackoutEnabled) {
        if (data.data.blackoutDates && Array.isArray(data.data.blackoutDates) && data.data.blackoutDates.length > 0) {
          setBlackoutDates(data.data.blackoutDates);
        } else {
          setBlackoutDates([]);
        }
        setWantBlackoutDates(true);
      } else {
        setBlackoutDates([]);
        setWantBlackoutDates(false);
      }

      setFormData({
        promotionType: promo.promotionType as any,
        offerType: promo.offerType as any,
        discountAllUsers: promo.discountAllUsers,
        discountLoggedUsers: promo.discountLoggedUsers,
        extraLoggedDiscount: promo.extraLoggedDiscount,
        applicableDateType: applicableDateType as any,
        stayStartDate: promo.stayStartDate || today,
        stayEndDate: promo.stayEndDate || "",
        bookingStartDate: promo.bookingStartDate || today,
        bookingEndDate: promo.bookingEndDate || "",
        noEndDateStay: promo.noEndDateStay,
        noEndDateBooking: promo.noEndDateBooking,
        blackoutEnabled: promo.blackoutEnabled,
        nonRefundable: promo.nonRefundable,
        payAtHotel: promo.payAtHotel,
        applyAllRooms: promo.applyAllRooms,
        applyAllRateplans: promo.applyAllRateplans,
        applyChannel: promo.applyChannel,
        contractsJson: Array.isArray(promo.contractsJson)
          ? promo.contractsJson
          : typeof promo.contractsJson === "string"
          ? JSON.parse(promo.contractsJson)
          : [],
        promotionName: promo.promotionName,
        bookablePeriod: promo.minDaysBeforeCheckin
          ? promo.minDaysBeforeCheckin === 0
            ? "SAME_DAY"
            : promo.minDaysBeforeCheckin === 1
            ? "ONE_DAY"
            : "TWO_DAYS"
          : "TWO_DAYS",
        advanceDays: promo.minDaysBeforeCheckin || 5,
        offerFreeNights: promo.offerMode === "FREE_NIGHT",
        freeNightsCount: promo.freeNights || 0,
        minimumStayDays: promo.minStayNights || 2,
      });

      // Set combined apply all option based on both values
      // If both are true, set to "yes", otherwise "no"
      if (promo.applyAllRooms && promo.applyAllRateplans) {
        setApplyAllRoomsAndRateplans("yes");
      } else {
        setApplyAllRoomsAndRateplans("no");
      }

      // Set status from API response
      if (promo.status && ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED"].includes(promo.status)) {
        setStatus(promo.status as "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED");
      }

      // Set selected room and rate plan IDs from edit data
      if (data.data.roomIds && data.data.roomIds.length > 0) {
        setSelectedRoomIds(new Set(data.data.roomIds));
      }
      if (data.data.rateplanIds && data.data.rateplanIds.length > 0) {
        setSelectedRatePlanIds(new Set(data.data.rateplanIds.map(id => id.toString())));
      }
    } catch (error: any) {
      console.error("Error loading promotion:", error);
      const errorMessage = error?.response?.data?.message || "Failed to load promotion";
      showToast(errorMessage, "error");
      // Don't redirect immediately - let user see the error
      // navigate("/promotions");
    } finally {
      setLoading(false);
    }
  };

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
    if (!hotelId || !promotionId) {
      showToast("Hotel ID and Promotion ID are required", "error");
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
        offerType: formData.offerType,
        discountAllUsers: formData.discountAllUsers,
        discountLoggedUsers: formData.discountLoggedUsers,
        extraLoggedDiscount: extraLoggedDiscounts.reduce((sum, val) => sum + val, 0),
        applicableDateType: formData.applicableDateType,
        stayStartDate: formData.stayStartDate || undefined,
        stayEndDate: formData.noEndDateStay ? undefined : (formData.stayEndDate || undefined),
        bookingStartDate: formData.applicableDateType === "STAY" ? undefined : (formData.noEndDateBooking ? undefined : (formData.bookingStartDate || undefined)),
        bookingEndDate: formData.applicableDateType === "STAY" ? undefined : (formData.noEndDateBooking ? undefined : (formData.bookingEndDate || undefined)),
        noEndDateStay: formData.noEndDateStay,
        noEndDateBooking: formData.applicableDateType === "STAY" ? false : formData.noEndDateBooking,
        blackoutEnabled: wantBlackoutDates ? true : false,
        blackoutDates: wantBlackoutDates && blackoutDates.length > 0 ? blackoutDates : undefined,
        nonRefundable: formData.nonRefundable,
        payAtHotel: formData.payAtHotel,
        applyAllRooms: applyAllRoomsAndRateplans === "yes",
        applyAllRateplans: applyAllRoomsAndRateplans === "yes",
        roomIds: applyAllRoomsAndRateplans === "no" ? Array.from(selectedRoomIds) : undefined,
        rateplanIds: applyAllRoomsAndRateplans === "no" ? Array.from(selectedRatePlanIds) : undefined,
        applyChannel: formData.applyChannel,
        contractsJson: formData.applyChannel === "B2C" ? formData.contractsJson : [],
        promotionName: formData.promotionName,
        ...(formData.promotionType === "LAST_MINUTE" && {
          bookablePeriod: formData.bookablePeriod,
        }),
        ...(formData.promotionType === "EARLY_BIRD" && {
          advanceDays: formData.advanceDays,
        }),
        ...(formData.promotionType === "LONG_STAY" && {
          offerFreeNights: formData.offerFreeNights,
          freeNightsCount: formData.offerFreeNights ? formData.freeNightsCount : undefined,
          minimumStayDays: formData.minimumStayDays,
        }),
      };

      // Use PUT API with full payload including status
      await adminService.updatePromotion(hotelId, promotionId!, {
        ...payload,
        status: status,
      });
      showToast("Promotion updated successfully", "success");
      const url = hotelId
        ? `/promotions?hotelId=${hotelId}&tab=my-promotions`
        : `/promotions?tab=my-promotions`;
      navigate(url);
    } catch (error: any) {
      console.error("Error updating promotion:", error);
      showToast(error?.response?.data?.message || "Failed to update promotion", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!promotionId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Invalid promotion ID</p>
          <button
            onClick={() => navigate("/promotions")}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Promotions
          </button>
        </div>
      </div>
    );
  }

  if (!editData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Failed to load promotion data</p>
          <button
            onClick={() => navigate("/promotions")}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Promotions
          </button>
        </div>
      </div>
    );
  }

  const promotion = editData.data.promotion;
  const type = promotion.promotionType.toLowerCase().replace(/_/g, "-");

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
            <strong>Warning:</strong> Hotel ID is missing. Please select a hotel from the dropdown above.
          </p>
        </div>
      )}
      <div className="mb-8">
        <button
          onClick={() => navigate("/promotions")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Promotion</h1>
          <p className="text-gray-600 text-base">{promotion.promotionName}</p>
        </div>
      </div>

      <div className="space-y-6">
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
              {editData.data.offerTypes.map((offerType) => (
                <button
                  key={offerType.code}
                  type="button"
                  onClick={() => handleInputChange("offerType", offerType.code)}
                  className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                    formData.offerType === offerType.code
                      ? "bg-blue-600 text-white shadow-md scale-105"
                      : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {offerType.label}
                </button>
              ))}
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
                </div>
              </div>
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

        {/* Status */}
        <Card variant="outlined" className="p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Promotion Status</h3>
              <p className="text-sm text-gray-500">Select the status for this promotion *</p>
            </div>
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED")}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "ACTIVE", label: "Active" },
              { value: "PAUSED", label: "Paused" },
              { value: "EXPIRED", label: "Expired" },
            ]}
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
                                    roomRatePlans.forEach(rp => {
                                      newSelectedRatePlanIds.add(rp.ratePlanId.toString());
                                    });
                                  } else {
                                    newSelectedRoomIds.delete(room.roomId);
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
                          const currentContracts = formData.contractsJson || [];
                          if (currentContracts.length === 0) {
                            handleInputChange("contractsJson", ["B2C", "MOBILE", "IPOS"]);
                          }
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
                  Do you want to make it non-refundable?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="nonRefundable"
                      checked={formData.nonRefundable === true}
                      onChange={() => handleInputChange("nonRefundable", true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="nonRefundable"
                      checked={formData.nonRefundable === false}
                      onChange={() => handleInputChange("nonRefundable", false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {/* Pay at hotel */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Do you want to pay at hotel?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payAtHotel"
                      checked={formData.payAtHotel === true}
                      onChange={() => handleInputChange("payAtHotel", true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payAtHotel"
                      checked={formData.payAtHotel === false}
                      onChange={() => handleInputChange("payAtHotel", false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-8 pb-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/promotions")}
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
                Updating Promotion...
              </>
            ) : (
              "Update Promotion"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

