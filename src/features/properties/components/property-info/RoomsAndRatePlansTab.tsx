import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Toast, useToast } from "@/components/ui/Toast";
import { adminService, type HotelRoom, type RatePlan, type CreateRatePlanRequest, type UpdateRatePlanRequest, type RatePlanEditResponse, type MealPlanOption } from "@/features/admin/services/adminService";
import { Plus, Pencil, Eye, Building2, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks";
import { isHotelOwner } from "@/constants/roles";
import { AddRatePlanModal } from "./AddRatePlanModal";
import { PropertyInfoRoomsForm } from "./PropertyInfoRoomsForm";

interface RoomsAndRatePlansTabProps {
  hotelId: string;
}

export function RoomsAndRatePlansTab({ hotelId }: RoomsAndRatePlansTabProps) {
  const { user } = useAuth();
  const isHotelOwnerUser = isHotelOwner(user?.roles);
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(new Set());
  const [ratePlansData, setRatePlansData] = useState<Record<string, RatePlan[]>>({});
  const [loadingRatePlans, setLoadingRatePlans] = useState<Set<string>>(new Set());
  const [isAddRatePlanModalOpen, setIsAddRatePlanModalOpen] = useState(false);
  const [selectedRoomIdForRatePlan, setSelectedRoomIdForRatePlan] = useState<string | null>(null);
  const [isCreatingRatePlan, setIsCreatingRatePlan] = useState(false);
  const [isEditRatePlanModalOpen, setIsEditRatePlanModalOpen] = useState(false);
  const [selectedRatePlanForEdit, setSelectedRatePlanForEdit] = useState<{
    roomId: string;
    ratePlanId: number;
  } | null>(null);
  const [isUpdatingRatePlan, setIsUpdatingRatePlan] = useState(false);
  const [ratePlanEditData, setRatePlanEditData] = useState<RatePlanEditResponse | null>(null);
  const [availableMealPlans, setAvailableMealPlans] = useState<MealPlanOption[]>([]);
  const { toast, showToast, hideToast } = useToast();
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomFormMode, setRoomFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingRoomId, setEditingRoomId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        // For hotel owner, use hotel admin API; for super admin, use admin API
        const data = isHotelOwnerUser
          ? await adminService.getHotelAdminRooms(hotelId)
          : await adminService.getHotelAdminRooms(hotelId); // TODO: Add super admin rooms API if different
        if (data) {
          setRooms(data.rooms || []);
          setTotalRooms(data.totalRooms || 0);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        showToast("Failed to load rooms. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (hotelId) {
      fetchRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, isHotelOwnerUser]);

  const handleToggleActive = async (roomId: string, currentActive: boolean) => {
    const newActiveStatus = !currentActive;
    
    // Optimistic update
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.roomId === roomId ? { ...room, active: newActiveStatus } : room
      )
    );

    try {
      await adminService.updateRoomActiveStatus(hotelId, roomId, {
        active: newActiveStatus,
      });
      showToast(
        `Room ${newActiveStatus ? "activated" : "deactivated"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error("Error updating room status:", error);
      showToast("Failed to update room status. Please try again.", "error");
      // Revert optimistic update
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === roomId ? { ...room, active: currentActive } : room
        )
      );
    }
  };

  const handleToggleRatePlanActive = async (
    roomId: string,
    ratePlanId: number,
    currentActive: boolean
  ) => {
    const newActiveStatus = !currentActive;

    // Optimistic update
    setRatePlansData((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).map((rp) =>
        rp.ratePlanId === ratePlanId ? { ...rp, active: newActiveStatus } : rp
      ),
    }));

    try {
      await adminService.updateRatePlanActiveStatus(
        hotelId,
        roomId,
        ratePlanId,
        {
          active: newActiveStatus,
        }
      );
      showToast(
        `Rate plan ${newActiveStatus ? "activated" : "deactivated"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error("Error updating rate plan status:", error);
      showToast("Failed to update rate plan status. Please try again.", "error");
      // Revert optimistic update
      setRatePlansData((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((rp) =>
          rp.ratePlanId === ratePlanId ? { ...rp, active: currentActive } : rp
        ),
      }));
    }
  };

  const handleEditRoom = (roomId: string) => {
    setEditingRoomId(roomId);
    setRoomFormMode("EDIT");
    setShowRoomForm(true);
  };

  const handleAddRatePlan = (roomId: string) => {
    setSelectedRoomIdForRatePlan(roomId);
    setIsAddRatePlanModalOpen(true);
  };

  const handleCreateRatePlan = async (data: CreateRatePlanRequest) => {
    if (!selectedRoomIdForRatePlan) return;

    try {
      setIsCreatingRatePlan(true);
      const newRatePlan = await adminService.createRatePlan(
        hotelId,
        selectedRoomIdForRatePlan,
        data
      );

      // Add the new rate plan to the existing list
      setRatePlansData((prev) => ({
        ...prev,
        [selectedRoomIdForRatePlan]: [
          ...(prev[selectedRoomIdForRatePlan] || []),
          newRatePlan,
        ],
      }));

      // Expand the rate plans section if not already expanded
      if (!expandedRatePlans.has(selectedRoomIdForRatePlan)) {
        setExpandedRatePlans((prev) => {
          const newSet = new Set(prev);
          newSet.add(selectedRoomIdForRatePlan);
          return newSet;
        });
      }

      showToast("Rate plan created successfully!", "success");
      setIsAddRatePlanModalOpen(false);
      setSelectedRoomIdForRatePlan(null);
    } catch (error: any) {
      console.error("Error creating rate plan:", error);
      
      // Extract error message from API response
      // API returns: { data: { mealPlan: "error.rate.plan.duplicate.meal.plan" } }
      // After interceptor: error.data.data contains the field errors
      const errorData = error?.data?.data || error?.response?.data?.data || {};
      
      // Don't show toast, let modal handle the error display
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsCreatingRatePlan(false);
    }
  };

  const handleEditRatePlan = (roomId: string, ratePlanId: number) => {
    setSelectedRatePlanForEdit({ roomId, ratePlanId });
    setIsEditRatePlanModalOpen(true);
  };

  const loadRatePlanForEdit = async (): Promise<{
    ratePlanName: string;
    mealPlan: string;
    cancellationPolicyId: number | null;
    active: boolean;
    mealPlans?: MealPlanOption[];
  }> => {
    if (!selectedRatePlanForEdit) {
      throw new Error("No rate plan selected for edit");
    }

    try {
      const data = await adminService.getRatePlanForEdit(
        hotelId,
        selectedRatePlanForEdit.roomId,
        selectedRatePlanForEdit.ratePlanId
      );
      setRatePlanEditData(data);
      // Store meal plans for use in modal
      if (data.mealPlans && data.mealPlans.length > 0) {
        setAvailableMealPlans(data.mealPlans);
      }
      return {
        ratePlanName: data.ratePlan.name,
        mealPlan: data.ratePlan.mealPlan,
        active: data.ratePlan.active,
        mealPlans: data.mealPlans,
      };
    } catch (error) {
      console.error("Error loading rate plan for edit:", error);
      showToast("Failed to load rate plan details. Please try again.", "error");
      throw error;
    }
  };

  const handleUpdateRatePlan = async (data: {
    ratePlanName: string;
    mealPlan: string;
  }) => {
    if (!selectedRatePlanForEdit) return;

    try {
      setIsUpdatingRatePlan(true);
      const updatePayload: UpdateRatePlanRequest = {
        ratePlanName: data.ratePlanName,
        mealPlan: data.mealPlan,
        cancellationPolicyId: null, // Removed from UI, set to null
      };
      const updatedRatePlan = await adminService.updateRatePlan(
        hotelId,
        selectedRatePlanForEdit.roomId,
        selectedRatePlanForEdit.ratePlanId,
        updatePayload
      );

      // Update the rate plan in the existing list
      setRatePlansData((prev) => ({
        ...prev,
        [selectedRatePlanForEdit.roomId]: (prev[selectedRatePlanForEdit.roomId] || []).map(
          (rp) =>
            rp.ratePlanId === selectedRatePlanForEdit.ratePlanId
              ? { ...rp, ...updatedRatePlan }
              : rp
        ),
      }));

      showToast("Rate plan updated successfully!", "success");
      setIsEditRatePlanModalOpen(false);
      setSelectedRatePlanForEdit(null);
      setRatePlanEditData(null);
    } catch (error: any) {
      console.error("Error updating rate plan:", error);
      
      // Extract error message from API response
      // API returns: { data: { mealPlan: "error.rate.plan.duplicate.meal.plan" } }
      // After interceptor: error.data.data contains the field errors
      const errorData = error?.data?.data || error?.response?.data?.data || {};
      
      // Don't show toast, let modal handle the error display
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsUpdatingRatePlan(false);
    }
  };

  const handleViewRatePlans = async (roomId: string) => {
    const isExpanded = expandedRatePlans.has(roomId);
    
    if (isExpanded) {
      // Collapse
      setExpandedRatePlans((prev) => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    } else {
      // Expand and fetch rate plans if not already loaded
      setExpandedRatePlans((prev) => {
        const newSet = new Set(prev);
        newSet.add(roomId);
        return newSet;
      });

      if (!ratePlansData[roomId]) {
        try {
          setLoadingRatePlans((prev) => {
            const newSet = new Set(prev);
            newSet.add(roomId);
            return newSet;
          });
          const data = await adminService.getRoomRatePlans(hotelId, roomId);
          setRatePlansData((prev) => ({
            ...prev,
            [roomId]: data.ratePlans || [],
          }));
        } catch (error) {
          console.error("Error fetching rate plans:", error);
          showToast("Failed to load rate plans. Please try again.", "error");
          // Collapse on error
          setExpandedRatePlans((prev) => {
            const newSet = new Set(prev);
            newSet.delete(roomId);
            return newSet;
          });
        } finally {
          setLoadingRatePlans((prev) => {
            const newSet = new Set(prev);
            newSet.delete(roomId);
            return newSet;
          });
        }
      }
    }
  };

  const handleCreateNewRoom = () => {
    setEditingRoomId(undefined);
    setRoomFormMode("CREATE");
    setShowRoomForm(true);
  };

  const handleRoomFormSuccess = () => {
    setShowRoomForm(false);
    setEditingRoomId(undefined);
    // Refresh rooms list
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const data = isHotelOwnerUser
          ? await adminService.getHotelAdminRooms(hotelId)
          : await adminService.getHotelAdminRooms(hotelId);
        if (data) {
          setRooms(data.rooms || []);
          setTotalRooms(data.totalRooms || 0);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        showToast("Failed to load rooms. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
    showToast("Room saved successfully!", "success");
  };

  const handleRoomFormCancel = () => {
    setShowRoomForm(false);
    setEditingRoomId(undefined);
  };

  if (isLoading && !showRoomForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading rooms...</p>
        </div>
      </div>
    );
  }

  // Show room form if needed
  if (showRoomForm) {
    return (
      <>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <PropertyInfoRoomsForm
            mode={roomFormMode}
            hotelId={hotelId}
            editingRoomId={editingRoomId}
            onCancel={handleRoomFormCancel}
            onSuccess={handleRoomFormSuccess}
          />
        </div>
      </>
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
      <AddRatePlanModal
        isOpen={isAddRatePlanModalOpen}
        onClose={() => {
          setIsAddRatePlanModalOpen(false);
          setSelectedRoomIdForRatePlan(null);
        }}
        onSubmit={handleCreateRatePlan}
        isLoading={isCreatingRatePlan}
        mode="create"
      />
      <AddRatePlanModal
        isOpen={isEditRatePlanModalOpen}
        onClose={() => {
          setIsEditRatePlanModalOpen(false);
          setSelectedRatePlanForEdit(null);
          setRatePlanEditData(null);
          setAvailableMealPlans([]);
        }}
        onSubmit={handleUpdateRatePlan}
        isLoading={isUpdatingRatePlan}
        mode="edit"
        onLoadData={loadRatePlanForEdit}
        mealPlans={availableMealPlans}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Existing Rooms ({totalRooms})
            </h2>
          </div>
          <Button
            onClick={handleCreateNewRoom}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            CREATE NEW ROOM
          </Button>
        </div>

        {/* Rooms Table */}
        {rooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <Building2 className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">No rooms found</p>
              <p className="text-gray-400 text-sm">
                Create your first room to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2f3d95] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/5">
                      Room Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-2/5">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/5">
                      Actions
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/5">
                      Rateplans
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => (
                    <>
                      <tr key={room.roomId} className="hover:bg-gray-50">
                        {/* Room Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {room.roomName}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md line-clamp-3">
                            {room.description || (
                              <span className="text-gray-400 italic">
                                No description available
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center">
                              <Toggle
                                checked={room.active}
                                onChange={() =>
                                  handleToggleActive(room.roomId, room.active)
                                }
                                label="Active"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleEditRoom(room.roomId)}
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors w-fit"
                              >
                                <Pencil className="w-4 h-4" />
                                EDIT ROOM
                              </button>
                              <button
                                onClick={() => handleAddRatePlan(room.roomId)}
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors w-fit"
                              >
                                <Plus className="w-4 h-4" />
                                ADD RATEPLAN
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Rateplans */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {room.ratePlans && room.ratePlans.length > 0 ? (
                              <>
                                <div className="flex flex-col gap-1.5">
                                  {room.ratePlans.map((ratePlan, index) => (
                                    <div
                                      key={index}
                                      className="text-sm text-gray-700 font-medium"
                                    >
                                      {index + 1}. {ratePlan}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleViewRatePlans(room.roomId)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mt-1 w-fit"
                                >
                                  <Eye className="w-4 h-4 shrink-0" />
                                  <span>{expandedRatePlans.has(room.roomId)
                                    ? "HIDE RATEPLANS"
                                    : "CLICK TO VIEW RATEPLANS"}</span>
                                </button>
                              </>
                            ) : (
                              <div className="text-sm text-gray-400 italic">
                                No rate plans available
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Rate Plans Row - Full Width */}
                      {expandedRatePlans.has(room.roomId) && (
                        <tr className="bg-gray-50">
                          <td colSpan={4} className="px-6 py-4 border-t-2 border-[#2f3d95]">
                            {loadingRatePlans.has(room.roomId) ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Loading rate plans...
                              </div>
                            ) : ratePlansData[room.roomId] && ratePlansData[room.roomId].length > 0 ? (
                              <div className="flex gap-3">
                                <div className="flex items-start pt-4">
                                  <ChevronRight className="w-5 h-5 text-[#2f3d95]" />
                                </div>
                                <div className="flex-1 bg-white rounded-lg border-l-4 border-[#2f3d95] border-r border-t border-b border-gray-200 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                          Rateplan Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                          Meal Plan
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                          Payment Mode
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {ratePlansData[room.roomId].map((ratePlan) => (
                                        <tr key={ratePlan.ratePlanId} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                              {ratePlan.ratePlanName}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">
                                              {ratePlan.mealPlan}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">
                                              {ratePlan.paymentMode || "N/A"}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex flex-col gap-3">
                                              <div className="flex items-center">
                                                <Toggle
                                                  checked={ratePlan.active}
                                                  onChange={() => handleToggleRatePlanActive(room.roomId, ratePlan.ratePlanId, ratePlan.active)}
                                                  label="Active"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-2">
                                                <button
                                                  onClick={() => handleEditRatePlan(room.roomId, ratePlan.ratePlanId)}
                                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors w-fit"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                  EDIT RATEPLAN
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className="flex items-start pt-4">
                                  <ChevronRight className="w-5 h-5 text-[#2f3d95]" />
                                </div>
                                <div className="flex-1 p-4 text-center text-sm text-gray-500 bg-white rounded border border-gray-200">
                                  No rate plans available
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

