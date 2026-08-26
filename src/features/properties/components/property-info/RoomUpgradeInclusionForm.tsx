import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  CalendarRange,
  Loader2,
  Save,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import {
  adminService,
  type HotelRoom,
} from "@/features/admin/services/adminService";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  isoToReportDateText,
  parseOptionalReportDate,
  parseReportDateDdMmYyyy,
} from "@/features/reports/components/reportUiHelpers";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  createHotelInclusion,
  updateRatePlanInclusion,
} from "../../services/inclusionsService";
import type {
  CreateHotelInclusionRequest,
  InclusionAssignment,
  InclusionCatalogueItem,
  InclusionEditTarget,
  UpdateRatePlanInclusionRequest,
} from "../../services/inclusionsTypes";
import {
  InclusionSectionCard,
  AppliedToLockedCard,
  roomLiveId,
} from "./inclusionFormShared";
import { InclusionAssignmentsModal } from "./InclusionAssignmentsModal";

type RoomUpgradeInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

export function RoomUpgradeInclusionForm({
  hotelId,
  inclusion,
  onBack,
  onSuccess,
  showToast,
  editTarget = null,
}: RoomUpgradeInclusionFormProps) {
  const idPrefix = "room-upgrade";
  const isEdit = Boolean(editTarget);
  const initial = editTarget?.item;

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);

  const [targetRoomId, setTargetRoomId] = useState(
    String(initial?.details?.targetRoomId ?? ""),
  );
  const [validFrom, setValidFrom] = useState(
    isoToReportDateText(initial?.validFrom),
  );
  const [validTo, setValidTo] = useState(
    isoToReportDateText(initial?.validTo),
  );
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Omit<
    CreateHotelInclusionRequest,
    "assignments"
  > | null>(null);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const data = await adminService.getHotelAdminRooms(hotelId);
      setRooms(data.rooms || []);
    } catch (err) {
      setRooms([]);
      setRoomsError(extractErrorMessage(err));
    } finally {
      setRoomsLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const targetRoomOptions = useMemo(
    () =>
      rooms.map((room) => ({
        value: roomLiveId(room),
        label:
          room.active === false
            ? `${room.roomName} (inactive)`
            : room.roomName,
      })),
    [rooms],
  );

  const fromIso = validFrom.trim()
    ? parseReportDateDdMmYyyy(validFrom)
    : null;
  const toIso = validTo.trim() ? parseReportDateDdMmYyyy(validTo) : null;
  const fromIncomplete = Boolean(validFrom.trim()) && !fromIso;
  const toIncomplete = Boolean(validTo.trim()) && !toIso;
  const datesValid =
    !fromIncomplete &&
    !toIncomplete &&
    (!fromIso || !toIso || fromIso <= toIso);

  const canSubmit =
    Boolean(targetRoomId) && datesValid && !saving && !roomsLoading;

  const buildBody = (): UpdateRatePlanInclusionRequest => {
    const body: UpdateRatePlanInclusionRequest = {
      offerType: "FREE",
      paymentLocation: "NONE",
      details: { targetRoomId },
    };
    const parsedFrom = parseOptionalReportDate(validFrom);
    const parsedTo = parseOptionalReportDate(validTo);
    if (parsedFrom) body.validFrom = parsedFrom;
    if (parsedTo) body.validTo = parsedTo;
    return body;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body = buildBody();

    if (isEdit && editTarget) {
      setSaving(true);
      try {
        await updateRatePlanInclusion(
          hotelId,
          editTarget.roomKey,
          editTarget.ratePlanId,
          editTarget.inclusionId,
          body,
        );
        showToast("Room upgrade inclusion updated.", "success");
        onSuccess();
      } catch (err) {
        showToast(extractErrorMessage(err), "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    setPendingPayload({
      inclusionCode: inclusion.code || "ROOM_UPGRADE",
      ...body,
    });
    setAssignOpen(true);
  };

  const handleConfirmAssignments = async (
    assignments: InclusionAssignment[],
  ) => {
    if (!pendingPayload) return;
    setSaving(true);
    try {
      await createHotelInclusion(hotelId, {
        ...pendingPayload,
        assignments,
      });
      showToast("Room upgrade inclusion created.", "success");
      setAssignOpen(false);
      setPendingPayload(null);
      onSuccess();
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#2f3d95] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEdit ? "Back to list" : "Back to catalogue"}
        </button>
        <h2 className="text-lg font-semibold text-slate-900">
          {isEdit
            ? `Edit ${inclusion.name || "Room upgrade"}`
            : inclusion.name || "Room upgrade"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
        {isEdit && editTarget ? (
          <AppliedToLockedCard
            roomName={editTarget.roomName}
            ratePlanName={editTarget.ratePlanName}
          />
        ) : null}

        <InclusionSectionCard
          title="Upgrade Target"
          subtitle="Choose the room guests can upgrade into."
          icon={BedDouble}
          iconTheme="bg-indigo-50 text-indigo-700 ring-indigo-100"
        >
          {roomsError ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              {roomsError}
            </div>
          ) : null}
          <Select
            id={`${idPrefix}-target-room`}
            label="Target room"
            labelIcon={BedDouble}
            labelIconTheme="indigo"
            required
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
            options={targetRoomOptions}
            placeholder={
              roomsLoading
                ? "Loading rooms…"
                : targetRoomOptions.length
                  ? "Select upgrade target room"
                  : "No rooms available"
            }
            disabled={roomsLoading || targetRoomOptions.length === 0}
          />
        </InclusionSectionCard>

        <InclusionSectionCard
          title="Validity (optional)"
          subtitle="Limit when this free inclusion can be offered."
          icon={CalendarRange}
          iconTheme="bg-slate-100 text-slate-600 ring-slate-200"
        >
          <ReportCustomDateFields
            fromText={validFrom}
            toText={validTo}
            onFromTextChange={setValidFrom}
            onToTextChange={setValidTo}
            fromLabel="Valid from (optional)"
            toLabel="Valid to (optional)"
          />
          {fromIncomplete || toIncomplete ? (
            <p className="mt-1.5 text-xs text-rose-600">
              Enter dates as dd/mm/yyyy
            </p>
          ) : !datesValid ? (
            <p className="mt-1.5 text-xs text-rose-600">
              Valid to must be on or after valid from
            </p>
          ) : null}
        </InclusionSectionCard>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#263578] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && isEdit ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Update inclusion" : "Create inclusion"}
          </button>
        </div>
      </form>

      {!isEdit ? (
        <InclusionAssignmentsModal
          open={assignOpen}
          hotelId={hotelId}
          confirming={saving}
          onClose={() => {
            if (saving) return;
            setAssignOpen(false);
            setPendingPayload(null);
          }}
          onConfirm={handleConfirmAssignments}
        />
      ) : null}
    </div>
  );
}
