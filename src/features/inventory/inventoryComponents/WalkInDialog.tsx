import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import type { WalkInHotelRequest } from "../services/inventoryService";

export type WalkInMode = "add" | "cancel";

export interface WalkInDialogContext {
  roomId: number;
  roomName: string;
  inventoryDate: string;
}

interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: WalkInDialogContext | null;
  isSubmitting?: boolean;
  onSubmit: (mode: WalkInMode, payload: WalkInHotelRequest) => void | Promise<void>;
}

function formatInventoryDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMMM dd, yyyy");
  } catch {
    return dateStr;
  }
}

export function WalkInDialog({
  open,
  onOpenChange,
  context,
  isSubmitting = false,
  onSubmit,
}: WalkInDialogProps) {
  const [mode, setMode] = useState<WalkInMode>("add");
  const [rooms, setRooms] = useState("1");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("add");
    setRooms("1");
    setReason("");
    setRemarks("");
    setError(null);
  }, [open, context?.roomId, context?.inventoryDate]);

  const handleSubmit = async () => {
    if (!context) return;

    const parsedRooms = Number(rooms);
    const trimmedReason = reason.trim();
    const trimmedRemarks = remarks.trim();

    if (!Number.isFinite(parsedRooms) || parsedRooms < 1) {
      setError("Enter at least 1 room.");
      return;
    }
    if (!trimmedReason) {
      setError("Reason is required.");
      return;
    }

    setError(null);
    await onSubmit(mode, {
      roomId: context.roomId,
      inventoryDate: context.inventoryDate,
      rooms: parsedRooms,
      reason: trimmedReason,
      remarks: trimmedRemarks || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Walk-in inventory</DialogTitle>
          <DialogDescription>
            {context ? (
              <>
                <span className="font-medium text-slate-700">
                  {context.roomName}
                </span>{" "}
                · {formatInventoryDateLabel(context.inventoryDate)}
              </>
            ) : (
              "Select a room and date to manage walk-in inventory."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["add", "cancel"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={isSubmitting}
                onClick={() => setMode(option)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                  mode === option
                    ? option === "add"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {option === "add" ? "Add Walk-in" : "Cancel Walk-in"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="walkin-rooms">Rooms</Label>
            <Input
              id="walkin-rooms"
              type="number"
              min={1}
              value={rooms}
              disabled={isSubmitting}
              onChange={(e) => setRooms(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="walkin-reason">Reason</Label>
            <Input
              id="walkin-reason"
              value={reason}
              disabled={isSubmitting}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="walkin-remarks">Remarks</Label>
            <Textarea
              id="walkin-remarks"
              value={remarks}
              disabled={isSubmitting}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant={mode === "add" ? "primary" : "danger"}
            isLoading={isSubmitting}
            disabled={!context || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {mode === "add" ? "Add Walk-in" : "Cancel Walk-in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
