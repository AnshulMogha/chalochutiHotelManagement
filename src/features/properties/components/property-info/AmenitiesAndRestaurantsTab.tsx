import { useEffect, useState } from "react";
import { Check, Building2, BedDouble, X, Plus, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { propertyService } from "@/features/properties/services/propertyService";
import { adminService, type HotelRoom, type FoodServicesResponse } from "@/features/admin/services/adminService";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Amenity } from "@/features/properties/types";
import initializeSelectedAmenities from "@/utils/initializeAmenities";

interface AmenitiesAndRestaurantsTabProps {
  hotelId: string;
}

type ActiveTab = "hotel" | "food" | "rooms";
const SHOW_FOOD_SERVICES = false;

export function AmenitiesAndRestaurantsTab({ hotelId }: AmenitiesAndRestaurantsTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("hotel");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  
  // Hotel amenities
  const [availableHotelAmenities, setAvailableHotelAmenities] = useState<Amenity[]>([]);
  const [selectedHotelAmenities, setSelectedHotelAmenities] = useState<Record<string, string[]>>({});
  const [tempSelectedHotelAmenities, setTempSelectedHotelAmenities] = useState<Record<string, string[]>>({});
  const [activeHotelCategory, setActiveHotelCategory] = useState<string>("mandatory");
  
  // Room amenities
  const [availableRoomAmenities, setAvailableRoomAmenities] = useState<Amenity[]>([]);
  const [roomAmenitiesMap, setRoomAmenitiesMap] = useState<Record<string, Record<string, string[]>>>({});
  const [tempRoomAmenitiesMap, setTempRoomAmenitiesMap] = useState<Record<string, Record<string, string[]>>>({});
  const [activeRoomCategoryMap, setActiveRoomCategoryMap] = useState<Record<string, string>>({});
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [foodServices, setFoodServices] = useState<FoodServicesResponse | null>(null);
  const [savingFoodServices, setSavingFoodServices] = useState(false);

  // Fetch available hotel amenities (master list)
  useEffect(() => {
    const fetchAvailableAmenities = async () => {
      try {
        const response = await propertyService.getAvailableHotelAmenities();
        setAvailableHotelAmenities(response);
        const initialized = initializeSelectedAmenities(response);
        setSelectedHotelAmenities(initialized);
        setTempSelectedHotelAmenities(initialized);
      } catch (error) {
        console.error("Error fetching available hotel amenities:", error);
      }
    };
    fetchAvailableAmenities();
  }, []);

  // Fetch available room amenities (master list)
  useEffect(() => {
    const fetchAvailableRoomAmenities = async () => {
      try {
        const response = await propertyService.getAvailableRoomAmenities();
        setAvailableRoomAmenities(response);
      } catch (error) {
        console.error("Error fetching available room amenities:", error);
      }
    };
    fetchAvailableRoomAmenities();
  }, []);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!hotelId) {
        setRooms([]);
        setRoomAmenitiesMap({});
        setTempRoomAmenitiesMap({});
        setExpandedRooms(new Set());
        return;
      }
      try {
        const data = await adminService.getHotelAdminRooms(hotelId);
        if (data) {
          setRooms(data.rooms || []);
        }
        setRoomAmenitiesMap({});
        setTempRoomAmenitiesMap({});
        setExpandedRooms(new Set());
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setRooms([]);
      }
    };
    if (hotelId) {
      fetchRooms();
    }
  }, [hotelId]);

  // Fetch hotel amenities and map to categories
  useEffect(() => {
    const fetchHotelAmenities = async () => {
      if (!hotelId || activeTab !== "hotel") return;
      setLoading(true);
      const initialized = initializeSelectedAmenities(availableHotelAmenities);
      setSelectedHotelAmenities(initialized);
      setTempSelectedHotelAmenities(initialized);
      
      try {
        const response = await adminService.getHotelAmenities(hotelId);
        const amenityCodes = new Set(response.amenities.map(a => a.amenityCode.toUpperCase()));
        
        // Map amenity codes back to categories
        const mappedAmenities: Record<string, string[]> = { ...initialized };
        availableHotelAmenities.forEach(category => {
          category.items.forEach(item => {
            if (amenityCodes.has(item.id.toUpperCase())) {
              if (!mappedAmenities[category.categoryCode]) {
                mappedAmenities[category.categoryCode] = [];
              }
              if (!mappedAmenities[category.categoryCode].includes(item.id)) {
                mappedAmenities[category.categoryCode].push(item.id);
              }
            }
          });
        });
        
        setSelectedHotelAmenities(mappedAmenities);
        setTempSelectedHotelAmenities(mappedAmenities);
      } catch (error) {
        console.error("Error fetching hotel amenities:", error);
        showToast("Failed to load hotel amenities", "error");
      } finally {
        setLoading(false);
      }
    };

    if (hotelId && activeTab === "hotel" && availableHotelAmenities.length > 0) {
      fetchHotelAmenities();
    }
  }, [hotelId, activeTab, availableHotelAmenities]);

  // Fetch hotel food services
  useEffect(() => {
    const fetchFoodServices = async () => {
      if (!hotelId || activeTab !== "food") return;
      try {
        const response = await adminService.getHotelFoodServices(hotelId);
        setFoodServices(response);
      } catch (error) {
        console.error("Error fetching food services:", error);
        showToast("Failed to load food services", "error");
      }
    };

    if (hotelId && activeTab === "food") {
      fetchFoodServices();
    }
  }, [hotelId, activeTab]);

  // Fetch room amenities when room is expanded
  const fetchRoomAmenities = async (roomId: string) => {
    try {
      const response = await adminService.getRoomAmenities(hotelId, roomId);
      const amenityCodes = new Set(response.amenities.map(a => a.amenityCode.toUpperCase()));
      
      // Map amenity codes back to categories
      const mappedAmenities: Record<string, string[]> = {};
      availableRoomAmenities.forEach(category => {
        const selectedInCategory: string[] = [];
        category.items.forEach(item => {
          if (amenityCodes.has(item.id.toUpperCase())) {
            selectedInCategory.push(item.id);
          }
        });
        if (selectedInCategory.length > 0) {
          mappedAmenities[category.categoryCode] = selectedInCategory;
        }
      });
      
      setRoomAmenitiesMap(prev => ({
        ...prev,
        [roomId]: mappedAmenities,
      }));
      setTempRoomAmenitiesMap(prev => ({
        ...prev,
        [roomId]: { ...mappedAmenities },
      }));
      
      // Set default active category for this room
      if (!activeRoomCategoryMap[roomId] && availableRoomAmenities.length > 0) {
        setActiveRoomCategoryMap(prev => ({
          ...prev,
          [roomId]: availableRoomAmenities[0].categoryCode,
        }));
      }
    } catch (error) {
      console.error("Error fetching room amenities:", error);
      showToast("Failed to load room amenities", "error");
    }
  };

  const handleToggleRoom = (roomId: string) => {
    const isExpanded = expandedRooms.has(roomId);
    if (isExpanded) {
      setExpandedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    } else {
      setExpandedRooms(prev => new Set(prev).add(roomId));
      if (!roomAmenitiesMap[roomId]) {
        fetchRoomAmenities(roomId);
      }
      // Set default active category if not set
      if (!activeRoomCategoryMap[roomId] && availableRoomAmenities.length > 0) {
        setActiveRoomCategoryMap(prev => ({
          ...prev,
          [roomId]: availableRoomAmenities[0].categoryCode,
        }));
      }
    }
  };

  // Toggle hotel amenity
  const toggleHotelAmenity = (amenityId: string) => {
    setTempSelectedHotelAmenities(prev => {
      const current = prev[activeHotelCategory] || [];
      const updated = current.includes(amenityId)
        ? current.filter(id => id !== amenityId)
        : [...current, amenityId];
      return {
        ...prev,
        [activeHotelCategory]: updated,
      };
    });
  };

  // Toggle room amenity
  const toggleRoomAmenity = (roomId: string, amenityId: string) => {
    const activeCategory = activeRoomCategoryMap[roomId] || availableRoomAmenities[0]?.categoryCode;
    setTempRoomAmenitiesMap(prev => {
      const roomAmenities = prev[roomId] || {};
      const current = roomAmenities[activeCategory] || [];
      const updated = current.includes(amenityId)
        ? current.filter(id => id !== amenityId)
        : [...current, amenityId];
      return {
        ...prev,
        [roomId]: {
          ...roomAmenities,
          [activeCategory]: updated,
        },
      };
    });
  };

  // Convert category-based amenities to flat array for API
  const convertToAmenityCodes = (amenities: Record<string, string[]>): string[] => {
    return Object.values(amenities).flat();
  };

  // Save hotel amenities
  const handleSaveHotelAmenities = async () => {
    setSaving(true);
    try {
      const amenityCodes = convertToAmenityCodes(tempSelectedHotelAmenities);
      await adminService.updateHotelAmenities(hotelId, { amenityCodes });
      setSelectedHotelAmenities({ ...tempSelectedHotelAmenities });
      showToast("Hotel amenities saved successfully", "success");
    } catch (error) {
      console.error("Error saving hotel amenities:", error);
      showToast("Failed to save hotel amenities", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save room amenities
  const handleSaveRoomAmenities = async (roomId: string) => {
    setSavingRoomId(roomId);
    try {
      const amenityCodes = convertToAmenityCodes(tempRoomAmenitiesMap[roomId] || {});
      await adminService.updateRoomAmenities(hotelId, roomId, { amenityCodes });
      setRoomAmenitiesMap(prev => ({
        ...prev,
        [roomId]: { ...tempRoomAmenitiesMap[roomId] },
      }));
      showToast("Room amenities saved successfully", "success");
    } catch (error) {
      console.error("Error saving room amenities:", error);
      showToast("Failed to save room amenities", "error");
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleToggleFoodService = (key: keyof FoodServicesResponse) => {
    setFoodServices((prev) =>
      prev ? { ...prev, [key]: !prev[key] } : prev
    );
  };

  const handleSaveFoodServices = async () => {
    if (!hotelId || !foodServices) return;
    setSavingFoodServices(true);
    try {
      await adminService.updateHotelFoodServices(hotelId, foodServices);
      showToast("Food services saved successfully", "success");
    } catch (error) {
      console.error("Error saving food services:", error);
      showToast("Failed to save food services", "error");
    } finally {
      setSavingFoodServices(false);
    }
  };

  const getHotelCategoryCount = (categoryCode: string) => {
    const category = availableHotelAmenities.find(c => c.categoryCode === categoryCode);
    const selected = tempSelectedHotelAmenities[categoryCode]?.length || 0;
    return { selected, total: category?.items.length || 0 };
  };

  const getRoomCategoryCount = (roomId: string, categoryCode: string) => {
    const category = availableRoomAmenities.find(c => c.categoryCode === categoryCode);
    const selected = tempRoomAmenitiesMap[roomId]?.[categoryCode]?.length || 0;
    return { selected, total: category?.items.length || 0 };
  };

  const currentHotelCategory = availableHotelAmenities.find(
    c => c.categoryCode === activeHotelCategory
  );

  const hasHotelChanges = JSON.stringify(selectedHotelAmenities) !== 
                          JSON.stringify(tempSelectedHotelAmenities);

  if (loading && activeTab === "hotel") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("hotel")}
              className={cn(
                "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
                activeTab === "hotel"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5" />
                <span>Hotel Amenities</span>
              </div>
              {activeTab === "hotel" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={cn(
                "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
                activeTab === "rooms"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <BedDouble className="w-5 h-5" />
                <span>Room Amenities</span>
              </div>
              {activeTab === "rooms" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            {SHOW_FOOD_SERVICES && (
              <button
                type="button"
                onClick={() => setActiveTab("food")}
                className={cn(
                  "flex-1 px-6 py-4 text-center font-semibold transition-colors relative",
                  activeTab === "food"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Utensils className="w-5 h-5" />
                  <span>Food Services</span>
                </div>
                {activeTab === "food" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hotel Amenities Tab */}
        {activeTab === "hotel" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Hotel Amenities</h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Select amenities available at your hotel
                    </p>
                  </div>
                </div>
                {hasHotelChanges && (
                  <Button
                    onClick={handleSaveHotelAmenities}
                    disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-6 min-h-[600px]">
              {/* Category Sidebar */}
              <div className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-1 p-2">
                  {availableHotelAmenities.map((category) => {
                    const count = getHotelCategoryCount(category.categoryCode);
                    const isActive = activeHotelCategory === category.categoryCode;
                    return (
                      <button
                        key={category.categoryCode}
                        type="button"
                        onClick={() => setActiveHotelCategory(category.categoryCode)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg transition-all",
                          "hover:bg-gray-50",
                          isActive
                            ? "bg-blue-50 text-blue-900 border-l-4 border-blue-600 font-medium"
                            : "text-gray-700"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{category.categoryName}</span>
                          <span className="text-xs text-gray-500">
                            {count.selected} of {count.total}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amenities Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {currentHotelCategory?.categoryName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentHotelCategory?.items.map((amenity) => {
                    const isSelected = tempSelectedHotelAmenities[activeHotelCategory]?.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleHotelAmenity(amenity.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          "hover:border-blue-400 hover:bg-blue-50",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <div className="text-2xl">{amenity.icon}</div>
                        <span className="text-xs text-center text-gray-700 font-medium">
                          {amenity.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Food Services Tab */}
        {SHOW_FOOD_SERVICES && activeTab === "food" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-lime-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Food Services</h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Configure food and dining preferences for this hotel
                    </p>
                  </div>
                </div>
                {foodServices && (
                  <Button
                    onClick={handleSaveFoodServices}
                    disabled={savingFoodServices}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {savingFoodServices ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
            </div>

            <div className="px-6 py-6">
              {foodServices ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">Restaurant available</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.restaurantAvailable}
                      onChange={() => handleToggleFoodService("restaurantAvailable")}
                    />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">In-room dining</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.inRoomDining}
                      onChange={() => handleToggleFoodService("inRoomDining")}
                    />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">Non-veg allowed</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.nonVegAllowed}
                      onChange={() => handleToggleFoodService("nonVegAllowed")}
                    />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">Outside food allowed</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.outsideFoodAllowed}
                      onChange={() => handleToggleFoodService("outsideFoodAllowed")}
                    />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">Food delivery available</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.foodDeliveryAvailable}
                      onChange={() => handleToggleFoodService("foodDeliveryAvailable")}
                    />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-800">Alcohol allowed</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={foodServices.alcoholAllowed}
                      onChange={() => handleToggleFoodService("alcoholAllowed")}
                    />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No food services data available.</p>
              )}
            </div>
          </div>
        )}

        {/* Room Amenities Tab */}
        {activeTab === "rooms" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <BedDouble className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Room Amenities</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {rooms.length} room(s) available
                  </p>
                </div>
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <BedDouble className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No rooms available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {rooms.map((room) => {
                  const isExpanded = expandedRooms.has(room.roomId);
                  const activeCategory = activeRoomCategoryMap[room.roomId] || availableRoomAmenities[0]?.categoryCode;
                  const roomAmenities = tempRoomAmenitiesMap[room.roomId] || {};
                  const savedRoomAmenities = roomAmenitiesMap[room.roomId] || {};
                  const hasRoomChanges = JSON.stringify(savedRoomAmenities) !== JSON.stringify(roomAmenities);
                  const isSaving = savingRoomId === room.roomId;
                  const currentCategory = availableRoomAmenities.find(c => c.categoryCode === activeCategory);

                  return (
                    <div key={room.roomId} className="bg-gray-50/50">
                      <button
                        type="button"
                        onClick={() => handleToggleRoom(room.roomId)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <X className="w-5 h-5 text-gray-600" />
                          ) : (
                            <Plus className="w-5 h-5 text-gray-600" />
                          )}
                          <div className="text-left">
                            <h3 className="text-base font-semibold text-gray-900">
                              {room.roomName}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {Object.values(roomAmenities).flat().length} selected
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-white border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">
                              Select amenities for this room
                            </p>
                            {hasRoomChanges && (
                              <Button
                                onClick={() => handleSaveRoomAmenities(room.roomId)}
                                disabled={isSaving}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              >
                                {isSaving ? "Saving..." : "Save Changes"}
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex gap-6 min-h-[400px]">
                            {/* Category Sidebar */}
                            <div className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto">
                              <div className="space-y-1 p-2">
                                {availableRoomAmenities.map((category) => {
                                  const count = getRoomCategoryCount(room.roomId, category.categoryCode);
                                  const isActive = activeCategory === category.categoryCode;
                                  return (
                                    <button
                                      key={category.categoryCode}
                                      type="button"
                                      onClick={() => setActiveRoomCategoryMap(prev => ({
                                        ...prev,
                                        [room.roomId]: category.categoryCode,
                                      }))}
                                      className={cn(
                                        "w-full text-left px-4 py-3 rounded-lg transition-all",
                                        "hover:bg-gray-50",
                                        isActive
                                          ? "bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600 font-medium"
                                          : "text-gray-700"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">{category.categoryName}</span>
                                        <span className="text-xs text-gray-500">
                                          {count.selected} of {count.total}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Amenities Grid */}
                            <div className="flex-1 overflow-y-auto">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                {currentCategory?.categoryName}
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {currentCategory?.items.map((amenity) => {
                                  const isSelected = roomAmenities[activeCategory]?.includes(amenity.id);
                                  return (
                                    <button
                                      key={amenity.id}
                                      type="button"
                                      onClick={() => toggleRoomAmenity(room.roomId, amenity.id)}
                                      className={cn(
                                        "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                        "hover:border-emerald-400 hover:bg-emerald-50",
                                        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
                                        isSelected
                                          ? "border-emerald-600 bg-emerald-50"
                                          : "border-gray-200 bg-white hover:border-gray-300"
                                      )}
                                    >
                                      <div className="text-2xl">{amenity.icon}</div>
                                      <span className="text-xs text-center text-gray-700 font-medium">
                                        {amenity.label}
                                      </span>
                                      {isSelected && (
                                        <div className="absolute top-2 right-2">
                                          <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
