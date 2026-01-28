import { useState, useEffect } from "react";
import { pricingService, type PricingQuoteRequest, type PricingQuoteResponse } from "../services/pricingService";
import { adminService, type HotelRoom, type RatePlan } from "@/features/admin/services/adminService";
import { propertyService } from "@/features/properties/services/propertyService";
import { Button, Input, Select, LoadingSpinner, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { 
  Calculator,
  Building2,
  BedDouble,
  Tag,
  Calendar,
  Radio,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  IndianRupee
} from "lucide-react";

const CHANNEL_OPTIONS = [
  { value: "B2C", label: "B2C" },
  { value: "B2B", label: "B2B" },
  { value: "OTA", label: "OTA" },
  { value: "DIRECT", label: "Direct" },
];

// Indian States - using full state name as value
const STATE_CODE_OPTIONS = [
  { value: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chandigarh", label: "Chandigarh" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Dadra and Nagar Haveli", label: "Dadra and Nagar Haveli" },
  { value: "Daman and Diu", label: "Daman and Diu" },
  { value: "Delhi", label: "Delhi" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jammu and Kashmir", label: "Jammu and Kashmir" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Ladakh", label: "Ladakh" },
  { value: "Lakshadweep", label: "Lakshadweep" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Puducherry", label: "Puducherry" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" },
];

export default function PricingQuotePage() {
  const [formData, setFormData] = useState<PricingQuoteRequest>({
    hotelId: undefined,
    roomId: undefined,
    ratePlanId: undefined,
    checkIn: undefined,
    checkOut: undefined,
    channel: undefined,
    loggedInUser: undefined,
    userStateCode: undefined,
    companyStateCode: undefined,
    bookingDate: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PricingQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Array<{ hotelId: string; hotelName: string; hotelCode: string }>>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [isLoadingRatePlans, setIsLoadingRatePlans] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);

  // Fetch active (LIVE) hotels on component mount
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoadingHotels(true);
        const allHotels = await propertyService.getAllHotels();
        // Filter for only LIVE (active) hotels
        const activeHotels = allHotels
          .filter((hotel) => hotel.status === "LIVE")
          .map((hotel) => ({
            hotelId: hotel.hotelId,
            hotelName: hotel.hotelName,
            hotelCode: hotel.hotelCode,
          }));
        setHotels(activeHotels);
      } catch (error) {
        console.error("Error fetching hotels:", error);
        setHotels([]);
      } finally {
        setIsLoadingHotels(false);
      }
    };

    fetchHotels();
  }, []);

  // Fetch rooms when hotel is selected
  useEffect(() => {
    const fetchRooms = async () => {
      if (!formData.hotelId) {
        setRooms([]);
        setSelectedRoomId(undefined);
        setRatePlans([]);
        setFormData((prev) => ({ ...prev, roomId: undefined, ratePlanId: undefined }));
        return;
      }

      try {
        setIsLoadingRooms(true);
        const response = await adminService.getHotelAdminRooms(formData.hotelId);
        setRooms(response.rooms || []);
        // Clear room and rate plan selection when hotel changes
        setSelectedRoomId(undefined);
        setRatePlans([]);
        setFormData((prev) => ({ ...prev, roomId: undefined, ratePlanId: undefined }));
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [formData.hotelId]);

  // Fetch rate plans when room is selected
  useEffect(() => {
    const fetchRatePlans = async () => {
      if (!formData.hotelId || !selectedRoomId) {
        setRatePlans([]);
        setFormData((prev) => ({ ...prev, ratePlanId: undefined }));
        return;
      }

      try {
        setIsLoadingRatePlans(true);
        const response = await adminService.getRoomRatePlans(formData.hotelId, selectedRoomId);
        setRatePlans(response.ratePlans || []);
        // Clear rate plan selection when room changes
        setFormData((prev) => ({ ...prev, ratePlanId: undefined }));
      } catch (error) {
        console.error("Error fetching rate plans:", error);
        setRatePlans([]);
      } finally {
        setIsLoadingRatePlans(false);
      }
    };

    fetchRatePlans();
  }, [formData.hotelId, selectedRoomId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // All fields are optional, but validate format if provided
    if (formData.roomId !== undefined && formData.roomId && formData.roomId.trim() === "") {
      newErrors.roomId = "Room ID cannot be empty";
    }

    if (formData.ratePlanId !== undefined && formData.ratePlanId <= 0) {
      newErrors.ratePlanId = "Rate Plan ID must be greater than 0";
    }

    if (formData.checkIn && formData.checkOut && new Date(formData.checkIn) >= new Date(formData.checkOut)) {
      newErrors.checkOut = "Check-out date must be after check-in date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setErrors({});

    try {
      // Prepare data: use companyStateCode for B2B, userStateCode for others
      const requestData: PricingQuoteRequest = {
        ...formData,
        // For B2B, use companyStateCode and clear userStateCode
        // For others, use userStateCode and clear companyStateCode
        userStateCode: formData.channel === "B2B" ? undefined : formData.userStateCode,
        companyStateCode: formData.channel === "B2B" ? formData.companyStateCode : undefined,
      };
      const result = await pricingService.getQuote(requestData);
      setResponse(result);
    } catch (err: any) {
      console.error("Error getting quote:", err);
      const errorMessage =
        err?.message ||
        err?.response?.data?.message ||
        err?.data?.message ||
        "Failed to get pricing quote. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatResponse = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            Pricing Quote Tester
          </h1>
          <p className="text-gray-600">
            Test the pricing quote API endpoint
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card variant="elevated" className="bg-white shadow-lg border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Calculator className="w-5 h-5 text-blue-600" />
                Request Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <Select
                  label="Hotel (Optional)"
                  value={formData.hotelId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hotelId: e.target.value || undefined,
                      roomId: undefined,
                      ratePlanId: undefined,
                    })
                  }
                  error={errors.hotelId}
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  options={
                    isLoadingHotels
                      ? [{ value: "", label: "Loading hotels..." }]
                      : [
                          { value: "", label: "Select a hotel" },
                          ...hotels.map((hotel) => ({
                            value: hotel.hotelId,
                            label: `${hotel.hotelName} (${hotel.hotelCode})`,
                          })),
                        ]
                  }
                  disabled={isLoadingHotels}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Room (Optional)"
                    value={selectedRoomId || ""}
                    onChange={(e) => {
                      const roomIdStr = e.target.value || undefined;
                      setSelectedRoomId(roomIdStr);
                      setFormData({
                        ...formData,
                        roomId: roomIdStr, // Keep as string (UUID)
                        ratePlanId: undefined, // Clear rate plan when room changes
                      });
                    }}
                    error={errors.roomId}
                    icon={<BedDouble className="w-4 h-4 text-gray-400" />}
                    options={
                      !formData.hotelId
                        ? [{ value: "", label: "Select a hotel first" }]
                        : isLoadingRooms
                        ? [{ value: "", label: "Loading rooms..." }]
                        : rooms.length === 0
                        ? [{ value: "", label: "No rooms available" }]
                        : [
                            { value: "", label: "Select a room" },
                            ...rooms.map((room) => ({
                              value: room.roomId,
                              label: room.roomName,
                            })),
                          ]
                    }
                    disabled={!formData.hotelId || isLoadingRooms}
                  />

                  <Select
                    label="Rate Plan (Optional)"
                    value={formData.ratePlanId?.toString() || ""}
                    onChange={(e) => {
                      const ratePlanIdValue = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      setFormData({
                        ...formData,
                        ratePlanId: ratePlanIdValue || undefined,
                      });
                    }}
                    error={errors.ratePlanId}
                    icon={<Tag className="w-4 h-4 text-gray-400" />}
                    options={
                      !selectedRoomId
                        ? [{ value: "", label: "Select a room first" }]
                        : isLoadingRatePlans
                        ? [{ value: "", label: "Loading rate plans..." }]
                        : ratePlans.length === 0
                        ? [{ value: "", label: "No rate plans available" }]
                        : [
                            { value: "", label: "Select a rate plan" },
                            ...ratePlans.map((ratePlan) => ({
                              value: ratePlan.ratePlanId.toString(),
                              label: ratePlan.ratePlanName,
                            })),
                          ]
                    }
                    disabled={!selectedRoomId || isLoadingRatePlans}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Check-in Date (Optional)"
                    type="date"
                    value={formData.checkIn || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        checkIn: e.target.value || undefined,
                      })
                    }
                    error={errors.checkIn}
                    icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  />

                  <Input
                    label="Check-out Date (Optional)"
                    type="date"
                    value={formData.checkOut || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        checkOut: e.target.value || undefined,
                      })
                    }
                    error={errors.checkOut}
                    icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  />
                </div>

                <Select
                  label="Channel (Optional)"
                  value={formData.channel || ""}
                  onChange={(e) => {
                    const newChannel = e.target.value || undefined;
                    setFormData({
                      ...formData,
                      channel: newChannel,
                      // Clear state codes when channel changes
                      userStateCode: newChannel === "B2B" ? undefined : formData.userStateCode,
                      companyStateCode: newChannel === "B2B" ? formData.companyStateCode : undefined,
                    });
                  }}
                  error={errors.channel}
                  options={CHANNEL_OPTIONS}
                  icon={<Radio className="w-4 h-4 text-gray-400" />}
                />

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.loggedInUser === true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          loggedInUser: e.target.checked ? true : undefined,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Logged In User (Optional)
                    </span>
                  </label>
                </div>

                {formData.channel === "B2B" ? (
                  <Select
                    label="Company State Code (Optional)"
                    value={formData.companyStateCode || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyStateCode: e.target.value || undefined,
                      })
                    }
                    error={errors.companyStateCode}
                    options={STATE_CODE_OPTIONS}
                    icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  />
                ) : (
                  <Select
                    label="User State Code (Optional)"
                    value={formData.userStateCode || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userStateCode: e.target.value || undefined,
                      })
                    }
                    error={errors.userStateCode}
                    options={STATE_CODE_OPTIONS}
                    icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  />
                )}

                <Input
                  label="Booking Date (Optional)"
                  type="date"
                  value={formData.bookingDate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bookingDate: e.target.value || undefined,
                    })
                  }
                  error={errors.bookingDate}
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        hotelId: undefined,
                        roomId: undefined,
                        ratePlanId: undefined,
                        checkIn: undefined,
                        checkOut: undefined,
                        channel: undefined,
                        loggedInUser: undefined,
                        userStateCode: undefined,
                        companyStateCode: undefined,
                        bookingDate: undefined,
                      });
                      setRooms([]);
                      setRatePlans([]);
                      setSelectedRoomId(undefined);
                      setResponse(null);
                      setError(null);
                      setErrors({});
                    }}
                  >
                    Clear All
                  </Button>
                  <Button type="submit" variant="primary" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <LoadingSpinner />
                        Getting Quote...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4" />
                        Get Quote
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Response Section */}
          <Card variant="elevated" className="bg-white shadow-lg border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  {response ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : error ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Calculator className="w-5 h-5 text-gray-400" />
                  )}
                  API Response
                </CardTitle>
                {response && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(formatResponse(response))}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : response ? (
                <div className="space-y-4">
                  {/* Display key pricing information if available */}
                  {(response.totalPrice !== undefined || response.finalPrice !== undefined) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Price</p>
                          <p className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <IndianRupee className="w-6 h-6" />
                            {response.finalPrice || response.totalPrice || 0}
                          </p>
                        </div>
                        {response.discount && response.discount > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Discount</p>
                            <p className="text-lg font-semibold text-green-600">
                              -₹{response.discount}
                            </p>
                          </div>
                        )}
                      </div>
                      {response.basePrice && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Base Price:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                ₹{response.basePrice}
                              </span>
                            </div>
                            {response.taxes && (
                              <div>
                                <span className="text-gray-600">Taxes:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  ₹{response.taxes}
                                </span>
                              </div>
                            )}
                            {response.commission && (
                              <div>
                                <span className="text-gray-600">Commission:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  ₹{response.commission}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw JSON Response */}
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                    <pre className="text-xs text-green-400 font-mono">
                      {formatResponse(response)}
                    </pre>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 font-mono">{error}</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Fill in the form and click "Get Quote" to see the response</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

