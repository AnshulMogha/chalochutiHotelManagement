import { useEffect, useState } from "react";
import { Check, Building2, BedDouble, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { propertyService } from "@/features/properties/services/propertyService";
import { adminService, type HotelRoom } from "@/features/admin/services/adminService";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Amenity } from "@/features/properties/types";
import initializeSelectedAmenities from "@/utils/initializeAmenities";

interface AmenitiesAndRestaurantsTabProps {
  hotelId: string;
}

type ActiveTab = "hotel" | "rooms";

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

  const totalHotelSelected = Object.values(tempSelectedHotelAmenities).flat().length;
  const hotelTabActive = activeTab === "hotel";

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <div className="overflow-hidden rounded-2xl border border-[#2f3d95]/20 bg-gradient-to-br from-white via-[#f8faff] to-[#eef2ff]/40 shadow-[0_8px_30px_rgba(47,61,149,0.1)] ring-1 ring-[#2f3d95]/10">
        {/* Tabs + toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f3d95]/10 bg-gradient-to-r from-[#eef2ff] via-[#f5f3ff] to-violet-50/70 px-3 py-3 sm:px-4">
          <div className="inline-flex rounded-lg bg-white/80 p-1 shadow-sm ring-1 ring-[#2f3d95]/15 backdrop-blur-sm">
            <button
              type="button"
              role="tab"
              aria-selected={hotelTabActive}
              onClick={() => setActiveTab("hotel")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                hotelTabActive
                  ? "bg-[#2f3d95] text-white shadow-md shadow-[#2f3d95]/30"
                  : "text-slate-600 hover:bg-[#eef2ff] hover:text-[#2f3d95]",
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Hotel
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!hotelTabActive}
              onClick={() => setActiveTab("rooms")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                !hotelTabActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
              )}
            >
              <BedDouble className="h-3.5 w-3.5" />
              Rooms
            </button>
          </div>

          {hotelTabActive ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#2f3d95]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2f3d95]">
                {totalHotelSelected} selected
              </span>
              {hasHotelChanges ? (
                <Button
                  onClick={handleSaveHotelAmenities}
                  disabled={saving}
                  size="sm"
                  className="bg-[#2f3d95] hover:bg-[#263578]"
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              ) : null}
            </div>
          ) : (
            <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {rooms.length} room{rooms.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Hotel Amenities */}
        {hotelTabActive && (
          <div className="flex min-h-[520px] flex-col lg:flex-row">
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
                Loading amenities...
              </div>
            ) : (
              <>
                {/* Categories */}
                <aside className="w-full shrink-0 border-b border-[#2f3d95]/10 bg-[#f8faff]/80 lg:w-60 lg:border-b-0 lg:border-r">
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Categories
                  </p>
                  <div className="space-y-1 p-2 pb-3">
                    {availableHotelAmenities.map((category) => {
                      const count = getHotelCategoryCount(category.categoryCode);
                      const isActive =
                        activeHotelCategory === category.categoryCode;
                      const complete =
                        count.total > 0 && count.selected === count.total;
                      return (
                        <button
                          key={category.categoryCode}
                          type="button"
                          data-readonly-allow="true"
                          onClick={() =>
                            setActiveHotelCategory(category.categoryCode)
                          }
                          className={cn(
                            "w-full rounded-lg px-3 py-2.5 text-left transition-all",
                            isActive
                              ? "bg-[#2f3d95] text-white shadow-md shadow-[#2f3d95]/20"
                              : "text-slate-700 hover:bg-white hover:shadow-sm",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium">
                              {category.categoryName}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : complete
                                    ? "bg-emerald-100 text-emerald-700"
                                    : count.selected > 0
                                      ? "bg-[#eef2ff] text-[#2f3d95]"
                                      : "bg-slate-100 text-slate-500",
                              )}
                            >
                              {count.selected}/{count.total}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {/* Amenity grid */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-[#f8faff]/40 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {currentHotelCategory?.categoryName}
                    </h3>
                    <span className="text-xs text-slate-500">
                      Tap to toggle ·{" "}
                      {getHotelCategoryCount(activeHotelCategory).selected} of{" "}
                      {getHotelCategoryCount(activeHotelCategory).total} in
                      this category
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {currentHotelCategory?.items.map((amenity) => {
                      const isSelected = tempSelectedHotelAmenities[
                        activeHotelCategory
                      ]?.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => toggleHotelAmenity(amenity.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                            "focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 focus:ring-offset-2",
                            isSelected
                              ? "border-[#2f3d95] bg-[#eef2ff]/70 shadow-md shadow-[#2f3d95]/10"
                              : "border-slate-200/90 bg-white hover:border-[#2f3d95]/30 hover:bg-[#eef2ff]/30 hover:shadow-sm",
                          )}
                        >
                          <div className="text-2xl leading-none">
                            {amenity.icon}
                          </div>
                          <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-slate-700">
                            {amenity.label}
                          </span>
                          {isSelected ? (
                            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#2f3d95] shadow-sm">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Room Amenities */}
        {activeTab === "rooms" && (
          <div className="bg-gradient-to-b from-emerald-50/30 to-white p-3 sm:p-4">
            {rooms.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-emerald-300/50 bg-emerald-50/40 px-6 py-12 text-center">
                <BedDouble className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium text-slate-700">No rooms yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add rooms first, then set amenities per room type.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => {
                  const isExpanded = expandedRooms.has(room.roomId);
                  const activeCategory =
                    activeRoomCategoryMap[room.roomId] ||
                    availableRoomAmenities[0]?.categoryCode;
                  const roomAmenities = tempRoomAmenitiesMap[room.roomId] || {};
                  const savedRoomAmenities = roomAmenitiesMap[room.roomId] || {};
                  const hasRoomChanges =
                    JSON.stringify(savedRoomAmenities) !==
                    JSON.stringify(roomAmenities);
                  const isSaving = savingRoomId === room.roomId;
                  const currentCategory = availableRoomAmenities.find(
                    (c) => c.categoryCode === activeCategory,
                  );
                  const roomSelectedCount =
                    Object.values(roomAmenities).flat().length;

                  return (
                    <article
                      key={room.roomId}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
                        isExpanded
                          ? "border-emerald-200/80 ring-1 ring-emerald-100"
                          : "border-slate-200/90 hover:border-emerald-200/60 hover:shadow-md",
                      )}
                    >
                      <button
                        type="button"
                        data-readonly-allow="true"
                        onClick={() => handleToggleRoom(room.roomId)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <BedDouble className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {room.roomName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {roomSelectedCount} selected
                              {isExpanded
                                ? " · expanded"
                                : " · click to edit amenities"}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-emerald-100/80 bg-gradient-to-b from-emerald-50/40 to-white">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/60 px-4 py-2.5">
                            <p className="text-xs text-slate-500">
                              Select amenities for this room
                            </p>
                            {hasRoomChanges ? (
                              <Button
                                onClick={() =>
                                  handleSaveRoomAmenities(room.roomId)
                                }
                                disabled={isSaving}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {isSaving ? "Saving..." : "Save changes"}
                              </Button>
                            ) : null}
                          </div>

                          <div className="flex min-h-[360px] flex-col lg:flex-row">
                            <aside className="w-full shrink-0 border-b border-emerald-100/80 bg-emerald-50/30 lg:w-56 lg:border-b-0 lg:border-r">
                              <div className="space-y-1 p-2 pb-3">
                                {availableRoomAmenities.map((category) => {
                                  const count = getRoomCategoryCount(
                                    room.roomId,
                                    category.categoryCode,
                                  );
                                  const isActive =
                                    activeCategory === category.categoryCode;
                                  return (
                                    <button
                                      key={category.categoryCode}
                                      type="button"
                                      data-readonly-allow="true"
                                      onClick={() =>
                                        setActiveRoomCategoryMap((prev) => ({
                                          ...prev,
                                          [room.roomId]: category.categoryCode,
                                        }))
                                      }
                                      className={cn(
                                        "w-full rounded-lg px-3 py-2 text-left transition-all",
                                        isActive
                                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                          : "text-slate-700 hover:bg-white hover:shadow-sm",
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs font-medium">
                                          {category.categoryName}
                                        </span>
                                        <span
                                          className={cn(
                                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                            isActive
                                              ? "bg-white/20 text-white"
                                              : count.selected > 0
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500",
                                          )}
                                        >
                                          {count.selected}/{count.total}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </aside>

                            <div className="flex-1 overflow-y-auto p-4">
                              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                                {currentCategory?.categoryName}
                              </h3>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {currentCategory?.items.map((amenity) => {
                                  const isSelected = roomAmenities[
                                    activeCategory
                                  ]?.includes(amenity.id);
                                  return (
                                    <button
                                      key={amenity.id}
                                      type="button"
                                      onClick={() =>
                                        toggleRoomAmenity(
                                          room.roomId,
                                          amenity.id,
                                        )
                                      }
                                      className={cn(
                                        "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                                        isSelected
                                          ? "border-emerald-600 bg-emerald-50/80 shadow-md shadow-emerald-600/10"
                                          : "border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm",
                                      )}
                                    >
                                      <div className="text-2xl leading-none">
                                        {amenity.icon}
                                      </div>
                                      <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-slate-700">
                                        {amenity.label}
                                      </span>
                                      {isSelected ? (
                                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 shadow-sm">
                                          <Check className="h-3 w-3 text-white" />
                                        </div>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
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
