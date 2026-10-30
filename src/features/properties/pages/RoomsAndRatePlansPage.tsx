import { useSearchParams } from "react-router";
import { Building2 } from "lucide-react";
import { RoomsAndRatePlansTab } from "../components/property-info/RoomsAndRatePlansTab";
import { useAuth } from "@/hooks";
import { canEditModule } from "@/lib/permissions";
import { ReadOnlySection } from "@/components/ui/ReadOnlySection";

export default function RoomsAndRatePlansPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedHotelId = searchParams.get("hotelId");
  const isReadOnly = !canEditModule(user, "PROPERTY_ROOMS_RATEPLANS");

  if (!selectedHotelId) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                <Building2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                No hotel selected
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a hotel from the top bar to manage rooms and rate plans
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <ReadOnlySection isReadOnly={isReadOnly}>
          <RoomsAndRatePlansTab hotelId={selectedHotelId} />
        </ReadOnlySection>
      </div>
    </div>
  );
}
