import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import {
  adminService,
  type HotelRoom,
  type RatePlan,
} from "@/features/admin/services/adminService";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { cn } from "@/lib/utils";
import type { InclusionAssignment } from "../../services/inclusionsTypes";
import { roomPathKey } from "./inclusionFormShared";

type RoomNode = {
  room: HotelRoom;
  roomKey: string;
  ratePlans: RatePlan[];
  loading: boolean;
  error: string | null;
};

type InclusionAssignmentsModalProps = {
  open: boolean;
  hotelId: string;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: (assignments: InclusionAssignment[]) => void;
};

export function InclusionAssignmentsModal({
  open,
  hotelId,
  confirming = false,
  onClose,
  onConfirm,
}: InclusionAssignmentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  /** roomKey -> selected ratePlanIds */
  const [selected, setSelected] = useState<Record<string, number[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected({});
    setExpanded(new Set());
    try {
      const roomsData = await adminService.getHotelAdminRooms(hotelId);
      const hotelRooms = roomsData.rooms || [];
      const nodes: RoomNode[] = await Promise.all(
        hotelRooms.map(async (room) => {
          const key = roomPathKey(room);
          try {
            const rpData = await adminService.getRoomRatePlans(hotelId, key);
            return {
              room,
              roomKey: key,
              ratePlans: rpData.ratePlans || [],
              loading: false,
              error: null,
            };
          } catch (err) {
            return {
              room,
              roomKey: key,
              ratePlans: [],
              loading: false,
              error: extractErrorMessage(err),
            };
          }
        }),
      );
      setRooms(nodes);
    } catch (err) {
      setRooms([]);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const totalSelected = useMemo(
    () =>
      Object.values(selected).reduce((sum, ids) => sum + ids.length, 0),
    [selected],
  );

  const toggleExpanded = (roomKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(roomKey)) next.delete(roomKey);
      else next.add(roomKey);
      return next;
    });
  };

  const toggleRatePlan = (roomKey: string, ratePlanId: number) => {
    setSelected((prev) => {
      const current = prev[roomKey] || [];
      const exists = current.includes(ratePlanId);
      const nextIds = exists
        ? current.filter((id) => id !== ratePlanId)
        : [...current, ratePlanId];
      const next = { ...prev };
      if (nextIds.length === 0) delete next[roomKey];
      else next[roomKey] = nextIds;
      return next;
    });
  };

  const toggleAllForRoom = (roomKey: string, ratePlans: RatePlan[]) => {
    const ids = ratePlans.map((rp) => rp.ratePlanId);
    setSelected((prev) => {
      const current = prev[roomKey] || [];
      const allSelected =
        ids.length > 0 && ids.every((id) => current.includes(id));
      const next = { ...prev };
      if (allSelected) delete next[roomKey];
      else next[roomKey] = ids;
      return next;
    });
  };

  const handleConfirm = () => {
    const assignments: InclusionAssignment[] = Object.entries(selected)
      .filter(([, ratePlanIds]) => ratePlanIds.length > 0)
      .map(([roomKey, ratePlanIds]) => ({ roomKey, ratePlanIds }));
    if (assignments.length === 0) return;
    onConfirm(assignments);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inclusion-assignments-title"
    >
      <div className="flex max-h-[min(90vh,44rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <h3
              id="inclusion-assignments-title"
              className="text-base font-semibold text-slate-900"
            >
              Apply to rooms & rate plans
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Multi-select where this inclusion should be offered
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2f3d95]" />
              Loading rooms…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-4 text-center text-sm text-rose-700">
              {error}
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
              No rooms found for this hotel.
            </div>
          ) : (
            <ul className="space-y-2">
              {rooms.map((node) => {
                const openRoom = expanded.has(node.roomKey);
                const selectedIds = selected[node.roomKey] || [];
                const allIds = node.ratePlans.map((rp) => rp.ratePlanId);
                const allSelected =
                  allIds.length > 0 &&
                  allIds.every((id) => selectedIds.includes(id));
                const someSelected = selectedIds.length > 0;

                return (
                  <li
                    key={node.roomKey}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(node.roomKey)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        aria-expanded={openRoom}
                      >
                        {openRoom ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          someSelected
                            ? "bg-[#2f3d95]/10 text-[#2f3d95]"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <BedDouble className="h-4 w-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(node.roomKey)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {node.room.roomName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {node.ratePlans.length} rate plan
                          {node.ratePlans.length === 1 ? "" : "s"}
                          {someSelected
                            ? ` · ${selectedIds.length} selected`
                            : ""}
                        </p>
                      </button>
                      {node.ratePlans.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleAllForRoom(node.roomKey, node.ratePlans)
                          }
                          className={cn(
                            "rounded-lg border px-2 py-1 text-[11px] font-semibold",
                            allSelected
                              ? "border-[#2f3d95] bg-[#2f3d95] text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {allSelected ? "Clear" : "Select all"}
                        </button>
                      ) : null}
                    </div>

                    {openRoom ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2">
                        {node.error ? (
                          <p className="px-1 py-2 text-sm text-rose-600">
                            {node.error}
                          </p>
                        ) : node.ratePlans.length === 0 ? (
                          <p className="px-1 py-2 text-sm text-slate-400">
                            No rate plans for this room
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {node.ratePlans.map((rp) => {
                              const checked = selectedIds.includes(
                                rp.ratePlanId,
                              );
                              const inactive =
                                rp.active === false ||
                                rp.ratePlanActive === false;
                              return (
                                <li key={rp.ratePlanId}>
                                  <label
                                    className={cn(
                                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition",
                                      checked
                                        ? "bg-[#2f3d95]/8"
                                        : "hover:bg-white",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                        checked
                                          ? "border-[#2f3d95] bg-[#2f3d95] text-white"
                                          : "border-slate-300 bg-white",
                                      )}
                                    >
                                      {checked ? (
                                        <Check className="h-3 w-3" />
                                      ) : null}
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={checked}
                                      onChange={() =>
                                        toggleRatePlan(
                                          node.roomKey,
                                          rp.ratePlanId,
                                        )
                                      }
                                    />
                                    <span className="min-w-0 flex-1 text-sm text-slate-800">
                                      {rp.ratePlanName}
                                      {inactive ? (
                                        <span className="ml-1 text-xs text-slate-400">
                                          (inactive)
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-500">
            {totalSelected} rate plan{totalSelected === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || totalSelected === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white hover:bg-[#263578] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create inclusion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
