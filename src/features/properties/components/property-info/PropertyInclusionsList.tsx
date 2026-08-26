import { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  ChevronDown,
  ChevronRight,
  Loader2,
  Tag,
} from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  adminService,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDate,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { cn } from "@/lib/utils";
import {
  getRatePlanInclusions,
  updateRatePlanInclusionActiveStatus,
} from "../../services/inclusionsService";
import type { RatePlanInclusionItem } from "../../services/inclusionsTypes";
import { roomPathKey } from "./inclusionFormShared";

type PropertyInclusionsListProps = {
  hotelId: string;
  refreshKey?: number;
  onEditInclusion?: (target: {
    roomKey: string;
    ratePlanId: number;
    roomName: string;
    ratePlanName: string;
    item: RatePlanInclusionItem;
  }) => void;
};

type RatePlanNode = {
  ratePlan: RatePlan;
  planCode: string | null;
  inclusions: RatePlanInclusionItem[];
  loading: boolean;
  error: string | null;
};

type RoomNode = {
  room: HotelRoom;
  roomKey: string;
  ratePlans: RatePlanNode[];
  ratePlansLoading: boolean;
  ratePlansError: string | null;
};

function detailsSummary(details: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (details.hoursBeforeStandardCheckIn != null) {
    parts.push(`${details.hoursBeforeStandardCheckIn}h before check-in`);
  }
  if (details.hoursAfterStandardCheckOut != null) {
    parts.push(`${details.hoursAfterStandardCheckOut}h after check-out`);
  }
  if (details.persons != null) {
    parts.push(`${details.persons} person${Number(details.persons) === 1 ? "" : "s"}`);
  }
  if (details.transferType != null) {
    parts.push(formatStatusLabel(String(details.transferType)));
  }
  if (details.vehicleType != null) {
    parts.push(formatStatusLabel(String(details.vehicleType)));
  }
  if (details.targetRoomId != null) {
    parts.push(`Target room ${String(details.targetRoomId).slice(0, 8)}…`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function InclusionRow({
  item,
  onEdit,
  onToggleActive,
  toggling,
}: {
  item: RatePlanInclusionItem;
  onEdit?: () => void;
  onToggleActive?: () => void;
  toggling?: boolean;
}) {
  const detailText = detailsSummary(item.details);
  const priceText =
    item.offerType === "DISCOUNTED" && item.price != null
      ? `${item.currency || "INR"} ${item.price}${
          item.pricingUnit ? ` · ${formatStatusLabel(item.pricingUnit)}` : ""
        }`
      : null;
  const validity =
    item.validFrom || item.validTo
      ? `${item.validFrom ? formatReportDate(item.validFrom) : "—"} → ${
          item.validTo ? formatReportDate(item.validTo) : "—"
        }`
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">
            {item.code}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
              item.active
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200",
            )}
          >
            {item.active ? "Active" : "Inactive"}
          </span>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              disabled={toggling}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#2f3d95] hover:bg-slate-50 disabled:opacity-50"
            >
              Edit
            </button>
          ) : null}
          {onToggleActive ? (
            <button
              type="button"
              onClick={onToggleActive}
              disabled={toggling}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-50",
                item.active
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
              )}
            >
              {toggling ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  …
                </span>
              ) : item.active ? (
                "Deactivate"
              ) : (
                "Reactivate"
              )}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
          {formatStatusLabel(item.offerType)}
        </span>
        {item.availabilityType ? (
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
            {formatStatusLabel(item.availabilityType)}
          </span>
        ) : null}
        {item.paymentLocation ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {formatStatusLabel(item.paymentLocation)}
          </span>
        ) : null}
        {item.category ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            <Tag className="h-3 w-3" />
            {formatStatusLabel(item.category)}
          </span>
        ) : null}
      </div>
      {detailText || priceText || validity ? (
        <div className="mt-2 space-y-0.5 text-xs text-slate-500">
          {detailText ? <p>{detailText}</p> : null}
          {priceText ? <p>{priceText}</p> : null}
          {validity ? <p>Valid: {validity}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function PropertyInclusionsList({
  hotelId,
  refreshKey = 0,
  onEditInclusion,
}: PropertyInclusionsListProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomNode[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedRatePlans, setExpandedRatePlans] = useState<Set<string>>(
    new Set(),
  );
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const roomsData = await adminService.getHotelAdminRooms(hotelId);
      const hotelRooms = roomsData.rooms || [];

      const roomNodes: RoomNode[] = await Promise.all(
        hotelRooms.map(async (room) => {
          const key = roomPathKey(room);
          try {
            const rpData = await adminService.getRoomRatePlans(hotelId, key);
            const ratePlans = rpData.ratePlans || [];

            const ratePlanNodes: RatePlanNode[] = await Promise.all(
              ratePlans.map(async (ratePlan) => {
                try {
                  const inclusionsData = await getRatePlanInclusions(
                    hotelId,
                    key,
                    ratePlan.ratePlanId,
                  );
                  return {
                    ratePlan,
                    planCode: inclusionsData.planCode,
                    inclusions: inclusionsData.inclusions,
                    loading: false,
                    error: null,
                  };
                } catch (err) {
                  return {
                    ratePlan,
                    planCode: null,
                    inclusions: [],
                    loading: false,
                    error: extractErrorMessage(err),
                  };
                }
              }),
            );

            return {
              room,
              roomKey: key,
              ratePlans: ratePlanNodes,
              ratePlansLoading: false,
              ratePlansError: null,
            };
          } catch (err) {
            return {
              room,
              roomKey: key,
              ratePlans: [],
              ratePlansLoading: false,
              ratePlansError: extractErrorMessage(err),
            };
          }
        }),
      );

      setRooms(roomNodes);
    } catch (err) {
      setRooms([]);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void loadTree();
  }, [loadTree, refreshKey]);

  const toggleRoom = (roomKey: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomKey)) next.delete(roomKey);
      else next.add(roomKey);
      return next;
    });
  };

  const toggleRatePlan = (key: string) => {
    setExpandedRatePlans((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleActive = async (
    roomKey: string,
    ratePlanId: number,
    item: RatePlanInclusionItem,
  ) => {
    const toggleKey = `${roomKey}:${ratePlanId}:${item.id}`;
    if (togglingIds.has(toggleKey)) return;

    const nextActive = !item.active;
    setTogglingIds((prev) => new Set(prev).add(toggleKey));
    setRooms((prev) =>
      prev.map((room) =>
        room.roomKey !== roomKey
          ? room
          : {
              ...room,
              ratePlans: room.ratePlans.map((rp) =>
                rp.ratePlan.ratePlanId !== ratePlanId
                  ? rp
                  : {
                      ...rp,
                      inclusions: rp.inclusions.map((inc) =>
                        inc.id === item.id
                          ? { ...inc, active: nextActive }
                          : inc,
                      ),
                    },
              ),
            },
      ),
    );

    try {
      await updateRatePlanInclusionActiveStatus(
        hotelId,
        roomKey,
        ratePlanId,
        item.id,
        nextActive,
      );
      showToast(
        nextActive
          ? `"${item.name}" reactivated.`
          : `"${item.name}" deactivated.`,
        "success",
      );
    } catch (err) {
      setRooms((prev) =>
        prev.map((room) =>
          room.roomKey !== roomKey
            ? room
            : {
                ...room,
                ratePlans: room.ratePlans.map((rp) =>
                  rp.ratePlan.ratePlanId !== ratePlanId
                    ? rp
                    : {
                        ...rp,
                        inclusions: rp.inclusions.map((inc) =>
                          inc.id === item.id
                            ? { ...inc, active: item.active }
                            : inc,
                        ),
                      },
                ),
              },
        ),
      );
      showToast(
        extractErrorMessage(err) ||
          "Failed to update inclusion status. Please try again.",
        "error",
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2f3d95]" />
        Loading rooms, rate plans, and inclusions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <BedDouble className="h-6 w-6" />
        </div>
        <p className="font-medium text-slate-800">No rooms found</p>
        <p className="mt-1 text-sm text-slate-500">
          Add rooms and rate plans first, then attach inclusions.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {rooms.map((roomNode) => {
        const roomOpen = expandedRooms.has(roomNode.roomKey);
        const inclusionCount = roomNode.ratePlans.reduce(
          (sum, rp) => sum + rp.inclusions.length,
          0,
        );
        return (
          <div
            key={roomNode.roomKey}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <button
              type="button"
              onClick={() => toggleRoom(roomNode.roomKey)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              {roomOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <BedDouble className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {roomNode.room.roomName}
                </p>
                <p className="text-xs text-slate-500">
                  {roomNode.ratePlans.length} rate plan
                  {roomNode.ratePlans.length === 1 ? "" : "s"}
                  {" · "}
                  {inclusionCount} inclusion
                  {inclusionCount === 1 ? "" : "s"}
                </p>
              </div>
              {roomNode.room.active === false ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  Inactive
                </span>
              ) : null}
            </button>

            {roomOpen ? (
              <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4">
                {roomNode.ratePlansError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {roomNode.ratePlansError}
                  </p>
                ) : roomNode.ratePlans.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                    No rate plans for this room
                  </p>
                ) : (
                  roomNode.ratePlans.map((rpNode) => {
                    const rpKey = `${roomNode.roomKey}:${rpNode.ratePlan.ratePlanId}`;
                    const rpOpen = expandedRatePlans.has(rpKey);
                    const inactive =
                      rpNode.ratePlan.active === false ||
                      rpNode.ratePlan.ratePlanActive === false;
                    return (
                      <div
                        key={rpKey}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleRatePlan(rpKey)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          {rpOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {rpNode.ratePlan.ratePlanName}
                              {rpNode.planCode ? (
                                <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                                  ({rpNode.planCode})
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rpNode.inclusions.length} inclusion
                              {rpNode.inclusions.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          {inactive ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Inactive
                            </span>
                          ) : null}
                        </button>

                        {rpOpen ? (
                          <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-3 py-3">
                            {rpNode.error ? (
                              <p className="text-sm text-rose-600">
                                {rpNode.error}
                              </p>
                            ) : rpNode.inclusions.length === 0 ? (
                              <p className="text-center text-sm text-slate-500">
                                No inclusions on this rate plan yet
                              </p>
                            ) : (
                              rpNode.inclusions.map((item) => (
                                <InclusionRow
                                  key={item.id}
                                  item={item}
                                  toggling={togglingIds.has(
                                    `${roomNode.roomKey}:${rpNode.ratePlan.ratePlanId}:${item.id}`,
                                  )}
                                  onToggleActive={() =>
                                    void handleToggleActive(
                                      roomNode.roomKey,
                                      rpNode.ratePlan.ratePlanId,
                                      item,
                                    )
                                  }
                                  onEdit={
                                    onEditInclusion
                                      ? () =>
                                          onEditInclusion({
                                            roomKey: roomNode.roomKey,
                                            ratePlanId:
                                              rpNode.ratePlan.ratePlanId,
                                            roomName: roomNode.room.roomName,
                                            ratePlanName:
                                              rpNode.ratePlan.ratePlanName,
                                            item,
                                          })
                                      : undefined
                                  }
                                />
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
    />
    </>
  );
}
