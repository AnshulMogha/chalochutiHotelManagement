import { MapPin, Building2, X, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui";

export interface LocationCityConfirmModalProps {
  isOpen: boolean;
  city: string;
  state?: string;
  locality?: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LocationCityConfirmModal({
  isOpen,
  city,
  state,
  locality,
  onClose,
  onConfirm,
  isLoading = false,
}: LocationCityConfirmModalProps) {
  if (!isOpen) return null;

  const cityLabel = city.trim() || "—";
  const locationLine = [locality?.trim(), state?.trim()].filter(Boolean).join(", ");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-confirm-title"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2f3d95] via-[#3d4db5] to-[#5b6fd6] px-6 py-8 text-white">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <MapPin className="h-7 w-7" />
            </div>
            <h2 id="city-confirm-title" className="text-xl font-bold tracking-tight">
              Confirm property city
            </h2>
            <p className="mt-2 text-sm text-blue-100 max-w-sm leading-relaxed">
              Please verify the city detected from your map pin before continuing.
            </p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="rounded-xl border-2 border-[#2f3d95]/20 bg-gradient-to-br from-slate-50 to-blue-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2f3d95] mb-3">
              Selected city
            </p>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2f3d95] text-white shadow-md">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {cityLabel}
                </p>
                {locationLine && (
                  <p className="mt-1 text-sm text-gray-600">{locationLine}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              Is{" "}
              <span className="font-semibold text-amber-950">{cityLabel}</span> the
              correct city for this property&apos;s location? Incorrect city details
              may affect search visibility and guest bookings.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="sm:min-w-[120px]"
            >
              Go back &amp; edit
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading || !city.trim()}
              isLoading={isLoading}
              className="gap-2 sm:min-w-[160px]"
            >
              {!isLoading && <Check className="h-4 w-4" />}
              Yes, city is correct
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
