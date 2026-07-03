import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RatePlanLinkPeer } from "../type";

function formatSlaveLabel(slave: RatePlanLinkPeer): string {
  const planLabel = slave.plan_code
    ? `${slave.ratePlanName} (${slave.plan_code})`
    : slave.ratePlanName;
  return `${planLabel} — ${slave.roomName}`;
}

function formatAdjustment(slave: RatePlanLinkPeer): string {
  const unit =
    slave.adjustmentType === "PERCENTAGE"
      ? `${slave.adjustmentValue}%`
      : `₹${slave.adjustmentValue}`;
  return `${slave.adjustmentDirection} by ${unit}`;
}

interface RatePlanSlavesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterPlanLabel: string;
  slaves: RatePlanLinkPeer[];
}

export function RatePlanSlavesDialog({
  open,
  onOpenChange,
  masterPlanLabel,
  slaves,
}: RatePlanSlavesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Linked slave rate plans</DialogTitle>
          <DialogDescription>
            Meal plans linked to{" "}
            <span className="font-medium text-slate-700">{masterPlanLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {slaves.length === 0 ? (
            <p className="text-sm text-slate-500">No slave rate plans linked.</p>
          ) : (
            slaves.map((slave) => (
              <div
                key={slave.linkId}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3"
              >
                <p className="font-semibold text-slate-900">
                  {formatSlaveLabel(slave)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Adjustment: {formatAdjustment(slave)}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
