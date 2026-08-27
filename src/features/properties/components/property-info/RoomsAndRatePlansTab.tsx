import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  adminService,
  type HotelRoom,
  type RatePlan,
  type CreateRatePlanRequest,
  type UpdateRatePlanRequest,
  type RatePlanEditResponse,
  type MealPlanOption,
} from "@/features/admin/services/adminService";
import {
  Plus,
  Pencil,
  Building2,
  BedDouble,
  ChevronDown,
  ChevronRight,
  Loader2,
  Tag,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/features/reports/components/reportUiHelpers";
import {
  ActionLink,
  RatePlanRow,
  StatusPill,
} from "./roomsAndRatePlansUi";
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
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(
    new Set(),
  );
  const [ratePlansData, setRatePlansData] = useState<
    Record<string, RatePlan[]>
  >({});
  const [loadingRatePlans, setLoadingRatePlans] = useState<Set<string>>(
    new Set(),
  );
  const [isAddRatePlanModalOpen, setIsAddRatePlanModalOpen] = useState(false);
  const [selectedRoomIdForRatePlan, setSelectedRoomIdForRatePlan] = useState<
    string | null
  >(null);
  const [isCreatingRatePlan, setIsCreatingRatePlan] = useState(false);
  const [isEditRatePlanModalOpen, setIsEditRatePlanModalOpen] = useState(false);
  const [selectedRatePlanForEdit, setSelectedRatePlanForEdit] = useState<{
    roomId: string;
    ratePlanId: number;
  } | null>(null);
  const [isUpdatingRatePlan, setIsUpdatingRatePlan] = useState(false);
  const [ratePlanEditData, setRatePlanEditData] =
    useState<RatePlanEditResponse | null>(null);
  const [availableMealPlans, setAvailableMealPlans] = useState<
    MealPlanOption[]
  >([]);
  const { toast, showToast, hideToast } = useToast();
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomFormMode, setRoomFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingRoomId, setEditingRoomId] = useState<string | undefined>(
    undefined,
  );

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
        room.roomId === roomId ? { ...room, active: newActiveStatus } : room,
      ),
    );

    try {
      await adminService.updateRoomActiveStatus(hotelId, roomId, {
        active: newActiveStatus,
      });
      showToast(
        `Room ${newActiveStatus ? "activated" : "deactivated"} successfully!`,
        "success",
      );
    } catch (error) {
      console.error("Error updating room status:", error);
      showToast("Failed to update room status. Please try again.", "error");
      // Revert optimistic update
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === roomId ? { ...room, active: currentActive } : room,
        ),
      );
    }
  };

  const handleToggleRatePlanActive = async (
    roomId: string,
    ratePlanId: number,
    currentActive: boolean,
  ) => {
    const newActiveStatus = !currentActive;

    // Optimistic update (expanded detail table)
    setRatePlansData((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] || []).map((rp) =>
        rp.ratePlanId === ratePlanId ? { ...rp, active: newActiveStatus } : rp,
      ),
    }));

    // Optimistic update (summary column in the rooms table)
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.roomId === roomId
          ? {
              ...room,
              ratePlans: room.ratePlans.map((rp) =>
                typeof rp !== "string" && rp.ratePlanId === ratePlanId
                  ? { ...rp, ratePlanActive: newActiveStatus }
                  : rp,
              ),
            }
          : room,
      ),
    );

    try {
      await adminService.updateRatePlanActiveStatus(
        hotelId,
        roomId,
        ratePlanId,
        {
          active: newActiveStatus,
        },
      );
      showToast(
        `Rate plan ${newActiveStatus ? "activated" : "deactivated"} successfully!`,
        "success",
      );
    } catch (error) {
      console.error("Error updating rate plan status:", error);
      showToast(
        "Failed to update rate plan status. Please try again.",
        "error",
      );
      // Revert optimistic update
      setRatePlansData((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((rp) =>
          rp.ratePlanId === ratePlanId ? { ...rp, active: currentActive } : rp,
        ),
      }));
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === roomId
            ? {
                ...room,
                ratePlans: room.ratePlans.map((rp) =>
                  typeof rp !== "string" && rp.ratePlanId === ratePlanId
                    ? { ...rp, ratePlanActive: currentActive }
                    : rp,
                ),
              }
            : room,
        ),
      );
    }
  };

  const handleEditRoom = (roomId: string) => {
    setEditingRoomId(roomId);
    setRoomFormMode("EDIT");
    setShowRoomForm(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleAddRatePlan = (roomId: string) => {
    setSelectedRoomIdForRatePlan(roomId);
    setIsAddRatePlanModalOpen(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleCreateRatePlan = async (data: CreateRatePlanRequest) => {
    if (!selectedRoomIdForRatePlan) return;

    try {
      setIsCreatingRatePlan(true);
      const newRatePlan = await adminService.createRatePlan(
        hotelId,
        selectedRoomIdForRatePlan,
        data,
      );

      // Add the new rate plan to the existing list (expanded detail table)
      setRatePlansData((prev) => ({
        ...prev,
        [selectedRoomIdForRatePlan]: [
          ...(prev[selectedRoomIdForRatePlan] || []),
          newRatePlan,
        ],
      }));

      // Add the new rate plan to the summary column in the rooms table
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === selectedRoomIdForRatePlan
            ? {
                ...room,
                ratePlans: [
                  ...room.ratePlans,
                  {
                    ratePlanId: newRatePlan.ratePlanId,
                    ratePlanName: newRatePlan.ratePlanName,
                    ratePlanActive: newRatePlan.active,
                  },
                ],
              }
            : room,
        ),
      );

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
    window.scrollTo({ top: 0, behavior: "auto" });
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
        selectedRatePlanForEdit.ratePlanId,
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
        updatePayload,
      );

      // The update endpoint may return null, so fall back to the submitted values.
      const updatedName = updatedRatePlan?.ratePlanName ?? data.ratePlanName;
      const updatedMealPlan = updatedRatePlan?.mealPlan ?? data.mealPlan;

      // Update the rate plan in the existing list (expanded detail table)
      setRatePlansData((prev) => ({
        ...prev,
        [selectedRatePlanForEdit.roomId]: (
          prev[selectedRatePlanForEdit.roomId] || []
        ).map((rp) =>
          rp.ratePlanId === selectedRatePlanForEdit.ratePlanId
            ? {
                ...rp,
                ...(updatedRatePlan ?? {}),
                ratePlanName: updatedName,
                mealPlan: updatedMealPlan,
              }
            : rp,
        ),
      }));

      // Update the rate plan name in the summary column of the rooms table
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === selectedRatePlanForEdit.roomId
            ? {
                ...room,
                ratePlans: room.ratePlans.map((rp) =>
                  typeof rp !== "string" &&
                  rp.ratePlanId === selectedRatePlanForEdit.ratePlanId
                    ? { ...rp, ratePlanName: updatedName }
                    : rp,
                ),
              }
            : room,
        ),
      );

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
    window.scrollTo({ top: 0, behavior: "auto" });
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
      <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
          Loading rooms...
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
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

  const totalRatePlans = rooms.reduce(
    (sum, room) => sum + (room.ratePlans?.length ?? 0),
    0,
  );

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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#eef2ff]/80 to-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2f3d95] text-white shadow-sm">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Your rooms
              </p>
              <p className="text-xs text-slate-500">
                {totalRooms} room{totalRooms === 1 ? "" : "s"}
                {totalRatePlans > 0
                  ? ` · ${totalRatePlans} rate plan${totalRatePlans === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreateNewRoom}
            size="sm"
            className="gap-1.5 bg-[#2f3d95] hover:bg-[#263578]"
          >
            <Plus className="h-4 w-4" />
            Add room
          </Button>
        </div>

        <div className="p-3 sm:p-4">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2f3d95] shadow-sm ring-1 ring-slate-200">
                <Building2 className="h-7 w-7" />
              </div>
              <p className="font-semibold text-slate-900">No rooms yet</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Start by adding a room type, then attach rate plans for each
                room.
              </p>
              <Button
                onClick={handleCreateNewRoom}
                size="sm"
                className="mt-5 gap-1.5 bg-[#2f3d95] hover:bg-[#263578]"
              >
                <Plus className="h-4 w-4" />
                Add first room
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => {
                const isOpen = expandedRatePlans.has(room.roomId);
                const ratePlanCount = room.ratePlans?.length ?? 0;
                const detailedPlans = ratePlansData[room.roomId];
                const isLoadingPlans = loadingRatePlans.has(room.roomId);

                return (
                  <article
                    key={room.roomId}
                    className={cn(
                      "overflow-hidden rounded-xl border transition-shadow",
                      room.active
                        ? "border-slate-200 bg-white shadow-sm hover:shadow-md"
                        : "border-slate-200/80 bg-slate-50/40",
                    )}
                  >
                    {/* Room header — tap to expand rate plans */}
                    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                      <button
                        type="button"
                        onClick={() => void handleViewRatePlans(room.roomId)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400",
                            isOpen && "bg-[#eef2ff] text-[#2f3d95]",
                          )}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            room.active
                              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                              : "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                          )}
                        >
                          <BedDouble className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {room.roomName}
                            </h3>
                            <StatusPill active={room.active} />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {room.description?.trim() ||
                              "No description added for this room"}
                          </p>
                          <p className="mt-1.5 text-xs font-medium text-[#2f3d95]">
                            {isOpen
                              ? "Click to hide rate plans"
                              : ratePlanCount > 0
                                ? `${ratePlanCount} rate plan${ratePlanCount === 1 ? "" : "s"} — click to view`
                                : "No rate plans — click to expand"}
                          </p>
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:border-l lg:border-slate-100 lg:pl-4">
                        <Toggle
                          checked={room.active}
                          onChange={() =>
                            handleToggleActive(room.roomId, room.active)
                          }
                          checkedLabel="Live"
                          uncheckedLabel="Off"
                        />
                        <ActionLink
                          icon={Pencil}
                          label="Edit room"
                          onClick={() => handleEditRoom(room.roomId)}
                        />
                        <ActionLink
                          icon={Plus}
                          label="Add rate plan"
                          onClick={() => handleAddRatePlan(room.roomId)}
                          variant="primary"
                        />
                      </div>
                    </div>

                    {/* Expanded rate plans */}
                    {isOpen ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div className="mb-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Tag className="h-3.5 w-3.5 text-violet-500" />
                            Rate plans
                          </p>
                        </div>

                        {isLoadingPlans ? (
                          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-8 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
                            Loading rate plans...
                          </div>
                        ) : detailedPlans && detailedPlans.length > 0 ? (
                          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                            <div className="hidden px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3 sm:bg-slate-50/80">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Plan name
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Meal & payment
                              </span>
                              <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Status
                              </span>
                            </div>
                            {detailedPlans.map((ratePlan) => (
                              <RatePlanRow
                                key={ratePlan.ratePlanId}
                                name={ratePlan.ratePlanName}
                                mealPlan={formatStatusLabel(ratePlan.mealPlan)}
                                paymentMode={
                                  ratePlan.paymentMode
                                    ? formatStatusLabel(ratePlan.paymentMode)
                                    : "Not set"
                                }
                                active={ratePlan.active}
                                onToggle={() =>
                                  handleToggleRatePlanActive(
                                    room.roomId,
                                    ratePlan.ratePlanId,
                                    ratePlan.active,
                                  )
                                }
                                onEdit={() =>
                                  handleEditRatePlan(
                                    room.roomId,
                                    ratePlan.ratePlanId,
                                  )
                                }
                              />
                            ))}
                          </div>
                        ) : ratePlanCount > 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                            Rate plan names are listed above. Details could not
                            be loaded — try again.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                            <p className="text-sm font-medium text-slate-700">
                              No rate plans for this room
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Use <span className="font-medium">Add rate plan</span>{" "}
                              above to set meal options and pricing.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
